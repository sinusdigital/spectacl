import { NextResponse } from "next/server";

/**
 * Global domain type mutations are no longer allowed from this endpoint.
 * Use entity-scoped overrides: PATCH /api/entities/[entityId]/domains/[domain]
 * Admin registry changes: PATCH /api/admin/domains/[id]
 */
export async function PATCH() {
    return NextResponse.json(
        { error: "Use entity-scoped endpoint: /api/entities/{entityId}/domains/{domain}" },
        { status: 410 }
    );
}
