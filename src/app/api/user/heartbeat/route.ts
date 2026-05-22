import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

// POST /api/user/heartbeat
// Called every 60s by the client while the app is open.
// Updates User.lastSeenAt — used by /admin/users to show real online status.
export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { lastSeenAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
