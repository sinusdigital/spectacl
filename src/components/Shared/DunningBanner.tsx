"use client";

import { Flex, Text } from "@radix-ui/themes";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";

interface DunningBannerProps {
    spaceName?: string;
    spaceId?: string;
}

/**
 * Warning banner shown when a space's subscription is PAST_DUE.
 *
 * Mollie retries failed payments automatically (up to 3 times over several days).
 * During this grace period, users keep full access but need to know their payment
 * failed so they can proactively fix it (e.g. update their card).
 *
 * This banner is NOT blocking — unlike TrialExpiredModal, users can still work.
 * The payment method update flow (#13) will add a CTA button here later.
 */
export default function DunningBanner({ spaceName }: DunningBannerProps) {
    return (
        <Flex
            align="center"
            justify="center"
            px="4"
            py="2"
            style={{
                backgroundColor: "var(--orange-3)",
                borderBottom: "1px solid var(--orange-6)",
                flexShrink: 0,
            }}
        >
            <Flex align="center" gap="2">
                <ExclamationTriangleIcon
                    width={14}
                    height={14}
                    style={{ color: "var(--orange-11)" }}
                />
                <Text
                    size="1"
                    weight="medium"
                    style={{ color: "var(--orange-11)" }}
                >
                    {spaceName
                        ? `Payment failed for ${spaceName}.`
                        : "Your last payment failed."}{" "}
                    We&apos;ll retry automatically, but please check your payment
                    method to avoid service interruption.
                </Text>
            </Flex>
        </Flex>
    );
}
