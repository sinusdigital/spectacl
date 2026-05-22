import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { requireSpaceAccess } from '@/lib/permissions';

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

    const members = await prisma.spaceMember.findMany({
      where: { spaceId },
      include: {
        User_SpaceMember_userIdToUser: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        User_SpaceMember_invitedByIdToUser: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [
        { role: 'desc' }, // OWNER first, then ADMIN, then MEMBER
        { joinedAt: 'asc' },
      ],
    });

    const formattedMembers = members.map((member) => ({
      userId: member.userId,
      name: member.User_SpaceMember_userIdToUser.name,
      email: member.User_SpaceMember_userIdToUser.email,
      image: member.User_SpaceMember_userIdToUser.image,
      role: member.role,
      joinedAt: member.joinedAt,
      invitedBy: member.User_SpaceMember_invitedByIdToUser?.name || null,
    }));

    return NextResponse.json(formattedMembers);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch members';
    console.error('Error fetching members:', error);
    return NextResponse.json(
      { error: message },
      { status: message.includes('member') ? 403 : 500 }
    );
  }
}
