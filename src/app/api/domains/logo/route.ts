import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractDomain, logoProxyPath } from "@/lib/logoUtils";
import { determineType } from "@/lib/domainUtils";

/**
 * Resolve a type name (from heuristic or existing data) to a DomainType ID.
 * Returns null if no matching DomainType exists.
 */
async function resolveTypeId(typeName: string): Promise<string | null> {
    const dt = await prisma.domainType.findUnique({ where: { name: typeName } });
    return dt?.id ?? null;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const domainParam = searchParams.get('domain');

    if (!domainParam) {
        return NextResponse.json({ error: "Domain parameter is required" }, { status: 400 });
    }

    const domain = extractDomain(domainParam);
    if (!domain) {
        return NextResponse.json({ error: "Invalid domain" }, { status: 400 });
    }

    const logoUrl = logoProxyPath(domain);
    const defaultTypeId = await resolveTypeId(determineType(domain));

    const record = await prisma.domain.upsert({
        where: { domain },
        update: { logoUrl, updatedAt: new Date() },
        create: { domain, logoUrl, lastChecked: new Date(0), typeId: defaultTypeId },
        include: { domainType: true },
    });

    return NextResponse.json({
        domain: record.domain,
        logoUrl: record.logoUrl,
        type: record.domainType?.name ?? null,
        typeId: record.typeId,
    });
}

/**
 * POST /api/domains/logo
 * Batch resolve logo URLs and domain types for a list of domains.
 */
export async function POST(request: Request) {
    try {
        const { domains, entityId } = await request.json();

        if (!Array.isArray(domains) || domains.length === 0) {
            return NextResponse.json({ error: "Domains array is required" }, { status: 400 });
        }

        const cleanDomains = domains
            .map((d: string) => extractDomain(d))
            .filter(Boolean) as string[];

        if (cleanDomains.length === 0) {
            return NextResponse.json([]);
        }

        // Fetch all existing records + their types in one query
        const existing = await prisma.domain.findMany({
            where: { domain: { in: cleanDomains } },
            include: { domainType: true },
        });
        const existingMap = new Map(existing.map(r => [r.domain, r]));

        // Fetch entity-scoped overrides if entityId provided
        const overrideMap = new Map<string, { typeId: string | null }>();
        if (entityId) {
            const overrides = await prisma.entityDomainOverride.findMany({
                where: { entityId, domain: { in: cleanDomains } },
            });
            overrides.forEach(o => overrideMap.set(o.domain, { typeId: o.typeId }));
        }

        // Pre-fetch all DomainTypes for resolving heuristic names + override type names
        const allTypes = await prisma.domainType.findMany();
        const typeNameMap = new Map(allTypes.map(t => [t.name, t.id]));
        const typeIdMap = new Map(allTypes.map(t => [t.id, t.name]));

        const results = await Promise.all(
            cleanDomains.map(async (domain) => {
                const record = existingMap.get(domain);
                const logoUrl = logoProxyPath(domain);

                let globalTypeId: string | null;

                if (record) {
                    // Existing row — keep typeId if set, resolve heuristic otherwise.
                    if (record.typeId) {
                        globalTypeId = record.typeId;
                    } else {
                        const heuristicName = determineType(domain, record.domainType?.name ?? undefined);
                        globalTypeId = typeNameMap.get(heuristicName) ?? null;
                    }

                    // Backfill the self-ref URL if we're still holding a legacy external one.
                    if (record.logoUrl !== logoUrl || (!record.typeId && globalTypeId)) {
                        await prisma.domain.update({
                            where: { domain },
                            data: {
                                logoUrl,
                                ...(record.typeId ? {} : { typeId: globalTypeId }),
                                updatedAt: new Date(),
                            },
                        });
                    }
                } else {
                    const heuristicName = determineType(domain);
                    globalTypeId = typeNameMap.get(heuristicName) ?? null;

                    await prisma.domain.create({
                        data: {
                            domain,
                            logoUrl,
                            typeId: globalTypeId,
                            lastChecked: new Date(0), // force a scrape on first /api/card/logo hit
                        },
                    });
                }

                // Entity override takes precedence over global type
                const override = overrideMap.get(domain);
                const resolvedTypeId = override !== undefined ? override.typeId : globalTypeId;
                const resolvedTypeName = resolvedTypeId ? (typeIdMap.get(resolvedTypeId) ?? null) : null;

                return {
                    domain,
                    logoUrl,
                    type: resolvedTypeName,
                    typeId: resolvedTypeId,
                };
            })
        );

        return NextResponse.json(results.filter(Boolean));
    } catch (error) {
        console.error("Error batch fetching domain logos:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
