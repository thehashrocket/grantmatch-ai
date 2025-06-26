/*
  Warnings:

  - A unique constraint covering the columns `[portalId,source]` on the table `Grant` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Grant_portalId_key";

-- CreateIndex
CREATE UNIQUE INDEX "Grant_portalId_source_key" ON "Grant"("portalId", "source");
