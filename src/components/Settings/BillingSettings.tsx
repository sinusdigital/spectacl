"use client";

import { Card, Flex, Heading, Text, Separator } from "@radix-ui/themes";
import { useToast } from "@/components/Shared/RadixToast";
import BillingAddressForm from "@/components/Billing/BillingAddressForm";
import InvoiceHistory from "./InvoiceHistory";

interface BillingSettingsProps {
  spaceId: string;
}

export default function BillingSettings({ spaceId }: BillingSettingsProps) {
  const { success } = useToast();

  return (
    <Flex direction="column" gap="4">
      <Card>
        <Flex direction="column" gap="3">
          <Heading size="3">Billing Address</Heading>
          <Text size="2" color="gray">
            Your billing address is used for invoices and tax calculations.
          </Text>
          <Separator size="4" />
          <BillingAddressForm
            spaceId={spaceId}
            onSaved={() => success("Billing details saved")}
          />
        </Flex>
      </Card>

      <InvoiceHistory spaceId={spaceId} />
    </Flex>
  );
}
