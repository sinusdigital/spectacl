'use client';

import { useState, useEffect, useRef } from 'react';
import { Flex, Text } from '@radix-ui/themes';
import { CheckCircledIcon, Cross2Icon } from '@radix-ui/react-icons';

const AUTO_DISMISS_MS = 8000;

/**
 * Top-level success banner shown after a plan upgrade.
 * Reads `spectacl_upgraded_plan` from sessionStorage, auto-dismisses after 8s
 * with a shrinking progress bar so the user knows it's temporary.
 */
export default function UpgradeSuccessBanner() {
    const [plan, setPlan] = useState<string | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const upgraded = sessionStorage.getItem('spectacl_upgraded_plan');
        if (upgraded) {
            setPlan(upgraded);
            sessionStorage.removeItem('spectacl_upgraded_plan');
            timerRef.current = setTimeout(() => setPlan(null), AUTO_DISMISS_MS);
        }
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    if (!plan) return null;

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
                    onClick={() => {
                        if (timerRef.current) clearTimeout(timerRef.current);
                        setPlan(null);
                    }}
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
