import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { auth } from '@/lib/auth';
import { headers, cookies } from 'next/headers';
import { calculateMonthlyCreditsFromDb, getActiveModelCount, getTrialDays } from '@/lib/billing/plans';
import { isSelfHosted } from '@/lib/mode';

// POST /api/spaces - Create a new space
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Space name is required' },
        { status: 400 }
      );
    }

    // Generate unique slug from name
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    let slug = baseSlug;
    let counter = 2;

    // Best-effort pre-check to pick a pretty suffix (e.g. "my-space-2").
    // NOTE: This is NOT the uniqueness guarantee — two concurrent POSTs can both
    // pass this check. The real guard is the @unique constraint on Space.slug
    // + the P2002 retry loop below.
    while (await prisma.space.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const selfHosted = isSelfHosted();

    // Fetch active model count and trial days (outside transaction — read-only)
    // Skip in self-hosted mode where credits are always unlimited
    const [modelCount, trialDays] = selfHosted
      ? [0, 0]
      : await Promise.all([getActiveModelCount(), getTrialDays()]);

    // Retry on unique-constraint collisions (concurrent creates racing on slug).
    // Append a short random suffix and try again. Cap retries then 409.
    const MAX_SLUG_RETRIES = 5;
    let result;
    let attempt = 0;
     
    while (true) {
      try {
        const currentSlug = slug;
        result = await prisma.$transaction(async (tx) => {
          let isTrialing = false;

          if (!selfHosted) {
            // Cloud mode: check trial eligibility
            const user = await tx.user.findUnique({
              where: { id: session.user.id },
              select: { hasUsedTrial: true }
            });
            isTrialing = !user?.hasUsedTrial;
          }

          // Self-hosted: ACTIVE + unlimited. Cloud: trial or INCOMPLETE.
          const trialEndsAt = selfHosted ? null : (isTrialing ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000) : null);
          const creditDays = isTrialing ? trialDays : undefined;
          const creditLimit = selfHosted ? -1 : await calculateMonthlyCreditsFromDb('STARTER', modelCount, creditDays);

          const space = await tx.space.create({
            data: {
              id: crypto.randomUUID(),
              name,
              slug: currentSlug,
              plan: 'STARTER',
              subscriptionStatus: selfHosted ? 'ACTIVE' : (isTrialing ? 'TRIALING' : 'INCOMPLETE'),
              trialEndsAt,
              llmProvider: 'MANAGED',
              createdById: session.user.id,
              llmCreditsRemaining: creditLimit,
              creditResetDate: new Date(),
            },
          });

          // Mark user as having used trial (cloud mode only)
          if (isTrialing) {
            await tx.user.update({
              where: { id: session.user.id },
              data: { hasUsedTrial: true }
            });
          }

          // Create space member with OWNER role
          await tx.spaceMember.create({
            data: {
              userId: session.user.id,
              spaceId: space.id,
              role: 'OWNER',
            },
          });

          // Create space usage tracking
          await tx.spaceUsage.create({
            data: {
              id: crypto.randomUUID(),
              spaceId: space.id,
              memberCount: 1,
              entityCount: 0,
              promptCount: 0,
              totalAnalysisRuns: 0,
            },
          });

          return space;
        });
        break;
      } catch (err) {
        // P2002 = unique constraint violation (only slug is at risk here).
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002' &&
          attempt < MAX_SLUG_RETRIES
        ) {
          attempt++;
          const randomSuffix = Math.random().toString(36).slice(2, 8);
          slug = `${baseSlug}-${randomSuffix}`;
          continue;
        }
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          return NextResponse.json(
            { error: 'A space with this name already exists' },
            { status: 409 }
          );
        }
        throw err;
      }
    }

    // Store current space ID in cookie
    const cookieStore = await cookies();
    cookieStore.set('current-space-id', result.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    return NextResponse.json({
      space: {
        id: result.id,
        name: result.name,
        slug: result.slug,
        plan: result.plan,
        subscriptionStatus: result.subscriptionStatus,
      },
    });
  } catch (error) {
    console.error('Error creating space:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });
    return NextResponse.json(
      { error: 'Failed to create space', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
