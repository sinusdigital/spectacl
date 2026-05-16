"use client";

import React from 'react';
import { Box, Card, Flex, Text } from '@radix-ui/themes';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { SuggestedPrompt } from '@/types/prompts';
import SuggestedPromptCard from './SuggestedPromptCard';
import Button from '@/components/Shared/Button';
import SectionHeader from '@/components/Shared/SectionHeader';
import { useDragScroll, scrollFadeMask } from '@/hooks/useDragScroll';

interface PromptsKickstartProps {
    entityId: string;
    suggestions: SuggestedPrompt[];
    isGenerating?: boolean;
    isLoadingInitial?: boolean;
    onAccept: (s: SuggestedPrompt) => void;
    onReject: (id: string) => void;
    onDiscover: () => void;
}

const CARD_WIDTH = 320;

// ── Discover more placeholder card ───────────────────────────────────────────

function DiscoverMoreCard({ onClick }: { onClick: () => void }) {
    return (
        <Card
            size="1"
            variant="surface"
            className="h-full"
            style={{ borderStyle: 'dashed' }}
        >
            <Flex direction="column" gap="3" justify="center" align="start" height="100%" minWidth="0" p="2">
                <Text size="1" color="gray">
                    Generate more prompt ideas tailored to your brand.
                </Text>
                <Button variant="tertiary" size="sm" onClick={onClick}>
                    Discover Prompts
                </Button>
            </Flex>
        </Card>
    );
}

// ── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
    return (
        <Card size="1" variant="surface">
            <Flex direction="row" gap="3" align="start" p="2">
                <Flex direction="column" gap="2" flexGrow="1" minWidth="0">
                    <Box className="h-3 w-5/6 rounded bg-[var(--gray-a4)] animate-pulse" />
                    <Box className="h-3 w-full rounded bg-[var(--gray-a4)] animate-pulse" />
                    <Box className="h-3 w-3/4 rounded bg-[var(--gray-a4)] animate-pulse" />
                </Flex>
                <Flex direction="column" gap="2" flexShrink="0">
                    <Box className="h-7 w-16 rounded bg-[var(--gray-a3)] animate-pulse" />
                    <Box className="h-7 w-16 rounded bg-[var(--gray-a3)] animate-pulse" />
                </Flex>
            </Flex>
        </Card>
    );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function PromptsKickstart({
    suggestions,
    isGenerating = false,
    isLoadingInitial = false,
    onAccept,
    onReject,
    onDiscover,
}: PromptsKickstartProps) {
    const prefersReducedMotion = useReducedMotion() ?? false;
    const { ref: scrollRef, showLeftFade, showRightFade } = useDragScroll<HTMLDivElement>();
    const maskImage = scrollFadeMask(showLeftFade, showRightFade);

    // Hide the strip during the initial suggestions fetch so we don't flash an
    // empty row before the real state is known.
    if (isLoadingInitial) return null;

    return (
        <Box
            p="4"
            style={{
                borderBottom: '1px solid var(--gray-a3)',
                background: 'var(--gray-a1)',
            }}
        >
            <SectionHeader
                title={isGenerating ? 'Generating suggestions…' : 'Suggested Prompts'}
                count={isGenerating || suggestions.length === 0 ? undefined : suggestions.length}
                description="AI-generated prompts tailored to your brand."
            />

            {/* Horizontal scroll row */}
            <Flex
                ref={scrollRef}
                gap="4"
                align="stretch"
                className="overflow-x-auto snap-x hide-scrollbar"
                style={{
                    WebkitMaskImage: maskImage,
                    maskImage,
                }}
            >
                {isGenerating ? (
                    <>
                        {[0, 1, 2].map(i => (
                            <Box
                                key={`skeleton-${i}`}
                                width={`${CARD_WIDTH}px`}
                                flexShrink="0"
                                className="snap-start"
                            >
                                <SkeletonCard />
                            </Box>
                        ))}
                    </>
                ) : (
                    <AnimatePresence initial={false}>
                        {suggestions.map(s => (
                            <motion.div
                                key={s.id}
                                layout={!prefersReducedMotion}
                                initial={prefersReducedMotion ? false : { opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
                                transition={{ duration: prefersReducedMotion ? 0 : 0.2, ease: 'easeOut' }}
                                style={{ width: CARD_WIDTH, flexShrink: 0 }}
                                className="snap-start"
                            >
                                <SuggestedPromptCard
                                    text={s.text}
                                    tags={s.tags ?? []}
                                    actions={
                                        <>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => onAccept(s)}
                                                fullWidth
                                            >
                                                Track
                                            </Button>
                                            <Button
                                                variant="tertiary"
                                                size="sm"
                                                onClick={() => onReject(s.id)}
                                                fullWidth
                                            >
                                                Dismiss
                                            </Button>
                                        </>
                                    }
                                />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}

                {!isGenerating && (
                    <Box
                        width={`${CARD_WIDTH}px`}
                        flexShrink="0"
                        className="snap-start"
                    >
                        <DiscoverMoreCard onClick={onDiscover} />
                    </Box>
                )}
            </Flex>
        </Box>
    );
}
