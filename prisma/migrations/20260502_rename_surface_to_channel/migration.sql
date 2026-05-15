-- Rename "surface" → "channel" across the AEO suggestion schema.
-- Postgres supports both ALTER TYPE ... RENAME and ALTER TABLE ... RENAME COLUMN
-- in-place, so this is data-preserving and non-breaking for existing rows.

ALTER TYPE "AeoSurface" RENAME TO "AeoChannel";

ALTER TABLE "EntitySuggestion" RENAME COLUMN "surface" TO "channel";

ALTER INDEX "EntitySuggestion_entityId_surface_idx"
    RENAME TO "EntitySuggestion_entityId_channel_idx";
