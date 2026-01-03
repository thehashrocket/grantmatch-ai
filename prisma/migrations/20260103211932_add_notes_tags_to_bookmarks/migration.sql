-- AlterTable
ALTER TABLE "GrantBookmark" ADD COLUMN     "note" TEXT,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
