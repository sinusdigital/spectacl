"use client";

import React from "react";
import { Badge, Box, Card, Flex, Heading, Text } from "@radix-ui/themes";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { SuggestedPrompt } from "@/types/prompts";
import SuggestedPromptCard from "./SuggestedPromptCard";
import Button from "@/components/Shared/Button";
import SidePanel from "@/components/Shared/SidePanel";

const PERSIST_KEY = "prompts_suggest_panel_open";

interface SuggestedSidePanelProps {
    suggestions: SuggestedPrompt[];
    isGenerating?: boolean;
    onAccept: (s: SuggestedPrompt) => void;
    onReject: (id: string) => void;
    onDiscover: () => void;
}

function SkeletonCard() {
    return (
        <Card size="1" variant="surface">
            <Flex direction="column" gap="2" p="1">
                <Box className="h-3 w-5/6 rounded bg-[var(--gray-a4)] animate-pulse" />
                <Box className="h-3 w-full rounded bg-[var(--gray-a4)] animate-pulse" />
                <Box className="h-3 w-3/4 rounded bg-[var(--gray-a4)] animate-pulse" />
                <Flex gap="2" mt="1">
                    <Box className="h-7 flex-1 rounded bg-[var(--gray-a3)] animate-pulse" />
                    <Box className="h-7 flex-1 rounded bg-[var(--gray-a3)] animate-pulse" />
                </Flex>
            </Flex>
        </Card>
    );
}

function DiscoverMoreCard({ onClick }: { onClick: () => void }) {
    return (
        <Card size="1" variant="surface" style={{ borderStyle: "dashed", flexShrink: 0 }}>
            <Flex direction="column" gap="2" p="1">
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

export default function SuggestedSidePanel({
    suggestions,
    isGenerating = false,
    onAccept,
    onReject,
    onDiscover,
}: SuggestedSidePanelProps) {
    const prefersReducedMotion = useReducedMotion() ?? false;
    const count = suggestions.length;
    const showCountBadge = !isGenerating && count > 0;

    return (
        <SidePanel
            stateKey={PERSIST_KEY}
            defaultOpen
            railTooltip={`Suggested prompts${count > 0 ? ` (${count})` : ""}`}
            header={
                <Flex align="center" gap="2">
                    <Heading as="h3" size="3" weight="bold">Suggested</Heading>
                    {showCountBadge && (
                        <Badge variant="solid" size="1" radius="full">{count}</Badge>
                    )}
                </Flex>
            }
            description="AI-generated prompts tailored to your brand."
            railBadge={
                showCountBadge ? (
                    <Badge variant="soft" color="gray" size="1" radius="full">{count}</Badge>
                ) : null
            }
        >
            <Flex
                direction="column"
                gap="3"
                className="hide-scrollbar"
                style={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: "auto",
                    paddingBottom: "var(--space-2)",
                }}
            >
                {isGenerating ? (
                    <>
                        <SkeletonCard />
                        <SkeletonCard />
                        <SkeletonCard />
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
                                transition={{ duration: prefersReducedMotion ? 0 : 0.2, ease: "easeOut" }}
                            >
                                <SuggestedPromptCard
                                    layout="vertical"
                                    text={s.text}
                                    tags={s.tags ?? []}
                                    actions={
                                        <>
                                            <Button
                                                variant="tertiary"
                                                size="sm"
                                                onClick={() => onReject(s.id)}
                                                fullWidth
                                            >
                                                Dismiss
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => onAccept(s)}
                                                fullWidth
                                            >
                                                Track
                                            </Button>
                                        </>
                                    }
                                />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}

                {!isGenerating && <DiscoverMoreCard onClick={onDiscover} />}
            </Flex>
        </SidePanel>
    );
}
