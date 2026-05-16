"use client";

import PageHeader from "@/components/Shared/PageHeader";
import {
    CheckCircledIcon,
    CircleIcon,
    DotFilledIcon,
    ExclamationTriangleIcon,
} from "@radix-ui/react-icons";
import {
    Container,
    Box,
    Flex,
    Grid,
    Heading,
    Text,
    Card,
    Badge,
    Callout,
    Separator,
} from "@radix-ui/themes";

// ── Types ─────────────────────────────────────────────────────────────────────

type Priority = "critical" | "high" | "medium";
type Phase = 0 | 1 | 2;
type Status = "done" | "in-progress" | "todo";

type Domain =
    | "billing"
    | "auth"
    | "spaces"
    | "workers"
    | "performance"
    | "observability";

interface Issue {
    id: number;
    priority: Priority;
    domain: Domain;
    phase: Phase;
    title: string;
    detail: string;
    effort: "small" | "medium" | "large";
    status: Status;
    file?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const DOMAIN_LABELS: Record<Domain, string> = {
    billing: "Billing & Payments",
    auth: "Auth & Security",
    spaces: "User & Space Mgmt",
    workers: "LLM Pipeline & Workers",
    performance: "Caching & Performance",
    observability: "Admin & Observability",
};

const DOMAIN_COLORS: Record<Domain, string> = {
    billing: "orange",
    auth: "red",
    spaces: "blue",
    workers: "purple",
    performance: "teal",
    observability: "gray",
};

function PriorityBadge({ priority }: { priority: Priority }) {
    const color =
        priority === "critical"
            ? "red"
            : priority === "high"
              ? "orange"
              : "yellow";
    return (
        <Badge color={color} variant="soft" size="1">
            {priority.toUpperCase()}
        </Badge>
    );
}

function StatusIcon({ status }: { status: Status }) {
    if (status === "done")
        return (
            <CheckCircledIcon
                width="14"
                height="14"
                color="var(--green-9)"
            />
        );
    if (status === "in-progress")
        return (
            <DotFilledIcon width="16" height="16" color="var(--blue-9)" />
        );
    return <CircleIcon width="14" height="14" color="var(--gray-7)" />;
}

function StatusBadge({ status }: { status: Status }) {
    if (status === "done")
        return (
            <Badge color="green" variant="soft" size="1">
                Done
            </Badge>
        );
    if (status === "in-progress")
        return (
            <Badge color="blue" variant="soft" size="1">
                In Progress
            </Badge>
        );
    return (
        <Badge color="gray" variant="soft" size="1">
            Todo
        </Badge>
    );
}

function DomainBadge({ domain }: { domain: Domain }) {
    return (
        <Badge
            color={DOMAIN_COLORS[domain] as never}
            variant="outline"
            size="1"
        >
            {DOMAIN_LABELS[domain]}
        </Badge>
    );
}

function EffortBadge({ effort }: { effort: Issue["effort"] }) {
    const color =
        effort === "small" ? "green" : effort === "medium" ? "blue" : "orange";
    return (
        <Badge color={color} variant="soft" size="1">
            {effort}
        </Badge>
    );
}

function borderColor(issue: Issue): string {
    if (issue.status === "done") return "green";
    if (issue.priority === "critical") return "red";
    if (issue.priority === "high") return "orange";
    return "yellow";
}

// ── Data ──────────────────────────────────────────────────────────────────────

const ISSUES: Issue[] = [
    // ╔══════════════════════════════════════════════════════════════════════╗
    // ║ PHASE 0 — Ship Blockers                                           ║
    // ╚══════════════════════════════════════════════════════════════════════╝

    // Auth & Security
    {
        id: 1,
        priority: "critical",
        domain: "auth",
        phase: 0,
        title: "Rate limiting on auth endpoints",
        detail: "Redis fixed-window rate limiting: signup 5/hr, login 10/min, magic link 5/15min, other POST 30/min. Fail-open if Redis is down. Returns 429 with Retry-After header.",
        effort: "small",
        status: "done",
        file: "src/lib/rate-limit.ts",
    },

    // Billing
    {
        id: 2,
        priority: "critical",
        domain: "billing",
        phase: 0,
        title: "Trial expiry enforcement",
        detail: "Backend: scheduler sweeps expired trials → INCOMPLETE, pauses prompts. Frontend: non-dismissable TrialExpiredModal blocks app when trial expires, with 'Choose a plan' and 'Switch Workspace' options. Client-side early detection before cron runs.",
        effort: "medium",
        status: "done",
        file: "src/components/Shared/TrialExpiredModal.tsx",
    },
    {
        id: 3,
        priority: "critical",
        domain: "billing",
        phase: 0,
        title: "Webhook verification via Mollie API fetch-back",
        detail: "Already implemented: webhook never trusts POST body — immediately fetches payment/subscription from Mollie API to verify. Mollie SDK v4.4.0 has no HMAC support; fetch-back is their recommended pattern. Atomic idempotency via lastProcessedWebhookId.",
        effort: "small",
        status: "done",
        file: "src/app/api/webhooks/mollie/route.ts",
    },
    {
        id: 4,
        priority: "critical",
        domain: "billing",
        phase: 0,
        title: "Credit race condition floor check",
        detail: "Fixed: credit deduction uses updateMany with WHERE llmCreditsRemaining > 0. Concurrent workers can no longer push credits negative. Logs a warning if deduction is skipped at zero.",
        effort: "small",
        status: "done",
        file: "src/lib/analysis.ts",
    },

    // Observability
    {
        id: 5,
        priority: "critical",
        domain: "observability",
        phase: 0,
        title: "No error tracking service",
        detail: "Sentry Cloud (free tier) integrated. @sentry/nextjs v10, org sinus-digital-bv, project javascript-nextjs. Browser SDK with Session Replay (5%) + tracing (10%). Server SDK with localVariables. Edge SDK. Global error boundary at global-error.tsx. Tunnel route at /monitoring bypasses ad blockers. CSP updated. Source map upload disabled until SENTRY_AUTH_TOKEN is configured in Coolify. Only active in production.",
        effort: "small",
        status: "done",
    },
    {
        id: 6,
        priority: "critical",
        domain: "observability",
        phase: 0,
        title: "No database backup strategy",
        detail: "HIGHEST PRIORITY. HOW: 1) SSH into Hetzner CX33. 2) Create /opt/backups/ dir. 3) Add cron: 0 3 * * * pg_dump $DATABASE_URL | gzip > /opt/backups/spectacl-$(date +\\%Y\\%m\\%d).sql.gz. 4) Add retention cron: 0 4 * * * find /opt/backups -name '*.sql.gz' -mtime +14 -delete. 5) Optional: rclone sync to Hetzner Object Storage for offsite. Verify: run pg_dump manually, check file size, test restore with pg_restore on dev.",
        effort: "medium",
        status: "todo",
    },

    // Workers
    {
        id: 7,
        priority: "critical",
        domain: "workers",
        phase: 0,
        title: "Dead Letter Queue (DLQ) retention",
        detail: "Fixed: removeOnFail set to false — failed jobs are never auto-deleted and stay permanently for inspection via /admin/queues. Combined with 3 retry attempts and exponential backoff.",
        effort: "small",
        status: "done",
        file: "src/lib/queue/analysisQueue.ts",
    },
    {
        id: 8,
        priority: "critical",
        domain: "workers",
        phase: 0,
        title: "Job timeout for analysis workers",
        detail: "Fixed: 5-minute hard timeout via Promise.race wrapper frees worker slot if LLM call hangs. Combined with BullMQ stall detection (lockDuration: 5min, stalledInterval: 2min) for defense in depth.",
        effort: "small",
        status: "done",
        file: "src/lib/queue/analysisWorker.ts",
    },
    {
        id: 9,
        priority: "critical",
        domain: "workers",
        phase: 0,
        title: "Redis is a single point of failure",
        detail: "HOW: In Coolify Redis service settings, add custom redis.conf: appendonly yes, appendfsync everysec, save 900 1, save 300 10. This enables AOF (append-only file) for durability + RDB snapshots as safety net. Mount a persistent volume for /data. Verify: redis-cli CONFIG GET appendonly should return 'yes'. On restart, Redis auto-loads from AOF. No failover needed at current scale — single server.",
        effort: "medium",
        status: "todo",
    },
    {
        id: 10,
        priority: "critical",
        domain: "workers",
        phase: 0,
        title: "Cron auth is mandatory",
        detail: "Fixed: CRON_SECRET is now required. If not configured, all cron requests return 500. No fallthrough path — unauthenticated requests are always rejected.",
        effort: "small",
        status: "done",
        file: "src/app/api/cron/route.ts",
    },

    // Spaces
    {
        id: 11,
        priority: "critical",
        domain: "spaces",
        phase: 0,
        title: "Member limit enforced on invitation accept",
        detail: "Fixed: re-checks member count against plan limit at accept time using getPlanLimitsFromDb. Returns 403 with clear message if space is at capacity. Respects admin pricing overrides.",
        effort: "small",
        status: "done",
        file: "src/app/api/invitations/[token]/route.ts",
    },

    // ╔══════════════════════════════════════════════════════════════════════╗
    // ║ PHASE 1 — First 2 weeks                                          ║
    // ╚══════════════════════════════════════════════════════════════════════╝

    // Billing
    {
        id: 12,
        priority: "critical",
        domain: "billing",
        phase: 1,
        title: "No plan upgrade/downgrade flow",
        detail: "Implemented: UpgradeRequiredModal shows available plans (current plan disabled). Clicking a plan calls POST /api/mollie/checkout (first payment). On successful payment, the webhook cancels the old Mollie subscription immediately and creates a new one. Credits are reset to match the new plan. Overlap is accepted (user may have days remaining on old plan — treated as a free upgrade perk).",
        effort: "medium",
        status: "done",
    },
    {
        id: 13,
        priority: "critical",
        domain: "billing",
        phase: 1,
        title: "No payment method update flow",
        detail: "Users can't update their card when it expires, leading to involuntary churn on the next billing cycle.",
        effort: "medium",
        status: "todo",
    },
    {
        id: 14,
        priority: "critical",
        domain: "billing",
        phase: 1,
        title: "Mollie failure handling in checkout",
        detail: "Already implemented: checkout route wraps all Mollie API calls (customer.create, payments.create) in try/catch. Returns 401/403/404/400 for validation failures, 500 for Mollie network errors. Generic error message is safe.",
        effort: "small",
        status: "done",
        file: "src/app/api/mollie/checkout/route.ts",
    },

    // Observability
    {
        id: 15,
        priority: "critical",
        domain: "observability",
        phase: 1,
        title: "No external health monitoring",
        detail: "HOW: 1) Sign up for UptimeRobot (free tier, 50 monitors). 2) Add HTTP monitor pointing to https://app.spectacl.org/api/health — expects 200. 3) Set check interval to 5 minutes. 4) Add alert contacts (email + Slack/Discord webhook). 5) Add second monitor for https://dev.spectacl.org/api/health. 6) Optional: add keyword monitor for cron endpoint to verify scheduler is alive.",
        effort: "small",
        status: "todo",
    },
    {
        id: 16,
        priority: "critical",
        domain: "observability",
        phase: 1,
        title: "Email delivery monitoring",
        detail: "Fixed: centralized sendEmail() wrapper in src/lib/send-email.ts. All email sends (invitation, cancellation, resend) go through it — logs Resend email ID on success, error details on failure, never throws. Auth magic link already had its own logging. Next step: add Resend webhook for bounce/delivery events and EmailLog DB model.",
        effort: "small",
        status: "done",
        file: "src/lib/send-email.ts",
    },

    // Workers
    {
        id: 17,
        priority: "critical",
        domain: "workers",
        phase: 1,
        title: "Job idempotency keys",
        detail: "Fixed: deterministic jobId (prompt-{id}-{hourBucket}) prevents duplicate enqueues from concurrent scheduler ticks. BullMQ silently rejects duplicate jobIds. Hourly bucket allows re-enqueue in the next window.",
        effort: "small",
        status: "done",
        file: "src/lib/scheduler-job.ts",
    },
    {
        id: 18,
        priority: "critical",
        domain: "workers",
        phase: 1,
        title: "SDK-level retries for transient LLM errors",
        detail: "Fixed: withLLMRetry wrapper adds exponential backoff (1s → 2s → 4s, 3 retries) for 429 and 503 errors. Applied at the generate() call site in analysis.ts, inside the rate limiter schedule. Non-retryable errors (400, 401, etc.) are rethrown immediately. Prevents wasteful full-job retries via BullMQ.",
        effort: "small",
        status: "done",
        file: "src/lib/llm/retry.ts",
    },

    // Auth
    {
        id: 19,
        priority: "high",
        domain: "auth",
        phase: 1,
        title: "Content Security Policy headers",
        detail: "Fixed: CSP, X-Frame-Options (DENY), HSTS (1yr), X-Content-Type-Options (nosniff), Referrer-Policy, Permissions-Policy all set via next.config.js headers(). CSP uses unsafe-inline/eval (required by Next.js); nonce-based CSP deferred to Phase 2.",
        effort: "small",
        status: "done",
        file: "next.config.js",
    },

    // Observability
    {
        id: 20,
        priority: "critical",
        domain: "observability",
        phase: 1,
        title: "No audit trail for admin actions",
        detail: "Fixed: AuditLog model in Prisma with auditLog() helper (best-effort, never throws). All 18 admin mutation endpoints log action, target, detail JSON. Admin page at /admin/audit-log with table, action filter, and pagination.",
        effort: "medium",
        status: "done",
    },

    // Performance
    {
        id: 21,
        priority: "critical",
        domain: "performance",
        phase: 1,
        title: "No DB connection pooling configured",
        detail: "HOW: Append ?connection_limit=25&pool_timeout=10 to DATABASE_URL in Coolify env vars. Prisma defaults to num_cpus*2+1 (9 on CX33), but worker runs 25 concurrent jobs. Set connection_limit >= worker concurrency. Verify: after restart, run SELECT count(*) FROM pg_stat_activity WHERE datname='spectacl' to check active connections. Alternative: reduce worker concurrency to 10 in analysisWorker.ts.",
        effort: "medium",
        status: "todo",
    },

    // Spaces
    {
        id: 22,
        priority: "high",
        domain: "spaces",
        phase: 1,
        title: "Invitation token expiry",
        detail: "Already implemented: invitations are created with 7-day expiry (expiresAt.setDate(+7)). Both GET (preview) and POST (accept) handlers check expiresAt and return 410 if expired. No action needed.",
        effort: "small",
        status: "done",
        file: "src/app/api/invitations/[token]/route.ts",
    },

    // Billing
    {
        id: 23,
        priority: "high",
        domain: "billing",
        phase: 1,
        title: "Dunning/grace period UI",
        detail: "Fixed: DunningBanner component shows orange warning when subscription is PAST_DUE. Non-blocking — users keep full access during Mollie's automatic retry period. Banner renders in AppShell between payment return handler and cancellation banner. Payment method update CTA will be added when issue #13 is implemented.",
        effort: "medium",
        status: "done",
        file: "src/components/Shared/DunningBanner.tsx",
    },
    {
        id: 24,
        priority: "high",
        domain: "billing",
        phase: 1,
        title: "No subscription status sync job",
        detail: "Fixed: syncSubscriptions() runs on each cron tick. Fetches real subscription status from Mollie API for all spaces with mollieSubscriptionId (ACTIVE, PAST_DUE, INCOMPLETE). Corrects drift with per-space error isolation. Read-only against Mollie — never creates or cancels subscriptions. Credits are NOT reset (that's the webhook's job on payment events).",
        effort: "medium",
        status: "done",
        file: "src/lib/subscription-sync.ts",
    },

    // Performance
    {
        id: 25,
        priority: "high",
        domain: "performance",
        phase: 1,
        title: "HTTP caching headers on API responses",
        detail: "Fixed: Cache-Control headers added to near-static endpoints — languages (5min/10min), plan-limits (60s/120s + stale-while-revalidate), domain-types (5min/10min). Entity-specific, metrics, user, and auth routes intentionally uncached.",
        effort: "small",
        status: "done",
    },
    {
        id: 26,
        priority: "high",
        domain: "performance",
        phase: 1,
        title: "Redis caching for frequently-read data",
        detail: "Fixed: Redis-backed cache utility (src/lib/cache.ts) with fail-open design. Cache invalidation wired to admin plan-limits PUT and global-models POST/PATCH routes. Cache keys prefixed with spectacl:cache:. Note: plans.ts cannot use Redis caching directly because it is imported by client components (ioredis is Node-only). HTTP Cache-Control headers on API routes handle client-side caching instead. Use cached() from server-only files.",
        effort: "small",
        status: "done",
        file: "src/lib/cache.ts",
    },

    // ╔══════════════════════════════════════════════════════════════════════╗
    // ║ PHASE 2 — First month                                             ║
    // ╚══════════════════════════════════════════════════════════════════════╝

    // Spaces
    {
        id: 27,
        priority: "critical",
        domain: "spaces",
        phase: 2,
        title: "No GDPR data export",
        detail: "Fixed: 'Download my data' button in Settings > Privacy & Data. Exports JSON with user profile, space memberships, entities created, billing profiles, invoices, audit log entries, and invitations (sent + received). GET /api/user/export generates on-demand.",
        effort: "medium",
        status: "done",
        file: "src/app/api/user/export/route.ts",
    },
    {
        id: 28,
        priority: "critical",
        domain: "spaces",
        phase: 2,
        title: "No ownership transfer flow",
        detail: "Fixed: POST /api/spaces/[spaceId]/transfer atomically promotes target to OWNER and demotes caller to ADMIN via $transaction. Validates caller is OWNER, target is existing member, prevents self-transfer. UI integration pending.",
        effort: "medium",
        status: "done",
    },
    {
        id: 29,
        priority: "critical",
        domain: "spaces",
        phase: 2,
        title: "Account deletion orphans data",
        detail: "Fixed: Schema cascade rules ensure clean deletion. Entity.userId → SetNull (entity stays in space). Space.createdById → SetNull (space stays). SpaceInvitation → Cascade (stale invites deleted). SpaceMember.invitedById → SetNull. AuditLog.userId → SetNull (logs persist). DELETE endpoint still blocks if user owns spaces.",
        effort: "medium",
        status: "done",
    },

    // Billing
    {
        id: 30,
        priority: "critical",
        domain: "billing",
        phase: 2,
        title: "No invoices or tax compliance",
        detail: "No invoice generation, no VAT handling. Legal requirement for B2B SaaS in the EU.",
        effort: "large",
        status: "done",
    },

    // Workers
    {
        id: 31,
        priority: "high",
        domain: "workers",
        phase: 2,
        title: "No per-space rate limits on workers",
        detail: "One space with 200 prompts can starve all other spaces of worker capacity. Needs per-space concurrency limits.",
        effort: "medium",
        status: "todo",
    },
    {
        id: 32,
        priority: "high",
        domain: "workers",
        phase: 2,
        title: "No circuit breaker for LLM providers",
        detail: "If one LLM provider goes down, jobs targeting that provider block worker slots instead of failing fast.",
        effort: "medium",
        status: "todo",
    },

    // Performance
    {
        id: 33,
        priority: "critical",
        domain: "performance",
        phase: 2,
        title: "Snapshot N+1 queries",
        detail: "Fixed: Batched 5-6 sequential reads per snapshot into a single $transaction (1 DB roundtrip each). Entity + competitor snapshots now run in parallel via Promise.all instead of sequential loops. ~80% reduction in DB roundtrips.",
        effort: "medium",
        status: "done",
        file: "src/lib/metrics/snapshots.ts",
    },
    {
        id: 34,
        priority: "high",
        domain: "performance",
        phase: 2,
        title: "Dashboard getDynamicMetrics runs 12 queries per load",
        detail: "Each dashboard visit fires 12 Prisma queries in a $transaction. Mitigated by snapshots, but the fallback path is expensive.",
        effort: "medium",
        status: "todo",
        file: "src/lib/metrics/dynamic.ts",
    },

    // Auth
    {
        id: 35,
        priority: "high",
        domain: "auth",
        phase: 2,
        title: "No CSRF protection on state-changing API routes",
        detail: "Fixed: Middleware validates Origin header on POST/PUT/PATCH/DELETE for authenticated routes. Cross-origin requests are rejected with 403. Public routes (webhooks, auth, cron) are exempt — they bypass the check before reaching the CSRF guard. Same-origin requests without Origin header are safe via SameSite cookies.",
        effort: "medium",
        status: "done",
    },

    // Spaces
    {
        id: 36,
        priority: "high",
        domain: "spaces",
        phase: 2,
        title: "No email change flow",
        detail: "Users cannot change their email address after account creation. Requires re-verification logic.",
        effort: "medium",
        status: "todo",
    },

    // Observability
    {
        id: 37,
        priority: "high",
        domain: "observability",
        phase: 2,
        title: "No user-facing status page",
        detail: "Users cannot distinguish between a platform outage and a local issue. A simple status page builds trust.",
        effort: "medium",
        status: "todo",
    },

    // Workers
    {
        id: 38,
        priority: "medium",
        domain: "workers",
        phase: 2,
        title: "No job progress tracking",
        detail: "Already implemented: MetricTriplet shows spinning loaders while isAnalyzing. AnalysisStatusIndicator shows Queued/Running badges with pulse animation. AnalysisResultGridCard renders skeleton cards with progressStep text. PromptsPage auto-polls every 3s while any result is pending/running. Per-model status tracking via AnalysisResult.status field.",
        effort: "medium",
        status: "done",
    },

    // Auth
    {
        id: 39,
        priority: "medium",
        domain: "auth",
        phase: 2,
        title: "Entity ownership not validated consistently",
        detail: "Fixed: Added withEntityAuth() to /api/entities/[entityId]/domains/[domain] PATCH and DELETE (was completely unprotected). Added space membership check to [entityId]/layout.tsx — server-side redirect prevents unauthorized users from seeing entity pages. All other entity API routes already used withEntityAuth().",
        effort: "medium",
        status: "done",
    },

    // Billing
    {
        id: 40,
        priority: "medium",
        domain: "billing",
        phase: 2,
        title: "Model count changes cause mid-cycle credit drift",
        detail: "Fixed: Admin pricing page has 'Allow negative credits' toggle (systemSetting allow_negative_credits). When enabled, spaces continue past zero credits instead of being blocked. Drift auto-corrects at next credit reset. Monitor negative balances manually for misuse.",
        effort: "small",
        status: "done",
    },

    // Observability
    {
        id: 41,
        priority: "critical",
        domain: "observability",
        phase: 1,
        title: "DB health check endpoint",
        detail: "Fixed: /api/health endpoint runs SELECT 1 against Postgres. Returns 200 + timestamp when healthy, 503 when DB is unreachable. No auth required — designed for UptimeRobot, Coolify health probes, and load balancers.",
        effort: "medium",
        status: "done",
        file: "src/app/api/health/route.ts",
    },
];

// ── Solid foundations (already production-ready) ──────────────────────────────

const SOLID: { area: string; detail: string }[] = [
    {
        area: "Authentication flow",
        detail: "Magic link + password login via better-auth, session management, secure token handling",
    },
    {
        area: "RBAC",
        detail: "OWNER / ADMIN / MEMBER roles enforced throughout API routes and UI",
    },
    {
        area: "Entity access control",
        detail: "IDOR prevention — entity routes verify space membership before returning data",
    },
    {
        area: "Space locking",
        detail: "Admin misuse detection with non-dismissable modal, scheduler skip, prompt pause",
    },
    {
        area: "Analysis pipeline",
        detail: "Core LLM calls, per-provider rate limiting (Bottleneck + Redis), priority lanes",
    },
    {
        area: "Credit system",
        detail: "Dynamic calculation, per-call deduction, trial-awareness, exhaustion guard",
    },
    {
        area: "Admin dashboard",
        detail: "Spaces, workers, emails, pricing, modals — all have admin views with live data",
    },
    {
        area: "Webhook idempotency",
        detail: "Atomic compare-and-set on lastProcessedWebhookId prevents duplicate processing",
    },
    {
        area: "Email system",
        detail: "Resend + React Email with shared layout, 2 consolidated from-addresses",
    },
    {
        area: "Metric snapshots",
        detail: "Pre-calculated snapshots reduce dashboard query load, fallback to dynamic calculation",
    },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LaunchIssuesPage() {
    const openIssues = ISSUES.filter((i) => i.status !== "done");
    const doneIssues = ISSUES.filter((i) => i.status === "done");

    const phase0 = openIssues.filter((i) => i.phase === 0);
    const phase1 = openIssues.filter((i) => i.phase === 1);
    const phase2 = openIssues.filter((i) => i.phase === 2);

    const criticalOpen = openIssues.filter((i) => i.priority === "critical");
    const highOpen = openIssues.filter((i) => i.priority === "high");
    const mediumOpen = openIssues.filter((i) => i.priority === "medium");

    // Domain breakdown
    const domainCounts = (Object.keys(DOMAIN_LABELS) as Domain[]).map((d) => ({
        domain: d,
        label: DOMAIN_LABELS[d],
        total: ISSUES.filter((i) => i.domain === d).length,
        open: openIssues.filter((i) => i.domain === d).length,
        critical: openIssues.filter(
            (i) => i.domain === d && i.priority === "critical"
        ).length,
    }));

    return (
        <Container size="4" p="6">
            <Box mb="8">
                <PageHeader
                    title="Launch Issues"
                    description="SaaS launch readiness audit — prioritised issues across all epics. Last audit: 6 April 2026."
                />
            </Box>

            <Flex direction="column" gap="8">
                {/* ── Verdict ── */}
                <Callout.Root color="orange" size="2">
                    <Callout.Icon>
                        <ExclamationTriangleIcon />
                    </Callout.Icon>
                    <Callout.Text>
                        <Text weight="bold">Verdict: NOT READY for public launch.</Text>{" "}
                        {criticalOpen.length} critical issues across 6 domains must
                        be resolved before removing the waitlist. The foundation is
                        solid — fix Phase 0 items, then launch to a controlled beta.
                    </Callout.Text>
                </Callout.Root>

                {/* ── Summary cards ── */}
                <Grid columns={{ initial: "1", sm: "2", md: "4" }} gap="4">
                    <Card size="2">
                        <Flex direction="column" gap="1">
                            <Text size="1" color="gray" weight="medium">
                                Total Issues
                            </Text>
                            <Flex align="baseline" gap="2">
                                <Text size="6" weight="bold">
                                    {ISSUES.length}
                                </Text>
                                <Text size="2" color="gray">
                                    {openIssues.length} open, {doneIssues.length}{" "}
                                    done
                                </Text>
                            </Flex>
                        </Flex>
                    </Card>
                    <Card size="2">
                        <Flex direction="column" gap="1">
                            <Text size="1" color="gray" weight="medium">
                                Critical
                            </Text>
                            <Flex align="baseline" gap="2">
                                <Text
                                    size="6"
                                    weight="bold"
                                    color={
                                        criticalOpen.length > 0
                                            ? "red"
                                            : "green"
                                    }
                                >
                                    {criticalOpen.length}
                                </Text>
                                <Text size="2" color="gray">
                                    open
                                </Text>
                            </Flex>
                        </Flex>
                    </Card>
                    <Card size="2">
                        <Flex direction="column" gap="1">
                            <Text size="1" color="gray" weight="medium">
                                High
                            </Text>
                            <Flex align="baseline" gap="2">
                                <Text
                                    size="6"
                                    weight="bold"
                                    color={
                                        highOpen.length > 0
                                            ? "orange"
                                            : "green"
                                    }
                                >
                                    {highOpen.length}
                                </Text>
                                <Text size="2" color="gray">
                                    open
                                </Text>
                            </Flex>
                        </Flex>
                    </Card>
                    <Card size="2">
                        <Flex direction="column" gap="1">
                            <Text size="1" color="gray" weight="medium">
                                Medium
                            </Text>
                            <Flex align="baseline" gap="2">
                                <Text size="6" weight="bold" color="gray">
                                    {mediumOpen.length}
                                </Text>
                                <Text size="2" color="gray">
                                    open
                                </Text>
                            </Flex>
                        </Flex>
                    </Card>
                </Grid>

                {/* ── Domain breakdown ── */}
                <Box>
                    <Heading size="4" mb="4">
                        By Domain
                    </Heading>
                    <Grid
                        columns={{ initial: "1", sm: "2", md: "3" }}
                        gap="3"
                    >
                        {domainCounts.map((d) => (
                            <Card key={d.domain} size="1">
                                <Flex
                                    direction="column"
                                    gap="2"
                                    p="2"
                                >
                                    <Flex
                                        align="center"
                                        justify="between"
                                    >
                                        <Text
                                            size="2"
                                            weight="bold"
                                        >
                                            {d.label}
                                        </Text>
                                        <Badge
                                            color={
                                                d.critical > 0
                                                    ? "red"
                                                    : d.open > 0
                                                      ? "orange"
                                                      : "green"
                                            }
                                            variant="soft"
                                            size="1"
                                        >
                                            {d.open} open
                                        </Badge>
                                    </Flex>
                                    <Text size="1" color="gray">
                                        {d.critical > 0 && (
                                            <>{d.critical} critical, </>
                                        )}
                                        {d.total} total
                                    </Text>
                                </Flex>
                            </Card>
                        ))}
                    </Grid>
                </Box>

                <Separator size="4" />

                {/* ── Phase 0: Ship Blockers ── */}
                <PhaseSection
                    phase={0}
                    title="Phase 0 — Ship Blockers"
                    subtitle="Must fix before any public access"
                    color="red"
                    issues={phase0}
                />

                {/* ── Phase 1: First 2 Weeks ── */}
                <PhaseSection
                    phase={1}
                    title="Phase 1 — First 2 Weeks"
                    subtitle="Ship iteratively while beta users provide feedback"
                    color="orange"
                    issues={phase1}
                />

                {/* ── Phase 2: First Month ── */}
                <PhaseSection
                    phase={2}
                    title="Phase 2 — First Month"
                    subtitle="Compliance, scaling, and quality-of-life improvements"
                    color="blue"
                    issues={phase2}
                />

                <Separator size="4" />

                {/* ── What's solid ── */}
                <Box>
                    <Heading size="4" mb="4">
                        Production-Ready
                    </Heading>
                    <Text size="2" color="gray" mb="4">
                        These areas are solid and don&apos;t need work before launch.
                    </Text>
                    <Card size="1" mt="3">
                        <Flex direction="column" gap="1" p="1">
                            {SOLID.map((s) => (
                                <Flex
                                    key={s.area}
                                    align="start"
                                    gap="3"
                                    py="1"
                                >
                                    <Box mt="1" flexShrink="0">
                                        <CheckCircledIcon
                                            width="14"
                                            height="14"
                                            color="var(--green-9)"
                                        />
                                    </Box>
                                    <Flex
                                        direction="column"
                                        gap="0"
                                        style={{ flex: 1 }}
                                    >
                                        <Text
                                            size="2"
                                            weight="medium"
                                        >
                                            {s.area}
                                        </Text>
                                        <Text size="1" color="gray">
                                            {s.detail}
                                        </Text>
                                    </Flex>
                                </Flex>
                            ))}
                        </Flex>
                    </Card>
                </Box>

                {/* ── Resolved issues ── */}
                {doneIssues.length > 0 && (
                    <>
                        <Separator size="4" />
                        <Box>
                            <Flex align="center" gap="2" mb="4">
                                <Heading size="4">Resolved</Heading>
                                <Badge
                                    color="green"
                                    variant="soft"
                                    size="1"
                                >
                                    {doneIssues.length} done
                                </Badge>
                            </Flex>
                            <Flex direction="column" gap="3">
                                {doneIssues.map((issue) => (
                                    <IssueCard
                                        key={issue.id}
                                        issue={issue}
                                    />
                                ))}
                            </Flex>
                        </Box>
                    </>
                )}
            </Flex>
        </Container>
    );
}

// ── Phase section ─────────────────────────────────────────────────────────────

function PhaseSection({
    title,
    subtitle,
    color,
    issues,
}: {
    phase: Phase;
    title: string;
    subtitle: string;
    color: string;
    issues: Issue[];
}) {
    const criticalCount = issues.filter(
        (i) => i.priority === "critical"
    ).length;

    return (
        <Box>
            <Flex align="center" gap="3" mb="2">
                <Heading size="4">{title}</Heading>
                <Badge color={color as never} variant="soft" size="1">
                    {issues.length} issues
                </Badge>
                {criticalCount > 0 && (
                    <Badge color="red" variant="soft" size="1">
                        {criticalCount} critical
                    </Badge>
                )}
            </Flex>
            <Text size="2" color="gray" mb="4">
                {subtitle}
            </Text>

            <Flex direction="column" gap="3" mt="3">
                {issues.map((issue) => (
                    <IssueCard key={issue.id} issue={issue} />
                ))}
            </Flex>
        </Box>
    );
}

// ── Issue card ────────────────────────────────────────────────────────────────

function IssueCard({ issue }: { issue: Issue }) {
    return (
        <Card
            size="1"
            style={{
                borderLeft: `3px solid var(--${borderColor(issue)}-8)`,
                opacity: issue.status === "done" ? 0.55 : 1,
            }}
        >
            <Flex align="start" gap="3" p="2">
                <Box mt="1" flexShrink="0">
                    <StatusIcon status={issue.status} />
                </Box>
                <Flex
                    direction="column"
                    gap="1"
                    style={{ flex: 1 }}
                >
                    <Flex align="center" gap="2" wrap="wrap">
                        <Text size="2" weight="bold">
                            #{issue.id}
                        </Text>
                        <PriorityBadge priority={issue.priority} />
                        <DomainBadge domain={issue.domain} />
                        <EffortBadge effort={issue.effort} />
                        <StatusBadge status={issue.status} />
                    </Flex>
                    <Text size="2" weight="medium">
                        {issue.title}
                    </Text>
                    <Text
                        size="1"
                        color="gray"
                        style={{ lineHeight: 1.5 }}
                    >
                        {issue.detail}
                    </Text>
                    {issue.file && (
                        <Text
                            size="1"
                            style={{
                                fontFamily: "var(--font-mono)",
                                color: "var(--gray-8)",
                            }}
                        >
                            {issue.file}
                        </Text>
                    )}
                </Flex>
            </Flex>
        </Card>
    );
}
