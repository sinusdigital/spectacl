"use client";

import { Text } from "@radix-ui/themes";
import Modal from "@/components/Shared/Modal";
import BillingAddressForm from "./BillingAddressForm";

interface BillingDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaceId: string;
  /** Called after billing profile is saved successfully */
  onSaved: () => void;
}

/**
 * Standalone modal for collecting billing address before checkout.
 * Shown when user tries to upgrade but has no billing profile yet.
 */
export default function BillingDetailsModal({
  isOpen,
  onClose,
  spaceId,
  onSaved,
}: BillingDetailsModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Billing Details"
      size="md"
    >
      <Text size="2" color="gray" mb="3" as="p">
        Enter your billing address to continue. This will be used for invoices and tax calculations.
      </Text>
      <BillingAddressForm
        spaceId={spaceId}
        compact
        forceEdit
        submitLabel="Save & Continue"
        onSaved={() => {
          onSaved();
        }}
      />
    </Modal>
  );
}
