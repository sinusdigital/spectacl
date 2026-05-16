import { prisma } from "@/lib/prisma";
import { Container, Flex, Heading, Text, Card, Table, Section, Callout, Badge } from "@radix-ui/themes";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { INTERNAL_TASK_KEYS, INTERNAL_TASK_LABELS, INTERNAL_TASK_DESCRIPTIONS, type InternalTaskKey } from "@/lib/internal-models";

export const dynamic = "force-dynamic";

const FREQ_HOURS: Record<string, number> = {
    Every6Hours: 6,
    Every24Hours: 24,
    Every2Days: 48,
    Every7Days: 168,
};

const FREQ_LABEL: Record<string, string> = {
    Every6Hours: "Every 6 hours",
    Every24Hours: "Every 24 hours",
    Every2Days: "Every 2 days",
    Every7Days: "Every 7 days",
};

const PLAN_ORDER = ["FOUNDER", "STARTER", "PRO", "BUSINESS", "ENTERPRISE"];

function fmt(n: number): string {
    return Math.round(n).toLocaleString();
}

interface BatchRow { count: bigint }

async function countBatches(table: "SuggestedPrompt" | "SuggestedCompetitor", days: number): Promise<number> {
    const result = await prisma.$queryRawUnsafe<BatchRow[]>(
        `SELECT COUNT(*)::bigint AS count FROM (
            SELECT DISTINCT "entityId", DATE_TRUNC('minute', "createdAt") AS bucket
            FROM "${table}"
            WHERE "createdAt" >= NOW() - INTERVAL '${days} days'
        ) AS batches`
    );
    return Number(result[0]?.count ?? 0);
}

export default async function UsageForecastPage() {
    const [prompts, internalTaskModels] = await Promise.all([
        prisma.prompt.findMany({
            where: { status: "Running" },
            select: { id: true, intent: true, frequency: true, entityId: true },
        }),
        prisma.internalTaskModel.findMany(),
    ]);

    const internalByKey = new Map(internalTaskModels.map(m => [m.taskKey, m]));

    const entityIds = Array.from(new Set(prompts.map((p) => p.entityId)));
    const entities = await prisma.entity.findMany({
        where: { id: { in: entityIds }, isArchived: false },
        select: { id: true, spaceId: true },
    });
    const entityToSpace = new Map(
        entities.filter((e): e is { id: string; spaceId: string } => !!e.spaceId).map((e) => [e.id, e.spaceId])
    );

    const spaceIds = Array.from(new Set(Array.from(entityToSpace.values())));
    const [spaces, modelConfigs, suggestPromptBatches7d, suggestPromptBatches30d, suggestCompBatches7d, suggestCompBatches30d] = await Promise.all([
        prisma.space.findMany({
            where: { id: { in: spaceIds } },
            select: { id: true, plan: true, subscriptionStatus: true },
        }),
        prisma.spaceModelConfig.findMany({
            where: { spaceId: { in: spaceIds }, isEnabled: true, isArchived: false },
            select: { spaceId: true, modelId: true, name: true, provider: true },
        }),
        countBatches("SuggestedPrompt", 7),
        countBatches("SuggestedPrompt", 30),
        countBatches("SuggestedCompetitor", 7),
        countBatches("SuggestedCompetitor", 30),
    ]);
    const spaceToPlan = new Map(spaces.map((s) => [s.id, s.plan]));

    const spaceToModels = new Map<string, { modelId: string; name: string; provider: string }[]>();
    for (const c of modelConfigs) {
        const arr = spaceToModels.get(c.spaceId) ?? [];
        arr.push({ modelId: c.modelId, name: c.name, provider: c.provider });
        spaceToModels.set(c.spaceId, arr);
    }

    let standardAnalysisDaily = 0;
    let rankingAnalysisDaily = 0;
    let brandExtractionDaily = 0;
    let countedPrompts = 0;
    const activeSpaces = new Set<string>();
    const byFreq = new Map<string, { prompts: number; daily: number }>();
    const byPlan = new Map<string, { spaces: Set<string>; prompts: number; daily: number }>();
    const byModel = new Map<string, { provider: string; name: string; daily: number; spaces: Set<string> }>();

    for (const p of prompts) {
        const spaceId = entityToSpace.get(p.entityId);
        if (!spaceId) continue;
        const plan = spaceToPlan.get(spaceId) ?? "UNKNOWN";
        const hours = FREQ_HOURS[p.frequency] ?? 24;
        const callsPerDayPerModel = 24 / hours;
        const isRanking = p.intent === "Competitor Analysis";

        let promptCallsPerDay = 0;
        if (isRanking) {
            // Ranking prompts pin to a single internal task model (1 call per cycle)
            promptCallsPerDay = callsPerDayPerModel;
            rankingAnalysisDaily += promptCallsPerDay;
        } else {
            // Standard prompts fan out across enabled customer-facing models
            const models = spaceToModels.get(spaceId) ?? [];
            if (models.length === 0) continue;
            promptCallsPerDay = callsPerDayPerModel * models.length;
            standardAnalysisDaily += promptCallsPerDay;
            for (const m of models) {
                const existing = byModel.get(m.modelId) ?? {
                    provider: m.provider,
                    name: m.name,
                    daily: 0,
                    spaces: new Set<string>(),
                };
                existing.daily += callsPerDayPerModel;
                existing.spaces.add(spaceId);
                byModel.set(m.modelId, existing);
            }
        }

        // Brand extraction fires once per prompt cycle for any prompt that has at least one model fan-out
        // (skipped for ranking prompts? Actually it runs on the analysis successful responses; ranking prompts
        // also produce successful responses. Keep it consistent: 1 call per cycle for non-ranking only,
        // since ranking responses are structured JSON that doesn't surface new brands worth scanning.)
        if (!isRanking) {
            brandExtractionDaily += callsPerDayPerModel;
        }

        countedPrompts += 1;
        activeSpaces.add(spaceId);

        const f = byFreq.get(p.frequency) ?? { prompts: 0, daily: 0 };
        f.prompts += 1;
        f.daily += promptCallsPerDay;
        byFreq.set(p.frequency, f);

        const pl = byPlan.get(plan) ?? { spaces: new Set<string>(), prompts: 0, daily: 0 };
        pl.spaces.add(spaceId);
        pl.prompts += 1;
        pl.daily += promptCallsPerDay;
        byPlan.set(plan, pl);
    }

    const analysisDaily = standardAnalysisDaily + rankingAnalysisDaily;
    const totalDaily = analysisDaily + brandExtractionDaily;

    const planRows = PLAN_ORDER.map((plan) => ({ plan, ...(byPlan.get(plan) ?? { spaces: new Set<string>(), prompts: 0, daily: 0 }) }))
        .filter((r) => r.prompts > 0);

    const modelRows = Array.from(byModel.entries())
        .map(([modelId, v]) => ({ modelId, ...v }))
        .sort((a, b) => b.daily - a.daily);

    const freqRows = Object.keys(FREQ_HOURS)
        .map((freq) => ({ freq, ...(byFreq.get(freq) ?? { prompts: 0, daily: 0 }) }))
        .filter((r) => r.prompts > 0);

    const internalTaskRow = (key: InternalTaskKey) => {
        const m = internalByKey.get(key);
        if (!m) return { provider: "—", modelId: "(unset)", displayName: null as string | null };
        return { provider: m.provider, modelId: m.modelId, displayName: m.displayName };
    };

    const callTypes = [
        {
            name: "Prompt analysis (standard)",
            trigger: "Scheduled — per Running prompt × frequency × enabled customer-facing models",
            kind: "predictable" as const,
            daily: standardAnalysisDaily,
            modelInfo: "Customer-facing GlobalModels (fans out)",
            note: "Main analysis run. One LLM call per (prompt, frequency-cycle, model). Models = each space's enabled GlobalModels.",
        },
        {
            name: "Prompt analysis (ranking)",
            trigger: "Scheduled — per Running 'Competitor Analysis' prompt × frequency",
            kind: "predictable" as const,
            daily: rankingAnalysisDaily,
            modelInfo: `${internalTaskRow("ranking").provider} / ${internalTaskRow("ranking").modelId}`,
            note: "Ranking reports use a single platform-internal model regardless of customer config.",
        },
        {
            name: INTERNAL_TASK_LABELS.brand_extraction,
            trigger: "After each standard analysis run with successful responses",
            kind: "predictable" as const,
            daily: brandExtractionDaily,
            modelInfo: `${internalTaskRow("brand_extraction").provider} / ${internalTaskRow("brand_extraction").modelId}`,
            note: INTERNAL_TASK_DESCRIPTIONS.brand_extraction,
        },
        {
            name: INTERNAL_TASK_LABELS.suggested_prompts,
            trigger: "Manual discovery modal + auto-refill worker (on accept/reject hits zero)",
            kind: "on-demand" as const,
            actual7d: suggestPromptBatches7d,
            actual30d: suggestPromptBatches30d,
            modelInfo: `${internalTaskRow("suggested_prompts").provider} / ${internalTaskRow("suggested_prompts").modelId}`,
            note: INTERNAL_TASK_DESCRIPTIONS.suggested_prompts + " Batches counted via SuggestedPrompt rows grouped by minute.",
        },
        {
            name: INTERNAL_TASK_LABELS.competitor_discovery,
            trigger: "Onboarding flow + admin regenerate + brand extraction discovery",
            kind: "on-demand" as const,
            actual7d: suggestCompBatches7d,
            actual30d: suggestCompBatches30d,
            modelInfo: `${internalTaskRow("competitor_discovery").provider} / ${internalTaskRow("competitor_discovery").modelId}`,
            note: INTERNAL_TASK_DESCRIPTIONS.competitor_discovery + " Batches counted via SuggestedCompetitor rows grouped by minute.",
        },
        {
            name: INTERNAL_TASK_LABELS.aeo_personalization,
            trigger: "User clicks \"Analyze website\" in suggestions",
            kind: "on-demand" as const,
            modelInfo: `${internalTaskRow("aeo_personalization").provider} / ${internalTaskRow("aeo_personalization").modelId}`,
            note: INTERNAL_TASK_DESCRIPTIONS.aeo_personalization + " Not persisted — no historical proxy.",
        },
    ];

    return (
        <Container size="3" className="max-w-5xl py-8">
            <Flex direction="column" gap="6">
                <Flex direction="column" gap="2">
                    <Heading size="6">Usage Forecast</Heading>
                    <Text size="3" color="gray">
                        Projected LLM API call volume from <Badge color="green" variant="soft">Running</Badge> prompts and on-demand call sites. Predictable numbers are theoretical max — real usage will be lower due to paused prompts, failed runs, and trial expiries.
                    </Text>
                </Flex>

                <Section size="1">
                    <Flex gap="4" wrap="wrap">
                        <KpiCard label="Calls / month" value={fmt(totalDaily * 30)} />
                        <KpiCard label="Calls / week" value={fmt(totalDaily * 7)} />
                        <KpiCard label="Calls / day" value={fmt(totalDaily)} />
                        <KpiCard label="Active prompts" value={countedPrompts.toLocaleString()} sub={`across ${activeSpaces.size} spaces`} />
                    </Flex>
                    <Text size="1" color="gray" mt="2" as="p">
                        Includes standard analysis ({fmt(standardAnalysisDaily)}/day) + ranking analysis ({fmt(rankingAnalysisDaily)}/day) + brand extraction overhead ({fmt(brandExtractionDaily)}/day).
                    </Text>
                </Section>

                <Section size="1">
                    <Flex direction="column" gap="2">
                        <Heading size="4">Call types</Heading>
                        <Text size="2" color="gray">Every LLM call site in the app, with the model each one uses. Predictable types contribute to the projection above; on-demand types show last-7d / last-30d actuals as a proxy.</Text>
                    </Flex>
                    <Table.Root variant="surface" mt="3">
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeaderCell>Call type</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>Trigger</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>Model</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>Kind</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell align="right">Calls / month</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell align="right">Last 7d</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell align="right">Last 30d</Table.ColumnHeaderCell>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {callTypes.map((t) => (
                                <Table.Row key={t.name}>
                                    <Table.Cell>
                                        <Flex direction="column" gap="1">
                                            <Text weight="medium">{t.name}</Text>
                                            <Text size="1" color="gray">{t.note}</Text>
                                        </Flex>
                                    </Table.Cell>
                                    <Table.Cell><Text size="2">{t.trigger}</Text></Table.Cell>
                                    <Table.Cell><Text size="1" style={{ fontFamily: "var(--code-font-family)" }}>{t.modelInfo}</Text></Table.Cell>
                                    <Table.Cell>
                                        <Badge variant="soft" color={t.kind === "predictable" ? "blue" : "amber"}>
                                            {t.kind}
                                        </Badge>
                                    </Table.Cell>
                                    <Table.Cell align="right">
                                        {t.kind === "predictable" && t.daily !== undefined ? fmt(t.daily * 30) : "—"}
                                    </Table.Cell>
                                    <Table.Cell align="right">
                                        {t.kind === "on-demand" && t.actual7d !== undefined ? fmt(t.actual7d) : "—"}
                                    </Table.Cell>
                                    <Table.Cell align="right">
                                        {t.kind === "on-demand" && t.actual30d !== undefined ? fmt(t.actual30d) : "—"}
                                    </Table.Cell>
                                </Table.Row>
                            ))}
                        </Table.Body>
                    </Table.Root>
                </Section>

                <Section size="1">
                    <Flex direction="column" gap="2">
                        <Heading size="4">Internal task models</Heading>
                        <Text size="2" color="gray">Platform-internal models — not advertised to customers. Configure on Master LLMs.</Text>
                    </Flex>
                    <Table.Root variant="surface" mt="3">
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeaderCell>Task</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>Provider</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>Model</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell align="right">Max tokens</Table.ColumnHeaderCell>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {INTERNAL_TASK_KEYS.map((key) => {
                                const m = internalByKey.get(key);
                                return (
                                    <Table.Row key={key}>
                                        <Table.Cell><Text weight="medium">{INTERNAL_TASK_LABELS[key]}</Text></Table.Cell>
                                        <Table.Cell>
                                            {m ? <Badge variant="soft" color="gray">{m.provider}</Badge> : <Text color="red" size="1">unset</Text>}
                                        </Table.Cell>
                                        <Table.Cell>
                                            <Text size="2" style={{ fontFamily: "var(--code-font-family)" }}>
                                                {m ? (m.displayName ? `${m.displayName} (${m.modelId})` : m.modelId) : "—"}
                                            </Text>
                                        </Table.Cell>
                                        <Table.Cell align="right">{m ? m.maxOutputTokens.toLocaleString() : "—"}</Table.Cell>
                                    </Table.Row>
                                );
                            })}
                        </Table.Body>
                    </Table.Root>
                </Section>

                <Section size="1">
                    <Flex direction="column" gap="2">
                        <Heading size="4">By plan</Heading>
                        <Text size="2" color="gray">Where the volume is concentrated. Use this to compare projected cost-to-serve against plan price. (Prompt analysis only.)</Text>
                    </Flex>
                    <Table.Root variant="surface" mt="3">
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeaderCell>Plan</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell align="right">Spaces</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell align="right">Active prompts</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell align="right">Calls / month</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell align="right">Calls / week</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell align="right">Calls / day</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell align="right">/ month / space</Table.ColumnHeaderCell>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {planRows.map((r) => (
                                <Table.Row key={r.plan}>
                                    <Table.Cell><Badge variant="soft">{r.plan}</Badge></Table.Cell>
                                    <Table.Cell align="right">{r.spaces.size}</Table.Cell>
                                    <Table.Cell align="right">{r.prompts}</Table.Cell>
                                    <Table.Cell align="right">{fmt(r.daily * 30)}</Table.Cell>
                                    <Table.Cell align="right">{fmt(r.daily * 7)}</Table.Cell>
                                    <Table.Cell align="right">{fmt(r.daily)}</Table.Cell>
                                    <Table.Cell align="right">{fmt((r.daily * 30) / Math.max(1, r.spaces.size))}</Table.Cell>
                                </Table.Row>
                            ))}
                            {planRows.length === 0 && (
                                <Table.Row><Table.Cell colSpan={7}><Text color="gray">No active prompts.</Text></Table.Cell></Table.Row>
                            )}
                        </Table.Body>
                    </Table.Root>
                </Section>

                <Section size="1">
                    <Flex direction="column" gap="2">
                        <Heading size="4">By customer-facing model</Heading>
                        <Text size="2" color="gray">Standard prompt analysis only — fans out across each space&apos;s enabled GlobalModels. Pair with each model&apos;s price-per-1M-tokens to estimate $ exposure.</Text>
                    </Flex>
                    <Table.Root variant="surface" mt="3">
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeaderCell>Model</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>Provider</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell align="right">Spaces</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell align="right">Calls / month</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell align="right">Calls / week</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell align="right">Calls / day</Table.ColumnHeaderCell>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {modelRows.map((r) => (
                                <Table.Row key={r.modelId}>
                                    <Table.Cell><Text weight="medium">{r.name}</Text> <Text size="1" color="gray">({r.modelId})</Text></Table.Cell>
                                    <Table.Cell><Badge variant="soft" color="gray">{r.provider}</Badge></Table.Cell>
                                    <Table.Cell align="right">{r.spaces.size}</Table.Cell>
                                    <Table.Cell align="right">{fmt(r.daily * 30)}</Table.Cell>
                                    <Table.Cell align="right">{fmt(r.daily * 7)}</Table.Cell>
                                    <Table.Cell align="right">{fmt(r.daily)}</Table.Cell>
                                </Table.Row>
                            ))}
                            {modelRows.length === 0 && (
                                <Table.Row><Table.Cell colSpan={6}><Text color="gray">No active models.</Text></Table.Cell></Table.Row>
                            )}
                        </Table.Body>
                    </Table.Root>
                </Section>

                <Section size="1">
                    <Flex direction="column" gap="2">
                        <Heading size="4">By frequency</Heading>
                        <Text size="2" color="gray">How often prompts run skews the math heavily — Every 6h prompts contribute 4× the volume of daily ones. (Prompt analysis only.)</Text>
                    </Flex>
                    <Table.Root variant="surface" mt="3">
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeaderCell>Frequency</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell align="right">Active prompts</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell align="right">Calls / month</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell align="right">Calls / day</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell align="right">Share</Table.ColumnHeaderCell>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {freqRows.map((r) => (
                                <Table.Row key={r.freq}>
                                    <Table.Cell>{FREQ_LABEL[r.freq] ?? r.freq}</Table.Cell>
                                    <Table.Cell align="right">{r.prompts}</Table.Cell>
                                    <Table.Cell align="right">{fmt(r.daily * 30)}</Table.Cell>
                                    <Table.Cell align="right">{fmt(r.daily)}</Table.Cell>
                                    <Table.Cell align="right">{analysisDaily > 0 ? `${Math.round((r.daily / analysisDaily) * 100)}%` : "—"}</Table.Cell>
                                </Table.Row>
                            ))}
                            {freqRows.length === 0 && (
                                <Table.Row><Table.Cell colSpan={5}><Text color="gray">No active prompts.</Text></Table.Cell></Table.Row>
                            )}
                        </Table.Body>
                    </Table.Root>
                </Section>

                <Callout.Root color="gray" variant="surface" size="2">
                    <Callout.Icon><InfoCircledIcon /></Callout.Icon>
                    <Callout.Text>
                        <Text weight="bold">How this is calculated:</Text> For each Running prompt, daily calls = (24 / frequency hours) × enabled-model count. Standard prompts fan out across customer-facing GlobalModels; ranking prompts pin to a single InternalTaskModel. Brand extraction adds one platform-internal call per non-ranking prompt cycle. On-demand call counts are approximated by grouping <Text weight="bold">SuggestedPrompt</Text> / <Text weight="bold">SuggestedCompetitor</Text> rows by entity + minute (each batch ≈ 1 LLM call). To ground-truth the projection, compare a single space&apos;s actual <Text weight="bold">AnalysisResult</Text> count over the last 7 days against its row above and apply a fudge factor.
                    </Callout.Text>
                </Callout.Root>
            </Flex>
        </Container>
    );
}

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
    return (
        <Card style={{ flex: "1 1 200px", minWidth: 200 }}>
            <Flex direction="column" gap="1" p="2">
                <Text size="2" color="gray">{label}</Text>
                <Heading size="7">{value}</Heading>
                {sub && <Text size="1" color="gray">{sub}</Text>}
            </Flex>
        </Card>
    );
}
