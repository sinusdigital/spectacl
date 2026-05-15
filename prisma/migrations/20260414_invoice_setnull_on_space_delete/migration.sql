-- Invoice retention: keep invoices when space is deleted (Dutch 7-year tax law)
-- Change from CASCADE to SET NULL so invoices survive space deletion

ALTER TABLE "Invoice" ALTER COLUMN "spaceId" DROP NOT NULL;

ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_spaceId_fkey";

ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_spaceId_fkey"
  FOREIGN KEY ("spaceId") REFERENCES "Space"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
