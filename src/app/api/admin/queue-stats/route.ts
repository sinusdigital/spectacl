import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { analysisQueue } from "@/lib/queue/analysisQueue";

export async function GET() {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        // Job counts by state
        const counts = await analysisQueue.getJobCounts(
            "waiting", "active", "completed", "failed", "delayed", "prioritized"
        );

        // Queue pause state
        const isPaused = await analysisQueue.isPaused();

        // Recent completed jobs with timing data (last 20)
        const recentCompleted = await analysisQueue.getJobs(["completed"], 0, 19);
        const recentFailed = await analysisQueue.getJobs(["failed"], 0, 9);
        const activeJobs = await analysisQueue.getJobs(["active"], 0, 24);

        // Calculate average processing time from recent completed jobs.
        // Exclude scheduler-tick jobs — they sit in delayed state for hours,
        // inflating wait time to 600+ minutes when actual analysis jobs wait <1s.
        const processingTimes: number[] = [];
        const waitTimes: number[] = [];
        for (const job of recentCompleted) {
            if (job.name === "scheduler-tick") continue; // Skip scheduler jobs
            if (job.finishedOn && job.processedOn) {
                processingTimes.push(job.finishedOn - job.processedOn);
            }
            if (job.processedOn && job.timestamp) {
                waitTimes.push(job.processedOn - job.timestamp);
            }
        }

        const avgProcessingMs = processingTimes.length > 0
            ? Math.round(processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length)
            : null;

        const avgWaitMs = waitTimes.length > 0
            ? Math.round(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length)
            : null;

        // Format active jobs for display
        const active = activeJobs.map((job) => ({
            id: job.id,
            name: job.name,
            priority: job.opts?.priority ?? null,
            data: {
                promptId: job.data?.promptId ?? null,
                resultCount: job.data?.resultIds?.length ?? null,
            },
            startedAt: job.processedOn ? new Date(job.processedOn).toISOString() : null,
            elapsed: job.processedOn ? Date.now() - job.processedOn : null,
        }));

        // Format recent completed for display
        const completed = recentCompleted.slice(0, 10).map((job) => ({
            id: job.id,
            name: job.name,
            priority: job.opts?.priority ?? null,
            processingTime: job.finishedOn && job.processedOn
                ? job.finishedOn - job.processedOn
                : null,
            waitTime: job.processedOn && job.timestamp
                ? job.processedOn - job.timestamp
                : null,
            completedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
        }));

        // Format recent failed for display
        const failed = recentFailed.slice(0, 5).map((job) => ({
            id: job.id,
            name: job.name,
            failedReason: job.failedReason ?? "Unknown",
            failedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
        }));

        return NextResponse.json({
            counts,
            isPaused,
            avgProcessingMs,
            avgWaitMs,
            active,
            completed,
            failed,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error("[API] Queue stats error:", error);
        return NextResponse.json({ error: "Failed to fetch queue stats" }, { status: 500 });
    }
}

// POST: pause or resume the queue
export async function POST(request: Request) {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const body = await request.json();
        const { action } = body as { action: string };

        if (action === "pause") {
            await analysisQueue.pause();
            return NextResponse.json({ success: true, isPaused: true });
        } else if (action === "resume") {
            await analysisQueue.resume();
            return NextResponse.json({ success: true, isPaused: false });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (error) {
        console.error("[API] Queue action error:", error);
        return NextResponse.json({ error: "Failed to perform action" }, { status: 500 });
    }
}
