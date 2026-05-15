"use client";

import { Flex, Text, Button } from "@radix-ui/themes";
import { EyeOpenIcon, Pencil1Icon, ExitIcon } from "@radix-ui/react-icons";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface SupportModeBannerProps {
    spaceId: string;
    spaceName: string;
    writeEnabled: boolean;
}

/**
 * Sticky banner shown to app admins when they're viewing a customer space
 * via support-mode override. Lets them toggle write mode or exit back to
 * the admin space page.
 */
export default function SupportModeBanner({
    spaceId,
    spaceName,
    writeEnabled,
}: SupportModeBannerProps) {
    const router = useRouter();
    const [, startTransition] = useTransition();
    const [busy, setBusy] = useState(false);

    async function toggleWrite() {
        setBusy(true);
        try {
            await fetch("/api/admin/support-mode", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ spaceId, writeEnabled: !writeEnabled }),
            });
            startTransition(() => router.refresh());
        } finally {
            setBusy(false);
        }
    }

    async function exit() {
        setBusy(true);
        try {
            await fetch("/api/admin/support-mode", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ spaceId, exit: true }),
            });
            // Hard navigation — router.push would reuse the cached root layout
            // and leave the banner visible even after the cookie is cleared.
            window.location.href = `/admin/spaces/${spaceId}`;
        } catch {
            setBusy(false);
        }
    }

    return (
        <Flex
            align="center"
            justify="center"
            gap="3"
            px="4"
            py="2"
            style={{
                backgroundColor: "var(--amber-3)",
                borderBottom: "1px solid var(--amber-6)",
                flexShrink: 0,
            }}
        >
            {writeEnabled ? <Pencil1Icon /> : <EyeOpenIcon />}
            <Text size="2" weight="medium">
                Viewing <strong>{spaceName}</strong> as Spectacl admin ·{" "}
                {writeEnabled ? "Write mode enabled" : "Read-only"}
            </Text>
            <Button
                size="1"
                variant="soft"
                color={writeEnabled ? "gray" : "amber"}
                onClick={toggleWrite}
                disabled={busy}
            >
                {writeEnabled ? "Disable write" : "Enable write"}
            </Button>
            <Button size="1" variant="ghost" color="gray" onClick={exit} disabled={busy}>
                <ExitIcon />
                Exit
            </Button>
        </Flex>
    );
}
