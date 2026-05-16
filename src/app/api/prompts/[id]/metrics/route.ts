import { NextResponse } from "next/server";
import { getDynamicMetrics } from "@/lib/metrics";
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
        const timeframe = searchParams.get("timeframe") as 'weekly' | 'standard' | 'extended' || 'standard';
        
        const tagsParam = searchParams.get("tags");
        const tags = tagsParam ? tagsParam.split(",") : [];

        const modelsParam = searchParams.get("models");
        const modelIds = modelsParam ? modelsParam.split(",") : [];

        const intentsParam = searchParams.get("intents");
        const intents = intentsParam ? intentsParam.split(",") : [];

        // We only care about dynamic metrics since standard latest metrics is per entity
        const metrics = await getDynamicMetrics(prompt.entityId, tags, timeframe, modelIds, intents, id);

        return NextResponse.json(metrics);
    } catch (error) {
        console.error("Error fetching prompt metrics:", error);
        return NextResponse.json(
            { error: "Error fetching prompt metrics" },
            { status: 500 }
        );
    }
}
