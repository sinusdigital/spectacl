"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  Flex,
  Heading,
  Text,
  Table,
  Badge,
  IconButton,
  Separator,
} from "@radix-ui/themes";
import { DownloadIcon } from "@radix-ui/react-icons";

interface Invoice {
  id: string;
  number: string;
  issuedAt: string;
  taxType: string;
  taxLabel: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  currency: string;
  companyName: string;
}

interface InvoiceHistoryProps {
  spaceId: string;
}

function taxBadgeColor(taxType: string): "green" | "blue" | "gray" {
  switch (taxType) {
    case "STANDARD":
      return "green";
    case "REVERSE_CHARGE":
      return "blue";
    case "EXEMPT":
      return "gray";
    default:
      return "gray";
  }
}

function formatCurrency(amount: number): string {
  return `€${amount.toFixed(2)}`;
}

export default function InvoiceHistory({ spaceId }: InvoiceHistoryProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvoices = useCallback(async () => {
    try {
      const res = await fetch(`/api/billing/invoices?spaceId=${spaceId}`);
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices ?? []);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  return (
    <Card>
      <Flex direction="column" gap="3">
        <Heading size="3">Invoices</Heading>
        <Separator size="4" />

        {loading && (
          <Text size="2" color="gray">
            Loading invoices...
          </Text>
        )}

        {!loading && invoices.length === 0 && (
          <Text size="2" color="gray">
            No invoices yet. Invoices will appear here after your first payment.
          </Text>
        )}

        {!loading && invoices.length > 0 && (
          <Table.Root variant="surface" size="1">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Invoice</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Date</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Total</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Tax</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {invoices.map((invoice) => (
                <Table.Row key={invoice.id}>
                  <Table.Cell>
                    <Text size="2" weight="medium">
                      {invoice.number}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="2" color="gray">
                      {new Date(invoice.issuedAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="2">{formatCurrency(invoice.total)}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge
                      color={taxBadgeColor(invoice.taxType)}
                      size="1"
                      variant="soft"
                    >
                      {invoice.taxLabel}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <IconButton
                      size="1"
                      variant="ghost"
                      color="gray"
                      asChild
                    >
                      <a
                        href={`/api/billing/invoices/${invoice.id}?format=pdf`}
                        download
                      >
                        <DownloadIcon />
                      </a>
                    </IconButton>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        )}
      </Flex>
    </Card>
  );
}
