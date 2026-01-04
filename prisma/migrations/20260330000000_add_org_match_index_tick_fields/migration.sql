ALTER TABLE "Organization"
ADD COLUMN IF NOT EXISTS "matchIndexCursor" TEXT,
ADD COLUMN IF NOT EXISTS "matchIndexClaimId" TEXT,
ADD COLUMN IF NOT EXISTS "matchIndexClaimedAt" TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS "matchIndexErrorJson" JSONB;

CREATE INDEX IF NOT EXISTS "Organization_matchIndexStatus_idx"
ON "Organization"("matchIndexStatus");
