"use client";

import React from "react";
import { Flex, Text, Button } from "@radix-ui/themes";
import { ClockIcon } from "@radix-ui/react-icons";

interface CancellationBannerProps {
    spaceName: string;
    accessEndsAt: Date | string;
    spaceId: string;
}

export default function CancellationBanner({ spaceName, accessEndsAt, spaceId }: CancellationBannerProps) {
    const endDate = new Date(accessEndsAt);
    const now = new Date();
    const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    return (
        <Flex
            align="center"
            justify="center"
            gap="4"
            px="4"
            py="2"
            style={{
                background: "var(--amber-3)",
                borderBottom: "1px solid var(--amber-6)",
                flexShrink: 0,
            }}
        >
            <Flex align="center" gap="2">
                <ClockIcon style={{ color: "var(--amber-9)", flexShrink: 0 }} />
                <Text size="2" style={{ color: "var(--amber-11)" }}>
                    <strong>{spaceName}</strong> access ends{" "}
                    {daysLeft <= 1 ? "tomorrow" : `in ${daysLeft} days`}, {" "}
                    {endDate.toLocaleDateString(undefined, { month: "long", day: "numeric" })}.
                    Your data is available until then.
                </Text>
            </Flex>
            <Button
                variant="solid"
                color="amber"
                highContrast
                size="1"
                asChild
            >
                <a href={`/spaces/${spaceId}/billing`}>Reactivate</a>
            </Button>
        </Flex>
    );
}
