import { PromptFrequency } from "@prisma/client";

export function calculateNextSlot(frequency: PromptFrequency | string, fromDate: Date = new Date()): Date {
    const next = new Date(fromDate);
    // Reset seconds/ms to ensure clean slots
    next.setSeconds(0);
    next.setMilliseconds(0);

    switch (frequency) {
        case 'Every6Hours':
            // Slots: 00:00, 06:00, 12:00, 18:00
            // Find next closest slot strictly in future
            const currentHour = next.getHours();

            if (currentHour < 6) {
                next.setHours(6, 0, 0, 0);
            } else if (currentHour < 12) {
                next.setHours(12, 0, 0, 0);
            } else if (currentHour < 18) {
                next.setHours(18, 0, 0, 0);
            } else {
                // Next day 00:00
                next.setDate(next.getDate() + 1);
                next.setHours(0, 0, 0, 0);
            }
            return next;

        case 'Every24Hours':
            // Next 00:00
            next.setDate(next.getDate() + 1);
            next.setHours(0, 0, 0, 0);
            return next;

        case 'Every2Days':
            // "Every two days at 00:00"
            // Logic: Two days from "now", aligned to midnight.
            // i.e. Skip tomorrow's midnight.
            // Ex: Mon 17:00 -> Wed 00:00.
            next.setDate(next.getDate() + 2); // +2 days
            next.setHours(0, 0, 0, 0);
            return next;

        case 'Every7Days':
            // "Every week at 00:00"
            // Ex: Mon 17:00 -> Next Mon 00:00.
            next.setDate(next.getDate() + 7);
            next.setHours(0, 0, 0, 0);
            return next;

        default:
            // Default to 24h behavior
            next.setDate(next.getDate() + 1);
            next.setHours(0, 0, 0, 0);
            return next;
    }
}
