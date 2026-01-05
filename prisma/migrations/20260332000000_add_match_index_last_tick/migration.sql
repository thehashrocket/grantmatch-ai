-- Add matchIndexLastTickAt to Organization
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "matchIndexLastTickAt" TIMESTAMPTZ;
