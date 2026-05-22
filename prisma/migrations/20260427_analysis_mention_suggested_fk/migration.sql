-- Add nullable FK from AnalysisMention to SuggestedCompetitor so brand-extraction
-- output can be persisted at per-result granularity (instead of only entity-level).

ALTER TABLE "AnalysisMention" ADD COLUMN "suggestedCompetitorId" TEXT;

CREATE INDEX "AnalysisMention_suggestedCompetitorId_idx"
  ON "AnalysisMention"("suggestedCompetitorId");

ALTER TABLE "AnalysisMention"
  ADD CONSTRAINT "AnalysisMention_suggestedCompetitorId_fkey"
  FOREIGN KEY ("suggestedCompetitorId")
  REFERENCES "SuggestedCompetitor"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
