/*
  Warnings:

  - A unique constraint covering the columns `[source,number]` on the table `Grant` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[source,sourceRecordId]` on the table `Grant` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[source,sourceKey]` on the table `Grant` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."Grant_number_key";

-- AlterTable
ALTER TABLE "public"."Grant" ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "contentHash" TEXT,
ADD COLUMN     "lastSeenAt" TIMESTAMP(3),
ADD COLUMN     "sourceKey" TEXT,
ADD COLUMN     "sourceRecordId" TEXT,
ADD COLUMN     "status" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Grant_source_number_key" ON "public"."Grant"("source", "number");

-- CreateIndex
CREATE UNIQUE INDEX "Grant_source_sourceRecordId_key" ON "public"."Grant"("source", "sourceRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "Grant_source_sourceKey_key" ON "public"."Grant"("source", "sourceKey");
