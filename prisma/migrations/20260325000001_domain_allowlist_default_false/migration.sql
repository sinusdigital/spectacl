-- AlterTable: change default for isAllowlisted from true to false
ALTER TABLE "Domain" ALTER COLUMN "isAllowlisted" SET DEFAULT false;
