import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { selectTacticsForEntity, AeoSelectionError } from "@/lib/aeo/selector";

async function requireAdmin() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || session.user.role !== "ADMIN") {
        return { error: NextResponse.json({ error: "Unauthorized" }, { status: 403 }) };
    }
    return { error: null };
}

/**
 * Dry-run the AEO selector against a chosen entity. Read-only — does NOT
 * upsert into EntitySuggestion. Used by /admin/aeo-playbook to preview how
 * the current playbook would behave for a real customer entity.
 */
export async function POST(req: NextRequest) {
    const { error } = await requireAdmin();
    if (error) return error;

    let body;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const entityId = (body as { entityId?: unknown })?.entityId;
    if (typeof entityId !== "string" || !entityId) {
        return NextResponse.json({ error: "entityId is required" }, { status: 400 });
    }

    try {
        const result = await selectTacticsForEntity(entityId);
        return NextResponse.json({
            tactics: result.tactics.map(({ item, personalizedDescription, triggerContext }) => ({
                slug: item.slug,
                title: item.title,
                channel: item.channel,
                category: item.category,
                defaultImpact: item.defaultImpact,
                defaultEffort: item.defaultEffort,
                personalizedDescription,
                triggerContext,
            })),
        });
    } catch (err) {
        if (err instanceof AeoSelectionError) {
            const status = err.code === "no_website" ? 400 : 500;
            return NextResponse.json({ error: err.message, code: err.code }, { status });
        }
        console.error("[AEO Playbook Preview] Failed:", err);
        return NextResponse.json({ error: err instanceof Error ? err.message : "Preview failed" }, { status: 500 });
    }
}
