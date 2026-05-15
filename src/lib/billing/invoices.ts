/**
 * Invoice creation orchestrator.
 *
 * Creates invoice records from payment events with:
 * - Billing profile snapshot (immutable at time of invoice)
 * - Tax calculation (via tax.ts)
 * - Gap-free sequential numbering (via InvoiceCounter table)
 * - Email notification (fire-and-forget)
 *
 * Zero imports from plans.ts, access.ts, or trial.ts.
 */

import { prisma } from "@/lib/prisma";
import { SystemSettings } from "@/lib/settings";
import { calculateTax, calculateTaxAmount } from "./tax";
import type { InvoiceTaxType } from "@prisma/client";

export interface CreateInvoiceInput {
  spaceId: string;
  molliePaymentId: string;
  plan: string;
  /** Net amount in EUR (ex-VAT, from plan pricing) */
  amount: number;
  periodStart?: Date;
  periodEnd?: Date;
}

interface InvoiceResult {
  invoiceId: string;
  number: string;
}

/**
 * Generate the next sequential invoice number atomically.
 * Format: {PREFIX}-YYYY-NNNN (e.g. SPE-2026-0001)
 * Prefix is configurable via SystemSettings (invoice_prefix), defaults to "SPE".
 * Counter resets to 0001 on January 1st each year (keyed by year in InvoiceCounter).
 */
async function getNextInvoiceNumber(prefix?: string | null): Promise<string> {
  const year = new Date().getFullYear();
  const pfx = (prefix && prefix.trim()) ? prefix.trim().toUpperCase() : "SPE";

  const result = await prisma.$queryRaw<{ lastSeq: number }[]>`
    INSERT INTO "InvoiceCounter" (year, "lastSeq")
    VALUES (${year}, 1)
    ON CONFLICT (year)
    DO UPDATE SET "lastSeq" = "InvoiceCounter"."lastSeq" + 1
    RETURNING "lastSeq"
  `;

  const seq = result[0].lastSeq;
  return `${pfx}-${year}-${String(seq).padStart(4, "0")}`;
}

/**
 * Create an invoice from a payment event.
 *
 * Returns null if the space has no billing profile (cannot generate invoice).
 * Duplicate invoices for the same molliePaymentId are prevented by checking
 * for existing records.
 */
export async function createInvoice(
  input: CreateInvoiceInput,
): Promise<InvoiceResult | null> {
  const { spaceId, molliePaymentId, plan, amount, periodStart, periodEnd } =
    input;

  // Prevent duplicate invoices for the same payment
  const existing = await prisma.invoice.findFirst({
    where: { molliePaymentId },
    select: { id: true, number: true },
  });
  if (existing) {
    console.log(
      `[Invoice] Already exists for payment ${molliePaymentId}: ${existing.number}`,
    );
    return { invoiceId: existing.id, number: existing.number };
  }

  // Fetch billing profile and space name
  const [profile, space] = await Promise.all([
    prisma.billingProfile.findUnique({ where: { spaceId } }),
    prisma.space.findUnique({ where: { id: spaceId }, select: { name: true } }),
  ]);

  if (!profile) {
    console.warn(
      `[Invoice] No billing profile for space ${spaceId} — skipping invoice generation`,
    );
    return null;
  }

  // Calculate tax
  const tax = calculateTax(profile.country, profile.vatIdValid);
  const subtotal = amount;
  const taxAmount = calculateTaxAmount(subtotal, tax.rate);
  const total = Math.round((subtotal + taxAmount) * 100) / 100;

  // Map tax type string to Prisma enum
  const taxTypeMap: Record<string, InvoiceTaxType> = {
    standard: "STANDARD",
    reverse_charge: "REVERSE_CHARGE",
    exempt: "EXEMPT",
  };

  // Fetch seller info from system settings (snapshot for immutability)
  const seller = await SystemSettings.getMany([
    "seller_company_name", "seller_street", "seller_city",
    "seller_postal_code", "seller_country", "seller_vat_id", "seller_kvk", "seller_email",
    "invoice_prefix",
  ]);

  // Generate sequential invoice number
  const number = await getNextInvoiceNumber(seller.invoice_prefix);

  // Build line items
  const lineItems = [
    {
      description: `Spectacl ${plan} — ${space?.name ?? "Subscription"}`,
      quantity: 1,
      unitPrice: subtotal,
      amount: subtotal,
    },
  ];

  // Create invoice record with billing snapshot
  const invoice = await prisma.invoice.create({
    data: {
      number,
      spaceId,
      molliePaymentId,
      // Seller snapshot
      sellerCompanyName: seller.seller_company_name,
      sellerStreet: seller.seller_street,
      sellerCity: seller.seller_city,
      sellerPostalCode: seller.seller_postal_code,
      sellerCountry: seller.seller_country,
      sellerVatId: seller.seller_vat_id,
      sellerKvk: seller.seller_kvk,
      sellerEmail: seller.seller_email,
      // Buyer snapshot
      companyName: profile.companyName,
      street: profile.street,
      city: profile.city,
      postalCode: profile.postalCode,
      country: profile.country,
      vatId: profile.vatId,
      // Financial
      lineItems,
      taxType: taxTypeMap[tax.type],
      taxRate: tax.rate,
      taxLabel: tax.label,
      subtotal,
      taxAmount,
      total,
      // Period
      periodStart: periodStart ?? new Date(),
      periodEnd: periodEnd ?? null,
    },
  });

  console.log(`[Invoice] Created ${number} for space ${spaceId} (${plan}, total: €${total})`);

  // Fire-and-forget: send invoice email
  sendInvoiceEmail(invoice.id).catch((err) =>
    console.error("[Invoice] Email send failed:", err),
  );

  return { invoiceId: invoice.id, number: invoice.number };
}

/**
 * Send invoice notification email (async, non-blocking).
 */
async function sendInvoiceEmail(invoiceId: string): Promise<void> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      space: {
        select: {
          name: true,
          createdById: true,
          User: { select: { email: true, name: true } },
        },
      },
    },
  });

  if (!invoice?.space?.User?.email) {
    console.warn(`[Invoice] No email recipient for invoice ${invoiceId}`);
    return;
  }

  try {
    const { renderEmail, sendEmail } = await import("@/lib/send-email");
    const { InvoiceEmail } = await import("@/emails");

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const html = await renderEmail(InvoiceEmail, {
      invoiceNumber: invoice.number,
      spaceName: invoice.space.name,
      companyName: invoice.companyName,
      total: `€${invoice.total.toFixed(2)}`,
      taxLabel: invoice.taxLabel,
      issuedDate: invoice.issuedAt.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      invoiceUrl: `${appUrl}/api/billing/invoices/${invoice.id}?format=pdf`,
      userName: invoice.space.User.name ?? undefined,
    });

    await sendEmail({
      from: "Spectacl Billing <billing@mail.spectacl.org>",
      to: invoice.space.User.email,
      subject: `Invoice ${invoice.number} — Spectacl`,
      html,
      label: "invoice",
    });
  } catch (err) {
    console.error(`[Invoice] Failed to send email for ${invoiceId}:`, err);
  }
}
