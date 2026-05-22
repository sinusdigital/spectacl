'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Flex, Box, Text, Heading, Button, Callout, TextField, Badge, Spinner } from '@radix-ui/themes';
import { ExclamationTriangleIcon, CheckCircledIcon } from '@radix-ui/react-icons';
import Modal from '@/components/Shared/Modal';
import { useToast } from '@/components/Shared/RadixToast';

interface SpaceDetails {
  id: string;
  name: string;
  plan: string;
  subscriptionStatus: string | null;
  mollieSubscriptionId: string | null;
  memberCount: number;
  usage: {
    entityCount: number;
    promptCount: number;
  };
}

export default function DangerZoneSettings() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [space, setSpace] = useState<SpaceDetails | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState<'cancel-sub' | 'confirm-delete'>('cancel-sub');
  const [cancelling, setCancelling] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const currentRes = await fetch('/api/spaces/current');
      if (!currentRes.ok) return;
      const current = await currentRes.json();

      const [spaceRes, roleRes] = await Promise.all([
        fetch(`/api/spaces/${current.id}`),
        fetch(`/api/spaces/${current.id}/members/me`),
      ]);

      if (spaceRes.ok) setSpace(await spaceRes.json());
      if (roleRes.ok) {
        const { role: r } = await roleRes.json();
        setRole(r);
      }
    } catch (err) {
      console.error('DangerZoneSettings: failed to load', err);
    } finally {
      setLoading(false);
    }
  };

  const hasActiveSub = space
    ? !!(space.subscriptionStatus && !['CANCELED', 'INCOMPLETE', 'TRIALING'].includes(space.subscriptionStatus) && space.mollieSubscriptionId)
    : false;

  const handleOpenModal = () => {
    // Determine which step to start on
    setStep(hasActiveSub ? 'cancel-sub' : 'confirm-delete');
    setConfirmText('');
    setCancelling(false);
    setShowModal(true);
  };

  const handleCancelSubscription = async () => {
    if (!space) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/spaces/${space.id}/subscription/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Space deletion' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toastError('Cancellation failed', data.error || 'Unable to cancel subscription. Please try again or contact support.');
        return;
      }
      // Subscription cancelled — move to delete step
      success('Subscription cancelled', 'You can now proceed with space deletion.');
      setSpace(prev => prev ? { ...prev, subscriptionStatus: 'CANCELED', mollieSubscriptionId: null } : prev);
      setStep('confirm-delete');
    } catch {
      toastError('Cancellation failed', 'A network error occurred. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  const handleDelete = () => {
    if (!space || confirmText !== 'DELETE') return;
    router.push(
      `/offboarding?spaceId=${space.id}&spaceName=${encodeURIComponent(space.name)}`
    );
  };

  const onClose = () => {
    setShowModal(false);
    setConfirmText('');
  };

  if (loading) return null;
  if (!space || role !== 'OWNER') return null;

  return (
    <>
      <Card size="3" variant="surface" style={{ borderColor: 'var(--red-6)' }}>
        <Flex direction="column" gap="4">
          <Flex direction="column" gap="1">
            <Heading size="4" color="red">Delete Space</Heading>
            <Text size="2" color="gray">
              Permanently delete <strong>{space.name}</strong> and all its data.
            </Text>
          </Flex>

          {hasActiveSub && (
            <Callout.Root color="blue" size="1">
              <Callout.Icon>
                <ExclamationTriangleIcon />
              </Callout.Icon>
              <Callout.Text>
                <strong>Deletion vs Cancellation</strong> <br />Cancelling your subscription lets you keep full access until the end of your current billing period. Your data stays intact and you can reactivate any time. <a href={`/spaces/${space.id}/billing`} style={{ color: 'inherit', textDecoration: 'underline' }}>Go to Billing</a> to cancel instead.
              </Callout.Text>
            </Callout.Root>
          )}

          <Flex gap="4" wrap="wrap">
            <Text size="2" color="gray">
              <strong>{space.usage.entityCount}</strong> {space.usage.entityCount === 1 ? 'entity' : 'entities'}
            </Text>
            <Text size="2" color="gray">
              <strong>{space.usage.promptCount}</strong> active {space.usage.promptCount === 1 ? 'prompt' : 'prompts'}
            </Text>
            <Text size="2" color="gray">
              <strong>{space.memberCount}</strong> {space.memberCount === 1 ? 'member' : 'members'}
            </Text>
          </Flex>

          <Box>
            <Button color="red" variant="soft" onClick={handleOpenModal}>
              Delete Space
            </Button>
          </Box>
        </Flex>
      </Card>

      <Modal
        isOpen={showModal}
        onClose={onClose}
        title={step === 'cancel-sub' ? 'Cancel Subscription First' : 'Delete Space'}
        description={
          step === 'cancel-sub'
            ? 'Your subscription must be cancelled before the space can be deleted.'
            : `You are about to permanently delete "${space.name}". This action is irreversible.`
        }
        size="sm"
      >
        {step === 'cancel-sub' ? (
          /* ─── Step 1: Cancel subscription ─────────────────────────── */
          <Flex direction="column" gap="4">
            <Callout.Root color="orange" size="1">
              <Callout.Icon><ExclamationTriangleIcon /></Callout.Icon>
              <Callout.Text>
                Your <Badge color="orange" variant="soft">{space.plan}</Badge> subscription is still active. Deleting a space with an active subscription would stop your service but Mollie may continue billing. Cancel first to prevent this.
              </Callout.Text>
            </Callout.Root>

            <Text size="2" color="gray">
              After cancellation, you&apos;ll keep access until the end of your current billing period. You can then proceed with deletion.
            </Text>

            <Flex gap="3" mt="2" justify="end">
              <Button variant="soft" color="gray" onClick={onClose}>
                Go Back
              </Button>
              <Button
                color="orange"
                variant="solid"
                onClick={handleCancelSubscription}
                disabled={cancelling}
              >
                {cancelling ? <><Spinner size="1" /> Cancelling...</> : 'Cancel Subscription'}
              </Button>
            </Flex>
          </Flex>
        ) : (
          /* ─── Step 2: Confirm deletion ────────────────────────────── */
          <Flex direction="column" gap="4">
            <Box
              p="3"
              style={{
                background: 'var(--red-a2)',
                borderRadius: 'var(--radius-3)',
                border: '1px solid var(--red-a4)',
              }}
            >
              <Flex direction="column" gap="2">
                <Text size="2" weight="bold" color="red">The following will be removed:</Text>
                <Flex direction="column" gap="1" pl="2">
                  <Text size="2" color="gray">· All {space.usage.entityCount} {space.usage.entityCount === 1 ? 'entity' : 'entities'} and their full analysis history</Text>
                  <Text size="2" color="gray">· All prompts (active, paused, and suggested) and their results</Text>
                  <Text size="2" color="gray">· All competitors, sources, and metrics</Text>
                  <Text size="2" color="gray">· All {space.memberCount} {space.memberCount === 1 ? 'member' : 'members'} from this space</Text>
                </Flex>
              </Flex>
            </Box>

            {space.subscriptionStatus === 'CANCELED' && (
              <Callout.Root color="green" size="1">
                <Callout.Icon><CheckCircledIcon /></Callout.Icon>
                <Callout.Text>Subscription cancelled. You can now delete the space.</Callout.Text>
              </Callout.Root>
            )}

            <Text size="2" color="gray">
              Invoices will be retained for legal compliance. Anonymised backups may be kept for a limited period.
            </Text>

            <Flex direction="column" gap="2">
              <Text as="label" size="2" weight="bold">
                Type <Text weight="bold" color="red">DELETE</Text> to confirm
              </Text>
              <TextField.Root
                size="3"
                placeholder="DELETE"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                color={confirmText === 'DELETE' ? undefined : 'red'}
                autoComplete="off"
                data-1p-ignore
              />
            </Flex>

            <Flex gap="3" mt="2" justify="end">
              <Button variant="soft" color="gray" onClick={onClose}>
                Cancel
              </Button>
              <Button
                color="red"
                variant="solid"
                disabled={confirmText !== 'DELETE'}
                onClick={handleDelete}
              >
                Delete Space
              </Button>
            </Flex>
          </Flex>
        )}
      </Modal>
    </>
  );
}
