export type AnalysisStatus = 'pending' | 'running' | 'success' | 'failed';

export interface AnalysisResult {
    id: string;
    createdAt: string;
    llmModel: string;
    llmProvider?: string | null;
    response: string;
    sentiment: number | null;
    mentioned: boolean;
    position: number | null;
    status?: AnalysisStatus | null;
    progressStep?: string | null;
    errorMessage?: string | null;
    mentions?: {
        isPrimaryEntity: boolean;
        detectedName: string;
        competitorId: string | null;
        position?: number | null;
        competitor?: {
            name: string;
            logoUrl?: string | null;
            website?: string | null;
        };
    }[];
    links?: {
        url: string;
        domain: string;
    }[];
}

export interface Tag {
    id: string;
    name: string;
    color?: string | null;
}

export type PromptStatus = 'Running' | 'Paused';
export type PromptFrequency = 'Every6Hours' | 'Every24Hours' | 'Every2Days' | 'Every7Days';

export interface Prompt {
    id: string;
    text: string;
    intent: string;
    status: PromptStatus;
    frequency: PromptFrequency;
    llms: string[];
    lastRunAt: string | null;
    nextRunAt: string | null;
    createdAt: string;
    
    // Cached Metrics
    lastMentionRate?: number | null;
    lastAvgPosition?: number | null;
    lastShareOfVoice?: number | null;
    

    // Cached Window Metrics
    mentionRate7d?: number | null;
    avgPosition7d?: number | null;
    shareOfVoice7d?: number | null;

    mentionRate30d?: number | null;
    avgPosition30d?: number | null;
    shareOfVoice30d?: number | null;

    mentionRate90d?: number | null;
    avgPosition90d?: number | null;
    shareOfVoice90d?: number | null;

    language?: string | null;
    analysisResults: AnalysisResult[];
    tags: Tag[];
}

export interface SuggestedPrompt {
    id: string;
    text: string;
    intent?: string;
    status: string;
    tags?: string[];
}

export const FREQUENCIES = {
    'Every6Hours': { label: '6h', hours: 6 },
    'Every24Hours': { label: '24h', hours: 24 },
    'Every2Days': { label: '2d', hours: 48 },
    'Every7Days': { label: '7d', hours: 168 },
};

// Re-export ModelConfig and DEFAULT_MODELS from the canonical source
export type { ModelConfig } from '@/types/models';
export { DEFAULT_MODELS } from '@/types/models';

export const STANDARD_INTENTS: Record<string, string> = {
    'Navigational': 'The user is looking for a specific website or page.',
    'Informational': 'The user wants to find an answer to a specific question.',
    'Transactional': 'The user is considering a purchase or wants to perform an action.',
    'Commercial': 'The user is investigating products or services.',
    'Competitor Analysis': 'The user is comparing the entity against competitors.',
};
