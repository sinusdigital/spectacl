import { Prompt, AnalysisResult } from "./prompts";
import { Competitor } from "./competitors";

export interface RankingReport {
    id: string;
    name?: string | null;
    primaryBuyerRole?: string | null;
    industry?: string | null;
    decisionContext?: string | null;
    companySize?: string | null;
    isArchived?: boolean;
    updatedAt: string | Date;
    prompt?: (Prompt & { analysisResults: AnalysisResult[] }) | null;
    entity?: {
        id: string;
        name: string;
        website?: string | null;
        logoUrl?: string | null;
        primaryColor?: string | null;
    } | null;
    competitors?: (Competitor & { color?: string | null; primaryColor?: string | null })[] | null;
}

export interface StructuredRankingEntity {
    name: string;
    company?: string; // Alias for name
    entity?: string; // Alias for name
    rank: number;
    market_share?: string;
    market_share_estimate?: string; // Alias for market_share
    market_position?: string;
    strengths?: string[];
    weaknesses?: string[];
    relevance_for_buyer?: string;
}

export interface StructuredRankingSource {
    title: string;
    url: string;
    type?: string;
}

export interface StructuredRankingResponse {
    market_ranking: {
        entities: StructuredRankingEntity[];
    };
    sources?: StructuredRankingSource[];
}
