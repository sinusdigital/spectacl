import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  // Prevent self-deletion
  if (id === session.user.id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      SpaceMember_SpaceMember_userIdToUser: {
        where: { role: "OWNER" },
        select: { spaceId: true, Space: { select: { name: true } } },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Block deletion if user owns spaces
  const ownedSpaces = user.SpaceMember_SpaceMember_userIdToUser;
  if (ownedSpaces.length > 0) {
    const spaceNames = ownedSpaces.map((m) => m.Space.name).join(", ");
    return NextResponse.json(
      {
        error: `User owns ${ownedSpaces.length} space(s): ${spaceNames}. Transfer ownership or delete spaces first.`,
      },
      { status: 400 },
    );
  }

  // Revoke all sessions first
  await prisma.session.deleteMany({ where: { userId: id } });

  // GDPR: Clean up orphaned data not covered by cascade rules
  await prisma.waitlistEntry.deleteMany({ where: { email: user.email } });
  await prisma.$executeRaw`
    UPDATE "AuditLog" SET detail = NULL
    WHERE "userId" = ${id} AND detail IS NOT NULL
  `;

  // Delete user (cascade rules handle cleanup: Entity.userId→SetNull, SpaceInvitation→Cascade, etc.)
  await prisma.user.delete({ where: { id } });

  await auditLog({
    userId: session.user.id,
    action: "user.delete",
    targetType: "User",
    targetId: id,
    detail: { name: user.name, email: user.email },
  });

  return NextResponse.json({ success: true });
}
