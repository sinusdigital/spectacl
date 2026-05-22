-- AlterTable
ALTER TABLE "Space" ADD COLUMN     "canceledAt" TIMESTAMP(3),
ADD COLUMN     "cancellationReason" TEXT;
