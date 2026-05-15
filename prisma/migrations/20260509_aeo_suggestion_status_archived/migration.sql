-- PR 2: extend AeoSuggestionStatus with "Archived" so users can manually clear
-- Done items out of the active board without losing the data. Archived rows are
-- hidden from board + backlog + dismissed sections by default; reachable via
-- "Show archived" filter on the Dismissed accordion.

ALTER TYPE "AeoSuggestionStatus" ADD VALUE 'Archived';
