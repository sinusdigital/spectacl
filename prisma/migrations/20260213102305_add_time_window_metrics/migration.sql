-- CreateEnum
CREATE TYPE "GlobalRole" AS ENUM ('USER', 'ADMIN');

-- AlterTable
ALTER TABLE "AnalysisResult" DROP COLUMN "sentiment";

-- AlterTable
ALTER TABLE "Prompt" ADD COLUMN     "avgPosition30d" DOUBLE PRECISION,
ADD COLUMN     "avgPosition7d" DOUBLE PRECISION,
ADD COLUMN     "avgPosition90d" DOUBLE PRECISION,
ADD COLUMN     "lastAvgPosition" DOUBLE PRECISION,
ADD COLUMN     "lastMentionRate" DOUBLE PRECISION,
ADD COLUMN     "lastShareOfVoice" DOUBLE PRECISION,
ADD COLUMN     "mentionRate30d" DOUBLE PRECISION,
ADD COLUMN     "mentionRate7d" DOUBLE PRECISION,
ADD COLUMN     "mentionRate90d" DOUBLE PRECISION,
ADD COLUMN     "shareOfVoice30d" DOUBLE PRECISION,
ADD COLUMN     "shareOfVoice7d" DOUBLE PRECISION,
ADD COLUMN     "shareOfVoice90d" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "GlobalRole" NOT NULL DEFAULT 'USER';

-- CreateTable
CREATE TABLE "SystemSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);

