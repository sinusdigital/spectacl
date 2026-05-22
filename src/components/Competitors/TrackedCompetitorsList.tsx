import { Grid } from "@radix-ui/themes";
import CompetitorCard from "@/components/CompetitorCard";
import Button from "@/components/Shared/Button";
import SectionHeader from "@/components/Shared/SectionHeader";
import { Competitor } from "@/types/competitors";
import { useState } from "react";

interface TrackedCompetitorsListProps {
    competitors: Competitor[];
    loading: boolean;
    deletingId: string | null;
    onEdit: (competitor: Competitor) => void;
    onUntrack: (competitor: Competitor) => Promise<{ success: boolean; jobId?: string }>;
}

export default function TrackedCompetitorsList({
    competitors,
    loading,
    deletingId,
    onEdit,
    onUntrack
}: TrackedCompetitorsListProps) {
    const [removingId, setRemovingId] = useState<string | null>(null);

    const handleUntrack = async (competitor: Competitor) => {
        setRemovingId(competitor.id);
        await onUntrack(competitor);
        setRemovingId(null);
    };

    return (
        <>
            <div className="pt-8 mb-4">
                <SectionHeader
                    title="Tracked Competitors"
                    count={competitors.length}
                    description="Your main list of tracked competitors"
                    className="mb-0"
                />
            </div>
            {loading ? (
                <div className="text-center py-8 text-[var(--gray-9)]">Loading...</div>
            ) : competitors.length === 0 ? (
                <div className="card-vibe p-8 text-center text-[var(--gray-9)]">
                    No competitors yet. Add some above to start tracking.
                </div>
            ) : (
                <Grid columns={{ initial: '1', md: '2', lg: '3', xl: '4' }} gap="6">
                    {competitors.map((competitor) => (
                        <CompetitorCard
                            key={competitor.id}
                            name={competitor.name}
                            website={competitor.website}
                            logoUrl={competitor.logoUrl}
                            className={deletingId === competitor.id ? 'opacity-50' : ''}
                            linkWebsite={true}
                            description={
                                competitor.aliases && competitor.aliases.length > 0
                                    ? `Aliases: ${competitor.aliases.join(", ")}`
                                    : 'No aliases defined'
                            }
                            actions={
                                <>
                                    <Button
                                        variant="tertiary"
                                        size="sm"
                                        onClick={() => handleUntrack(competitor)}
                                        isLoading={removingId === competitor.id}
                                    >
                                        Untrack
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => onEdit(competitor)}
                                    >
                                        Edit
                                    </Button>
                                </>
                            }
                        />
                    ))}
                </Grid>
            )}
        </>
    );
}
