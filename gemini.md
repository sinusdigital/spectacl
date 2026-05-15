# Spectacl - AI Visibility Tracker

## Overview

SaaS platform that tracks how brands appear in AI-powered search results (ChatGPT, Claude, Perplexity, etc.). Users create **Entities** (brands), add **Competitors**, configure **Prompts** (questions to ask LLMs), and analyze the results.

## ⚠️ Critical Rules for Gemini

> [!CAUTION]
> **DO NOT hallucinate or make unnecessary changes!** Follow these rules strictly:

### UI Changes - Senior Engineering Standards

- **PRIORITIZE RADIX UI**: Always use `@radix-ui/themes` primitives (`Flex`, `Box`, `Grid`, `Section`) as the primary layout engine.
- **NO LAYOUT HACKS**: Avoid manual Tailwind width percentages or arbitrary spacing hacks. Use Radix props (`width`, `gap`, `p`, `m`, `flexShrink`) mapped to theme tokens.
- **THEME TOKENS**: When custom CSS is unavoidable, use theme variables (e.g., `var(--space-4)`) instead of hardcoded pixel values or Tailwind's arbitrary values.
- **SURGICAL EDITS ONLY**: Modify only what was explicitly requested. Do not change icons, layouts, or spacing unless asked.
- **ACCESSIBILITY**: Never override Radix accessibility semantics. Use `asChild` for polymorphic rendering.
- **DO NOT** add new features or "improvements" that weren't asked for
- **DO NOT** reorganize components or change their positioning
- **DO NOT** modify colors, spacing, or styling unless that's the request
  **Example:**

- ❌ User asks: "Make the button blue" → You change the button color, icon, size, and position
- ✅ User asks: "Make the button blue" → You change ONLY the button color

### Code Changes - Minimal and Precise

- Read the existing code carefully before making changes
- Preserve existing patterns, conventions, and structure
- If you're unsure about something, **ASK** instead of guessing
- Don't refactor code that isn't broken
- Don't change import statements unless necessary
- Don't reorganize file structure without explicit permission
- **DO NOT** delete any files until a refactor is 100% complete and verified

### When in Doubt

1. **Read this file first** before making any changes
2. **Ask clarifying questions** if the request is ambiguous
3. **Show your plan** before executing major changes
4. **Stick to the request** - no creative liberties

## Self-Maintenance Rule

> [!IMPORTANT]
> **Keep this file current!** After every major change, update this `gemini.md` to reflect the current state.

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
- **Monitoring**: Bull Board dashboard (accessible at `/admin/queues`)
- **Payments**: Mollie (partially integrated, not fully tested in prod)
- **Email**: Resend (dev mode broken — blocks prod waitlist release)
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
- **Production blockers**: Resend email not working in prod, Mollie payments not fully tested
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
├── lib/
│   ├── analysis.ts      # Core analysis logic
│   ├── metrics.ts       # Visibility/sentiment/position calculations
│   ├── llm/             # LLM provider integrations
│   ├── queue/           # BullMQ queue + worker setup
│   └── prisma.ts        # Prisma client singleton
├── workers/             # Background job processors
└── types/               # TypeScript type definitions
```

## Core Data Models

| Model                                 | Purpose                                                                    |
| ------------------------------------- | -------------------------------------------------------------------------- |
| `User`                                | User accounts                                                              |
| `Space`                               | Workspaces (multi-tenant), includes billing/plan info and LLM config       |
| `SpaceModelConfig`                    | LLM model configurations at space level (provider, modelId, enabled state) |
| `Entity`                              | Brand being tracked                                                        |
| `Competitor`                          | Competitor of an entity                                                    |
| `Prompt`                              | Question sent to LLMs, has frequency, intent, status                       |
| `AnalysisResult`                      | LLM response + extracted data                                              |
| `AnalysisMention`                     | Detected mentions of entity/competitors                                    |
| `AnalysisLink`                        | URLs extracted from LLM responses                                          |
| `SuggestedPrompt/SuggestedCompetitor` | AI-generated suggestions                                                   |
| `MetricSnapshot`                      | Aggregated visibility/sentiment metrics                                    |
| `GlobalModel`                         | Global LLM model registry (provider, modelId, displayName, enabled state)  |
| `AuditLog`                            | Admin action audit trail (userId, action, targetType, targetId, detail)     |
| `Domain`                              | Domain Registry — domain, category, isAllowlisted, type, logoUrl           |
| `DomainType`                          | Type catalog for domain classification (name, color, description)           |
| `Ranking`                             | Custom ranking report (has `isArchived`, archiving pauses its prompt)       |
| `BillingProfile`                      | 1:1 with Space — company name, address, country, VAT ID, validation state  |
| `Invoice`                             | Immutable billing snapshot + line items, tax breakdown, sequential number   |
| `InvoiceCounter`                      | Gap-free sequential invoice numbering (year → lastSeq, atomic upsert)      |

## Key Enums

- **PromptStatus**: `Running`, `Paused`
- **PromptFrequency**: `Every6Hours`, `Every24Hours`, `Every2Days`, `Every7Days`
- **SpacePlan**: `FOUNDER`, `STARTER`, `PRO`, `BUSINESS`, `ENTERPRISE`
- **LLMProvider**: `MANAGED` (Spectacl provides API), `BYOK` (Bring Your Own Key)
- **SpaceRole**: `OWNER`, `ADMIN`, `MEMBER`
- **SubscriptionStatus**: `ACTIVE`, `TRIALING`, `PAST_DUE`, `CANCELED`, `INCOMPLETE`
- **InvoiceTaxType**: `STANDARD` (21% BTW), `REVERSE_CHARGE` (0% EU B2B), `EXEMPT` (0% non-EU)

## Patterns & Conventions

- **API Routes**: Located at `src/app/api/[resource]/route.ts`
- **Entity-scoped routes**: Use `[entityId]` param in path
- **Client components**: Import `auth-client.ts` for auth hooks
- **Server components**: Import `auth.ts` for session checks
- **Background jobs**: Enqueue via `src/lib/queue/analysisQueue.ts`
- **Testing**: DO NOT use `browser_subagent` for UI or visual verification. The user prefers to test manually in their own browser and takes screenshots themselves. NEVER attempt to take a screenshot or use the browser agent to "verify" the UI unless specifically asked.
- **Notifications**: Use `useToast()` from `@/components/Shared/RadixToast` instead of `alert()` or browser notifications.
- **Plan Configuration**: Managed via `src/lib/billing/plans.ts` (defaults) and `/admin/pricing` (DB overrides stored in `SystemSetting`).
- **Plan UI**: Use the `PlanBadge` component for all plan chips to ensure consistent color mapping across the app.
- **Dependency Management**: Use `npm install --force` if React 19 peer dependency conflicts occur.

## Billing & Payments (Mollie)

### Architecture
- **Checkout**: `POST /api/mollie/checkout` creates a first payment with `sequenceType: first`. Requires `BillingProfile` — returns `BILLING_PROFILE_REQUIRED` (400) if missing. Tax-adjusted amount: NL/EU-without-valid-VAT pay price × 1.21, others pay net.
- **Recurring**: Mollie auto-charges monthly. Webhook extends `currentPeriodEnd` and resets credits.
- **Cancellation**: Multi-step survey modal → `POST /api/spaces/{spaceId}/subscription/cancel` → Mollie subscription canceled → email sent.

### VAT & Invoices
- **B2B-only**: All prices ex-VAT. ToS declares B2B-only. 3 VAT scenarios: NL domestic (21% BTW), EU with valid VIES VAT ID (0% reverse charge), non-EU (0% exempt). Missing/invalid VAT ID defaults to 21%.
- **Tax calculation**: Pure function `calculateTax()` in `src/lib/billing/tax.ts`. Zero imports, zero DB.
- **VIES validation**: `src/lib/billing/vies.ts` — EU REST API, 10s timeout, graceful fallback.
- **Invoice generation**: Fire-and-forget in webhook. Sequential numbering via atomic SQL upsert (`INV-YYYY-NNNN`). Immutable billing snapshot.
- **PDF**: On-demand via `@react-pdf/renderer`. No file storage.
- **Upgrade UX**: Multi-step in `UpgradeRequiredModal`: plan → billing address (if no profile) → Mollie checkout.
- **Decoupled**: All new modules (`tax.ts`, `vies.ts`, `invoices.ts`, `invoice-pdf.ts`) in `src/lib/billing/` with zero imports from plans.ts/access.ts/trial.ts.

### Key Files
| File | Purpose |
|------|---------|
| `src/lib/billing/tax.ts` | Pure VAT calculation (3 scenarios) |
| `src/lib/billing/vies.ts` | VIES VAT ID validation |
| `src/lib/billing/invoices.ts` | Invoice creation orchestrator |
| `src/lib/billing/invoice-pdf.ts` | PDF generation |
| `src/app/api/billing/profile/route.ts` | Billing profile GET/PUT |
| `src/app/api/billing/invoices/route.ts` | List invoices for space |
| `src/app/api/billing/invoices/[id]/route.ts` | Invoice JSON or PDF download |
| `src/app/api/admin/invoices/route.ts` | All invoices paginated (admin) |
| `src/components/Billing/BillingAddressForm.tsx` | Reusable billing form |
| `src/components/Settings/InvoiceHistory.tsx` | Invoice list table |

## Environment Variables

Key vars in `.env`:

- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis for BullMQ
- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY` - LLM providers

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

### Scaling Roadmap

| Phase | What | When | Status |
|-------|------|------|--------|
| 1 | Per-provider rate limiting (Bottleneck + Redis) | Before 50 users | ✅ Done |
| 2 | Snapshot deduplication (Redis counter, 40× reduction) | Before 200 users | 🔲 Planned |
| 3 | Staggered scheduling + horizontal worker scaling | Before 500 users | 🔲 Planned |

### Performance Notes

- **Admin docs page:** `/admin/performance` — full documentation of DB query optimization opportunities
- **`getDynamicMetrics`** (`src/lib/metrics/dynamic.ts`): Uses 12 Prisma queries in `$transaction`. Raw SQL consolidation (12 → 3 queries) is shelved — implement before 500+ users or when dashboard latency > 500ms
- **`history.ts`** uses raw SQL because Prisma can't express `GROUP BY DATE()` — this is a Prisma limitation, not a performance choice
- **`snapshots.ts`**: 24-30 sequential queries per entity update — can be batched into `$transaction` arrays (pure Prisma fix)

## Gotchas & Pitfalls

### UI Components

- **Component Library**: Use `@radix-ui/themes` for all core UI components (Buttons, Tables, Layouts, Dialogs) instead of raw Tailwind CSS wrapping unstyled primitives.
- **Icons**: Use `@radix-ui/react-icons`. Exception: Custom SVGs (e.g. `BuildingIcon`). Forbidden: `@heroicons/react`, `lucide-react`.
- **Layout**: Utilize Radix Themes `Flex`, `Grid`, and `Box` primitives where appropriate, otherwise preserve existing flex/grid layouts.
- **Colors**: Stick to existing color palette mapped through the `<Theme>` provider unless asked to change

### Code Patterns

- **Imports**: Don't reorganize imports unless there's a real issue
- **Component Structure**: Don't refactor working components
- **File Organization**: Don't move files around without permission

### Database

- **Migrations**: Always create migrations for schema changes, don't just edit the schema
- **Relations**: LLM config is at **Space level**, not Entity level (as of Feb 2026)
- **Cascading Deletes**: Be careful with `onDelete: Cascade` - understand the impact

### Deployment

- **Build Process**: Migrations run during build, not at runtime
- **Environment**: Production uses Coolify with Nixpacks
- **Worker**: Background worker must run alongside the web server

### Next.js Specific

- **useSearchParams**: Must be wrapped in `<Suspense>` boundary to avoid production build failures
  - Add `export const dynamic = 'force-dynamic'` to the page
  - See `src/app/login/page.tsx` for the correct pattern
  - Failing to do this will cause: "useSearchParams() should be wrapped in a suspense boundary"
