-- CreateTable
CREATE TABLE "InternalTaskModel" (
    "taskKey" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "displayName" TEXT,
    "maxOutputTokens" INTEGER NOT NULL DEFAULT 1500,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternalTaskModel_pkey" PRIMARY KEY ("taskKey")
);

-- Seed default rows. All tasks default to Mistral (cheap, internal-only).
-- Admin can override per-task via Master LLMs page.
INSERT INTO "InternalTaskModel" ("taskKey", "provider", "modelId", "displayName", "maxOutputTokens", "updatedAt") VALUES
    ('ranking',              'mistral', 'mistral-small-latest', 'Mistral Small', 4000, NOW()),
    ('brand_extraction',     'mistral', 'mistral-small-latest', 'Mistral Small', 1500, NOW()),
    ('suggested_prompts',    'mistral', 'mistral-small-latest', 'Mistral Small', 2000, NOW()),
    ('competitor_discovery', 'mistral', 'mistral-small-latest', 'Mistral Small', 1500, NOW()),
    ('geo_tactics',          'mistral', 'mistral-small-latest', 'Mistral Small', 2000, NOW());
