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

    const languages = await prisma.language.findMany({
        orderBy: [{ group: 'asc' }, { order: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json(languages);
}

export async function POST(req: NextRequest) {
    const session = await requireAdmin();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { name, group, order } = await req.json();

    if (!name?.trim() || !group?.trim()) {
        return NextResponse.json({ error: 'Name and group are required' }, { status: 400 });
    }

    try {
        const created = await prisma.language.create({
            data: {
                name: name.trim(),
                group: group.trim(),
                order: order ?? 0,
            },
        });
        await auditLog({ userId: session.user.id, action: 'language.create', targetType: 'Language', targetId: created.id, detail: { name: name.trim(), group: group.trim() } });
        return NextResponse.json(created, { status: 201 });
    } catch (e: unknown) {
        if (e instanceof Error && 'code' in e && (e as { code?: string }).code === 'P2002') {
            return NextResponse.json({ error: 'A language with this name already exists' }, { status: 409 });
        }
        throw e;
    }
}
