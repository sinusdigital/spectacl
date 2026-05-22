import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { discoverCompetitors } from "@/lib/suggestions";

export async function POST(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { entityId } = await req.json();

    if (!entityId) {
      return NextResponse.json({ error: "Entity ID is required" }, { status: 400 });
    }

    const competitors = await discoverCompetitors(entityId);

    return NextResponse.json({ competitors });
  } catch (error: unknown) {
    console.error("[Onboarding Suggestions] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
