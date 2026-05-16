"use client";

import { useEffect } from "react";
import { useSession } from "@/lib/auth-client";

const HEARTBEAT_INTERVAL_MS = 60_000; // ping every 60 seconds

// Mount this once in a layout that wraps authenticated pages.
// It silently PATCHes /api/user/heartbeat on an interval so that
// User.lastSeenAt stays fresh while the user has the app open.
export default function HeartbeatProvider() {
  const { data: session } = useSession();

  useEffect(() => {
    if (!session?.user) return;

    // Fire immediately so lastSeenAt is fresh on mount
    const ping = () => {
      fetch("/api/user/heartbeat", { method: "POST" }).catch(() => {
        // Silently ignore — non-critical
      });
    };

    ping();
    const timer = setInterval(ping, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [session?.user]);

  return null;
}
