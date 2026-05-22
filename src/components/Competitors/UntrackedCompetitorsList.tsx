import { Grid } from "@radix-ui/themes";
import CompetitorCard from "@/components/CompetitorCard";
import Button from "@/components/Shared/Button";
import SectionHeader from "@/components/Shared/SectionHeader";
import { SuggestedCompetitor } from "@/types/competitors";
import { useState } from "react";

interface UntrackedCompetitorsListProps {
    suggestions: SuggestedCompetitor[];
    onRemove: (suggestion: SuggestedCompetitor) => void;
    onTrack: (suggestion: SuggestedCompetitor) => Promise<{ success: boolean; jobId?: string }>;
}

export default function UntrackedCompetitorsList({ suggestions, onRemove, onTrack }: UntrackedCompetitorsListProps) {
    const [addingSuggestion, setAddingSuggestion] = useState<string | null>(null);

    const handleTrack = async (suggestion: SuggestedCompetitor) => {
        setAddingSuggestion(suggestion.id);
        const { success } = await onTrack(suggestion);
        if (success) {
            setAddingSuggestion(null);
        } else {
            setAddingSuggestion(null);
        }
    };

    const handleRemoveClick = (suggestion: SuggestedCompetitor) => {
        onRemove(suggestion);
    };

    return (
        <div className="pt-8">
            <SectionHeader
                title="Untracked Competitors"
                count={suggestions.length}
                description="These competitors are currently not included in your analytics"
                badgeClassName="bg-gray-100 text-gray-600"
            />

            <Grid columns={{ initial: '1', md: '2', lg: '3', xl: '4' }} gap="6">
                {suggestions.map((suggestion) => (
                    <CompetitorCard
                        key={suggestion.id}
                        name={suggestion.name}
                        website={suggestion.website || null}
                        className="bg-gray-50 opacity-75 hover:opacity-100"
                        logoClassName="grayscale"
                        badges={null}
                        actions={
                            <>
                                <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={() => handleRemoveClick(suggestion)}
                                >
                                    Remove
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handleTrack(suggestion)}
                                    isLoading={addingSuggestion === suggestion.id}
                                    loadingText="Tracking..."
                                    className="disabled:opacity-50"
                                >
                                    Track
                                </Button>
                            </>
                        }
                    />
                ))}
            </Grid>
        </div>
    );
}
