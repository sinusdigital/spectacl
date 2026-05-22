import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { validateVatId } from "@/lib/billing/vies";
import { headers } from "next/headers";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { vatId } = body;

  if (!vatId || typeof vatId !== "string") {
    return NextResponse.json(
      { error: "vatId is required" },
      { status: 400 },
    );
  }

  const result = await validateVatId(vatId);

  return NextResponse.json(result);
}
