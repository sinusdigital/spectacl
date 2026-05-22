import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const spaces = await prisma.space.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        llmProvider: true,
        subscriptionStatus: true,
        mollieCustomerId: true,
        mollieSubscriptionId: true,
        molliePaymentId: true,
        currentPeriodEnd: true,
        createdAt: true,
        _count: { select: { SpaceMember: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ spaces });
  } catch (error: unknown) {
    console.error("[GET /api/admin/mollie/spaces]", error);
    return NextResponse.json({ error: "Failed to fetch spaces" }, { status: 500 });
  }
}
