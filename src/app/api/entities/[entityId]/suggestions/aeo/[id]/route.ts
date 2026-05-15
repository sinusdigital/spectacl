import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withEntityAuth } from "@/lib/permissions";
import { AeoSuggestionStatus } from "@prisma/client";

const VALID_STATUS = new Set<AeoSuggestionStatus>([
    "Suggested",
    "ToDo",
    "In_Progress",
    "Done",
    "Dismissed",
]);

/**
 * PATCH a single suggestion — used by Kanban drag, detail-modal save, and dismiss/restore.
 * Whitelists editable fields so callers can't mutate entityId or tacticId.
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ entityId: string; id: string }> }
) {
    const { entityId, id } = await params;
    const authResult = await withEntityAuth(entityId, { requireWrite: true });
    if (authResult.error) return authResult.error;

    const body = await req.json().catch(() => ({}));

    const update: Record<string, unknown> = {};
    if (typeof body.title === "string") update.title = body.title.trim();
    if (typeof body.description === "string") update.description = body.description;
    if (typeof body.notes === "string") update.notes = body.notes;
    if (typeof body.dismissedReason === "string" || body.dismissedReason === null) {
        update.dismissedReason = body.dismissedReason;
    }
    // Channel, category, impact, effort, and tags are all deterministic — set by the
    // engine (or by manual-create defaults) and not user-editable. Silently ignored.
    if (typeof body.status === "string" && VALID_STATUS.has(body.status as AeoSuggestionStatus)) {
        update.status = body.status;
    }
    if (body.dueDate === null) {
        update.dueDate = null;
    } else if (typeof body.dueDate === "string") {
        const d = new Date(body.dueDate);
        if (!Number.isNaN(d.getTime())) update.dueDate = d;
    }

    // Any mutating PATCH counts as "user has seen this row" → mark viewed if
    // not already. Drawer open fires a markViewed-only PATCH with no other
    // fields (body: { markViewed: true }).
    const isMutation = Object.keys(update).length > 0;
    const isMarkViewed = body.markViewed === true;
    if (!isMutation && !isMarkViewed) {
        return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    // Look up existing row to decide if we need to stamp viewedAt. Only set it
    // the first time — never overwrite an existing viewedAt.
    const existing = await prisma.entitySuggestion.findFirst({
        where: { id, entityId },
        select: { viewedAt: true },
    });
    if (!existing) {
        return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });
    }
    if (existing.viewedAt === null) {
        update.viewedAt = new Date();
    }

    // markViewed-only on an already-viewed row: nothing to write, return as-is.
    if (Object.keys(update).length === 0) {
        const suggestion = await prisma.entitySuggestion.findUnique({ where: { id } });
        return NextResponse.json({ suggestion });
    }

    // Use updateMany so we can scope by entityId — prevents cross-entity tampering
    // even with a guessed suggestion ID.
    const result = await prisma.entitySuggestion.updateMany({
        where: { id, entityId },
        data: update,
    });

    if (result.count === 0) {
        return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });
    }

    const suggestion = await prisma.entitySuggestion.findUnique({ where: { id } });
    return NextResponse.json({ suggestion });
}

/**
 * Hard delete. Used only by the page when a manual/custom suggestion is removed.
 * For engine-sourced items, prefer PATCH with status=Dismissed so the engine can
 * see history and avoid resurfacing.
 */
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ entityId: string; id: string }> }
) {
    const { entityId, id } = await params;
    const authResult = await withEntityAuth(entityId, { requireWrite: true });
    if (authResult.error) return authResult.error;

    const result = await prisma.entitySuggestion.deleteMany({
        where: { id, entityId },
    });

    if (result.count === 0) {
        return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
}
