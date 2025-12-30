-- AlterTable
ALTER TABLE "GrantDetail"
ADD COLUMN     "synopsisHtml" TEXT,
ADD COLUMN     "applicantEligibilityDesc" TEXT,
ADD COLUMN     "fundingDescLinkUrl" TEXT,
ADD COLUMN     "responseDateDesc" TEXT,
ADD COLUMN     "rawJson" JSONB,
ADD COLUMN     "fetchedAt" TIMESTAMP(3),
ALTER COLUMN "title" DROP NOT NULL,
ALTER COLUMN "purpose" DROP NOT NULL,
ALTER COLUMN "description" DROP NOT NULL,
ALTER COLUMN "eligibilityRequirements" DROP NOT NULL,
ALTER COLUMN "fundingDetails" DROP NOT NULL;

-- CreateTable
CREATE TABLE "GrantAttachment" (
    "id" TEXT NOT NULL,
    "grantId" TEXT NOT NULL,
    "upstreamId" TEXT,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT,
    "description" TEXT,
    "url" TEXT,
    "sizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrantAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GrantAttachment_grantId_idx" ON "GrantAttachment"("grantId");

-- CreateIndex
CREATE UNIQUE INDEX "GrantAttachment_grantId_upstreamId_key" ON "GrantAttachment"("grantId", "upstreamId");

-- AddForeignKey
ALTER TABLE "GrantAttachment" ADD CONSTRAINT "GrantAttachment_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES "Grant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
