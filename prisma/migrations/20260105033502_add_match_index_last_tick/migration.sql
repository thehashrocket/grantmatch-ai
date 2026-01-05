-- Add column for last tick timestamp
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "matchIndexLastTickAt" TIMESTAMPTZ;
