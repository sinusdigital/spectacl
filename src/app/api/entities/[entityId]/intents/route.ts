import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withEntityAuth } from '@/lib/permissions';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ entityId: string }> }
) {
    try {
        const { entityId } = await params;
        const authResult = await withEntityAuth(entityId);
        if (authResult.error) return authResult.error;

        // Fetch unique intents from prompts for this entity
        const intents = await prisma.prompt.findMany({
            where: {
                entityId
            },
            select: {
                intent: true
            },
            distinct: ['intent']
        });

        // Format for consistency with other filters
        const formattedIntents = intents
            .filter(i => i.intent && i.intent !== 'Competitor Analysis')
            .map(i => ({
                id: i.intent, // Use intent string as ID
                name: i.intent
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

        return NextResponse.json(formattedIntents);
    } catch (error) {
        console.error("Error fetching intents:", error);
        return NextResponse.json(
            { error: "Error fetching intents" },
            { status: 500 }
        );
    }
}
