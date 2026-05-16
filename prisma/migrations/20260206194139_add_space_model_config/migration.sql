-- AlterTable
ALTER TABLE "Space" ADD COLUMN     "mistralApiKey" TEXT;

-- CreateTable
CREATE TABLE "SpaceModelConfig" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpaceModelConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SpaceModelConfig_spaceId_idx" ON "SpaceModelConfig"("spaceId");

-- CreateIndex
CREATE UNIQUE INDEX "SpaceModelConfig_spaceId_modelId_key" ON "SpaceModelConfig"("spaceId", "modelId");

-- AddForeignKey
ALTER TABLE "SpaceModelConfig" ADD CONSTRAINT "SpaceModelConfig_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;
