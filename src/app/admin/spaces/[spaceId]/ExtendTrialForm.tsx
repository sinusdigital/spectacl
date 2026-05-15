"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Flex, Text, Button, TextField, Callout } from "@radix-ui/themes";
import { CalendarIcon, InfoCircledIcon } from "@radix-ui/react-icons";

interface ExtendTrialFormProps {
    spaceId: string;
    currentTrialEndsAt: string | null;
    subscriptionStatus: string | null;
}

function toLocalDateInput(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

export default function ExtendTrialForm({
    spaceId,
    currentTrialEndsAt,
    subscriptionStatus,
}: ExtendTrialFormProps) {
    const router = useRouter();
    const defaultDate = (() => {
        const d = new Date();
        d.setDate(d.getDate() + 14);
        return toLocalDateInput(d);
    })();
    const [date, setDate] = useState(defaultDate);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const disabled = subscriptionStatus === "ACTIVE" || subscriptionStatus === "CANCELED";

    async function submit() {
        setBusy(true);
        setError(null);
        setSuccess(null);
        try {
            // End-of-day in the admin's local timezone so "today + 14" ends at 23:59
            const trialEndsAt = new Date(`${date}T23:59:59`).toISOString();
            const res = await fetch(`/api/admin/spaces/${spaceId}/extend-trial`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ trialEndsAt }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error ?? "Failed to extend trial");
                return;
            }
            setSuccess(
                `Trial extended to ${new Date(data.trialEndsAt).toLocaleDateString()} · ${data.llmCreditsRemaining} credits`
            );
            router.refresh();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Request failed");
        } finally {
            setBusy(false);
        }
    }

    return (
        <Flex direction="column" gap="3">
            <Flex direction="column" gap="1">
                <Text size="1" color="gray">Current trial ends</Text>
                <Text size="2">
                    {currentTrialEndsAt
                        ? new Date(currentTrialEndsAt).toLocaleString()
                        : "—"}
                </Text>
            </Flex>

            {disabled ? (
                <Callout.Root size="1" color="gray">
                    <Callout.Icon><InfoCircledIcon /></Callout.Icon>
                    <Callout.Text>
                        Can&apos;t extend trial for a {subscriptionStatus} space.
                    </Callout.Text>
                </Callout.Root>
            ) : (
                <>
                    <Flex direction="column" gap="1">
                        <Text size="1" color="gray">New trial end date</Text>
                        <TextField.Root
                            type="date"
                            value={date}
                            min={toLocalDateInput(new Date(Date.now() + 86_400_000))}
                            onChange={(e) => setDate(e.target.value)}
                            disabled={busy}
                        >
                            <TextField.Slot><CalendarIcon /></TextField.Slot>
                        </TextField.Root>
                    </Flex>
                    <Button onClick={submit} disabled={busy} variant="solid">
                        Extend trial
                    </Button>
                </>
            )}

            {error && (
                <Callout.Root size="1" color="red">
                    <Callout.Text>{error}</Callout.Text>
                </Callout.Root>
            )}
            {success && (
                <Callout.Root size="1" color="green">
                    <Callout.Text>{success}</Callout.Text>
                </Callout.Root>
            )}
        </Flex>
    );
}
