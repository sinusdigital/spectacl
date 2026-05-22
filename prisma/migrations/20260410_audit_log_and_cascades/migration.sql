-- CreateTable: AuditLog
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX "AuditLog_targetType_targetId_idx" ON "AuditLog"("targetType", "targetId");

-- AddForeignKey: AuditLog.userId → User (SetNull for account deletion)
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Make Entity.userId nullable (entity stays in space when creator deletes account)
ALTER TABLE "Entity" ALTER COLUMN "userId" DROP NOT NULL;

-- Make Space.createdById nullable (space stays when creator deletes account)
ALTER TABLE "Space" ALTER COLUMN "createdById" DROP NOT NULL;

-- Drop existing FK constraints and re-create with cascade rules
-- Entity.userId → SetNull
ALTER TABLE "Entity" DROP CONSTRAINT IF EXISTS "Entity_userId_fkey";
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Space.createdById → SetNull
ALTER TABLE "Space" DROP CONSTRAINT IF EXISTS "Space_createdById_fkey";
ALTER TABLE "Space" ADD CONSTRAINT "Space_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- SpaceInvitation.invitedById → Cascade (delete stale invites)
ALTER TABLE "SpaceInvitation" DROP CONSTRAINT IF EXISTS "SpaceInvitation_invitedById_fkey";
ALTER TABLE "SpaceInvitation" ADD CONSTRAINT "SpaceInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- SpaceMember.invitedById → SetNull (membership stays, inviter ref cleared)
ALTER TABLE "SpaceMember" DROP CONSTRAINT IF EXISTS "SpaceMember_invitedById_fkey";
ALTER TABLE "SpaceMember" ADD CONSTRAINT "SpaceMember_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
