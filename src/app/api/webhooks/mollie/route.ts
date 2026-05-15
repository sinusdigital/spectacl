import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMollie } from "@/lib/mollie";
import { Prisma, SpacePlan, SubscriptionStatus } from "@prisma/client";
import { SequenceType, type Payment } from "@mollie/api-client";
import { getPlanLimitsFromDb, calculateMonthlyCreditsFromDb, getActiveModelCount, type PlanKey } from "@/lib/billing/plans";
import { createInvoice } from "@/lib/billing/invoices";

// Map Mollie payment status → our SubscriptionStatus
function toSubscriptionStatus(mollieStatus: string): SubscriptionStatus {
  switch (mollieStatus) {
    case "paid":
      return SubscriptionStatus.ACTIVE;
    case "pending":
    case "open":
      return SubscriptionStatus.INCOMPLETE;
    case "failed":
      // Grace period: mark as PAST_DUE so the user can update payment method.
      // Mollie may retry — if the retry succeeds, the next webhook sets ACTIVE.
      return SubscriptionStatus.PAST_DUE;
    case "expired":
    case "canceled":
      return SubscriptionStatus.CANCELED;
    default:
      return SubscriptionStatus.INCOMPLETE;
  }
}

/**
 * Safely add one month to a date, clamping to the last day of the target month
 * to avoid the setMonth() overflow bug (e.g. Jan 31 + 1 month = Feb 28, not Mar 3).
 */
export function addOneMonth(date: Date): Date {
  const result = new Date(date);
  const targetMonth = result.getMonth() + 1;
  result.setMonth(targetMonth);
  // If the month overflowed (e.g. 31 Jan → 3 Mar), clamp to last day of target month
  if (result.getMonth() !== targetMonth % 12) {
    result.setDate(0); // setDate(0) = last day of previous month
  }
  return result;
}

// This endpoint is called by Mollie — no auth header
export async function POST(request: NextRequest) {
  // Self-hosted mode: Mollie webhooks not applicable
  const { isSelfHosted } = await import('@/lib/mode');
  if (isSelfHosted()) {
    return NextResponse.json({ status: 'ignored', reason: 'self-hosted mode' });
  }

  try {
    const body = await request.text();
    const params = new URLSearchParams(body);
    const webhookId = params.get("id"); // Usually tr_... for payments
    const subscriptionIdFromWebhook = params.get("subscriptionId");

    // Case 1: Subscription Cancellation Webhook
    // Mollie sends this when a subscription status changes. Verify against Mollie API
    // before acting — never trust the POST body alone.
    if (subscriptionIdFromWebhook && !webhookId?.startsWith("tr_")) {
      console.log("[Mollie Webhook] Subscription status change:", subscriptionIdFromWebhook);

      const space = await prisma.space.findFirst({
        where: { mollieSubscriptionId: subscriptionIdFromWebhook }
      });

      if (space && space.mollieCustomerId) {
        try {
          // Verify the subscription status with Mollie's API (never trust POST body alone)
          const mollie = getMollie();
          const subscription = await mollie.customerSubscriptions.get(
            subscriptionIdFromWebhook,
            { customerId: space.mollieCustomerId }
          );

          if (subscription.status === "canceled" || subscription.status === "completed") {
            console.log(`[Mollie Webhook] Verified subscription ${subscriptionIdFromWebhook} is ${subscription.status}`);
            await prisma.space.update({
              where: { id: space.id },
              data: { subscriptionStatus: SubscriptionStatus.CANCELED }
            });
          } else {
            console.log(`[Mollie Webhook] Subscription ${subscriptionIdFromWebhook} status is ${subscription.status} — no action`);
          }
        } catch (verifyError) {
          console.error(`[Mollie Webhook] Failed to verify subscription ${subscriptionIdFromWebhook}:`, verifyError);
          // Return 500 so Mollie retries — we couldn't verify
          return new NextResponse("Verification failed", { status: 500 });
        }
      }
      return new NextResponse("OK", { status: 200 });
    }

    // Case 2: Payment Webhook
    if (!webhookId || !webhookId.startsWith("tr_")) {
      console.error("[Mollie Webhook] Missing or invalid payment id:", webhookId);
      return new NextResponse("OK", { status: 200 });
    }

    const mollie = getMollie();
    const payment = await mollie.payments.get(webhookId) as unknown as Payment;
    const metadata = payment.metadata as { spaceId?: string; plan?: string; userId?: string; price?: string; netPrice?: string; taxType?: string; taxRate?: string };
    const { spaceId, plan, price } = metadata ?? {};

    if (!spaceId || !plan) {
      console.error("[Mollie Webhook] Missing metadata for payment:", webhookId);
      return new NextResponse("OK", { status: 200 });
    }

    // Fetch space to check idempotency and current state
    const space = await prisma.space.findUnique({
      where: { id: spaceId }
    });

    if (!space) {
      console.error("[Mollie Webhook] Space not found:", spaceId);
      return new NextResponse("OK", { status: 200 });
    }

    const status = payment.status;
    const sequenceType = payment.sequenceType;
    const subscriptionId = payment.subscriptionId;

    console.log(`[Mollie Webhook] Received ${sequenceType} payment ${webhookId} (${status}) for space ${spaceId}`);

    // Ignore non-terminal statuses — Mollie sends webhooks for every status change
    // (open, pending, paid, failed, etc.). Only "paid", "failed", "expired", and
    // "canceled" are actionable. "open"/"pending" would burn the idempotency key
    // and block the real "paid" webhook from processing.
    if (status === "open" || status === "pending") {
      console.log(`[Mollie Webhook] Ignoring non-terminal status "${status}" for payment ${webhookId}`);
      return new NextResponse("OK", { status: 200 });
    }

    // Atomic idempotency: claim this webhook by setting lastProcessedWebhookId.
    // Prevents concurrent webhook deliveries from double-processing.
    // Only claimed for terminal statuses (paid/failed/expired/canceled) — never
    // for "open"/"pending" which would block the subsequent "paid" webhook.
    // If subscription creation fails, we roll back the claim so Mollie can retry.
    const previousWebhookId = space.lastProcessedWebhookId;
    const claimed = await prisma.space.updateMany({
      where: { id: spaceId, lastProcessedWebhookId: { not: webhookId } },
      data: { lastProcessedWebhookId: webhookId },
    });
    if (claimed.count === 0) {
      console.log("[Mollie Webhook] Skipping already processed payment:", webhookId);
      return new NextResponse("OK", { status: 200 });
    }

    console.log(`[Mollie Webhook] Processing ${sequenceType} payment ${webhookId} (${status}) for space ${spaceId}`);

    const subscriptionStatus = toSubscriptionStatus(status);
    const updateData: Prisma.SpaceUpdateInput = {
      subscriptionStatus,
    };

    if (status === "paid") {
      updateData.plan = plan as SpacePlan;

      // FIRST PAYMENT -> Create Subscription
      if (sequenceType === SequenceType.first) {
        // Clear any prior cancellation data (resubscription case)
        updateData.canceledAt = null;
        updateData.cancellationReason = null;

        // Cancel existing subscription if upgrading/changing plans.
        // The old subscription is only canceled AFTER the new payment succeeds,
        // so abandoning checkout leaves the old plan intact.
        if (space.mollieSubscriptionId && space.mollieCustomerId) {
          try {
            await mollie.customerSubscriptions.cancel(
              space.mollieSubscriptionId,
              { customerId: space.mollieCustomerId }
            );
            console.log(`[Mollie Webhook] Canceled old subscription ${space.mollieSubscriptionId} (plan change to ${plan})`);
          } catch (cancelError) {
            // Non-fatal: subscription may already be canceled/expired.
            // Log and continue — the new subscription will still be created.
            console.warn(`[Mollie Webhook] Failed to cancel old subscription ${space.mollieSubscriptionId}:`, cancelError);
          }
        }

        if (!payment.customerId) {
          // Permanent failure — no customerId won't self-resolve via retries.
          console.error(`[Mollie Webhook] No customerId on first payment ${webhookId} — cannot create subscription`);
          updateData.subscriptionStatus = SubscriptionStatus.INCOMPLETE;
        } else try {
          // Verify valid mandate exists before creating subscription
          const mandates = await mollie.customerMandates.page({ customerId: payment.customerId });
          const mandateList = Array.from(mandates as Iterable<{ status: string }>);
          const validMandate = mandateList.find((m) => m.status === "valid");

          if (!validMandate) {
            throw new Error(`No valid mandate found for customer ${payment.customerId}`);
          }

          // Use price from metadata if available, fallback to DB if missing (shouldn't happen with new checkouts)
          let priceValue = price;
          if (!priceValue) {
            const limits = await getPlanLimitsFromDb(plan as SpacePlan);
            priceValue = String((limits as unknown as Record<string, unknown>).priceManaged ?? limits.prices.MANAGED);
          }

          // Calculate start date: 1 month from now (YYYY-MM-DD)
          const startDate = addOneMonth(new Date());
          const formattedStart = startDate.toISOString().split("T")[0];

          const subscription = await mollie.customerSubscriptions.create({
            customerId: payment.customerId,
            amount: {
              currency: "EUR",
              value: Number(priceValue).toFixed(2),
            },
            interval: "1 month",
            description: `Spectacl ${plan} Subscription`,
            startDate: formattedStart,
            webhookUrl: process.env.MOLLIE_WEBHOOK_URL ?? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mollie`,
          });

          updateData.mollieSubscriptionId = subscription.id;

          // Set initial period end to 1 month from now
          updateData.currentPeriodEnd = addOneMonth(new Date());

          // Reset credits to match new plan — ties credit cycle to billing cycle
          const modelCount = await getActiveModelCount();
          const creditLimit = await calculateMonthlyCreditsFromDb(plan as PlanKey, modelCount);
          updateData.llmCreditsRemaining = creditLimit;
          updateData.llmCreditsUsed = 0;
          updateData.creditResetDate = new Date();

          console.log("[Mollie Webhook] Created subscription:", subscription.id, "credits:", creditLimit);
        } catch (subError) {
          // Subscription creation failed — likely transient (mandate pending, Mollie API down).
          // Roll back the idempotency claim so Mollie's retry can try again.
          // Return 500 to signal Mollie to retry with exponential backoff.
          console.error(
            `[Mollie Webhook] FAILED TO CREATE SUBSCRIPTION for customer ${payment.customerId}, payment ${webhookId} — rolling back for retry:`,
            subError,
          );
          try {
            await prisma.space.update({
              where: { id: spaceId },
              data: { lastProcessedWebhookId: previousWebhookId },
            });
          } catch (rollbackError) {
            // If even the rollback fails (DB down), log it — Mollie will still retry
            // but hit the idempotency wall. subscription-sync cron is the final safety net.
            console.error(`[Mollie Webhook] Rollback of lastProcessedWebhookId also failed:`, rollbackError);
          }
          return new NextResponse("Subscription creation failed", { status: 500 });
        }
      } 
      // RECURRING PAYMENT -> Extend Period
      else if (subscriptionId) {
        // Use currentPeriodEnd if available to avoid drift, otherwise fallback to now
        const baseDate = space.currentPeriodEnd && space.currentPeriodEnd > new Date() 
          ? space.currentPeriodEnd 
          : new Date();
          
        updateData.currentPeriodEnd = addOneMonth(baseDate);

        // Reset credits for new billing period — keeps credit cycle aligned with billing
        // Use `plan` from payment metadata (not space.plan) for consistency —
        // updateData.plan is already set from metadata on line above.
        const modelCount = await getActiveModelCount();
        const creditLimit = await calculateMonthlyCreditsFromDb(plan as PlanKey, modelCount);
        updateData.llmCreditsRemaining = creditLimit;
        updateData.llmCreditsUsed = 0;
        updateData.creditResetDate = new Date();

        console.log("[Mollie Webhook] Extended period until:", updateData.currentPeriodEnd, "credits reset:", creditLimit);
      }
    }

    await prisma.space.update({
      where: { id: spaceId },
      data: updateData,
    });

    // Fire-and-forget invoice creation for paid payments
    if (status === "paid" && plan) {
      const netPrice = parseFloat(metadata.netPrice ?? metadata.price ?? "0");
      createInvoice({
        spaceId,
        molliePaymentId: webhookId,
        plan,
        amount: netPrice,
        periodStart: new Date(),
        periodEnd: updateData.currentPeriodEnd as Date | undefined,
      }).catch((err) =>
        console.error("[Mollie Webhook] Invoice creation failed:", err),
      );
    }

    return new NextResponse("OK", { status: 200 });
  } catch (error: unknown) {
    console.error("[Mollie Webhook] Global Error:", error);
    // Return 500 so Mollie retries — transient errors (DB down, network) should be retried.
    // Mollie retries webhooks for non-2xx responses with exponential backoff.
    return new NextResponse("Internal Error", { status: 500 });
  }
}
