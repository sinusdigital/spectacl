import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    
    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { spaceId } = await req.json();

    if (!spaceId) {
      return Response.json({ error: 'Space ID is required' }, { status: 400 });
    }

    // Verify user is a member of this space
    const member = await prisma.spaceMember.findUnique({
      where: {
        userId_spaceId: {
          userId: session.user.id,
          spaceId,
        },
      },
      include: {
        Space: {
          select: {
            id: true,
            name: true,
            slug: true,
            plan: true,
          },
        },
      },
    });

    if (!member) {
      return Response.json(
        { error: 'You are not a member of this space' },
        { status: 403 }
      );
    }

    // Store current space ID in cookie
    const cookieStore = await cookies();
    
    // Clear any existing cookie first
    cookieStore.delete('current-space-id');
    
    console.log(`[switch-space] Setting cookie for space: ${spaceId}`);
    
    cookieStore.set('current-space-id', spaceId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });
    
    console.log('[switch-space] Cookie set successfully');

    return Response.json({
      success: true,
      space: member.Space,
    });
  } catch (error) {
    console.error('Error switching space:', error);
    return Response.json(
      { error: 'Failed to switch space' },
      { status: 500 }
    );
  }
}
