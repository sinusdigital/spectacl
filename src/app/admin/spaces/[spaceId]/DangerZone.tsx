"use client";

import { useState } from "react";
import { Flex, Heading, Text, Button, TextArea } from "@radix-ui/themes";
import { TrashIcon, LockClosedIcon, LockOpen1Icon } from "@radix-ui/react-icons";
import DeleteSpaceModal from "@/components/Admin/DeleteSpaceModal";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Shared/RadixToast";

interface DangerZoneProps {
    spaceId: string;
    spaceName: string;
    isLocked: boolean;
    lockedReason: string | null;
}

export default function DangerZone({ spaceId, spaceName, isLocked, lockedReason }: DangerZoneProps) {
    const [showDelete, setShowDelete] = useState(false);
    const [lockLoading, setLockLoading] = useState(false);
    const [lockReason, setLockReason] = useState(lockedReason ?? "");
    const [locked, setLocked] = useState(isLocked);
    const router = useRouter();
    const { success, error: showError } = useToast();

    async function handleToggleLock() {
        setLockLoading(true);
        try {
            const res = await fetch(`/api/admin/spaces/${spaceId}/lock`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    locked: !locked,
                    reason: !locked ? lockReason.trim() || undefined : undefined,
                }),
            });
            if (!res.ok) {
                const data = await res.json();
                showError("Failed", data.error ?? "Could not update lock status");
                return;
            }
            setLocked(!locked);
            if (!locked) {
                success("Space Locked", `"${spaceName}" is now locked. Users will see a contact support modal.`);
            } else {
                success("Space Unlocked", `"${spaceName}" is now unlocked. Users can access it again.`);
                setLockReason("");
            }
            router.refresh();
        } catch {
            showError("Failed", "Network error");
        } finally {
            setLockLoading(false);
        }
    }

    return (
        <>
            <Flex direction="column" gap="4">
                <Flex direction="column" gap="1">
                    <Heading size="4" color="red">Danger Zone</Heading>
                    <Text size="2" color="gray">Administrative actions that restrict user access.</Text>
                </Flex>

                {/* Lock / Unlock */}
                <Flex
                    direction="column"
                    gap="3"
                    p="4"
                    style={{
                        border: `1px solid var(--${locked ? "orange" : "red"}-6)`,
                        borderRadius: "var(--radius-3)",
                        background: `var(--${locked ? "orange" : "red"}-2)`,
                    }}
                >
                    <Flex align="center" justify="between">
                        <Flex direction="column" gap="1">
                            <Text size="2" weight="bold">
                                {locked ? "Space is locked" : "Lock this space"}
                            </Text>
                            <Text size="1" color="gray">
                                {locked
                                    ? "Users see a blocking modal and cannot use the app. Prompts are paused."
                                    : "Lock the space for misuse. Pauses all prompts and shows a blocking modal to users."}
                            </Text>
                        </Flex>
                        <Button
                            color={locked ? "grass" : "orange"}
                            variant="solid"
                            size="2"
                            onClick={handleToggleLock}
                            loading={lockLoading}
                            style={{ flexShrink: 0 }}
                        >
                            {locked ? <LockOpen1Icon /> : <LockClosedIcon />}
                            {locked ? "Unlock" : "Lock Space"}
                        </Button>
                    </Flex>
                    {!locked && (
                        <TextArea
                            placeholder="Reason for locking (optional, visible to admins only)..."
                            size="2"
                            value={lockReason}
                            onChange={(e) => setLockReason(e.target.value)}
                            style={{ minHeight: 60 }}
                        />
                    )}
                    {locked && lockedReason && (
                        <Text size="1" color="gray">Reason: {lockedReason}</Text>
                    )}
                </Flex>

                {/* Delete */}
                <Flex
                    align="center"
                    justify="between"
                    p="4"
                    style={{
                        border: "1px solid var(--red-6)",
                        borderRadius: "var(--radius-3)",
                        background: "var(--red-2)",
                    }}
                >
                    <Flex direction="column" gap="1">
                        <Text size="2" weight="bold">Delete this space</Text>
                        <Text size="1" color="gray">
                            Permanently remove &ldquo;{spaceName}&rdquo; and all its entities, prompts, and analysis data.
                        </Text>
                    </Flex>
                    <Button
                        color="red"
                        variant="solid"
                        size="2"
                        onClick={() => setShowDelete(true)}
                        style={{ flexShrink: 0 }}
                    >
                        <TrashIcon />
                        Delete Space
                    </Button>
                </Flex>
            </Flex>

            <DeleteSpaceModal
                spaceId={showDelete ? spaceId : null}
                spaceName={spaceName}
                onClose={() => setShowDelete(false)}
                onDeleted={() => {
                    setShowDelete(false);
                    success("Space Deleted", `"${spaceName}" and all its data have been permanently deleted.`);
                    router.push("/admin/spaces");
                }}
            />
        </>
    );
}
