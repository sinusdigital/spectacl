-- CreateEnum
CREATE TYPE "PromptStatus" AS ENUM ('Running', 'Paused');

-- CreateEnum
CREATE TYPE "PromptFrequency" AS ENUM ('Daily', 'Weekly', 'Monthly');

-- AlterTable
ALTER TABLE "Prompt" ADD COLUMN     "frequency" "PromptFrequency" NOT NULL DEFAULT 'Daily',
ADD COLUMN     "llms" TEXT[] DEFAULT ARRAY['gpt-4', 'claude-3-opus', 'gemini-pro']::TEXT[],
ADD COLUMN     "status" "PromptStatus" NOT NULL DEFAULT 'Running';
