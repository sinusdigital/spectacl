import { NextRequest, NextResponse } from "next/server";
import { processDuePrompts, processExpiredTrials, expireInvitations } from "@/lib/scheduler-job";
import { syncSubscriptions } from "@/lib/subscription-sync";

export const dynamic = 'force-dynamic'; // Ensure not cached

export async function GET(request: NextRequest) {
    // Verify cron secret to prevent unauthorized triggering.
    // The cron service must pass this as a Bearer token or query param.
    // CRON_SECRET is mandatory — if not configured, all cron requests are rejected.
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
        console.error("[Cron] CRON_SECRET not configured — rejecting request");
        return NextResponse.json({ error: "Cron not configured" }, { status: 500 });
    }

    const authHeader = request.headers.get("authorization");
    const querySecret = request.nextUrl.searchParams.get("secret");
    const provided = authHeader?.replace("Bearer ", "") ?? querySecret;

    if (provided !== cronSecret) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Expire stale invitations
    const invitationExpiry = await expireInvitations();

    // Sweep expired trials before processing prompts
    const trialSweep = await processExpiredTrials();

    // Reconcile subscription status with Mollie (catches missed webhooks)
    const subscriptionSync = await syncSubscriptions();

    const result = await processDuePrompts();

    if (!result.success) {
        return NextResponse.json({ error: result.error || "Internal Server Error" }, { status: 500 });
    }

    return NextResponse.json({ ...result, invitationExpiry, trialSweep, subscriptionSync });
}
