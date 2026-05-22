'use client';

import { useState } from 'react';
import Button from '@/components/Shared/Button';
import RadixDialog from '@/components/Shared/RadixDialog';
import UpgradeRequiredModal from '@/components/Shared/UpgradeRequiredModal';
import { SpacePlan } from '@prisma/client';

interface CreateSpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (spaceId: string) => void;
}

export default function CreateSpaceModal({ isOpen, onClose, onSuccess }: CreateSpaceModalProps) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [newSpaceId, setNewSpaceId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Space name is required');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch('/api/spaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          llmProvider: 'MANAGED'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create space');
      }

      // Space created — check if it needs activation (no trial available)
      if (data.space.subscriptionStatus === 'INCOMPLETE') {
        setNewSpaceId(data.space.id);
        setShowUpgradeModal(true);
        setLoading(false);
        return;
      }

      // Space is active (trial or self-hosted) — navigate directly
      setName('');
      onSuccess(data.space.id);
      onClose();
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Failed to create space');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setName('');
      setError('');
      onClose();
    }
  };

  const handleUpgradeModalClose = () => {
    setShowUpgradeModal(false);
    setName('');
    // Space was created as INCOMPLETE — close everything and let the parent refresh
    onClose();
  };

  return (
    <>
      <RadixDialog.Root open={isOpen && !showUpgradeModal} onOpenChange={(open: boolean) => !open && handleClose()}>
        <RadixDialog.Content className="max-w-md">
          <RadixDialog.Header>
            <RadixDialog.Title>Create New Space</RadixDialog.Title>
            <RadixDialog.Description>
              Set up a new workspace for tracking entities.
            </RadixDialog.Description>
          </RadixDialog.Header>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            {/* Space Name */}
            <div>
              <label htmlFor="space-name" className="block text-sm font-medium text-[var(--gray-11)] mb-1">
                Space Name
              </label>
              <input
                id="space-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Workspace"
                className="w-full px-3 py-2 border border-[var(--gray-7)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-8)]"
                disabled={loading}
                autoFocus
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-[var(--red-2)] border border-[var(--red-6)] text-[var(--red-11)] px-3 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Actions */}
            <RadixDialog.Footer>
              <Button
                variant="tertiary"
                onClick={handleClose}
                disabled={loading}
                type="button"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                isLoading={loading}
                loadingText="Creating..."
                disabled={name.trim().length < 3 || loading}
              >
                Create Space
              </Button>
            </RadixDialog.Footer>
          </form>
        </RadixDialog.Content>
      </RadixDialog.Root>

      {showUpgradeModal && newSpaceId && (
        <UpgradeRequiredModal
          isOpen={showUpgradeModal}
          onClose={handleUpgradeModalClose}
          resourceName="active prompts"
          limit={null}
          spaceId={newSpaceId}
          llmProvider="MANAGED"
          currentPlan={"STARTER" as SpacePlan}
          mode="activate"
        />
      )}
    </>
  );
}
