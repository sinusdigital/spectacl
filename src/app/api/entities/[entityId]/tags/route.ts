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
        const tags = await prisma.tag.findMany({
            where: { entityId },
            orderBy: { name: 'asc' },
        });

        return NextResponse.json(tags);
    } catch (error) {
        console.error("Error fetching tags:", error);
        return NextResponse.json(
            { error: "Error fetching tags" },
            { status: 500 }
        );
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ entityId: string }> }
) {
    try {
        const { entityId } = await params;
        const authResult = await withEntityAuth(entityId, { requireWrite: true });
        if (authResult.error) return authResult.error;
        const body = await request.json();
        const { name, color } = body;

        if (!name) {
            return NextResponse.json(
                { error: "Name is required" },
                { status: 400 }
            );
        }

        const tag = await prisma.tag.upsert({
            where: {
                name_entityId: {
                    name,
                    entityId,
                }
            },
            create: {
                name,
                color,
                entityId,
            },
            update: {
                color,
            }
        });

        return NextResponse.json(tag);
    } catch (error) {
        console.error("Error creating tag:", error);
        return NextResponse.json(
            { error: "Error creating tag" },
            { status: 500 }
        );
    }
}
