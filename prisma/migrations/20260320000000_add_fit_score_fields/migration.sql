-- Add fit scoring fields to Grant for precomputed rankings
ALTER TABLE "Grant"
ADD COLUMN "fitScore" DOUBLE PRECISION,
ADD COLUMN "fitScoreVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "fitScoreComputedAt" TIMESTAMP(3);

CREATE INDEX "Grant_fitScore_idx" ON "Grant"("fitScore");
