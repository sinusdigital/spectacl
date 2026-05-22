/*
  Warnings:

  - The values [Daily,Weekly,Monthly] on the enum `PromptFrequency` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PromptFrequency_new" AS ENUM ('Every6Hours', 'Every24Hours', 'Every2Days', 'Every7Days');
ALTER TABLE "Prompt" ALTER COLUMN "frequency" DROP DEFAULT;
ALTER TABLE "Prompt" ALTER COLUMN "frequency" TYPE "PromptFrequency_new" USING ("frequency"::text::"PromptFrequency_new");
ALTER TYPE "PromptFrequency" RENAME TO "PromptFrequency_old";
ALTER TYPE "PromptFrequency_new" RENAME TO "PromptFrequency";
DROP TYPE "PromptFrequency_old";
ALTER TABLE "Prompt" ALTER COLUMN "frequency" SET DEFAULT 'Every24Hours';
COMMIT;

-- AlterTable
ALTER TABLE "Prompt" ADD COLUMN     "lastRunAt" TIMESTAMP(3),
ADD COLUMN     "nextRunAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "frequency" SET DEFAULT 'Every24Hours';
