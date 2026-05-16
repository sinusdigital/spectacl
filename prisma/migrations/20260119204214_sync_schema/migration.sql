/*
  Warnings:

  - You are about to drop the column `description` on the `Entity` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "AnalysisResult" DROP CONSTRAINT "AnalysisResult_checkRunId_fkey";

-- DropForeignKey
ALTER TABLE "AnalysisResult" DROP CONSTRAINT "AnalysisResult_promptId_fkey";

-- DropForeignKey
ALTER TABLE "Prompt" DROP CONSTRAINT "Prompt_entityId_fkey";

-- AlterTable
ALTER TABLE "AnalysisResult" ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'success';

-- AlterTable
ALTER TABLE "Competitor" ADD COLUMN     "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "darkVibrantColor" TEXT,
ADD COLUMN     "primaryColor" TEXT;

-- AlterTable
ALTER TABLE "Domain" ADD COLUMN     "type" TEXT;

-- AlterTable
ALTER TABLE "Entity" DROP COLUMN "description",
ADD COLUMN     "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "primaryColor" TEXT;

-- CreateTable
CREATE TABLE "ModelConfig" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "apiKey" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "entityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModelConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "entityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisLink" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "analysisResultId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalysisLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisMention" (
    "id" TEXT NOT NULL,
    "analysisResultId" TEXT NOT NULL,
    "competitorId" TEXT,
    "isPrimaryEntity" BOOLEAN NOT NULL DEFAULT false,
    "detectedName" TEXT NOT NULL,
    "position" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalysisMention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricSnapshot" (
    "id" TEXT NOT NULL,
    "entityId" TEXT,
    "competitorId" TEXT,
    "timeframe" TEXT NOT NULL,
    "visibility" DOUBLE PRECISION NOT NULL,
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "mentionCount" INTEGER NOT NULL DEFAULT 0,
    "sentiment" DOUBLE PRECISION NOT NULL,
    "position" DOUBLE PRECISION,
    "linkPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetricSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuggestedCompetitor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "entityId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'suggested',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuggestedCompetitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuggestedPrompt" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "intent" TEXT,
    "entityId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'suggested',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuggestedPrompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ranking" (
    "id" TEXT NOT NULL,
    "primaryBuyerRole" TEXT,
    "companySize" TEXT,
    "industry" TEXT,
    "decisionContext" TEXT,
    "entityId" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ranking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CompetitorToRanking" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_PromptToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "ModelConfig_entityId_modelId_key" ON "ModelConfig"("entityId", "modelId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_entityId_key" ON "Tag"("name", "entityId");

-- CreateIndex
CREATE INDEX "AnalysisLink_domain_idx" ON "AnalysisLink"("domain");

-- CreateIndex
CREATE INDEX "AnalysisMention_analysisResultId_idx" ON "AnalysisMention"("analysisResultId");

-- CreateIndex
CREATE INDEX "AnalysisMention_competitorId_idx" ON "AnalysisMention"("competitorId");

-- CreateIndex
CREATE INDEX "MetricSnapshot_entityId_idx" ON "MetricSnapshot"("entityId");

-- CreateIndex
CREATE INDEX "MetricSnapshot_competitorId_idx" ON "MetricSnapshot"("competitorId");

-- CreateIndex
CREATE UNIQUE INDEX "SuggestedCompetitor_name_entityId_key" ON "SuggestedCompetitor"("name", "entityId");

-- CreateIndex
CREATE INDEX "SuggestedPrompt_entityId_idx" ON "SuggestedPrompt"("entityId");

-- CreateIndex
CREATE UNIQUE INDEX "Ranking_promptId_key" ON "Ranking"("promptId");

-- CreateIndex
CREATE UNIQUE INDEX "_CompetitorToRanking_AB_unique" ON "_CompetitorToRanking"("A", "B");

-- CreateIndex
CREATE INDEX "_CompetitorToRanking_B_index" ON "_CompetitorToRanking"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_PromptToTag_AB_unique" ON "_PromptToTag"("A", "B");

-- CreateIndex
CREATE INDEX "_PromptToTag_B_index" ON "_PromptToTag"("B");

-- CreateIndex
CREATE INDEX "AnalysisResult_llmModel_idx" ON "AnalysisResult"("llmModel");

-- CreateIndex
CREATE INDEX "AnalysisResult_promptId_idx" ON "AnalysisResult"("promptId");

-- CreateIndex
CREATE INDEX "AnalysisResult_createdAt_idx" ON "AnalysisResult"("createdAt");

-- AddForeignKey
ALTER TABLE "ModelConfig" ADD CONSTRAINT "ModelConfig_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prompt" ADD CONSTRAINT "Prompt_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisResult" ADD CONSTRAINT "AnalysisResult_checkRunId_fkey" FOREIGN KEY ("checkRunId") REFERENCES "CheckRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisResult" ADD CONSTRAINT "AnalysisResult_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "Prompt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisLink" ADD CONSTRAINT "AnalysisLink_analysisResultId_fkey" FOREIGN KEY ("analysisResultId") REFERENCES "AnalysisResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisMention" ADD CONSTRAINT "AnalysisMention_analysisResultId_fkey" FOREIGN KEY ("analysisResultId") REFERENCES "AnalysisResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisMention" ADD CONSTRAINT "AnalysisMention_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "Competitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricSnapshot" ADD CONSTRAINT "MetricSnapshot_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "Competitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricSnapshot" ADD CONSTRAINT "MetricSnapshot_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuggestedCompetitor" ADD CONSTRAINT "SuggestedCompetitor_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuggestedPrompt" ADD CONSTRAINT "SuggestedPrompt_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ranking" ADD CONSTRAINT "Ranking_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ranking" ADD CONSTRAINT "Ranking_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "Prompt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CompetitorToRanking" ADD CONSTRAINT "_CompetitorToRanking_A_fkey" FOREIGN KEY ("A") REFERENCES "Competitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CompetitorToRanking" ADD CONSTRAINT "_CompetitorToRanking_B_fkey" FOREIGN KEY ("B") REFERENCES "Ranking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PromptToTag" ADD CONSTRAINT "_PromptToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Prompt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PromptToTag" ADD CONSTRAINT "_PromptToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
