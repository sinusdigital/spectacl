-- AlterTable: add Mollie payment fields to Space
ALTER TABLE "Space"
    ADD COLUMN IF NOT EXISTS "mollieCustomerId"     TEXT,
    ADD COLUMN IF NOT EXISTS "mollieSubscriptionId" TEXT,
    ADD COLUMN IF NOT EXISTS "molliePaymentId"      TEXT;
