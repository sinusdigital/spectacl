-- PR 1: add viewedAt column to EntitySuggestion.
-- viewedAt = null means the row has never been opened or actioned by a user
-- (the UI shows a "NEW" dot + bold title). The first PATCH, drawer open, status
-- change, or bulk action sets this to NOW(). Engine refresh never modifies it.
--
-- Backfill: every existing row gets viewedAt = createdAt so we don't suddenly
-- flag every row as NEW after this migration applies.

ALTER TABLE "EntitySuggestion" ADD COLUMN "viewedAt" TIMESTAMP(3);

UPDATE "EntitySuggestion" SET "viewedAt" = "createdAt" WHERE "viewedAt" IS NULL;
