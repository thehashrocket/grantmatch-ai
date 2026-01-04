-- CreateEnum
CREATE TYPE "OrganizationApplicantType" AS ENUM ('NONPROFIT', 'SCHOOL', 'GOVERNMENT', 'TRIBE', 'FOR_PROFIT', 'INDIVIDUAL', 'OTHER');

-- AlterTable
ALTER TABLE "Organization"
ADD COLUMN     "focusKeywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "geographyKeywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "applicantType" "OrganizationApplicantType",
ADD COLUMN     "minAward" INTEGER,
ADD COLUMN     "maxAward" INTEGER,
ADD COLUMN     "scoringVersion" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "GrantMatch" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "grantId" TEXT NOT NULL,
    "fitScore" DOUBLE PRECISION NOT NULL,
    "version" INTEGER NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subscoresJson" JSONB,
    "explanation" TEXT,

    CONSTRAINT "GrantMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GrantMatch_organizationId_grantId_key" ON "GrantMatch"("organizationId", "grantId");
CREATE INDEX "GrantMatch_organizationId_fitScore_idx" ON "GrantMatch"("organizationId", "fitScore");
CREATE INDEX "GrantMatch_organizationId_grantId_idx" ON "GrantMatch"("organizationId", "grantId");

-- AddForeignKey
ALTER TABLE "GrantMatch" ADD CONSTRAINT "GrantMatch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GrantMatch" ADD CONSTRAINT "GrantMatch_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES "Grant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
