-- CreateEnum
CREATE TYPE "GrantDetailsStatus" AS ENUM ('UNKNOWN', 'FETCHING', 'AVAILABLE', 'FAILED');

-- AlterTable
ALTER TABLE "Grant" ADD COLUMN "detailsError" VARCHAR(500),
ADD COLUMN "detailsErrorAt" TIMESTAMP(3),
ADD COLUMN "detailsFetchedAt" TIMESTAMP(3),
ADD COLUMN "detailsStatus" "GrantDetailsStatus" NOT NULL DEFAULT 'UNKNOWN';
