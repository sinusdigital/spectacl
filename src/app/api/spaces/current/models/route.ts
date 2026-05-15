import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { getCurrentSpace, getSpaceModelConfigs } from '@/lib/spaces';
import { DEFAULT_MODELS } from '@/types/models';

// GET /api/spaces/current/models
export async function GET(request: NextRequest) {
    try {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const space = await getCurrentSpace(session.user.id);
        if (!space) {
            return NextResponse.json({ error: 'No space found' }, { status: 404 });
        }

        const { searchParams } = new URL(request.url);
        const includeArchived = searchParams.get('includeArchived') === 'true';

        // Delegate all MANAGED/BYOK logic to the single source of truth
        const { configs, llmProvider } = await getSpaceModelConfigs(space.id);

        // Map to frontend presentation format (mask keys, add order)
        let models = configs.map((c, index) => ({
            id: c.id,
            modelId: c.modelId,
            name: c.name,
            provider: c.provider,
            isEnabled: c.isEnabled,
            isArchived: c.isArchived,
            hasApiKey: c.hasApiKey,
            order: c.order ?? index,
            apiKeyMasked: c.hasApiKey
                ? (llmProvider === 'MANAGED' ? 'Managed' : '***...' + (c.apiKey?.slice(-4) || ''))
                : null,
            configId: c.id
        }));

        models.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

        if (!includeArchived) {
            models = models.filter(m => !m.isArchived);
        }

        return NextResponse.json({
            models,
            llmProvider,
            spaceId: space.id,
            spaceName: space.name
        });
        
    } catch (error) {
        console.error('Error fetching space models:', error);
        return NextResponse.json(
            { error: 'Error fetching models' },
            { status: 500 }
        );
    }
}

// POST /api/spaces/current/models
export async function POST(request: NextRequest) {
    try {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const space = await getCurrentSpace(session.user.id);
        if (!space) {
            return NextResponse.json({ error: 'No space found' }, { status: 404 });
        }

        const body = await request.json();
        const { modelId, apiKey, isEnabled, isArchived, provider, name } = body;

        // Determine provider and name
        let providerToUse = provider;
        let nameToUse = name;

        if (!providerToUse || !nameToUse) {
            const modelDef = DEFAULT_MODELS.find(m => m.id === modelId);
            if (modelDef) {
                providerToUse = modelDef.provider;
                nameToUse = modelDef.name;
            } else {
                const existingCheck = await prisma.spaceModelConfig.findFirst({
                    where: { spaceId: space.id, modelId }
                });
                if (existingCheck) {
                    providerToUse = existingCheck.provider;
                    nameToUse = existingCheck.name;
                } else {
                    return NextResponse.json(
                        { error: 'Invalid model ID or missing provider/name' },
                        { status: 400 }
                    );
                }
            }
        }

        // Update Space API key if provided
        if (apiKey) {
            // For MANAGED spaces, we do NOT allow updating API keys
            // The master keys are used instead
            if (space.llmProvider === 'MANAGED') {
                 // We silently ignore the key update or throw error?
                 // Safer to ignore but maybe better to verify on frontend.
                 // Let's explicitly NOT update the space keys.
            } else {
                const providerKey = `${providerToUse.toLowerCase()}ApiKey`;
                const updateData: any = {};
                
                if (providerKey === 'openaiApiKey') updateData.openaiApiKey = apiKey;
                else if (providerKey === 'anthropicApiKey') updateData.anthropicApiKey = apiKey;
                else if (providerKey === 'googleApiKey') updateData.googleApiKey = apiKey;
                else if (providerKey === 'mistralApiKey') updateData.mistralApiKey = apiKey;

                await prisma.space.update({
                    where: { id: space.id },
                    data: updateData
                });
            }
        }

        // Upsert model config
        const configData: any = {
            provider: providerToUse,
            name: nameToUse || modelId,
            modelId: modelId,
            isEnabled: isEnabled !== undefined ? isEnabled : true,
            isArchived: isArchived !== undefined ? isArchived : false,
        };

        const config = await prisma.spaceModelConfig.upsert({
            where: {
                spaceId_modelId: { spaceId: space.id, modelId }
            },
            update: configData,
            create: {
                spaceId: space.id,
                ...configData
            }
        });

        return NextResponse.json(config);
    } catch (error) {
        console.error('Error updating space model config:', error);
        return NextResponse.json(
            { error: 'Error updating model config' },
            { status: 500 }
        );
    }
}
