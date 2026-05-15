-- CreateTable
CREATE TABLE "EntityDomainOverride" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "typeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EntityDomainOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EntityDomainOverride_entityId_idx" ON "EntityDomainOverride"("entityId");

-- CreateIndex
CREATE UNIQUE INDEX "EntityDomainOverride_entityId_domain_key" ON "EntityDomainOverride"("entityId", "domain");

-- AddForeignKey
ALTER TABLE "EntityDomainOverride" ADD CONSTRAINT "EntityDomainOverride_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityDomainOverride" ADD CONSTRAINT "EntityDomainOverride_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "DomainType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
