# Testing Audit — 2026-04-17

## Current state

- **Coverage**: 2.48% statements, 43.96% branch, 12.19% functions, 2.48% lines (from `npm run test:coverage`)
- **Test count**: 25 test files, 338 passing tests
- **Tests existing** (src-local, all co-located): `analysis`, `billing/{access,invoices,plans,tax,trial,vies}`, `chartDataProcessing`, `churnReasons`, `colors`, `domainUtils`, `llm/{factory,retry}`, `metrics/{calculations,snapshots}`, `parsers/{MentionParser,positions}`, `permissions`, `promptUtils`, `rankingUtils`, `rate-limit`, `scheduler-job`, `scheduling`, `sourceStats`, `suggestions`
- **Shared mocks**: only `src/test/mocks/prisma.ts` (98% covered itself)
- **Depth observation**: existing tests are strong on billing primitives (tax 100%, vies 100%, trial 100%, calculations 100%), moderate on orchestration (analysis.ts 94% but via heavy mocking), and missing entirely for transport layers (API routes, workers, Mollie webhook)
- **Biggest gaps by blast radius**: Mollie webhook (0%), confirm-payment route (0%), all of `src/lib/queue/*` including workers and rateLimiter (0%), `subscription-sync.ts` (0%), `cache.ts` (0%), `audit.ts` (0%), `send-email.ts` (4%), `metrics/{dynamic,history,promptMetrics,queryHelpers}.ts` (0%), `spaces.ts` (0%), `auth.ts` (54%, hooks uncovered), middleware.ts (0%, zero coverage), all API routes (0%, not covered at all).

Coverage percentages are low because API routes and workers have never been tested. Pure-logic files already tested are in great shape. The sensible next push is route/worker-level tests behind Prisma/Mollie/Redis mocks, not more pure-logic tests.

---

## Priority order (what to test first, and why)

### Tier 1 — Pure logic (no mocks)

These are high-value, low-effort. Run with `vi.useFakeTimers()` where applicable. Existing 100% coverage on tax/vies/trial/plans pure parts — extend rather than duplicate.

1. **`src/lib/mode.ts`** — `isCloud()`/`isSelfHosted()`/`checkModeConsistency()`. 31% covered. Guards billing bypass everywhere; silently breaking it = free unlimited accounts in prod. Test matrix: `NEXT_PUBLIC_SPECTACL_MODE` unset/cloud/empty-string/other-string; Mollie key present+mode-cloud; Mollie key present+mode-unset (warn path). Use `vi.stubEnv`.
2. **`src/app/api/webhooks/mollie/route.ts` → `addOneMonth` helper** — month-overflow clamp (Jan 31 → Feb 28/29, Feb 29 leap → Feb 28, Mar 31 → Apr 30). Pure function embedded in route file; extract for testing or test via a thin re-export. Wrong math here mis-dates every invoice and period boundary.
3. **`src/lib/llm/retry.ts` edge cases** — 93% covered but existing test likely misses: (a) "429" substring collisions (e.g. error message containing `"ratelimit=429"` vs coincidental `"429 tokens used"`), (b) non-Error throws (strings, numbers, undefined), (c) Error with no `.message` property. Add `MAX_RETRIES` boundary test.
4. **`src/lib/scheduling.ts`** — 97% covered, one uncovered branch at line 57. Probably a DST edge. Complete it — scheduler drift causes missed/doubled scans.
5. **`src/lib/permissions.ts`** — `hasMinRole`, `canManageMembers`, `canEditSpace`, `canDeleteSpace`, `canManageInvitations` are pure but currently 16% covered. 10-line test to pin the role matrix.
6. **`src/app/api/mollie/checkout/route.ts` → `safeReturnPath` sanitizer** — open-redirect guard. Regex allows `/`, but test matrix for: `//evil.com`, `/\\evil`, `javascript:foo`, `/valid/path?x=1#y`, `null`, `undefined`, non-string. Embedded IIFE — extract and test or test via POST.
7. **`src/lib/billing/plans.ts`** — 73% covered. Uncovered: `calculateCreditPrognosis` (line 253-260) and full branch in `getUsagePercentage`/`getFeaturesList` for `maxMembers === 1` vs plural. Cheap to close.
8. **`src/lib/rankingUtils.ts`** — 57% covered. Ranking drives a whole page. Close gap at lines 77-84, 91-97, 101-102.

### Tier 2 — Prisma-mocked (use `src/test/mocks/prisma.ts`)

These are the highest blast-radius gaps. All mock `@/lib/prisma` and stub Mollie/Redis where needed.

1. **`src/app/api/webhooks/mollie/route.ts`** — **P0, critical.** Zero tests. Covers: (a) idempotency claim + rollback on subscription-creation failure, (b) `open`/`pending` ignored before claim, (c) paid-first-payment creates subscription + resets credits + triggers invoice, (d) paid-recurring extends period + resets credits, (e) subscription-cancellation webhook path (verifies via Mollie API, never trusts body), (f) missing `customerId` → INCOMPLETE, no retry claimed, (g) failed-payment → PAST_DUE, (h) self-hosted mode short-circuits. Needs Mollie client mock (see §Mock infrastructure).
2. **`src/app/api/mollie/confirm-payment/route.ts`** — Zero tests. Fast path (webhook-already-won) vs slow path (verify via Mollie API). Test: URL-param forgery rejected, metadata mismatch rejected, status ≠ paid rejected, molliePaymentId missing rejected, and the deliberate "don't set lastProcessedWebhookId" contract.
3. **`src/lib/analysis.ts` → `executeAnalysisJob` credit branches** — 94% covered but the three credit modes (unlimited / negative-allowed / strict atomic floor) are the highest-risk code in the app. Verify the existing test covers all three. Also test: concurrent call races when remaining=1 (`updateMany` with `gt: 0` should succeed for exactly one).
4. **`src/lib/subscription-sync.ts`** — Zero tests. Drift reconciliation correctness: mapping `active`/`canceled`/`completed`/`suspended`/`pending` → local status; skipping in-sync spaces; per-space error isolation; self-hosted short-circuit.
5. **`src/lib/scheduler-job.ts`** — 65% covered. Gap: `processExpiredTrials` (line 145-181) and `expireInvitations` (186-200) untested; also `isLocked` vs `INCOMPLETE` vs expired-trial decision matrix in `processDuePrompts`.
6. **`src/app/api/spaces/[spaceId]/subscription/cancel/route.ts`** — Zero tests. Test: OWNER/ADMIN gate, already-canceled 400, Mollie failure → 502 (no DB write), DB write happens even if email send fails, recipient = OWNER's email when canceller is admin, **null `createdById` handling** (see findings).
7. **`src/app/api/spaces/[spaceId]/transfer/route.ts`** — Zero tests. Ownership-transfer atomicity. Non-OWNER rejected; target must be existing member; self-transfer rejected (check); role swap happens atomically.
8. **`src/app/api/mollie/checkout/route.ts`** — Zero tests. BILLING_PROFILE_REQUIRED gate, VALID_PLANS gate (FOUNDER/ENTERPRISE rejected), tax-adjusted gross amount matches `calculateGrossAmount(netPrice, tax.rate)`, self-hosted short-circuit, OWNER/ADMIN gate, mollieCustomerId reuse vs fresh create.
9. **`src/app/api/spaces/route.ts` POST** — Zero tests. Trial-first vs INCOMPLETE-second space logic. Covers: `hasUsedTrial` flag, self-hosted gets ACTIVE+unlimited, cloud trial gets TRIALING, cloud second space gets INCOMPLETE+zero/full credits (clarify spec — see findings). Slug uniqueness race (see findings).
10. **`src/lib/billing/invoices.ts`** — 89% covered. Fill gaps: the `getNextInvoiceNumber` atomic upsert behaviour (mock raw query); missing `billingProfile` → null; duplicate `molliePaymentId` → idempotent return; prefix fallback chain (custom SystemSetting → "SPE"); null safety on space name.
11. **`src/lib/billing/access.ts`** — 22% covered. `getSpaceAccessStatus` transitions: ACTIVE+past-periodEnd → READ_ONLY/EXPIRED boundaries (just-before, at, just-after, 90d+1). `ensureSpaceWriteAccess` 403 flows (EXPIRED/READ_ONLY), self-hosted always ACTIVE.
12. **`src/lib/cache.ts`** — Zero tests. Redis cache helper. Fail-open contract: Redis throws → computeFn called → value returned. TTL respected. `invalidateCacheByPrefix` correctness.
13. **`src/lib/audit.ts`** — 30 lines, zero tests. Never-throws contract. Prisma rejection swallowed with console.error, returns undefined.
14. **`src/lib/send-email.ts`** — 4% covered. `sendEmail` never-throws, distinguishes Resend API error (result.error) vs exception; `renderEmail` happy path. Needs Resend mock.
15. **`src/middleware.ts`** — Zero tests. Public-route matching (every route in the list), API vs page 401/redirect branching, CSRF origin check (same vs cross vs missing), cookie variants (plain vs `__Secure-` prefix).
16. **`src/lib/rate-limit.ts`** — 43%. Existing test likely covers `resolveEndpointConfig`. Fill: `getClientIp` with `x-forwarded-for` comma-separated list + empty values, `checkRateLimit` fail-open when Redis throws, correct bucket math across window boundaries.
17. **`src/lib/metrics/dynamic.ts`** — 227 lines, zero tests. Drives the main dashboard. Large query surface but pure aggregation once data is stubbed. Prioritize happy path + empty-state.
18. **`src/lib/metrics/history.ts`, `promptMetrics.ts`, `queryHelpers.ts`** — All zero. Raw SQL in history.ts is hard to mock; stub at `prisma.$queryRaw` boundary.
19. **`src/lib/spaces.ts`** — 193 lines, zero tests. Model config resolution, API key fallback logic.

### Tier 3 — Integration flows

Stitch multiple mocked modules together. Each is one end-to-end scenario per file.

1. **Upgrade-then-downgrade** — checkout (STARTER→PRO) → webhook first-payment (cancels old sub, creates new, resets credits) → later webhook recurring → user downgrades to STARTER → same cycle. Validates credit cycle alignment, no double-charge, old-sub cancellation non-fatal.
2. **Trial expiry → lockdown → upgrade** — space in TRIALING, trial end passes, scheduler tick runs `processExpiredTrials`, prompts paused, user starts checkout, payment succeeds, space returns to ACTIVE with prompts still paused (per CLAUDE.md spec: "pause for review").
3. **Space lock → scheduler skip → unlock** — admin locks a space, scheduler `processDuePrompts` skips its prompts with `space_locked`, admin unlocks, next tick processes them.
4. **Credit exhaustion → top-up** — analysis job depletes credits, subsequent pending records fail with "Credit limit reached", webhook recurring payment resets credits, next job succeeds.
5. **Concurrent webhook delivery** — two simultaneous `paid` webhook POSTs for the same `tr_xxx`. Second should hit `claimed.count === 0` and skip. Test with two parallel calls sharing a mock DB.
6. **Webhook subscription-creation failure → Mollie retry** — first call throws mid-subscription-create; rollback resets `lastProcessedWebhookId` to previous value; second call (retry) succeeds.
7. **Cancellation survey → email send** — POST /subscription/cancel with reason, Mollie cancel succeeds, DB update + SpaceDeletionLog + email all happen. Repeat with Mollie failure: DB is NOT updated, no email sent, 502 returned.
8. **Account deletion** — user with owned space invokes `/api/user/export` then deletes. Verify audit log detail stripped, WaitlistEntry removed by email, SetNull cascade on `createdById` leaves space, invoices retained.

---

## Mock infrastructure needed

All proposed under `src/test/mocks/`.

1. **`src/test/mocks/mollie.ts`** — Mock `getMollie()` returning an object with `payments.{create,get}`, `customers.create`, `customerSubscriptions.{create,get,cancel}`, `customerMandates.page`. Ship with helper factories (`mockPaidPayment({...})`, `mockCancellationWebhookPayload(...)`). Blocks: webhook tests, checkout/confirm-payment tests, subscription-sync tests, cancel route tests.
2. **`src/test/mocks/redis.ts`** — In-memory Redis stand-in with `incr`, `expire`, `pipeline`, `get`, `set`, `del`, `keys`. Export a factory so each test can get a fresh instance. Blocks: `cache.ts`, `rate-limit.ts` tests.
3. **`src/test/mocks/bullmq.ts`** — Mock `Queue`/`Worker` constructors. `Queue.add(...)` stores jobs to an in-memory list with `jobId` dedup check (to reproduce the deterministic-jobId contract from scheduler-job.ts). Blocks: scheduler-job tests for the enqueue path, worker unit tests.
4. **`src/test/mocks/llm.ts`** — Mock `createLLMProvider` factory returning a controllable provider. `.generate()` resolves to canned text, or rejects with canned error strings (`"429 rate limit"`, `"503 service unavailable"`, etc.). Blocks: analysis.ts concurrent-credit tests, retry.ts expansion, worker flow tests.
5. **`src/test/mocks/resend.ts`** — Mock `resend.emails.send` with toggle for `{ error: {...} }` vs `{ data: { id: "..." } }` vs thrown exception. Blocks: send-email, cancel route, invoice email, auth magic-link tests.
6. **`src/test/mocks/auth.ts`** — Helper `mockSession({ userId, role, email })` that stubs `auth.api.getSession`. Currently each API-route test would roll its own. Blocks: every authenticated API route test.
7. **`src/test/mocks/systemSettings.ts`** — Mock `SystemSettings.{get,getMany}` for seller info, invoice_prefix, ranking_model_id, allow_negative_credits, trial_days. Many Tier 2 tests need this.

Extend the existing `prisma.ts` mock: add typed helpers for common scenarios (`mockSpaceFound(space)`, `mockMemberFound({role})`, `mockSpaceNotFound()`) to reduce boilerplate. Keep backward compat.

---

## Incidental findings (bugs/drift spotted while reading)

### High severity

1. **`src/lib/queue/analysisWorker.ts:106`** — On job failure, writes `status: 'failure'` but every other site (including `src/lib/analysis.ts:78,347` and all metrics queries at `src/lib/metrics/queryHelpers.ts:83`) uses `status: 'failed'`. Records that fail inside `withTimeout`/worker-level catch will have a status that no downstream code recognizes — they'll be invisible to `failed` filters, never excluded from metrics, never retry-able. **Fix: `'failure'` → `'failed'`.**
2. **`src/app/api/spaces/[spaceId]/subscription/cancel/route.ts:102`** — Passes `space.createdById` directly to `prisma.user.findUnique({ where: { id: space.createdById } })`. Per `CLAUDE.md`, `Space.createdById` is `onDelete: SetNull`. If the original owner deleted their account, `createdById` is `null`, which crashes with `PrismaClientValidationError`. **Fix: guard with `if (!space.createdById) skip email` or send to requester.**
3. **`src/app/api/spaces/route.ts:42-45`** — Slug uniqueness loop runs on `prisma.space.findUnique` (NOT `tx.space`). Two concurrent POSTs for "Acme" both see slug free, both enter the transaction, second hits unique-constraint error, space creation fails with a 500. **Fix: move check into transaction OR retry on P2002 OR append random suffix.**

### Medium severity

4. **`src/lib/llm/retry.ts:17`** — `isRetryableError` uses `error.message.includes('429')` / `'503'`. Any provider that surfaces a token count or domain containing `"429"`/`"503"` would falsely retry. E.g., an LLM error like `"quota: used 4292 of 5000"` retries three times and wastes rate-limit budget. **Fix: use word-boundary regex `/\b(429|503)\b/` or match HTTP status explicitly (`status 429`).**
5. **`src/lib/permissions.ts:184-188`** — `withEntityAuth` with `requireWrite: true` calls `ensureSpaceNotHalted` which itself fetches the session again (see `src/lib/billing/access.ts:54`). Double session fetch on every write-protected route. Not a bug, but wastes a DB/crypto roundtrip on hot paths. **Fix: pass the already-resolved session into a sibling helper that only checks halted-state.**
6. **`src/middleware.ts:22`** — `/monitoring` is listed as a public route. This is the Sentry tunnel, so anonymous access is correct — but it means an attacker can POST arbitrary payloads to Sentry through the tunnel, consuming quota. Low immediate risk (Sentry rate-limits server-side), but worth an abuse-detection log.
7. **`src/lib/auth.ts:64`** — Magic-link sender uses `resend.emails.send(...)` directly, bypassing the `sendEmail()` wrapper. Per `CLAUDE.md`: "All email sends should go through this function for delivery monitoring." Result: magic-link failures are logged differently from every other email. **Fix: rewrite to use `sendEmail({ label: 'magic-link', ... })`.**
8. **`src/app/api/webhooks/mollie/route.ts:258-260`** — `baseDate` logic for recurring-payment period extension: `space.currentPeriodEnd > new Date()` uses the current period end if still in the future. But if a webhook arrives late (e.g. 2 days after period end due to retry), `currentPeriodEnd` is in the past, so it falls back to `new Date()` — which means the user loses 2 days of paid time. **Fix: always use `space.currentPeriodEnd ?? new Date()` even if past.** Trade-off: risk of under-billing vs over-billing; design call.
9. **`src/app/api/spaces/route.ts:71`** — `creditLimit = isTrialing ? trial-credits : ??`. When `isTrialing=false` (second space, INCOMPLETE), `creditDays` is `undefined`, so `calculateMonthlyCreditsFromDb('STARTER', modelCount, undefined)` defaults to 31 days. An INCOMPLETE, unpaid space is created with a full 31-day credit allowance. Scheduler skips it (INCOMPLETE blocked), so no abuse — but if any API path fails to check status, credits are spendable. **Fix: pass `0` credits for INCOMPLETE spaces.**
10. **`src/lib/queue/analysisWorker.ts:36`** — `await job.extendLock(job.id ?? '', 300_000)` passes `''` as fallback job id. If `job.id` is actually undefined, BullMQ's `extendLock` with empty string probably errors or lies about the extension. Log a warning or throw.

### Low severity / drift

11. **`src/lib/scheduler-job.ts:43`** — `spaceMap` uses `prisma.space.findMany({ where: { id: { in: uniqueSpaceIds } } })` but doesn't `select` — over-fetches every space column when only 4 are used. Fine functionally, small efficiency miss.
12. **`src/lib/billing/invoices.ts:100-104`** — `taxTypeMap` uses `Record<string, InvoiceTaxType>`. If `calculateTax` ever returns a `type` not in this map (e.g. future "digital_services"), `taxTypeMap[tax.type]` is `undefined` and the invoice write fails with a Prisma enum error. Defensive default needed.
13. **`src/lib/auth.ts:112`** — `user.create.before` hook sets `tosAcceptedAt` server-side on every signup. GDPR-wise this is a presumption; fine for magic-link/google because signup is the ToS accept action, but drift worth logging in audit trail.
14. **`src/lib/billing/access.ts:44`** — 90-day grace window is hardcoded. Per CLAUDE.md this is fine, but if anyone later adds an admin setting, this breaks silently. Extract to a named constant.
15. **`src/app/api/mollie/checkout/route.ts:103`** — `safeReturnPath` regex `^\/[...]*$` allows `/foo?a=b` but also `/\t\n` (tab/newline URL-encoded). Probably unreachable via a normal client but bad hygiene.
16. **CLAUDE.md drift** — Claims "self-hosted gets `llmCreditsRemaining: -1`" — verified correct in `spaces/route.ts:83`. Claims `subscription-sync.ts` runs on cron — verified via `/api/cron` existence, not inspected here but seems fine.

---

## Recommended sequence for agents 2 and 3

### Agent 2 — Mocks + highest-blast-radius Tier 2

Goal: unlock Tier 2 across the board and land webhook tests. One week of focused work.

1. **Build shared mocks first** (4–6 hours): `mollie.ts`, `redis.ts`, `resend.ts`, `auth.ts`, `systemSettings.ts`. Extend `prisma.ts` with helper factories. Add `bullmq.ts` if time permits, else stub locally.
2. **Mollie webhook tests** (`src/app/api/webhooks/mollie/route.test.ts`) — all cases from Tier 2 item #1. This is P0. Use `supertest`-style invocation of the Next.js `POST` export.
3. **confirm-payment tests** (`src/app/api/mollie/confirm-payment/route.test.ts`) — all forgery/slow-path/fast-path branches.
4. **checkout tests** (`src/app/api/mollie/checkout/route.test.ts`) — tax math sanity via Tier 1 plus BILLING_PROFILE_REQUIRED, VALID_PLANS, self-hosted gates.
5. **cancel route tests** — including the **null `createdById`** finding (flag as a bug fix alongside).
6. **subscription-sync tests** — mapping + per-space error isolation.

Flag findings 1, 2, 3 as blocking — fix them in the same PRs as the tests, since they are real bugs the tests would catch.

### Agent 3 — Tier 1 fill-in + Tier 3 integration + middleware/cache

Goal: round out pure logic, land middleware and cache tests, write one or two integration flows. Finishes what agent 2 doesn't cover.

1. **Tier 1 fills** (2–3 hours): `mode.ts`, `addOneMonth` (extract or test via webhook), retry.ts edge cases, permissions.ts pure helpers, rankingUtils.ts gaps, scheduling.ts line 57, plans.ts gaps, safeReturnPath sanitizer.
2. **middleware.ts tests** — requires `NextRequest` stub. Cover every public-route match, CSRF origin logic, cookie variants.
3. **cache.ts tests** — fail-open contract, TTL, invalidation prefix matching.
4. **audit.ts + send-email.ts tests** — never-throws contracts.
5. **metrics/* tests** — at least `dynamic.ts` (happy path + empty) and `promptMetrics.ts`.
6. **Tier 3 integration flow #1 + #2**: Upgrade-then-downgrade, Trial expiry → lockdown → upgrade. These are the two most user-visible billing flows. Agent 2's route-level tests should make this cheap.
7. **scheduler-job.ts fills** — `processExpiredTrials` and `expireInvitations` (Tier 2 #5).

Coordinate: both agents should avoid touching files the other is actively working on. Merge mocks first, then work in parallel on different route files.

**Estimated coverage after both agents**: ~35–45% statement coverage focused on the critical paths (webhooks, credit math, auth, scheduler, billing). Remaining untested surface is predominantly UI components, hooks, and admin-only routes — lower risk per CLAUDE.md.
