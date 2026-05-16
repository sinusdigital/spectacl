/**
 * Invoice PDF generation using @react-pdf/renderer.
 * Generated on-demand from stored invoice data.
 */

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";

interface InvoiceData {
  number: string;
  issuedAt: Date;
  // Seller
  sellerCompanyName?: string | null;
  sellerStreet?: string | null;
  sellerCity?: string | null;
  sellerPostalCode?: string | null;
  sellerCountry?: string | null;
  sellerVatId?: string | null;
  sellerKvk?: string | null;
  sellerEmail?: string | null;
  // Buyer
  companyName: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  vatId: string | null;
  lineItems: { description: string; quantity: number; unitPrice: number; amount: number }[];
  taxType: string;
  taxRate: number;
  taxLabel: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  currency: string;
  periodStart: Date | null;
  periodEnd: Date | null;
}

const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1a1a2e",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 40,
  },
  logo: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: "#46a758",
  },
  invoiceTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    textAlign: "right" as const,
  },
  invoiceMeta: {
    fontSize: 9,
    color: "#64748b",
    textAlign: "right" as const,
    marginTop: 4,
  },
  addressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  addressBlock: {
    width: "45%",
  },
  addressLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#64748b",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  addressText: {
    fontSize: 10,
    lineHeight: 1.5,
  },
  table: {
    marginTop: 10,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 6,
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
  },
  colDescription: { width: "50%" },
  colQty: { width: "15%", textAlign: "center" as const },
  colUnitPrice: { width: "17.5%", textAlign: "right" as const },
  colAmount: { width: "17.5%", textAlign: "right" as const },
  headerText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#64748b",
    textTransform: "uppercase" as const,
  },
  totalSection: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },
  totalBlock: {
    width: "35%",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  totalLabel: {
    fontSize: 10,
    color: "#64748b",
  },
  totalValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: "#1a1a2e",
    marginTop: 4,
  },
  grandTotalLabel: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
  },
  grandTotalValue: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
  },
  footer: {
    position: "absolute" as const,
    bottom: 40,
    left: 50,
    right: 50,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 10,
  },
  footerText: {
    fontSize: 8,
    color: "#94a3b8",
    textAlign: "center" as const,
    lineHeight: 1.5,
  },
  reverseChargeNote: {
    fontSize: 9,
    color: "#64748b",
    fontStyle: "italic" as const,
    marginTop: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
});

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatCurrency(amount: number, currency: string): string {
  if (currency === "EUR") return `\u20AC ${amount.toFixed(2)}`;
  return `${amount.toFixed(2)} ${currency}`;
}

function InvoiceDocument({ invoice }: { invoice: InvoiceData }) {
  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      // Header
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(Text, { style: styles.logo }, "Spectacl"),
        React.createElement(
          View,
          null,
          React.createElement(
            Text,
            { style: styles.invoiceTitle },
            `Invoice ${invoice.number}`,
          ),
          React.createElement(
            Text,
            { style: styles.invoiceMeta },
            `Issued: ${formatDate(invoice.issuedAt)}`,
          ),
          invoice.periodStart &&
            invoice.periodEnd &&
            React.createElement(
              Text,
              { style: styles.invoiceMeta },
              `Period: ${formatDate(invoice.periodStart)} — ${formatDate(invoice.periodEnd)}`,
            ),
        ),
      ),
      // Addresses
      React.createElement(
        View,
        { style: styles.addressRow },
        // From
        React.createElement(
          View,
          { style: styles.addressBlock },
          React.createElement(Text, { style: styles.addressLabel }, "From"),
          React.createElement(
            Text,
            { style: styles.addressText },
            invoice.sellerCompanyName || "Sinus Digital",
          ),
          invoice.sellerStreet &&
            React.createElement(
              Text,
              { style: styles.addressText },
              invoice.sellerStreet,
            ),
          React.createElement(
            Text,
            { style: styles.addressText },
            [invoice.sellerPostalCode, invoice.sellerCity].filter(Boolean).join(" ") || "",
          ),
          React.createElement(
            Text,
            { style: styles.addressText },
            invoice.sellerCountry || "Netherlands",
          ),
          invoice.sellerVatId &&
            React.createElement(
              Text,
              { style: { ...styles.addressText, marginTop: 4, color: "#64748b" } },
              `VAT: ${invoice.sellerVatId}`,
            ),
          React.createElement(
            Text,
            { style: { ...styles.addressText, marginTop: invoice.sellerVatId ? 0 : 4, color: "#64748b" } },
            invoice.sellerEmail || "hello@spectacl.org",
          ),
        ),
        // Bill To
        React.createElement(
          View,
          { style: styles.addressBlock },
          React.createElement(Text, { style: styles.addressLabel }, "Bill To"),
          React.createElement(
            Text,
            { style: styles.addressText },
            invoice.companyName,
          ),
          React.createElement(
            Text,
            { style: styles.addressText },
            invoice.street,
          ),
          React.createElement(
            Text,
            { style: styles.addressText },
            `${invoice.postalCode} ${invoice.city}`,
          ),
          React.createElement(
            Text,
            { style: styles.addressText },
            invoice.country,
          ),
          invoice.vatId &&
            React.createElement(
              Text,
              { style: { ...styles.addressText, marginTop: 4, color: "#64748b" } },
              `VAT: ${invoice.vatId}`,
            ),
        ),
      ),
      // Table Header
      React.createElement(
        View,
        { style: styles.table },
        React.createElement(
          View,
          { style: styles.tableHeader },
          React.createElement(
            Text,
            { style: { ...styles.headerText, ...styles.colDescription } },
            "Description",
          ),
          React.createElement(
            Text,
            { style: { ...styles.headerText, ...styles.colQty } },
            "Qty",
          ),
          React.createElement(
            Text,
            { style: { ...styles.headerText, ...styles.colUnitPrice } },
            "Unit Price",
          ),
          React.createElement(
            Text,
            { style: { ...styles.headerText, ...styles.colAmount } },
            "Amount",
          ),
        ),
        // Line Items
        ...invoice.lineItems.map((item, i) =>
          React.createElement(
            View,
            { style: styles.tableRow, key: i },
            React.createElement(
              Text,
              { style: styles.colDescription },
              item.description,
            ),
            React.createElement(
              Text,
              { style: styles.colQty },
              String(item.quantity),
            ),
            React.createElement(
              Text,
              { style: styles.colUnitPrice },
              formatCurrency(item.unitPrice, invoice.currency),
            ),
            React.createElement(
              Text,
              { style: styles.colAmount },
              formatCurrency(item.amount, invoice.currency),
            ),
          ),
        ),
      ),
      // Totals
      React.createElement(
        View,
        { style: styles.totalSection },
        React.createElement(
          View,
          { style: styles.totalBlock },
          React.createElement(
            View,
            { style: styles.totalRow },
            React.createElement(Text, { style: styles.totalLabel }, "Subtotal"),
            React.createElement(
              Text,
              { style: styles.totalValue },
              formatCurrency(invoice.subtotal, invoice.currency),
            ),
          ),
          React.createElement(
            View,
            { style: styles.totalRow },
            React.createElement(
              Text,
              { style: styles.totalLabel },
              invoice.taxLabel,
            ),
            React.createElement(
              Text,
              { style: styles.totalValue },
              formatCurrency(invoice.taxAmount, invoice.currency),
            ),
          ),
          React.createElement(
            View,
            { style: styles.grandTotalRow },
            React.createElement(
              Text,
              { style: styles.grandTotalLabel },
              "Total",
            ),
            React.createElement(
              Text,
              { style: styles.grandTotalValue },
              formatCurrency(invoice.total, invoice.currency),
            ),
          ),
        ),
      ),
      // Reverse charge note
      invoice.taxType === "REVERSE_CHARGE" &&
        React.createElement(
          Text,
          { style: styles.reverseChargeNote },
          "VAT Reverse Charged — Article 196 EU VAT Directive. The recipient is liable for the payment of VAT.",
        ),
      invoice.taxType === "EXEMPT" &&
        React.createElement(
          Text,
          { style: styles.reverseChargeNote },
          "This invoice is exempt from VAT (supply of services outside the EU).",
        ),
      // Footer
      React.createElement(
        View,
        { style: styles.footer },
        React.createElement(
          Text,
          { style: styles.footerText },
          [
            invoice.sellerCompanyName || "Sinus Digital",
            invoice.sellerVatId ? `VAT: ${invoice.sellerVatId}` : null,
            invoice.sellerKvk ? `KvK: ${invoice.sellerKvk}` : null,
            invoice.sellerEmail || "hello@spectacl.org",
          ].filter(Boolean).join(" — "),
        ),
      ),
    ),
  );
}

export async function generateInvoicePdf(invoice: InvoiceData): Promise<Buffer> {
  const element = React.createElement(InvoiceDocument, { invoice });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return await renderToBuffer(element as any);
}
