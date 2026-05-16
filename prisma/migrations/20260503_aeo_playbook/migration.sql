-- Phase 2 of AEO Suggestion Engine refactor.
-- Moves the static GEO_TACTICS library out of source code into AeoPlaybookItem,
-- a DB-backed table that admins can edit without deploys. Adds an FK from
-- EntitySuggestion.tacticId → AeoPlaybookItem.slug (SetNull) so deleted/deactivated
-- playbook items leave user-owned rows intact.
--
-- Also renames the internal task model 'geo_tactics' → 'aeo_tactics' to match
-- the user-facing AEO terminology adopted in Phase 1.

-- 1. Create AeoPlaybookItem
CREATE TABLE "AeoPlaybookItem" (
    "id"                    TEXT NOT NULL,
    "slug"                  TEXT NOT NULL,
    "title"                 TEXT NOT NULL,
    "description"           TEXT NOT NULL,
    "category"              "AeoSuggestionCategory" NOT NULL,
    "channel"               "AeoChannel" NOT NULL,
    "defaultImpact"         INTEGER NOT NULL,
    "defaultEffort"         INTEGER NOT NULL,
    "tags"                  TEXT[] DEFAULT ARRAY[]::TEXT[],
    "triggers"              JSONB NOT NULL DEFAULT '[]',
    "personalizationPrompt" TEXT,
    "version"               INTEGER NOT NULL DEFAULT 1,
    "isActive"              BOOLEAN NOT NULL DEFAULT true,
    "createdById"           TEXT,
    "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"             TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AeoPlaybookItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AeoPlaybookItem_slug_key" ON "AeoPlaybookItem"("slug");
CREATE INDEX "AeoPlaybookItem_isActive_channel_idx" ON "AeoPlaybookItem"("isActive", "channel");

-- 2. Seed the 20 existing tactics from src/lib/geoTactics.ts.
--    Slugs match the legacy IDs so existing EntitySuggestion.tacticId references resolve.
INSERT INTO "AeoPlaybookItem"
    ("id", "slug", "title", "description", "category", "channel", "defaultImpact", "defaultEffort", "tags", "updatedAt")
VALUES
    (gen_random_uuid()::text, 'geo_1',
     'Implement "Direct Answer" Structuring',
     'LLMs prioritize content that directly answers user queries. Restructure your key pages to start with clear, definitional answers to "What result...", "How to...", and "Who is..." questions related to your products.',
     'Content', 'OnPage', 9, 5, ARRAY['content-structure','featured-snippet'], NOW()),

    (gen_random_uuid()::text, 'geo_2',
     'Add Entity Identity Schema',
     'Ensure your "About" page uses Organization Schema markup with "sameAs" properties linking to your social profiles and Wikipedia (if applicable). This solidifies your entity identity in the Knowledge Graph.',
     'Technical', 'OnPage', 8, 3, ARRAY['schema','knowledge-graph'], NOW()),

    (gen_random_uuid()::text, 'geo_3',
     'Create a "Stat-Bank" for Industry Data',
     'LLMs crave statistics to validate their generations. Publish a page aggregating unique industry statistics or your own user data. This increases the likelihood of being included as a source.',
     'Authority', 'OnPage', 8, 7, ARRAY['link-building','data-journalism','link-bait'], NOW()),

    (gen_random_uuid()::text, 'geo_4',
     'Optimize for "Best X for Y" Lists',
     'Generative engines often summarize options. Create pages specifically targeting comparison queries (e.g., "Best CRM for SMBs"). Use unbiased language to become a trusted source for these summaries.',
     'Content', 'OnPage', 9, 6, ARRAY['comparison','intent-targeting'], NOW()),

    (gen_random_uuid()::text, 'geo_5',
     'Improve Brand Sentiment via Community Engagement',
     'LLMs ingest community discussions (Reddit, Quora) to gauge sentiment. Actively monitor and participate in these threads to shift the corpus sentiment from neutral/negative to positive.',
     'Brand', 'OffPage', 7, 8, ARRAY['reputation','community'], NOW()),

    (gen_random_uuid()::text, 'geo_6',
     'Fix 404s on High-Authority Associated Pages',
     'Broken links break the chain of authority. Identify and fix 404 errors, especially on pages that historically had good authority or are referenced by other entities.',
     'UX', 'OnPage', 6, 2, ARRAY['technical-seo','maintenance'], NOW()),

    (gen_random_uuid()::text, 'geo_7',
     'Consolidate Thin Content into Pillars',
     'LLMs prefer comprehensive depth. Merge fragmented, thin blog posts into single, authoritative "Pillar Pages" that cover a topic exhaustively.',
     'Content', 'OnPage', 8, 6, ARRAY['content-pruning','pillar-page'], NOW()),

    (gen_random_uuid()::text, 'geo_8',
     'Add Expert Authorship Signals',
     'E-E-A-T matters. Add detailed author bios with credentials, links to LinkedIn, and specific expertise verification to your articles.',
     'Authority', 'OnPage', 5, 3, ARRAY['eeat','trust'], NOW()),

    (gen_random_uuid()::text, 'geo_9',
     'Structure Data with FAQs',
     'Use FAQ Schema markup on product and service pages. This data is easily parsed by LLMs for "question and answer" style retrieval.',
     'Technical', 'OnPage', 7, 4, ARRAY['schema','faq'], NOW()),

    (gen_random_uuid()::text, 'geo_10',
     'Secure Sources in Niche Glossaries',
     'Get defined in industry-specific wikis or glossaries. Being the definition source for niche terms associates your brand with those concepts in the vector space.',
     'Authority', 'OffPage', 6, 7, ARRAY['backlinks','definitions'], NOW()),

    (gen_random_uuid()::text, 'geo_11',
     'Diversify Content Formats (Video/PDF)',
     'Multi-modal models ingest transcripts and PDFs. Repurpose your best text content into whitepapers (PDF) and YouTube videos with clear transcripts.',
     'Content', 'OnPage', 7, 8, ARRAY['multi-modal','repurposing'], NOW()),

    (gen_random_uuid()::text, 'geo_12',
     'Optimize Core Web Vitals for Crawl Budget',
     'While primarily a ranking factor, faster sites are crawled more efficiently. Ensure your LCP and CLS are green to maximize the indexation of your deep content.',
     'UX', 'OnPage', 5, 6, ARRAY['performance','cwv'], NOW()),

    (gen_random_uuid()::text, 'geo_13',
     'Create "Versus" Comparison Pages',
     'Own the narrative in direct comparisons. Create "Us vs Them" pages that fairly highlight your strengths compared to specific competitors.',
     'Brand', 'OnPage', 8, 5, ARRAY['competitor-analysis','bottom-funnel'], NOW()),

    (gen_random_uuid()::text, 'geo_14',
     'Refresh "Stale" High-Traffic Content',
     'Data from >2 years ago is often de-weighted. Update your top-performing legacy content with current year statistics and examples.',
     'Content', 'OnPage', 8, 4, ARRAY['content-refresh','freshness'], NOW()),

    (gen_random_uuid()::text, 'geo_15',
     'Gain Links from ".edu" or ".gov" Sites',
     'These top-level domains pass immense trust. Sponsor academic research or government programs to earn these highly authoritative sources.',
     'Authority', 'OffPage', 10, 9, ARRAY['link-building','trust-flow'], NOW()),

    (gen_random_uuid()::text, 'geo_16',
     'Implement "Speakable" Schema',
     'For news or blog content, add Speakable schema to indicate sections suitable for text-to-speech, optimizing for voice search and assistants.',
     'Technical', 'OnPage', 4, 3, ARRAY['schema','voice-search'], NOW()),

    (gen_random_uuid()::text, 'geo_17',
     'Define Unique Proprietary Terms',
     'Coin a term for a methodology you use (e.g., "The Skyscraper Technique"). If you become the entity associated with a concept, you dominate its discussion.',
     'Brand', 'OnPage', 9, 7, ARRAY['branding','thought-leadership'], NOW()),

    (gen_random_uuid()::text, 'geo_18',
     'Ensure Mobile Parity',
     'Verify that all content available on desktop is also available (and visible) on mobile. Mobile-first indexing means hidden mobile content might disappear from the model''s view.',
     'UX', 'OnPage', 7, 5, ARRAY['mobile-seo','indexation'], NOW()),

    (gen_random_uuid()::text, 'geo_19',
     'Humanize Content with Personal Stories',
     'AI detectors flag generic content. Infuse articles with "I" statements, personal anecdotes, and unique real-world examples that an AI couldn''t hallucinate.',
     'Content', 'OnPage', 6, 6, ARRAY['human-touch','authenticity'], NOW()),

    (gen_random_uuid()::text, 'geo_20',
     'Optimize Image Alt Text for Context',
     'Alt text isn''t just for accessibility; it provides semantic context to the surrounding text. Use descriptive, entity-rich alt text for all major images.',
     'Technical', 'OnPage', 4, 2, ARRAY['image-seo','accessibility'], NOW());

-- 3. Seed 10 new Off-Page tactics (geo_21..geo_30) to rebalance the library
--    closer to the target ~50/40/10 split. Drafted; expect content review.
INSERT INTO "AeoPlaybookItem"
    ("id", "slug", "title", "description", "category", "channel", "defaultImpact", "defaultEffort", "tags", "updatedAt")
VALUES
    (gen_random_uuid()::text, 'geo_21',
     'Earn Placements in Editorial "Best Of" Lists',
     'Pitch trade publications and review sites (G2, Capterra, TechCrunch listicles). LLMs heavily index "best X for Y" articles when answering comparison queries — being on those lists puts you in the answer set by default.',
     'Authority', 'OffPage', 9, 7, ARRAY['pr','listicles','comparison'], NOW()),

    (gen_random_uuid()::text, 'geo_22',
     'Get Cited in Analyst Reports (Gartner, Forrester, IDC)',
     'Pursue mentions in tier-1 analyst coverage. These are gold-standard authority sources for B2B LLM corpora — a single Gartner mention shifts how generative engines describe your category position.',
     'Authority', 'OffPage', 10, 9, ARRAY['analyst-relations','b2b','authority'], NOW()),

    (gen_random_uuid()::text, 'geo_23',
     'Secure Podcast Guest Appearances',
     'Book founder/exec interviews on top industry podcasts. Transcripts are increasingly indexed by LLMs; sustained presence over 6+ months shapes how your brand gets framed in generative answers.',
     'Brand', 'OffPage', 7, 6, ARRAY['podcast','thought-leadership','transcripts'], NOW()),

    (gen_random_uuid()::text, 'geo_24',
     'Drive Reviews on G2, Capterra, and TrustRadius',
     'Review platforms feed both Google''s AI Overview and ChatGPT''s product comparison answers. Run targeted ask campaigns to recent power users — review volume and recency both matter.',
     'Brand', 'OffPage', 8, 4, ARRAY['reviews','social-proof','comparison'], NOW()),

    (gen_random_uuid()::text, 'geo_25',
     'Build a Wikipedia Article (Where Notable)',
     'Wikipedia is among the highest-weighted sources in most LLM training pipelines. Notability requirements are real — pursue only if you have ≥3 independent, reliable secondary sources to cite. Use a disclosed COI editor or a service that does.',
     'Authority', 'OffPage', 9, 8, ARRAY['wikipedia','knowledge-graph','authority'], NOW()),

    (gen_random_uuid()::text, 'geo_26',
     'Pitch Original Research to Trade Press',
     'Run an industry survey or analyze your own platform data, then package as a press release with embargo. "According to a recent study by Brand X..." is a citation pattern LLMs reproduce verbatim.',
     'Authority', 'OffPage', 8, 7, ARRAY['pr','data-journalism','original-research'], NOW()),

    (gen_random_uuid()::text, 'geo_27',
     'Get Founders Quoted in Tier-1 Publications',
     'Use HARO, Qwoted, Featured.com, or direct journalist outreach. One TechCrunch quote with "said the founder of Brand X" outperforms ten guest blog posts for entity association in LLM responses.',
     'Authority', 'OffPage', 8, 6, ARRAY['pr','founder-brand','citations'], NOW()),

    (gen_random_uuid()::text, 'geo_28',
     'Sustain LinkedIn Thought Leadership Cadence',
     'Founder + 2-3 key execs publish weekly long-form posts. LinkedIn is well-indexed and increasingly cited by LLMs answering "who is the leader in X" or "experts on Y" queries.',
     'Brand', 'OffPage', 6, 5, ARRAY['linkedin','founder-brand','social'], NOW()),

    (gen_random_uuid()::text, 'geo_29',
     'Run a Transparent Reddit / Quora Answer Program',
     'Set up real, disclosed staff accounts that answer questions in relevant subreddits and Quora topics with substantive content (not promotional). ChatGPT and Perplexity cite Reddit heavily for product and comparison queries — earning that surface is worth the effort.',
     'Brand', 'OffPage', 8, 7, ARRAY['reddit','quora','community','citations'], NOW()),

    (gen_random_uuid()::text, 'geo_30',
     'Get Listed in Vertical-Specific Software Directories',
     'Beyond G2/Capterra, find niche directories your buyers actually use ("best Shopify apps", "AI tools for marketers", "open-source SaaS"). LLMs frequently cite these vertical lists for "tools for [industry]" queries.',
     'Authority', 'OffPage', 6, 3, ARRAY['directories','vertical-seo','listings'], NOW());

-- 4. Add FK EntitySuggestion.tacticId → AeoPlaybookItem.slug (SetNull on delete)
ALTER TABLE "EntitySuggestion"
    ADD CONSTRAINT "EntitySuggestion_tacticId_fkey"
    FOREIGN KEY ("tacticId")
    REFERENCES "AeoPlaybookItem"("slug")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- 5. Rename the internal task model from 'geo_tactics' to 'aeo_tactics'.
--    The PK is taskKey, so we update the row and any consumers must read the
--    new key. internal-models.ts and the admin UI are updated in the same PR.
UPDATE "InternalTaskModel" SET "taskKey" = 'aeo_tactics' WHERE "taskKey" = 'geo_tactics';
