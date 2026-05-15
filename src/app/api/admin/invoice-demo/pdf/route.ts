import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { generateInvoicePdf } from "@/lib/billing/invoice-pdf";
import { SystemSettings } from "@/lib/settings";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();

    const seller = await SystemSettings.getMany([
      "seller_company_name", "seller_street", "seller_city",
      "seller_postal_code", "seller_country", "seller_vat_id", "seller_kvk", "seller_email",
    ]);

    const invoice = {
      number: body.number ?? "SPE-0000-0000",
      issuedAt: new Date(),
      sellerCompanyName: seller.seller_company_name,
      sellerStreet: seller.seller_street,
      sellerCity: seller.seller_city,
      sellerPostalCode: seller.seller_postal_code,
      sellerCountry: seller.seller_country,
      sellerVatId: seller.seller_vat_id,
      sellerKvk: seller.seller_kvk,
      sellerEmail: seller.seller_email,
      companyName: body.companyName ?? "Demo Company",
      street: body.street ?? "123 Demo Street",
      city: body.city ?? "Demo City",
      postalCode: body.postalCode ?? "00000",
      country: body.country ?? "NL",
      vatId: body.vatId ?? null,
      lineItems: [
        {
          description: `Spectacl ${body.plan ?? "PRO"} — Monthly Subscription`,
          quantity: 1,
          unitPrice: body.subtotal ?? 99,
          amount: body.subtotal ?? 99,
        },
      ],
      taxType: body.taxType ?? "STANDARD",
      taxRate: body.taxRate ?? 0.21,
      taxLabel: body.taxLabel ?? "21% BTW",
      subtotal: body.subtotal ?? 99,
      taxAmount: body.taxAmount ?? 20.79,
      total: body.total ?? 119.79,
      currency: "EUR",
      periodStart: body.periodStart ? new Date(body.periodStart) : null,
      periodEnd: body.periodEnd ? new Date(body.periodEnd) : null,
    };

    const pdfBuffer = await generateInvoicePdf(invoice);

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${invoice.number}.pdf"`,
      },
    });
  } catch (err) {
    console.error("[Invoice Demo] PDF generation failed:", err);
    return NextResponse.json(
      { error: "PDF generation failed" },
      { status: 500 },
    );
  }
}
