-- AlterTable
ALTER TABLE "Domain" ADD COLUMN     "category" TEXT,
ADD COLUMN     "isAllowlisted" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "DomainType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DomainType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DomainType_name_key" ON "DomainType"("name");

-- CreateIndex
CREATE INDEX "Domain_category_idx" ON "Domain"("category");

-- CreateIndex
CREATE INDEX "Domain_isAllowlisted_idx" ON "Domain"("isAllowlisted");
