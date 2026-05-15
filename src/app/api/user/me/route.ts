import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: req.headers
  });
  
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Explicitly return role from the session user object
  // @ts-expect-error - role exists on prisma model
  const role = session.user.role || 'USER'; 
  console.log(`[API] /api/user/me - User: ${session.user.email}, Role: ${role}`);

  return NextResponse.json({
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    image: session.user.image,
    role: role
  });
}
