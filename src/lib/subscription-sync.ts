import { prisma } from "@/lib/prisma";
import { getMollie } from "@/lib/mollie";
import { SubscriptionStatus } from "@prisma/client";
import { isSelfHosted } from "@/lib/mode";

interface SyncResult {
  success: boolean;
  checked: number;
  corrected: number;
  corrections: { spaceId: string; spaceName: string; from: string; to: string; reason: string }[];
  error?: string;
}

/**
 * Maps a Mollie subscription status to our SubscriptionStatus enum.
 * Note: this maps *subscription* statuses (active, canceled, suspended, etc.),
 * NOT payment statuses (paid, failed, etc.) — that's handled by the webhook.
 */
function toLocalStatus(mollieSubStatus: string): SubscriptionStatus | null {
  switch (mollieSubStatus) {
    case "active":
      return SubscriptionStatus.ACTIVE;
    case "canceled":
    case "completed":
      return SubscriptionStatus.CANCELED;
    case "suspended":
      // Mollie suspends subscriptions when payments fail repeatedly
      return SubscriptionStatus.PAST_DUE;
    default:
      // "pending" or unknown — don't reconcile, let the webhook handle it
      return null;
  }
}

/**
 * Reconcile local subscription status with Mollie's source of truth.
 *
 * Runs on the cron schedule. For each space with a mollieSubscriptionId,
 * fetches the real subscription status from Mollie and corrects drift.
 *
 * Read-only against Mollie — never creates or cancels subscriptions.
 * Does NOT reset credits — that's the webhook's responsibility on payment events.
 */
export async function syncSubscriptions(): Promise<SyncResult> {
  // Self-hosted mode: no Mollie subscriptions to sync
  if (isSelfHosted()) {
    return { success: true, checked: 0, corrected: 0, corrections: [] };
  }

  try {
    console.log("[SubscriptionSync] Starting reconciliation...");

    // Find spaces that have an active Mollie relationship worth checking.
    // Skip CANCELED and TRIALING — they don't have subscriptions to sync.
    const spaces = await prisma.space.findMany({
      where: {
        mollieSubscriptionId: { not: null },
        mollieCustomerId: { not: null },
        subscriptionStatus: { in: ["ACTIVE", "PAST_DUE", "INCOMPLETE"] },
      },
      select: {
        id: true,
        name: true,
        mollieCustomerId: true,
        mollieSubscriptionId: true,
        subscriptionStatus: true,
      },
    });

    if (spaces.length === 0) {
      console.log("[SubscriptionSync] No spaces to check.");
      return { success: true, checked: 0, corrected: 0, corrections: [] };
    }

    console.log(`[SubscriptionSync] Checking ${spaces.length} spaces...`);

    const mollie = getMollie();
    const corrections: SyncResult["corrections"] = [];

    for (const space of spaces) {
      try {
        const subscription = await mollie.customerSubscriptions.get(
          space.mollieSubscriptionId!,
          { customerId: space.mollieCustomerId! }
        );

        const expectedStatus = toLocalStatus(subscription.status);

        // Skip if Mollie returned a status we don't map (e.g. "pending")
        if (!expectedStatus) continue;

        // Skip if already in sync
        if (space.subscriptionStatus === expectedStatus) continue;

        // Drift detected — correct it
        const updateData: Record<string, unknown> = {
          subscriptionStatus: expectedStatus,
        };

        // If Mollie says canceled, also record the cancellation timestamp
        if (expectedStatus === SubscriptionStatus.CANCELED && subscription.canceledAt) {
          updateData.canceledAt = new Date(subscription.canceledAt);
        }

        await prisma.space.update({
          where: { id: space.id },
          data: updateData,
        });

        const correction = {
          spaceId: space.id,
          spaceName: space.name,
          from: space.subscriptionStatus,
          to: expectedStatus,
          reason: `Mollie subscription status: ${subscription.status}`,
        };

        corrections.push(correction);
        console.warn(
          `[SubscriptionSync] CORRECTED "${space.name}": ${correction.from} → ${correction.to} (${correction.reason})`
        );
      } catch (err) {
        // Log per-space errors but don't fail the entire sync
        console.error(
          `[SubscriptionSync] Failed to check space "${space.name}" (${space.id}):`,
          err instanceof Error ? err.message : err
        );
      }
    }

    console.log(
      `[SubscriptionSync] Done. Checked ${spaces.length}, corrected ${corrections.length}.`
    );

    return {
      success: true,
      checked: spaces.length,
      corrected: corrections.length,
      corrections,
    };
  } catch (error) {
    console.error("[SubscriptionSync] Fatal error:", error);
    return {
      success: false,
      checked: 0,
      corrected: 0,
      corrections: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
