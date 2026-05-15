import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { ReactNode } from "react";
import { resolveSpaceAccess } from "@/lib/space-access";

export default async function EntityLayout({
    children,
    params,
}: {
    children: ReactNode;
    params: Promise<{ entityId: string }>;
}) {
    const { entityId } = await params;

    const entity = await prisma.entity.findUnique({
        where: { id: entityId },
        select: { id: true, spaceId: true },
    });

    if (!entity || !entity.spaceId) {
        return redirect("/entities");
    }

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
        return redirect("/signup");
    }

    const access = await resolveSpaceAccess(session.user.id, entity.spaceId);
    if (access.kind === "none") {
        return redirect("/entities");
    }

    return <>{children}</>;
}
