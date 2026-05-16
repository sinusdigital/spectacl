import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const action = searchParams.get('action') ?? undefined;

    const where = action ? { action } : {};

    const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * PAGE_SIZE,
            take: PAGE_SIZE,
            include: {
                user: { select: { id: true, name: true, email: true } },
            },
        }),
        prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({
        logs,
        pagination: {
            page,
            pageSize: PAGE_SIZE,
            total,
            totalPages: Math.ceil(total / PAGE_SIZE),
        },
    });
}
