-- AlterTable
ALTER TABLE "DomainType" ADD COLUMN "slug" TEXT;

-- Backfill slugs from existing names (lowercase, spaces/& to hyphens, strip special chars)
UPDATE "DomainType" SET "slug" = LOWER(
    REGEXP_REPLACE(
        REGEXP_REPLACE(
            REGEXP_REPLACE("name", '[&]', '', 'g'),
            '[^a-zA-Z0-9 -]', '', 'g'
        ),
        '[ ]+', '-', 'g'
    )
);

-- CreateIndex
CREATE UNIQUE INDEX "DomainType_slug_key" ON "DomainType"("slug");
