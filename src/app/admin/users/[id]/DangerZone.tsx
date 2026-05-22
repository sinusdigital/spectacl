"use client";

import { useState } from "react";
import { Flex, Heading, Text, Button, TextArea } from "@radix-ui/themes";
import { TrashIcon, LockClosedIcon, LockOpen1Icon } from "@radix-ui/react-icons";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Shared/RadixToast";
import ActionDialog from "@/components/Shared/ActionDialog";

interface UserDangerZoneProps {
    userId: string;
    userName: string;
    userEmail: string;
    isLocked: boolean;
    lockedReason: string | null;
    ownsSpaces: boolean;
}

export default function UserDangerZone({
    userId,
    userName,
    userEmail,
    isLocked,
    lockedReason,
    ownsSpaces,
}: UserDangerZoneProps) {
    const [lockLoading, setLockLoading] = useState(false);
    const [lockReason, setLockReason] = useState(lockedReason ?? "");
    const [locked, setLocked] = useState(isLocked);
    const [showDelete, setShowDelete] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const router = useRouter();
    const { success, error: showError } = useToast();

    async function handleToggleLock() {
        setLockLoading(true);
        try {
            const res = await fetch(`/api/admin/users/${userId}/lock`, {
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
                success("User Locked", `${userName} is now locked. All sessions have been revoked.`);
            } else {
                success("User Unlocked", `${userName} can now log in again.`);
                setLockReason("");
            }
            router.refresh();
        } catch {
            showError("Failed", "Network error");
        } finally {
            setLockLoading(false);
        }
    }

    async function handleDelete() {
        setDeleteLoading(true);
        try {
            const res = await fetch(`/api/admin/users/${userId}/delete`, {
                method: "DELETE",
            });
            if (!res.ok) {
                const data = await res.json();
                showError("Failed", data.error ?? "Could not delete user");
                return;
            }
            success("User Deleted", `${userName} (${userEmail}) has been permanently deleted.`);
            router.push("/admin/users");
        } catch {
            showError("Failed", "Network error");
        } finally {
            setDeleteLoading(false);
            setShowDelete(false);
        }
    }

    return (
        <>
            <Flex direction="column" gap="4">
                <Flex direction="column" gap="1">
                    <Heading size="4" color="red">Danger Zone</Heading>
                    <Text size="2" color="gray">Administrative actions that affect this user&apos;s access.</Text>
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
                                {locked ? "User is locked" : "Lock this user"}
                            </Text>
                            <Text size="1" color="gray">
                                {locked
                                    ? "All sessions were revoked. User cannot log in until unlocked."
                                    : "Revokes all sessions and prevents the user from logging in."}
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
                            {locked ? "Unlock" : "Lock User"}
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
                    direction="column"
                    gap="3"
                    p="4"
                    style={{
                        border: "1px solid var(--red-6)",
                        borderRadius: "var(--radius-3)",
                        background: "var(--red-2)",
                    }}
                >
                    <Flex align="center" justify="between">
                        <Flex direction="column" gap="1">
                            <Text size="2" weight="bold">Delete this user</Text>
                            <Text size="1" color="gray">
                                Permanently remove {userName} ({userEmail}) and all associated data.
                                {ownsSpaces && " This user owns spaces — transfer ownership first."}
                            </Text>
                        </Flex>
                        <Button
                            color="red"
                            variant="solid"
                            size="2"
                            onClick={() => setShowDelete(true)}
                            disabled={ownsSpaces}
                            style={{ flexShrink: 0 }}
                        >
                            <TrashIcon />
                            Delete User
                        </Button>
                    </Flex>
                </Flex>
            </Flex>

            <ActionDialog
                isOpen={showDelete}
                onClose={() => setShowDelete(false)}
                onConfirm={handleDelete}
                title="Delete User"
                message={`This will permanently delete ${userName} (${userEmail}) and all of their associated data. This action cannot be undone.`}
                confirmText="Delete User"
                variant="destructive"
                isLoading={deleteLoading}
                loadingText="Deleting..."
                confirmationText="DELETE"
            />
        </>
    );
}
