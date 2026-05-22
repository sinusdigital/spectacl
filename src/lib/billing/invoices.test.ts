import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockPrisma, mockReset } from "@/test/mocks/prisma";

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

import { createInvoice } from "./invoices";

const mockBillingProfile = {
  id: "bp-1",
  spaceId: "space-1",
  companyName: "Test B.V.",
  street: "Keizersgracht 123",
  city: "Amsterdam",
  postalCode: "1015 AB",
  country: "NL",
  vatId: "NL123456789B01",
  vatIdValid: true,
};

const mockInput = {
  spaceId: "space-1",
  molliePaymentId: "tr_test123",
  plan: "PRO",
  amount: 99,
  periodStart: new Date("2026-04-11"),
  periodEnd: new Date("2026-05-11"),
};

describe("createInvoice", () => {
  beforeEach(() => {
    mockReset();
    // Default: no existing invoice
    mockPrisma.invoice.findFirst.mockResolvedValue(null);
    // Default: billing profile exists
    mockPrisma.billingProfile.findUnique.mockResolvedValue(mockBillingProfile);
    // Default: space name
    mockPrisma.space.findUnique.mockResolvedValue({ name: "Test Space" });
    // Default: seller settings
    mockPrisma.systemSetting.findMany.mockResolvedValue([]);
    // Default: sequential number generation
    mockPrisma.$queryRaw.mockResolvedValue([{ lastSeq: 1 }]);
    // Default: invoice creation
    mockPrisma.invoice.create.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        id: "inv-1",
        number: data.number,
        ...data,
        space: {
          name: "Test Space",
          User: { email: "test@example.com", name: "Test" },
        },
      }),
    );
  });

  it("creates an invoice with correct NL domestic tax (21%)", async () => {
    const result = await createInvoice(mockInput);

    expect(result).not.toBeNull();
    expect(result!.number).toBe("SPE-2026-0001");

    const createCall = mockPrisma.invoice.create.mock.calls[0][0].data;
    expect(createCall.taxType).toBe("STANDARD");
    expect(createCall.taxRate).toBe(0.21);
    expect(createCall.subtotal).toBe(99);
    expect(createCall.taxAmount).toBe(20.79);
    expect(createCall.total).toBe(119.79);
    expect(createCall.companyName).toBe("Test B.V.");
  });

  it("creates invoice with EU reverse charge (0%)", async () => {
    mockPrisma.billingProfile.findUnique.mockResolvedValue({
      ...mockBillingProfile,
      country: "DE",
      vatIdValid: true,
    });

    const result = await createInvoice(mockInput);

    const createCall = mockPrisma.invoice.create.mock.calls[0][0].data;
    expect(createCall.taxType).toBe("REVERSE_CHARGE");
    expect(createCall.taxRate).toBe(0);
    expect(createCall.subtotal).toBe(99);
    expect(createCall.taxAmount).toBe(0);
    expect(createCall.total).toBe(99);
    expect(result).not.toBeNull();
  });

  it("creates invoice with non-EU exempt (0%)", async () => {
    mockPrisma.billingProfile.findUnique.mockResolvedValue({
      ...mockBillingProfile,
      country: "US",
      vatId: null,
      vatIdValid: false,
    });

    const result = await createInvoice(mockInput);

    const createCall = mockPrisma.invoice.create.mock.calls[0][0].data;
    expect(createCall.taxType).toBe("EXEMPT");
    expect(createCall.taxRate).toBe(0);
    expect(createCall.total).toBe(99);
    expect(result).not.toBeNull();
  });

  it("charges 21% for EU customer without valid VAT ID", async () => {
    mockPrisma.billingProfile.findUnique.mockResolvedValue({
      ...mockBillingProfile,
      country: "FR",
      vatIdValid: false,
    });

    const result = await createInvoice(mockInput);

    const createCall = mockPrisma.invoice.create.mock.calls[0][0].data;
    expect(createCall.taxType).toBe("STANDARD");
    expect(createCall.taxRate).toBe(0.21);
    expect(createCall.taxAmount).toBe(20.79);
    expect(result).not.toBeNull();
  });

  it("returns null when no billing profile exists", async () => {
    mockPrisma.billingProfile.findUnique.mockResolvedValue(null);

    const result = await createInvoice(mockInput);

    expect(result).toBeNull();
    expect(mockPrisma.invoice.create).not.toHaveBeenCalled();
  });

  it("returns existing invoice for duplicate payment ID", async () => {
    mockPrisma.invoice.findFirst.mockResolvedValue({
      id: "inv-existing",
      number: "SPE-2026-0042",
    });

    const result = await createInvoice(mockInput);

    expect(result).toEqual({
      invoiceId: "inv-existing",
      number: "SPE-2026-0042",
    });
    expect(mockPrisma.invoice.create).not.toHaveBeenCalled();
  });

  it("generates correct invoice number format", async () => {
    mockPrisma.$queryRaw.mockResolvedValue([{ lastSeq: 42 }]);

    const result = await createInvoice(mockInput);

    expect(result!.number).toBe("SPE-2026-0042");
  });

  it("stores line items as array", async () => {
    await createInvoice(mockInput);

    const createCall = mockPrisma.invoice.create.mock.calls[0][0].data;
    expect(createCall.lineItems).toEqual([
      {
        description: "Spectacl PRO \u2014 Test Space",
        quantity: 1,
        unitPrice: 99,
        amount: 99,
      },
    ]);
  });

  it("snapshots billing address on invoice", async () => {
    await createInvoice(mockInput);

    const createCall = mockPrisma.invoice.create.mock.calls[0][0].data;
    expect(createCall.companyName).toBe("Test B.V.");
    expect(createCall.street).toBe("Keizersgracht 123");
    expect(createCall.city).toBe("Amsterdam");
    expect(createCall.postalCode).toBe("1015 AB");
    expect(createCall.country).toBe("NL");
    expect(createCall.vatId).toBe("NL123456789B01");
  });

  it("stores Mollie payment ID on invoice", async () => {
    await createInvoice(mockInput);

    const createCall = mockPrisma.invoice.create.mock.calls[0][0].data;
    expect(createCall.molliePaymentId).toBe("tr_test123");
  });
});
