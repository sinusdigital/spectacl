import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const spaceId = request.nextUrl.searchParams.get("spaceId");
  if (!spaceId) {
    return NextResponse.json(
      { error: "spaceId is required" },
      { status: 400 },
    );
  }

  // Verify membership (any role can view invoices)
  const membership = await prisma.spaceMember.findUnique({
    where: { userId_spaceId: { userId: session.user.id, spaceId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const invoices = await prisma.invoice.findMany({
    where: { spaceId },
    select: {
      id: true,
      number: true,
      issuedAt: true,
      taxType: true,
      taxLabel: true,
      subtotal: true,
      taxAmount: true,
      total: true,
      currency: true,
      companyName: true,
      periodStart: true,
      periodEnd: true,
    },
    orderBy: { issuedAt: "desc" },
  });

  return NextResponse.json({ invoices });
}
