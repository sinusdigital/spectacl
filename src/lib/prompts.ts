import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

// Shared cached data fetcher for Prompt Details
export async function getCachedPrompt(id: string) {
    const cachedFn = unstable_cache(
        async () => {
            return prisma.prompt.findUnique({
                where: { id },
                include: {
                    tags: true,
                    analysisResults: {
                        orderBy: { createdAt: 'desc' },
                        take: 50,
                        include: {
                            mentions: {
                                include: {
                                    competitor: {
                                        select: { name: true, logoUrl: true, website: true }
                                    }
                                }
                            },
                            links: true
                        }
                    }
                },
            });
        },
        [`prompt-${id}`], 
        {
            tags: [`prompt-${id}`], 
            revalidate: 3600
        }
    );

    return cachedFn();
}
