import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withEntityAuth } from '@/lib/permissions';

const MAX_VISIBLE = 30;
// Half-life for recency decay. A suggestion last mentioned 30 days ago counts
// half as much as one mentioned today; 60 days ago counts a quarter.
const RECENCY_HALF_LIFE_DAYS = 30;

function extractHostname(url: string): string | null {
    try {
        const hostname = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
        return hostname.replace(/^www\./, '');
    } catch {
        return null;
    }
}

interface SuggestionRow {
    id: string;
    name: string;
    website: string | null;
    entityId: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    mentionCount: number;
    promptCount: number;
    lastMentionAt: Date | null;
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ entityId: string }> }
) {
    const { entityId } = await params;
    const authResult = await withEntityAuth(entityId);
    if (authResult.error) return authResult.error;

    try {
        // Pull suggestions with mention signal aggregated from AnalysisMention.
        // Recency-only ordering buried high-signal brands once the pile grew past
        // ~30. We rank by (mentionCount × cross-prompt breadth × recency decay)
        // so consistently-mentioned brands surface even if they're not the newest.
        const [rows, allowlistedDomains] = await Promise.all([
            prisma.$queryRaw<SuggestionRow[]>`
                SELECT
                    sc.id,
                    sc.name,
                    sc.website,
                    sc."entityId",
                    sc.status,
                    sc."createdAt",
                    sc."updatedAt",
                    COUNT(am.id)::int AS "mentionCount",
                    COUNT(DISTINCT ar."promptId")::int AS "promptCount",
                    MAX(am."createdAt") AS "lastMentionAt"
                FROM "SuggestedCompetitor" sc
                LEFT JOIN "AnalysisMention" am ON am."suggestedCompetitorId" = sc.id
                LEFT JOIN "AnalysisResult" ar ON ar.id = am."analysisResultId"
                WHERE sc."entityId" = ${entityId}
                  AND sc.status IN ('suggested', 'rejected', 'untracked')
                GROUP BY sc.id
            `,
            prisma.domain.findMany({
                where: { isAllowlisted: true },
                select: { domain: true },
            }),
        ]);

        const allowlistedSet = new Set(allowlistedDomains.map(d => d.domain.toLowerCase()));

        const filtered = rows.filter(s => {
            if (!s.website) return true;
            const hostname = extractHostname(s.website);
            if (!hostname) return true;
            return !allowlistedSet.has(hostname.toLowerCase());
        });

        const now = Date.now();
        const scored = filtered.map(r => {
            // Fall back to createdAt for legacy rows with no AnalysisMention links yet
            // (pre-backfill suggestions). The +0.1 keeps zero-mention rows orderable
            // by recency rather than collapsing all to score=0.
            const referenceTs = (r.lastMentionAt ?? r.createdAt).getTime();
            const daysOld = Math.max(0, (now - referenceTs) / 86400000);
            const recency = Math.exp(-daysOld / RECENCY_HALF_LIFE_DAYS);
            const breadth = Math.log2(r.promptCount + 1) || 0.5;
            const score = (r.mentionCount + 0.1) * breadth * recency;
            return { row: r, score };
        });

        scored.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return b.row.createdAt.getTime() - a.row.createdAt.getTime();
        });

        // Cap actionable "suggested" rows separately so the 30-cap can't be
        // displaced by long-tail untracked/rejected rows. Untracked rows feed a
        // different section on the page (previously dismissed) — return all of
        // them so that section stays accurate.
        const topSuggested = scored.filter(s => s.row.status === 'suggested').slice(0, MAX_VISIBLE);
        const untrackedAndRejected = scored.filter(s => s.row.status !== 'suggested');

        // Badge counts only actionable suggestions — dismissing the visible set
        // should make the count drop, otherwise the UI looks broken.
        const suggestedTotal = filtered.filter(s => s.status === 'suggested').length;

        // Strip aggregation fields before returning; client doesn't need them.
        const suggestions = [...topSuggested, ...untrackedAndRejected].map(({ row }) => ({
            id: row.id,
            name: row.name,
            website: row.website,
            entityId: row.entityId,
            status: row.status,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        }));

        return NextResponse.json({
            suggestions,
            totalCount: suggestedTotal,
        });
    } catch (error) {
        console.error("Error fetching suggestions:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ entityId: string }> }
) {
    const { entityId } = await params;
    const authResult = await withEntityAuth(entityId, { requireWrite: true });
    if (authResult.error) return authResult.error;
    try {
        const body = await request.json();
        const { name, website, status } = body;

        if (!name) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        const suggestion = await prisma.suggestedCompetitor.upsert({
            where: {
                name_entityId: {
                    name,
                    entityId
                }
            },
            update: {
                status: status || 'untracked',
                website: website || null,
            },
            create: {
                name,
                website: website || null,
                entityId,
                status: status || 'untracked',
            },
        });

        return NextResponse.json(suggestion);
    } catch (error) {
        console.error("Error creating suggestion:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
