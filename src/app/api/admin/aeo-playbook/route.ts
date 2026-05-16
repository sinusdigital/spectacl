import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";
import { Prisma, AeoChannel, AeoSuggestionCategory } from "@prisma/client";

const ALLOWED_CHANNELS = new Set(["OnPage", "OffPage"]);
const ALLOWED_CATEGORIES = new Set(["Content", "Technical", "Authority", "UX", "Brand"]);
const SLUG_RE = /^[a-z0-9][a-z0-9_-]{1,63}$/;

async function requireAdmin() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || session.user.role !== "ADMIN") {
        return { error: NextResponse.json({ error: "Unauthorized" }, { status: 403 }), userId: null };
    }
    return { error: null, userId: session.user.id };
}

export async function GET() {
    const { error } = await requireAdmin();
    if (error) return error;

    const items = await prisma.aeoPlaybookItem.findMany({
        orderBy: [{ isActive: "desc" }, { slug: "asc" }],
    });
    return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
    const { error, userId } = await requireAdmin();
    if (error) return error;

    let body;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const v = validatePayload(body, { requireSlug: true });
    if ("error" in v) return v.error;

    try {
        const created = await prisma.aeoPlaybookItem.create({
            data: {
                slug: v.slug!,
                title: v.title,
                description: v.description,
                category: v.category as AeoSuggestionCategory,
                channel: v.channel as AeoChannel,
                defaultImpact: v.defaultImpact,
                defaultEffort: v.defaultEffort,
                tags: v.tags,
                isActive: v.isActive,
                createdById: userId,
            },
        });

        await auditLog({
            userId: userId!,
            action: "aeo_playbook.create",
            targetType: "AeoPlaybookItem",
            targetId: created.slug,
            detail: { title: created.title, channel: created.channel, category: created.category },
        });

        return NextResponse.json({ item: created }, { status: 201 });
    } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
            return NextResponse.json({ error: "A playbook item with that slug already exists." }, { status: 409 });
        }
        console.error("[AEO Playbook] Create failed:", err);
        return NextResponse.json({ error: "Create failed" }, { status: 500 });
    }
}

interface ValidPayload {
    slug?: string;
    title: string;
    description: string;
    category: string;
    channel: string;
    defaultImpact: number;
    defaultEffort: number;
    tags: string[];
    isActive: boolean;
}

export function validatePayload(
    body: unknown,
    opts: { requireSlug?: boolean } = {},
): ValidPayload | { error: NextResponse } {
    if (typeof body !== "object" || body === null) {
        return { error: NextResponse.json({ error: "Invalid body" }, { status: 400 }) };
    }
    const b = body as Record<string, unknown>;

    if (opts.requireSlug) {
        const slug = b.slug;
        if (typeof slug !== "string" || !SLUG_RE.test(slug)) {
            return { error: NextResponse.json({ error: "slug must match [a-z0-9][a-z0-9_-]{1,63}" }, { status: 400 }) };
        }
    }

    const title = b.title;
    if (typeof title !== "string" || !title.trim() || title.length > 200) {
        return { error: NextResponse.json({ error: "title is required (max 200 chars)" }, { status: 400 }) };
    }
    const description = b.description;
    if (typeof description !== "string" || !description.trim() || description.length > 10000) {
        return { error: NextResponse.json({ error: "description is required (max 10000 chars, markdown)" }, { status: 400 }) };
    }
    const category = b.category;
    if (typeof category !== "string" || !ALLOWED_CATEGORIES.has(category)) {
        return { error: NextResponse.json({ error: `category must be one of ${[...ALLOWED_CATEGORIES].join(", ")}` }, { status: 400 }) };
    }
    const channel = b.channel;
    if (typeof channel !== "string" || !ALLOWED_CHANNELS.has(channel)) {
        return { error: NextResponse.json({ error: `channel must be one of ${[...ALLOWED_CHANNELS].join(", ")}` }, { status: 400 }) };
    }
    const defaultImpact = Number(b.defaultImpact);
    if (!Number.isInteger(defaultImpact) || defaultImpact < 1 || defaultImpact > 10) {
        return { error: NextResponse.json({ error: "defaultImpact must be an integer 1-10" }, { status: 400 }) };
    }
    const defaultEffort = Number(b.defaultEffort);
    if (!Number.isInteger(defaultEffort) || defaultEffort < 1 || defaultEffort > 10) {
        return { error: NextResponse.json({ error: "defaultEffort must be an integer 1-10" }, { status: 400 }) };
    }
    let tags: string[] = [];
    if (Array.isArray(b.tags)) {
        tags = b.tags.filter((t): t is string => typeof t === "string" && t.trim().length > 0).map(t => t.trim());
    }
    const isActive = typeof b.isActive === "boolean" ? b.isActive : true;

    return {
        slug: typeof b.slug === "string" ? b.slug : undefined,
        title: title.trim(),
        description: description.trim(),
        category,
        channel,
        defaultImpact,
        defaultEffort,
        tags,
        isActive,
    };
}
