-- AlterTable: Add seller KvK number to Invoice
ALTER TABLE "Invoice" ADD COLUMN "sellerKvk" TEXT;
