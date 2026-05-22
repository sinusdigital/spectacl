-- Clean up orphaned entities: null out spaceId where the referenced Space no longer exists
UPDATE "Entity" SET "spaceId" = NULL
WHERE "spaceId" IS NOT NULL
  AND "spaceId" NOT IN (SELECT "id" FROM "Space");

-- AddForeignKey
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;
