import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";
import { Prisma, AeoChannel, AeoSuggestionCategory } from "@prisma/client";
import { validatePayload } from "../route";

async function requireAdmin() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || session.user.role !== "ADMIN") {
        return { error: NextResponse.json({ error: "Unauthorized" }, { status: 403 }), userId: null };
    }
    return { error: null, userId: session.user.id };
}

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ slug: string }> },
) {
    const { error } = await requireAdmin();
    if (error) return error;
    const { slug } = await params;

    const item = await prisma.aeoPlaybookItem.findUnique({ where: { slug } });
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ item });
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ slug: string }> },
) {
    const { error, userId } = await requireAdmin();
    if (error) return error;
    const { slug } = await params;

    let body;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const v = validatePayload(body);
    if ("error" in v) return v.error;

    const existing = await prisma.aeoPlaybookItem.findUnique({ where: { slug } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await prisma.aeoPlaybookItem.update({
        where: { slug },
        data: {
            title: v.title,
            description: v.description,
            category: v.category as AeoSuggestionCategory,
            channel: v.channel as AeoChannel,
            defaultImpact: v.defaultImpact,
            defaultEffort: v.defaultEffort,
            tags: v.tags,
            isActive: v.isActive,
            version: { increment: 1 },
        },
    });

    const wasDeactivated = existing.isActive && !updated.isActive;
    await auditLog({
        userId: userId!,
        action: wasDeactivated ? "aeo_playbook.deactivate" : "aeo_playbook.update",
        targetType: "AeoPlaybookItem",
        targetId: updated.slug,
        detail: {
            title: updated.title,
            channel: updated.channel,
            category: updated.category,
            version: updated.version,
            isActive: updated.isActive,
        },
    });

    return NextResponse.json({ item: updated });
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ slug: string }> },
) {
    const { error, userId } = await requireAdmin();
    if (error) return error;
    const { slug } = await params;

    const existing = await prisma.aeoPlaybookItem.findUnique({ where: { slug } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    try {
        await prisma.aeoPlaybookItem.delete({ where: { slug } });
    } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError) {
            console.error("[AEO Playbook] Delete failed:", err.code, err.message);
        }
        return NextResponse.json({ error: "Delete failed" }, { status: 500 });
    }

    await auditLog({
        userId: userId!,
        action: "aeo_playbook.delete",
        targetType: "AeoPlaybookItem",
        targetId: slug,
        detail: { title: existing.title },
    });

    return NextResponse.json({ ok: true });
}
