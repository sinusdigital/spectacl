"use client";

import React from "react";
import Modal from "@/components/Shared/Modal";
import Button from "@/components/Shared/Button";
import ModelLogo from "@/components/Shared/ModelLogo";
import HighlightedResponse from "./HighlightedResponse";
import { AnalysisKeyMetrics, AnalysisEntitiesList, AnalysisLinksList } from "./AnalysisMetrics";
import { AnalysisResult } from "@/types/prompts";
import { Grid, Flex, Box, ScrollArea, Separator, Text } from "@radix-ui/themes";
import SectionLabel from '@/components/Shared/SectionLabel';

interface AnalysisDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    onDelete?: (id: string) => void;
    result: AnalysisResult;
    entityName: string;
    entityLogo?: string | null;
    entityWebsite?: string | null;
}

export default function AnalysisDetailModal({ isOpen, onClose, onDelete, result, entityName, entityLogo, entityWebsite }: AnalysisDetailModalProps) {
    const isError = result.status === 'failed' || !!result.errorMessage;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="7xl"
            headerBorder={false}
            title={
                <Flex align="center" gap="3">
                    <ModelLogo
                        provider={result.llmProvider || result.llmModel.split(' ')[0].toLowerCase()}
                        name={result.llmModel}
                        size="lg"
                        className={isError ? 'grayscale opacity-50' : ''}
                    />
                    <Flex direction="column">
                        <Text size="4" weight="bold" color={isError ? "ruby" : "gray"} highContrast={!isError}>{result.llmModel}</Text>
                        <Text size="2" color={isError ? "red" : "gray"}>
                            {new Date(result.createdAt).toLocaleString()}
                        </Text>
                    </Flex>
                </Flex>
            }
        >
            {/* Mobile layout */}
            <div className="lg:hidden" style={{ marginTop: '-1.5rem' }}>
            <Flex direction="column" gap="5">
                {/* Mobile: Metrics first */}
                <Box>
                    <AnalysisKeyMetrics result={result} variant="row" labelVariant="modal" />
                </Box>

                <Separator size="4" />

                {/* Mobile: Response area with bounded height */}
                <Box>
                    <SectionLabel variant="modal">Response</SectionLabel>
                    <ScrollArea
                        type="auto"
                        scrollbars="vertical"
                        style={{
                            maxHeight: '40vh',
                            borderRadius: 'var(--radius-3)',
                            border: isError ? '1px solid var(--red-5)' : '1px solid var(--gray-5)',
                            backgroundColor: isError ? 'var(--white-a11)' : 'var(--gray-2)'
                        }}
                    >
                        <Box p="3" className={isError ? 'text-[var(--red-11)]' : 'text-[var(--gray-11)]'}>
                            <HighlightedResponse
                                content={result.errorMessage || result.response}
                                entityName={entityName}
                                mentions={result.mentions}
                                isError={isError}
                                className={isError ? 'prose-headings:text-[var(--red-12)]' : ''}
                            />
                        </Box>
                    </ScrollArea>
                </Box>

                <Separator size="4" />

                {/* Mobile: Entities */}
                <Box>
                    <SectionLabel variant="modal">Competitors Found</SectionLabel>
                    <AnalysisEntitiesList mentions={result.mentions} entityName={entityName} entityLogo={entityLogo} entityWebsite={entityWebsite} variant="tags" />
                </Box>

                <Separator size="4" />

                {/* Mobile: Sources */}
                <Box>
                    <SectionLabel variant="modal">Sources</SectionLabel>
                    <AnalysisLinksList links={result.links} entityName={entityName} variant="compact" clickable={true} />
                </Box>

                {/* Mobile: Delete */}
                {onDelete && (
                    <>
                        <Separator size="4" />
                        <Button
                            variant="danger"
                            onClick={() => {
                                onDelete(result.id);
                                onClose();
                            }}
                            className="flex items-center justify-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete Result
                        </Button>
                    </>
                )}
            </Flex>
            </div>

            {/* Desktop layout */}
            <div className="hidden lg:block" style={{ marginTop: '-1.5rem' }}>
            <Grid columns="4" gap="6" style={{ height: '70vh' }}>
                {/* Left Column: Full Response */}
                <Box style={{ gridColumn: 'span 3 / span 3', minHeight: 0, height: '100%' }}>
                    <ScrollArea
                        type="auto"
                        scrollbars="vertical"
                        style={{
                            height: '100%',
                            borderRadius: 'var(--radius-4)',
                            border: isError ? '1px solid var(--red-5)' : '1px solid var(--gray-5)',
                            backgroundColor: isError ? 'var(--white-a11)' : 'var(--gray-2)'
                        }}
                    >
                        <Box p="4" className={isError ? 'text-[var(--red-11)]' : 'text-[var(--gray-11)]'}>
                            <HighlightedResponse
                                content={result.errorMessage || result.response}
                                entityName={entityName}
                                mentions={result.mentions}
                                isError={isError}
                                className={isError ? 'prose-headings:text-[var(--red-12)]' : ''}
                            />
                        </Box>
                    </ScrollArea>
                </Box>

                {/* Right Column: Facts & Metadata */}
                <Flex direction="column" gap="5" align="stretch" style={{ minHeight: 0, height: '100%' }}>
                    <ScrollArea type="auto" scrollbars="vertical" style={{ flexGrow: 1, paddingRight: 'var(--space-4)' }}>
                        <Flex direction="column" gap="5" align="stretch">
                            {/* Metrics */}
                            <Box>
                                <AnalysisKeyMetrics result={result} variant="row" labelVariant="modal" />
                            </Box>

                            <Separator size="4" />

                            {/* Competitors Found */}
                            <Box>
                                <SectionLabel variant="modal">Competitors Found</SectionLabel>
                                <AnalysisEntitiesList mentions={result.mentions} entityName={entityName} entityLogo={entityLogo} entityWebsite={entityWebsite} variant="tags" />
                            </Box>

                            <Separator size="4" />

                            {/* Links */}
                            <Box>
                                <SectionLabel variant="modal">Sources</SectionLabel>
                                <AnalysisLinksList links={result.links} entityName={entityName} variant="compact" clickable={true} />
                            </Box>
                        </Flex>
                    </ScrollArea>

                    {/* Delete Button */}
                    {onDelete && (
                        <>
                            <Separator size="4" />
                            <Button
                                variant="danger"
                                onClick={() => {
                                    onDelete(result.id);
                                    onClose();
                                }}
                                className="flex items-center justify-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete Result
                            </Button>
                        </>
                    )}
                </Flex>
            </Grid>
            </div>
        </Modal>
    );
}
