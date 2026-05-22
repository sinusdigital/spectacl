import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    const languages = await prisma.language.findMany({
        where: { isEnabled: true },
        orderBy: [{ group: 'asc' }, { order: 'asc' }, { name: 'asc' }],
        select: { id: true, name: true, group: true },
    });

    // Group by category for the frontend Select
    const grouped: Record<string, { id: string; name: string }[]> = {};
    for (const lang of languages) {
        if (!grouped[lang.group]) grouped[lang.group] = [];
        grouped[lang.group].push({ id: lang.id, name: lang.name });
    }

    return NextResponse.json(grouped, {
        headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600' },
    });
}
