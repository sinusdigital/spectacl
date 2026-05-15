import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      space: {
        select: { id: true },
      },
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  // Verify access — space members can access their space's invoices; admins can access any
  const isAdmin = session.user.role === "ADMIN";
  if (!invoice.space) {
    // Space was deleted — only admins can access orphaned invoices
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else {
    const membership = await prisma.spaceMember.findUnique({
      where: {
        userId_spaceId: { userId: session.user.id, spaceId: invoice.space.id },
      },
    });
    if (!membership && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const format = request.nextUrl.searchParams.get("format");

  if (format === "pdf") {
    try {
      const { generateInvoicePdf } = await import(
        "@/lib/billing/invoice-pdf"
      );

      const pdfBuffer = await generateInvoicePdf({
        number: invoice.number,
        issuedAt: invoice.issuedAt,
        sellerCompanyName: invoice.sellerCompanyName,
        sellerStreet: invoice.sellerStreet,
        sellerCity: invoice.sellerCity,
        sellerPostalCode: invoice.sellerPostalCode,
        sellerCountry: invoice.sellerCountry,
        sellerVatId: invoice.sellerVatId,
        sellerKvk: invoice.sellerKvk,
        sellerEmail: invoice.sellerEmail,
        companyName: invoice.companyName,
        street: invoice.street,
        city: invoice.city,
        postalCode: invoice.postalCode,
        country: invoice.country,
        vatId: invoice.vatId,
        lineItems: invoice.lineItems as {
          description: string;
          quantity: number;
          unitPrice: number;
          amount: number;
        }[],
        taxType: invoice.taxType,
        taxRate: invoice.taxRate,
        taxLabel: invoice.taxLabel,
        subtotal: invoice.subtotal,
        taxAmount: invoice.taxAmount,
        total: invoice.total,
        currency: invoice.currency,
        periodStart: invoice.periodStart,
        periodEnd: invoice.periodEnd,
      });

      return new NextResponse(pdfBuffer as unknown as BodyInit, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${invoice.number}.pdf"`,
        },
      });
    } catch (err) {
      console.error("[Invoice PDF] Generation failed:", err);
      return NextResponse.json(
        { error: "Failed to generate PDF" },
        { status: 500 },
      );
    }
  }

  // Return JSON by default
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { space: _space, ...invoiceData } = invoice;
  return NextResponse.json({ invoice: invoiceData });
}
