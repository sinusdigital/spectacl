import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { locked, reason } = await request.json();

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Prevent locking yourself
  if (id === session.user.id) {
    return NextResponse.json({ error: "Cannot lock your own account" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id },
    data: {
      isLocked: locked,
      lockedReason: locked ? (reason || null) : null,
    },
  });

  // If locking, revoke all sessions so the user is immediately signed out
  if (locked) {
    await prisma.session.deleteMany({ where: { userId: id } });
  }

  await auditLog({
    userId: session.user.id,
    action: locked ? "user.lock" : "user.unlock",
    targetType: "User",
    targetId: id,
    detail: { reason: locked ? reason : undefined },
  });

  return NextResponse.json({ success: true, locked });
}
