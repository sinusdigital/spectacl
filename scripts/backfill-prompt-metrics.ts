
import { prisma } from "../src/lib/prisma";
import { updatePromptMetrics } from "../src/lib/metrics";

async function backfillPromptMetrics() {
  console.log("Starting backfill for Prompt metrics...");

  try {
    const prompts = await prisma.prompt.findMany({ select: { id: true, text: true } });
    console.log(`Found ${prompts.length} prompts to process.`);

    let processed = 0;
    const errors: string[] = [];

    for (const prompt of prompts) {
      try {
        await updatePromptMetrics(prompt.id);
        processed++;
        if (processed % 10 === 0) {
          console.log(`Processed ${processed}/${prompts.length} prompts...`);
        }
      } catch (error) {
        console.error(`Failed to update prompt ${prompt.id} (${prompt.text}):`, error);
        errors.push(prompt.id);
      }
    }

    console.log("Backfill complete!");
    console.log(`Successfully processed: ${processed}`);
    console.log(`Failed: ${errors.length}`);

    if (errors.length > 0) {
      console.log("Failed prompt IDs:", errors);
    }
  } catch (error) {
    console.error("Critical error during backfill:", error);
  } finally {
    await prisma.$disconnect();
  }
}

backfillPromptMetrics();
