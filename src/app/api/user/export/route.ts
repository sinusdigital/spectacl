import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // Fetch all personal data in parallel
  const [
    user,
    memberships,
    entities,
    billingProfiles,
    invoices,
    auditLogs,
    invitationsSent,
    invitationsReceived,
    sessions,
    accounts,
    waitlistEntry,
  ] = await Promise.all([
    // User profile (complete — includes all fields that constitute personal data)
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        lastSeenAt: true,
        hasUsedTrial: true,
        isLocked: true,
        lockedReason: true,
        tosAcceptedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),

    // Space memberships
    prisma.spaceMember.findMany({
      where: { userId },
      select: {
        role: true,
        joinedAt: true,
        Space: {
          select: { id: true, name: true, plan: true },
        },
      },
    }),

    // Entities created by user
    prisma.entity.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        website: true,
        isArchived: true,
        createdAt: true,
        space: { select: { id: true, name: true } },
      },
    }),

    // Billing profiles for spaces user owns
    prisma.billingProfile.findMany({
      where: {
        space: {
          SpaceMember: { some: { userId, role: "OWNER" } },
        },
      },
      select: {
        companyName: true,
        street: true,
        city: true,
        postalCode: true,
        country: true,
        vatId: true,
        vatIdValid: true,
        createdAt: true,
        updatedAt: true,
        space: { select: { id: true, name: true } },
      },
    }),

    // Invoices for spaces user owns
    prisma.invoice.findMany({
      where: {
        space: {
          SpaceMember: { some: { userId, role: "OWNER" } },
        },
      },
      select: {
        number: true,
        companyName: true,
        country: true,
        vatId: true,
        taxType: true,
        taxLabel: true,
        subtotal: true,
        taxAmount: true,
        total: true,
        currency: true,
        periodStart: true,
        periodEnd: true,
        issuedAt: true,
        space: { select: { id: true, name: true } },
      },
      orderBy: { issuedAt: "desc" },
    }),

    // Audit log entries where user is the actor
    // Note: `detail` excluded — may contain third-party PII (e.g. waitlist emails)
    prisma.auditLog.findMany({
      where: { userId },
      select: {
        action: true,
        targetType: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),

    // Invitations sent by user
    prisma.spaceInvitation.findMany({
      where: { invitedById: userId },
      select: {
        email: true,
        role: true,
        status: true,
        expiresAt: true,
        createdAt: true,
        Space: { select: { id: true, name: true } },
      },
    }),

    // Invitations received by user (by email)
    prisma.spaceInvitation.findMany({
      where: { email: session.user.email },
      select: {
        role: true,
        status: true,
        expiresAt: true,
        createdAt: true,
        Space: { select: { id: true, name: true } },
      },
    }),

    // Active sessions (Art. 15 — IP addresses and user agents are personal data)
    prisma.session.findMany({
      where: { userId },
      select: {
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        expiresAt: true,
      },
    }),

    // Linked auth accounts (OAuth providers)
    prisma.account.findMany({
      where: { userId },
      select: {
        providerId: true,
        createdAt: true,
      },
    }),

    // Waitlist entry (may exist independently of user account)
    prisma.waitlistEntry.findFirst({
      where: { email: session.user.email },
      select: {
        email: true,
        name: true,
        status: true,
        createdAt: true,
      },
    }),
  ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    dataSubject: user,
    spaceMemberships: memberships.map((m) => ({
      space: m.Space,
      role: m.role,
      joinedAt: m.joinedAt,
    })),
    entitiesCreated: entities.map((e) => ({
      id: e.id,
      name: e.name,
      website: e.website,
      isArchived: e.isArchived,
      createdAt: e.createdAt,
      space: e.space,
    })),
    billingProfiles,
    invoices,
    auditLogEntries: auditLogs,
    invitationsSent: invitationsSent.map((i) => ({
      email: i.email,
      role: i.role,
      status: i.status,
      expiresAt: i.expiresAt,
      createdAt: i.createdAt,
      space: i.Space,
    })),
    invitationsReceived: invitationsReceived.map((i) => ({
      role: i.role,
      status: i.status,
      expiresAt: i.expiresAt,
      createdAt: i.createdAt,
      space: i.Space,
    })),
    sessions: sessions.map((s) => ({
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
    })),
    linkedAccounts: accounts.map((a) => ({
      provider: a.providerId,
      createdAt: a.createdAt,
    })),
    waitlistEntry: waitlistEntry ?? null,
  };

  const json = JSON.stringify(exportData, null, 2);
  const filename = `spectacl-data-export-${new Date().toISOString().split("T")[0]}.json`;

  return new NextResponse(json, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
