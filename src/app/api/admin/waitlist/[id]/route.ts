import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";

async function requireAdmin(_request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return null;
  }
  return session;
}

// PATCH /api/admin/waitlist/[id] — approve or reject an entry
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin(request);
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { status } = body as { status: "APPROVED" | "REJECTED" };

  if (!["APPROVED", "REJECTED"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const entry = await prisma.waitlistEntry.update({
    where: { id },
    data: { status },
  });

  await auditLog({ userId: session.user.id, action: 'waitlist.update', targetType: 'WaitlistEntry', targetId: id, detail: { status, email: entry.email } });

  return NextResponse.json(entry);
}
