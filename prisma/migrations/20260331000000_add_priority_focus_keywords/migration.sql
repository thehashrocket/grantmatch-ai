-- AlterTable
ALTER TABLE "Organization"
ADD COLUMN "priorityFocusKeywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "Organization" ALTER COLUMN "scoringVersion" SET DEFAULT 4;
