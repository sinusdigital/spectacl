import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getMollie } from "@/lib/mollie";
import { getPlanLimitsFromDb } from "@/lib/billing/plans";
import { calculateTax, calculateGrossAmount } from "@/lib/billing/tax";
import { safeReturnPath } from "@/lib/billing/returnPath";
import { SpacePlan } from "@prisma/client";
import { SequenceType, type Payment } from "@mollie/api-client";

const VALID_PLANS = ["STARTER", "PRO", "BUSINESS"] as const;

export async function POST(request: NextRequest) {
  // Self-hosted mode: payments not available
  const { isSelfHosted } = await import('@/lib/mode');
  if (isSelfHosted()) {
    return NextResponse.json(
      { error: 'Payments are not available in self-hosted mode' },
      { status: 400 },
    );
  }

  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { spaceId, plan, returnPath } = body as { spaceId: string; plan: string; returnPath?: string };

    if (!spaceId || !plan) {
      return NextResponse.json(
        { error: "spaceId and plan are required" },
        { status: 400 }
      );
    }

    // Verify the plan key is valid (reject FOUNDER/FREE — only paid plans)
    if (!VALID_PLANS.includes(plan as (typeof VALID_PLANS)[number])) {
      return NextResponse.json(
        { error: `Invalid plan: ${plan}. Valid plans: ${VALID_PLANS.join(", ")}` },
        { status: 400 }
      );
    }

    // Verify the caller is owner/admin of this space
    const member = await prisma.spaceMember.findFirst({
      where: {
        spaceId,
        userId: session.user.id,
        role: { in: ["OWNER", "ADMIN"] },
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: "Only space owners and admins can initiate checkout" },
        { status: 403 }
      );
    }

    // Fetch space — we need llmProvider to determine pricing track
    const space = await prisma.space.findFirst({
      where: { id: spaceId },
    });

    if (!space) {
      return NextResponse.json(
        { error: "Space not found" },
        { status: 404 }
      );
    }

    // Gate: billing profile must exist before checkout
    const billingProfile = await prisma.billingProfile.findUnique({
      where: { spaceId },
    });
    if (!billingProfile) {
      return NextResponse.json(
        { error: "BILLING_PROFILE_REQUIRED", message: "Please complete your billing details before checkout." },
        { status: 400 }
      );
    }

    // Fetch plan limits (with DB overrides)
    const limits = await getPlanLimitsFromDb(plan as SpacePlan);

    // Resolve net price from limits (DB overrides take precedence)
    const netPrice = Number((limits as Record<string, unknown>).priceManaged ?? limits.prices.MANAGED);

    // Calculate tax-adjusted amount based on billing country
    const tax = calculateTax(billingProfile.country, billingProfile.vatIdValid);
    const grossAmount = calculateGrossAmount(netPrice, tax.rate);
    const amountStr = grossAmount.toFixed(2);
    const description = `Spectacl ${plan}`;

    // Validate returnPath to prevent open redirects — must be a safe relative path
    const safeReturnPathValue = safeReturnPath(returnPath);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const isLocal = appUrl.includes("localhost") || appUrl.includes("127.0.0.1");

    // Mollie requires a publicly reachable webhook URL — skip in local dev
    const webhookUrl = !isLocal
      ? (process.env.MOLLIE_WEBHOOK_URL ?? `${appUrl}/api/webhooks/mollie`)
      : undefined;

    const mollie = getMollie();
    let mollieCustomerId = space.mollieCustomerId;

    // Create a customer if one doesn't exist for this space
    if (!mollieCustomerId) {
      const customer = await mollie.customers.create({
        name: session.user.name ?? "Customer",
        email: session.user.email,
        metadata: {
          spaceId,
          userId: session.user.id,
        },
      });
      mollieCustomerId = customer.id;
      
      // Persist the customer ID to the space
      await prisma.space.update({
        where: { id: spaceId },
        data: { mollieCustomerId },
      });
    }

    // Create a Mollie payment with sequenceType: "first" to authorize future recurring payments
    const payment = await mollie.payments.create({
      amount: {
        currency: "EUR",
        value: amountStr,
      },
      description: `${description} — Space: ${space.name}`,
      redirectUrl: `${appUrl}${safeReturnPathValue}?payment=pending&plan=${plan}&spaceId=${spaceId}`,
      ...(webhookUrl ? { webhookUrl } : {}),
      metadata: {
        spaceId,
        plan,
        userId: session.user.id,
        price: amountStr,
        netPrice: netPrice.toFixed(2),
        taxType: tax.type,
        taxRate: String(tax.rate),
      },
      customerId: mollieCustomerId,
      sequenceType: SequenceType.first,
    }) as unknown as Payment;

    // Store the payment ID on the space immediately
    await prisma.space.update({
      where: { id: spaceId },
      data: { molliePaymentId: payment.id },
    });

    return NextResponse.json({
      checkoutUrl: payment.getCheckoutUrl(),
      paymentId: payment.id,
    });
  } catch (error: unknown) {
    console.error("[POST /api/mollie/checkout] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to create payment";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
