-- CreateEnum
CREATE TYPE "GrantSource" AS ENUM ('CALIFORNIA', 'FEDERAL', 'OHIO', 'OTHER');

-- AlterTable
ALTER TABLE "Grant" ADD COLUMN     "agencyCode" TEXT,
ADD COLUMN     "awardCeiling" BIGINT,
ADD COLUMN     "awardFloor" BIGINT,
ADD COLUMN     "cfdaList" JSONB,
ADD COLUMN     "number" TEXT,
ADD COLUMN     "source" "GrantSource" NOT NULL DEFAULT 'CALIFORNIA',
ALTER COLUMN "stateAgency" DROP NOT NULL,
ALTER COLUMN "matchFunding" DROP NOT NULL,
ALTER COLUMN "estimatedTotalFunding" DROP NOT NULL,
ALTER COLUMN "estimatedAwardAmounts" DROP NOT NULL,
ALTER COLUMN "fundsDisbursment" DROP NOT NULL,
ALTER COLUMN "currentAsOf" DROP NOT NULL,
ALTER COLUMN "portalId" DROP NOT NULL,
ALTER COLUMN "opportunityType" DROP NOT NULL,
ALTER COLUMN "purpose" DROP NOT NULL,
ALTER COLUMN "eligibleApplicants" DROP NOT NULL,
ALTER COLUMN "eligibleGeographies" DROP NOT NULL;
