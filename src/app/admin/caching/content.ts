export const cachingDocsMarkdown = `
# Spectacl Caching Architecture & Scalability Guide

This document outlines the current caching layers utilized in the Spectacl platform, what data is cached, what data is computed live, and strategies for scaling the infrastructure as the user base expands.

---

## 1. Current Caching Architecture (The 3 Tiers)

Spectacl primarily relies on a hybrid approach of **Database-Level Materialization** and **Next.js Data Cache** to balance heavy analytics with real-time requirements.

### Tier 1: Materialized Entity Metrics (\`MetricSnapshot\` Table)
Instead of forcing PostgreSQL to run complex \`GROUP BY\` and \`COUNT\` queries across millions of rows every time a user visits the dashboard, these heavy calculations are processed periodically and stored.
* **What is cached:** Entity-level and Competitor-level visibility, share of voice, and average positions over specific timeframes (e.g., 7-day, 30-day).
* **Where it lives:** The \`MetricSnapshot\` table in PostgreSQL.
* **Update Trigger:** Handled by the background worker (\`updateEntityMetrics()\`) which executes automatically after an LLM analysis run completes, or when a manual metric refresh is forced.

### Tier 2: Instant Prompt Snapshots (Denormalization)
For granular prompt-level analytics, we denormalize the latest metrics directly onto the \`Prompt\` record.
* **What is cached:** The latest mention rate, average position, and share of voice for individual prompts (\`lastMentionRate\`, \`lastAvgPosition\`, etc.).
* **Where it lives:** Native columns inside the \`Prompt\` table.
* **Update Trigger:** Runs instantly via \`updatePromptMetrics()\` after an analysis finishes processing and hits the \`success\` state.

### Tier 3: Next.js Data Cache (\`unstable_cache\`)
We leverage the Next.js \`unstable_cache\` to serve pre-rendered query responses for data that doesn't change by the minute but requires fast Time-to-First-Byte (TTFB).
* **What is cached:** Visibility histories (\`getEntityVisibilityHistory\`, \`getCompetitorVisibilityHistory\`) and prompt lists grouped with their metrics (\`getPromptsWithMetrics\`).
* **Invalidation Strategy:** We use tag-based invalidation via \`revalidateTag\` (e.g., \`entity-[id]-metrics\`, \`prompt-[id]-history\`). The internal API route (\`/api/internal/revalidate/route.ts\`) enables background workers to instantly invalidate these caches after generating new analysis results. It also performs **proactive cache warming** (\`getCachedPrompt(promptId)\`) so the next user hit is instant.

---

## 2. What is NOT Cached (Live Computation)

To support complete flexibility for users diving into specific subsets of data, certain queries bypass the cache entirely:

* **Filtered Analytics (Dynamic Metrics):** If a user applies filters on the Overview page (e.g., selecting specific *Models*, *Tags*, or *Intents*), the system bypasses \`MetricSnapshot\` and falls back to \`getDynamicMetrics()\`. This hits the \`AnalysisResult\` and \`AnalysisMention\` tables directly for live aggregations.
* **Custom Rankings:** Dedicated Ranking prompts are evaluated directly on load without standard materialized snapshot pipelines, keeping them completely separated from general overview metrics.
* **Admin Pages & Usage Stats:** Live data for administrative overviews and workspace member counts are queried strictly in real-time to avoid displaying stale sensitive limits.

---

## 3. Road to Scalability (Future Improvements)

The current architecture is solid for the present but will encounter bottlenecks as the app scales beyond thousands of concurrent users and millions of tracked prompts. Here is the operational roadmap for scaling Spectacl.

### Database Constraints (When Live Aggregations Fail)
As \`AnalysisResult\` and \`AnalysisMention\` scale past tens of millions of rows, PostgreSQL will struggle to perform live \`GROUP BY\` aggregations during dynamic filtered queries (the "What is NOT Cached" section).
> **Solution:** Introduce an OLAP (Online Analytical Processing) component. When the current DB CPU usage regularly spikes beyond 70%, migrate the heavy analytics load to **ClickHouse** or **TimescaleDB**. PostgreSQL should only handle typical CRUD state (Users, Spaces, Workspaces), while the analytical database ingests the raw LLM responses and handles the lightning-fast dynamic filtering.

### Caching Enhancements (Redis)
Currently, BullMQ uses Redis purely for job queuing. As traffic accelerates:
1. Add a caching layer using Redis explicitly for storing the result of multi-variable filtered dynamic queries. If two users request the same timeframe/model combinations, the second request should hit Redis, bypassing the heavy Postgres queries completely.

### The Problem of Spiky Traffic (BullMQ Workers)
Analysis jobs inherently cause large traffic spikes depending on batch prompt schedules (e.g., 500 prompts firing at midnight).
> **Solution:** Decouple the Next.js Web Server from the BullMQ Background Workers. Currently, running \`npm run dev\` kicks them off interchangeably. In production, these should be separated into unique Docker containers. 

---

## 4. Infrastructure Scaling Milestones

We strongly recommend an incremental scaling strategy to prevent over-engineering early.

#### Stage 1: MVP to PMF (0 - 500 Users)
* **Infrastructure:** Single robust VPS node (e.g., Coolify on Hetzner with 16 Cores, 64GB RAM, NVMe).
* **Architecture:** Next.js (Web), PostgreSQL (DB), Redis (Queues), and BullMQ (Worker) all live on the same machine.
* *At this stage, vertical scaling (buying a bigger Hetzner server) is vastly cheaper and easier to manage than horizontal scaling.*

#### Stage 2: Growth (500 - 5,000 Users)
**Trigger to Upgrade:** Background jobs start missing their cron windows. Your queues frequently back up, or PostgreSQL connections exhaust the primary Node pool.
* **Separation of Concerns:** 
  1. Move PostgreSQL to a managed database service (e.g., AWS RDS, Supabase, Neon) for automated backups and read-replicas.
  2. Separate the Background Workers into stateless Docker containers distinct from the Web servers.
  3. Introduce Auto-scaling specifically for the Workers based on the BullMQ queue depth (e.g., if queue > 1000 items, spin up 5 new worker nodes).

#### Stage 3: Enterprise (5,000+ Users & Millions of Analysis Runs)
**Trigger to Upgrade:** Dynamic metric filters take >5 seconds to load. You need to route heterogeneous jobs (e.g., different types of proxy servers, BYOK infrastructure compliance checks).
* **Introduction of Kubernetes (K8s) & ClickHouse:** 
  * Only adopt Kubernetes when your engineering team scales (>5 engineers) and you require complex, custom auto-scaling rules across regions.
  * Move all analytical aggregation to ClickHouse.
  * Distribute Web Nodes globally on Vercel/Cloudflare, pointing back to your distributed managed data centers.

### Summary for Senior Devs Checking In
- Trust the \`getLatestMetrics()\` for heavy top-level overviews.
- Avoid modifying \`getDynamicMetrics()\` unless you add the exact same logic into the background snapshot workers.
- Watch the \`MetricSnapshot\` sizes. You might eventually want a cron job to prune daily snapshot records older than 90 days, retaining only weekly/monthly rollups.
`;
