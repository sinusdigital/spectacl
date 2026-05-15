"use client";

import { useState } from "react";
import {
  Container,
  Heading,
  Text,
  Flex,
  Card,
  Badge,
  Grid,
  Box,
  Select,
} from "@radix-ui/themes";
import { DownloadIcon } from "@radix-ui/react-icons";
import Button from "@/components/Shared/Button";

// ─── Demo invoice data ──────────────────────────────────────────────────────

interface DemoInvoice {
  key: string;
  label: string;
  description: string;
  badgeColor: "green" | "blue" | "gray";
  data: {
    number: string;
    companyName: string;
    street: string;
    city: string;
    postalCode: string;
    country: string;
    vatId: string | null;
    plan: string;
    subtotal: number;
    taxType: string;
    taxRate: number;
    taxLabel: string;
    taxAmount: number;
    total: number;
    periodStart: string;
    periodEnd: string;
  };
}

const DEMO_INVOICES: DemoInvoice[] = [
  {
    key: "nl-standard",
    label: "NL Domestic (21% BTW)",
    description: "Dutch company — standard 21% VAT applies",
    badgeColor: "green",
    data: {
      number: "SPE-2026-0001",
      companyName: "Acme BV",
      street: "Herengracht 100",
      city: "Amsterdam",
      postalCode: "1015 AA",
      country: "NL",
      vatId: "NL123456789B01",
      plan: "PRO",
      subtotal: 99.0,
      taxType: "STANDARD",
      taxRate: 0.21,
      taxLabel: "21% BTW",
      taxAmount: 20.79,
      total: 119.79,
      periodStart: "2026-04-11",
      periodEnd: "2026-05-11",
    },
  },
  {
    key: "eu-reverse",
    label: "EU Reverse Charge (0%)",
    description: "German company with valid VAT ID — reverse charge, 0% VAT",
    badgeColor: "blue",
    data: {
      number: "SPE-2026-0002",
      companyName: "TechCorp GmbH",
      street: "Friedrichstra\u00DFe 50",
      city: "Berlin",
      postalCode: "10117",
      country: "DE",
      vatId: "DE123456789",
      plan: "BUSINESS",
      subtotal: 249.0,
      taxType: "REVERSE_CHARGE",
      taxRate: 0,
      taxLabel: "VAT Reverse Charge (EU)",
      taxAmount: 0,
      total: 249.0,
      periodStart: "2026-04-11",
      periodEnd: "2026-05-11",
    },
  },
  {
    key: "non-eu",
    label: "Non-EU Exempt (0%)",
    description: "US company — tax exempt, no VAT charged",
    badgeColor: "gray",
    data: {
      number: "SPE-2026-0003",
      companyName: "Globex Inc.",
      street: "742 Evergreen Terrace",
      city: "New York, NY",
      postalCode: "10001",
      country: "US",
      vatId: null,
      plan: "STARTER",
      subtotal: 39.0,
      taxType: "EXEMPT",
      taxRate: 0,
      taxLabel: "Tax Exempt (non-EU)",
      taxAmount: 0,
      total: 39.0,
      periodStart: "2026-04-11",
      periodEnd: "2026-05-11",
    },
  },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function InvoiceDemoPage() {
  const [selected, setSelected] = useState(DEMO_INVOICES[0].key);
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const invoice = DEMO_INVOICES.find((d) => d.key === selected)!;

  async function generatePdf() {
    setLoading(true);
    setPdfUrl(null);
    try {
      const res = await fetch("/api/admin/invoice-demo/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invoice.data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? `PDF generation failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (err) {
      console.error("PDF generation error:", err);
    } finally {
      setLoading(false);
    }
  }

  function downloadPdf() {
    if (!pdfUrl) return;
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = `${invoice.data.number}.pdf`;
    a.click();
  }

  return (
    <Container size="3" className="max-w-5xl py-8">
      <Flex direction="column" gap="6">
        <Box>
          <Heading size="6">Invoice Demo</Heading>
          <Text size="3" color="gray" mt="2">
            Preview PDF invoices for all 3 VAT scenarios.
          </Text>
        </Box>

        {/* Scenario picker */}
        <Flex gap="3" align="end">
          <Box style={{ flex: 1 }}>
            <Text as="label" size="2" weight="medium" mb="1">
              VAT Scenario
            </Text>
            <Select.Root
              value={selected}
              onValueChange={(v) => {
                setSelected(v);
                setPdfUrl(null);
              }}
            >
              <Select.Trigger style={{ width: "100%" }} />
              <Select.Content>
                {DEMO_INVOICES.map((d) => (
                  <Select.Item key={d.key} value={d.key}>
                    {d.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Box>
          <Button onClick={generatePdf} disabled={loading}>
            {loading ? "Generating..." : "Generate PDF"}
          </Button>
        </Flex>

        {/* Invoice details card */}
        <Card>
          <Flex direction="column" gap="4">
            <Flex justify="between" align="center">
              <Flex align="center" gap="2">
                <Heading size="4">{invoice.data.number}</Heading>
                <Badge color={invoice.badgeColor} variant="soft">
                  {invoice.data.taxLabel}
                </Badge>
              </Flex>
              <Badge variant="surface" color="gray">
                {invoice.data.plan}
              </Badge>
            </Flex>

            <Text size="2" color="gray">
              {invoice.description}
            </Text>

            <Grid columns="2" gap="4">
              <Box>
                <Text size="1" weight="bold" color="gray" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  From
                </Text>
                <Text size="2" mt="1" as="div">Sinus Digital</Text>
                <Text size="2" color="gray" as="div">Netherlands</Text>
                <Text size="2" color="gray" as="div">hello@spectacl.org</Text>
              </Box>
              <Box>
                <Text size="1" weight="bold" color="gray" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Bill To
                </Text>
                <Text size="2" mt="1" as="div">{invoice.data.companyName}</Text>
                <Text size="2" color="gray" as="div">{invoice.data.street}</Text>
                <Text size="2" color="gray" as="div">
                  {invoice.data.postalCode} {invoice.data.city}
                </Text>
                <Text size="2" color="gray" as="div">{invoice.data.country}</Text>
                {invoice.data.vatId && (
                  <Text size="2" color="gray" as="div">VAT: {invoice.data.vatId}</Text>
                )}
              </Box>
            </Grid>

            {/* Totals */}
            <Box style={{ borderTop: "1px solid var(--gray-6)", paddingTop: 16 }}>
              <Flex direction="column" gap="1" align="end">
                <Flex gap="6" justify="between" style={{ width: 220 }}>
                  <Text size="2" color="gray">Subtotal</Text>
                  <Text size="2" weight="medium">{"\u20AC"}{invoice.data.subtotal.toFixed(2)}</Text>
                </Flex>
                <Flex gap="6" justify="between" style={{ width: 220 }}>
                  <Text size="2" color="gray">{invoice.data.taxLabel}</Text>
                  <Text size="2" weight="medium">{"\u20AC"}{invoice.data.taxAmount.toFixed(2)}</Text>
                </Flex>
                <Flex
                  gap="6"
                  justify="between"
                  style={{ width: 220, borderTop: "1px solid var(--gray-12)", paddingTop: 6, marginTop: 4 }}
                >
                  <Text size="3" weight="bold">Total</Text>
                  <Text size="3" weight="bold">{"\u20AC"}{invoice.data.total.toFixed(2)}</Text>
                </Flex>
              </Flex>
            </Box>

            {invoice.data.taxType === "REVERSE_CHARGE" && (
              <Text size="1" color="gray" style={{ fontStyle: "italic" }}>
                VAT Reverse Charged — Article 196 EU VAT Directive. The recipient is liable for the payment of VAT.
              </Text>
            )}
            {invoice.data.taxType === "EXEMPT" && (
              <Text size="1" color="gray" style={{ fontStyle: "italic" }}>
                This invoice is exempt from VAT (supply of services outside the EU).
              </Text>
            )}
          </Flex>
        </Card>

        {/* PDF Preview */}
        {pdfUrl && (
          <Card>
            <Flex direction="column" gap="3">
              <Flex justify="between" align="center">
                <Heading size="3">PDF Preview</Heading>
                <Button variant="secondary" size="sm" onClick={downloadPdf}>
                  <Flex align="center" gap="1">
                    <DownloadIcon /> Download
                  </Flex>
                </Button>
              </Flex>
              <Box
                style={{
                  border: "1px solid var(--gray-6)",
                  borderRadius: "var(--radius-3)",
                  overflow: "hidden",
                  height: 700,
                }}
              >
                <iframe
                  src={pdfUrl}
                  style={{ width: "100%", height: "100%", border: "none" }}
                  title="Invoice PDF Preview"
                />
              </Box>
            </Flex>
          </Card>
        )}
      </Flex>
    </Container>
  );
}
