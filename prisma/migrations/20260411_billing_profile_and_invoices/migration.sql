-- CreateEnum
CREATE TYPE "InvoiceTaxType" AS ENUM ('STANDARD', 'REVERSE_CHARGE', 'EXEMPT');

-- CreateTable
CREATE TABLE "BillingProfile" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "vatId" TEXT,
    "vatIdValid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "molliePaymentId" TEXT,
    "companyName" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "vatId" TEXT,
    "lineItems" JSONB NOT NULL,
    "taxType" "InvoiceTaxType" NOT NULL,
    "taxRate" DOUBLE PRECISION NOT NULL,
    "taxLabel" TEXT NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "taxAmount" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceCounter" (
    "year" INTEGER NOT NULL,
    "lastSeq" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InvoiceCounter_pkey" PRIMARY KEY ("year")
);

-- CreateIndex
CREATE UNIQUE INDEX "BillingProfile_spaceId_key" ON "BillingProfile"("spaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");

-- CreateIndex
CREATE INDEX "Invoice_spaceId_idx" ON "Invoice"("spaceId");

-- CreateIndex
CREATE INDEX "Invoice_issuedAt_idx" ON "Invoice"("issuedAt");

-- CreateIndex
CREATE INDEX "Invoice_molliePaymentId_idx" ON "Invoice"("molliePaymentId");

-- AddForeignKey
ALTER TABLE "BillingProfile" ADD CONSTRAINT "BillingProfile_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;
