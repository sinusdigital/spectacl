import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

/**
 * Admin-only entity search. Returns up to 25 entities matching `q` (substring,
 * case-insensitive) along with their space name. Used by /admin/aeo-playbook
 * to pick a target entity for the playbook preview.
 */
export async function GET(req: NextRequest) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
    const entities = await prisma.entity.findMany({
        where: {
            isArchived: false,
            ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
        },
        select: {
            id: true,
            name: true,
            website: true,
            space: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 25,
    });

    return NextResponse.json({ entities });
}
