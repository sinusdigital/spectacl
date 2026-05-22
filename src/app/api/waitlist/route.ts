import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/waitlist
// Public. Add an entry to the waitlist.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, message } = body as { name?: string; email?: string; message?: string };

    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
    }

    const emailLower = email.toLowerCase().trim();

    // Check for duplicate
    const existing = await prisma.waitlistEntry.findUnique({ where: { email: emailLower } });
    if (existing) {
      // Return success either way so we don't leak whether email exists
      return NextResponse.json({ ok: true });
    }

    await prisma.waitlistEntry.create({
      data: {
        name: name.trim(),
        email: emailLower,
        message: message?.trim() || null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Waitlist] Error:", err);
    return NextResponse.json({ error: "Failed to join waitlist." }, { status: 500 });
  }
}
