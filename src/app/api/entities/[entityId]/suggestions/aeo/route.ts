import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withEntityAuth } from "@/lib/permissions";
import { AeoChannel, AeoSuggestionCategory } from "@prisma/client";

/**
 * List all AEO suggestions for an entity. The page renders all of them client-side
 * (volume is small — typically under 50 per entity), so no pagination yet.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ entityId: string }> }
) {
    const { entityId } = await params;
    const authResult = await withEntityAuth(entityId);
    if (authResult.error) return authResult.error;

    const suggestions = await prisma.entitySuggestion.findMany({
        where: { entityId },
        orderBy: [
            { status: "asc" },     // Suggested first, Dismissed last (alpha sort works on the enum)
            { impact: "desc" },
            { effort: "asc" },
        ],
    });

    return NextResponse.json({ suggestions });
}

/**
 * Create a manual EntitySuggestion (no `tacticId`, `source = 'manual'`).
 * Used by the inline-add row at the bottom of the backlog table — like a PO
 * filling the Jira backlog with their own line items.
 *
 * Only `title` is required. Channel, category, impact, and effort default to
 * sensible values; the user fills the rest via the detail drawer.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ entityId: string }> }
) {
    const { entityId } = await params;
    const authResult = await withEntityAuth(entityId, { requireWrite: true });
    if (authResult.error) return authResult.error;

    const body = await req.json().catch(() => ({}));
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) {
        return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const channel: AeoChannel =
        body.channel === "OffPage" ? "OffPage" : "OnPage";
    const validCategories: AeoSuggestionCategory[] = ["Content", "Technical", "Authority", "UX", "Brand"];
    const category: AeoSuggestionCategory = validCategories.includes(body.category)
        ? body.category
        : "Content";
    const impact = clamp(typeof body.impact === "number" ? Math.round(body.impact) : 5, 1, 10);
    const effort = clamp(typeof body.effort === "number" ? Math.round(body.effort) : 5, 1, 10);

    const suggestion = await prisma.entitySuggestion.create({
        data: {
            entityId,
            title,
            description: typeof body.description === "string" ? body.description : "",
            channel,
            category,
            impact,
            effort,
            status: "Suggested",
            source: "manual",
            tags: Array.isArray(body.tags) ? body.tags.filter((t: unknown) => typeof t === "string") : [],
        },
    });

    return NextResponse.json({ suggestion }, { status: 201 });
}

function clamp(n: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, n));
}
