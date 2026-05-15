-- DropIndex
DROP INDEX "AnalysisResult_createdAt_idx";

-- DropIndex
DROP INDEX "AnalysisResult_promptId_idx";

-- CreateTable
CREATE TABLE "DomainCitation" (
    "id" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "presence" INTEGER NOT NULL,
    "lastSeen" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DomainCitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DomainCitation_promptId_count_idx" ON "DomainCitation"("promptId", "count" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "DomainCitation_promptId_domain_key" ON "DomainCitation"("promptId", "domain");

-- CreateIndex
CREATE INDEX "AnalysisResult_promptId_createdAt_idx" ON "AnalysisResult"("promptId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AnalysisResult_mentioned_idx" ON "AnalysisResult"("mentioned");

-- CreateIndex
CREATE INDEX "AnalysisResult_status_idx" ON "AnalysisResult"("status");

-- CreateIndex
CREATE INDEX "Prompt_entityId_status_idx" ON "Prompt"("entityId", "status");

-- CreateIndex
CREATE INDEX "Prompt_nextRunAt_idx" ON "Prompt"("nextRunAt");

-- AddForeignKey
ALTER TABLE "DomainCitation" ADD CONSTRAINT "DomainCitation_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "Prompt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
