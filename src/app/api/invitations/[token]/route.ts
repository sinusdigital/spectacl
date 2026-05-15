import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers, cookies } from 'next/headers';
import { getPlanLimitsFromDb, isUnlimited, type PlanKey } from '@/lib/billing/plans';

// GET /api/invitations/[token] - Fetch invitation details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const invitation = await prisma.spaceInvitation.findUnique({
      where: { token },
      include: {
        Space: true,
        User: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    // Check if invitation is expired
    if (new Date() > invitation.expiresAt) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 400 }
      );
    }

    // Check if invitation is still pending
    if (invitation.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Invitation is no longer valid' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      space: {
        id: invitation.Space.id,
        name: invitation.Space.name,
        plan: invitation.Space.plan,
      },
      inviter: {
        name: invitation.User.name,
      },
    });
  } catch (error) {
    console.error('Error fetching invitation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invitation' },
      { status: 500 }
    );
  }
}

// POST /api/invitations/[token]/accept - Accept invitation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { token } = await params;

    const invitation = await prisma.spaceInvitation.findUnique({
      where: { token },
      include: {
        Space: true,
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    // Validate invitation
    if (new Date() > invitation.expiresAt) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 400 }
      );
    }

    if (invitation.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Invitation is no longer valid' },
        { status: 400 }
      );
    }

    // Check if user is already a member
    const existingMember = await prisma.spaceMember.findUnique({
      where: {
        userId_spaceId: {
          userId: session.user.id,
          spaceId: invitation.spaceId,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: 'You are already a member of this space' },
        { status: 400 }
      );
    }

    // Re-check member limit at accept time (creation check alone is insufficient
    // because concurrent accepts can exceed the cap)
    const planLimits = await getPlanLimitsFromDb(invitation.Space.plan as PlanKey);
    if (!isUnlimited(planLimits.maxMembers)) {
      const currentMemberCount = await prisma.spaceMember.count({
        where: { spaceId: invitation.spaceId },
      });
      if (currentMemberCount >= planLimits.maxMembers) {
        return NextResponse.json(
          { error: `This workspace has reached its member limit (${planLimits.maxMembers}). Ask the space owner to upgrade their plan.` },
          { status: 403 }
        );
      }
    }

    // Accept invitation in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create space member
      await tx.spaceMember.create({
        data: {
          userId: session.user.id,
          spaceId: invitation.spaceId,
          role: invitation.role,
          invitedById: invitation.invitedById,
        },
      });

      // Update invitation status
      await tx.spaceInvitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED' },
      });

      // Update space usage member count
      await tx.spaceUsage.update({
        where: { spaceId: invitation.spaceId },
        data: {
          memberCount: {
            increment: 1,
          },
        },
      });

      return invitation.Space;
    });

    // Store current space ID in cookie
    const cookieStore = await cookies();
    cookieStore.set('current-space-id', result.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    return NextResponse.json({
      space: {
        id: result.id,
        name: result.name,
        slug: result.slug,
      },
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    );
  }
}

// DELETE /api/invitations/[token] - Decline or Revoke invitation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { token } = await params;

    const invitation = await prisma.spaceInvitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    // Check permissions
    // Allow if user is the inviter (Revoke) OR the invitee (Decline)
    const isInviter = invitation.invitedById === session.user.id;
    const isInvitee = invitation.email === session.user.email;

    if (!isInviter && !isInvitee) {
      return NextResponse.json(
        { error: 'You do not have permission to manage this invitation' },
        { status: 403 }
      );
    }

    // Delete the invitation
    await prisma.spaceInvitation.delete({
      where: { id: invitation.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting invitation:', error);
    return NextResponse.json(
      { error: 'Failed to delete invitation' },
      { status: 500 }
    );
  }
}
