-- Step 1: Add typeId column (nullable FK to DomainType)
ALTER TABLE "Domain" ADD COLUMN "typeId" TEXT;

-- Step 2: Populate typeId from existing type name strings
UPDATE "Domain" d
SET "typeId" = dt."id"
FROM "DomainType" dt
WHERE d."type" = dt."name";

-- Step 3: Drop the old denormalized type string column and its index
DROP INDEX IF EXISTS "Domain_type_idx";
ALTER TABLE "Domain" DROP COLUMN "type";

-- Step 4: Create index on the new FK column
CREATE INDEX "Domain_typeId_idx" ON "Domain"("typeId");

-- Step 5: Add foreign key constraint (SET NULL on delete)
ALTER TABLE "Domain" ADD CONSTRAINT "Domain_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "DomainType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
