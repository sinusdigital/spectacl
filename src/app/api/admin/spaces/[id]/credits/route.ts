import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { auditLog } from '@/lib/audit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { credits } = body;

    if (typeof credits !== 'number') {
      return NextResponse.json(
        { error: 'Credits must be a number' },
        { status: 400 }
      );
    }

    const space = await prisma.space.update({
      where: { id },
      data: {
        llmCreditsRemaining: credits,
        llmCreditsUsed: 0,
        creditResetDate: new Date(),
      },
    });

    await auditLog({ userId: session.user.id, action: 'space.credits.reset', targetType: 'Space', targetId: id, detail: { credits } });

    return NextResponse.json({ space });
  } catch (error) {
    console.error('Error updating space credits:', error);
    return NextResponse.json(
      { error: 'Failed to update credits' },
      { status: 500 }
    );
  }
}
