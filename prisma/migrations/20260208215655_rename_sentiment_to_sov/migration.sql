/*
  Warnings:

  - You are about to drop the column `sentiment` on the `MetricSnapshot` table. All the data in the column will be lost.
  - Added the required column `shareOfVoice` to the `MetricSnapshot` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "MetricSnapshot" RENAME COLUMN "sentiment" TO "shareOfVoice";

-- Update existing rows to have a default value (0) if null, to satisfy NOT NULL constraint
UPDATE "MetricSnapshot" SET "shareOfVoice" = 0 WHERE "shareOfVoice" IS NULL;

-- Add NOT NULL constraint
ALTER TABLE "MetricSnapshot" ALTER COLUMN "shareOfVoice" SET NOT NULL;
