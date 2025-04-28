/*
  Warnings:

  - A unique constraint covering the columns `[portalId]` on the table `Grant` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Grant_portalId_key" ON "Grant"("portalId");
