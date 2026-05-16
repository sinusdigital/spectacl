export interface Entity {
    id: string;
    name: string;
    website?: string | null;
    logoUrl?: string | null;
    aliases?: string[];
    isArchived?: boolean;
    activePromptCount?: number;
    activeRankingCount?: number;
    activeSuggestionCount?: number;
    _count?: {
        prompts: number;
    };
    metrics?: {
        visibility: number;
        position: number | null;
        shareOfVoice: number;
    }[];
}
