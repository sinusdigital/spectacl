import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { auditLog } from "@/lib/audit";

const VALID_ROLES = ["ADMIN", "USER"] as const;
type ValidRole = (typeof VALID_ROLES)[number];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { role } = body as { role: string };

  if (!VALID_ROLES.includes(role as ValidRole)) {
    return NextResponse.json({ error: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}` }, { status: 400 });
  }

  // Prevent self-demotion
  if (id === session.user.id && role !== "ADMIN") {
    return NextResponse.json({ error: "You cannot change your own role." }, { status: 400 });
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: { role: role as ValidRole },
      select: { id: true, name: true, email: true, role: true },
    });

    await auditLog({ userId: session.user.id, action: 'user.role.update', targetType: 'User', targetId: id, detail: { newRole: role } });

    return NextResponse.json(user);
  } catch (error) {
    console.error("[ADMIN_USER_ROLE_UPDATE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
