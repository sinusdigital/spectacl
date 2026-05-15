"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Container,
  Heading,
  Text,
  Flex,
  Table,
  Badge,
  IconButton,
  TextField,
  Box,
} from "@radix-ui/themes";
import { DownloadIcon, MagnifyingGlassIcon } from "@radix-ui/react-icons";
import Button from "@/components/Shared/Button";

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
  country: string;
  space: { id: string; name: string };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
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

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchInvoices = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: "50",
        });
        const res = await fetch(`/api/admin/invoices?${params}`);
        if (res.ok) {
          const data = await res.json();
          setInvoices(data.invoices ?? []);
          setPagination(data.pagination);
        }
      } catch {
        // Silent fail
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const filteredInvoices = search
    ? invoices.filter(
        (inv) =>
          inv.number.toLowerCase().includes(search.toLowerCase()) ||
          inv.companyName.toLowerCase().includes(search.toLowerCase()) ||
          (inv.space?.name ?? "").toLowerCase().includes(search.toLowerCase()),
      )
    : invoices;

  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalTax = invoices.reduce((sum, inv) => sum + inv.taxAmount, 0);

  return (
    <Container size="3" className="max-w-5xl py-8">
      <Flex direction="column" gap="6">
        <Box>
          <Heading size="6">Invoices</Heading>
          <Text size="3" color="gray" mt="2">
            All invoices across all spaces.
          </Text>
        </Box>

        {/* Summary */}
        <Flex gap="4">
          <Badge size="2" variant="surface" color="gray">
            {pagination.total} invoices
          </Badge>
          <Badge size="2" variant="surface" color="green">
            Revenue: €{totalRevenue.toFixed(2)}
          </Badge>
          <Badge size="2" variant="surface" color="blue">
            Tax collected: €{totalTax.toFixed(2)}
          </Badge>
        </Flex>

        {/* Search */}
        <TextField.Root
          placeholder="Search by invoice number, company, or space..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="2"
        >
          <TextField.Slot>
            <MagnifyingGlassIcon />
          </TextField.Slot>
        </TextField.Root>

        {/* Table */}
        {loading ? (
          <Text size="2" color="gray">
            Loading invoices...
          </Text>
        ) : filteredInvoices.length === 0 ? (
          <Text size="2" color="gray">
            No invoices found.
          </Text>
        ) : (
          <Table.Root variant="surface" size="1">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Invoice</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Space</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Company</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Date</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Subtotal</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Tax</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Total</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {filteredInvoices.map((invoice) => (
                <Table.Row key={invoice.id}>
                  <Table.Cell>
                    <Text size="2" weight="medium">
                      {invoice.number}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="2" color="gray">
                      {invoice.space?.name ?? "(deleted)"}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Flex direction="column">
                      <Text size="2">{invoice.companyName}</Text>
                      <Text size="1" color="gray">
                        {invoice.country}
                      </Text>
                    </Flex>
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
                    <Text size="2">€{invoice.subtotal.toFixed(2)}</Text>
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
                    <Text size="2" weight="medium">
                      €{invoice.total.toFixed(2)}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <IconButton size="1" variant="ghost" color="gray" asChild>
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

        {/* Pagination */}
        {pagination.pages > 1 && (
          <Flex justify="center" gap="2">
            <Button
              variant="secondary"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => fetchInvoices(pagination.page - 1)}
            >
              Previous
            </Button>
            <Text size="2" color="gray" style={{ alignSelf: "center" }}>
              Page {pagination.page} of {pagination.pages}
            </Text>
            <Button
              variant="secondary"
              size="sm"
              disabled={pagination.page >= pagination.pages}
              onClick={() => fetchInvoices(pagination.page + 1)}
            >
              Next
            </Button>
          </Flex>
        )}
      </Flex>
    </Container>
  );
}
