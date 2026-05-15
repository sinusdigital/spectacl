export type SuggestionCategory = 'Content' | 'Technical' | 'Authority' | 'UX' | 'Brand';
export type ImpactLevel = 'High' | 'Medium' | 'Low';
export type EffortLevel = 'High' | 'Medium' | 'Low';
export type SuggestionStatus = 'Suggested' | 'ToDo' | 'In_Progress' | 'Done' | 'Dismissed' | 'Archived';

/**
 * AEO channel — whether a tactic targets owned (your site) or earned (third-party) signals.
 * Earned signals validate owned content in the LLM corpus; the engine uses this to balance
 * suggestions and explain dependencies to users.
 */
export type AeoChannel = 'OnPage' | 'OffPage';

/** Persisted on EntitySuggestion.triggerContext when the engine selected the
 *  item via fired triggers (vs. baseline weight). Powers "Suggested because…". */
export interface SuggestionTriggerContext {
    totalWeight: number;
    fired: {
        kind: string;
        weight: number;
        value?: number | string | null;
        explanation?: string;
    }[];
}

export interface Suggestion {
    id: string;
    title: string;
    description: string;
    category: SuggestionCategory;
    channel: AeoChannel;
    impact: number; // 1-10 (Y-axis)
    effort: number; // 1-10 (X-axis)
    status: SuggestionStatus;
    tags?: string[];
    /** Why the engine surfaced this. null/undefined for manual rows or
     *  baseline-only engine rows. */
    triggerContext?: SuggestionTriggerContext | null;
    /** First-acknowledged timestamp. Null = NEW (dot + bold title in the UI).
     *  Set on first PATCH/drawer open/status change/bulk action. */
    viewedAt?: string | null;
    /** Server timestamps — surfaced so the UI can render "Done X ago" etc. */
    createdAt?: string;
    updatedAt?: string;
    metrics?: {
        affectedPrompts?: number;
        estimatedVisibilityGain?: string;
    }
}

/** A row is NEW when it's still in the backlog AND the user hasn't touched it yet. */
export function isNewSuggestion(s: Suggestion): boolean {
    return s.status === "Suggested" && (s.viewedAt === null || s.viewedAt === undefined);
}
