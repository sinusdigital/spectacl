import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { withEntityAuth } from "@/lib/permissions";
import { selectTacticsForEntity, AeoSelectionError } from "@/lib/aeo/selector";
import { SystemSettings } from "@/lib/settings";

/** Default Generate cooldown in hours. Editable via SystemSettings key
 *  `aeo_generate_cooldown_hours` on the admin Master LLMs page. */
const DEFAULT_COOLDOWN_HOURS = 168; // 7 days

export async function POST(
    _req: NextRequest,
    { params }: { params: Promise<{ entityId: string }> }
) {
    const { entityId } = await params;
    const authResult = await withEntityAuth(entityId, { requireWrite: true });
    if (authResult.error) return authResult.error;

    // ─── Cooldown gate ────────────────────────────────────────────────
    // Bypass for app admins (User.role === "ADMIN") and for any space on the
    // FOUNDER plan. Everyone else is rate-limited to one Generate per
    // cooldown window per entity. The cooldown is editable in admin settings.
    const isAdmin = authResult.session.user.role === "ADMIN";
    if (!isAdmin) {
        const space = await prisma.space.findUnique({
            where: { id: authResult.spaceId },
            select: { plan: true },
        });
        if (space?.plan !== "FOUNDER") {
            const cooldownHours = Number(
                (await SystemSettings.get("aeo_generate_cooldown_hours")) ?? DEFAULT_COOLDOWN_HOURS,
            );
            const lastEngineRow = await prisma.entitySuggestion.findFirst({
                where: { entityId, source: "engine" },
                orderBy: { createdAt: "desc" },
                select: { createdAt: true },
            });
            if (lastEngineRow && Number.isFinite(cooldownHours) && cooldownHours > 0) {
                const cooldownMs = cooldownHours * 60 * 60 * 1000;
                const nextAvailableAt = new Date(lastEngineRow.createdAt.getTime() + cooldownMs);
                if (nextAvailableAt > new Date()) {
                    const retryAfterSec = Math.ceil((nextAvailableAt.getTime() - Date.now()) / 1000);
                    return NextResponse.json(
                        {
                            error: "Generate is on cooldown for this entity.",
                            code: "cooldown",
                            nextAvailableAt: nextAvailableAt.toISOString(),
                            cooldownHours,
                        },
                        {
                            status: 429,
                            headers: { "Retry-After": String(retryAfterSec) },
                        },
                    );
                }
            }
        }
    }

    let result;
    try {
        result = await selectTacticsForEntity(entityId);
    } catch (err) {
        if (err instanceof AeoSelectionError) {
            const status = err.code === "no_website" ? 400 : 500;
            return NextResponse.json({ error: err.message }, { status });
        }
        console.error("[AEO Analyze] Selection failed:", err);
        const message = err instanceof Error ? err.message : "Analysis failed";
        return NextResponse.json({ error: message }, { status: 500 });
    }

    // Persist into EntitySuggestion. Three cases per chosen item:
    //   - new (no existing row): create at status=Suggested (default), viewedAt=null
    //     so the UI flags it NEW.
    //   - existing & status=Suggested: full refresh — title, description,
    //     deterministic fields, and triggerContext all get rewritten.
    //   - existing & status in {ToDo, In_Progress, Done, Dismissed}: FROZEN.
    //     Engine no longer owns this row. We pass the existing record through to
    //     the response unchanged. (User-accepted items are user-owned.)
    const upserted = await prisma.$transaction(async (tx) => {
        const records = [];
        for (const { item, personalizedDescription, triggerContext } of result.tactics) {
            const existing = await tx.entitySuggestion.findUnique({
                where: { entityId_tacticId: { entityId, tacticId: item.slug } },
            });

            // null → Prisma.JsonNull so the JSONB column resets to SQL NULL when
            // an item drops out of the triggered set on a subsequent run.
            const triggerJson: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue =
                triggerContext === null
                    ? Prisma.JsonNull
                    : (triggerContext as unknown as Prisma.InputJsonValue);

            if (!existing) {
                const row = await tx.entitySuggestion.create({
                    data: {
                        entityId,
                        tacticId: item.slug,
                        title: item.title,
                        description: personalizedDescription,
                        category: item.category,
                        channel: item.channel,
                        impact: item.defaultImpact,
                        effort: item.defaultEffort,
                        tags: item.tags,
                        source: "engine",
                        triggerContext: triggerJson,
                        // viewedAt intentionally null → renders NEW dot until user touches it
                    },
                });
                records.push(row);
                continue;
            }

            if (existing.status === "Suggested") {
                // Still in the backlog — engine refresh is allowed.
                const row = await tx.entitySuggestion.update({
                    where: { id: existing.id },
                    data: {
                        title: item.title,
                        description: personalizedDescription,
                        category: item.category,
                        channel: item.channel,
                        impact: item.defaultImpact,
                        effort: item.defaultEffort,
                        tags: item.tags,
                        source: "engine",
                        triggerContext: triggerJson,
                    },
                });
                records.push(row);
                continue;
            }

            // Frozen — user has accepted/dismissed this row; engine can't rewrite.
            records.push(existing);
        }
        return records;
    });

    return NextResponse.json({ suggestions: upserted });
}
