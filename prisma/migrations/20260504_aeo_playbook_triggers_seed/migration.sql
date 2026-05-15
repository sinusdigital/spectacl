-- Phase 3 step 2: seed initial triggers on the 10 most engine-friendly playbook items.
-- Triggers live in AeoPlaybookItem.triggers (JSONB, added in Phase 2 with default '[]').
-- Phase 3 step 1 evaluator (src/lib/aeo/triggers.ts) understands three kinds:
--   metric_threshold | missing_source_type | worse_than_competitor_avg
-- Domain type names match the platform-domains seed (Reviews & ratings, Social & community, etc.).
--
-- Other playbook items keep triggers='[]'; the engine will fall back to a baseline
-- weight for those (handled in step 3 / engine.ts).

UPDATE "AeoPlaybookItem" SET triggers = '[
    {"kind":"worse_than_competitor_avg","metric":"visibility","minDelta":0.15,"weight":2}
]'::jsonb WHERE slug = 'geo_4';

UPDATE "AeoPlaybookItem" SET triggers = '[
    {"kind":"missing_source_type","typeName":"Social & community","weight":2}
]'::jsonb WHERE slug = 'geo_5';

UPDATE "AeoPlaybookItem" SET triggers = '[
    {"kind":"worse_than_competitor_avg","metric":"shareOfVoice","minDelta":0.1,"weight":1.5}
]'::jsonb WHERE slug = 'geo_13';

UPDATE "AeoPlaybookItem" SET triggers = '[
    {"kind":"missing_source_type","typeName":"Government & institutional","weight":1.5}
]'::jsonb WHERE slug = 'geo_15';

UPDATE "AeoPlaybookItem" SET triggers = '[
    {"kind":"metric_threshold","metric":"shareOfVoice","op":"lt","value":0.15,"weight":1.5}
]'::jsonb WHERE slug = 'geo_17';

UPDATE "AeoPlaybookItem" SET triggers = '[
    {"kind":"missing_source_type","typeName":"Reviews & ratings","weight":2}
]'::jsonb WHERE slug = 'geo_21';

UPDATE "AeoPlaybookItem" SET triggers = '[
    {"kind":"worse_than_competitor_avg","metric":"shareOfVoice","minDelta":0.2,"weight":3}
]'::jsonb WHERE slug = 'geo_22';

UPDATE "AeoPlaybookItem" SET triggers = '[
    {"kind":"missing_source_type","typeName":"Reviews & ratings","weight":2}
]'::jsonb WHERE slug = 'geo_24';

-- Wikipedia: compound — fires either when no encyclopedic source mentions OR low visibility overall.
UPDATE "AeoPlaybookItem" SET triggers = '[
    {"kind":"missing_source_type","typeName":"Reference & encyclopedic","weight":2.5},
    {"kind":"metric_threshold","metric":"visibility","op":"lt","value":0.4,"weight":1}
]'::jsonb WHERE slug = 'geo_25';

UPDATE "AeoPlaybookItem" SET triggers = '[
    {"kind":"missing_source_type","typeName":"Social & community","weight":2}
]'::jsonb WHERE slug = 'geo_29';
