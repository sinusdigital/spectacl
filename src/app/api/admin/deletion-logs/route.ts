import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function checkAuth(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) return false;
  // @ts-expect-error - role exists on User model
  if (session.user.role !== 'ADMIN') return false;
  return true;
}

export async function GET(req: NextRequest) {
  if (!(await checkAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const logs = await prisma.spaceDeletionLog.findMany({
    orderBy: { deletedAt: 'desc' },
  });

  return NextResponse.json(logs);
}
