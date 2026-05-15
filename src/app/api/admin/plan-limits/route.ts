import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { PLAN_LIMITS, TRIAL_DAYS_DEFAULT } from '@/lib/billing/plans';
import { invalidateCacheByPrefix } from '@/lib/cache';
import { auditLog } from '@/lib/audit';

// GET /api/admin/plan-limits
// Returns plan limits — DB overrides merged on top of code defaults.
// Also returns `_trialDays` for the global trial duration setting.
// Used by both admin pricing page AND the upgrade modal (customer-facing).
// The data is non-sensitive (plan features/prices are public), so we allow
// authenticated users to read but restrict writes to admins.
export async function GET() {
    const settings = await prisma.systemSetting.findMany({
        where: {
            key: {
                in: [
                    ...Object.keys(PLAN_LIMITS).map(p => `plan_limits_${p}`),
                    'trial_days',
                    'trial_prompt_limit',
                    'allow_negative_credits',
                ],
            },
        },
    });

    const result: Record<string, Record<string, unknown>> = {};

    for (const plan of Object.keys(PLAN_LIMITS) as Array<keyof typeof PLAN_LIMITS>) {
        const setting = settings.find(s => s.key === `plan_limits_${plan}`);
        const defaults = PLAN_LIMITS[plan] as Record<string, unknown>;
        const overrides = setting ? JSON.parse(setting.value) : {};
        result[plan] = { ...defaults, ...overrides };
    }

    // Include global trial duration
    const trialSetting = settings.find(s => s.key === 'trial_days');
    result._trialDays = { value: trialSetting ? parseInt(trialSetting.value, 10) : TRIAL_DAYS_DEFAULT };

    // Include trial prompt limit
    const trialPromptSetting = settings.find(s => s.key === 'trial_prompt_limit');
    result._trialPromptLimit = { value: trialPromptSetting ? parseInt(trialPromptSetting.value, 10) : 10 };

    // Include negative credits toggle
    const negCreditsSetting = settings.find(s => s.key === 'allow_negative_credits');
    result._allowNegativeCredits = { value: negCreditsSetting?.value === 'true' };

    return NextResponse.json(result, {
        headers: { 'Cache-Control': 'public, max-age=60, s-maxage=120, stale-while-revalidate=300' },
    });
}

// PUT /api/admin/plan-limits
// Body: { plan: string, limits: { maxMembers, maxEntities, maxActivePrompts, ... } }
// Restricted to admin users only.
export async function PUT(request: NextRequest) {
    try {
        // Authenticate and verify admin role
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const body = await request.json();
        const { plan, limits } = body;

        if (!plan || !limits) {
            return NextResponse.json({ error: 'Invalid plan or limits' }, { status: 400 });
        }

        // Handle global settings (trial days, negative credits, etc.)
        if (plan === '_settings') {
            if (typeof limits.trialDays === 'number' && limits.trialDays > 0) {
                await prisma.systemSetting.upsert({
                    where: { key: 'trial_days' },
                    update: { value: String(limits.trialDays) },
                    create: { key: 'trial_days', value: String(limits.trialDays) },
                });
            }
            if (typeof limits.trialPromptLimit === 'number' && limits.trialPromptLimit > 0) {
                await prisma.systemSetting.upsert({
                    where: { key: 'trial_prompt_limit' },
                    update: { value: String(limits.trialPromptLimit) },
                    create: { key: 'trial_prompt_limit', value: String(limits.trialPromptLimit) },
                });
            }
            if (typeof limits.allowNegativeCredits === 'boolean') {
                await prisma.systemSetting.upsert({
                    where: { key: 'allow_negative_credits' },
                    update: { value: String(limits.allowNegativeCredits) },
                    create: { key: 'allow_negative_credits', value: String(limits.allowNegativeCredits) },
                });
            }
            await auditLog({ userId: session.user.id, action: 'plan_limits.update', targetType: 'SystemSetting', detail: { plan: '_settings', limits } });
            return NextResponse.json({ ok: true });
        }

        if (!(plan in PLAN_LIMITS)) {
            return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
        }

        // Only persist the editable limit fields — strip computed/derived fields
        // to prevent features/prices from being frozen in the DB override
        const safeFields: Record<string, unknown> = {};
        const EDITABLE_KEYS = [
            'maxMembers', 'maxEntities', 'maxActivePrompts',
            'dataRetentionDays', 'priceManaged', 'priceByok',
        ];
        for (const key of EDITABLE_KEYS) {
            if (key in limits) {
                safeFields[key] = limits[key];
            }
        }

        const dbKey = `plan_limits_${plan}`;

        await prisma.systemSetting.upsert({
            where: { key: dbKey },
            update: { value: JSON.stringify(safeFields) },
            create: { key: dbKey, value: JSON.stringify(safeFields) }
        });

        // Invalidate cached plan limits so changes take effect immediately
        await invalidateCacheByPrefix('plan-limits:');

        await auditLog({ userId: session.user.id, action: 'plan_limits.update', targetType: 'SystemSetting', targetId: dbKey, detail: { plan, limits: safeFields } });

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('Error updating plan limits:', error);
        return NextResponse.json({ error: 'Failed to update plan limits' }, { status: 500 });
    }
}
