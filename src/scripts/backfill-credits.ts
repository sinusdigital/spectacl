
import { prisma } from '../lib/prisma';
import { calculateMonthlyCreditsFromDb, getActiveModelCount, type PlanKey } from '../lib/billing/plans';

async function backfillCredits() {
  console.log('Starting credit backfill...');

  try {
    const spaces = await prisma.space.findMany();
    const modelCount = await getActiveModelCount();
    console.log(`Found ${spaces.length} spaces to check. Active models: ${modelCount}`);

    let updatedCount = 0;

    for (const space of spaces) {
      const limit = await calculateMonthlyCreditsFromDb(space.plan as PlanKey, modelCount);

      // Update if credits are 0 or reset date is missing
      if (space.llmCreditsRemaining === 0 || !space.creditResetDate) {
        console.log(`Updating space ${space.name} (${space.slug}) - Plan: ${space.plan}, Credits: ${limit}`);

        await prisma.space.update({
          where: { id: space.id },
          data: {
            llmCreditsRemaining: limit,
            llmCreditsUsed: 0,
            creditResetDate: new Date(),
          },
        });

        updatedCount++;
      }
    }

    console.log(`Backfill complete. Updated ${updatedCount} spaces.`);
  } catch (error) {
    console.error('Error backfilling credits:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// execute if running directly
if (require.main === module) {
  backfillCredits();
}

export { backfillCredits };
