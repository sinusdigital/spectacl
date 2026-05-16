"use client";

import React, { useState, useEffect } from "react";
import { Flex, Box, Text, Grid } from "@radix-ui/themes";
import { CheckCircledIcon } from "@radix-ui/react-icons";
import Modal from "./Modal";
import Button from "./Button";

interface PaymentSuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    plan: string;
    returnUrl: string;
}

interface PlanLimits {
    prompts: string;
    entities: string;
    members: string;
}

/**
 * Modal shown after a successful plan upgrade.
 * Displays the new plan name and the updated limits.
 */
export default function PaymentSuccessModal({
    isOpen,
    onClose,
    plan,
    returnUrl
}: PaymentSuccessModalProps) {
    const [limits, setLimits] = useState<PlanLimits | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        let cancelled = false;
        
        // Start loading - wrap in requestAnimationFrame to avoid "setState in effect" warning
        // while still ensuring it happens immediately on mount/open.
        const frame = requestAnimationFrame(() => {
            if (!cancelled) setLoading(true);
        });

        fetch("/api/admin/plan-limits")
            .then((res) => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then((data) => {
                const p = data[plan.toUpperCase()];
                if (p && !cancelled) {
                    const formatLimit = (v: number) => (v === -1 ? "Unlimited" : v.toString());
                    setLimits({
                        prompts: formatLimit(p.maxActivePrompts),
                        entities: formatLimit(p.maxEntities),
                        members: formatLimit(p.maxMembers),
                    });
                }
            })
            .catch((err) => {
                console.error("[PaymentSuccessModal] Failed to fetch limits:", err);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
            cancelAnimationFrame(frame);
        };
    }, [isOpen, plan]);

    const handleGoToDashboard = () => {
        onClose();
        window.location.href = returnUrl;
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Plan Upgraded!"
            size="md"
            actions={
                <Button
                    variant="primary"
                    fullWidth
                    size="md"
                    onClick={handleGoToDashboard}
                >
                    Continue
                </Button>
            }
        >
            <Flex direction="column" gap="4" align="center" className="text-center">
                <Box
                    p="3"
                    style={{
                        backgroundColor: "var(--green-2)",
                        borderRadius: "var(--radius-full)",
                        color: "var(--green-9)",
                    }}
                >
                    <CheckCircledIcon width="32" height="32" />
                </Box>

                <Box>
                    <Text size="2" color="gray">
                        You are now on the{" "}
                        <Text weight="bold" highContrast>
                            {plan}
                        </Text>{" "}
                        plan. Here&apos;s what you&apos;ve unlocked:
                    </Text>
                </Box>

                {!loading && limits ? (
                    <Grid columns="3" gap="3" width="100%">
                        {[
                            { label: "Active Prompts", value: limits.prompts },
                            { label: "Entities", value: limits.entities },
                            { label: "Team Members", value: limits.members },
                        ].map((item) => (
                            <Flex
                                key={item.label}
                                direction="column"
                                align="center"
                                justify="center"
                                p="3"
                                style={{
                                    backgroundColor: "var(--gray-2)",
                                    border: "1px solid var(--gray-4)",
                                    borderRadius: "var(--radius-3)",
                                }}
                            >
                                <Text size="4" weight="bold" highContrast>
                                    {item.value}
                                </Text>
                                <Text size="1" color="gray" style={{ lineHeight: 1.2 }}>
                                    {item.label}
                                </Text>
                            </Flex>
                        ))}
                    </Grid>
                ) : (
                    <Box height="84px" /> // Spacer during load
                )}
            </Flex>
        </Modal>
    );
}
