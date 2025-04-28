/*
  Warnings:

  - Added the required column `title` to the `Grant` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Grant" ADD COLUMN     "title" TEXT NOT NULL;
