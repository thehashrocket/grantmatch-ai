-- CreateTable
CREATE TABLE "GrantDetail" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "eligibilityRequirements" JSONB NOT NULL,
    "fundingDetails" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "grantId" TEXT NOT NULL,

    CONSTRAINT "GrantDetail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GrantDetail_grantId_key" ON "GrantDetail"("grantId");

-- AddForeignKey
ALTER TABLE "GrantDetail" ADD CONSTRAINT "GrantDetail_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES "Grant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
