/*
  Warnings:

  - The `status` column on the `Grant` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "public"."GrantStatus" AS ENUM ('OPEN', 'CLOSED', 'UNKNOWN');

-- DropIndex
DROP INDEX "public"."Grant_portalId_source_key";

-- AlterTable
ALTER TABLE "public"."Grant" DROP COLUMN "status",
ADD COLUMN     "status" "public"."GrantStatus" NOT NULL DEFAULT 'UNKNOWN';

-- CreateTable
CREATE TABLE "public"."GrantSyncRun" (
    "id" TEXT NOT NULL,
    "source" "public"."GrantSource" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" "public"."ImportStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "recordsFetched" INTEGER NOT NULL DEFAULT 0,
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "unchangedCount" INTEGER NOT NULL DEFAULT 0,
    "closedCount" INTEGER NOT NULL DEFAULT 0,
    "reopenedCount" INTEGER NOT NULL DEFAULT 0,
    "errorsJson" JSONB,
    "schemaJson" JSONB,

    CONSTRAINT "GrantSyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GrantChange" (
    "id" TEXT NOT NULL,
    "grantId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "oldHash" TEXT,
    "newHash" TEXT,
    "diffJson" JSONB,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrantChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GrantChange_grantId_observedAt_idx" ON "public"."GrantChange"("grantId", "observedAt");

-- CreateIndex
CREATE INDEX "GrantChange_runId_idx" ON "public"."GrantChange"("runId");

-- AddForeignKey
ALTER TABLE "public"."GrantChange" ADD CONSTRAINT "GrantChange_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES "public"."Grant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GrantChange" ADD CONSTRAINT "GrantChange_runId_fkey" FOREIGN KEY ("runId") REFERENCES "public"."GrantSyncRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
