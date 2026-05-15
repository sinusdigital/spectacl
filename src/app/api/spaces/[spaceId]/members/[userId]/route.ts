import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { requireSpaceMembership, canManageMembers } from '@/lib/permissions';
import { SpaceRole } from '@prisma/client';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string; userId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { spaceId, userId } = await params;

    // Verify user has permission to manage members
    const userRole = await requireSpaceMembership(session.user.id, spaceId);

    if (!canManageMembers(userRole)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { role } = body as { role: SpaceRole };

    if (!role || !['OWNER', 'ADMIN', 'MEMBER'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    // Prevent changing own role
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot change your own role' },
        { status: 400 }
      );
    }

    // Only OWNER can assign OWNER role
    if (role === 'OWNER' && userRole !== 'OWNER') {
      return NextResponse.json(
        { error: 'Only owners can assign owner role' },
        { status: 403 }
      );
    }

    // Update the member's role
    const updatedMember = await prisma.spaceMember.update({
      where: {
        userId_spaceId: {
          userId,
          spaceId,
        },
      },
      data: { role },
      include: {
        User_SpaceMember_userIdToUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      userId: updatedMember.userId,
      name: updatedMember.User_SpaceMember_userIdToUser.name,
      email: updatedMember.User_SpaceMember_userIdToUser.email,
      role: updatedMember.role,
    });
  } catch (error: any) {
    console.error('Error updating member role:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update member role' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string; userId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { spaceId, userId } = await params;

    // Verify user has permission to manage members
    const userRole = await requireSpaceMembership(session.user.id, spaceId);

    if (!canManageMembers(userRole)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Prevent removing self
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot remove yourself from the space' },
        { status: 400 }
      );
    }

    // Check if target user is the last OWNER
    const targetMember = await prisma.spaceMember.findUnique({
      where: {
        userId_spaceId: {
          userId,
          spaceId,
        },
      },
    });

    if (targetMember?.role === 'OWNER') {
      const ownerCount = await prisma.spaceMember.count({
        where: {
          spaceId,
          role: 'OWNER',
        },
      });

      if (ownerCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot remove the last owner' },
          { status: 400 }
        );
      }
    }

    // Remove the member
    await prisma.spaceMember.delete({
      where: {
        userId_spaceId: {
          userId,
          spaceId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error removing member:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove member' },
      { status: 500 }
    );
  }
}
