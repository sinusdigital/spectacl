-- Phase 1 of AEO Suggestion Engine refactor.
-- Adds the per-entity suggestion table backing the /[entityId]/suggestions page.
-- Replaces the previous ephemeral (in-memory) state with a real persistence layer.
-- The library source ("tacticId") still references the static GEO_TACTICS array;
-- a future migration will introduce AeoPlaybookItem and convert this to an FK.

CREATE TYPE "AeoSurface" AS ENUM ('OnPage', 'OffPage');

CREATE TYPE "AeoSuggestionCategory" AS ENUM ('Content', 'Technical', 'Authority', 'UX', 'Brand');

CREATE TYPE "AeoSuggestionStatus" AS ENUM ('Suggested', 'ToDo', 'In_Progress', 'Done', 'Dismissed');

CREATE TYPE "AeoSuggestionSource" AS ENUM ('engine', 'manual', 'llm_custom');

CREATE TABLE "EntitySuggestion" (
    "id"              TEXT NOT NULL,
    "entityId"        TEXT NOT NULL,
    "tacticId"        TEXT,
    "title"           TEXT NOT NULL,
    "description"     TEXT NOT NULL,
    "category"        "AeoSuggestionCategory" NOT NULL,
    "surface"         "AeoSurface" NOT NULL,
    "impact"          INTEGER NOT NULL,
    "effort"          INTEGER NOT NULL,
    "status"          "AeoSuggestionStatus" NOT NULL DEFAULT 'Suggested',
    "source"          "AeoSuggestionSource" NOT NULL DEFAULT 'engine',
    "tags"            TEXT[] DEFAULT ARRAY[]::TEXT[],
    "triggerContext"  JSONB,
    "notes"           TEXT,
    "dueDate"         TIMESTAMP(3),
    "dismissedReason" TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EntitySuggestion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EntitySuggestion_entityId_tacticId_key"
    ON "EntitySuggestion"("entityId", "tacticId");

CREATE INDEX "EntitySuggestion_entityId_status_idx"
    ON "EntitySuggestion"("entityId", "status");

CREATE INDEX "EntitySuggestion_entityId_surface_idx"
    ON "EntitySuggestion"("entityId", "surface");

ALTER TABLE "EntitySuggestion"
    ADD CONSTRAINT "EntitySuggestion_entityId_fkey"
    FOREIGN KEY ("entityId")
    REFERENCES "Entity"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
