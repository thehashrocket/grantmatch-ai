-- CreateEnum
CREATE TYPE "GrantDeadlineType" AS ENUM ('CLOSED', 'FIXED', 'ONGOING', 'ROLLING', 'TBD', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "GrantOpenDateType" AS ENUM ('CLOSED', 'FIXED', 'ONGOING', 'ROLLING', 'TBD', 'UNKNOWN');

-- AlterTable
ALTER TABLE "Grant" ADD COLUMN     "deadlineType" "GrantDeadlineType",
ADD COLUMN     "openDateType" "GrantOpenDateType",
ALTER COLUMN "deadline" DROP NOT NULL,
ALTER COLUMN "openDate" DROP NOT NULL;
