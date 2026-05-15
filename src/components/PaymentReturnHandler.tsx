'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Flex, Box, Text, Heading, Spinner, Progress } from '@radix-ui/themes';
import { useToast } from '@/components/Shared/RadixToast';
import PaymentSuccessModal from '@/components/Shared/PaymentSuccessModal';
import Modal from '@/components/Shared/Modal';
import Button from '@/components/Shared/Button';

const POLL_INTERVAL = 2000;
const POLL_TIMEOUT = 30000;

type Phase = 'idle' | 'confirming' | 'setting-up' | 'success' | 'error';

function PaymentReturnHandlerInner() {
    const searchParams = useSearchParams();
    const { error: toastError } = useToast();

    const [phase, setPhase] = useState<Phase>('idle');
    const [plan, setPlan] = useState<string | null>(null);
    const [spaceId, setSpaceId] = useState<string | null>(null);
    const [cleanUrl, setCleanUrl] = useState('');
    const [pollCount, setPollCount] = useState(0);
    const [timedOut, setTimedOut] = useState(false);

    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Cleanup polling on unmount
    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    // Phase 1: Detect payment return params and start confirm-payment
    useEffect(() => {
        const payment = searchParams.get('payment');
        const planParam = searchParams.get('plan');
        const spaceIdParam = searchParams.get('spaceId');

        if (payment !== 'pending' || !planParam || !spaceIdParam) return;

        setPlan(planParam);
        setSpaceId(spaceIdParam);

        // Clean URL immediately
        const url = new URL(window.location.href);
        url.searchParams.delete('payment');
        url.searchParams.delete('plan');
        url.searchParams.delete('spaceId');
        const clean = url.pathname + (url.search || '');
        window.history.replaceState(null, '', clean);
        setCleanUrl(clean);

        setPhase('confirming');

        let cancelled = false;

        (async () => {
            try {
                const res = await fetch('/api/mollie/confirm-payment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ spaceId: spaceIdParam, plan: planParam }),
                });

                if (cancelled) return;

                if (res.ok) {
                    sessionStorage.setItem('spectacl_upgraded_plan', planParam);
                    setPhase('setting-up');
                } else {
                    toastError('Could not confirm payment. Please check Billing.');
                    window.dispatchEvent(new Event('payment-resolved'));
                    setPhase('error');
                }
            } catch {
                if (!cancelled) {
                    toastError('Could not confirm payment. Please check Billing.');
                    window.dispatchEvent(new Event('payment-resolved'));
                    setPhase('error');
                }
            }
        })();

        return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Phase 2: Poll for webhook completion (mollieSubscriptionId)
    useEffect(() => {
        if (phase !== 'setting-up' || !spaceId) return;

        setPollCount(0);
        setTimedOut(false);

        intervalRef.current = setInterval(async () => {
            try {
                const res = await fetch(`/api/spaces/${spaceId}`);
                if (!res.ok) return;
                const space = await res.json();
                setPollCount((c) => c + 1);
                if (space.mollieSubscriptionId) {
                    if (intervalRef.current) clearInterval(intervalRef.current);
                    if (timeoutRef.current) clearTimeout(timeoutRef.current);
                    window.dispatchEvent(new Event('payment-resolved'));
                    setPhase('success');
                }
            } catch {
                // Silent — keep polling
            }
        }, POLL_INTERVAL);

        timeoutRef.current = setTimeout(() => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setTimedOut(true);
        }, POLL_TIMEOUT);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [phase, spaceId]);

    // Handle "Continue anyway" — skip to success
    const handleContinueAnyway = () => {
        window.dispatchEvent(new Event('payment-resolved'));
        setPhase('success');
    };

    const handleClose = () => {
        window.location.href = cleanUrl;
    };

    // Phase: confirming or setting-up → show setup modal
    if (phase === 'confirming' || phase === 'setting-up') {
        const progressValue = phase === 'confirming'
            ? 5
            : Math.min(pollCount * 15, 95);

        return (
            <Modal
                isOpen={true}
                onClose={() => {}} // Non-dismissable during setup
                title="Payment Confirmed"
                size="md"
                actions={
                    timedOut ? (
                        <Button variant="primary" fullWidth onClick={handleContinueAnyway}>
                            Continue
                        </Button>
                    ) : undefined
                }
            >
                <Flex direction="column" gap="4" align="center" py="4">
                    {!timedOut ? (
                        <>
                            <Spinner size="3" />
                            <Heading size="4" align="center">
                                Setting up your subscription...
                            </Heading>
                            <Text size="2" color="gray" align="center" style={{ maxWidth: 360 }}>
                                We&apos;re activating your plan and setting up monthly billing. This usually takes a few seconds.
                            </Text>
                            <Box width="300px" mt="2">
                                <Progress
                                    value={progressValue}
                                    size="2"
                                    color="lime"
                                />
                            </Box>
                        </>
                    ) : (
                        <>
                            <Heading size="4" align="center">
                                Taking longer than expected
                            </Heading>
                            <Text size="2" color="gray" align="center" style={{ maxWidth: 360 }}>
                                Your payment was successful. Setup is still in progress and will complete shortly. You can continue to your dashboard.
                            </Text>
                        </>
                    )}
                </Flex>
            </Modal>
        );
    }

    // Phase: success → show existing success modal
    if (phase === 'success' && plan) {
        return (
            <PaymentSuccessModal
                isOpen={true}
                onClose={handleClose}
                plan={plan}
                returnUrl={cleanUrl}
            />
        );
    }

    return null;
}

export default function PaymentReturnHandler() {
    return (
        <Suspense fallback={null}>
            <PaymentReturnHandlerInner />
        </Suspense>
    );
}
