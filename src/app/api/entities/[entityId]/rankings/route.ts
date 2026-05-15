
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withEntityAuth } from '@/lib/permissions';
import { getInternalTaskModel } from "@/lib/internal-models";
import { createPendingAnalysisRecords } from "@/lib/analysis";
import { analysisQueue } from "@/lib/queue/analysisQueue";
import { calculateNextSlot } from "@/lib/scheduling";

export async function POST(
    req: NextRequest,
    props: { params: Promise<{ entityId: string }> }
) {
    try {
        const params = await props.params;
        const entityId = params.entityId;
        const authResult = await withEntityAuth(entityId, { requireWrite: true });
        if (authResult.error) return authResult.error;
        const body = await req.json();
        const {
            primaryBuyerRole,
            companySize,
            industry,
            decisionContext,
            competitorIds,
            customPromptText,
            name
        } = body;

        // Resolve ranking model from internal task model registry (admin-configured)
        let rankingTask;
        try {
            rankingTask = await getInternalTaskModel('ranking');
        } catch {
            return NextResponse.json(
                { error: "No ranking model configured. Ask your admin to set one in Master LLMs." },
                { status: 400 }
            );
        }
        const modelId = rankingTask.modelId;

        // Fetch entity and competitors for name resolution
        const entity = await prisma.entity.findUnique({
            where: { id: entityId },
            include: { competitors: true }
        });

        if (!entity) {
            return NextResponse.json({ error: "Entity not found" }, { status: 404 });
        }

        const selectedCompetitors = entity.competitors.filter(c => competitorIds?.includes(c.id)); // Optional chaining for safe filter
        const competitorNames = selectedCompetitors.map(c => c.name).join(", ");

        // Construct Prompt Text
        let promptText = "";
        
        if (customPromptText) {
            promptText = customPromptText;
        } else {
            promptText = `Analyze the competitive market and provide a detailed ranking for ${entity.name} compared to ${competitorNames}.
Research relevant up-to-date sources to provide accurate insights.

You MUST respond with a valid JSON object following this EXACT schema. Every field is required unless marked optional:
{
  "market_ranking": {
    "entities": [
      {
        "name": "Entity Name (must match provided brand names exactly)",
        "rank": 1,
        "market_position": "2-3 sentence summary of the entity's market standing, key differentiators, and competitive posture",
        "market_share": "estimated % or range (e.g. '25-30%')",
        "strengths": ["specific strength 1", "specific strength 2", "specific strength 3"],
        "weaknesses": ["specific weakness 1", "specific weakness 2"],
        "relevance_for_buyer": "1-2 sentence assessment of why this entity matters for the buyer's specific context"
      }
    ]
  },
  "sources": [
    {
      "title": "Source Title",
      "url": "https://...",
      "type": "Editorial | Review | Report | News | Industry Analysis"
    }
  ]
}

Rules:
- Include ALL provided entities (${entity.name}, ${competitorNames}). Do not omit any.
- Rank from 1 (best) to N. No ties.
- Provide at least 2-4 strengths and 1-3 weaknesses per entity.
- Provide at least 3 sources with real, verifiable URLs.
- Only respond with the JSON. No intro, outro, markdown, or code fences.`;
            const contextParts = [];
            if (primaryBuyerRole) contextParts.push(`Buyer: ${primaryBuyerRole}`);
            if (companySize) contextParts.push(`Size: ${companySize}`);
            if (industry) contextParts.push(`Industry: ${industry}`);
            if (decisionContext) contextParts.push(`Context: ${decisionContext}`);
            
            if (contextParts.length > 0) {
                promptText += `\nContext: ${contextParts.join(". ")}.`;
            }
        }

        // Limit Check: Global Active Prompts
        if (entity.spaceId) {
            const space = await prisma.space.findUnique({ where: { id: entity.spaceId } });
            if (space) {
                const { getPlanLimitsFromDb } = await import("@/lib/billing/plans");
                const limits = await getPlanLimitsFromDb(space.plan);

                if (limits.maxActivePrompts !== -1) {
                    const spaceEntities = await prisma.entity.findMany({
                        where: { spaceId: entity.spaceId, isArchived: false },
                        select: { id: true }
                    });
                    const spaceEntityIds = spaceEntities.map(e => e.id);
                    const currentActiveCount = await prisma.prompt.count({
                        where: {
                            entityId: { in: spaceEntityIds },
                            status: 'Running'
                        }
                    });

                    if (currentActiveCount >= limits.maxActivePrompts) {
                        return NextResponse.json(
                            { error: `Active prompt limit reached for ${space.plan} plan (${limits.maxActivePrompts} active prompts). Upgrade your plan or pause existing prompts.` },
                            { status: 403 }
                        );
                    }
                }
            }
        }

        // Transaction to create Prompt and Ranking
        const ranking = await prisma.$transaction(async (tx) => {
            // 1. Create Prompt
            const prompt = await tx.prompt.create({
                data: {
                    text: promptText,
                    intent: 'Competitor Analysis', // Fixed intent for Rankings
                    status: 'Running',
                    frequency: 'Every24Hours',
                    llms: [modelId], // Single LLM as requested
                    entityId: entityId,
                    nextRunAt: new Date(), // Run immediately/soon
                }
            });

            // 2. Create Ranking
            const newRanking = await tx.ranking.create({
                data: {
                    name,
                    primaryBuyerRole,
                    companySize,
                    industry,
                    decisionContext,
                    entityId,
                    promptId: prompt.id,
                    competitors: {
                        connect: selectedCompetitors.map(c => ({ id: c.id }))
                    }
                },
                include: {
                    prompt: {
                        include: {
                            analysisResults: {
                                take: 90, // last 90 results
                                orderBy: { createdAt: 'desc' },
                                include: { mentions: true }
                            }
                        }
                    },
                    competitors: true,
                    entity: true
                }
            });

            return newRanking;
        });

        // Kick off the first run immediately on the fast lane so the user
        // doesn't have to hit "Run Now" after creating a report.
        try {
            const resultIds = await createPendingAnalysisRecords(ranking.prompt.id);
            if (resultIds.length > 0) {
                await analysisQueue.add('analyze-prompt', {
                    promptId: ranking.prompt.id,
                    resultIds
                }, {
                    priority: 1, // Fast lane — user-initiated
                });

                await prisma.prompt.update({
                    where: { id: ranking.prompt.id },
                    data: { nextRunAt: calculateNextSlot(ranking.prompt.frequency) }
                });
            }
        } catch (err) {
            console.error("Immediate analysis trigger failed for new ranking:", err);
        }

        return NextResponse.json(ranking);

    } catch (error) {
        console.error("Error creating ranking:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function GET(
    req: NextRequest,
    props: { params: Promise<{ entityId: string }> }
) {
    try {
        const params = await props.params;
        const entityId = params.entityId;
        const authResult = await withEntityAuth(entityId);
        if (authResult.error) return authResult.error;

        const rankings = await prisma.ranking.findMany({
            where: { entityId },
            orderBy: { createdAt: 'desc' },
            include: {
                prompt: {
                    include: {
                        analysisResults: {
                            take: 90, // Retrieve history for charts
                            orderBy: { createdAt: 'desc' },
                            include: { mentions: true }
                        }
                    }
                },
                competitors: true,
                entity: true
            }
        });

        return NextResponse.json(rankings);

    } catch (error) {
        console.error("Error fetching rankings:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
