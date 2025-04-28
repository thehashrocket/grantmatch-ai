-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('QUEUED', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "GrantImportRun" (
    "id" TEXT NOT NULL,
    "dateStart" TIMESTAMP(3) NOT NULL,
    "dateEnd" TIMESTAMP(3) NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'QUEUED',
    "errorMessage" TEXT,
    "requestedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrantImportRun_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "GrantImportRun" ADD CONSTRAINT "GrantImportRun_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
