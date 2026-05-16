import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { getCurrentSpace } from '@/lib/spaces';

// DELETE /api/spaces/current/models/[modelId] - Archive a model
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ modelId: string }> }
) {
    try {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const space = await getCurrentSpace(session.user.id);
        if (!space) {
            return NextResponse.json({ error: 'No space found' }, { status: 404 });
        }

        const { modelId } = await params;

        const config = await prisma.spaceModelConfig.update({
            where: {
                spaceId_modelId: { spaceId: space.id, modelId }
            },
            data: {
                isArchived: true,
                isEnabled: false
            }
        });

        return NextResponse.json(config);
    } catch (error) {
        console.error('Error archiving model:', error);
        return NextResponse.json(
            { error: 'Error archiving model' },
            { status: 500 }
        );
    }
}

// PATCH /api/spaces/current/models/[modelId] - Update model properties
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ modelId: string }> }
) {
    try {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const space = await getCurrentSpace(session.user.id);
        if (!space) {
            return NextResponse.json({ error: 'No space found' }, { status: 404 });
        }

        const { modelId } = await params;
        const body = await request.json();

        const config = await prisma.spaceModelConfig.update({
            where: {
                spaceId_modelId: { spaceId: space.id, modelId }
            },
            data: body
        });

        return NextResponse.json(config);
    } catch (error) {
        console.error('Error updating model:', error);
        return NextResponse.json(
            { error: 'Error updating model' },
            { status: 500 }
        );
    }
}
