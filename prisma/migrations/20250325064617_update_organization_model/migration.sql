/*
  Warnings:

  - You are about to drop the column `description` on the `Organization` table. All the data in the column will be lost.
  - Added the required column `location` to the `Organization` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mission` to the `Organization` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Organization" DROP COLUMN "description",
ADD COLUMN     "focusAreas" TEXT[],
ADD COLUMN     "location" TEXT NOT NULL,
ADD COLUMN     "mission" TEXT NOT NULL;
