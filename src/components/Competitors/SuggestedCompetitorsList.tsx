import { Flex, Box, Avatar } from "@radix-ui/themes";
import CompetitorCard from "@/components/CompetitorCard";
import BaseCard from "@/components/Shared/BaseCard";
import Button from "@/components/Shared/Button";
import SectionHeader from "@/components/Shared/SectionHeader";
import { SuggestedCompetitor } from "@/types/competitors";
import { useDragScroll, scrollFadeMask } from "@/hooks/useDragScroll";
import { useState } from "react";

interface SuggestedCompetitorsListProps {
    suggestions: SuggestedCompetitor[];
    totalCount?: number;
    onDismiss: (suggestion: SuggestedCompetitor) => Promise<boolean>;
    onTrack: (suggestion: SuggestedCompetitor) => Promise<{ success: boolean; jobId?: string }>;
}

export default function SuggestedCompetitorsList({ suggestions, totalCount, onDismiss, onTrack }: SuggestedCompetitorsListProps) {
    const [addingSuggestion, setAddingSuggestion] = useState<string | null>(null);
    const { ref: scrollRef, showLeftFade, showRightFade } = useDragScroll<HTMLDivElement>();
    const { ref: emptyScrollRef } = useDragScroll<HTMLDivElement>();
    const maskImage = scrollFadeMask(showLeftFade, showRightFade);

    const handleTrack = async (suggestion: SuggestedCompetitor) => {
        setAddingSuggestion(suggestion.id);
        await onTrack(suggestion);
        setAddingSuggestion(null);
    };

    return (
        <div className="pt-6">
            <SectionHeader
                title="Suggested Competitors"
                count={totalCount !== undefined ? (totalCount > 30 ? "30+" : totalCount) : suggestions.length}
                description="We found these competitors in recent LLM answers"
            />
            {suggestions.length > 0 ? (
                <Flex
                    ref={scrollRef}
                    gap="6"
                    className="overflow-x-auto pb-4 snap-x hide-scrollbar"
                    style={{
                        WebkitMaskImage: maskImage,
                        maskImage,
                    }}
                >
                    {suggestions.map((competitor, index) => (
                        <Box 
                            key={index} 
                            width="320px" 
                            flexShrink="0" 
                            className="snap-start"
                        >
                            <CompetitorCard
                                name={competitor.name}
                                website={competitor.website || null}
                                className="h-full"
                                linkWebsite={true}
                                actions={
                                    <>
                                        <Button
                                            variant="tertiary"
                                            size="sm"
                                            onClick={() => onDismiss(competitor)}
                                        >
                                            Dismiss
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => handleTrack(competitor)}
                                            isLoading={addingSuggestion === competitor.id}
                                            loadingText="Adding..."
                                            className="hidden-icon" // Retain hidden-icon helper if needed for responsiveness
                                        >
                                            Track
                                        </Button>
                                    </>
                                }
                            />
                        </Box>
                    ))}
                </Flex>
            ) : (
                <Flex ref={emptyScrollRef} gap="6" className="overflow-x-auto pb-4 snap-x opacity-60 hide-scrollbar">
                    {[1].map((i) => (
                        <Box key={i} width="320px" flexShrink="0" className="snap-start" style={{ paddingLeft: 'var(--space-1)' }}>
                            <BaseCard variant="inactive" className="h-full border-dashed border-[var(--gray-5)]">
                                <BaseCard.Header
                                    title={<div className="h-4 bg-[var(--gray-4)] rounded w-32 animate-pulse"></div>}
                                    subtitle={<div className="h-3 bg-[var(--gray-3)] rounded w-20 mt-1 animate-pulse"></div>}
                                    logo={
                                        <Avatar
                                            fallback={
                                                <svg className="w-5 h-5 text-[var(--gray-6)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                </svg>
                                            }
                                            size="4"
                                            radius="large"
                                            variant="soft"
                                            color="gray"
                                            className="animate-pulse"
                                        />
                                    }
                                    titleClassName="h-5"
                                />
                                <BaseCard.Body>
                                    <div className="mt-1">
                                        <p className="text-[11px] text-[var(--gray-10)] font-medium leading-relaxed">
                                            Run prompts to find new competitors.
                                        </p>
                                    </div>
                                </BaseCard.Body>
                                <BaseCard.Footer className="opacity-40">
                                    <div className="h-8 bg-[var(--gray-3)] rounded-lg"></div>
                                    <div className="h-8 bg-[var(--gray-3)] rounded-lg"></div>
                                </BaseCard.Footer>
                            </BaseCard>
                        </Box>
                    ))}
                </Flex>
            )}
        </div>
    );
}
