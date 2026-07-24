-- CreateEnum
CREATE TYPE "PeriodType" AS ENUM ('MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY', 'CUSTOM');

-- AlterTable
ALTER TABLE "master_source_file_archives" ADD COLUMN     "imported_to_ledger" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "period_type" "PeriodType" NOT NULL DEFAULT 'MONTHLY';
