"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import CompetitorTable from "@/components/CompetitorTable";
import PromptIntentChart from "@/components/Charts/PromptIntentChart";
import CompetitorQuadrantChart from "@/components/Charts/CompetitorQuadrantChart";
import SourcesTable from "@/components/Overview/SourcesTable";
import PromptsTable from "@/components/Prompts/PromptsTable";
import DeleteConfirmationModal from "@/components/Shared/DeleteConfirmationModal";
import FilterBar, { TimeRangeType } from '@/components/Shared/FilterBar';
import { useOverviewMetrics } from '@/hooks/useOverviewMetrics';
import OverviewCharts from '@/components/Overview/OverviewCharts';
import PageContainer from "@/components/Shared/PageContainer";
import SplitCard from "@/components/Shared/SplitCard";
import RadixTable from "@/components/Shared/RadixTable";
import { Box, Flex } from '@radix-ui/themes';
import { Prompt } from '@/types/prompts';

const PROMPTS_PAGE_SIZE = 10;

export default function Home() {
  const params = useParams();
  const entityId = params.entityId as string;
  const [viewAsId, setViewAsId] = useState<string>(entityId);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loadingPrompts, setLoadingPrompts] = useState(true);
  const [promptToDelete, setPromptToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [timeRange, setTimeRange] = useState<TimeRangeType>('7d');
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [modelFilter, setModelFilter] = useState<string[]>([]);
  const [intentFilter, setIntentFilter] = useState<string[]>([]);
  const [includePaused, setIncludePaused] = useState<boolean>(false);
  const [hoveredCompetitor, setHoveredCompetitor] = useState<string | null>(null);
  const [promptsPage, setPromptsPage] = useState(1);

  // Reset pagination when filters change so the user isn't stranded on a now-empty page.
  useEffect(() => {
    setPromptsPage(1);
  }, [tagFilter, modelFilter, intentFilter, includePaused, timeRange]);

  const paginatedPrompts = prompts.slice(
    (promptsPage - 1) * PROMPTS_PAGE_SIZE,
    promptsPage * PROMPTS_PAGE_SIZE,
  );

  const {
    loading: metricsLoading,
    competitorMetrics,
    visibilityChartData,
    sovChartData,
    visibilityEntities,
    activeMetric,
    setActiveMetric,
    mentionTrend,
    positionTrend,
    periodAvgPosition,
    sovTrend
  } = useOverviewMetrics({
    entityId,
    viewAsId,
    timeRange,
    tagFilter,
    modelFilter,
    intentFilter,
    includePaused
  });

  const fetchPrompts = useCallback(async () => {
    try {
      const params = [];
      if (tagFilter.length > 0) {
        params.push(`tags=${encodeURIComponent(tagFilter.join(','))}`);
      }
      if (modelFilter.length > 0) {
        params.push(`models=${encodeURIComponent(modelFilter.join(','))}`);
      }
      if (intentFilter.length > 0) {
        params.push(`intents=${encodeURIComponent(intentFilter.join(','))}`);
      }
      params.push(`includePaused=${includePaused}`);
      const queryString = params.length > 0 ? `?${params.join('&')}` : '';

      const res = await fetch(`/api/entities/${entityId}/prompts${queryString}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setPrompts(data);
      } else {
        // console.error("API returned non-array for prompts:", data);
        setPrompts([]);
      }
    } catch (error) {
      console.error("Error fetching prompts:", error);
    } finally {
      setLoadingPrompts(false);
    }
  }, [entityId, tagFilter, modelFilter, intentFilter, includePaused]);

  // Reset viewAsId only when navigating to a different entity
  useEffect(() => {
    if (entityId) {
      setViewAsId(entityId);
    }
  }, [entityId]);

  useEffect(() => {
    if (entityId) {
      fetchPrompts();
    }
  }, [entityId, timeRange, tagFilter, modelFilter, intentFilter, fetchPrompts]);

  const handleStatusChange = async (id: string, newStatus: 'Running' | 'Paused') => {
    setPrompts(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
    try {
      const res = await fetch(`/api/prompts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updatedPrompt = await res.json();
        setPrompts(prev => prev.map(p => p.id === id ? updatedPrompt : p));
      } else {
        fetchPrompts();
      }
    } catch (error) {
      console.error("Error updating status:", error);
      fetchPrompts();
    }
  };

  const handleIntentChange = async (id: string, newIntent: string) => {
    setPrompts(prev => prev.map(p => p.id === id ? { ...p, intent: newIntent } : p));
    try {
      await fetch(`/api/prompts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: newIntent }),
      });
    } catch (error) {
      console.error("Error updating intent:", error);
      fetchPrompts();
    }
  };

  const handleTagsChange = async (id: string, tags: string[]) => {
    try {
      const res = await fetch(`/api/prompts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags }),
      });
      if (res.ok) {
        const updatedPrompt = await res.json();
        setPrompts(prev => prev.map(p => p.id === id ? updatedPrompt : p));
      } else {
        fetchPrompts();
      }
    } catch (error) {
      console.error("Error updating tags:", error);
      fetchPrompts();
    }
  };

  const confirmDelete = async () => {
    if (!promptToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/prompts/${promptToDelete}`, { method: "DELETE" });
      if (res.ok) {
        setPrompts(prev => prev.filter(p => p.id !== promptToDelete));
        setPromptToDelete(null);
      }
    } catch (error) {
      console.error("Error deleting prompt:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
        <PageContainer
            headers={[
                {
                    content: (
                        <FilterBar
                            timeRange={timeRange}
                            setTimeRange={setTimeRange}
                            timeRangeOptions={[
                                { value: '7d', label: '7 Days' },
                                { value: '30d', label: '30 Days' },
                                { value: '90d', label: '90 Days' },
                            ]}
                            entityId={entityId}
                            tagFilter={tagFilter}
                            setTagFilter={setTagFilter}
                            intentFilter={intentFilter}
                            setIntentFilter={setIntentFilter}
                            modelFilter={modelFilter}
                            setModelFilter={setModelFilter}
                            includePaused={includePaused}
                            onIncludePausedChange={setIncludePaused}
                            viewAsId={viewAsId}
                            setViewAsId={setViewAsId}
                            availableEntities={competitorMetrics.map((c, i) => ({
                                id: c.id,
                                name: c.name,
                                logoUrl: c.logoUrl || undefined,
                                website: c.website || undefined,
                                color: c.color || ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'][i % 6] || '#cbd5e1',
                                isPrimary: c.id === entityId
                            }))}
                        />
                    ),
                    sticky: true,
                    className: ""
                }
            ]}
        >
      <Box p="4">
        <Flex direction="column" gap="6">
          <OverviewCharts
            loading={metricsLoading}
            timeRange={timeRange}
            entityId={entityId}
            viewAsId={viewAsId}
            competitorMetrics={competitorMetrics}
            visibilityChartData={visibilityChartData}
            sovChartData={sovChartData}
            visibilityEntities={visibilityEntities}
            activeMetric={activeMetric}
            setActiveMetric={setActiveMetric}
            mentionTrend={mentionTrend}
            positionTrend={positionTrend}
            sovTrend={sovTrend}
            periodAvgPosition={periodAvgPosition}
          />

        <SplitCard ratio={[1, 1]}>
          <SplitCard.Pane>
            <SplitCard.Header
              title="Competitor Comparison"
              description="How you stack up across visibility, mentions, and share of voice."
            />
            <CompetitorTable
              competitors={[...competitorMetrics].sort((a, b) => b.visibility - a.visibility)}
              onHover={setHoveredCompetitor}
              hoveredCompetitor={hoveredCompetitor}
            />
          </SplitCard.Pane>
          <SplitCard.Pane>
            <SplitCard.Header
              title="Visibility vs. Position"
              description="Where each competitor sits on the quadrant."
            />
            <Box className="min-h-[500px] flex-1">
              <CompetitorQuadrantChart
                data={competitorMetrics}
                hoveredCompetitorName={hoveredCompetitor}
              />
            </Box>
          </SplitCard.Pane>
        </SplitCard>

        <SourcesTable
          prompts={prompts}
          showChart
          pageSize={10}
          entityId={entityId}
          sectionTitle="Sources"
          sectionDescription="Every domain and URL cited by AI."
        />

        <SplitCard ratio={[2, 1]}>
          <SplitCard.Pane>
            <SplitCard.Header
              title="Tracked Prompts"
              description="The specific queries we run against AI models for this entity."
            />
            <div className="overflow-x-visible">
              <PromptsTable
                prompts={paginatedPrompts}
                loading={loadingPrompts}
                entityId={entityId}
                onStatusChange={handleStatusChange}
                onIntentChange={handleIntentChange}
                onTagsChange={handleTagsChange}
                onDelete={(id) => setPromptToDelete(id)}
                hideAddRow
                hiddenColumns={['intent', 'tags', 'top_competitor', 'top_source', 'actions']}
                timeRange={timeRange}
                variant="table"
              />
              {prompts.length > PROMPTS_PAGE_SIZE && (
                <RadixTable.Pagination
                  currentPage={promptsPage}
                  total={prompts.length}
                  pageSize={PROMPTS_PAGE_SIZE}
                  onPageChange={setPromptsPage}
                  label="prompts"
                />
              )}
            </div>
          </SplitCard.Pane>
          <SplitCard.Pane>
            <SplitCard.Header
              title="Prompts by intent"
              description={`${prompts.length} prompts total`}
            />
            <Flex direction="column" justify="center" flexGrow="1">
              <PromptIntentChart
                data={Object.entries(prompts.reduce((acc, prompt) => {
                  const intent = prompt.intent || 'Informational';
                  acc[intent] = (acc[intent] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)).map(([name, value]) => ({ name, value }))}
              />
            </Flex>
          </SplitCard.Pane>
        </SplitCard>
        </Flex>
      </Box>

      <DeleteConfirmationModal
        isOpen={!!promptToDelete}
        onClose={() => setPromptToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete Prompt"
        message="Are you sure you want to delete this prompt? This will also delete all analysis history associated with it."
        isDeleting={isDeleting}
      />
    </PageContainer>
  );
}
