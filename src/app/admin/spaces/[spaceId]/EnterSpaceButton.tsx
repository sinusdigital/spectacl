"use client";

import { useState } from "react";
import { Button } from "@radix-ui/themes";
import { EnterIcon } from "@radix-ui/react-icons";

/**
 * Admin-only: enters a customer space in support mode (read-only by default).
 * Uses a full-page navigation (not router.push) so the root layout re-reads
 * the support-space cookie and renders the SupportModeBanner + swaps sidebar
 * to the customer space on the very first paint.
 */
export default function EnterSpaceButton({
    spaceId,
    firstEntityId,
}: {
    spaceId: string;
    firstEntityId: string | null;
}) {
    const [busy, setBusy] = useState(false);

    async function enter() {
        setBusy(true);
        try {
            await fetch("/api/admin/support-mode", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ spaceId, enter: true }),
            });
            window.location.href = firstEntityId ? `/${firstEntityId}` : "/entities";
        } catch {
            setBusy(false);
        }
    }

    return (
        <Button variant="solid" color="amber" onClick={enter} disabled={busy}>
            <EnterIcon />
            Enter space as admin
        </Button>
    );
}
