import { PrismaClient } from '@prisma/client';
import { DEFAULT_MODELS } from '@/types/models';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding GlobalModels from DEFAULT_MODELS...');

  // 1. Insert DEFAULT_MODELS robustly
  for (let i = 0; i < DEFAULT_MODELS.length; i++) {
    const defaultModel = DEFAULT_MODELS[i];
    await prisma.globalModel.upsert({
      where: { modelId: defaultModel.id },
      update: {
        provider: defaultModel.provider,
        displayName: defaultModel.name,
        isEnabled: defaultModel.isEnabled,
        order: i,
      },
      create: {
        modelId: defaultModel.id,
        provider: defaultModel.provider,
        displayName: defaultModel.name,
        isEnabled: defaultModel.isEnabled,
        order: i,
      }
    });
  }
  console.log(`✅ Seeded ${DEFAULT_MODELS.length} models from DEFAULT_MODELS.`);

  // 2. Defensively check all existing SpaceModelConfigs for modelIds that are NOT in GlobalModel
  console.log('Defensively checking existing SpaceModelConfigs for orphaned modelIds...');
  const spaceConfigs = await prisma.spaceModelConfig.findMany({
    select: { modelId: true, provider: true, name: true },
    distinct: ['modelId']
  });

  const allGlobalModels = await prisma.globalModel.findMany({ select: { modelId: true } });
  const globalModelIds = new Set(allGlobalModels.map(m => m.modelId));

  let missingCount = 0;
  for (const config of spaceConfigs) {
    if (!globalModelIds.has(config.modelId)) {
      console.warn(`⚠️ Warning: Found orphaned modelId "${config.modelId}" being used in SpaceModelConfig! Inserting generic GlobalModel to prevent foreign key or resolution crashes...`);
      await prisma.globalModel.upsert({
        where: { modelId: config.modelId },
        update: {},
        create: {
          modelId: config.modelId,
          provider: config.provider || 'unknown',
          displayName: config.name || `Migrated ${config.modelId}`,
          isEnabled: false, // Default to disabled so it doesn't show up in the new selector unless explicitly wanted
        }
      });
      globalModelIds.add(config.modelId);
      missingCount++;
    }
  }

  if (missingCount > 0) {
    console.log(`✅ Defensively inserted ${missingCount} orphaned models found in spaces.`);
  } else {
    console.log(`✅ No orphaned models found in spaces. Database is clean.`);
  }
}

main()
  .catch((e) => {
    console.error('Migration Seed Failed!', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
