import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

async function requireAdmin() {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user || session.user.role !== 'ADMIN') return null;
        return session;
    } catch {
        return null;
    }
}

export async function GET(req: NextRequest) {
    if (!await requireAdmin()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const typeId = searchParams.get('typeId');

    const domains = await prisma.domain.findMany({
        where: typeId ? { typeId } : undefined,
        include: { domainType: true },
        orderBy: [{ domainType: { name: 'asc' } }, { domain: 'asc' }],
    });

    return NextResponse.json(domains);
}
