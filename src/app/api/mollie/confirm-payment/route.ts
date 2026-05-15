import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getMollie } from "@/lib/mollie";
import { SpacePlan, SubscriptionStatus } from "@prisma/client";
import type { Payment } from "@mollie/api-client";

const VALID_PLANS = ["STARTER", "PRO", "BUSINESS"] as const;

/**
 * Called client-side after Mollie redirects back with ?payment=pending.
 *
 * Security model — verifies the SPECIFIC payment created during checkout:
 *  1. The checkout route stores `molliePaymentId` on the space.
 *  2. Fast path: if the webhook already processed THIS payment (lastProcessedWebhookId
 *     matches molliePaymentId) and the space is ACTIVE on the right plan → return 200.
 *  3. Slow path: fetch THIS specific payment from Mollie's API and verify its status
 *     is "paid" before applying the upgrade.
 *
 * This prevents:
 *  - URL-param forgery (?payment=pending&plan=ENTERPRISE)
 *  - Reuse of old paid payments from previous billing cycles
 *  - "Previous page" exploit where user navigates away from Mollie without paying
 */
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
    const { spaceId, plan } = body as { spaceId: string; plan: string };

    if (!spaceId || !plan || !VALID_PLANS.includes(plan as (typeof VALID_PLANS)[number])) {
      return NextResponse.json({ error: "Invalid spaceId or plan" }, { status: 400 });
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
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Fetch current space state — include molliePaymentId and lastProcessedWebhookId
    const space = await prisma.space.findUnique({
      where: { id: spaceId },
      select: {
        plan: true,
        subscriptionStatus: true,
        currentPeriodEnd: true,
        mollieCustomerId: true,
        molliePaymentId: true,
        lastProcessedWebhookId: true,
      },
    });
    if (!space) {
      return NextResponse.json({ error: "Space not found" }, { status: 404 });
    }

    // The checkout route stores the specific payment ID on the space.
    // Without it, we can't verify which payment to check.
    if (!space.molliePaymentId) {
      return NextResponse.json(
        { error: "No pending payment found. Please start checkout again." },
        { status: 400 }
      );
    }

    // ── Fast path: webhook already processed THIS specific payment ─────────
    // The webhook is authoritative. Only trust it if lastProcessedWebhookId
    // matches the current molliePaymentId (not a stale payment from before).
    if (
      space.lastProcessedWebhookId === space.molliePaymentId &&
      space.subscriptionStatus === SubscriptionStatus.ACTIVE &&
      space.plan === plan
    ) {
      return NextResponse.json({ ok: true, plan: space.plan });
    }

    // ── Slow path: verify THIS specific payment with Mollie ────────────────
    const mollie = getMollie();
    let payment: Payment;
    try {
      payment = await mollie.payments.get(space.molliePaymentId) as unknown as Payment;
    } catch {
      console.warn(
        `[confirm-payment] Failed to fetch payment ${space.molliePaymentId} from Mollie for space ${spaceId}`
      );
      return NextResponse.json(
        { error: "Could not verify payment. Please contact support." },
        { status: 400 }
      );
    }

    // Verify the payment is actually paid
    if (payment.status !== "paid") {
      console.warn(
        `[confirm-payment] Payment ${space.molliePaymentId} status is "${payment.status}" (not paid) for space ${spaceId} / plan ${plan} — user ${session.user.id}`
      );
      return NextResponse.json(
        { error: "Payment has not been completed. Please try again or contact support." },
        { status: 400 }
      );
    }

    // Verify metadata matches the requested plan (belt-and-suspenders)
    const meta = payment.metadata as { spaceId?: string; plan?: string } | undefined;
    if (meta?.spaceId !== spaceId || meta?.plan !== plan) {
      console.warn(
        `[confirm-payment] Payment ${space.molliePaymentId} metadata mismatch — expected spaceId=${spaceId} plan=${plan}, got spaceId=${meta?.spaceId} plan=${meta?.plan}`
      );
      return NextResponse.json(
        { error: "Payment verification failed. Please contact support." },
        { status: 400 }
      );
    }

    // Real payment confirmed — apply the plan upgrade so the user sees it
    // immediately. Do NOT set lastProcessedWebhookId here: the webhook must
    // still run its full flow to create the Mollie subscription and reset credits.
    // Safe month addition — avoids setMonth overflow (Jan 31 + 1 → Feb 28, not Mar 3)
    const now = new Date();
    const periodEnd = new Date(now);
    const targetMonth = periodEnd.getMonth() + 1;
    periodEnd.setMonth(targetMonth);
    if (periodEnd.getMonth() !== targetMonth % 12) {
      periodEnd.setDate(0);
    }

    const updated = await prisma.space.update({
      where: { id: spaceId },
      data: {
        plan: plan as SpacePlan,
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: periodEnd,
        canceledAt: null,
        cancellationReason: null,
        // NOTE: intentionally not setting lastProcessedWebhookId — the webhook
        // handles subscription creation and credit reset, so it must not be skipped.
      },
    });

    return NextResponse.json({ ok: true, plan: updated.plan });
  } catch (error: unknown) {
    console.error("[POST /api/mollie/confirm-payment]", error);
    return NextResponse.json({ error: "Failed to confirm payment" }, { status: 500 });
  }
}
