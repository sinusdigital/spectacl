import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { validateVatId } from "@/lib/billing/vies";
import { EU_COUNTRIES } from "@/lib/billing/tax";
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

  // Verify membership (any role can view billing profile)
  const membership = await prisma.spaceMember.findUnique({
    where: { userId_spaceId: { userId: session.user.id, spaceId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const profile = await prisma.billingProfile.findUnique({
    where: { spaceId },
  });

  return NextResponse.json({ profile });
}

export async function PUT(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { spaceId, companyName, street, city, postalCode, country, vatId } =
    body;

  if (!spaceId || !companyName || !street || !city || !postalCode || !country) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  // Verify OWNER or ADMIN
  const membership = await prisma.spaceMember.findUnique({
    where: { userId_spaceId: { userId: session.user.id, spaceId } },
    select: { role: true },
  });
  if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const countryCode = country.toUpperCase().trim();

  // Validate VAT ID if provided and country is EU
  let vatIdValid = false;
  let viesResult = null;
  if (vatId && EU_COUNTRIES.has(countryCode)) {
    viesResult = await validateVatId(vatId);
    vatIdValid = viesResult.valid;
  }

  const profile = await prisma.billingProfile.upsert({
    where: { spaceId },
    create: {
      spaceId,
      companyName: companyName.trim(),
      street: street.trim(),
      city: city.trim(),
      postalCode: postalCode.trim(),
      country: countryCode,
      vatId: vatId?.trim() || null,
      vatIdValid,
    },
    update: {
      companyName: companyName.trim(),
      street: street.trim(),
      city: city.trim(),
      postalCode: postalCode.trim(),
      country: countryCode,
      vatId: vatId?.trim() || null,
      vatIdValid,
    },
  });

  return NextResponse.json({
    profile,
    viesResult: viesResult ?? undefined,
  });
}
