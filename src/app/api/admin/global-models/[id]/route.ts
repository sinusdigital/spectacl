import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { invalidateCache } from '@/lib/cache';
import { auditLog } from '@/lib/audit';

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
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
        const { id } = await props.params;
        const body = await req.json();
        const { displayName, isEnabled, isArchived, contextWindow, maxOutputTokens, order, provider, modelId } = body;

        // Perform partial update
        const updatedModel = await prisma.globalModel.update({
            where: { id },
            data: {
                ...(displayName !== undefined && { displayName }),
                ...(isEnabled !== undefined && { isEnabled }),
                ...(isArchived !== undefined && { isArchived }),
                ...(contextWindow !== undefined && { contextWindow: contextWindow === null ? null : parseInt(contextWindow, 10) }),
                ...(maxOutputTokens !== undefined && { maxOutputTokens: parseInt(maxOutputTokens, 10) }),
                ...(order !== undefined && { order }),
                ...(provider !== undefined && { provider }),
                ...(modelId !== undefined && { modelId })
            }
        });

        // Invalidate cached model count when isEnabled or isArchived changes
        if (isEnabled !== undefined || isArchived !== undefined) {
            await invalidateCache('active-model-count');
        }

        await auditLog({ userId: sessionUserId, action: 'model.update', targetType: 'GlobalModel', targetId: id, detail: { displayName, isEnabled, isArchived, provider, modelId } });

        return NextResponse.json(updatedModel);
    } catch (err: unknown) {
        console.error('Failed to update global model:', err);
        // We can't safely access err.code without type assertion or checking if it's an object with a code property
        if (err instanceof Error || (typeof err === 'object' && err !== null)) {
            const errorObj = err as { code?: string };
            if (errorObj.code === 'P2025') {
                return NextResponse.json({ error: 'Model not found.' }, { status: 404 });
            }
            if (errorObj.code === 'P2002') {
                 return NextResponse.json({ error: 'A model with this modelId already exists.' }, { status: 409 });
            }
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
