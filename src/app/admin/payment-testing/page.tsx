"use client";

import {
    Container,
    Box,
    Flex,
    Heading,
    Text,
    Card,
    Badge,
    Table,
    Code,
    Separator,
} from "@radix-ui/themes";
import PageHeader from "@/components/Shared/PageHeader";
import {
    CheckCircledIcon,
    ExclamationTriangleIcon,
    InfoCircledIcon,
    ArrowRightIcon,
} from "@radix-ui/react-icons";

// ── Types ────────────────────────────────────────────────────────────────────

type Severity = "critical" | "moderate" | "info";
interface Finding {
    id: number;
    severity: Severity;
    title: string;
    file: string;
    line?: string;
    description: string;
    fix: string;
    fixed: boolean;
}

interface TestCase {
    id: string;
    title: string;
    steps: string[];
    expected: string;
    notes?: string;
}

// ── Data ─────────────────────────────────────────────────────────────────────

const CODE_REVIEW_FINDINGS: Finding[] = [
    {
        id: 1,
        severity: "critical",
        title: "Checkout allowed any member role",
        file: "src/app/api/mollie/checkout/route.ts",
        line: "38",
        description:
            "Checkout checked SpaceMember: { some: { userId } } (any role), but confirm-payment required OWNER/ADMIN. A regular MEMBER could pay, but the redirect confirmation failed with 403 — the space wouldn't upgrade until the webhook fired.",
        fix: "Checkout now requires OWNER or ADMIN role, matching confirm-payment.",
        fixed: true,
    },
    {
        id: 2,
        severity: "critical",
        title: "No user-facing error on checkout failure",
        file: "src/components/Shared/UpgradeRequiredModal.tsx",
        line: "481",
        description:
            "If the checkout POST failed (Mollie API down, 403, etc.), the error was silently swallowed with console.error. The user saw nothing — no toast, no error state.",
        fix: "Toast error now shown on both HTTP errors and network failures.",
        fixed: true,
    },
    {
        id: 3,
        severity: "critical",
        title: "FOUNDER plan accepted by checkout",
        file: "src/app/api/mollie/checkout/route.ts",
        line: "29",
        description:
            "Checkout validated plan in PLAN_LIMITS which includes FOUNDER (price €0). A crafted POST could create a €0.00 payment and get a free upgrade.",
        fix: "Checkout now uses VALID_PLANS whitelist: STARTER, PRO, BUSINESS, ENTERPRISE.",
        fixed: true,
    },
    {
        id: 4,
        severity: "critical",
        title: "\"open\" webhook burns idempotency key before \"paid\" webhook",
        file: "src/app/api/webhooks/mollie/route.ts",
        line: "121",
        description:
            "Mollie sends separate webhooks for each payment status change (open → paid). The \"open\" webhook arrived first, claimed lastProcessedWebhookId, and blocked the \"paid\" webhook from ever processing. No subscription was created, no credits reset, no invoice generated. confirm-payment must NOT set lastProcessedWebhookId — the webhook is the sole authority for subscription creation and credit reset.",
        fix: "Webhook now ignores non-terminal statuses (open, pending) before the idempotency claim. Only paid/failed/expired/canceled claim the key.",
        fixed: true,
    },
    {
        id: 5,
        severity: "moderate",
        title: "No retry for async payment methods",
        file: "src/components/PaymentReturnHandler.tsx",
        description:
            "PaymentReturnHandler calls confirm-payment once. For async methods (bank transfer, SOFORT), Mollie may redirect back before the payment is finalized. The user sees 'Could not confirm payment' even though the payment succeeds later via webhook.",
        fix: "Known limitation. Webhook will process successfully — user can check Billing page. A polling/processing state would fix this properly.",
        fixed: false,
    },
    {
        id: 6,
        severity: "moderate",
        title: "Subscription cancellation webhook detection is fragile",
        file: "src/app/api/webhooks/mollie/route.ts",
        line: "35",
        description:
            "Condition subscriptionIdFromWebhook && !webhookId?.startsWith('tr_') is a heuristic. Mollie docs say subscription payments arrive with subscriptionId in the payment object, not in the webhook body params. Needs verification with Mollie test mode.",
        fix: "Document and verify with Mollie test mode before go-live.",
        fixed: false,
    },
    {
        id: 7,
        severity: "info",
        title: "Admin Mollie page has outdated pricing and phases",
        file: "src/app/admin/mollie/page.tsx",
        description:
            "Phase tracker shows phases 4-5 as 'next'/'todo' (both done). Pricing reference shows PRO at €29 instead of €99.",
        fix: "Low priority — this page supersedes it for testing purposes.",
        fixed: false,
    },
    {
        id: 8,
        severity: "info",
        title: "Mollie client recreated on every call",
        file: "src/lib/mollie.ts",
        description:
            "getMollie() instantiates a new MollieClient each invocation. Minor performance concern, not functionally wrong.",
        fix: "Could cache the client instance. Low priority.",
        fixed: false,
    },
];

const SECURITY_NOTES = [
    "Webhook verifies payment by fetching from Mollie API (recommended by Mollie docs)",
    "confirm-payment checks metadata matches requested plan (prevents URL parameter forgery)",
    "Idempotency tracked via lastProcessedWebhookId field",
    "Subscription cancel requires OWNER/ADMIN + cancels in Mollie first before updating DB",
    "Checkout and confirm-payment both require authenticated session",
    "FOUNDER plan blocked from checkout (prevents €0 payment exploit)",
];

const TEST_CASES: { category: string; color: "green" | "blue" | "orange" | "red" | "purple" | "teal" | "gray"; cases: TestCase[] }[] = [
    {
        category: "A. Happy Path",
        color: "green",
        cases: [
            {
                id: "A1",
                title: "New user selects STARTER plan",
                steps: [
                    "Log in as a new user (TRIALING or INCOMPLETE status)",
                    "Trigger the upgrade modal (hit entity/prompt limit or click Upgrade)",
                    "Select STARTER plan",
                    "Complete payment on Mollie checkout page",
                    "Observe redirect back to app",
                ],
                expected:
                    "PaymentReturnHandler fires → confirm-payment succeeds → PaymentSuccessModal shows with STARTER limits (25 prompts, 1 entity, 1 member) → UpgradeSuccessBanner appears after closing modal → Space plan is STARTER, status ACTIVE.",
            },
            {
                id: "A2",
                title: "Trial user upgrades to PRO",
                steps: [
                    "Log in as user on trial",
                    "Open upgrade modal from billing page or limit gate",
                    "Select PRO plan",
                    "Complete payment",
                ],
                expected:
                    "Same success flow as A1 but with PRO limits (75 prompts, 3 entities, 3 members). Subscription created in Mollie for monthly recurring.",
            },
            {
                id: "A3",
                title: "Canceled user resubscribes",
                steps: [
                    "Use a space with CANCELED subscription status",
                    "Click 'Reactivate' on CancellationBanner or go to billing page",
                    "Upgrade modal opens in 'resubscribe' mode",
                    "Select a plan and complete payment",
                ],
                expected:
                    "canceledAt and cancellationReason cleared. New subscription created. Plan and status updated. CancellationBanner disappears after hard navigation.",
            },
        ],
    },
    {
        category: "B. Return URL Behavior",
        color: "blue",
        cases: [
            {
                id: "B1",
                title: "Successful payment redirect",
                steps: [
                    "Complete any payment flow",
                    "Observe the URL after Mollie redirects back",
                ],
                expected:
                    "URL contains ?payment=pending&plan=PLAN&spaceId=ID briefly. PaymentReturnHandler immediately calls history.replaceState to clean the URL. confirm-payment is called. Success modal appears.",
                notes: "The clean URL preserves any other query params that were present.",
            },
            {
                id: "B2",
                title: "User abandons Mollie checkout",
                steps: [
                    "Start checkout flow (reach Mollie payment page)",
                    "Click browser back button or close Mollie tab",
                    "Return to the app",
                ],
                expected:
                    "No ?payment=pending in URL → PaymentReturnHandler does nothing. Space remains unchanged. molliePaymentId is set on the space but status stays as-is. User can retry.",
            },
            {
                id: "B3",
                title: "Page refresh after successful payment",
                steps: [
                    "Complete payment and see success modal",
                    "Close modal (triggers hard navigation to clean URL)",
                    "Refresh the page",
                ],
                expected:
                    "No re-trigger — history.replaceState already removed payment params. UpgradeSuccessBanner reads from sessionStorage and shows (auto-dismisses after 8s). Second refresh: banner gone (sessionStorage cleared).",
            },
            {
                id: "B4",
                title: "Return URL preserves original page",
                steps: [
                    "Navigate to /entities page",
                    "Hit entity limit → open upgrade modal",
                    "Select plan → complete payment",
                ],
                expected:
                    "redirectUrl in Mollie payment uses returnPath=/entities. After payment, user lands back on /entities (not /spaces or /billing).",
            },
        ],
    },
    {
        category: "C. Webhook Processing",
        color: "orange",
        cases: [
            {
                id: "C1",
                title: "First payment webhook creates subscription",
                steps: [
                    "Complete a first payment (sequenceType: first)",
                    "Check server logs for webhook processing",
                    "Verify in Mollie dashboard that subscription was created",
                ],
                expected:
                    "Webhook receives payment ID → fetches from Mollie API → status 'paid' + sequenceType 'first' → verifies valid mandate → creates Mollie subscription (interval: 1 month) → sets mollieSubscriptionId, currentPeriodEnd (+1 month), plan, status ACTIVE.",
                notes: "If subscription creation fails, payment is still credited (logged for manual recovery).",
            },
            {
                id: "C2",
                title: "Recurring payment extends period",
                steps: [
                    "Trigger a recurring payment via Mollie dashboard (or wait for auto-charge)",
                    "Check webhook logs",
                ],
                expected:
                    "Webhook sees subscriptionId on payment → extends currentPeriodEnd by 1 month from the later of (currentPeriodEnd, now). Prevents drift.",
            },
            {
                id: "C3",
                title: "Failed payment sets CANCELED",
                steps: [
                    "Simulate a failed payment in Mollie test mode",
                    "Check webhook processing",
                ],
                expected:
                    "Payment status 'failed' → toSubscriptionStatus maps to CANCELED → space.subscriptionStatus set to CANCELED. CancellationBanner will appear on next page load.",
            },
            {
                id: "C4",
                title: "Duplicate webhook is skipped",
                steps: [
                    "Trigger the same webhook twice (Mollie can retry)",
                    "Check logs",
                ],
                expected:
                    "Second call: lastProcessedWebhookId === webhookId → logs 'Skipping already processed payment' → returns 200 immediately.",
            },
            {
                id: "C5",
                title: "Webhook with missing metadata",
                steps: [
                    "If possible, create a payment without spaceId/plan metadata",
                    "Check webhook handling",
                ],
                expected:
                    "Webhook logs 'Missing metadata for payment' and returns 200 (doesn't crash). No space is updated.",
            },
        ],
    },
    {
        category: "D. Error & Security Cases",
        color: "red",
        cases: [
            {
                id: "D1",
                title: "URL parameter forgery attempt",
                steps: [
                    "Navigate to any page with ?payment=pending&plan=ENTERPRISE&spaceId=YOUR_SPACE_ID",
                ],
                expected:
                    "PaymentReturnHandler calls confirm-payment → no matching molliePaymentId on space or payment not 'paid' → returns 400 → toast: 'Could not confirm payment. Please check Billing.'",
            },
            {
                id: "D2",
                title: "Checkout API failure (Mollie down)",
                steps: [
                    "Temporarily break MOLLIE_API_KEY or disconnect from internet",
                    "Try to select a plan in upgrade modal",
                ],
                expected:
                    "Toast error: 'Failed to start checkout. Please try again.' (or specific Mollie error message). Loading state resets. User can retry.",
            },
            {
                id: "D3",
                title: "Same plan re-purchase blocked",
                steps: [
                    "As a user on STARTER plan",
                    "Open upgrade modal",
                    "Try to click the STARTER card",
                ],
                expected:
                    "STARTER card shows 'Current plan' badge, opacity 0.75, cursor: default. Click does nothing (isDisabled = true).",
                notes: "Exception: in 'resubscribe' mode, clicking current plan IS allowed.",
            },
            {
                id: "D4",
                title: "Regular member tries to upgrade",
                steps: [
                    "Log in as MEMBER role (not OWNER/ADMIN)",
                    "Trigger upgrade modal and select a plan",
                ],
                expected:
                    "POST /api/mollie/checkout returns 403: 'Only space owners and admins can initiate checkout'. Toast error shown to user.",
                notes: "The upgrade modal is still visible to members (frontend doesn't gate it), but the API blocks the action.",
            },
            {
                id: "D5",
                title: "FOUNDER plan checkout attempt",
                steps: [
                    "Craft a POST to /api/mollie/checkout with plan='FOUNDER'",
                ],
                expected:
                    "Returns 400: 'Invalid plan: FOUNDER. Valid plans: STARTER, PRO, BUSINESS, ENTERPRISE'.",
            },
        ],
    },
    {
        category: "E. Cancellation",
        color: "purple",
        cases: [
            {
                id: "E1",
                title: "Owner cancels subscription",
                steps: [
                    "Log in as OWNER",
                    "Go to billing page",
                    "Click 'Cancel subscription'",
                    "Complete CancellationSurveyModal (select reason, confirm)",
                ],
                expected:
                    "Mollie subscription canceled → space.subscriptionStatus = CANCELED, canceledAt set → CancellationBanner appears → Cancellation email sent to owner → SpaceDeletionLog entry created.",
                notes: "currentPeriodEnd is NOT changed — user retains access until end of paid period.",
            },
            {
                id: "E2",
                title: "Admin cancels subscription",
                steps: [
                    "Log in as ADMIN role member",
                    "Go to billing page and cancel",
                ],
                expected:
                    "Same flow as E1. Email goes to the space OWNER (not the admin who clicked cancel).",
            },
            {
                id: "E3",
                title: "Regular member tries to cancel",
                steps: [
                    "Log in as MEMBER",
                    "Attempt to POST /api/spaces/{spaceId}/subscription/cancel",
                ],
                expected:
                    "Returns 403: 'Forbidden'. CancellationSurveyModal shows admin warning step if role is not OWNER.",
            },
            {
                id: "E4",
                title: "Double-cancel attempt",
                steps: [
                    "Cancel subscription",
                    "Try to cancel again (e.g. via API)",
                ],
                expected:
                    "Returns 400: 'Subscription is already canceled'. UI should also hide the cancel button when status is CANCELED.",
            },
        ],
    },
    {
        category: "F. Access Control After Expiry",
        color: "teal",
        cases: [
            {
                id: "F1",
                title: "Canceled but within paid period",
                steps: [
                    "Cancel subscription (currentPeriodEnd is in the future)",
                    "Try to use the app normally",
                ],
                expected:
                    "getSpaceAccessStatus returns 'ACTIVE'. Full access to everything. CancellationBanner shows countdown.",
            },
            {
                id: "F2",
                title: "Past period end — read-only grace",
                steps: [
                    "Set currentPeriodEnd to a past date (within 90 days) in DB",
                    "Try to add entity or prompt",
                ],
                expected:
                    "getSpaceAccessStatus returns 'READ_ONLY'. Can view dashboards but cannot create entities, prompts, or run analyses. API returns 403: 'Your subscription has ended.'",
            },
            {
                id: "F3",
                title: "Past 90-day grace — expired",
                steps: [
                    "Set currentPeriodEnd to 91+ days ago in DB",
                    "Try to access space",
                ],
                expected:
                    "getSpaceAccessStatus returns 'EXPIRED'. API returns 403: 'Your space access has expired. Please reactivate.'",
            },
        ],
    },
    {
        category: "G. Plan Limit Enforcement",
        color: "gray",
        cases: [
            {
                id: "G1",
                title: "Entity limit reached",
                steps: [
                    "Create entities up to plan limit (STARTER: 1)",
                    "Click 'Add Entity'",
                ],
                expected:
                    "UpgradeRequiredModal opens with resourceName='entities' and limit shown. API also enforces: POST /api/entities returns 403 if wouldExceedLimit.",
            },
            {
                id: "G2",
                title: "Prompt limit reached",
                steps: [
                    "Create active prompts up to plan limit (STARTER: 25)",
                    "Try to add another prompt",
                ],
                expected:
                    "useUsageLimits hook returns canAddPrompt=false. UpgradeRequiredModal opens. API enforces same limit.",
            },
            {
                id: "G3",
                title: "INCOMPLETE status blocks entity creation",
                steps: [
                    "Set subscriptionStatus to INCOMPLETE",
                    "Click 'Add Entity'",
                ],
                expected:
                    "UpgradeRequiredModal opens in 'activate' mode. Entity creation blocked until subscription is active.",
            },
        ],
    },
];

// ── Flow Steps ───────────────────────────────────────────────────────────────

const PAYMENT_FLOW_STEPS = [
    { step: "1", component: "UpgradeRequiredModal", file: "src/components/Shared/UpgradeRequiredModal.tsx", action: "User selects plan → saves returnUrl to sessionStorage → POST /api/mollie/checkout" },
    { step: "2", component: "checkout/route.ts", file: "src/app/api/mollie/checkout/route.ts", action: "Verifies OWNER/ADMIN role → creates Mollie customer (if new) → creates payment (sequenceType: first) → returns checkoutUrl" },
    { step: "3", component: "Mollie Checkout", file: "(external)", action: "User completes payment on Mollie's hosted page → Mollie redirects to redirectUrl with ?payment=pending" },
    { step: "4", component: "PaymentReturnHandler", file: "src/components/PaymentReturnHandler.tsx", action: "Detects ?payment=pending → replaces history (cleans URL) → POST /api/mollie/confirm-payment" },
    { step: "5", component: "confirm-payment/route.ts", file: "src/app/api/mollie/confirm-payment/route.ts", action: "Fast path: webhook already processed? Slow path: fetch payment from Mollie API → verify paid + metadata → apply upgrade + set lastProcessedWebhookId" },
    { step: "6", component: "PaymentSuccessModal", file: "src/components/Shared/PaymentSuccessModal.tsx", action: "Shows new plan limits → 'Go to Dashboard' triggers hard navigation" },
    { step: "7", component: "Webhook (async)", file: "src/app/api/webhooks/mollie/route.ts", action: "Mollie calls webhook → verifies payment → creates subscription (if first) or extends period (if recurring) → idempotent via lastProcessedWebhookId" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: Severity }) {
    const config = {
        critical: { color: "red" as const, label: "Critical" },
        moderate: { color: "orange" as const, label: "Moderate" },
        info: { color: "gray" as const, label: "Info" },
    };
    const { color, label } = config[severity];
    return <Badge color={color} variant="soft" size="1">{label}</Badge>;
}

function FixedBadge({ fixed }: { fixed: boolean }) {
    return fixed
        ? <Badge color="green" variant="soft" size="1">Fixed</Badge>
        : <Badge color="gray" variant="outline" size="1">Open</Badge>;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PaymentTestingPage() {
    return (
        <Container size="3" className="max-w-5xl py-8">
            <Box mb="8">
                <PageHeader
                    title="Payment Testing"
                    description="Mollie integration code review, payment flow documentation, and manual test cases."
                />
            </Box>

            <Flex direction="column" gap="8">
                {/* ── Code Review Findings ──────────────────────────────────── */}
                <Box>
                    <Heading size="5" mb="1">Code Review Findings</Heading>
                    <Text size="2" color="gray" mb="4" as="p">
                        Issues identified during code review of the Mollie integration. April 2026.
                    </Text>

                    <Flex direction="column" gap="3" mt="4">
                        {CODE_REVIEW_FINDINGS.map((f) => (
                            <Card key={f.id} size="1">
                                <Flex direction="column" gap="2" p="1">
                                    <Flex align="center" gap="2" wrap="wrap">
                                        <SeverityBadge severity={f.severity} />
                                        <FixedBadge fixed={f.fixed} />
                                        <Text size="2" weight="bold">{f.title}</Text>
                                    </Flex>
                                    <Text size="1" color="gray">
                                        <Code size="1" variant="ghost">{f.file}{f.line ? `:${f.line}` : ""}</Code>
                                    </Text>
                                    <Text size="1" color="gray">{f.description}</Text>
                                    <Flex align="center" gap="1">
                                        <ArrowRightIcon width={10} height={10} color="var(--gray-8)" />
                                        <Text size="1" weight="medium" color={f.fixed ? "green" : "gray"}>
                                            {f.fix}
                                        </Text>
                                    </Flex>
                                </Flex>
                            </Card>
                        ))}
                    </Flex>
                </Box>

                <Separator size="4" />

                {/* ── Security Notes ────────────────────────────────────────── */}
                <Box>
                    <Heading size="5" mb="4">Security Assessment</Heading>
                    <Card size="2" style={{ backgroundColor: "var(--green-2)", borderLeft: "4px solid var(--green-9)" }}>
                        <Flex direction="column" gap="2">
                            {SECURITY_NOTES.map((note, i) => (
                                <Flex key={i} align="start" gap="2">
                                    <CheckCircledIcon
                                        width={14}
                                        height={14}
                                        color="var(--green-9)"
                                        style={{ marginTop: 2, flexShrink: 0 }}
                                    />
                                    <Text size="1" color="gray">{note}</Text>
                                </Flex>
                            ))}
                        </Flex>
                    </Card>
                </Box>

                <Separator size="4" />

                {/* ── Payment Flow ──────────────────────────────────────────── */}
                <Box>
                    <Heading size="5" mb="4">Payment Flow</Heading>
                    <Text size="2" color="gray" mb="4" as="p">
                        End-to-end flow from plan selection to subscription activation.
                    </Text>

                    <Flex direction="column" gap="2" mt="4">
                        {PAYMENT_FLOW_STEPS.map((s, i) => (
                            <Card key={s.step} size="1">
                                <Flex align="start" gap="3" p="1">
                                    <Flex
                                        align="center"
                                        justify="center"
                                        style={{
                                            width: 24,
                                            height: 24,
                                            borderRadius: "50%",
                                            backgroundColor: i === 6 ? "var(--orange-3)" : "var(--blue-3)",
                                            color: i === 6 ? "var(--orange-11)" : "var(--blue-11)",
                                            fontSize: 11,
                                            fontWeight: 700,
                                            flexShrink: 0,
                                        }}
                                    >
                                        {s.step}
                                    </Flex>
                                    <Flex direction="column" gap="1" style={{ flex: 1 }}>
                                        <Flex align="center" gap="2">
                                            <Text size="2" weight="bold">{s.component}</Text>
                                            {i === 6 && <Badge color="orange" size="1" variant="soft">Async</Badge>}
                                        </Flex>
                                        <Code size="1" variant="ghost" color="gray">{s.file}</Code>
                                        <Text size="1" color="gray">{s.action}</Text>
                                    </Flex>
                                </Flex>
                            </Card>
                        ))}
                    </Flex>
                </Box>

                <Separator size="4" />

                {/* ── Manual Test Cases ─────────────────────────────────────── */}
                <Box>
                    <Heading size="5" mb="1">Manual Test Cases</Heading>
                    <Text size="2" color="gray" mb="4" as="p">
                        Work through each case using Mollie test mode before going live.
                    </Text>

                    <Flex direction="column" gap="6" mt="4">
                        {TEST_CASES.map((group) => (
                            <Box key={group.category}>
                                <Flex align="center" gap="2" mb="3">
                                    <Badge color={group.color} variant="solid" size="2">
                                        {group.category}
                                    </Badge>
                                </Flex>

                                <Flex direction="column" gap="3">
                                    {group.cases.map((tc) => (
                                        <Card key={tc.id} size="1">
                                            <Flex direction="column" gap="2" p="1">
                                                <Flex align="center" gap="2">
                                                    <Code size="1" weight="bold">{tc.id}</Code>
                                                    <Text size="2" weight="bold">{tc.title}</Text>
                                                </Flex>

                                                <Box>
                                                    <Text size="1" weight="medium" color="gray" mb="1" as="p">Steps:</Text>
                                                    <Flex direction="column" gap="1" ml="2">
                                                        {tc.steps.map((step, i) => (
                                                            <Text key={i} size="1" color="gray">
                                                                {i + 1}. {step}
                                                            </Text>
                                                        ))}
                                                    </Flex>
                                                </Box>

                                                <Box>
                                                    <Text size="1" weight="medium" color="gray" mb="1" as="p">Expected:</Text>
                                                    <Text size="1" color="gray" ml="2" as="p">
                                                        {tc.expected}
                                                    </Text>
                                                </Box>

                                                {tc.notes && (
                                                    <Flex align="start" gap="1" ml="2">
                                                        <InfoCircledIcon
                                                            width={12}
                                                            height={12}
                                                            color="var(--blue-9)"
                                                            style={{ marginTop: 2, flexShrink: 0 }}
                                                        />
                                                        <Text size="1" color="blue">{tc.notes}</Text>
                                                    </Flex>
                                                )}
                                            </Flex>
                                        </Card>
                                    ))}
                                </Flex>
                            </Box>
                        ))}
                    </Flex>
                </Box>

                <Separator size="4" />

                {/* ── Known Limitations ─────────────────────────────────────── */}
                <Box>
                    <Heading size="5" mb="4">Known Limitations</Heading>
                    <Flex direction="column" gap="3">
                        {[
                            {
                                title: "Async payment methods may show false failure",
                                description: "Bank transfer, SOFORT, etc. — Mollie may redirect the user back before the payment is finalized. PaymentReturnHandler sees 'not paid' and shows an error toast. The webhook will process the payment later and upgrade the space. User should check Billing page.",
                            },
                            {
                                title: "No downgrade flow",
                                description: "Users can only upgrade to a higher plan. Downgrading (e.g. PRO → STARTER) requires canceling and resubscribing. The CancellationSurveyModal offers a downgrade suggestion but it opens the upgrade modal for a lower tier — which won't process if it's a lower-priced plan on an active subscription.",
                            },
                            {
                                title: "Local dev: webhooks won't fire",
                                description: "Mollie requires a publicly reachable webhook URL. In local dev (localhost), webhookUrl is omitted. Only the confirm-payment path works. Use ngrok or Mollie's test webhook tools for full testing.",
                            },
                            {
                                title: "Enterprise plan is email-only",
                                description: "Enterprise card in the upgrade modal sends an email to info@spectacl.org. No checkout flow for Enterprise.",
                            },
                            {
                                title: "Subscription creation failure is non-fatal",
                                description: "If the webhook successfully processes a 'paid' first payment but fails to create the Mollie subscription, the space still gets upgraded. However, no recurring charges will happen. Logged as FAILED TO CREATE SUBSCRIPTION for manual recovery.",
                            },
                        ].map((item, i) => (
                            <Card key={i} size="1">
                                <Flex align="start" gap="2" p="1">
                                    <ExclamationTriangleIcon
                                        width={14}
                                        height={14}
                                        color="var(--orange-9)"
                                        style={{ marginTop: 3, flexShrink: 0 }}
                                    />
                                    <Flex direction="column" gap="1">
                                        <Text size="2" weight="bold">{item.title}</Text>
                                        <Text size="1" color="gray">{item.description}</Text>
                                    </Flex>
                                </Flex>
                            </Card>
                        ))}
                    </Flex>
                </Box>

                {/* ── File Reference ───────────────────────────────────────── */}
                <Box>
                    <Heading size="5" mb="4">File Reference</Heading>
                    <Card size="1">
                        <Table.Root variant="surface">
                            <Table.Header>
                                <Table.Row>
                                    <Table.ColumnHeaderCell>File</Table.ColumnHeaderCell>
                                    <Table.ColumnHeaderCell>Purpose</Table.ColumnHeaderCell>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {[
                                    ["src/lib/mollie.ts", "Mollie client singleton"],
                                    ["src/app/api/mollie/checkout/route.ts", "Create payment + redirect to Mollie"],
                                    ["src/app/api/mollie/confirm-payment/route.ts", "Verify payment after redirect"],
                                    ["src/app/api/webhooks/mollie/route.ts", "Webhook processor (idempotent)"],
                                    ["src/app/api/spaces/[spaceId]/subscription/cancel/route.ts", "Cancel subscription"],
                                    ["src/components/Shared/UpgradeRequiredModal.tsx", "Plan selection modal"],
                                    ["src/components/PaymentReturnHandler.tsx", "Client-side redirect handler"],
                                    ["src/components/Shared/PaymentSuccessModal.tsx", "Success confirmation modal"],
                                    ["src/components/Shared/UpgradeSuccessBanner.tsx", "Auto-dismiss success banner"],
                                    ["src/components/Shared/CancellationBanner.tsx", "Cancellation warning banner"],
                                    ["src/components/Shared/CancellationSurveyModal.tsx", "Cancellation workflow"],
                                    ["src/lib/billing/plans.ts", "Plan definitions and limits"],
                                    ["src/lib/billing/access.ts", "Access status logic (ACTIVE/READ_ONLY/EXPIRED)"],
                                    ["src/lib/billing/trial.ts", "Trial state management"],
                                    ["src/app/spaces/[spaceId]/billing/page.tsx", "User-facing billing dashboard"],
                                ].map(([file, purpose]) => (
                                    <Table.Row key={file}>
                                        <Table.RowHeaderCell>
                                            <Code size="1" variant="ghost">{file}</Code>
                                        </Table.RowHeaderCell>
                                        <Table.Cell>
                                            <Text size="1" color="gray">{purpose}</Text>
                                        </Table.Cell>
                                    </Table.Row>
                                ))}
                            </Table.Body>
                        </Table.Root>
                    </Card>
                </Box>
            </Flex>
        </Container>
    );
}
