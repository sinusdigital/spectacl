
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Finding Entity for Tag "Leadec Query"...');
    const tagName = 'Leadec Query';

    // Find correct entity
    const entities = await prisma.entity.findMany();
    let targetEntity = null;
    let targetTag = null;

    for (const entity of entities) {
        const tag = await prisma.tag.findFirst({
            where: { name: tagName, entityId: entity.id }
        });
        if (tag) {
            targetEntity = entity;
            targetTag = tag;
            break;
        }
    }

    if (!targetEntity) {
        console.log("Entity with tag not found");
        return;
    }

    console.log(`Using Entity: ${targetEntity.name} (${targetEntity.id})`);
    console.log(`Using Tag: ${targetTag?.name}`);

    const timeframe = 'standard';
    const days = 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    console.log(`StartDate: ${startDate.toISOString()}`);

    const tagNames = [tagName];
    const hasTags = true;

    // --- NEW PURE PRISMA LOGIC START ---
    console.log("--- Executing Pure Prisma Logic ---");

    const baseWhere = {
        prompt: {
            entityId: targetEntity.id,
            ...(hasTags ? {
                tags: {
                    some: {
                        name: { in: tagNames }
                    }
                }
            } : {})
        },
        createdAt: { gte: startDate }
    };

    try {
        const [
            totalCount,
            mentionCount,
            entityAggregates,
            // competitors, // skip for brevity
            // competitorStats // skip
        ] = await prisma.$transaction([
            // 1. Total Answer Count
            prisma.analysisResult.count({ where: baseWhere }),

            // 2. Mention Count (Entity)
            prisma.analysisResult.count({
                where: {
                    ...baseWhere,
                    mentioned: true
                }
            }),

            // 3. Entity Sentiment & Position Avg
            prisma.analysisResult.aggregate({
                where: baseWhere,
                _avg: {
                    sentiment: true,
                    position: true
                }
            }),
        ]);

        console.log('Total Count:', totalCount);
        console.log('Mention Count:', mentionCount);
        console.log('Aggregates:', entityAggregates);

        const visibility = totalCount > 0 ? (mentionCount / totalCount) * 100 : 0;
        console.log(`Calculated Visibility: ${visibility}%`);

    } catch (e) {
        console.error("Prisma Error:", e);
    }

}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
