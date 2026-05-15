import Link from 'next/link';
import { Box, Text as RadixText, Flex } from '@radix-ui/themes';
import Button from '@/components/Shared/Button';
import { Prompt } from '@/types/prompts';
import IntentSwitcher from '../Prompts/IntentSwitcher';
import TagPill from '../Prompts/TagPill';
import RadixTable from '../Shared/RadixTable';
import { MentionMetric, PositionMetric, ShareOfVoiceMetric } from '@/components/Shared/MetricTriplet';

interface TrackedPromptsProps {
    prompts: Prompt[];
    loading: boolean;
    entityId: string;
    onPromptUpdate?: () => void;
}

const TrackedPrompts = ({ prompts, loading, entityId, onPromptUpdate }: TrackedPromptsProps) => {

    const handleIntentChange = async (promptId: string, newIntent: string) => {
        try {
            const res = await fetch(`/api/prompts/${promptId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ intent: newIntent }),
            });

            if (res.ok) {
                if (onPromptUpdate) onPromptUpdate();
            } else {
                throw new Error("Failed to update intent");
            }
        } catch (error) {
            console.error("Error updating intent:", error);
            alert("Failed to update intent. Please try again.");
        }
    };


    return (
        <Box className="h-full">
            {/* Header removed and handled by parent structure */}

            {loading ? (
                <Flex justify="center" py="8">
                    <RadixText color="gray">Loading...</RadixText>
                </Flex>
            ) : prompts.length === 0 ? (
                <Flex direction="column" align="center" py="8" gap="4">
                    <RadixText size="2" color="gray">No prompts tracked yet</RadixText>
                    <Button variant="primary" size="sm" asChild>
                        <Link href={`/${entityId}/prompts`}>
                            Add your first prompt
                        </Link>
                    </Button>
                </Flex>
            ) : (
                    <RadixTable.Root variant="ghost" layout="fixed">
                        <RadixTable.Header>
                            <RadixTable.Row>
                                <RadixTable.Head variant="modal" width="30px">#</RadixTable.Head>
                                <RadixTable.Head variant="modal">Prompt</RadixTable.Head>
                                <RadixTable.Head variant="modal" width="130px">Intent</RadixTable.Head>
                                <RadixTable.Head variant="modal" width="130px">Tags</RadixTable.Head>
                                <RadixTable.Head variant="modal" width="90px" className="pl-4" style={{ borderLeft: '1px solid var(--gray-a4)' }}>Mention Rate</RadixTable.Head>
                                <RadixTable.Head variant="modal" width="90px">Average Position</RadixTable.Head>
                                <RadixTable.Head variant="modal" width="90px">Share of Voice</RadixTable.Head>
                            </RadixTable.Row>
                        </RadixTable.Header>
                        <RadixTable.Body>
                            {prompts.slice(0, 5).map((prompt, index) => (
                                <RadixTable.Row key={prompt.id}>
                                    <RadixTable.Cell>
                                        <RadixText size="1" color="gray">{index + 1}</RadixText>
                                    </RadixTable.Cell>
                                    <RadixTable.Cell>
                                        <Link
                                            href={`/${entityId}/prompts/${prompt.id}`}
                                            className="block truncate"
                                            title={prompt.text}
                                        >
                                            <RadixText size="2" weight="medium" highContrast>{prompt.text}</RadixText>
                                        </Link>
                                    </RadixTable.Cell>
                                    <RadixTable.Cell>
                                        <IntentSwitcher
                                            currentIntent={prompt.intent || 'Informational'}
                                            onIntentChange={(newIntent) => handleIntentChange(prompt.id, newIntent)}
                                        />
                                    </RadixTable.Cell>
                                    <RadixTable.Cell>
                                        <Flex wrap="wrap" gap="1">
                                            {prompt.tags && prompt.tags.length > 0 ? (
                                                prompt.tags.slice(0, 2).map(tag => (
                                                    <TagPill key={tag.id} tag={tag} size="sm" />
                                                ))
                                            ) : (
                                                <RadixText color="gray" size="1" style={{ fontStyle: 'italic' }}>No tags</RadixText>
                                            )}
                                            {prompt.tags && prompt.tags.length > 2 && (
                                                <RadixText size="1" color="gray">+{prompt.tags.length - 2}</RadixText>
                                            )}
                                        </Flex>
                                    </RadixTable.Cell>
                                    <RadixTable.Cell className="pl-4" style={{ borderLeft: '1px solid var(--gray-a4)' }}>
                                        <MentionMetric
                                            value={prompt.lastMentionRate}
                                            isAnalyzing={prompt.analysisResults?.some(r => r.status === 'running' || r.status === 'pending')}
                                            showIndicator={true}
                                            flex={false}
                                            showLabel={false}
                                        />
                                    </RadixTable.Cell>
                                    <RadixTable.Cell>
                                        <PositionMetric
                                            value={prompt.lastAvgPosition}
                                            isAnalyzing={prompt.analysisResults?.some(r => r.status === 'running' || r.status === 'pending')}
                                            showIndicator={true}
                                            flex={false}
                                            showLabel={false}
                                        />
                                    </RadixTable.Cell>
                                    <RadixTable.Cell>
                                        <ShareOfVoiceMetric
                                            value={prompt.lastShareOfVoice}
                                            isAnalyzing={prompt.analysisResults?.some(r => r.status === 'running' || r.status === 'pending')}
                                            showIndicator={true}
                                            flex={false}
                                            showLabel={false}
                                        />
                                    </RadixTable.Cell>
                                </RadixTable.Row>
                            ))}
                        </RadixTable.Body>
                    </RadixTable.Root>
            )}
        </Box>
    );
};

export default TrackedPrompts;
