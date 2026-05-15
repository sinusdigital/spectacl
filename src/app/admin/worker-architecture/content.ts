export const workerArchitectureMarkdown = `
# Worker Architecture & Scaling Plan

This document describes how Spectacl's background analysis workers are designed, the current implementation status, and the phased roadmap for scaling to production.

---

## Current Architecture

### Job Lifecycle

1. **Scheduler Tick** runs every 6 hours (\`0 0,6,12,18 * * *\`)
2. \`processDuePrompts()\` queries all prompts where \`nextRunAt <= now\`
3. For each prompt, \`createPendingAnalysisRecords()\` creates one \`AnalysisResult\` per enabled model (status: \`pending\`)
4. A single BullMQ job is enqueued: \`{ promptId, resultIds[] }\`
5. The worker calls \`executeAnalysisJob()\` which processes all models in parallel
6. After completion, \`updateEntityMetrics()\` writes \`MetricSnapshot\` rows and \`updatePromptMetrics()\` updates prompt-level stats

### Queue Setup

| Queue | Purpose | Concurrency |
|-------|---------|-------------|
| \`analysis-queue\` | LLM analysis jobs + scheduler tick | 25 |
| \`snapshot-queue\` | Monthly citation snapshots | 1 |
| \`credit-reset-queue\` | Daily credit resets | 1 |

### Priority Lanes (Fast Lane)

Jobs are processed by priority — lower number = higher priority. When a user creates a new prompt or triggers a manual analysis, that job jumps ahead of the scheduled batch.

| Priority | Label | Used For |
|----------|-------|----------|
| 1 | Fast lane | New prompts, manual triggers, onboarding |
| 5 | Medium | Competitor rescans |
| 10 | Batch | Scheduled analysis (6-hour cron) |

This ensures user-initiated requests always get sub-minute queue wait times, even when 1000s of batch jobs are queued. BullMQ processes priority 1 jobs first, then 5, then 10.

**Where priority is set:**
- \`src/app/api/entities/[entityId]/prompts/route.ts\` — POST with \`triggerAnalysis\` → priority 1
- \`src/app/api/prompts/[id]/route.ts\` — PUT with \`triggerAnalysis\` → priority 1
- \`src/app/api/entities/[entityId]/competitors/route.ts\` — rescan → priority 5
- \`src/app/api/competitors/[id]/route.ts\` — rescan → priority 5
- \`src/lib/scheduler-job.ts\` — batch scheduling → priority 10

### Admin Dashboard

The Workers page (\`/admin/workers\`) includes a real-time queue dashboard that polls every 5 seconds showing:
- Queue depth (waiting, active, completed, failed)
- Average wait time (queue → worker pickup)
- Average processing time (worker pickup → completion)
- Active jobs with priority labels and elapsed time
- Recent completed jobs with timing breakdown
- Recent failures with error reasons

**API endpoint:** \`GET /api/admin/queue-stats\` (admin-only)

### Rate Limiting (Phase 1 — Implemented)

LLM API calls are rate-limited per provider using **Bottleneck** with Redis-backed distributed state. This prevents API bans when running large batches.

| Provider | Max Concurrent | Min Interval | Effective RPM |
|----------|---------------|--------------|---------------|
| OpenAI | 10 | 150ms | ~400 |
| Anthropic | 5 | 300ms | ~200 |
| Google | 8 | 200ms | ~300 |
| Mistral | 5 | 300ms | ~200 |

Rate limits are enforced inside \`executeAnalysisJob()\` by wrapping the \`provider.generate()\` call in a Bottleneck scheduler. The limiter uses the same Redis instance as BullMQ, so limits are shared across all worker processes.

**Key file:** \`src/lib/queue/rateLimiter.ts\`

### MetricSnapshot Fallback

The dashboard API (\`/api/entities/[entityId]/metrics\`) first tries \`getLatestMetrics()\` (fast snapshot lookup). If no snapshot exists (e.g., right after onboarding before the background job writes one), it falls back to \`getDynamicMetrics()\` which calculates live from \`AnalysisResult\` rows.

---

## Production Scale Projections

### Load Profile at 1,000 Users

\`\`\`
1,000 users × 1 space × 2 entities × 40 prompts = 80,000 prompts
× 3 models per prompt = 240,000 LLM API calls per batch
= 80,000 BullMQ jobs
\`\`\`

### Processing Time Estimates

With Phase 1 rate limiting (per-provider RPM caps):

| Provider | Calls | RPM Limit | Time |
|----------|-------|-----------|------|
| OpenAI | ~80K | 400 | ~200 min |
| Anthropic | ~80K | 200 | ~400 min |
| Google | ~80K | 300 | ~267 min |

All three providers process in parallel (separate Bottleneck instances). Bottleneck = Anthropic at ~6.7 hours. This fits within a daily scheduling window, but is tight. Higher tier API plans would increase RPM limits significantly.

### Key Bottlenecks by Phase

| Bottleneck | Severity at 1K Users | Phase |
|------------|---------------------|-------|
| LLM API rate limits | **Critical** — instant bans without throttling | Phase 1 ✅ |
| Redundant MetricSnapshot recalculations | High — 80K calls for 2K entities (40× waste) | Phase 2 |
| Scheduler enqueue spike | Medium — 80K \`Promise.all()\` at once | Phase 3 |
| Horizontal worker scaling | Low — needed at 5K+ users | Phase 3 |

---

## Phased Roadmap

### Phase 1: Provider Rate Limiting ✅ IMPLEMENTED
**When:** Before 50 users
**What:** Per-provider Bottleneck rate limiters with Redis-backed distributed state. Worker concurrency increased from 5 to 25.
**Files:**
- \`src/lib/queue/rateLimiter.ts\` — Bottleneck instances per provider
- \`src/lib/analysis.ts\` — LLM calls wrapped in rate limiter
- \`src/lib/queue/analysisWorker.ts\` — Concurrency set to 25

### Phase 2: Snapshot Deduplication 🔲 PLANNED
**When:** Before 200 users
**What:** Redis counter pattern — track remaining jobs per entity, only recalculate MetricSnapshot when the last job for an entity completes.
**Impact:** Reduces snapshot calculations from 80K to 2K (40× improvement).
**Approach:**
\`\`\`
Scheduler sets: Redis key "entity-jobs:{entityId}" = job count
Each job completion: DECR the key
When key reaches 0: run updateEntityMetrics(), delete key
\`\`\`

### Phase 3: Staggered Scheduling + Horizontal Scaling 🔲 PLANNED
**When:** Before 500 users
**What:**
1. Paginated scheduler — process due prompts in batches of 100 instead of \`Promise.all()\` on 80K
2. Optional: spread jobs across the scheduling window with random delays
3. Support for multiple worker processes (already possible with Redis-backed Bottleneck)

---

## Key Files Reference

| File | Purpose |
|------|---------|
| \`src/lib/queue/analysisQueue.ts\` | BullMQ queue definition |
| \`src/lib/queue/analysisWorker.ts\` | Worker process handler |
| \`src/lib/queue/rateLimiter.ts\` | Per-provider rate limiters |
| \`src/lib/analysis.ts\` | Core analysis logic (job execution) |
| \`src/lib/scheduler-job.ts\` | Scheduler tick — enqueues due prompts |
| \`src/lib/metrics/snapshots.ts\` | MetricSnapshot calculation + persistence |
| \`src/lib/metrics/dynamic.ts\` | Live metrics calculation (fallback) |
| \`src/workers/start-worker.ts\` | Worker entry point + cron registration |

## LLM Response Time Reference

| Provider | Typical | Worst Case |
|----------|---------|------------|
| GPT-4o | 5–15s | 30s |
| GPT-4 | 10–30s | 60s |
| Claude 3.5 Sonnet | 5–15s | 25s |
| Claude 3 Opus | 15–45s | 90s |
| Gemini 1.5 Pro | 3–12s | 20s |
`;
