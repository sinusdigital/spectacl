"use client";

import { useEffect, useState, useCallback } from "react";
import { Flex, Text, Skeleton, Box, Grid, Separator } from "@radix-ui/themes";
import PageContainer from "@/components/Shared/PageContainer";
import Header from "@/components/Shared/Header";
import PageBrief from "@/components/Shared/PageBrief";
import GlobalCitationsChart from "@/components/Insights/GlobalCitationsChart";
import MonthCycler from "@/components/Shared/MonthCycler";

interface ModelInsights {
    model: string;
    totalCitations: number;
    data: { domain: string; count: number; percentage: number; prevPercentage: number | null }[];
}

interface GlobalInsightsData {
    models: ModelInsights[];
    availableModels: string[];
    availableMonths: string[];
    period: string;
    prevPeriodLabel: string;
    source: string;
}

export default function GlobalInsightsPage() {
    const [data, setData] = useState<GlobalInsightsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);

    const fetchInsights = useCallback(async (period?: string) => {
        try {
            setIsLoading(true);
            const params = new URLSearchParams({ model: 'all_models' });
            if (period) params.set('period', period);
            const response = await fetch(`/api/insights/global?${params}`);
            if (!response.ok) throw new Error("Failed to fetch insights");
            const json: GlobalInsightsData = await response.json();
            setData(json);
            // On first load, initialise selectedPeriod to latest available
            if (!period && json.availableMonths?.length) {
                setSelectedPeriod(json.availableMonths[json.availableMonths.length - 1]);
            }
        } catch (err) {
            console.error(err);
            setError("Unable to load global insights at this time.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchInsights();
    }, [fetchInsights]);

    function handlePeriodChange(period: string) {
        setSelectedPeriod(period);
        fetchInsights(period);
    }

    const periods = data?.availableMonths ?? [];

    return (
        <PageContainer
            headers={[
                {
                    content: (
                        <Header.Root mb="0">
                            <Flex align="center" gap="3" width="100%">
                                <Header.Title as="h1" size="4" weight="bold">Global Insights</Header.Title>
                                {periods.length > 0 && selectedPeriod && (
                                    <>
                                        <Separator orientation="vertical" size="1" />
                                        <MonthCycler
                                            periods={periods}
                                            selected={selectedPeriod}
                                            onChange={handlePeriodChange}
                                        />
                                    </>
                                )}
                            </Flex>
                        </Header.Root>
                    ),
                    sticky: true,
                    zIndex: 25
                }
            ]}
        >
            {data && (
                <PageBrief
                    description="These benchmarks aggregate and compare citation patterns across major AI models. Data is refreshed monthly to reflect changes in how LLMs prioritize sources and domains."
                    metrics={[
                        { label: "Source", value: "Spectacl Network Insights" },
                        { label: "Latest Update", value: data.period },
                    ]}
                />
            )}
            {isLoading ? (
                <Box p="6">
                    <Skeleton height="500px" width="100%" />
                </Box>
            ) : error ? (
                <Flex align="center" justify="center" p="9" direction="column" gap="4">
                    <Text color="red">{error}</Text>
                </Flex>
            ) : data ? (
                <Box px={{ initial: '4', sm: '6', md: '8' }} py="6">
                    <Grid columns={{ initial: '1', md: '1', lg: '2', xl: '3' }} gap="6">
                        {data.models.map((m) => (
                            <div key={m.model} style={{ height: '100%' }}>
                                <GlobalCitationsChart
                                    data={m.data}
                                    totalCitations={m.totalCitations}
                                    period={data.period}
                                    prevPeriodLabel={data.prevPeriodLabel}
                                    modelName={m.model}
                                />
                            </div>
                        ))}
                    </Grid>
                </Box>
            ) : null}
        </PageContainer>
    );
}
