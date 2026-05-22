-- CreateTable
CREATE TABLE "GlobalCitationSnapshot" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "llmModel" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GlobalCitationSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GlobalCitationSnapshot_period_llmModel_idx" ON "GlobalCitationSnapshot"("period", "llmModel");

-- CreateIndex
CREATE UNIQUE INDEX "GlobalCitationSnapshot_period_llmModel_domain_key" ON "GlobalCitationSnapshot"("period", "llmModel", "domain");
