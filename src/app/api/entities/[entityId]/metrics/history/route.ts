import { NextResponse } from "next/server";
import { getEntityVisibilityHistory, getCompetitorVisibilityHistory } from "@/lib/metrics";
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
        const tagsParam = searchParams.get("tags");
        const tags = tagsParam ? tagsParam.split(",") : [];

        const intentsParam = searchParams.get("intents");
        const intents = intentsParam ? intentsParam.split(",") : [];

        const modelsParam = searchParams.get("models");
        const modelIds = modelsParam ? modelsParam.split(",") : [];

        const includePausedParam = searchParams.get('includePaused');
        const includePaused = includePausedParam !== null ? includePausedParam === 'true' : false;

        const entityHistory = await getEntityVisibilityHistory(entityId, tags, intents, modelIds, undefined, includePaused);
        const competitorHistory = await getCompetitorVisibilityHistory(entityId, tags, intents, modelIds, undefined, includePaused);

        return NextResponse.json({
            entity: entityHistory,
            competitors: competitorHistory
        });
    } catch (error) {
        console.error("Error fetching history:", error);
        return NextResponse.json(
            { error: String(error) },
            { status: 500 }
        );
    }
}
