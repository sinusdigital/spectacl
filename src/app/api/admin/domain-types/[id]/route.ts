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

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await requireAdmin();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const { name, slug, color, description, isOwned, isEarned } = await req.json();

    // No cascade needed — Domain.typeId is a FK, so renaming DomainType.name
    // is reflected everywhere automatically via the relation.
    const updated = await prisma.domainType.update({
        where: { id },
        data: {
            ...(name !== undefined && { name }),
            ...(slug !== undefined && { slug }),
            ...(color !== undefined && { color }),
            ...(description !== undefined && { description }),
            ...(isOwned !== undefined && { isOwned }),
            ...(isEarned !== undefined && { isEarned }),
        },
    });

    await auditLog({ userId: session.user.id, action: 'domain_type.update', targetType: 'DomainType', targetId: id, detail: { name, slug, color } });

    return NextResponse.json(updated);
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await requireAdmin();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;

    // Check if type is in use via the relation count
    const typeRecord = await prisma.domainType.findUnique({
        where: { id },
        include: { _count: { select: { domains: true } } },
    });
    if (!typeRecord) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (typeRecord._count.domains > 0) {
        return NextResponse.json(
            { error: `Cannot delete: ${typeRecord._count.domains} domain(s) use this type. Reassign them first.` },
            { status: 409 }
        );
    }

    await prisma.domainType.delete({ where: { id } });
    await auditLog({ userId: session.user.id, action: 'domain_type.delete', targetType: 'DomainType', targetId: id, detail: { name: typeRecord.name } });
    return NextResponse.json({ success: true });
}
