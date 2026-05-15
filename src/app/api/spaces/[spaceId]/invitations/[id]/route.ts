import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { requireSpaceAccess, canManageInvitations } from '@/lib/permissions';
import { renderEmail, sendEmail } from '@/lib/send-email';
import { InvitationEmail } from '@/emails';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string; id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { spaceId, id } = await params;

    // Verify user has permission to manage invitations
    const access = await requireSpaceAccess(session.user.id, spaceId, { intent: 'write' });

    if (access.kind === 'member' && !canManageInvitations(access.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get the invitation
    const invitation = await prisma.spaceInvitation.findUnique({
      where: { id },
    });

    if (!invitation || invitation.spaceId !== spaceId) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    if (invitation.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Can only resend pending invitations' },
        { status: 400 }
      );
    }

    // Resend email invitation
    if (invitation.email) {
      const headersList = await headers();
      const host = headersList.get('host') || 'localhost:3000';
      const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
      const baseUrl = `${protocol}://${host}`;
      const inviteUrl = `${baseUrl}/invite/${invitation.token}`;

      // Get space name
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
        to: invitation.email,
        subject: `${session.user.name} invited you to join ${space?.name || 'Spectacl'}`,
        html,
        label: 'invitation-resend',
      });
    }

    // Update the invitation's createdAt to reflect the resend
    await prisma.spaceInvitation.update({
      where: { id },
      data: {
        createdAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Invitation resent successfully',
    });
  } catch (error) {
    console.error('Error resending invitation:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: message || 'Failed to resend invitation' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string; id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { spaceId, id } = await params;

    // Verify user has permission to manage invitations
    const accessDel = await requireSpaceAccess(session.user.id, spaceId, { intent: 'write' });

    if (accessDel.kind === 'member' && !canManageInvitations(accessDel.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get the invitation
    const invitation = await prisma.spaceInvitation.findUnique({
      where: { id },
    });

    if (!invitation || invitation.spaceId !== spaceId) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    // Delete the invitation
    await prisma.spaceInvitation.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error revoking invitation:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: message || 'Failed to revoke invitation' },
      { status: 500 }
    );
  }
}
