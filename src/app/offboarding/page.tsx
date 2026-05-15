'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, Flex, Text, Heading, Box } from '@radix-ui/themes';
import { CheckCircledIcon } from '@radix-ui/react-icons';
import ShaderBackground from '@/components/ui/ShaderBackground';
import AuthFooter from '@/components/Shared/AuthFooter';
import Button from '@/components/Shared/Button';
import { CHURN_REASONS, resolveChurnLabel } from '@/lib/churnReasons';

export const dynamic = 'force-dynamic';

// ─── Progress steps ─────────────────────────────────────────────────────────

const STEPS = [
    'Cancelling subscription…',
    'Removing prompts & analysis data…',
    'Removing entities and competitors…',
    'Deleting workspace…',
    'Done',
];

// ─── Sub-components ─────────────────────────────────────────────────────────

function ProgressBar({ pct }: { pct: number }) {
    return (
        <Box
            style={{
                height: 6,
                borderRadius: 99,
                background: 'var(--gray-4)',
                overflow: 'hidden',
            }}
        >
            <Box
                style={{
                    height: '100%',
                    width: `${pct}%`,
                    borderRadius: 99,
                    background: 'var(--green-9)',
                    transition: 'width 0.6s ease',
                }}
            />
        </Box>
    );
}

// ─── Main ────────────────────────────────────────────────────────────────────

type Stage = 'questionnaire' | 'processing' | 'done' | 'error';

function OffboardingContent() {
    const params = useSearchParams();
    const spaceId   = params.get('spaceId') ?? '';
    const spaceName = params.get('spaceName') ?? 'your space';

    const [stage, setStage]           = useState<Stage>('questionnaire');
    const [selectedReason, setReason] = useState<string>('');
    const [otherText, setOtherText]   = useState('');
    const [stepIndex, setStepIndex]   = useState(0);
    const [errorMsg, setErrorMsg]     = useState('');
    const stepTimer = useRef<ReturnType<typeof setInterval> | null>(null);

    // Advance the fake progress steps while the API call is in flight
    useEffect(() => {
        if (stage !== 'processing') return;

        stepTimer.current = setInterval(() => {
            setStepIndex(prev => {
                if (prev >= STEPS.length - 2) {
                    clearInterval(stepTimer.current!);
                    return prev;
                }
                return prev + 1;
            });
        }, 900);

        return () => clearInterval(stepTimer.current!);
    }, [stage]);

    const handleConfirm = async () => {
        if (!selectedReason) return;
        setStepIndex(0);
        setStage('processing');

        const reason = resolveChurnLabel(selectedReason, otherText);

        try {
            const res = await fetch(`/api/spaces/${spaceId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason }),
            });

            if (res.ok) {
                clearInterval(stepTimer.current!);
                setStepIndex(STEPS.length - 1);
                // Brief pause so the final step label reads "Done" before switching
                setTimeout(() => setStage('done'), 600);
            } else {
                const data = await res.json().catch(() => ({}));
                setErrorMsg(data.error || 'Something went wrong.');
                setStage('error');
            }
        } catch {
            setErrorMsg('A network error occurred. Please try again.');
            setStage('error');
        }
    };

    const progressPct = ((stepIndex + 1) / STEPS.length) * 100;

    // ── Questionnaire ──────────────────────────────────────────────────────
    if (stage === 'questionnaire') {
        return (
            <Card size="4" variant="surface" className="w-full max-w-md mx-auto shadow-2xl relative z-20">
                <Flex direction="column" gap="5">
                    <Flex direction="column" gap="1" align="center">
                        <Heading size="6" weight="bold" className="tracking-tight">
                            Before you go…
                        </Heading>
                        <Text size="2" color="gray" align="center">
                            Help us improve by telling us why you&apos;re deleting <strong>{spaceName}</strong>.
                        </Text>
                    </Flex>

                    <Flex direction="column" gap="2">
                        {CHURN_REASONS.map(r => (
                            <label
                                key={r.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    padding: '10px 12px',
                                    borderRadius: 'var(--radius-3)',
                                    border: `1.5px solid ${selectedReason === r.id ? 'var(--green-8)' : 'var(--gray-4)'}`,
                                    background: selectedReason === r.id ? 'var(--green-a2)' : 'transparent',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                }}
                            >
                                <input
                                    type="radio"
                                    name="reason"
                                    value={r.id}
                                    checked={selectedReason === r.id}
                                    onChange={() => setReason(r.id)}
                                    style={{ accentColor: 'var(--green-9)' }}
                                />
                                <Text size="2">{r.label}</Text>
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

                    <Flex direction="column" gap="2">
                        <Button
                            size="lg"
                            className="w-full"
                            disabled={!selectedReason}
                            onClick={handleConfirm}
                        >
                            Delete Space
                        </Button>
                        <Button
                            size="lg"
                            variant="tertiary"
                            className="w-full"
                            onClick={() => window.history.back()}
                        >
                            Cancel
                        </Button>
                    </Flex>
                </Flex>
            </Card>
        );
    }

    // ── Processing ─────────────────────────────────────────────────────────
    if (stage === 'processing') {
        return (
            <Card size="4" variant="surface" className="w-full max-w-md mx-auto shadow-2xl relative z-20">
                <Flex direction="column" gap="5" align="center">
                    <Flex direction="column" gap="1" align="center">
                        <Heading size="6" weight="bold">Deleting workspace…</Heading>
                        <Text size="2" color="gray">This will only take a moment.</Text>
                    </Flex>

                    <Box style={{ width: '100%' }}>
                        <ProgressBar pct={progressPct} />
                        <Text size="1" color="gray" mt="2" style={{ display: 'block', textAlign: 'center', minHeight: 20 }}>
                            {STEPS[stepIndex]}
                        </Text>
                    </Box>
                </Flex>
            </Card>
        );
    }

    // ── Error ──────────────────────────────────────────────────────────────
    if (stage === 'error') {
        return (
            <Card size="4" variant="surface" className="w-full max-w-md mx-auto shadow-2xl relative z-20">
                <Flex direction="column" gap="4" align="center">
                    <Heading size="6" weight="bold" color="red">Something went wrong</Heading>
                    <Text size="2" color="gray" align="center">{errorMsg}</Text>
                    <Button size="lg" className="w-full" onClick={() => setStage('questionnaire')}>
                        Go back
                    </Button>
                </Flex>
            </Card>
        );
    }

    // ── Done ───────────────────────────────────────────────────────────────
    return (
        <Card size="4" variant="surface" className="w-full max-w-md mx-auto shadow-2xl relative z-20">
            <Flex direction="column" gap="5" align="center">
                <Box style={{ color: 'var(--green-9)' }}>
                    <CheckCircledIcon width={48} height={48} />
                </Box>

                <Flex direction="column" gap="2" align="center">
                    <Heading size="6" weight="bold">Space deleted</Heading>
                    <Text size="2" color="gray" align="center">
                        <strong>{spaceName}</strong> and all its data have been removed from your account.
                        Your User Account remains active.
                    </Text>
                </Flex>

                <Text size="1" color="gray" align="center" style={{ opacity: 0.7, maxWidth: 320 }}>
                    We may retain anonymised backups for a limited period to maintain service reliability. These are not accessible and are purged on a rolling basis.
                </Text>

                <Button size="lg" className="w-full" onClick={() => { window.location.href = '/spaces'; }}>
                    Go to my spaces
                </Button>
            </Flex>
        </Card>
    );
}

export default function OffboardingPage() {
    return (
        <div className="min-h-screen relative w-full h-full flex flex-col bg-[var(--color-background)]">
            <ShaderBackground>
                <Suspense fallback={null}>
                    <OffboardingContent />
                </Suspense>
            </ShaderBackground>
            <AuthFooter />
        </div>
    );
}
