-- AlterTable: add binary logo storage to Domain
ALTER TABLE "Domain"
  ADD COLUMN "logoBytes" BYTEA,
  ADD COLUMN "logoMimeType" TEXT;
