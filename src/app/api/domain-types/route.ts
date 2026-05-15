import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    const types = await prisma.domainType.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true, slug: true, color: true, description: true, isOwned: true, isEarned: true },
    });

    return NextResponse.json(types, {
        headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600' },
    });
}
