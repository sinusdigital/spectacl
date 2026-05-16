"use client";

import React, { useState } from "react";
import { Flex, Box, Heading, Text, Button, VisuallyHidden } from "@radix-ui/themes";
import { ExclamationTriangleIcon, Cross2Icon } from "@radix-ui/react-icons";
import { useRouter } from "next/navigation";
import RadixDialog from "@/components/Shared/RadixDialog";
import { useToast } from "@/components/Shared/RadixToast";
import { CHURN_REASONS, resolveChurnLabel, type ChurnReasonId } from "@/lib/churnReasons";

type Step = "admin_warning" | "survey" | "save_offer" | "confirm";

interface CancellationSurveyModalProps {
    spaceName: string;
    spaceId: string;
    /** User's role in this space */
    userRole: "OWNER" | "ADMIN";
    /** Current plan — show downgrade offer only if not already on lowest paid tier */
    currentPlan: string;
    onCanceled: () => void;
    trigger: React.ReactNode;
}

export default function CancellationSurveyModal({
    spaceName,
    spaceId,
    userRole,
    currentPlan,
    onCanceled,
    trigger,
}: CancellationSurveyModalProps) {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<Step>(userRole === "ADMIN" ? "admin_warning" : "survey");
    const [selectedReason, setSelectedReason] = useState<ChurnReasonId | null>(null);
    const [otherText, setOtherText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    useToast(); // Keep hook available for future downgrade flow
    const router = useRouter();

    // Downgrade flow is not implemented yet — skip save_offer step.
    // currentPlan prop preserved for future downgrade implementation.
    void currentPlan;

    function handleOpen(isOpen: boolean) {
        setOpen(isOpen);
        if (isOpen) {
            setStep(userRole === "ADMIN" ? "admin_warning" : "survey");
            setSelectedReason(null);
            setOtherText('');
            setError(null);
        }
    }

    async function handleConfirmCancellation() {
        setIsSubmitting(true);
        setError(null);

        try {
            const reason = selectedReason ? resolveChurnLabel(selectedReason, otherText) : null;
            const res = await fetch(`/api/spaces/${spaceId}/subscription/cancel`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reason }),
            });

            if (!res.ok) {
                const data = await res.json();
                setError(data.error ?? "Something went wrong. Please try again.");
                return;
            }

            setOpen(false);
            router.refresh(); // re-fetches layout → CancellationBanner appears immediately
            onCanceled();
        } catch {
            setError("Network error. Please check your connection and try again.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <RadixDialog.Root open={open} onOpenChange={handleOpen}>
            <RadixDialog.Trigger asChild>{trigger}</RadixDialog.Trigger>

            <RadixDialog.Content maxWidth="480px">
                <VisuallyHidden>
                    <RadixDialog.Title>Cancel Subscription</RadixDialog.Title>
                    <RadixDialog.Description>
                        Cancel your {spaceName} subscription.
                    </RadixDialog.Description>
                </VisuallyHidden>

                {/* Shared header: title + close button on the same row (matches Modal pattern) */}
                <Flex justify="between" align="center" mb="4">
                    <Flex align="center" gap="2">
                        {step === "admin_warning" && (
                            <Box
                                style={{
                                    background: "var(--amber-3)",
                                    borderRadius: "var(--radius-3)",
                                    padding: "var(--space-2)",
                                    display: "flex",
                                    alignItems: "center",
                                    flexShrink: 0,
                                }}
                            >
                                <ExclamationTriangleIcon width="16" height="16" style={{ color: "var(--amber-9)" }} />
                            </Box>
                        )}
                        <Heading size="4">
                            {step === "admin_warning" && "You are not the space owner"}
                            {step === "survey" && "Why are you cancelling?"}
                            {step === "save_offer" && "Before you go"}
                            {step === "confirm" && "Cancel subscription?"}
                        </Heading>
                    </Flex>
                    <RadixDialog.Close asChild>
                        <Button variant="ghost" color="gray" size="1">
                            <Cross2Icon />
                        </Button>
                    </RadixDialog.Close>
                </Flex>

                {/* Step 0: Admin Warning */}
                {step === "admin_warning" && (
                    <Flex direction="column" gap="4">
                        <Text size="2" color="gray">
                            Cancelling will affect billing for this entire workspace —{" "}
                            <strong>{spaceName}</strong> — and all its members. The space owner
                            will be notified.
                        </Text>

                        <Flex gap="3" justify="end">
                            <RadixDialog.Close asChild>
                                <Button variant="soft" color="gray">Never mind</Button>
                            </RadixDialog.Close>
                            <Button
                                variant="solid"
                                color="amber"
                                highContrast
                                onClick={() => setStep("survey")}
                            >
                                I understand, continue
                            </Button>
                        </Flex>
                    </Flex>
                )}

                {/* Step 1: Exit Survey */}
                {step === "survey" && (
                    <Flex direction="column" gap="5">
                        <Text size="2" color="gray">One question. Takes 5 seconds. Genuinely helps us improve.</Text>

                        <Flex direction="column" gap="2">
                            {CHURN_REASONS.map((r) => (
                                <label
                                    key={r.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 10,
                                        padding: "var(--space-3) var(--space-4)",
                                        borderRadius: "var(--radius-3)",
                                        border: `1.5px solid ${selectedReason === r.id ? "var(--accent-9)" : "var(--gray-5)"}`,
                                        background: selectedReason === r.id ? "var(--accent-2)" : "transparent",
                                        cursor: "pointer",
                                        transition: "all 0.15s ease",
                                    }}
                                >
                                    <input
                                        type="radio"
                                        name="churn-reason"
                                        value={r.id}
                                        checked={selectedReason === r.id}
                                        onChange={() => setSelectedReason(r.id)}
                                        style={{ accentColor: "var(--accent-9)" }}
                                    />
                                    <Text size="2" weight={selectedReason === r.id ? "medium" : "regular"}>
                                        {r.label}
                                    </Text>
                                </label>
                            ))}

                            {selectedReason === 'other' && (
                                <textarea
                                    placeholder="Tell us more…"
                                    value={otherText}
                                    onChange={e => setOtherText(e.target.value)}
                                    rows={3}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        borderRadius: 'var(--radius-3)',
                                        border: '1.5px solid var(--gray-5)',
                                        background: 'var(--gray-2)',
                                        color: 'var(--gray-12)',
                                        fontSize: 14,
                                        resize: 'vertical',
                                        outline: 'none',
                                        fontFamily: 'inherit',
                                        boxSizing: 'border-box',
                                    }}
                                />
                            )}
                        </Flex>

                        <Flex gap="3" justify="end">
                            <RadixDialog.Close asChild>
                                <Button variant="soft" color="gray">Keep subscription</Button>
                            </RadixDialog.Close>
                            <Button
                                variant="soft"
                                color="red"
                                onClick={() => setStep("confirm")}
                                disabled={!selectedReason || (selectedReason === 'other' && !otherText.trim())}
                            >
                                Continue
                            </Button>
                        </Flex>
                    </Flex>
                )}

                {/* Step 2: Confirmation */}
                {step === "confirm" && (
                    <Flex direction="column" gap="5">
                        <Flex direction="column" gap="2">
                            <Text size="2" color="gray">
                                You&apos;ll keep full access until the end of your billing period. After that, your
                                space becomes inacessible but stays dormant for <strong>90 days</strong>, then is permanently deleted.
                            </Text>
                            <Text size="2" color="gray">
                                If you reactivate within 90 days, your data will be exactly as you left it.
                            </Text>
                        </Flex>

                        {error && (
                            <Box
                                p="3"
                                style={{ background: "var(--red-2)", borderRadius: "var(--radius-3)" }}
                            >
                                <Text size="2" color="red">{error}</Text>
                            </Box>
                        )}

                        <Flex gap="3" justify="end">
                            <RadixDialog.Close asChild>
                                <Button variant="soft" color="gray" disabled={isSubmitting}>
                                    Keep subscription
                                </Button>
                            </RadixDialog.Close>
                            <Button
                                variant="solid"
                                color="red"
                                onClick={handleConfirmCancellation}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? "Cancelling…" : "Yes, cancel subscription"}
                            </Button>
                        </Flex>
                    </Flex>
                )}
            </RadixDialog.Content>
        </RadixDialog.Root>
    );
}
