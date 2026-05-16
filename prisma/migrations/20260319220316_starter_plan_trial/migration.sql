-- Step 1: Create new enum type that includes STARTER (replacing FREE)
--         The USING cast handles existing 'FREE' values — but we must first
--         create the new type so Postgres can cast to it.
--         Since ADD VALUE can't be used in a transaction, we do a full type swap.

BEGIN;

-- 1a. Create the new enum (STARTER instead of FREE)
CREATE TYPE "SpacePlan_new" AS ENUM ('FOUNDER', 'STARTER', 'PRO', 'BUSINESS', 'ENTERPRISE');

-- 1b. Migrate the column: cast FREE → STARTER via CASE
ALTER TABLE "Space" ALTER COLUMN "plan" DROP DEFAULT;
ALTER TABLE "Space"
  ALTER COLUMN "plan" TYPE "SpacePlan_new"
  USING (
    CASE "plan"::text
      WHEN 'FREE' THEN 'STARTER'
      ELSE "plan"::text
    END::"SpacePlan_new"
  );

-- 1c. Swap type names
ALTER TYPE "SpacePlan" RENAME TO "SpacePlan_old";
ALTER TYPE "SpacePlan_new" RENAME TO "SpacePlan";
DROP TYPE "SpacePlan_old";

-- 1d. Set new default
ALTER TABLE "Space" ALTER COLUMN "plan" SET DEFAULT 'STARTER';

COMMIT;

-- Step 2: Update subscriptionStatus default
ALTER TABLE "Space" ALTER COLUMN "subscriptionStatus" SET DEFAULT 'TRIALING';
