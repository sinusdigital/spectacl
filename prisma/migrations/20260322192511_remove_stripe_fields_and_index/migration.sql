/*
  Warnings:

  - You are about to drop the column `stripeCustomerId` on the `Space` table. All the data in the column will be lost.
  - You are about to drop the column `stripeSubscriptionId` on the `Space` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Space_stripeCustomerId_idx";

-- DropIndex
DROP INDEX "Space_stripeCustomerId_key";

-- AlterTable
ALTER TABLE "Space" DROP COLUMN "stripeCustomerId",
DROP COLUMN "stripeSubscriptionId";
