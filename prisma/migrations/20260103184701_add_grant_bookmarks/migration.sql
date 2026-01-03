-- CreateEnum
CREATE TYPE "BookmarkStatus" AS ENUM ('INTERESTED', 'APPLIED', 'NOT_FOR_US');

-- CreateTable
CREATE TABLE "GrantBookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "grantId" TEXT NOT NULL,
    "status" "BookmarkStatus" NOT NULL DEFAULT 'INTERESTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrantBookmark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GrantBookmark_userId_createdAt_idx" ON "GrantBookmark"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "GrantBookmark_userId_status_idx" ON "GrantBookmark"("userId", "status");

-- CreateIndex
CREATE INDEX "GrantBookmark_grantId_idx" ON "GrantBookmark"("grantId");

-- CreateIndex
CREATE UNIQUE INDEX "GrantBookmark_userId_grantId_key" ON "GrantBookmark"("userId", "grantId");

-- AddForeignKey
ALTER TABLE "GrantBookmark" ADD CONSTRAINT "GrantBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrantBookmark" ADD CONSTRAINT "GrantBookmark_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES "Grant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
