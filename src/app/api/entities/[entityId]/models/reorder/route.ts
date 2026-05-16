
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_MODELS } from "@/types/models";
import { withEntityAuth } from '@/lib/permissions';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ entityId: string }> }
) {
    try {
        const { entityId } = await params;
        const authResult = await withEntityAuth(entityId, { requireWrite: true });
        if (authResult.error) return authResult.error;
        const body = await request.json();
        const { modelIds }: { modelIds: string[] } = body;

        if (!Array.isArray(modelIds)) {
            return NextResponse.json({ error: "modelIds must be an array" }, { status: 400 });
        }

        // Transaction to ensure atomicity
        await prisma.$transaction(async (tx) => {
            for (let i = 0; i < modelIds.length; i++) {
                const modelId = modelIds[i];
                const order = i;

                // Check if config exists
                const existing = await tx.modelConfig.findUnique({
                    where: {
                        entityId_modelId: { entityId, modelId }
                    }
                });

                if (existing) {
                    // Update order
                    await tx.modelConfig.update({
                        where: { id: existing.id },
                        data: { order }
                    });
                } else {
                    // Create config if missing (only for supported models)
                    const supported = DEFAULT_MODELS.find(m => m.id === modelId);
                    if (supported) {
                        await tx.modelConfig.create({
                            data: {
                                entityId,
                                modelId,
                                provider: supported.provider,
                                name: supported.name,
                                isEnabled: false, // Default to disabled if just reordering
                                isArchived: false,
                                order
                            }
                        });
                    } else {
                        // If not supported and not in DB, it shouldn't be here. Ignore/Warn.
                        console.warn(`Model ${modelId} not found in DB or Supported list during reorder.`);
                    }
                }
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error reordering models:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
