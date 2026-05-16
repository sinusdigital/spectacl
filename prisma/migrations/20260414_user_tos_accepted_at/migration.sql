-- AlterTable: Record when user accepted Terms of Service (GDPR Art. 7(1))
ALTER TABLE "User" ADD COLUMN "tosAcceptedAt" TIMESTAMP(3);
