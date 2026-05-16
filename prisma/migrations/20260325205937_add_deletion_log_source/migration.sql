-- AlterTable
ALTER TABLE "SpaceDeletionLog" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'deletion';

-- CreateIndex
CREATE INDEX "SpaceDeletionLog_source_idx" ON "SpaceDeletionLog"("source");
