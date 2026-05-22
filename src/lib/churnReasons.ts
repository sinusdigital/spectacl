export const CHURN_REASONS = [
    { id: 'too_expensive',    label: 'Too expensive for my needs' },
    { id: 'missing_features', label: 'Missing features I need' },
    { id: 'switching',        label: 'Switching to a competitor' },
    { id: 'no_longer_needed', label: 'No longer need the service' },
    { id: 'poor_experience',  label: 'Poor experience / too many bugs' },
    { id: 'other',            label: 'Other' },
] as const;

export type ChurnReasonId = (typeof CHURN_REASONS)[number]['id'];

export function resolveChurnLabel(id: ChurnReasonId | string, otherText?: string): string {
    if (id === 'other') return otherText?.trim() || 'Other';
    return CHURN_REASONS.find(r => r.id === id)?.label ?? id;
}
