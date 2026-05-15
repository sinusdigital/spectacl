import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { requireSpaceMembership } from '@/lib/permissions';

/**
 * POST /api/spaces/[spaceId]/transfer
 * Transfer space ownership to another member.
 * Body: { targetUserId: string }
 *
 * Rules:
 * - Only current OWNER can transfer
 * - Target must be an existing member of the space
 * - Current owner is demoted to ADMIN
 * - Target is promoted to OWNER
 * - Both changes happen atomically
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ spaceId: string }> }
) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { spaceId } = await params;

    // Verify caller is OWNER
    const callerRole = await requireSpaceMembership(session.user.id, spaceId);
    if (callerRole !== 'OWNER') {
        return NextResponse.json({ error: 'Only the owner can transfer ownership' }, { status: 403 });
    }

    const body = await request.json();
    const { targetUserId } = body as { targetUserId: string };

    if (!targetUserId) {
        return NextResponse.json({ error: 'targetUserId is required' }, { status: 400 });
    }

    // Can't transfer to yourself
    if (targetUserId === session.user.id) {
        return NextResponse.json({ error: 'Cannot transfer ownership to yourself' }, { status: 400 });
    }

    // Verify target is a member of the space
    const targetMember = await prisma.spaceMember.findUnique({
        where: { userId_spaceId: { userId: targetUserId, spaceId } },
    });
    if (!targetMember) {
        return NextResponse.json({ error: 'Target user is not a member of this space' }, { status: 400 });
    }

    // Atomic transfer: promote target → OWNER, demote caller → ADMIN
    await prisma.$transaction([
        prisma.spaceMember.update({
            where: { userId_spaceId: { userId: targetUserId, spaceId } },
            data: { role: 'OWNER' },
        }),
        prisma.spaceMember.update({
            where: { userId_spaceId: { userId: session.user.id, spaceId } },
            data: { role: 'ADMIN' },
        }),
    ]);

    return NextResponse.json({ success: true });
}
