-- CreateTable
CREATE TABLE "Grant" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "openDate" TIMESTAMP(3) NOT NULL,
    "stateAgency" TEXT NOT NULL,
    "matchFunding" TEXT NOT NULL,
    "estimatedTotalFunding" INTEGER NOT NULL,
    "estimatedAwardAmounts" TEXT NOT NULL,
    "fundsDisbursment" TEXT NOT NULL,
    "currentAsOf" TIMESTAMP(3) NOT NULL,
    "grantor" TEXT NOT NULL,
    "portalId" INTEGER NOT NULL,
    "opportunityType" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "eligibleApplicants" TEXT NOT NULL,
    "eligibleGeographies" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Grant_pkey" PRIMARY KEY ("id")
);
