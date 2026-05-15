import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { fetchLogoUrl, extractDomain } from "@/lib/logoUtils";
import { normalizeUrl } from "@/lib/domainUtils";
import { withEntityAuth } from '@/lib/permissions';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ entityId: string }> }
) {
    try {
        const { entityId } = await params;
        const authResult = await withEntityAuth(entityId);
        if (authResult.error) return authResult.error;
        const entity = await prisma.entity.findUnique({
            where: { id: entityId },
            select: { id: true, name: true, website: true, logoUrl: true, aliases: true, discoveryInputs: true },
        });

        if (!entity) {
            return NextResponse.json(
                { error: "Entity not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(entity);
    } catch (error) {
        console.error("Error fetching entity:", error);
        return NextResponse.json(
            { error: "Error fetching entity" },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ entityId: string }> }
) {
    try {
        const { entityId } = await params;
        const authResult = await withEntityAuth(entityId, { requireWrite: true });
        if (authResult.error) return authResult.error;
        const { name, website: rawWebsite, aliases, isArchived } = await request.json();
        const website = normalizeUrl(rawWebsite);

        if (!name) {
            return NextResponse.json(
                { error: "Name is required" },
                { status: 400 }
            );
        }

        // Get current entity to check if website changed
        const currentEntity = await prisma.entity.findUnique({
            where: { id: entityId },
            select: { website: true, logoUrl: true },
        });

        // Fetch new logo URL if website changed
        let logoUrl = currentEntity?.logoUrl;
        if (website && website !== currentEntity?.website) {
            logoUrl = await fetchLogoUrl(website);
        } else if (!website) {
            logoUrl = null;
        }

        console.log("API: Prisma models available:", Object.keys(prisma));
        
        const entity = await prisma.entity.update({
            where: { id: entityId },
            data: { name, website, logoUrl, aliases, isArchived },
        });

        // Auto-set entity domain as "Own" type when website changes
        if (website && website !== currentEntity?.website) {
            const domain = extractDomain(website);
            if (domain) {
                const ownType = await prisma.domainType.findUnique({ where: { slug: 'own' } });
                if (ownType) {
                    await prisma.entityDomainOverride.upsert({
                        where: { entityId_domain: { entityId, domain } },
                        update: { typeId: ownType.id },
                        create: { entityId, domain, typeId: ownType.id },
                    });
                }
            }
        }

        // If entity is being archived, pause all its prompts
        if (isArchived) {
            await prisma.prompt.updateMany({
                where: { entityId: entityId },
                data: { status: "Paused" },
            });
        }

        // Update SpaceUsage count for active entities
        if (entity.spaceId && typeof isArchived !== 'undefined') {
            const count = await prisma.entity.count({
                where: { 
                    spaceId: entity.spaceId,
                    isArchived: false 
                }
            });

            await prisma.spaceUsage.update({
                where: { spaceId: entity.spaceId },
                data: { entityCount: count }
            });
        }

        // Invalidate layout cache so sidebar reflects updated entity list and status
        revalidatePath('/', 'layout');

        return NextResponse.json(entity);
    } catch (error) {
        console.error("Error updating entity:", error);
        if (error instanceof Error) {
            console.error("Error details:", {
                message: error.message,
                stack: error.stack,
                // @ts-expect-error - Prisma error codes
                code: error.code,
                // @ts-expect-error - Prisma error meta
                meta: error.meta
            });
        }
        return NextResponse.json(
            { error: "Error updating entity", details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ entityId: string }> }
) {
    try {
        const { entityId } = await params;
        const authResult = await withEntityAuth(entityId, { requireWrite: true });
        if (authResult.error) return authResult.error;

        // Delete the entity and update space usage in a transaction
        await prisma.$transaction(async (tx) => {
            // Get the entity to find its spaceId
            const entity = await tx.entity.findUnique({
                where: { id: entityId },
                select: { spaceId: true }
            });

            if (!entity) {
                throw new Error("Entity not found");
            }

            // Delete the entity
            await tx.entity.delete({
                where: { id: entityId },
            });

            // Update entity count in SpaceUsage if spaceId exists
            if (entity.spaceId) {
                // Get actual count
                const count = await tx.entity.count({
                    where: { 
                        spaceId: entity.spaceId,
                        isArchived: false // Only count active entities
                    }
                });

                await tx.spaceUsage.update({
                    where: { spaceId: entity.spaceId },
                    data: {
                        entityCount: count
                    }
                });
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting entity:", error);
        return NextResponse.json(
            { error: "Error deleting entity" },
            { status: 500 }
        );
    }
}
