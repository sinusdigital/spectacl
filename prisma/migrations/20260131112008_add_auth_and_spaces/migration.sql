-- CreateEnum
CREATE TYPE "SpacePlan" AS ENUM ('FOUNDER', 'FREE', 'PRO', 'BUSINESS', 'ENTERPRISE');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELED', 'INCOMPLETE');
CREATE TYPE "LLMProvider" AS ENUM ('MANAGED', 'BYOK');
CREATE TYPE "SpaceRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- AlterTable User - Add new fields
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "image" TEXT;

-- Update existing users to have a default name
UPDATE "User" SET "name" = "email" WHERE "name" IS NULL;
ALTER TABLE "User" ALTER COLUMN "name" SET NOT NULL;

-- CreateTable Space
CREATE TABLE IF NOT EXISTS "Space" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "plan" "SpacePlan" NOT NULL DEFAULT 'FREE',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "trialEndsAt" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "llmProvider" "LLMProvider" NOT NULL DEFAULT 'MANAGED',
    "enabledModels" TEXT[] DEFAULT ARRAY['gpt-4', 'claude-3-opus', 'gemini-pro']::TEXT[],
    "llmCreditsRemaining" INTEGER NOT NULL DEFAULT 0,
    "llmCreditsUsed" INTEGER NOT NULL DEFAULT 0,
    "creditResetDate" TIMESTAMP(3),
    "openaiApiKey" TEXT,
    "anthropicApiKey" TEXT,
    "googleApiKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Space_pkey" PRIMARY KEY ("id")
);

-- CreateTable SpaceMember
CREATE TABLE IF NOT EXISTS "SpaceMember" (
    "userId" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "role" "SpaceRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invitedById" TEXT,

    CONSTRAINT "SpaceMember_pkey" PRIMARY KEY ("userId","spaceId")
);

-- CreateTable SpaceInvitation
CREATE TABLE IF NOT EXISTS "SpaceInvitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "role" "SpaceRole" NOT NULL DEFAULT 'MEMBER',
    "token" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpaceInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable SpaceUsage
CREATE TABLE IF NOT EXISTS "SpaceUsage" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "entityCount" INTEGER NOT NULL DEFAULT 0,
    "promptCount" INTEGER NOT NULL DEFAULT 0,
    "totalAnalysisRuns" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpaceUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable Session
CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable Account
CREATE TABLE IF NOT EXISTS "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- AlterTable Entity - Add new columns
ALTER TABLE "Entity" ADD COLUMN IF NOT EXISTS "spaceId" TEXT;
ALTER TABLE "Entity" ADD COLUMN IF NOT EXISTS "createdById" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Space_slug_key" ON "Space"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "Space_stripeCustomerId_key" ON "Space"("stripeCustomerId");
CREATE INDEX IF NOT EXISTS "Space_createdById_idx" ON "Space"("createdById");
CREATE INDEX IF NOT EXISTS "Space_stripeCustomerId_idx" ON "Space"("stripeCustomerId");

CREATE INDEX IF NOT EXISTS "SpaceMember_spaceId_idx" ON "SpaceMember"("spaceId");
CREATE INDEX IF NOT EXISTS "SpaceMember_userId_idx" ON "SpaceMember"("userId");

CREATE UNIQUE INDEX IF NOT EXISTS "SpaceInvitation_token_key" ON "SpaceInvitation"("token");
CREATE INDEX IF NOT EXISTS "SpaceInvitation_spaceId_idx" ON "SpaceInvitation"("spaceId");
CREATE INDEX IF NOT EXISTS "SpaceInvitation_email_idx" ON "SpaceInvitation"("email");
CREATE INDEX IF NOT EXISTS "SpaceInvitation_token_idx" ON "SpaceInvitation"("token");

CREATE UNIQUE INDEX IF NOT EXISTS "SpaceUsage_spaceId_key" ON "SpaceUsage"("spaceId");
CREATE INDEX IF NOT EXISTS "SpaceUsage_spaceId_idx" ON "SpaceUsage"("spaceId");

CREATE UNIQUE INDEX IF NOT EXISTS "Session_token_key" ON "Session"("token");
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");

CREATE UNIQUE INDEX IF NOT EXISTS "Account_providerId_accountId_key" ON "Account"("providerId", "accountId");
CREATE INDEX IF NOT EXISTS "Account_userId_idx" ON "Account"("userId");

CREATE INDEX IF NOT EXISTS "Entity_spaceId_idx" ON "Entity"("spaceId");
CREATE INDEX IF NOT EXISTS "Entity_createdById_idx" ON "Entity"("createdById");

-- AddForeignKey
ALTER TABLE "Space" ADD CONSTRAINT "Space_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SpaceMember" ADD CONSTRAINT "SpaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SpaceMember" ADD CONSTRAINT "SpaceMember_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SpaceMember" ADD CONSTRAINT "SpaceMember_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SpaceInvitation" ADD CONSTRAINT "SpaceInvitation_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SpaceInvitation" ADD CONSTRAINT "SpaceInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SpaceUsage" ADD CONSTRAINT "SpaceUsage_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- Entity foreign keys will be added after data migration
