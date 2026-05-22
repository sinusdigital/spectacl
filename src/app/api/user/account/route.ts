import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

// DELETE /api/user/account - Delete user account
export async function DELETE(_request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Check if user owns any spaces (by SpaceMember role, not createdById —
    // ownership can be transferred, so createdById is unreliable)
    const ownedMemberships = await prisma.spaceMember.findMany({
      where: { userId, role: 'OWNER' },
      select: { Space: { select: { id: true, name: true } } },
    });

    if (ownedMemberships.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete account while owning spaces',
          message: 'Please transfer ownership or delete your spaces first',
          ownedSpaces: ownedMemberships.map(m => m.Space.name),
        },
        { status: 400 }
      );
    }

    // GDPR: Clean up orphaned data that cascade rules don't cover
    const userEmail = session.user.email;

    // M5: Delete WaitlistEntry (no FK to User — matched by email)
    if (userEmail) {
      await prisma.waitlistEntry.deleteMany({ where: { email: userEmail } });
    }

    // M6: Scrub PII from AuditLog detail JSON (userId will be SetNull by cascade,
    // but the detail field may contain the user's name/email from admin actions)
    await prisma.$executeRaw`
      UPDATE "AuditLog"
      SET detail = NULL
      WHERE "userId" = ${userId}
      AND detail IS NOT NULL
    `;

    // Delete user (cascade will handle related records, including Session)
    await prisma.user.delete({
      where: { id: userId },
    });

    // Session is automatically deleted by database cascade, so no need to sign out explicitly.
    // The client should handle redirecting to login page.

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error: unknown) {
    console.error('Error deleting user account:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete account' },
      { status: 500 }
    );
  }
}
