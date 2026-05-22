import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create founder user
  const founderUser = await prisma.user.upsert({
    where: { email: 'founder@spectacl.org' },
    update: {},
    create: {
      id: 'founder-user-id',
      email: 'founder@spectacl.org',
      name: 'Founder',
      emailVerified: true,
    },
  });

  console.log('✅ Created founder user:', founderUser.email);

  // Create founder Space
  const founderSpace = await prisma.space.upsert({
    where: { slug: 'spectacl-hq' },
    update: {},
    create: {
      id: 'founder-space-id',
      name: 'Spectacl HQ',
      slug: 'spectacl-hq',
      createdById: founderUser.id,
      plan: 'FOUNDER',
      subscriptionStatus: 'ACTIVE',
      llmProvider: 'MANAGED',
      llmCreditsRemaining: -1, // Unlimited
    },
  });

  console.log('✅ Created founder Space:', founderSpace.name);

  // Add founder as Space owner
  await prisma.spaceMember.upsert({
    where: {
      userId_spaceId: {
        userId: founderUser.id,
        spaceId: founderSpace.id,
      },
    },
    update: {},
    create: {
      userId: founderUser.id,
      spaceId: founderSpace.id,
      role: 'OWNER',
    },
  });

  console.log('✅ Added founder as Space owner');

  // Create SpaceUsage record
  await prisma.spaceUsage.upsert({
    where: { spaceId: founderSpace.id },
    update: {},
    create: {
      id: crypto.randomUUID(),
      spaceId: founderSpace.id,
      memberCount: 1,
      entityCount: 0,
      promptCount: 0,
    },
  });

  console.log('✅ Created SpaceUsage record');

  // Migrate existing entities to founder Space
  const entityCount = await prisma.entity.count({
    where: { spaceId: null },
  });

  if (entityCount > 0) {
    await prisma.entity.updateMany({
      where: { spaceId: null },
      data: {
        spaceId: founderSpace.id,
        createdById: founderUser.id,
      },
    });

    console.log(`✅ Migrated ${entityCount} entities to founder Space`);

    // Update usage counts
    const activeEntityCount = await prisma.entity.count({
      where: {
        spaceId: founderSpace.id,
        isArchived: false,
      },
    });

    const promptCount = await prisma.prompt.count({
      where: {
        entity: {
          spaceId: founderSpace.id,
        },
      },
    });

    await prisma.spaceUsage.update({
      where: { spaceId: founderSpace.id },
      data: {
        entityCount: activeEntityCount,
        promptCount: promptCount,
      },
    });

    console.log(`✅ Updated usage: ${activeEntityCount} entities, ${promptCount} prompts`);
  }

  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
