import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { auditLog } from '@/lib/audit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json() as { locked: boolean; reason?: string };

  const space = await prisma.space.findUnique({
    where: { id },
    select: { id: true, isLocked: true },
  });

  if (!space) {
    return NextResponse.json({ error: 'Space not found' }, { status: 404 });
  }

  if (body.locked) {
    // Lock: pause all running prompts
    await prisma.$transaction([
      prisma.space.update({
        where: { id },
        data: {
          isLocked: true,
          lockedAt: new Date(),
          lockedReason: body.reason ?? null,
        },
      }),
      prisma.prompt.updateMany({
        where: {
          status: 'Running',
          entity: { spaceId: id },
        },
        data: { status: 'Paused' },
      }),
    ]);
  } else {
    // Unlock: just flip the flag — prompts stay paused for manual review
    await prisma.space.update({
      where: { id },
      data: {
        isLocked: false,
        lockedAt: null,
        lockedReason: null,
      },
    });
  }

  await auditLog({ userId: session.user.id, action: body.locked ? 'space.lock' : 'space.unlock', targetType: 'Space', targetId: id, detail: { reason: body.reason } });

  return NextResponse.json({ success: true, locked: body.locked });
}
