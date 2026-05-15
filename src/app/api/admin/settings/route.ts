import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { SystemSettings } from "@/lib/settings";
import { auditLog } from "@/lib/audit";

/**
 * Check if the user is authorized (ADMIN role).
 * Returns the session if authorized, null otherwise.
 */
async function checkAuth(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: req.headers
  });

  if (!session?.user) {
    return null;
  }

  // strict check for ADMIN role
  // @ts-expect-error - 'role' exists on prisma User model but might not be inferred by better-auth yet
  if (session.user.role !== 'ADMIN') {
      return null;
  }

  return session;
}

export async function GET(req: NextRequest) {
  if (!await checkAuth(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const keys = searchParams.get('keys')?.split(',') || [];

  if (keys.length > 0) {
      const settings = await SystemSettings.getMany(keys);
      return NextResponse.json(settings);
  }
  
  // Default: return nothing or handle differently if needed
  return NextResponse.json({});
}

export async function POST(req: NextRequest) {
  const session = await checkAuth(req);
  if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
      const body = await req.json();
      const { key, value } = body;

      if (!key) {
          return NextResponse.json({ error: "Key is required" }, { status: 400 });
      }

      await SystemSettings.set(key, String(value));
      await auditLog({ userId: session.user.id, action: 'settings.update', targetType: 'SystemSetting', targetId: key, detail: { key, value: String(value) } });
      return NextResponse.json({ success: true, key, value });
  } catch (error) {
      console.error("Failed to save setting:", error);
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
