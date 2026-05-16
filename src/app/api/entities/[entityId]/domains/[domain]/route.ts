import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withEntityAuth } from "@/lib/permissions";

/**
 * PATCH — Upsert an entity-scoped domain type override.
 * This does NOT touch the global Domain registry.
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ entityId: string; domain: string }> }
) {
    const { entityId, domain } = await params;

    const authResult = await withEntityAuth(entityId);
    if (authResult.error) return authResult.error;

    const { typeId } = await req.json();

    const override = await prisma.entityDomainOverride.upsert({
        where: { entityId_domain: { entityId, domain: decodeURIComponent(domain) } },
        update: { typeId: typeId ?? null },
        create: { entityId, domain: decodeURIComponent(domain), typeId: typeId ?? null },
        include: { domainType: true },
    });

    return NextResponse.json(override);
}

/**
 * DELETE — Remove an entity-scoped override, reverting to the global default.
 */
export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ entityId: string; domain: string }> }
) {
    const { entityId, domain } = await params;

    const authResult = await withEntityAuth(entityId);
    if (authResult.error) return authResult.error;

    try {
        await prisma.entityDomainOverride.delete({
            where: { entityId_domain: { entityId, domain: decodeURIComponent(domain) } },
        });
        return NextResponse.json({ ok: true });
    } catch {
        // No override existed — that's fine
        return NextResponse.json({ ok: true });
    }
}
