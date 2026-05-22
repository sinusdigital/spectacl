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
    const body = await req.json();
    const { isAllowlisted, typeId } = body;

    const updated = await prisma.domain.update({
        where: { id },
        data: {
            ...(isAllowlisted !== undefined && { isAllowlisted }),
            ...(typeId !== undefined && { typeId: typeId || null }),
        },
        include: { domainType: true },
    });

    await auditLog({ userId: session.user.id, action: 'domain.update', targetType: 'Domain', targetId: id, detail: { isAllowlisted, typeId } });

    return NextResponse.json(updated);
}
