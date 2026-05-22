-- AlterTable: Add seller snapshot fields to Invoice
ALTER TABLE "Invoice" ADD COLUMN     "sellerCity" TEXT,
ADD COLUMN     "sellerCompanyName" TEXT,
ADD COLUMN     "sellerCountry" TEXT,
ADD COLUMN     "sellerEmail" TEXT,
ADD COLUMN     "sellerPostalCode" TEXT,
ADD COLUMN     "sellerStreet" TEXT,
ADD COLUMN     "sellerVatId" TEXT;
