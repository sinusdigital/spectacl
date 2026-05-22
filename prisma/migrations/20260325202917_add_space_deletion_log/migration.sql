-- CreateTable
CREATE TABLE "SpaceDeletionLog" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "spaceName" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "reason" TEXT,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpaceDeletionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SpaceDeletionLog_deletedAt_idx" ON "SpaceDeletionLog"("deletedAt");
