-- Add match index tracking to organizations
CREATE TYPE "MatchIndexStatus" AS ENUM ('NOT_STARTED', 'RUNNING', 'COMPLETE', 'FAILED');

ALTER TABLE "Organization"
ADD COLUMN     "matchIndexStatus" "MatchIndexStatus" NOT NULL DEFAULT 'NOT_STARTED',
ADD COLUMN     "matchIndexedAt" TIMESTAMP(3),
ADD COLUMN     "matchIndexedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "matchIndexError" TEXT;
