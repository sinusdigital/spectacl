-- Phase 4: rename the AEO internal task model from "aeo_tactics" to
-- "aeo_personalization". The LLM no longer selects tactics — the engine does
-- (Phase 3). The remaining LLM call's only job is personalizing the engine's
-- chosen items with website-specific copy. Renaming matches behavior.
--
-- Idempotent: if the new key already exists, this is a no-op via WHERE clause.

UPDATE "InternalTaskModel" SET "taskKey" = 'aeo_personalization' WHERE "taskKey" = 'aeo_tactics';
