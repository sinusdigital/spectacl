import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withPromptAuth } from "@/lib/permissions";
import { computeBrandMentionRates } from "@/lib/metrics/brandMentionRates";
import { resolveModelIds, buildAnalysisResultWhere, type FilterOptions } from "@/lib/metrics/queryHelpers";

const TIMEFRAMES = {
    weekly: 7,
    standard: 30,
    extended: 90,
} as const;

type Timeframe = keyof typeof TIMEFRAMES;

interface DetectedBrand {
    normalizedKey: string;
    canonicalName: string;
    mentionCount: number;
    runCount: number;
    coveragePct: number;
    avgPosition: number | null;
    lastSeenAt: string;
    status: "self" | "tracked" | "suggested" | "untracked" | "new";
    competitorId: string | null;
    competitorWebsite: string | null;
    competitorLogoUrl: string | null;
    suggestedCompetitorId: string | null;
    suggestedWebsite: string | null;
    brandColor: string | null;
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const auth = await withPromptAuth(id);
        if (auth.error) return auth.error;

        const prompt = await prisma.prompt.findUnique({
            where: { id },
            select: { entityId: true },
        });
        if (!prompt) return NextResponse.json({ error: "Prompt not found" }, { status: 404 });

        // Parse filters from query string. Mirrors `/api/prompts/[id]/metrics`
        // so the page-level 7d/30d/90d toggle and model filter both apply
        // here too — previously this endpoint was unfiltered, which caused
        // detected-brands numbers to drift from the overview chart.
        const { searchParams } = new URL(request.url);
        const timeframeParam = (searchParams.get("timeframe") || "standard") as Timeframe;
        const timeframe: Timeframe = timeframeParam in TIMEFRAMES ? timeframeParam : "standard";
        const days = TIMEFRAMES[timeframe];

        const modelsParam = searchParams.get("models");
        const modelIds = modelsParam ? modelsParam.split(",") : [];
        const resolvedModels = modelIds.length > 0 ? await resolveModelIds(prompt.entityId, modelIds) : [];

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const filterOpts: FilterOptions = {
            promptId: id,
            resolvedModels: resolvedModels.length > 0 ? resolvedModels : undefined,
            includePaused: true,
        };
        const where = buildAnalysisResultWhere(prompt.entityId, { gte: startDate }, filterOpts);

        const { totalRuns, rows } = await computeBrandMentionRates({ where });

        if (totalRuns === 0) {
            return NextResponse.json({ totalRuns: 0, brands: [] });
        }

        // Resolve tracked Competitor + SuggestedCompetitor metadata for display.
        const competitorIds = Array.from(
            new Set(rows.map(r => r.competitorId).filter((x): x is string => !!x)),
        );
        const suggestedIds = Array.from(
            new Set(rows.map(r => r.suggestedCompetitorId).filter((x): x is string => !!x)),
        );

        const [competitors, suggested, entityRow] = await Promise.all([
            competitorIds.length
                ? prisma.competitor.findMany({
                    where: { id: { in: competitorIds } },
                    select: { id: true, name: true, website: true, logoUrl: true, primaryColor: true, darkVibrantColor: true },
                })
                : Promise.resolve([] as Array<{ id: string; name: string; website: string | null; logoUrl: string | null; primaryColor: string | null; darkVibrantColor: string | null }>),
            suggestedIds.length
                ? prisma.suggestedCompetitor.findMany({
                    where: { id: { in: suggestedIds } },
                    select: { id: true, name: true, website: true, status: true },
                })
                : Promise.resolve([] as Array<{ id: string; name: string; website: string | null; status: string }>),
            prisma.entity.findUnique({
                where: { id: prompt.entityId },
                select: { name: true, website: true, logoUrl: true, primaryColor: true },
            }),
        ]);
        const compById = new Map(competitors.map(c => [c.id, c]));
        const suggestedById = new Map(suggested.map(s => [s.id, s]));

        const brands: DetectedBrand[] = rows.map(row => {
            const competitor = row.competitorId ? compById.get(row.competitorId) : null;
            const suggestion = row.suggestedCompetitorId ? suggestedById.get(row.suggestedCompetitorId) : null;

            let status: DetectedBrand["status"];
            if (row.isPrimaryEntity) status = "self";
            else if (competitor) status = "tracked";
            else if (suggestion?.status === "suggested") status = "suggested";
            else if (suggestion?.status === "untracked") status = "untracked";
            else status = "new";

            const canonicalName = row.isPrimaryEntity && entityRow?.name
                ? entityRow.name
                : (competitor?.name ?? row.canonicalName);
            const competitorWebsite = row.isPrimaryEntity
                ? (entityRow?.website ?? null)
                : (competitor?.website ?? null);
            const competitorLogoUrl = row.isPrimaryEntity
                ? (entityRow?.logoUrl ?? null)
                : (competitor?.logoUrl ?? null);

            const brandColor = row.isPrimaryEntity
                ? (entityRow?.primaryColor ?? null)
                : (competitor?.primaryColor ?? competitor?.darkVibrantColor ?? null);

            return {
                normalizedKey: row.normalizedKey,
                canonicalName,
                mentionCount: row.mentionRowCount,
                runCount: row.runsMentioned,
                coveragePct: Math.round(row.mentionRate),
                avgPosition: row.avgPosition,
                lastSeenAt: (row.lastSeenAt ?? new Date()).toISOString(),
                status,
                competitorId: row.competitorId,
                competitorWebsite,
                competitorLogoUrl,
                suggestedCompetitorId: row.suggestedCompetitorId,
                suggestedWebsite: suggestion?.website ?? null,
                brandColor,
            };
        });

        brands.sort((a, b) => b.mentionCount - a.mentionCount);

        return NextResponse.json({
            totalRuns,
            brands: brands.slice(0, 100),
        });
    } catch (error) {
        console.error("[detected-brands] Failed:", error);
        return NextResponse.json({ error: "Failed to load detected brands" }, { status: 500 });
    }
}
