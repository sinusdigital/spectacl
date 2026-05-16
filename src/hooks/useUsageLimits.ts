"use client";

import { useState, useCallback } from "react";

interface UseUsageLimitsOptions {
    entityId: string;
}

interface UseUsageLimitsReturn {
    maxActivePrompts: number | null;
    currentActivePrompts: number;
    isUpgradeModalOpen: boolean;
    setIsUpgradeModalOpen: (open: boolean) => void;
    fetchUsage: () => Promise<void>;
    canAddPrompt: () => boolean;
    checkAndShowUpgradeModal: () => boolean;
}

export function useUsageLimits({ entityId }: UseUsageLimitsOptions): UseUsageLimitsReturn {
    const [maxActivePrompts, setMaxActivePrompts] = useState<number | null>(null);
    const [currentActivePrompts, setCurrentActivePrompts] = useState<number>(0);
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

    // Suppress unused variable warning - entityId is part of the interface for future use
    void entityId;

    const fetchUsage = useCallback(async () => {
        try {
            const res = await fetch(`/api/spaces/current/usage`);
            if (res.ok) {
                const data = await res.json();
                setMaxActivePrompts(data.limits.maxActivePrompts);
                setCurrentActivePrompts(data.current.activePrompts);
            }
        } catch (error) {
            console.error("Error fetching usage:", error);
        }
    }, []);

    const canAddPrompt = useCallback(() => {
        if (maxActivePrompts === null || maxActivePrompts === -1) return true;
        return currentActivePrompts < maxActivePrompts;
    }, [maxActivePrompts, currentActivePrompts]);

    const checkAndShowUpgradeModal = useCallback(() => {
        if (!canAddPrompt()) {
            setIsUpgradeModalOpen(true);
            return false;
        }
        return true;
    }, [canAddPrompt]);

    return {
        maxActivePrompts,
        currentActivePrompts,
        isUpgradeModalOpen,
        setIsUpgradeModalOpen,
        fetchUsage,
        canAddPrompt,
        checkAndShowUpgradeModal
    };
}
