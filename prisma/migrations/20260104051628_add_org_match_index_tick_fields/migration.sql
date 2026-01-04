-- Ensure column exists before altering (older databases may be missing it)
ALTER TABLE "Organization"
ADD COLUMN IF NOT EXISTS "matchIndexClaimedAt" TIMESTAMP(3);

-- Align type
ALTER TABLE "Organization" ALTER COLUMN "matchIndexClaimedAt" SET DATA TYPE TIMESTAMP(3);
