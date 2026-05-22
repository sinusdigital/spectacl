-- AlterTable: Add lock fields to User (mirrors Space.isLocked pattern)
ALTER TABLE "User" ADD COLUMN "isLocked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "lockedReason" TEXT;
