import { NextResponse } from "next/server";
import { getEntityVisibilityHistory, getCompetitorVisibilityHistory } from "@/lib/metrics";
import { prisma } from "@/lib/prisma";
import { withPromptAuth } from "@/lib/permissions";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const authResult = await withPromptAuth(id);
        if (authResult.error) return authResult.error;

        // Find entityId for this prompt
        const prompt = await prisma.prompt.findUnique({
            where: { id },
            select: { entityId: true }
        });
        
        if (!prompt) {
            return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
        }

        const { searchParams } = new URL(request.url);
        
        const tagsParam = searchParams.get("tags");
        const tags = tagsParam ? tagsParam.split(",") : [];

        const intentsParam = searchParams.get("intents");
        const intents = intentsParam ? intentsParam.split(",") : [];

        const modelsParam = searchParams.get("models");
        const modelIds = modelsParam ? modelsParam.split(",") : [];

        // Pass 'id' as the promptId parameter
        const entityHistory = await getEntityVisibilityHistory(prompt.entityId, tags, intents, modelIds, id);
        const competitorHistory = await getCompetitorVisibilityHistory(prompt.entityId, tags, intents, modelIds, id);

        return NextResponse.json({
            entity: entityHistory,
            competitors: competitorHistory
        });
    } catch (error) {
        console.error("Error fetching prompt history:", error);
        return NextResponse.json(
            { error: String(error) },
            { status: 500 }
        );
    }
}
