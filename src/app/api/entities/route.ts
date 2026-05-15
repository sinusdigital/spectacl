import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { fetchLogoUrl, extractDomain, scrapeAndStoreLogo } from "@/lib/logoUtils";
import { normalizeUrl } from "@/lib/domainUtils";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { ensureSpaceNotHalted } from "@/lib/billing/access";
import { resolveSpaceAccess } from "@/lib/space-access";
import { isSupportWriteMode } from "@/lib/support-mode";

export async function POST(request: Request) {
    try {
        // 1. Authenticate user
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // 2. Get spaceId from request or user's current space
        const body = await request.json();
        const { name, website: rawWebsite, logoUrl: providedLogoUrl, spaceId: requestedSpaceId } = body;
        const website = normalizeUrl(rawWebsite);

        if (!name) {
            return NextResponse.json(
                { error: "Name is required" },
                { status: 400 }
            );
        }

        let spaceId = requestedSpaceId;

        // If no spaceId provided, get user's current space
        if (!spaceId) {
            const { getCurrentSpace } = await import('@/lib/spaces');
            const currentSpace = await getCurrentSpace(session.user.id);

            if (!currentSpace) {
                return NextResponse.json(
                    { error: "No space found. Please create or join a space first." },
                    { status: 404 }
                );
            }

            spaceId = currentSpace.id;
        }

        // Verify user has access to the space (member OR app-admin in support write mode)
        const access = await resolveSpaceAccess(session.user.id, spaceId);
        if (access.kind === 'none') {
            return NextResponse.json(
                { error: "You don't have access to this space" },
                { status: 403 }
            );
        }
        if (access.kind === 'admin-override' && !(await isSupportWriteMode(spaceId))) {
            return NextResponse.json(
                { error: "Support mode is read-only. Enable write mode to create entities." },
                { status: 403 }
            );
        }

        // Billing halt check — skipped for admin support mode so staff can
        // still set up a space whose trial has expired.
        if (access.kind === 'member') {
            const haltedResponse = await ensureSpaceNotHalted(spaceId);
            if (haltedResponse) return haltedResponse;
        }

        const spaceRecord = await prisma.space.findUnique({
            where: { id: spaceId },
            select: { plan: true },
        });
        if (!spaceRecord) {
            return NextResponse.json({ error: "Space not found" }, { status: 404 });
        }

        // Check plan limits
        const { getPlanLimitsFromDb, wouldExceedLimit } = await import("@/lib/billing/plans");
        const limits = await getPlanLimitsFromDb(spaceRecord.plan);
        const currentEntityCount = await prisma.entity.count({
            where: {
                spaceId: spaceId,
                isArchived: false,
            },
        });

        if (wouldExceedLimit(currentEntityCount, limits.maxEntities)) {
            return NextResponse.json(
                { error: `Entity limit reached for ${spaceRecord.plan} plan (${limits.maxEntities} entities)` },
                { status: 403 }
            );
        }

        // 3. Fetch logo URL if website is provided and no logo URL given.
        //    This upserts the Domain row and returns a self-ref proxy path.
        const logoUrl = providedLogoUrl || (website ? await fetchLogoUrl(website) : null);

        // 4. Scrape the real logo synchronously so we can extract brand color
        //    from actual bytes. Falls back gracefully if scraping fails.
        let primaryColor = null;
        const entityDomain = website ? extractDomain(website) : null;
        if (entityDomain) {
            await scrapeAndStoreLogo(entityDomain);
            const stored = await prisma.domain.findUnique({
                where: { domain: entityDomain },
                select: { logoBytes: true },
            });
            if (stored?.logoBytes) {
                const { extractBrandColor } = await import("@/lib/colorUtils");
                const colors = await extractBrandColor(Buffer.from(stored.logoBytes));
                primaryColor = colors.vibrant || colors.darkVibrant;
            }
        }

        // 5. Create entity with spaceId
        const entity = await prisma.entity.create({
            data: {
                name,
                website,
                logoUrl,
                primaryColor,
                userId: session.user.id,
                spaceId: spaceId,
            },
        });

        // 6. Auto-set entity domain as "Own" type
        if (website) {
            const domain = extractDomain(website);
            if (domain) {
                const ownType = await prisma.domainType.findUnique({ where: { slug: 'own' } });
                if (ownType) {
                    await prisma.entityDomainOverride.create({
                        data: { entityId: entity.id, domain, typeId: ownType.id },
                    });
                }
            }
        }

        // 7. Update space usage count
        const newCount = await prisma.entity.count({
            where: {
                spaceId: spaceId,
                isArchived: false,
            },
        });

        await prisma.spaceUsage.update({
            where: {
                spaceId: spaceId,
            },
            data: {
                entityCount: newCount,
            },
        });

        // Invalidate layout cache so sidebar reflects new entity
        revalidatePath('/', 'layout');

        return NextResponse.json({ entity });
    } catch (error) {
        console.error("Error creating entity:", error);
        return NextResponse.json(
            { error: "Error creating entity" },
            { status: 500 }
        );
    }
}

export async function GET(request: Request) {
    try {
        // Authenticate user
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const includeArchived = searchParams.get("includeArchived") === "true";

        // Get current space
        const { getCurrentSpace } = await import('@/lib/spaces');
        const currentSpace = await getCurrentSpace(session.user.id);

        if (!currentSpace) {
            return NextResponse.json(
                { error: "No space found. Please create or join a space." },
                { status: 404 }
            );
        }

        // Fetch entities for current space only
        const entities = await prisma.entity.findMany({
            where: {
                spaceId: currentSpace.id,
                ...(includeArchived ? {} : { isArchived: false }),
            },
            orderBy: {
                updatedAt: 'desc',
            },
            include: {
                _count: {
                    select: {
                        prompts: true,
                    },
                },
                metrics: {
                    take: 1,
                    orderBy: {
                        createdAt: 'desc'
                    }
                }
            },
        });

        // Enrich with active prompt, ranking, and AEO suggestion counts per entity.
        // "Active suggestions" = Suggested + ToDo + In_Progress (i.e. open todos).
        const entityIds = entities.map(e => e.id);
        const [activePromptCounts, activeRankingCounts, activeSuggestionCounts] = await Promise.all([
            prisma.prompt.groupBy({
                by: ['entityId'],
                where: { entityId: { in: entityIds }, status: 'Running', ranking: { is: null } },
                _count: true,
            }),
            prisma.prompt.groupBy({
                by: ['entityId'],
                where: { entityId: { in: entityIds }, status: 'Running', ranking: { isNot: null } },
                _count: true,
            }),
            prisma.entitySuggestion.groupBy({
                by: ['entityId'],
                where: {
                    entityId: { in: entityIds },
                    status: { in: ['Suggested', 'ToDo', 'In_Progress'] },
                },
                _count: true,
            }),
        ]);

        const promptCountMap = Object.fromEntries(activePromptCounts.map(r => [r.entityId, r._count]));
        const rankingCountMap = Object.fromEntries(activeRankingCounts.map(r => [r.entityId, r._count]));
        const suggestionCountMap = Object.fromEntries(activeSuggestionCounts.map(r => [r.entityId, r._count]));

        const enriched = entities.map(e => ({
            ...e,
            activePromptCount: promptCountMap[e.id] ?? 0,
            activeRankingCount: rankingCountMap[e.id] ?? 0,
            activeSuggestionCount: suggestionCountMap[e.id] ?? 0,
        }));

        return NextResponse.json(enriched);
    } catch (error) {
        console.error("Error fetching entities:", error);
        return NextResponse.json(
            { error: "Error fetching entities" },
            { status: 500 }
        );
    }
}

