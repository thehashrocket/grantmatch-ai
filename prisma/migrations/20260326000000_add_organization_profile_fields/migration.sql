-- Add organization profile enums
CREATE TYPE "OrganizationEntityType" AS ENUM ('NONPROFIT_501C3', 'NONPROFIT_OTHER', 'FISCAL_SPONSOR', 'GOVERNMENT', 'TRIBE', 'SCHOOL', 'FOR_PROFIT', 'INDIVIDUAL', 'OTHER');
CREATE TYPE "RevenueSource" AS ENUM ('DONATIONS', 'GRANTS', 'GOV_CONTRACTS', 'PROGRAM_FEES', 'MEMBERSHIPS', 'CORPORATE_SPONSORS', 'OTHER');
CREATE TYPE "BudgetRange" AS ENUM ('LT_50K', 'FROM_50K_TO_250K', 'FROM_250K_TO_1M', 'FROM_1M_TO_5M', 'OVER_5M');
CREATE TYPE "StaffRange" AS ENUM ('ZERO', 'ONE_TO_FIVE', 'SIX_TO_TWENTY', 'TWENTY_ONE_TO_ONE_HUNDRED', 'OVER_ONE_HUNDRED');

-- Add profile fields and defaults
ALTER TABLE "Organization"
ADD COLUMN     "serviceAreas" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "entityType" "OrganizationEntityType",
ADD COLUMN     "revenueSources" "RevenueSource"[] NOT NULL DEFAULT ARRAY[]::"RevenueSource"[],
ADD COLUMN     "budgetRange" "BudgetRange",
ADD COLUMN     "staffRange" "StaffRange";

ALTER TABLE "Organization"
ALTER COLUMN "focusAreas" SET DEFAULT ARRAY[]::TEXT[];

UPDATE "Organization" SET "focusAreas" = ARRAY[]::TEXT[] WHERE "focusAreas" IS NULL;
ALTER TABLE "Organization" ALTER COLUMN "focusAreas" SET NOT NULL;

ALTER TABLE "Organization" ALTER COLUMN "scoringVersion" SET DEFAULT 2;
UPDATE "Organization" SET "scoringVersion" = 2;
