"use client";

import { useState } from "react";
import CompanyLogo from "@/components/CompanyLogo";
import { Box, Flex, Text, Card, Grid, Skeleton } from "@radix-ui/themes";
import RadixTable from "@/components/Shared/RadixTable";
import MentionChart from "@/components/Charts/MentionChart";
import PositionChart from "@/components/Charts/PositionChart";
import ShareOfVoiceChart from "@/components/Charts/ShareOfVoiceChart";
import { StatCard } from "@/components/Shared/StatCard";
import { 
    MetricTrend, 
    ProgressIndicator, 
    PositionIndicator 
} from "@/components/Shared/MetricTriplet";
import { TimeRangeType } from '@/components/Shared/FilterBar';
import { CompetitorMetric } from '@/hooks/useOverviewMetrics';
import Header from "@/components/Shared/Header";

interface ChartData {
  date: string;
  [key: string]: string | number;
}

interface VisibilityEntity {
  name: string;
  color: string;
  strokeWidth?: number;
  opacity?: number;
}

interface OverviewChartsProps {
  loading?: boolean;
  timeRange: TimeRangeType;
  entityId: string;
  viewAsId: string;
  competitorMetrics: CompetitorMetric[];
  visibilityChartData: ChartData[];
  sovChartData: ChartData[];
  visibilityEntities: VisibilityEntity[];
  activeMetric: 'visibility' | 'position' | 'shareOfVoice';
  setActiveMetric: (metric: 'visibility' | 'position' | 'shareOfVoice') => void;
  mentionTrend?: { value?: number; label: string; text?: string; color?: string };
  positionTrend?: { text: string; color: string; label?: string; arrow?: string };
  sovTrend?: { text: string; color: string; label?: string; arrow?: string };
  periodAvgPosition: number | null;
}

function TooltipBody({ title, description, example }: { title: string; description: string; example: string }) {
  return (
    <Box className="space-y-3 leading-relaxed">
      <p><Text weight="bold" color="gray">{title}</Text></p>
      <Box className="space-y-1">
        <Text weight="bold" size="2" color="gray">How it works:</Text>
        <Text size="2" as="p">{description}</Text>
      </Box>
      <Box className="space-y-1 bg-[var(--gray-a2)] p-2 rounded border border-[var(--gray-a5)]">
        <Text weight="bold" size="2" color="gray">Example:</Text>
        <Text as="p" size="2">{example}</Text>
      </Box>
    </Box>
  );
}

function CompetitorLogoCell({ comp }: { comp: CompetitorMetric }) {
  return (
    <Flex align="center" gap="2" style={{ minWidth: 0, overflow: 'hidden' }}>
      <CompanyLogo
        domain={comp.website}
        name={comp.name}
        size={20}
        logoUrl={comp.logoUrl}
        className="rounded-full flex-shrink-0"
      />
      <Text size="2" weight="medium" truncate style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{comp.name}</Text>
    </Flex>
  );
}

const MentionRateCell = ({ value }: { value: number }) => (
  <Flex align="center" gap="2">
    <ProgressIndicator value={value} className="w-3.5 h-3.5" />
    <Text size="2" weight="medium" color="gray" className="tabular-nums">
      {value}%
    </Text>
  </Flex>
);
const PositionCell = ({ value, trend }: { value: number | null, trend?: number | null }) => (
    <RadixTable.Cell>
        <Flex align="center" gap="2">
            <PositionIndicator value={value} />
            <Text size="2" color="gray" weight="medium" className="tabular-nums">
                {value != null ? value.toFixed(1) : '—'}
            </Text>
            <MetricTrend value={trend} isInverse size="1" />
        </Flex>
    </RadixTable.Cell>
);

const ShareOfVoiceCell = ({ value, trend, totalCompetitors }: { value: number | null, trend?: number | null, totalCompetitors: number }) => (
    <RadixTable.Cell>
        <Flex align="center" gap="2">
            <ProgressIndicator value={value} totalCompetitors={totalCompetitors} className="w-3.5 h-3.5" />
            <Text size="2" color="gray" weight="medium" className="tabular-nums">
                {value != null ? `${value.toFixed(1)}%` : '—'}
            </Text>
            <MetricTrend value={trend} size="1" />
        </Flex>
    </RadixTable.Cell>
);

export default function OverviewCharts({
  loading = false,
  timeRange,
  entityId,
  viewAsId,
  competitorMetrics,
  visibilityChartData,
  sovChartData,
  visibilityEntities,
  activeMetric,
  setActiveMetric,
  mentionTrend,
  positionTrend,
  sovTrend,
  periodAvgPosition
}: OverviewChartsProps) {
const [hoveredCompetitor, setHoveredCompetitor] = useState<string | null>(null);

  const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;

  const entityMetric = competitorMetrics.find(c => c.id === viewAsId);

  // Map visibility entities to include website URIs and logos for CompanyLogo rendering in charts
  const chartEntities = visibilityEntities.map(entity => {
    const metric = competitorMetrics.find(c => c.name === entity.name);
    return {
      ...entity,
      website: metric?.website ?? undefined,
      logoUrl: metric?.logoUrl ?? undefined
    };
  });
  const mentionTotal = (entityMetric && entityMetric.totalCount != null) ? entityMetric.totalCount : 0;
  const mentionCount = (entityMetric && entityMetric.mentionCount != null) ? entityMetric.mentionCount : 0;
  const mentionPercentage = (entityMetric && entityMetric.visibility != null) ? entityMetric.visibility : 0;

  const displayPosition = (periodAvgPosition && periodAvgPosition < 99 && periodAvgPosition > 0)
    ? periodAvgPosition.toFixed(1)
    : '-';

  const displayShareOfVoice = entityMetric?.shareOfVoice !== undefined
    ? entityMetric.shareOfVoice.toFixed(1) + '%'
    : '-';

  return (
    <Card variant="surface" size="3" className="overflow-hidden !p-0">
      <Grid className="overview-charts-grid">
      {/* ── Col 1: Stat Cards ── */}
      <Flex
        direction={{ initial: 'row', md: 'column' }}
        className="md:h-full border-b md:border-b-0 md:border-r border-[var(--gray-a6)]"
      >
        <StatCard
          title="Mention Rate"
          isActive={activeMetric === 'visibility'}
          onClick={() => setActiveMetric('visibility')}
          value={loading ? <Skeleton width="60px" height="28px" /> : `${mentionPercentage}%`}
          valueTitle={loading ? undefined : `${mentionCount}/${mentionTotal}`}
          tooltipDirection="right"
          tooltipContent={
            <TooltipBody
              title="Mention Rate"
              description="It calculates (Number of Prompts containing the entity / Total Number of Prompts) * 100."
              example="If your entity appears in 5 out of 10 prompts, this will show 50%."
            />
          }
          trendNode={!loading && mentionTrend && (
            <div className="hidden md:block">
              <Text as="p" size="2" mt="1" className={mentionTrend.color || (mentionTrend.value && mentionTrend.value >= 0 ? 'text-[var(--green-11)]' : 'text-[var(--red-11)]')}>
                {mentionTrend.text ? (
                  <>{mentionTrend.text} <Text as="span" color="gray" ml="1">{mentionTrend.label}</Text></>
                ) : (
                  <>
                    <Text as="span" size="1">{(mentionTrend.value || 0) >= 0 ? '▲' : '▼'}</Text>{' '}
                    {Math.abs(mentionTrend.value || 0).toFixed(1)}%{' '}
                    <Text as="span" color="gray" ml="1">{mentionTrend.label}</Text>
                  </>
                )}
              </Text>
            </div>
          )}
          variant="flush"
          className="border-r md:border-r-0 md:border-b border-[var(--gray-a6)]"
          flexGrow="1"
        />

        <StatCard
          title="Average Position"
          isActive={activeMetric === 'position'}
          onClick={() => setActiveMetric('position')}
          value={loading ? <Skeleton width="40px" height="28px" /> : displayPosition}
          tooltipDirection="right"
          tooltipContent={
            <TooltipBody
              title="Average Position"
              description="It calculates the average rank of your entity across all prompts where it appears."
              example="If your entity appears #1 in one prompt and #3 in another, the average position is 2.0."
            />
          }
          trendNode={!loading && positionTrend && (
            <div className="hidden md:block">
              <Text as="p" size="2" mt="1" className={positionTrend.color || 'text-[var(--gray-11)]'}>
                {positionTrend.arrow && <Text as="span" size="1" mr="1">{positionTrend.arrow}</Text>}
                <Text as="span" mr="1">{positionTrend.text}</Text>
                {positionTrend.label && <Text as="span" color="gray">{positionTrend.label}</Text>}
              </Text>
            </div>
          )}
          variant="flush"
          className="border-r md:border-r-0 md:border-b border-[var(--gray-a6)]"
          flexGrow="1"
        />

        <StatCard
          title="Share of Voice"
          isActive={activeMetric === 'shareOfVoice'}
          onClick={() => setActiveMetric('shareOfVoice')}
          value={loading ? <Skeleton width="50px" height="28px" /> : displayShareOfVoice}
          tooltipDirection="right"
          tooltipContent={
            <TooltipBody
              title="Share of Voice"
              description="It calculates (Mentions of Your Brand / Total Mentions of All Brands) * 100."
              example="If your brand is mentioned 20 times and the total market mentions are 100, your SoV is 20%."
            />
          }
          trendNode={!loading && sovTrend && (
            <div className="hidden md:block">
              <Text as="p" size="2" mt="1" className={sovTrend.color || 'text-[var(--gray-11)]'}>
                {sovTrend.arrow && <Text as="span" size="1" mr="1">{sovTrend.arrow}</Text>}
                <Text as="span" mr="1">{sovTrend.text}</Text>
                {sovTrend.label && <Text as="span" color="gray">{sovTrend.label}</Text>}
              </Text>
            </div>
          )}
          variant="flush"
          flexGrow="1"
        />
      </Flex>

      {/* ── Col 2: Active Chart ── */}
      <div
        className="border-b md:border-b-0 md:border-r border-[var(--gray-a6)] flex flex-col"
        style={{ minHeight: 420 }}
      >
        <Flex direction="column" p="4" style={{ flex: 1, minHeight: 0 }}>
          {loading ? (
            <Flex direction="column" gap="3" style={{ flex: 1 }}>
              <Skeleton width="100px" height="12px" />
              <Skeleton width="280px" height="20px" />
              <Box style={{ flex: 1, minHeight: 200 }}>
                <Skeleton width="100%" height="100%" />
              </Box>
            </Flex>
          ) : null}

          {!loading && activeMetric === 'visibility' && (
            <div className="flex flex-col flex-1 min-h-0">
              <Header.Root mb="4">
                <Header.Content>
                  <Header.Kicker>Mention Rate</Header.Kicker>
                  <Header.Title as="h3" size="4">
                    In the last {days} days, LLMs mention{' '}
                    {viewAsId === entityId ? 'your brand' : competitorMetrics.find(c => c.id === viewAsId)?.name}{' '}
                    {mentionPercentage}% of the time.
                  </Header.Title>
                </Header.Content>
              </Header.Root>
              <MentionChart
                data={visibilityChartData}
                entities={chartEntities}
                days={days}
                hoveredEntityName={hoveredCompetitor}
              />
            </div>
          )}

          {!loading && activeMetric === 'position' && (
            <div className="flex flex-col flex-1 min-h-0">
              <Header.Root mb="4">
                <Header.Content>
                  <Header.Kicker>Average Position</Header.Kicker>
                  <Header.Title as="h3" size="4">
                    In the last {days} days, your average position is {periodAvgPosition?.toFixed(1) || 'N/A'}.
                  </Header.Title>
                </Header.Content>
              </Header.Root>
              <PositionChart
                data={visibilityChartData}
                entities={chartEntities}
                avgPosition={periodAvgPosition}
                days={days}
                hoveredEntityName={hoveredCompetitor}
              />
            </div>
          )}

          {!loading && activeMetric === 'shareOfVoice' && (
            <div className="flex flex-col flex-1 min-h-0">
              <Header.Root mb="4">
                <Header.Content>
                  <Header.Kicker>Share of Voice</Header.Kicker>
                  <Header.Title as="h3" size="4">
                    In the last {days} days,{' '}
                    {viewAsId === entityId ? 'you' : competitorMetrics.find(c => c.id === viewAsId)?.name}{' '}
                    own {entityMetric?.shareOfVoice?.toFixed(1) || 0}% of the conversation.
                  </Header.Title>
                </Header.Content>
              </Header.Root>
              <ShareOfVoiceChart
                data={sovChartData}
                entities={[...chartEntities].sort((a, b) => {
                  const valA = competitorMetrics.find(c => c.name === a.name)?.shareOfVoice || 0;
                  const valB = competitorMetrics.find(c => c.name === b.name)?.shareOfVoice || 0;
                  return valA - valB;
                })}
                days={days}
                hoveredEntityName={hoveredCompetitor}
              />
            </div>
          )}
        </Flex>
      </div>

      {/* ── Col 3: Corresponding Table ── */}
      <Box p="4" style={{ overflow: 'hidden', minWidth: 0 }}>
        {loading ? (
          <Flex direction="column" gap="3">
            <Flex justify="between">
              <Skeleton width="90px" height="12px" />
              <Skeleton width="80px" height="12px" />
            </Flex>
            {[1, 2, 3, 4].map(i => (
              <Flex key={i} align="center" gap="2">
                <Skeleton width="24px" height="24px" style={{ borderRadius: 'var(--radius-full)' }} />
                <Skeleton width="100px" height="14px" />
                <Box style={{ marginLeft: 'auto' }}><Skeleton width="40px" height="14px" /></Box>
              </Flex>
            ))}
          </Flex>
        ) : null}
        {!loading && activeMetric === 'visibility' && (
          <RadixTable.Root variant="ghost" size="1">
            <RadixTable.Header>
              <RadixTable.Row>
                <RadixTable.Head variant="modal" style={{ width: '60%' }}>Competitors</RadixTable.Head>
                <RadixTable.Head variant="modal" style={{ width: '40%' }}>Mention Rate</RadixTable.Head>
              </RadixTable.Row>
            </RadixTable.Header>
            <RadixTable.Body>
              {[...competitorMetrics]
                .sort((a, b) => b.visibility - a.visibility)
                .slice(0, 8)
                .map(comp => (
                  <RadixTable.Row
                    key={comp.id}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredCompetitor(comp.name)}
                    onMouseLeave={() => setHoveredCompetitor(null)}
                  >
                    <RadixTable.Cell>
                      <CompetitorLogoCell comp={comp} />
                    </RadixTable.Cell>
                    <RadixTable.Cell>
                      <MentionRateCell value={comp.visibility} />
                    </RadixTable.Cell>
                  </RadixTable.Row>
                ))}
            </RadixTable.Body>
          </RadixTable.Root>
        )}

        {!loading && activeMetric === 'position' && (
          <RadixTable.Root variant="ghost" size="1">
            <RadixTable.Header>
              <RadixTable.Row>
                <RadixTable.Head variant="modal" style={{ width: '60%' }}>Competitors</RadixTable.Head>
                <RadixTable.Head variant="modal" style={{ width: '40%' }}>Average Position</RadixTable.Head>
              </RadixTable.Row>
            </RadixTable.Header>
            <RadixTable.Body>
              {[...competitorMetrics]
                .sort((a, b) => {
                  const posA = a.position ?? Infinity;
                  const posB = b.position ?? Infinity;
                  return posA - posB;
                })
                .slice(0, 8)
                .map(comp => (
                  <RadixTable.Row
                    key={comp.id}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredCompetitor(comp.name)}
                    onMouseLeave={() => setHoveredCompetitor(null)}
                  >
                    <RadixTable.Cell>
                      <CompetitorLogoCell comp={comp} />
                    </RadixTable.Cell>
                    <PositionCell 
                        value={comp.position} 
                        trend={comp.positionChange} 
                    />
                  </RadixTable.Row>
                ))}
            </RadixTable.Body>
          </RadixTable.Root>
        )}

        {!loading && activeMetric === 'shareOfVoice' && (
          <RadixTable.Root variant="ghost" size="1">
            <RadixTable.Header>
              <RadixTable.Row>
                <RadixTable.Head variant="modal" style={{ width: '60%' }}>Competitors</RadixTable.Head>
                <RadixTable.Head variant="modal" style={{ width: '40%' }}>Share of Voice</RadixTable.Head>
              </RadixTable.Row>
            </RadixTable.Header>
            <RadixTable.Body>
              {[...competitorMetrics]
                .sort((a, b) => b.shareOfVoice - a.shareOfVoice)
                .slice(0, 8)
                .map(comp => (
                  <RadixTable.Row
                    key={comp.id}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredCompetitor(comp.name)}
                    onMouseLeave={() => setHoveredCompetitor(null)}
                  >
                    <RadixTable.Cell>
                      <CompetitorLogoCell comp={comp} />
                    </RadixTable.Cell>
                    <ShareOfVoiceCell 
                        value={comp.shareOfVoice} 
                        trend={comp.shareOfVoiceChange} 
                        totalCompetitors={competitorMetrics.length}
                    />
                  </RadixTable.Row>
                ))}
            </RadixTable.Body>
          </RadixTable.Root>
        )}
      </Box>
      </Grid>
    </Card>
  );
}
