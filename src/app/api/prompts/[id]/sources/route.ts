import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withPromptAuth } from "@/lib/permissions";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const authResult = await withPromptAuth(id);
        if (authResult.error) return authResult.error;

        const { searchParams } = new URL(request.url);
        
        const limit = parseInt(searchParams.get('limit') || '10', 10);
        
        // Fetch pre-aggregated source stats
        const sources = await prisma.domainCitation.findMany({
            where: { promptId: id },
            orderBy: { count: 'desc' },
            take: limit
        });

        // Get total count
        const total = await prisma.domainCitation.count({
            where: { promptId: id }
        });

        return NextResponse.json({
            domains: sources,
            total
        });
    } catch (error) {
        console.error("Error fetching sources:", error);
        return NextResponse.json(
            { error: "Error fetching sources" },
            { status: 500 }
        );
    }
}
