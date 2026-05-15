import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSpaceModelConfigs } from "@/lib/spaces";
import { DEFAULT_MODELS } from "@/types/models";
import { withEntityAuth } from '@/lib/permissions';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ entityId: string }> }
) {
    try {
        const { entityId } = await params;
        const authResult = await withEntityAuth(entityId);
        if (authResult.error) return authResult.error;
        const { searchParams } = new URL(request.url);
        const includeArchived = searchParams.get('includeArchived') === 'true';

        console.log(`[API] Fetching models for entity ${entityId}. includeArchived=${includeArchived}`);

        // 1. Get Entity to find Space ID
        const entity = await prisma.entity.findUnique({
            where: { id: entityId },
            select: { spaceId: true }
        });

        if (!entity || !entity.spaceId) {
            return NextResponse.json({ error: "Entity or Space not found" }, { status: 404 });
        }

        // 2. Get Space Model Configs (Centralized Logic)
        const { configs, llmProvider } = await getSpaceModelConfigs(entity.spaceId);

        // 3. Map to frontend format
        let models = configs.map(c => ({
            id: c.id,
            name: c.name,
            provider: c.provider,
            icon: c.provider === 'google' ? 'G' : (c.provider === 'mistral' ? 'M' : (c.provider === 'anthropic' ? 'A' : 'O')), 
            isEnabled: c.isEnabled,
            isArchived: c.isArchived,
            order: c.order,
            hasApiKey: c.hasApiKey,
            apiKeyMasked: c.hasApiKey ? (llmProvider === 'MANAGED' ? 'Managed' : '***...' + (c.apiKey?.slice(-4) || '')) : null,
            configId: c.id 
        }));

        // Sort by order
        models.sort((a, b) => a.order - b.order);

        if (!includeArchived) {
            models = models.filter(m => !m.isArchived);
        }

        console.log(`[API] Returning ${models.length} models for space ${entity.spaceId} (${llmProvider}).`);

        return NextResponse.json(models);
    } catch (error) {
        console.error("Error fetching models:", error);
        return NextResponse.json(
            { error: "Error fetching models" },
            { status: 500 }
        );
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ entityId: string }> }
) {
    try {
        const { entityId } = await params;
        const authResult = await withEntityAuth(entityId, { requireWrite: true });
        if (authResult.error) return authResult.error;
        const body = await request.json();
        const { modelId, apiKey, isEnabled, isArchived, provider, name } = body;

        // Try to find in supported list, OR use provided details
        let providerToUse = provider;
        let nameToUse = name;

        if (!providerToUse || !nameToUse) {
            const modelDef = DEFAULT_MODELS.find(m => m.id === modelId);
            if (modelDef) {
                providerToUse = modelDef.provider;
                nameToUse = modelDef.name;
            } else {
                // Check if existing config has it (update case)
                const existingCheck = await prisma.modelConfig.findFirst({ where: { entityId, modelId } });
                if (existingCheck) {
                    providerToUse = existingCheck.provider;
                    nameToUse = existingCheck.name;
                } else {
                    return NextResponse.json({ error: "Invalid model ID or missing provider/name" }, { status: 400 });
                }
            }
        }

        // Check if config exists
        const existing = await prisma.modelConfig.findUnique({
            where: {
                entityId_modelId: { entityId, modelId }
            }
        });

        const data: any = {
            provider: providerToUse,
            name: nameToUse || modelId,
            modelId: modelId,
            isEnabled: isEnabled !== undefined ? isEnabled : (existing?.isEnabled ?? true),
            isArchived: isArchived !== undefined ? isArchived : (existing?.isArchived ?? false),
        };

        if (apiKey) {
            data.apiKey = apiKey;
        }

        const config = await prisma.modelConfig.upsert({
            where: {
                entityId_modelId: { entityId, modelId }
            },
            update: data,
            create: {
                entityId,
                ...data
            }
        });

        return NextResponse.json(config);
    } catch (error) {
        console.error("Error updating model config:", error);
        return NextResponse.json(
            { error: "Error updating model config" },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ entityId: string }> }
) {
    try {
        const { entityId } = await params;
        const authResult = await withEntityAuth(entityId, { requireWrite: true });
        if (authResult.error) return authResult.error;
        const { searchParams } = new URL(request.url);
        const modelId = searchParams.get('modelId');

        if (!modelId) {
            return NextResponse.json({ error: "Model ID required" }, { status: 400 });
        }

        console.log(`[API] Deleting model ${modelId} for ${entityId}`);

        // Delete config
        await prisma.modelConfig.deleteMany({
            where: {
                entityId,
                modelId
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting model config:", error);
        return NextResponse.json(
            { error: "Error deleting model config" },
            { status: 500 }
        );
    }
}
