'use client';

import { useState, useEffect, useSyncExternalStore } from 'react';
import { Flex, Text } from '@radix-ui/themes';
import { CheckCircledIcon, Cross2Icon } from '@radix-ui/react-icons';

const AUTO_DISMISS_MS = 8000;

// One-shot read of the upgrade flag — sessionStorage is consumed on first read
// so subsequent renders see null. `useSyncExternalStore` handles the
// server-snapshot/client-snapshot split without a setState-in-effect dance.
let didReadStorage = false;
let cachedUpgrade: string | null = null;
function subscribeStorage() {
    return () => {};
}
function getStorageSnapshot(): string | null {
    if (!didReadStorage) {
        didReadStorage = true;
        cachedUpgrade = sessionStorage.getItem('spectacl_upgraded_plan');
        if (cachedUpgrade) sessionStorage.removeItem('spectacl_upgraded_plan');
    }
    return cachedUpgrade;
}
function getServerSnapshot(): string | null {
    return null;
}

/**
 * Top-level success banner shown after a plan upgrade.
 * Reads `spectacl_upgraded_plan` from sessionStorage, auto-dismisses after 8s
 * with a shrinking progress bar so the user knows it's temporary.
 */
export default function UpgradeSuccessBanner() {
    const plan = useSyncExternalStore(subscribeStorage, getStorageSnapshot, getServerSnapshot);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        if (!plan || dismissed) return;
        const t = setTimeout(() => setDismissed(true), AUTO_DISMISS_MS);
        return () => clearTimeout(t);
    }, [plan, dismissed]);

    if (!plan || dismissed) return null;

    return (
        <Flex
            align="center"
            justify="center"
            px="4"
            py="2"
            style={{
                backgroundColor: 'var(--green-3)',
                borderBottom: '1px solid var(--green-6)',
                flexShrink: 0,
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            <Flex align="center" gap="2">
                <CheckCircledIcon
                    width={14}
                    height={14}
                    style={{ color: 'var(--green-11)' }}
                />
                <Text size="1" weight="medium" style={{ color: 'var(--green-11)' }}>
                    You&apos;re now on the <Text weight="bold" style={{ color: 'var(--green-11)' }}>{plan}</Text> plan
                </Text>
                <button
                    onClick={() => setDismissed(true)}
                    aria-label="Dismiss"
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--green-11)',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        marginLeft: 4,
                    }}
                >
                    <Cross2Icon width={12} height={12} />
                </button>
            </Flex>

            {/* Progress bar that shrinks over AUTO_DISMISS_MS */}
            <div
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    height: 2,
                    backgroundColor: 'var(--green-8)',
                    animation: `shrink-bar ${AUTO_DISMISS_MS}ms linear forwards`,
                }}
            />
            <style>{`
                @keyframes shrink-bar {
                    from { width: 100%; }
                    to { width: 0%; }
                }
            `}</style>
        </Flex>
    );
}
