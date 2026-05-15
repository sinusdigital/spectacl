"use client";

import { useState } from "react";
import { Flex, Text } from "@radix-ui/themes";
import { InfoCircledIcon, ExclamationTriangleIcon } from "@radix-ui/react-icons";
import UpgradeRequiredModal from "@/components/Shared/UpgradeRequiredModal";

interface TrialBannerProps {
    spaceName?: string;
    trialEndsAt?: Date | string | null;
    subscriptionStatus?: string;
    spaceId?: string;
}

function getDaysLeft(trialEndsAt: Date | string | null): number {
    if (!trialEndsAt) return 0;
    const ms = new Date(trialEndsAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export default function TrialBanner({ 
    spaceName, 
    trialEndsAt, 
    subscriptionStatus,
    spaceId
}: TrialBannerProps) {
    const [showUpgrade, setShowUpgrade] = useState(false);

    const isIncomplete = subscriptionStatus === "INCOMPLETE";
    const isTrialing = subscriptionStatus === "TRIALING";

    // Show for TRIALING (with end date) or INCOMPLETE (subscription required)
    if (isTrialing && (!trialEndsAt || !spaceId)) return null;
    if (!isTrialing && !isIncomplete) return null;
    if (!spaceId) return null;

    const daysLeft = isTrialing ? getDaysLeft(trialEndsAt!) : 0;
    const isExpired = isTrialing && daysLeft === 0;
    const isUrgent = isExpired || isIncomplete || (isTrialing && daysLeft <= 3);

    // Don't render banner when trial is expired — TrialExpiredModal handles the blocking UX
    if (isExpired) return null;

    const message = isIncomplete
        ? <>{spaceName} requires a subscription to run analyses{" — "}</>
        : <>{spaceName} trial ends in {daysLeft} {daysLeft === 1 ? 'day' : 'days'}{" — "}</>;

    return (
        <>
            <Flex
                align="center"
                justify="center"
                px="4"
                py="2"
                style={{
                    backgroundColor: isUrgent ? "var(--red-3)" : "var(--accent-3)",
                    borderBottom: `1px solid ${isUrgent ? "var(--red-6)" : "var(--accent-6)"}`,
                    flexShrink: 0,
                }}
            >
                <Flex align="center" gap="2">
                    {isUrgent
                        ? <ExclamationTriangleIcon width={14} height={14} style={{ color: "var(--red-11)" }} />
                        : <InfoCircledIcon width={14} height={14} style={{ color: "var(--accent-11)" }} />
                    }
                    <Text
                        size="1"
                        weight="medium"
                        style={{ color: isUrgent ? "var(--red-11)" : "var(--accent-11)" }}
                    >
                        {message}
                        <button
                            onClick={() => setShowUpgrade(true)}
                            style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                fontWeight: 600,
                                color: isUrgent ? "var(--red-11)" : "var(--accent-11)",
                                textDecoration: "underline",
                                padding: 0,
                                fontSize: "inherit",
                            }}
                        >
                            Choose a plan
                        </button>
                    </Text>
                </Flex>
            </Flex>

            <UpgradeRequiredModal
                isOpen={showUpgrade}
                onClose={() => setShowUpgrade(false)}
                resourceName="trial"
                limit={null}
                spaceId={spaceId}
                llmProvider="MANAGED"
            />
        </>
    );
}
