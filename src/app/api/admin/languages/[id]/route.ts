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
    const { name, group, order, isEnabled } = await req.json();

    try {
        const updated = await prisma.language.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(group !== undefined && { group }),
                ...(order !== undefined && { order }),
                ...(isEnabled !== undefined && { isEnabled }),
            },
        });
        await auditLog({ userId: session.user.id, action: 'language.update', targetType: 'Language', targetId: id, detail: { name, group, isEnabled } });
        return NextResponse.json(updated);
    } catch (e: unknown) {
        if (e instanceof Error && 'code' in e && (e as { code?: string }).code === 'P2002') {
            return NextResponse.json({ error: 'A language with this name already exists' }, { status: 409 });
        }
        if (e instanceof Error && 'code' in e && (e as { code?: string }).code === 'P2025') {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }
        throw e;
    }
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

    const language = await prisma.language.findUnique({ where: { id } });
    if (!language) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Check if any prompts reference this language
    const promptCount = await prisma.prompt.count({
        where: { language: language.name },
    });

    if (promptCount > 0) {
        return NextResponse.json(
            { error: `Cannot delete: ${promptCount} prompt(s) use this language. Reassign them first.` },
            { status: 409 }
        );
    }

    await prisma.language.delete({ where: { id } });
    await auditLog({ userId: session.user.id, action: 'language.delete', targetType: 'Language', targetId: id, detail: { name: language.name } });
    return NextResponse.json({ success: true });
}
