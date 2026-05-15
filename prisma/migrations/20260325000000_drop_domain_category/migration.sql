-- DropIndex
DROP INDEX IF EXISTS "Domain_category_idx";

-- AlterTable
ALTER TABLE "Domain" DROP COLUMN IF EXISTS "category";

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Domain_type_idx" ON "Domain"("type");
