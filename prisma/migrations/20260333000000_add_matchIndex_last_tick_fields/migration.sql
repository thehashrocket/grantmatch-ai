-- Add last tick tracking fields
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "matchIndexLastTickIndexedDelta" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "matchIndexLastTickRecomputedDelta" INTEGER NOT NULL DEFAULT 0;
