import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch last 20 cron runs (CheckRun records)
    const recentRuns = await prisma.checkRun.findMany({
      orderBy: { startedAt: "desc" },
      take: 20,
      select: {
        id: true,
        startedAt: true,
        completedAt: true,
        _count: { select: { analysisResults: true } },
      },
    });

    // Aggregate stats from recent runs
    const totalRuns = recentRuns.length;
    const completedRuns = recentRuns.filter((r) => r.completedAt !== null);
    const incompleteRuns = recentRuns.filter((r) => r.completedAt === null);

    // Calculate average duration for completed runs
    const durations = completedRuns
      .map((r) => {
        if (!r.completedAt) return null;
        return new Date(r.completedAt).getTime() - new Date(r.startedAt).getTime();
      })
      .filter((d): d is number => d !== null);

    const avgDurationMs = durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : null;

    // Total prompts processed across recent runs
    const totalPromptsProcessed = recentRuns.reduce(
      (sum, r) => sum + r._count.analysisResults,
      0
    );

    // Last run info
    const lastRun = recentRuns[0] ?? null;
    const lastRunAt = lastRun?.startedAt?.toISOString() ?? null;
    const lastRunDurationMs = lastRun?.completedAt
      ? new Date(lastRun.completedAt).getTime() - new Date(lastRun.startedAt).getTime()
      : null;

    // Time since last run
    const timeSinceLastRunMs = lastRun
      ? Date.now() - new Date(lastRun.startedAt).getTime()
      : null;

    // Count spaces by subscription status (for sync context)
    const subscriptionCounts = await prisma.space.groupBy({
      by: ["subscriptionStatus"],
      _count: true,
    });

    const statusMap: Record<string, number> = {};
    for (const row of subscriptionCounts) {
      statusMap[row.subscriptionStatus] = row._count;
    }

    // Count active prompts (Running status)
    const activePromptCount = await prisma.prompt.count({
      where: { status: "Running" },
    });

    // Count due prompts (nextRunAt <= now)
    const duePromptCount = await prisma.prompt.count({
      where: {
        status: "Running",
        nextRunAt: { lte: new Date() },
      },
    });

    // Format recent runs for the table
    const runs = recentRuns.map((r) => ({
      id: r.id,
      startedAt: r.startedAt.toISOString(),
      completedAt: r.completedAt?.toISOString() ?? null,
      durationMs:
        r.completedAt
          ? new Date(r.completedAt).getTime() - new Date(r.startedAt).getTime()
          : null,
      promptsProcessed: r._count.analysisResults,
      status: r.completedAt ? "completed" : "running",
    }));

    return NextResponse.json({
      summary: {
        totalRuns,
        completedRuns: completedRuns.length,
        incompleteRuns: incompleteRuns.length,
        avgDurationMs,
        totalPromptsProcessed,
        lastRunAt,
        lastRunDurationMs,
        timeSinceLastRunMs,
      },
      prompts: {
        active: activePromptCount,
        due: duePromptCount,
      },
      subscriptions: statusMap,
      runs,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[CronStats] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch cron stats" },
      { status: 500 }
    );
  }
}
