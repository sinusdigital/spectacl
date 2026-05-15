export const performanceMarkdown = `
# Database Query Performance & Optimization Roadmap

This page documents known query optimization opportunities, their current state, and when they should be implemented. These are shelved optimizations — the current Prisma-based approach works fine at current scale.

---

## Why Raw SQL vs Prisma?

Before diving into specific optimizations, it's important to understand when raw SQL is justified:

- **Prisma limitation** — Prisma genuinely can't express certain queries (e.g., \`GROUP BY DATE()\`, \`CASE WHEN\` aggregation). \`history.ts\` uses raw SQL for this reason.
- **Performance choice** — Prisma *can* express each query individually, but can't merge multiple queries into one. The \`getDynamicMetrics\` optimization falls into this category — every query is valid Prisma, but combining them requires raw SQL.

**Rule of thumb:** Stay in Prisma unless you can't express the query OR the performance gain is measurable and significant.

---

## 1. getDynamicMetrics — Query Consolidation

**Priority:** HIGH | **Status:** Shelved | **When:** Before 500+ users or dashboard latency > 500ms

**File:** \`src/lib/metrics/dynamic.ts\` (lines 94–141)

### Current State

12 Prisma queries inside a \`$transaction\` — 6 for the current period, 6 for the previous period:

| # | Query | Purpose |
|---|-------|---------|
| 1 | \`analysisResult.count()\` | Total results (current) |
| 2 | \`analysisResult.count({ mentioned: true })\` | Mention count (current) |
| 3 | \`analysisMention.count()\` | Total market mentions (current) |
| 4 | \`analysisMention.count({ isPrimaryEntity: true })\` | Entity mentions (current) |
| 5 | \`analysisResult.aggregate({ _avg: position })\` | Avg position (current) |
| 6 | \`analysisMention.groupBy(['competitorId'])\` | Competitor stats (current) |
| 7–12 | Same 6 queries | Previous period |

Plus 1 \`competitor.findMany\` = **13 queries total**.

The \`$transaction\` ensures consistency and batches them in one round-trip, but the DB still executes 12 separate SQL statements scanning the same tables repeatedly.

### Proposed Optimization

Consolidate to **2 raw SQL queries + 1 Prisma call** (competitor list):

**Query 1 — Entity stats (both periods in one pass):**
\`\`\`sql
SELECT
  CASE WHEN ar."createdAt" >= $startDate THEN 'current' ELSE 'prev' END AS period,
  COUNT(*)::int AS total,
  SUM(CASE WHEN ar."mentioned" = true THEN 1 ELSE 0 END)::int AS mentioned,
  AVG(CASE WHEN ar."position" > 0 THEN ar."position" ELSE NULL END)::float AS avg_position
FROM "AnalysisResult" ar
JOIN "Prompt" p ON ar."promptId" = p."id"
WHERE p."entityId" = $entityId
  AND ar."status" = 'success'
  AND ar."createdAt" >= $prevStartDate
GROUP BY 1
\`\`\`

**Query 2 — Mention stats (both periods, grouped by competitor):**
\`\`\`sql
SELECT
  CASE WHEN ar."createdAt" >= $startDate THEN 'current' ELSE 'prev' END AS period,
  am."competitorId",
  COUNT(*)::int AS mention_count,
  AVG(CASE WHEN am."position" > 0 THEN am."position" ELSE NULL END)::float AS avg_position,
  SUM(CASE WHEN am."isPrimaryEntity" = true THEN 1 ELSE 0 END)::int AS primary_mentions
FROM "AnalysisMention" am
JOIN "AnalysisResult" ar ON am."analysisResultId" = ar."id"
JOIN "Prompt" p ON ar."promptId" = p."id"
WHERE p."entityId" = $entityId
  AND ar."status" = 'success'
  AND ar."createdAt" >= $prevStartDate
GROUP BY 1, 2
\`\`\`

### Implementation Notes

- Reuse \`buildSqlConditions()\` from \`src/lib/metrics/queryHelpers.ts\` for filter parameterization
- Use \`$queryRaw\` (tagged template literal) — **not** \`$queryRawUnsafe\` — to prevent SQL injection
- The \`autoresearch\` branch had a working implementation but used unsafe string interpolation
- Return type stays identical — no downstream changes needed

### Impact

| Metric | Before | After |
|--------|--------|-------|
| DB statements | 13 | 3 |
| Table scans (AnalysisResult) | 5 | 1 |
| Table scans (AnalysisMention) | 4 | 1 |

### Trade-offs

- **Loses Prisma type safety** — schema changes won't propagate to raw SQL
- **Maintenance:** Two filter implementations (Prisma WHERE in \`buildAnalysisResultWhere\` + raw SQL in \`buildSqlConditions\`)
- **At current scale:** The 12-query transaction is fast enough. Optimize when latency is measurable.

---

## 2. snapshots.ts — Sequential Queries per Snapshot

**Priority:** MEDIUM | **Status:** Shelved | **When:** Alongside getDynamicMetrics optimization

**File:** \`src/lib/metrics/snapshots.ts\` (lines 40–98)

### Current State

\`calculateAndSaveSnapshot()\` runs 4–5 sequential Prisma queries per call:
1. \`analysisResult.count()\` — total count
2. \`analysisResult.count({ mentioned: true })\` or \`analysisMention.count()\` — mention count
3. \`analysisResult.aggregate()\` or \`analysisMention.aggregate()\` — position
4. \`analysisMention.count()\` — total market mentions
5. \`analysisMention.count({ isPrimaryEntity: true })\` — entity mentions (entity type only)

\`updateEntityMetrics()\` calls this function: 2× for entity (standard + extended) + 2× per competitor. With 2 competitors, that's **6 calls × 4-5 queries = 24-30 DB queries** per entity update.

### Proposed Optimization

Batch the queries within each \`calculateAndSaveSnapshot\` call into a \`$transaction\` array. This is a pure Prisma optimization — no raw SQL needed. The queries are independent and can run in parallel within a transaction.

### Impact

Reduces round-trips per entity update from ~30 to ~6 (one transaction per snapshot call).

---

## 3. Other Candidates

| File | Issue | Current | Optimized | Priority |
|------|-------|---------|-----------|----------|
| \`scheduler-job.ts:43\` | Space lookup inside \`Promise.all\` loop | N queries | 1 batch fetch | MEDIUM |
| \`promptMetrics.ts:17-63\` | 5 sequential queries for prompt metrics | 5 | 2-3 (transaction) | MEDIUM |
| \`sourceStats.ts:61-112\` | N+1 loop: fetch results per prompt | N+1 | 1 query + in-memory group | MEDIUM |
| \`dynamic.ts:29-51\` (getLatestMetrics) | 2 sequential snapshot queries | 2 | 1 transaction | LOW |

---

## Decision Log

| Date | Decision | Reason |
|------|----------|--------|
| 2026-03-27 | Shelved getDynamicMetrics raw SQL optimization | Current scale doesn't warrant raw SQL maintenance burden |
| 2026-03-27 | Documented all optimization candidates | Actionable reference for when scale demands it |

---

## When to Revisit

- Dashboard page load exceeds 500ms consistently
- Worker metric snapshot writes become a bottleneck (visible in BullMQ queue backlog)
- User count approaches 500+ with active dashboard usage
- Any of the listed files show up in slow query logs
`;
