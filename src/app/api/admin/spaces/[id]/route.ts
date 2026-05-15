import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { auditLog } from "@/lib/audit";

async function requireAdmin(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  // @ts-expect-error - role exists on prisma model
  if (!session?.user || session.user.role !== "ADMIN") return null;
  return session;
}

// GET /api/admin/spaces/[id]
// Returns space with entities (each with prompt count) for deletion preview
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin(request);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;

  try {
    const space = await prisma.space.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        plan: true,
        subscriptionStatus: true,
        createdAt: true,
      },
    });

    if (!space) return new NextResponse("Not found", { status: 404 });

    const entities = await prisma.entity.findMany({
      where: { spaceId: id },
      select: {
        id: true,
        name: true,
        website: true,
        _count: { select: { prompts: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // Also count analysis results for context
    const promptIds = await prisma.prompt.findMany({
      where: { entity: { spaceId: id } },
      select: { id: true },
    });
    const analysisResultCount = await prisma.analysisResult.count({
      where: { promptId: { in: promptIds.map((p) => p.id) } },
    });

    return NextResponse.json({
      space,
      entities: entities.map((e) => ({
        id: e.id,
        name: e.name,
        website: e.website,
        promptCount: e._count.prompts,
      })),
      summary: {
        entityCount: entities.length,
        promptCount: promptIds.length,
        analysisResultCount,
      },
    });
  } catch (error) {
    console.error("[ADMIN_SPACE_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// PATCH /api/admin/spaces/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin(request);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { llmProvider, plan } = body;

  try {
    const updateData: Record<string, unknown> = {};
    if (llmProvider !== undefined) updateData.llmProvider = llmProvider;
    if (plan !== undefined) updateData.plan = plan;

    const space = await prisma.space.update({
      where: { id },
      data: updateData,
    });

    await auditLog({ userId: session.user.id, action: 'space.update', targetType: 'Space', targetId: id, detail: updateData });

    return NextResponse.json(space);
  } catch (error) {
    console.error("[ADMIN_SPACE_UPDATE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// DELETE /api/admin/spaces/[id]
// Recursively deletes all entities (+ their prompts, results, etc.) then the space
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin(request);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;

  try {
    const space = await prisma.space.findUnique({ where: { id } });
    if (!space) return new NextResponse("Not found", { status: 404 });

    // 1. Cancel Mollie subscription if active
    if (space.mollieCustomerId && space.mollieSubscriptionId && space.subscriptionStatus !== 'CANCELED') {
      try {
        const { getMollie } = await import('@/lib/mollie');
        const mollie = getMollie();
        await mollie.customerSubscriptions.cancel(space.mollieSubscriptionId, {
          customerId: space.mollieCustomerId,
        });
        console.log(`[Admin Delete] Cancelled Mollie sub for space ${id}`);
      } catch (err) {
        console.error(`[Admin Delete] Mollie cancellation failed for space ${id}:`, err);
      }
    }

    // 2. Clean up queued BullMQ analysis jobs
    try {
      const spacePrompts = await prisma.prompt.findMany({
        where: { entity: { spaceId: id } },
        select: { id: true },
      });
      const promptIds = new Set(spacePrompts.map(p => p.id));
      if (promptIds.size > 0) {
        const { analysisQueue } = await import('@/lib/queue/analysisQueue');
        const jobs = await analysisQueue.getJobs(['waiting', 'delayed']);
        for (const job of jobs) {
          if (job.data?.promptId && promptIds.has(job.data.promptId)) {
            await job.remove().catch(() => {});
          }
        }
      }
    } catch (err) {
      console.error(`[Admin Delete] Queue cleanup failed for space ${id}:`, err);
    }

    // 3. Delete all entities (cascades prompts, results, mentions, links, metrics, etc.)
    await prisma.entity.deleteMany({ where: { spaceId: id } });

    // 4. Delete the space (invoices survive via SetNull; cascades members, invitations, usage)
    await prisma.space.delete({ where: { id } });

    await auditLog({ userId: session.user.id, action: 'space.delete', targetType: 'Space', targetId: id, detail: { spaceName: space.name } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ADMIN_SPACE_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
