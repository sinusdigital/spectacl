-- Add discovery settings JSON column to Entity
ALTER TABLE "Entity" ADD COLUMN "discoveryInputs" JSONB;

-- Remove duplicate SuggestedPrompts per (entityId, text), keeping the oldest
-- (ctid is Postgres' internal row id; any stable tiebreaker works)
DELETE FROM "SuggestedPrompt" a
USING "SuggestedPrompt" b
WHERE a.ctid > b.ctid
  AND a."entityId" = b."entityId"
  AND a.text = b.text;

-- Enforce uniqueness so createMany({ skipDuplicates: true }) has something to skip on
CREATE UNIQUE INDEX "SuggestedPrompt_entityId_text_key" ON "SuggestedPrompt"("entityId", "text");
