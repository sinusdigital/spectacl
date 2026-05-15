import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { invalidateCache } from '@/lib/cache';
import { auditLog } from '@/lib/audit';

export async function GET(req: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const includeArchived = searchParams.get('includeArchived') === 'true';

        const models = await prisma.globalModel.findMany({
            where: includeArchived ? undefined : { isArchived: false },
            orderBy: [
                { provider: 'asc' },
                { order: 'asc' }
            ]
        });

        return NextResponse.json(models);
    } catch (err) {
        console.error('Failed to fetch global models:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    let sessionUserId: string;
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }
        sessionUserId = session.user.id;
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { provider, modelId, displayName, isEnabled, contextWindow, maxOutputTokens, order } = body;

        if (!provider || !modelId || !displayName) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const newModel = await prisma.globalModel.create({
            data: {
                provider,
                modelId,
                displayName,
                isEnabled: isEnabled ?? true,
                isArchived: false,
                contextWindow: contextWindow ? parseInt(contextWindow, 10) : null,
                maxOutputTokens: maxOutputTokens ? parseInt(maxOutputTokens, 10) : 1500,
                order: order ?? 0
            }
        });

        await invalidateCache('active-model-count');
        await auditLog({ userId: sessionUserId, action: 'model.create', targetType: 'GlobalModel', targetId: newModel.id, detail: { provider, modelId, displayName } });

        return NextResponse.json(newModel);
    } catch (err: unknown) {
        console.error('Failed to create global model:', err);
        if (err instanceof Error && 'code' in err && (err as { code?: string }).code === 'P2002') {
            return NextResponse.json({ error: 'A model with this modelId already exists.' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
