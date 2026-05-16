import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { requireSpaceAccess, canManageInvitations } from '@/lib/permissions';
import { SpaceRole, SpacePlan } from '@prisma/client';
import { getPlanLimitsFromDb, isUnlimited } from '@/lib/billing/plans';
import { renderEmail, sendEmail } from '@/lib/send-email';
import { InvitationEmail } from '@/emails';
import crypto from 'crypto';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { spaceId } = await params;

    // Verify user has read access (member OR admin support mode)
    await requireSpaceAccess(session.user.id, spaceId, { intent: 'read' });

    // Get all pending invitations
    const invitations = await prisma.spaceInvitation.findMany({
      where: {
        spaceId,
        status: {
          in: ['PENDING', 'EXPIRED'],
        },
      },
      include: {
        User: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(
      invitations.map((inv) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        token: inv.token,
        status: inv.status,
        expiresAt: inv.expiresAt,
        createdAt: inv.createdAt,
        invitedBy: {
          name: inv.User?.name,
          email: inv.User?.email,
        },
      }))
    );
  } catch (e: unknown) {
    console.error('Error fetching invitations:', e);
    const err = e as { message?: string, status?: number };
    return NextResponse.json(
      { error: err.message || 'Failed to fetch invitations' },
      { status: err.status || 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { spaceId } = await params;

    // Verify user has permission to manage invitations
    const access = await requireSpaceAccess(session.user.id, spaceId, { intent: 'write' });

    if (access.kind === 'member' && !canManageInvitations(access.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, role } = body as {
      email?: string;
      role: SpaceRole;
    };

    // Check plan restriction for invitations
    const space = await prisma.space.findUnique({
      where: { id: spaceId },
      select: { plan: true }
    });

    if (space?.plan === 'STARTER') {
      return NextResponse.json(
        {
          error: 'PLAN_RESTRICTION',
          message: 'Team collaboration is only available on Pro and Business plans.'
        },
        { status: 403 }
      );
    }

    // Check member + pending invitation limit
    const planLimits = await getPlanLimitsFromDb(space!.plan as SpacePlan);
    if (!isUnlimited(planLimits.maxMembers)) {
      const [memberCount, pendingCount] = await Promise.all([
        prisma.spaceMember.count({ where: { spaceId } }),
        prisma.spaceInvitation.count({ where: { spaceId, status: 'PENDING' } }),
      ]);
      if (memberCount + pendingCount >= planLimits.maxMembers) {
        return NextResponse.json(
          {
            error: 'MEMBER_LIMIT',
            message: `You've reached your member limit (${planLimits.maxMembers}). Revoke a pending invitation or upgrade your plan to invite more people.`,
          },
          { status: 400 }
        );
      }
    }

    // Validate role
    if (!role || !['ADMIN', 'MEMBER'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be ADMIN or MEMBER' },
        { status: 400 }
      );
    }

    // Check if user is already a member
    if (email) {
      const existingMember = await prisma.spaceMember.findFirst({
        where: {
          spaceId,
          User_SpaceMember_userIdToUser: {
            email,
          },
        },
      });

      if (existingMember) {
        return NextResponse.json(
          { error: 'User is already a member of this space' },
          { status: 400 }
        );
      }

      // Check for existing pending invitation
      const existingInvitation = await prisma.spaceInvitation.findFirst({
        where: {
          spaceId,
          email,
          status: 'PENDING',
        },
      });

      if (existingInvitation) {
        return NextResponse.json(
          { error: 'An invitation has already been sent to this email' },
          { status: 400 }
        );
      }
    }

    // Generate invitation token
    const token = crypto.randomBytes(32).toString('hex');
    const invitationId = crypto.randomUUID();

    // Set expiration (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create invitation
    const invitation = await prisma.spaceInvitation.create({
      data: {
        id: invitationId,
        spaceId,
        email: email || '',
        role,
        token,
        status: 'PENDING',
        expiresAt,
        invitedById: session.user.id,
      },
      include: {
        User: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // Get the base URL from the request
    const headersList = await headers();
    const host = headersList.get('host') || 'localhost:3000';
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}`;
    const inviteUrl = `${baseUrl}/invite/${token}`;

    // Send invitation email if email is provided
    if (email) {
      try {
        // Get space name for the email
        const space = await prisma.space.findUnique({
          where: { id: spaceId },
          select: { name: true },
        });

        const html = await renderEmail(InvitationEmail, {
          inviteUrl,
          spaceName: space?.name || 'Spectacl',
          userName: session.user.name,
        });

        await sendEmail({
          from: 'Spectacl <hello@mail.spectacl.org>',
          to: email,
          subject: `${session.user.name} invited you to join ${space?.name || 'Spectacl'}`,
          html,
          label: 'invitation',
        });
      } catch (emailError) {
        console.error('Failed to send invitation email:', emailError);
        // We don't fail the request if the email fails, as the invitation was created successfully
      }
    }

    return NextResponse.json({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      token: invitation.token,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
      invitedBy: {
        name: invitation.User?.name,
        email: invitation.User?.email,
      },
      inviteUrl,
    });
  } catch (error) {
    console.error('Error creating invitation:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: message || 'Failed to create invitation' },
      { status: 500 }
    );
  }
}
