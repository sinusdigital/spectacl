import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { SpaceRole } from "@prisma/client";
import { auditLog } from "@/lib/audit";

const VALID_SPACE_ROLES: SpaceRole[] = ["OWNER", "ADMIN", "MEMBER"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; spaceId: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });

  // Basic admin check for the logged-in user
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id: userId, spaceId } = await params;
  const body = await request.json();
  const { role } = body as { role: string };

  if (!VALID_SPACE_ROLES.includes(role as SpaceRole)) {
    return NextResponse.json(
      { error: `Invalid role. Must be one of: ${VALID_SPACE_ROLES.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const updatedMembership = await prisma.spaceMember.update({
      where: {
        userId_spaceId: {
          userId,
          spaceId,
        },
      },
      data: {
        role: role as SpaceRole,
      },
    });

    await auditLog({ userId: session.user.id, action: 'user.space_role.update', targetType: 'SpaceMember', targetId: `${userId}:${spaceId}`, detail: { targetUserId: userId, spaceId, newRole: role } });

    return NextResponse.json(updatedMembership);
  } catch (error) {
    console.error("[ADMIN_SPACE_ROLE_UPDATE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
