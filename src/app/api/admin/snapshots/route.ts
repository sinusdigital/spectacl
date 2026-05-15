import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { snapshotQueue } from "@/lib/queue/snapshotQueue";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/snapshots
 * Manually enqueue a citation snapshot job for a given period.
 * Body: { period?: "YYYY-MM" }  — defaults to previous month if omitted.
 * Admin-only.
 */
export async function POST(request: NextRequest) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || (session.user as { role?: string })?.role !== 'ADMIN') {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const period: string | undefined = body.period;

    // Validate YYYY-MM format if provided
    if (period && !/^\d{4}-\d{2}$/.test(period)) {
        return NextResponse.json({ error: "Invalid period format. Expected YYYY-MM." }, { status: 400 });
    }

    const job = await snapshotQueue.add(
        'monthly-citation-snapshot',
        { period },
        { jobId: `manual-snapshot-${period ?? 'prev'}` }
    );

    return NextResponse.json({ jobId: job.id, period: period ?? '(previous month)' });
}
