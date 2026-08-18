-- CreateEnum
CREATE TYPE "PresenceStatus" AS ENUM ('AVAILABLE', 'BUSY', 'BE_RIGHT_BACK');

-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "checkOutTime" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "WorkspaceMember" ADD COLUMN     "status" "PresenceStatus" NOT NULL DEFAULT 'AVAILABLE';
