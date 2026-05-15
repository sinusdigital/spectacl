# Spectacl - AI Visibility Tracker

## Overview

SaaS platform that tracks how brands appear in AI-powered search results (ChatGPT, Claude, Perplexity, etc.). Users create **Entities** (brands), add **Competitors**, configure **Prompts** (questions to ask LLMs), and analyze the results.

## Self-Maintenance Rule

> [!IMPORTANT]
> **Keep this file current!** After every major change, update this `claude.md` to reflect the current state.

> [!CAUTION]
> **Update BOTH files!** When you make architectural changes, update **both `claude.md` AND `gemini.md`** to keep them in sync. If one AI agent updates only one file, the other agent won't know about the changes.

**When to update:**

- New database models or schema changes
- New pages, routes, or API endpoints
- Architectural shifts (e.g., entity-level → space-level configuration)
- New patterns, conventions, or gotchas discovered
- Changes to deployment, build process, or environment variables
- New components or significant refactors

**What to update:**

- Add new models to the **Core Data Models** table
- Add new enums to the **Key Enums** section
- Update **Project Structure** if new directories are added
- Document new patterns in **Patterns & Conventions**
- Update **Common Tasks** with new workflows
- Reflect changes in **Tech Stack** or **Key Commands**

**Goal:** Keep both files as the **single source of truth** for AI assistants working on this project.

## Tech Stack

- **Framework**: Next.js 16.1.6 (App Router) + React 19
- **Styling**: @radix-ui/themes + Tailwind CSS v4
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: better-auth
- **Queue**: BullMQ + Redis (background analysis jobs)
- **Payments**: Mollie (partially integrated, not fully tested in prod)
- **Email**: Resend + React Email (`@react-email/components`), domain: `mail.spectacl.org`
- **Error Tracking**: Sentry Cloud (free tier, `@sentry/nextjs` v10) — browser + server + edge. Tunnel at `/monitoring`.
- **Testing**: Vitest 2.1.9 + @vitest/coverage-v8
- **CI**: GitHub Actions (runs on push to main/production + PRs)
- **Git Hooks**: Husky + lint-staged (eslint + vitest related on pre-commit)
- **Deployment**: Docker/Coolify on Hetzner VPS

## Infrastructure

- **Server**: Hetzner CX33 (4 vCPU, 8 GB RAM, 40 GB disk, 20 TB traffic) — single server runs everything
- **Services on CX33**: Coolify, Next.js app, background worker, PostgreSQL, Redis — all on one box
- **Environments**:
  - `dev.spectacl.org` — auto-deploys on push to `main` branch
  - `app.spectacl.org` — deploys on push to `production` branch (currently waitlisted)
- **Branch strategy**: `main` → dev, `production` → prod (cherry-pick/merge from main)
- **Redis persistence**: Dev `docker-compose.yml` enables AOF (`appendonly yes`, `appendfsync everysec`) + RDB snapshots via `command:` override. **Prod (Coolify) requires the same config in the Redis service settings** — without it, BullMQ jobs and rate-limit counters are lost on restart.
- **DB connection pooling**: `.env.example` sets `?connection_limit=25&pool_timeout=10` on `DATABASE_URL`. Worker runs 25 concurrent jobs but Prisma defaults to `num_cpus*2+1` (9 on CX33), so without this the pool exhausts under load. **Prod also needs this appended to `DATABASE_URL` in Coolify.**
- **Production blockers**: Mollie payments not fully tested
- **No staging/preview** environment — just dev + prod

## Key Commands

```bash
npm run dev          # Starts Next.js + background worker concurrently
npm run build        # Prisma generate + migrate + Next.js build + worker build
npm run worker       # Background analysis worker only
npm test             # Run all tests (single run)
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
npx prisma studio    # Database GUI
```

## Project Structure

```
src/
├── app/                 # Next.js App Router
│   ├── [entityId]/      # Entity-specific pages (overview, prompts, competitors, settings)
│   ├── admin/           # Admin dashboard, roadmap, settings
│   ├── api/             # API routes
│   ├── entities/        # Entity list page
│   ├── onboarding/      # New user onboarding flow
│   ├── login/, signup/  # Auth pages
│   └── spaces/          # Workspace management
├── components/
│   ├── Sidebar/         # Collapsible sidebar with entity selector
│   ├── Charts/          # Recharts-based visualizations
│   ├── Prompts/         # Prompt management UI
│   ├── Competitors/     # Competitor management
│   ├── Suggestions/     # AI-suggested prompts/competitors
│   └── Shared/          # Reusable components (EntityBadge, etc.)
├── emails/
│   ├── components/
│   │   └── layout.tsx   # Shared email layout (header, footer, Radix Colors, helpers)
│   ├── verification-email.tsx
│   ├── password-reset-email.tsx
│   ├── invitation-email.tsx
│   ├── cancellation-email.tsx
│   └── index.ts         # Barrel exports
├── lib/
│   ├── analysis.ts      # Core analysis logic
│   ├── metrics.ts       # Visibility/sentiment/position calculations
│   ├── email.ts         # Resend client singleton
│   ├── send-email.ts    # renderEmail(Component, props) helper
│   ├── mode.ts          # Deployment mode helpers (isCloud, isSelfHosted, checkModeConsistency)
│   ├── cache.ts         # Redis-backed cache (fail-open, TTL, invalidation)
│   ├── internal-models.ts # Platform-internal task models (ranking, brand extraction, etc.)
│   ├── rate-limit.ts    # Redis fixed-window rate limiting for auth endpoints
│   ├── llm/             # LLM provider integrations
│   │   └── retry.ts     # withLLMRetry — exponential backoff for 429/503
│   ├── queue/           # BullMQ queue + worker setup
│   └── prisma.ts        # Prisma client singleton
├── test/
│   └── mocks/
│       └── prisma.ts    # Shared Prisma mock for unit tests
├── workers/             # Background job processors
└── types/               # TypeScript type definitions
```

## Core Data Models

| Model                                 | Purpose                                                                    |
| ------------------------------------- | -------------------------------------------------------------------------- |
| `User`                                | User accounts                                                              |
| `Space`                               | Workspaces (multi-tenant), billing/plan info, LLM config, lock state       |
| `SpaceModelConfig`                    | LLM model configurations at space level (provider, modelId, enabled state) |
| `Entity`                              | Brand being tracked (has `isArchived`)                                     |
| `Competitor`                          | Competitor of an entity                                                    |
| `Ranking`                             | Custom ranking report (has `isArchived`, archiving pauses its prompt)       |
| `Prompt`                              | Question sent to LLMs, has frequency, intent, status                       |
| `AnalysisResult`                      | LLM response + extracted data                                              |
| `AnalysisMention`                     | Detected mentions of entity/competitors                                    |
| `AnalysisLink`                        | URLs extracted from LLM responses                                          |
| `SuggestedPrompt/SuggestedCompetitor` | AI-generated suggestions                                                   |
| `MetricSnapshot`                      | Aggregated visibility/sentiment metrics                                    |
| `AuditLog`                            | Admin action audit trail (userId, action, targetType, targetId, detail)     |
| `GlobalModel`                         | Global LLM model registry (provider, modelId, displayName, enabled state)  |
| `Domain`                              | Domain Registry — domain, category, isAllowlisted, type, logoUrl           |
| `DomainType`                          | Type catalog for domain classification (name, color, description)           |
| `BillingProfile`                      | 1:1 with Space — company name, address, country, VAT ID, validation state  |
| `Invoice`                             | Immutable billing snapshot + line items, tax breakdown, sequential number   |
| `InvoiceCounter`                      | Gap-free sequential invoice numbering (year → lastSeq, atomic upsert)      |
| `EntitySuggestion`                    | Per-entity AEO tactic; persistent Kanban status, channel, `tacticId` FK → `AeoPlaybookItem.slug` (SetNull), `triggerContext` JSONB ("Suggested because…" reasons from Phase 3), `viewedAt` (null = NEW dot in UI) |
| `AeoPlaybookItem`                     | Admin-editable AEO tactic library (Phase 2); slug-keyed, markdown description, default impact/effort, channel, isActive flag, `triggers` JSONB (Phase 3 — array of rule descriptors) |

## Key Enums

- **PromptStatus**: `Running`, `Paused`
- **PromptFrequency**: `Every6Hours`, `Every24Hours`, `Every2Days`, `Every7Days`
- **SpacePlan**: `FOUNDER`, `STARTER`, `PRO`, `BUSINESS`, `ENTERPRISE`
- **LLMProvider**: `MANAGED` (Spectacl provides API), `BYOK` (Bring Your Own Key)
- **SpaceRole**: `OWNER`, `ADMIN`, `MEMBER`
- **SubscriptionStatus**: `ACTIVE`, `TRIALING`, `PAST_DUE`, `CANCELED`, `INCOMPLETE`
- **InvoiceTaxType**: `STANDARD` (21% BTW), `REVERSE_CHARGE` (0% EU B2B), `EXEMPT` (0% non-EU)
- **AeoChannel**: `OnPage` (owned), `OffPage` (earned)
- **AeoSuggestionStatus**: `Suggested`, `ToDo`, `In_Progress`, `Done`, `Dismissed`, `Archived` (manual clear of Done items)
- **AeoSuggestionCategory**: `Content`, `Technical`, `Authority`, `UX`, `Brand`
- **AeoSuggestionSource**: `engine`, `manual`, `llm_custom`

## Patterns & Conventions

- **Testing**: Co-located `*.test.ts` files next to source (e.g., `src/lib/billing/plans.test.ts`). Do not create new test directories — tests live beside the code they test. Tier 1 tests are pure logic (no mocks). Tier 2+ tests use `vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))` with the shared mock from `src/test/mocks/prisma.ts`. New shared mocks go in `src/test/mocks/`. Use `vi.useFakeTimers()` for date-dependent functions. Focus on utilities and business logic; aim for high coverage on critical paths.
- **Admin role check**: Always use `session.user.role !== "ADMIN"` (uppercase). The DB stores `ADMIN`, never lowercase `"admin"`. This has caused silent auth failures before — do not repeat.
- **API Routes**: Located at `src/app/api/[resource]/route.ts`
- **Entity-scoped routes**: Use `[entityId]` param in path
- **Client components**: Import `auth-client.ts` for auth hooks
- **Server components**: Import `auth.ts` for session checks
- **Background jobs**: Enqueue via `src/lib/queue/analysisQueue.ts`. Scheduler uses deterministic `jobId` (`prompt-{id}-{hourBucket}`) to prevent duplicate enqueues.
- **LLM retries**: All LLM calls go through `withLLMRetry()` from `src/lib/llm/retry.ts` — exponential backoff (1s→2s→4s) for 429/503 errors only. Non-retryable errors rethrown immediately.
- **Redis caching**: Use `cached(key, ttlSeconds, computeFn)` from `src/lib/cache.ts` for near-static data. Fail-open design — Redis errors fall through to DB. Invalidate with `invalidateCache(key)` or `invalidateCacheByPrefix(prefix)`. **Important:** `cache.ts` uses `ioredis` (Node-only) — never import it from files that are also used by client components (e.g. `plans.ts`). Turbopack traces even dynamic `await import()` into the client bundle. Use only from server-only files (API routes, workers, server components).
- **Auth rate limiting**: Redis fixed-window counters via `src/lib/rate-limit.ts`. Signup 5/hr, login 10/min, magic link 5/15min. Fail-open if Redis is down.
- **CSRF protection**: Middleware validates `Origin` header on POST/PUT/PATCH/DELETE for authenticated routes. Cross-origin requests → 403. Public routes (webhooks, auth, cron) are exempt. Same-origin requests without Origin are safe via SameSite cookies.
- **Security headers**: CSP, HSTS, X-Frame-Options set in `next.config.js headers()`. Uses `unsafe-inline`/`unsafe-eval` (required by Next.js).
- **Security basics**: Sanitize all user input. Never store sensitive data in plain text. Follow OWASP guidelines.
- **Audit trail**: All admin mutations logged via `auditLog()` from `src/lib/audit.ts`. Best-effort (never throws). Action format: `resource.verb` (e.g. `space.lock`, `model.create`). Admin page at `/admin/audit-log` with filter + pagination. When adding new admin mutation endpoints, add `await auditLog(...)` after the mutation succeeds.
- **Admin support mode**: App admins (`User.role === "ADMIN"`) can enter any customer space without being a `SpaceMember` via `/admin/spaces/[id]` → "Enter space as admin". Authz fan-in is `resolveSpaceAccess()` in [src/lib/space-access.ts](src/lib/space-access.ts) → `{ kind: "member" | "admin-override" | "none" }`. Read-only by default; writes require toggling write mode via the amber `SupportModeBanner`. Cookie helpers in [src/lib/support-mode.ts](src/lib/support-mode.ts) (`support-space-id`, `support-write-space-id` with 30-min TTL). `/spaces` list stays filtered by `SpaceMember` → admin-override spaces never clutter it. Admins are never written to `SpaceMember` → invisible in the customer's member list. Lock + billing-halt + trial-expired gates are bypassed in support mode so staff can help customers whose trial has expired. Audit actions: `space.admin_override_enter/exit`, `space.admin_override_write`, `space.admin_write_enable/disable`. Toggle API: `POST /api/admin/support-mode` with `{ spaceId, enter | exit | writeEnabled }`. When adding new space-scoped auth: prefer `requireSpaceAccess(userId, spaceId, { minRole, intent })` from `permissions.ts` — it's admin-aware. Legacy `requireSpaceMembership` is a wrapper.
- **Health endpoint**: `/api/health` — unauthenticated, returns 200 + timestamp if DB is reachable, 503 if not. Used by external monitors.
- **Error tracking (Sentry)**: `@sentry/nextjs` v10 with tunnel at `/monitoring`. Config files: `instrumentation-client.ts` (browser), `sentry.server.config.ts` (Node), `sentry.edge.config.ts` (Edge), `instrumentation.ts` (server hook). Global error boundary at `src/app/global-error.tsx`. Only enabled in production (`enabled: process.env.NODE_ENV === "production"`). Session Replay 5%, tracing 10%. Source map upload disabled until `SENTRY_AUTH_TOKEN` is set in Coolify. CSP `connect-src` includes `*.ingest.de.sentry.io`.
- **Testing**: DO NOT use browser_subagent for UI testing - user prefers to test manually
- **Notifications**: Use `useToast()` from `@/components/Shared/RadixToast` instead of `alert()` or browser notifications.
- **Dependency Management**: Use `npm install --force` if React 19 peer dependency conflicts occur.
- **Iconography**:
  - **Standard**: Use `@radix-ui/react-icons` for all icons
  - **Exception**: Use custom SVG components (e.g., `BuildingIcon`) ONLY when a specific icon is needed and not available in Radix
  - **Style**: All icons (standard or custom) must use `stroke-width="1.5"` (or visually match) for consistency
  - **Forbidden**: Do NOT import `@heroicons/react` or `lucide-react`
- **Page Layout Pattern**: Every page follows this exact structure:
  1. **Sticky header bar** (inside `PageContainer headers={[...]}`): `Header.Title` (h1, size="4", weight="bold") + `<Separator orientation="vertical">` + either a `<FilterBar>` or a description `<Text>` — all in a single `<Flex>` row. The header sits above the scroll area (not sticky-inside-scroll).
  2. **PageBrief strip** (first child of page content): `<PageBrief description="..." metrics={[...]} />` — a compact horizontal bar with `background: var(--gray-2)` that shows a contextual description (left) and live summary metrics (right). Replaces the old `Header.Root` intro block. Every page should have this.
  3. **Page content**: charts, tables, lists, etc.
  - Headline component: `Header.Title` (`<Heading>` from `@radix-ui/themes`, `tracking-tight`)
  - PageBrief component: `src/components/Shared/PageBrief.tsx` — props: `description` (string) + `metrics` (array of `{ label, value }`)
  - Header component: `src/components/Shared/Header.tsx`
  - **Detail page pattern** (e.g. `/prompts/[promptId]`, `/ranking/[rankingId]`): Sticky header has ← back `IconButton` + `<Separator>` + filter controls (e.g. `FilterBar`, `RadixSegmentedControl`). `PageBrief` shows the item title (prompt text or report name) as `description` with relevant metrics on the right. No title in the sticky header — the title lives in PageBrief.
  - **Admin pages without PageContainer** (e.g. `/admin/pricing`, `/admin/domain-registry`): Use `Container size="3" className="max-w-5xl py-8"` with inline `Heading size="6"` + `Text size="3"` intro block, matching the domain-registry pattern. No PageBrief needed for admin pages.
  - **Two-column pages with collapsible aside** (e.g. `/prompts`, `/[entityId]/suggestions`): Use `<PageContainer noContentPadding>` + `<TwoColumnPage aside={<SomeSidePanel />}>` + main content. `PageContainer.noContentPadding` opts out of the default bottom padding so the aside's background and border reach the viewport bottom; `TwoColumnPage` re-applies the padding on the main column only and hides the aside below the `md` breakpoint. Asides use `<SidePanel stateKey="..." header={...} railTooltip="..." railBadge={...}>body</SidePanel>` — a generic collapsible-rail primitive that owns stretch-fill, sticky-inner, width animation, and localStorage persistence via `useSidePanelState`. Both primitives accept a position prop: `<TwoColumnPage asidePosition="left"|"right">` (default `"right"`) and `<SidePanel position="left"|"right">` (default `"right"`) — left placement is used for filter rails (e.g. AEO Suggestions channel filter, Jira-backlog style), right is used for content asides (e.g. Suggested Prompts on /prompts). Examples: right — [src/components/Prompts/SuggestedSidePanel.tsx](src/components/Prompts/SuggestedSidePanel.tsx); left — [src/components/Suggestions/SuggestionsSidebar.tsx](src/components/Suggestions/SuggestionsSidebar.tsx). Primitives: [src/components/Shared/SidePanel.tsx](src/components/Shared/SidePanel.tsx), [src/components/Shared/TwoColumnPage.tsx](src/components/Shared/TwoColumnPage.tsx), [src/hooks/useSidePanelState.ts](src/hooks/useSidePanelState.ts).
- **Emails**: React Email components with shared layout. See `/admin/emails` for full docs.
  - **Templates**: `src/emails/*.tsx` — thin components, typed props, wrap in `<EmailLayout>`
  - **Layout**: `src/emails/components/layout.tsx` — shared shell, Radix Colors (hardcoded hex, no CSS vars), no gradients
  - **Helpers**: `EmailButton`, `EmailUrlFallback`, `EmailCallout` from layout
  - **Rendering**: `renderEmail(Component, props)` from `src/lib/send-email.ts` — works from `.ts` files without JSX
  - **Sending**: `sendEmail({ from, to, subject, html, label })` from `src/lib/send-email.ts` — centralized wrapper with delivery logging, never throws. Use instead of `resend.emails.send()` directly.
  - **Colors**: Standard Radix scales — iris (magic link), green (invitation), slate (cancellation), blue (future/info)
  - **From addresses**: 2 only — `hello@mail.spectacl.org` (all transactional) and `billing@mail.spectacl.org` (payment emails)
  - **Adding a new email**: Create component in `src/emails/`, export from `index.ts`, call `renderEmail()` at trigger point

## Environment Variables

Key vars in `.env`:

- `NEXT_PUBLIC_SPECTACL_MODE` - Deployment mode: `"cloud"` (SaaS) or unset (self-hosted, default)
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis for BullMQ
- `RESEND_API_KEY` - Resend email API key (domain: `mail.spectacl.org`)
- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY` - LLM providers
- `SENTRY_AUTH_TOKEN` - (optional) Sentry auth token for source map uploads. Not yet configured.

## Common Tasks

### Add a new page for an entity

1. Create folder in `src/app/[entityId]/[pagename]/`
2. Add `page.tsx` with entity data fetching
3. Update sidebar navigation in `src/components/Sidebar/NavigationSection.tsx`

### Add a new API endpoint

Create `route.ts` in `src/app/api/[path]/` with `GET`, `POST`, etc. handlers.

### Modify database schema

1. Edit `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name description`
3. Update TypeScript types as needed

### Background job processing

Jobs are processed by `src/lib/queue/analysisWorker.ts`. The worker runs alongside the Next.js server in dev (`npm run dev`) and production (`npm run start`).

## Worker Architecture & Scaling

**Admin docs page:** `/admin/worker-architecture` — full documentation with phase roadmap.

### Current State (Phase 1 — Implemented)

- **Queue:** Single `analysis-queue` (BullMQ), concurrency 25
- **Job structure:** 1 job per prompt, all models processed in parallel within the job
- **Rate limiting:** Per-provider Bottleneck limiters with Redis-backed distributed state (`src/lib/queue/rateLimiter.ts`)
  - OpenAI: 400 RPM, Anthropic: 200 RPM, Google: 300 RPM, Mistral: 200 RPM
- **Priority lanes:** P1 (fast lane) for user-initiated, P5 for rescans, P10 for batch scheduled jobs
- **Admin dashboard:** Real-time queue stats at `/admin/workers` (polls `/api/admin/queue-stats` every 5s)
- **MetricSnapshot:** Written by `updateEntityMetrics()` after each job completes
- **Fallback:** Dashboard API falls back to `getDynamicMetrics()` if no snapshot exists yet

### Key Files

| File | Purpose |
|------|---------|
| `src/lib/queue/rateLimiter.ts` | Per-provider Bottleneck rate limiters |
| `src/lib/analysis.ts` | Core analysis logic, LLM calls wrapped in rate limiter |
| `src/lib/queue/analysisWorker.ts` | Worker process (concurrency: 25) |
| `src/lib/scheduler-job.ts` | Scheduler tick — enqueues due prompts |
| `src/lib/metrics/snapshots.ts` | MetricSnapshot calculation + persistence |

### Scaling Roadmap

| Phase | What | When | Status |
|-------|------|------|--------|
| 1 | Per-provider rate limiting (Bottleneck + Redis) | Before 50 users | ✅ Done |
| 2 | Snapshot deduplication (Redis counter, 40× reduction) | Before 200 users | 🔲 Planned |
| 3 | Staggered scheduling + horizontal worker scaling | Before 500 users | 🔲 Planned |

### Production Numbers (1,000 users)

```
1,000 users × 2 entities × 40 prompts × 3 models = 240,000 LLM API calls per batch
Processing time bottleneck: Anthropic at 200 RPM ≈ 6.7 hours (fits in 6h scheduling window with higher tier)
```

### Performance Notes

- **Admin docs page:** `/admin/performance` — full documentation of DB query optimization opportunities
- **`getDynamicMetrics`** (`src/lib/metrics/dynamic.ts`): Uses 12 Prisma queries in `$transaction`. Raw SQL consolidation (12 → 3 queries) is shelved — implement before 500+ users or when dashboard latency > 500ms
- **`history.ts`** uses raw SQL because Prisma can't express `GROUP BY DATE()` — this is a Prisma limitation, not a performance choice
- **`snapshots.ts`**: Reads batched into `$transaction` arrays (4-5 queries per roundtrip). Entity + competitor snapshots parallelized via `Promise.all`. Was 24-30 sequential queries; now ~12 parallel batched transactions.

## Billing & Payments (Mollie)

### Architecture
- **Checkout**: `POST /api/mollie/checkout` creates a first payment with `sequenceType: first`. On success, the webhook creates a recurring Mollie subscription starting 1 month out. Requires `BillingProfile` — returns `BILLING_PROFILE_REQUIRED` (400) if missing.
- **Tax-adjusted payments**: Checkout calculates gross amount from net price + VAT. NL/EU-without-valid-VAT pay price × 1.21. EU-with-valid-VAT and non-EU pay net price. Tax info stored in Mollie payment metadata (`taxType`, `taxRate`, `netPrice`).
- **Recurring**: Mollie auto-charges monthly. Webhook extends `currentPeriodEnd` and resets credits.
- **Cancellation**: Multi-step survey modal → `POST /api/spaces/{spaceId}/subscription/cancel` → Mollie subscription canceled → email sent.
- **Credits**: Dynamic formula `maxActivePrompts × days × modelCount` (days = trial period for trials, 31 for paid). Deducted per LLM call in `analysis.ts`. Exhaustion guard prevents calls when `llmCreditsRemaining <= 0`.
- **Space locking**: Admins can lock spaces for misuse via `/admin/spaces/{id}`. Locking sets `isLocked=true`, pauses all prompts, and shows a non-dismissable `SpaceLockedModal` to users. Scheduler skips locked spaces. Unlock restores access but keeps prompts paused for review.
- **Admin docs**: `/admin/mollie` — living tracker with implementation status, known issues, and production checklist.

### VAT & Invoices
- **B2B-only**: All prices are ex-VAT (net). ToS declares B2B-only. No OSS registration needed.
- **VAT logic**: 3 scenarios — NL domestic (21% BTW), EU cross-border with valid VIES-verified VAT ID (0% reverse charge), non-EU (0% exempt). EU without valid VAT ID defaults to 21%.
- **VIES validation**: `src/lib/billing/vies.ts` calls EU REST API. VAT ID optional — if missing/invalid, customer pays 21% BTW.
- **Tax calculation**: Pure function in `src/lib/billing/tax.ts`. Zero imports, zero side effects, zero DB. `calculateTax(country, vatIdValid)` returns rate/type/label.
- **Invoice generation**: Fire-and-forget in webhook after paid payments. `createInvoice()` fetches BillingProfile + seller info from SystemSettings, calculates tax, generates sequential number via atomic SQL upsert, creates immutable record with both seller and buyer snapshots.
- **Invoice numbering**: `SPE-YYYY-NNNN` format (SPE = Spectacl product code under Sinus Digital B.V.). Gap-free sequential via `InvoiceCounter` table + atomic `INSERT ... ON CONFLICT DO UPDATE RETURNING`. Product prefix prevents collisions with future Sinus Digital SaaS products that have independent numbering.
- **PDF generation**: On-demand via `@react-pdf/renderer` in `src/lib/billing/invoice-pdf.ts`. No file storage — generated from DB data per request. Reverse charge invoices show Article 196 legal note. Seller info (company, address, VAT ID) rendered from invoice snapshot.
- **Seller info**: Managed via `SystemSettings` keys (`seller_company_name`, `seller_street`, etc.). Editable in Admin Settings > Seller / Invoice Details. Snapshotted on each invoice for immutability.
- **Invoice email**: `src/emails/invoice-email.tsx`. From: `billing@mail.spectacl.org`. Triggered after invoice creation.
- **Billing profile**: `BillingProfile` model (1:1 with Space). Collected via `BillingAddressForm` component — shown in UpgradeRequiredModal (step 2) and Settings > Billing.
- **Upgrade UX**: Multi-step in `UpgradeRequiredModal`: plan selection → billing address (if no profile) → Mollie checkout. Prices show "excl. VAT".
- **Decoupled**: All new modules in `src/lib/billing/` (tax.ts, vies.ts, invoices.ts, invoice-pdf.ts) have zero imports from existing plans.ts/access.ts/trial.ts.

### Key Patterns
- **Webhook idempotency**: Atomic `updateMany` with WHERE clause (compare-and-set on `lastProcessedWebhookId`). Non-terminal statuses (`open`, `pending`) are ignored before the claim — Mollie sends separate webhooks per status change and the `open` webhook must not burn the key before `paid` arrives. Claims the ID upfront to prevent concurrent duplicates, but **rolls back the claim and returns 500** if subscription creation fails — allowing Mollie to retry transient errors (mandate pending, API timeout). Permanent failures (missing `customerId`) still set INCOMPLETE and return 200. `subscription-sync` cron is the final safety net.
- **Webhook verification**: Payment path fetches from Mollie API. Cancellation path verifies subscription status via `customerSubscriptions.get()`. Never trust POST body alone.
- **confirm-payment does NOT set `lastProcessedWebhookId`**: The webhook must always run its full flow (subscription creation + credit reset).
- **Payment return flow**: After Mollie redirect, `PaymentReturnHandler` runs 3 phases: (1) confirm-payment (optimistic ACTIVE), (2) "Setting up" modal with progress bar polling for `mollieSubscriptionId` every 2s, (3) success modal once webhook confirms. 30s timeout with "Continue anyway" fallback. Prevents race window where user has ACTIVE status but no subscription/credits.
- **Failed subscriptions → retry**: If Mollie subscription creation fails after first payment, the idempotency claim is rolled back and 500 is returned so Mollie retries. The space stays in its current state (typically ACTIVE from `confirm-payment`). Only `no customerId` (permanent failure) sets INCOMPLETE.
- **Failed payments → PAST_DUE**: Grace period — Mollie retries. Only `expired`/`canceled` map to CANCELED.
- **Month addition**: Use `addOneMonth()` helper in webhook (clamps Jan 31 → Feb 28). Never use `setMonth(getMonth() + 1)` directly.
- **Negative credits toggle**: Admin setting `allow_negative_credits` on pricing page. When enabled, spaces can go below zero credits (no block, no floor check). Handles mid-cycle model drift (Mollie issue #17). Monitor negative balances manually for misuse. Setting read once per job in `analysis.ts` via `SystemSettings.get()`.
- **Enterprise excluded from checkout**: VALID_PLANS = STARTER, PRO, BUSINESS only. Enterprise is contact-us only.
- **Credit calculation**: Server-side uses `calculateMonthlyCreditsFromDb()` (respects admin DB overrides). Client-side preview uses `calculateMonthlyCredits()` (hardcoded).
- **Entity-Space cascade**: `Entity.spaceId` has `onDelete: Cascade`. Deleting a Space cascade-deletes all its Entities.
- **GDPR data export**: `GET /api/user/export` generates JSON with user profile, memberships, entities, billing, invoices, audit log, invitations. UI in Settings > Privacy & Data. Per-user scope (not per-space).
- **Account deletion cascades**: User FK rules — `Entity.userId` SetNull (entity stays in space), `Space.createdById` SetNull, `AuditLog.userId` SetNull (logs persist), `SpaceInvitation` Cascade (delete stale invites), `SpaceMember.invitedById` SetNull. Migration: `prisma/migrations/20260410_audit_log_and_cascades/`.
- **Ownership transfer**: `POST /api/spaces/[spaceId]/transfer` — atomic `$transaction` promotes target to OWNER and demotes caller to ADMIN. Only current OWNER can call. Target must be an existing space member.
- **Space creation (cloud)**: No per-user space limit. `POST /api/spaces` always creates the space. First space gets a trial (`TRIALING`). Subsequent spaces are `INCOMPLETE` (user already used trial). `CreateSpaceModal` detects INCOMPLETE and immediately shows `UpgradeRequiredModal` with `mode="activate"` targeting the **new** space — never the existing one. After Mollie payment, the webhook activates that specific space. If the user dismisses without paying, the INCOMPLETE space persists in the DB and shows in the spaces list.
- **Plan upgrade/downgrade**: User picks a new plan in `UpgradeRequiredModal` → `POST /api/mollie/checkout` creates a first payment → webhook cancels old subscription immediately (non-fatal if already canceled) → creates new subscription → resets credits. Old subscription overlap is accepted (free upgrade perk). The old subscription is only canceled in the webhook (after payment succeeds), so abandoning checkout leaves the existing plan intact.
- **Plan limits auth**: `PUT /api/admin/plan-limits` requires admin role. GET is public (prices are non-sensitive, used by upgrade modal). Save strips to safe editable fields only.

### Key Files
| File | Purpose |
|------|---------|
| `src/lib/mollie.ts` | Mollie client factory |
| `src/app/api/mollie/checkout/route.ts` | First payment creation |
| `src/app/api/mollie/confirm-payment/route.ts` | Client-side payment verification on redirect |
| `src/app/api/webhooks/mollie/route.ts` | Webhook: payments, subscriptions, credit reset |
| `src/lib/billing/plans.ts` | Credit formula, plan limits, DB override support |
| `src/lib/analysis.ts` | Credit deduction per LLM call + exhaustion guard |
| `src/lib/queue/creditResetWorker.ts` | Trial-only credit reset (paid spaces reset via webhook) |
| `src/app/api/admin/plan-limits/route.ts` | Admin pricing CRUD (auth-protected PUT) |
| `src/components/Shared/CancellationSurveyModal.tsx` | Multi-step cancellation flow |
| `src/app/admin/mollie/page.tsx` | Admin Mollie status dashboard |
| `src/app/api/admin/spaces/[id]/lock/route.ts` | Admin space lock/unlock API |
| `src/components/Shared/SpaceLockedModal.tsx` | Non-dismissable blocking modal for locked spaces |
| `src/components/Shared/DunningBanner.tsx` | PAST_DUE warning banner — non-blocking, shown in AppShell |
| `src/app/api/spaces/[spaceId]/transfer/route.ts` | Ownership transfer (OWNER → target, atomic) |
| `src/lib/audit.ts` | Best-effort audit log helper for admin mutations |
| `src/lib/subscription-sync.ts` | Mollie subscription status reconciliation (runs on cron) |
| `src/lib/billing/tax.ts` | Pure VAT calculation (3 scenarios, zero imports) |
| `src/lib/billing/vies.ts` | VIES VAT ID validation via EU REST API |
| `src/lib/billing/invoices.ts` | Invoice creation orchestrator (tax, numbering, email) |
| `src/lib/billing/invoice-pdf.ts` | PDF generation via @react-pdf/renderer |
| `src/emails/invoice-email.tsx` | Invoice notification email template |
| `src/app/api/billing/profile/route.ts` | Billing profile GET/PUT (VIES validation on save) |
| `src/app/api/billing/validate-vat/route.ts` | Live VIES VAT ID validation |
| `src/app/api/billing/invoices/route.ts` | List invoices for space |
| `src/app/api/billing/invoices/[id]/route.ts` | Invoice JSON or PDF download |
| `src/app/api/admin/invoices/route.ts` | All invoices paginated (admin) |
| `src/components/Billing/BillingAddressForm.tsx` | Reusable billing form (modal + settings) |
| `src/components/Billing/countries.ts` | ISO 3166-1 alpha-2 country list |
| `src/components/Settings/InvoiceHistory.tsx` | Invoice list table with PDF download |
| `src/app/admin/invoices/page.tsx` | Admin invoices dashboard |
| `src/components/Admin/SellerInfoForm.tsx` | Seller info form (admin settings) |

## Admin Sidebar Structure

5 sections (reorganized from 4):
- **Configuration** (6): Settings, Master LLMs, Prompt Configuration, Domain Registry, AEO Playbook, Pricing
- **Operations** (7): Spaces, Users, Waitlist, Invoices, Payments, Audit Log, Deletion Logs
- **System Health** (4): Workers, Cron Jobs, Environment, BullMQ Queues
- **Reference** (3): Security, Emails, Performance
- **Demo** (3): Modals, Radix, Invoice

Admin area has a visually distinct darker sidebar section with amber "ADMIN" badge. Static doc pages (Roadmap, Build Pipeline, Caching, Deployments, Worker Architecture, Launch Issues) removed from sidebar — content lives in Notion.

## Space Deletion

Two-step modal for users: if subscription is active, must cancel first (Step 1), then confirm DELETE (Step 2). Trials/cancelled/incomplete skip straight to Step 2.

Deletion sequence (both admin + user handlers):
1. Cancel Mollie subscription (if active)
2. Clean up BullMQ queued/delayed jobs for space's prompts
3. Delete entities (cascades prompts, results, mentions, links, metrics)
4. Delete space (cascades members, invitations, usage — **invoices survive via SetNull**)

**Invoice retention**: `Invoice.spaceId` is `onDelete: SetNull` — invoices persist after space deletion for 7-year Dutch tax law compliance. Orphaned invoices show "(deleted)" in admin, return 403 to regular users, accessible to admins.

## GDPR

- **Session Replay**: Sentry replay has `maskAllText`, `maskAllInputs`, `blockAllMedia` enabled
- **localVariablesIntegration**: Removed from Sentry server config (PII risk)
- **DSAR export** (`GET /api/user/export`): Includes user profile, sessions (IP/UA), accounts, memberships, entities, billing, invoices, audit logs (detail stripped), invitations, waitlist entry
- **User deletion cleanup**: Deletes WaitlistEntry by email, nulls AuditLog detail, cascades sessions/accounts/invitations
- **ToS acceptance**: `User.tosAcceptedAt` set on signup via auth hook
- **User lock**: `User.isLocked` + `User.lockedReason` — locked users can't create sessions (auth hook rejects)

## Open Source

- **License**: MIT (Sinus Digital B.V.)
- **`.env.example`**: All vars with placeholders
- **Self-hosted mode**: `NEXT_PUBLIC_SPECTACL_MODE` env var controls deployment mode:
  - `cloud` → SaaS mode with billing, payments, trials, plan limits
  - Unset or anything else → **self-hosted mode** (default): unlimited everything, no billing UI
  - Helper functions: `isCloud()` / `isSelfHosted()` from `src/lib/mode.ts`
  - Safety net: `checkModeConsistency()` warns at startup if `MOLLIE_API_KEY` is set but mode ≠ cloud
  - All billing banners, modals, sidebar items, and admin billing pages hidden in self-hosted mode
  - Credit deduction, trial enforcement, plan limits, and subscription sync all bypassed
  - Spaces created in self-hosted mode get `subscriptionStatus: ACTIVE` + `llmCreditsRemaining: -1` (unlimited)
  - Mollie API routes return 400 in self-hosted mode (defense-in-depth)
  - Tests run with `NEXT_PUBLIC_SPECTACL_MODE=cloud` (set in `vitest.config.ts`)
- **Dead code removed**: PromptsTable V1, SuggestedPromptsList V1 deleted; V2 renamed to drop suffix

## AEO Suggestions

> **For phase status, architecture decisions, and the next-phase brief, see [docs/aeo-suggestions-roadmap.md](docs/aeo-suggestions-roadmap.md).** Phases 1, 2, and 3 are shipped; Phase 4 (decoupled personalizer LLM) is next. New agents picking up this work should read the roadmap doc first.

Per-entity Answer Engine Optimization tactics with a Jira-style backlog + Kanban surface, URL-synced filters, and a right-edge detail drawer. **Phases 1-3** of a multi-phase suggestion-engine refactor — suggestions are persisted, channel-classified (On-Page vs Off-Page), backed by the admin-editable `AeoPlaybookItem` library, **selected by a deterministic trigger engine** with "Suggested because…" reasons surfaced in the drawer, and rendered through the canonical `PageContainer` + `PageBrief` pattern.

### Page architecture
- **Page**: [/[entityId]/suggestions](src/app/[entityId]/suggestions/page.tsx). Wrapped in `<Suspense>` because it uses `useSearchParams` for URL-synced filter state (per the project gotcha — `export const dynamic = "force-dynamic"` also set).
- **Layout**: `PageContainer noContentPadding` sticky header (Title + Separator + AEO description Text + spacer + Generate) → `TwoColumnPage asidePosition="left"` with `SuggestionsSidebar` aside → main column = mobile-only Channel chips → conditional `ActiveBoard` (Kanban) → always-visible `Backlog` table → collapsible Dismissed. **No PageBrief on this page** — description lives in the header, and channel counts already live in the sidebar, so the brief was redundant.
- **Left sidebar (Jira-backlog style)** — `SuggestionsSidebar` carries every filter except mobile fallback chips. Two sections inside the rail:
  - **Channels** — single-select rows ("All Suggestions" / "On-Page · Owned" / "Off-Page · Earned"), styled like the main app's `<NavListItem>` for visual continuity. Trailing count = available todos (Suggested + ToDo + In_Progress).
  - **Categories** — multi-select checkbox list (Content / Technical / Authority / UX / Brand). Per-category counts respect the active channel filter — picking "On-Page" then looking at categories shows the count *within* On-Page. A small "Clear" link appears when any category is selected.
- **Combined Kanban + Backlog pattern** (no view toggle): The page acts as a single Jira-style work surface.
  - **Active Board** — Kanban with To Do / Doing / Done columns. Renders **only when at least one item has status ToDo, In_Progress, or Done**. Drag-and-drop between columns updates status.
  - **Backlog** — `SuggestionsTable` filtered to `Suggested` status. Always visible. Last row is an inline "Add a tactic…" input (Prompts-overview pattern via [InlineAddRow](src/components/Shared/InlineAddRow.tsx) shape) — type a title + Enter creates a manual `EntitySuggestion` (`source = 'manual'`, defaults: channel OnPage, category Content, impact 5, effort 5). User refines via the drawer. Bulk actions on the backlog: `Move to To Do` / `Dismiss` (no `Mark Done` — backlog items aren't in flight).
  - **Tackle flow** — Backlog row's kebab "Move to To Do" promotes the item: it disappears from the backlog and appears in the Active Board's first column. The board materializes the moment it has its first inhabitant.
  - **Dismissed** — collapsible chevron toggle below the backlog. Hidden by default; shows a borderless mini-table when expanded. Empty when no dismissed items exist.
- **Detail drawer**: `SuggestionDetailDrawer` (right-edge slide-in, 560px) — replaces the previous 7xl modal. Inline status select, read-only channel/category badges, read-only impact/effort level icons, sticky save/cancel footer. Hard-delete button only appears when status is Dismissed. Editable fields: title + description + status only.
- **URL params**: `?channel=all|OnPage|OffPage&category=Content,Brand`. View toggle and status filter both removed — the combined layout makes them redundant. Default values are omitted from the URL. Refresh-safe and shareable.
- **Mobile**: Below the `md` breakpoint the left sidebar is hidden (per `TwoColumnPage` convention). A small Channel segmented control renders above the content as a fallback so mobile users can still filter by channel.

### Source library + persistence
- **Source library** (Phase 2): DB-backed `AeoPlaybookItem` table. 30 seeded tactics (17 OnPage / 13 OffPage). Admins edit at [/admin/aeo-playbook](src/app/admin/aeo-playbook/page.tsx) — title, description (markdown), channel, category, default impact/effort, tags, active flag, **triggers (JSONB)**. Slug is the stable join key (legacy IDs `geo_1`..`geo_20` preserved; new tactics start at `geo_21`).
- **Engine** (Phase 3): [src/lib/aeo/engine.ts](src/lib/aeo/engine.ts) + [src/lib/aeo/triggers.ts](src/lib/aeo/triggers.ts). The engine is now the **selector**: `runEngine(entityId, { topN: 8 })` loads active playbook + entity metrics (latest `MetricSnapshot`, competitor-averaged snapshots, source-type breakdown via raw SQL over `AnalysisLink → Domain → DomainType`), evaluates each item's triggers, ranks by `totalWeight desc → impact desc → effort asc`, returns top N. Items with no triggers get a 0.5 baseline weight so freshly-created entities still get suggestions. Three trigger kinds: `metric_threshold`, `missing_source_type`, `worse_than_competitor_avg`. 10 of 30 playbook items have hand-authored triggers (seed migration `20260504_aeo_playbook_triggers_seed`); rest use baseline. Engine throws nothing on malformed JSONB — defensively parses.
- **Selector** (Phase 4 — engine-driven + cached personalizer): [src/lib/aeo/selector.ts](src/lib/aeo/selector.ts) → `selectTacticsForEntity()` calls `runEngine` for selection, then **cache-checks** existing `EntitySuggestion` rows at status=Suggested — any row whose description differs from the playbook default is treated as a previously-personalized cache hit and reused (no LLM). For the remaining cache-misses it scrapes the website and asks the `aeo_personalization` internal model to write personalized markdown descriptions. **Credit guard**: spaces with `llmCreditsRemaining === 0` skip the LLM entirely; items without a cache hit fall back to the playbook default description.
- **`triggerContext` JSONB**: persisted on `EntitySuggestion.triggerContext` for engine-selected items where at least one trigger fired (null for baseline-only or manual rows). Schema: `{ totalWeight, fired: [{ kind, weight, value, explanation }] }`. The drawer renders these as a "Suggested because…" Callout above the description. Re-running `/analyze` resets the field via `Prisma.JsonNull` so items that drop out of the triggered set lose their reasons cleanly.
- **Persistence**: `EntitySuggestion` table — `(entityId, tacticId)` unique. `tacticId` is now an FK to `AeoPlaybookItem.slug` with `onDelete: SetNull` (deleting a playbook item leaves user-owned rows intact, just unlinked).
- **Engine freeze** (PR 1, 2026-05-09): Re-running `/analyze` only refreshes rows still at `status = Suggested`. Once the user accepts (ToDo / In_Progress / Done / Dismissed / Archived), the row is **frozen** — engine no longer rewrites title / description / triggerContext / impact / effort / tags. The principle is "engine owns the backlog, user owns everything past it." Implemented as findUnique → conditional create / update / pass-through in [analyze/route.ts](src/app/api/entities/%5BentityId%5D/suggestions/analyze/route.ts).
- **NEW indicator** (PR 1): `EntitySuggestion.viewedAt` is null until the user first touches the row (drawer open / status change / bulk action). The backlog table renders a 6px `--accent-9` dot + bold title when `status = Suggested && viewedAt = null`. Auto-marking viewed: every successful PATCH stamps `viewedAt = NOW()` if currently null. The drawer fires a `markViewed: true` PATCH on open for the same effect. Bulk endpoints auto-stamp via the same PATCH path.
- **Done lifecycle** (PR 2, 2026-05-09): Done kanban cards show a "Done Xd ago" subscript (`updatedAt` as completion proxy). Done column auto-collapses above 5 items behind a "Show N more" expander. Done cards are sorted most-recent-first.
- **Archived status** (PR 2): Manual archive action for completed work (`status = Archived`). Hidden from the active board, backlog, and Dismissed accordion; surfaced via a separate "Archived (N)" accordion at the bottom of the page. Kanban context menu on Done cards shows Archive (replaces Dismiss for Done). Restore on Archived rows returns them to `Done`; Restore on Dismissed rows returns them to `Suggested`. Configured via `restoreToStatus` prop on `SuggestionsTable`. No auto-clear by timestamp — user-driven only.
- **Markdown**: tactic descriptions are markdown — admins author markdown in the edit dialog (with live preview tab), the LLM is asked to return markdown personalizations, and `SuggestionDetailDrawer` renders via `react-markdown` with a Preview/Edit tab.

### API
- `POST /api/entities/[entityId]/suggestions/analyze` — runs the engine selector, persists up to 8 suggestions. **Phase 4 cooldown gate**: returns `429 { code: "cooldown", nextAvailableAt, cooldownHours }` if the entity was generated within the last N hours (default 168 = 7 days; editable on `/admin/master-llms`). Bypassed for app admins (`User.role === "ADMIN"`) and for `Space.plan === "FOUNDER"`. Update preserves user-controlled fields (status, notes, dueDate, dismissedReason). Engine freeze (Phase 3.x) means existing non-Suggested rows are passed through unchanged.
- `GET /api/entities/[entityId]/suggestions/aeo` — list all suggestions for an entity.
- `POST /api/entities/[entityId]/suggestions/aeo` — create a manual suggestion. Body `{ title, channel?, category?, impact?, effort? }`. Only `title` is required; the rest default to OnPage / Content / 5 / 5. Used by the inline-add row at the bottom of the backlog.
- `PATCH /api/entities/[entityId]/suggestions/aeo/[id]` — used by row click → drawer save, status changes, bulk actions. Whitelists editable fields; `updateMany` scoped by entityId prevents cross-entity tampering.
- `DELETE` — hard delete (only for manual/custom suggestions or dismissed engine items).
- **Admin** `GET/POST /api/admin/aeo-playbook` — list / create. `GET/PUT/DELETE /api/admin/aeo-playbook/[slug]` — single CRUD. `POST /api/admin/aeo-playbook/preview` body `{ entityId }` — dry-run selector against an entity, returns tactics without persisting. `GET /api/admin/entities-search?q=` — typeahead for the preview dialog. All admin mutations audit-logged as `aeo_playbook.create|update|deactivate|delete`.

### Components (under `src/components/Suggestions/`)
| File | Purpose |
|---|---|
| `types.ts` | `Suggestion` interface, `AeoChannel`, `SuggestionStatus`, `SuggestionCategory` enums |
| `SuggestionsSidebar.tsx` | Left aside (Jira-backlog style): channel filter rows + category checkboxes |
| `SuggestionsTable.tsx` | Sortable, selectable list view with bulk action bar |
| `SuggestionDetailDrawer.tsx` | Right-edge slide-in detail/edit (replaces deleted `SuggestionDetailModal.tsx`) |
| `SuggestionCard.tsx` | Card used in Kanban view only (List view uses table rows) |
| `DraggableSuggestionCard.tsx` | dnd-kit wrapper for Kanban |
| `DroppableColumn.tsx` | Kanban column droppable; accepts `style` prop |

### AEO terminology + roadmap
- Codebase has migrated from "GEO Suggestions" → "AEO Suggestions". The internal task model is now `aeo_personalization` (renamed from `geo_tactics` in Phase 2, then `aeo_tactics` → `aeo_personalization` in Phase 4 to reflect that the LLM only personalizes now — engine selects). Slugs on `AeoPlaybookItem` still use the `geo_*` prefix for stable join compatibility — this is intentional, do not rename without an EntitySuggestion migration.
- **Channel model**: Earned media validates owned content in the LLM corpus. The engine surfaces gaps directly via `missing_source_type` triggers (e.g. no Reviews & ratings mentions → boost G2/Capterra tactic) and competitor-comparison triggers (e.g. trailing competitor SoV → boost Analyst Reports / Wikipedia). On/Off-Page priority emerges naturally from the trigger weights rather than a hard-coded matrix.

## Domain Logos

Entity, competitor, and source-domain logos all flow through the same pipeline:

- **Storage**: `Domain.logoBytes` (bytea) + `Domain.logoMimeType`. Bytes are scraped via [src/lib/logoScraper.ts](src/lib/logoScraper.ts) (cheerio + sharp: picks best `apple-touch-icon`/`icon`, resizes to 128px PNG).
- **URL column (`Domain.logoUrl`)**: Always a self-ref path `/api/card/logo/{domain}` — never a third-party URL. Legacy Google S2 URLs in the DB are backfilled to self-ref on next `POST /api/domains/logo` call.
- **API route** [src/app/api/card/logo/[domain]/route.ts](src/app/api/card/logo/[domain]/route.ts):
  1. If `logoBytes` exists → serve PNG with `Cache-Control: public, max-age=2592000, immutable`.
  2. Otherwise → claim a scrape slot (sets `lastChecked = now()`), fire-and-forget `scrapeAndStoreLogo(domain)`, redirect 302 to `google.com/s2/favicons?domain={domain}&sz=128` with a 5-minute cache. 1-hour cooldown between scrape attempts throttles failing domains. (Previously redirected to `icons.duckduckgo.com/ip3/...` but DDG only serves pre-cached domains and 404'd routinely on long-tail names.)
- **Client fallback chain** in [src/components/CompanyLogo.tsx](src/components/CompanyLogo.tsx): `logoUrl` (self-ref) → `/api/card/logo/...` → Google S2 direct. Probe pattern detects load failure since Radix Avatar has no `onError`.
- **Brand color extraction** ([src/lib/colorUtils.ts](src/lib/colorUtils.ts)): `extractBrandColor()` accepts `Buffer | string`. Self-ref `/api/...` paths are rejected — callers (`entities/route.ts`, `competitors/route.ts`, backfill scripts) scrape first, then pass the raw `Buffer.from(Domain.logoBytes)` for Vibrant analysis.
- **CSP**: `img-src` allows `'self' https://www.google.com data: blob:`. `next.config.js` `images.remotePatterns` mirrors the third-party hostnames.

## Gotchas & Pitfalls

### useSearchParams and Suspense

- **Issue**: Using `useSearchParams()` in a client component will cause production builds to fail with "useSearchParams() should be wrapped in a suspense boundary"
- **Solution**: Wrap the component using `useSearchParams()` in a `<Suspense>` boundary and add `export const dynamic = 'force-dynamic'` to the page
- **Example**: See `src/app/login/page.tsx` for the pattern

### Disk Full → Postgres/Redis Wedge (Hetzner CX33)

On the 38 GB disk, Docker layer buildup + build cache can fill disk within 24–48h of active dev pushes if cleanup isn't aggressive enough. When disk hits 100%:

- **Postgres** PANICs with `No space left on device` on checkpoint, enters a crash loop, and **won't auto-recover even after disk frees** — needs manual restart.
- **Redis** flips into read-only mode via `stop-writes-on-bgsave-error`. Worker logs spam `MISCONF Redis is configured to save RDB snapshots, but it's currently unable to persist to disk`.
- **Coolify UI** becomes unresponsive because its own DB is wedged.

**Recovery sequence:**

1. **Free disk** (in order of impact):
   ```bash
   truncate -s 0 /var/lib/docker/containers/*/*-json.log   # kill runaway logs
   docker builder prune -a -f                              # build cache (often 10+ GB)
   docker system prune -a -f                               # stopped containers + unused images
   ```
2. **Restart Postgres** — the crash loop won't clear on its own:
   ```bash
   docker restart <pg-container>
   ```
   If `docker system prune -a` removed the stopped container (which happens if you stopped it first), recreate via compose — named volumes survive:
   ```bash
   cd /data/coolify/source && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
   ```
3. **Reset Redis** — one of:
   ```bash
   docker restart <redis-container>                         # simplest, loses in-memory queue state
   # or preserve state:
   docker exec <redis> redis-cli CONFIG SET stop-writes-on-bgsave-error no
   docker exec <redis> redis-cli BGSAVE
   docker exec <redis> redis-cli CONFIG SET stop-writes-on-bgsave-error yes
   ```

**Prevention (configured 2026-04-17):**

- **Coolify → Servers → localhost → Docker Cleanup**: frequency `0 */6 * * *` (every 6h), **Delete Unused Volumes OFF**, Delete Unused Networks ON, Force Docker Cleanup ON.
- **Server disk threshold alert**: 70% (Servers → Advanced). Requires a Notifications channel configured (email/Discord) or the alert fires into the void.
- **Docker log rotation** in `/etc/docker/daemon.json`:
  ```json
  { "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "3" } }
  ```
  Then `systemctl restart docker` (brief full-stack restart).

**⚠️ Warning — "Delete Unused Volumes" is destructive and immediate.** Enabling it (even briefly) will prune all orphan volumes on the next scheduled or manual cleanup run. Orphan volumes can include old app databases (e.g. Ghost blog MySQL data, deleted-app Postgres snapshots). On 2026-04-17, a brief accidental check of this box while the cron happened to fire lost 3 volumes (101 MB, no active Spectacl data). Keep it off unless you've explicitly audited what would be deleted.

## Refactor Notes & Suggestions

### PromptStatus Enum Update

- **Current State**: The `PromptStatus` enum in Prisma and TypeScript uses `"Running"` and `"Paused"`.
- **UI State**: The frontend currently displays these as "Active" and "Inactive".
- **Suggested Refactor**: Perform a unified database migration to change the underlying enum values from `"Running"` -> `"Active"` and `"Paused"` -> `"Inactive"` to align the backend with the user-facing UI and prevent cognitive overhead.

### BYOK (Bring Your Own Key) — Abandoned

- **Status**: BYOK functionality is **not being used** and is **likely being abandoned completely**.
- **Current State**: The database schema still has `priceByok` fields in the `Space` and pricing admin tables, but UI does not expose BYOK options.
- **What This Means**: Don't invest time building out BYOK features. The project focuses on **Managed LLM Service** only.
- **Future Work**: If BYOK returns, the data is preserved in the database; just re-enable the UI forms. **If picked up again, note**: internal task models (`InternalTaskModel` table — see Internal Task Models section) bypass BYOK keys and always run on platform env keys. BYOK customers do not pay for ranking, brand extraction, suggested prompts, competitor discovery, or GEO tactics calls. If BYOK is reintroduced, decide whether secondary calls should also be billable to the customer (would need refactor) or stay platform-absorbed.

### Internal Task Models

Platform-internal LLM calls are decoupled from the customer-facing GlobalModel registry. They live in their own table and are configured via Master LLMs page → Internal Task Models section.

| Task key | Used at | Files |
|---|---|---|
| `ranking` | Ranking / Competitor Analysis prompt analysis (single-model pin, max tokens auto-bumped to 4096) | [analysis.ts:38](src/lib/analysis.ts#L38), [rankings/route.ts:28](src/app/api/entities/[entityId]/rankings/route.ts#L28) |
| `brand_extraction` | After every standard analysis run — scans LLM responses for new brand mentions | [suggestions.ts:38](src/lib/suggestions.ts#L38) |
| `suggested_prompts` | Manual discovery + auto-refill worker | [refillSuggestedPrompts.ts:94](src/lib/queue/refillSuggestedPrompts.ts#L94) |
| `competitor_discovery` | Onboarding + admin regenerate | [suggestions.ts:170](src/lib/suggestions.ts#L170) |
| `aeo_personalization` | Engine-selected AEO tactics get personalized via this LLM (Phase 4). Cache-aware — only personalizes cache-misses. | [selector.ts](src/lib/aeo/selector.ts) |

- **Helper**: `getInternalTaskModel(taskKey)` from [src/lib/internal-models.ts](src/lib/internal-models.ts) — Redis-cached (5min TTL), throws if env API key missing for the configured provider.
- **Free-form models**: Admins can pick any model the provider exposes — does NOT need to be in GlobalModel registry. UI on Master LLMs page provides a "Fetch available models" button that calls `/api/admin/provider-models?provider=<name>` to load live model lists per provider.
- **API keys**: Always pulled from env (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, etc.) — never customer BYOK keys.
- **Admin API**: `GET/PUT /api/admin/internal-models` — admin role required, audit-logged as `internal_model.update`.
- **Cache invalidation**: `invalidateInternalTaskModelCache(taskKey)` is called on save.
- **Defaults**: All 5 tasks seed to `mistral` / `mistral-small-latest` on initial migration (cheap, internal-only).
- **Usage Forecast**: `/admin/usage-forecast` shows per-task model + projected volume (predictable for ranking/brand_extraction, last-7d/30d actuals for on-demand types).
- **Legacy**: The old `ranking_model_id` SystemSettings key has been replaced by the `ranking` row in `InternalTaskModel`. Old key can be deleted once everyone has migrated; the migration seeds a default so no manual step is required.

## Git Policy

> [!CAUTION]
> **Do NOT run any git commands.** No `git add`, `git commit`, `git push`, `git stash`, `git checkout`, or any other git operations. The user manages all version control via Fork (Git GUI). When a coding task is complete, just output a suggested commit message — the user will handle the rest.

## Workflow Orchestration

### 1. Plan Node Default

- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions).
- If something goes sideways, STOP and re-plan immediately - don't keep pushing.
- Use plan mode for verification steps, not just building.
- Write detailed specs upfront to reduce ambiguity.

### 2. Subagent Strategy

- Use subagents liberally to keep main context window clean.
- Offload research, exploration, and parallel analysis to subagents.
- For complex problems, throw more compute at it via subagents.
- One task per subagent for focused execution.

### 3. Self-Improvement Loop

- After ANY correction from the user: update tasks/lessons md with the pattern.
- Write rules for yourself that prevent the same mistake.
- Ruthlessly iterate on these lessons until mistake rate drops.
- Review lessons at session start for relevant project.

### 4. Verification Before Done

- Never mark a task complete without proving it works.
- Diff behavior between main and your changes when relevant.
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness.
- **Always end every coding task with a suggested commit message** — one concise line in the format `type: description` (e.g. `fix: exclude failed results from metrics`). Never run git commands — the user commits via Fork.
- **Update `CLAUDE.md`** alongside the commit message whenever the change is worth noting — new patterns, new files/directories, changed architecture, new conventions, updated env vars, or anything a future AI agent would need to know.

### 5. Demand Elegance (Balanced)

- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution".
- Skip this for simple, obvious fixes - don't over-engineer.
- Challenge your own work before presenting it.

### 6. Autonomous Bug Fixing

- When given a bug report: just fix it. Don't ask for hand-holding.
- Point at logs, errors, failing tests - then resolve them.
- Zero context switching required from the user.
- Go fix failing CI tests without being told how.

---

## Task Management & Core Principles

**Simplicity First**: Make every change as simple as possible. Impact minimal code.
**No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
**Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.
