import { NextResponse } from "next/server";
import { getLatestMetrics } from "@/lib/metrics";
import { withEntityAuth } from '@/lib/permissions';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ entityId: string }> }
) {
    try {
        const { entityId } = await params;
        const authResult = await withEntityAuth(entityId);
        if (authResult.error) return authResult.error;
        const { searchParams } = new URL(request.url);
        const timeframe = searchParams.get("timeframe") as 'weekly' | 'standard' | 'extended' || 'standard';
        const tagsParam = searchParams.get("tags");
        const tags = tagsParam ? tagsParam.split(",") : [];

        const modelsParam = searchParams.get("models");
        const modelIds = modelsParam ? modelsParam.split(",") : [];

        const intentsParam = searchParams.get("intents");
        const intents = intentsParam ? intentsParam.split(",") : [];

        let metrics;
        if (tags.length > 0 || modelIds.length > 0 || intents.length > 0) {
            const { getDynamicMetrics } = await import("@/lib/metrics");
            metrics = await getDynamicMetrics(entityId, tags, timeframe, modelIds, intents);
        } else {
            metrics = await getLatestMetrics(entityId, timeframe);
            // Fall back to live calculation when no snapshot exists yet
            // (e.g. right after onboarding before the background snapshot job has run)
            if (!metrics.entity) {
                const { getDynamicMetrics } = await import("@/lib/metrics");
                metrics = await getDynamicMetrics(entityId, [], timeframe);
            }
        }

        return NextResponse.json(metrics);
    } catch (error) {
        console.error("Error fetching metrics:", error);
        return NextResponse.json(
            { error: "Error fetching metrics" },
            { status: 500 }
        );
    }
}
