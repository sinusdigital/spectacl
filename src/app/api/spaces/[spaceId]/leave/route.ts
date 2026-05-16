import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> }
) {
  try {
    // Get authenticated user
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { spaceId } = await params;

    // Check if user is a member of this space
    const membership = await prisma.spaceMember.findUnique({
      where: {
        userId_spaceId: {
          userId: userId,
          spaceId: spaceId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'You are not a member of this space' },
        { status: 404 }
      );
    }

    // Check if user is the owner
    if (membership.role === 'OWNER') {
      return NextResponse.json(
        { error: 'Owners cannot leave their space. Transfer ownership first.' },
        { status: 403 }
      );
    }

    // Delete the membership
    await prisma.spaceMember.delete({
      where: {
        userId_spaceId: {
          userId: userId,
          spaceId: spaceId,
        },
      },
    });

    // Update space usage member count
    await prisma.spaceUsage.update({
      where: {
        spaceId: spaceId,
      },
      data: {
        memberCount: {
          decrement: 1,
        },
      },
    });

    return NextResponse.json({ success: true, message: 'Successfully left the space' });
  } catch (error) {
    console.error('Error leaving space:', error);
    return NextResponse.json(
      { error: 'Failed to leave space' },
      { status: 500 }
    );
  }
}
