"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Flex, Box, Text, Grid, Heading, TextField } from "@radix-ui/themes";
import Button from "@/components/Shared/Button";
import { useCompetitors } from "@/hooks/useCompetitors";
import { cn } from "@/lib/utils";
import RadixStepper from "@/components/Shared/RadixStepper";
import { RankingReport } from '@/types/ranking';
import SelectCard from "@/components/Shared/SelectCard";
import CompanyLogo from "@/components/CompanyLogo";

interface RankingWizardProps {
    onComplete?: (data: RankingReport) => void;
    onCancel?: () => void;
    onLimitReached?: () => void;
}

export default function RankingWizard({ onComplete, onCancel, onLimitReached }: RankingWizardProps) {
    const params = useParams();
    const entityId = params.entityId as string;

    const [step, setStep] = useState(1);

    // Step 1: Competitors
    const { competitors } = useCompetitors(entityId);
    const [selectedCompetitorIds, setSelectedCompetitorIds] = useState<Set<string>>(new Set());

    // Step 2: Inputs
    const [primaryBuyerRole, setPrimaryBuyerRole] = useState("");
    const [companySize, setCompanySize] = useState("");
    const [industry, setIndustry] = useState("");
    const [decisionContext, setDecisionContext] = useState("");

    // Results
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Pre-fill selected competitors
    useEffect(() => {
        if (competitors.length > 0 && selectedCompetitorIds.size === 0) {
            setSelectedCompetitorIds(new Set(competitors.map(c => c.id)));
        }
    }, [competitors, selectedCompetitorIds]);

    const toggleCompetitorSelection = (id: string) => {
        const next = new Set(selectedCompetitorIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedCompetitorIds(next);
    };

    const handleAnalyze = async () => {
        setIsAnalyzing(true);

        try {
            const body = {
                competitorIds: Array.from(selectedCompetitorIds),
                primaryBuyerRole,
                companySize,
                industry,
                decisionContext
            };

            const res = await fetch(`/api/entities/${entityId}/rankings`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                const newRanking = await res.json();

                // Trigger the first analysis run immediately
                if (newRanking.prompt?.id) {
                    fetch(`/api/prompts/${newRanking.prompt.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ triggerAnalysis: true })
                    }).catch((err) => console.error('Failed to trigger first run:', err));
                }

                if (onComplete) {
                    onComplete(newRanking);
                }
            } else if (res.status === 403) {
                if (onLimitReached) {
                    onLimitReached();
                } else {
                    alert("Active prompt limit reached. Please upgrade your plan.");
                }
            } else {
                const errorData = await res.json().catch(() => ({}));
                console.error("Failed to create ranking analysis:", errorData);
                alert(errorData.error || "Failed to create analysis. Please try again.");
            }
        } catch (error) {
            console.error("Error creating ranking:", error);
            alert("Error creating analysis.");
        } finally {
            setIsAnalyzing(false);
        }
    };


    return (
        <Flex direction="column" gap="6">
            {/* Progress Bar */}
            <Box mb="4">
                <RadixStepper
                    steps={['Target Competitors', 'Refine Context']}
                    currentStep={step}
                />
            </Box>

            <Box className="min-h-[300px]">
                {/* Step 1: Competitors */}
                {step === 1 && (
                    <Flex direction="column" gap="6">
                        <Box className="text-center">
                            <Heading size="4" mb="1">Select Competitors</Heading>
                            <Text size="2" color="gray">Choose which competitors to include in the Ranking analysis.</Text>
                        </Box>

                        <Grid columns={{ initial: '1', sm: '2', md: '2' }} gap="4">
                            {competitors.map((competitor) => {
                                const isSelected = selectedCompetitorIds.has(competitor.id);
                                return (
                                    <SelectCard
                                        key={competitor.id}
                                        title={competitor.name}
                                        subtitle={competitor.website?.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                                        icon={
                                            <CompanyLogo
                                                name={competitor.name}
                                                domain={competitor.website || ""}
                                                logoUrl={competitor.logoUrl}
                                                size={40}
                                            />
                                        }
                                        selected={isSelected}
                                        onClick={() => toggleCompetitorSelection(competitor.id)}
                                        className={cn(!isSelected && "opacity-60 grayscale hover:opacity-100 hover:grayscale-0")}
                                    />
                                );
                            })}
                        </Grid>

                        <Flex gap="3" mt="6">
                            {onCancel && (
                                <Box style={{ flex: 1 }}>
                                    <Button variant="tertiary" onClick={onCancel} fullWidth={true}>Cancel</Button>
                                </Box>
                            )}
                            <Box style={{ flex: 1 }}>
                                <Button
                                    variant="primary"
                                    onClick={() => setStep(2)}
                                    disabled={selectedCompetitorIds.size === 0}
                                    fullWidth={true}
                                >
                                    Continue
                                </Button>
                            </Box>
                        </Flex>
                    </Flex>
                )}

                {/* Step 2: Inputs + Create */}
                {step === 2 && (
                    <Flex direction="column" gap="6">
                        <Box className="text-center">
                            <Heading size="4" mb="1">Refine Analysis</Heading>
                            <Text size="2" color="gray">Provide context to tailor the analysis.</Text>
                        </Box>

                        <Flex direction="column" gap="4">
                            <Grid columns={{ initial: "1", sm: "2" }} gap="4">
                                <Box>
                                    <Text as="div" size="2" weight="medium" mb="1">Primary Buyer Role</Text>
                                    <TextField.Root
                                        size="3"
                                        value={primaryBuyerRole}
                                        onChange={(e) => setPrimaryBuyerRole(e.target.value)}
                                        placeholder="e.g. CTO, Marketing Director"
                                    />
                                </Box>
                                <Box>
                                    <Text as="div" size="2" weight="medium" mb="1">Company Size</Text>
                                    <TextField.Root
                                        size="3"
                                        value={companySize}
                                        onChange={(e) => setCompanySize(e.target.value)}
                                        placeholder="e.g. Enterprise, 500+ employees"
                                    />
                                </Box>
                            </Grid>
                            <Box>
                                <Text as="div" size="2" weight="medium" mb="1">Industry</Text>
                                <TextField.Root
                                    size="3"
                                    value={industry}
                                    onChange={(e) => setIndustry(e.target.value)}
                                    placeholder="e.g. Fintech, SaaS"
                                />
                            </Box>
                            <Box>
                                <Text as="div" size="2" weight="medium" mb="1">Decision Context</Text>
                                <TextField.Root
                                    size="3"
                                    value={decisionContext}
                                    onChange={(e) => setDecisionContext(e.target.value)}
                                    placeholder="e.g. Migration from legacy systems"
                                />
                            </Box>
                        </Flex>

                        <Flex gap="3" mt="4">
                            <Box style={{ flex: 1 }}>
                                <Button variant="tertiary" onClick={() => setStep(1)} fullWidth={true}>Back</Button>
                            </Box>
                            <Box style={{ flex: 1 }}>
                                <Button
                                    variant="primary"
                                    onClick={handleAnalyze}
                                    disabled={isAnalyzing}
                                    isLoading={isAnalyzing}
                                    fullWidth={true}
                                >
                                    Create Ranking
                                </Button>
                            </Box>
                        </Flex>
                    </Flex>
                )}
            </Box>
        </Flex>
    );
}
