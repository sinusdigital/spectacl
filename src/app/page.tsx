import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getCurrentSpace } from "@/lib/spaces";

// This page acts as a router based on database state.
// We force dynamic rendering to avoid build-time database queries during prerendering.
export const dynamic = "force-dynamic";

export default async function RootPage() {
  // Get the current session
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    // No session — visitors hitting the bare root are most likely new traffic.
    // Send them to /signup (acquisition); returning users bookmark deep URLs and
    // get bounced to /login by middleware on protected routes.
    return redirect("/signup");
  }

  // Check if user has any spaces
  const userSpaces = await prisma.spaceMember.findFirst({
    where: { userId: session.user.id },
  });

  if (!userSpaces) {
    // No spaces, redirect to onboarding
    return redirect("/onboarding");
  }

  // Get the current space (same source of truth as sidebar)
  const currentSpace = await getCurrentSpace(session.user.id);

  // Get the most recent entity in the current space (not archived)
  const lastEntity = await prisma.entity.findFirst({
    where: {
      ...(currentSpace ? { spaceId: currentSpace.id } : { userId: session.user.id }),
      isArchived: false,
    },
    orderBy: { updatedAt: 'desc' },
  });

  if (lastEntity) {
    // Redirect to the last entity's overview
    return redirect(`/${lastEntity.id}`);
  }

  // No entities exist, redirect to entities list
  return redirect("/entities");
}
