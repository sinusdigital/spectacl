import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { auditLog } from '@/lib/audit';

async function requireAdmin() {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user || session.user.role !== 'ADMIN') return null;
        return session;
    } catch {
        return null;
    }
}

export async function GET() {
    if (!await requireAdmin()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const types = await prisma.domainType.findMany({
        orderBy: { name: 'asc' },
    });

    return NextResponse.json(types);
}

export async function POST(req: NextRequest) {
    const session = await requireAdmin();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { name, slug, color, description, isOwned, isEarned } = await req.json();

    if (!name?.trim() || !slug?.trim()) {
        return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });
    }

    const created = await prisma.domainType.create({
        data: { name: name.trim(), slug: slug.trim(), color, description, ...(isOwned !== undefined && { isOwned }), ...(isEarned !== undefined && { isEarned }) },
    });

    await auditLog({ userId: session.user.id, action: 'domain_type.create', targetType: 'DomainType', targetId: created.id, detail: { name: name.trim(), slug: slug.trim() } });

    return NextResponse.json(created, { status: 201 });
}
