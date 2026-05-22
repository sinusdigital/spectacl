"use client";

import { useState } from "react";
import Link from "next/link";
import { Dialog, Flex, Heading, Text, Button } from "@radix-ui/themes";
import { TimerIcon } from "@radix-ui/react-icons";
import UpgradeRequiredModal from "./UpgradeRequiredModal";

interface TrialExpiredModalProps {
    spaceName?: string;
    spaceId?: string;
}

export default function TrialExpiredModal({ spaceName, spaceId }: TrialExpiredModalProps) {
    const [showUpgrade, setShowUpgrade] = useState(false);

    return (
        <>
            <Dialog.Root open>
                <Dialog.Content
                    maxWidth="440px"
                    onEscapeKeyDown={(e) => e.preventDefault()}
                    onPointerDownOutside={(e) => e.preventDefault()}
                    onInteractOutside={(e) => e.preventDefault()}
                >
                    <Flex direction="column" align="center" gap="5" py="4">
                        <Flex
                            align="center"
                            justify="center"
                            style={{
                                width: 56,
                                height: 56,
                                borderRadius: "var(--radius-full)",
                                background: "var(--amber-3)",
                            }}
                        >
                            <TimerIcon width={24} height={24} color="var(--amber-11)" />
                        </Flex>

                        <Flex direction="column" align="center" gap="2">
                            <Heading size="5" align="center">
                                Your trial has ended
                            </Heading>
                            <Text size="2" color="gray" align="center">
                                {spaceName
                                    ? `The free trial for "${spaceName}" has expired.`
                                    : "Your free trial has expired."}{" "}
                                Choose a plan to continue running analyses and
                                tracking your AI visibility.
                            </Text>
                        </Flex>

                        <Text size="2" color="gray" align="center">
                            Your data is safe — nothing has been deleted. Prompts
                            are paused and will resume once you subscribe.
                        </Text>

                        <Flex direction="column" gap="2" width="100%">
                            <Button
                                size="3"
                                variant="solid"
                                style={{ width: "100%" }}
                                onClick={() => setShowUpgrade(true)}
                            >
                                Choose a plan
                            </Button>
                            <Button asChild size="3" variant="soft" color="gray" style={{ width: "100%" }}>
                                <Link href="/spaces">
                                    Switch Workspace
                                </Link>
                            </Button>
                        </Flex>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>

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
