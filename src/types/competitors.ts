export interface Competitor {
    id: string;
    name: string;
    website: string | null;
    logoUrl?: string | null;
    aliases?: string[];
    createdAt: string;
}

export interface SuggestedCompetitor {
    id: string;
    name: string;
    website?: string | null;
    status: string;
}
