import { NextRequest, NextResponse } from "next/server";
import { SystemSettings } from "@/lib/settings";

/** Keys safe to expose to any authenticated user. */
const PUBLIC_KEYS = new Set(["support_email"]);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const requested = searchParams.get("keys")?.split(",").filter(Boolean) ?? [];
  const safeKeys = requested.filter((k) => PUBLIC_KEYS.has(k));

  if (safeKeys.length === 0) {
    return NextResponse.json({});
  }

  const values = await SystemSettings.getMany(safeKeys);
  return NextResponse.json(values);
}
