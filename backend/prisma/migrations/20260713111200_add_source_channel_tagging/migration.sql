-- CreateEnum
CREATE TYPE "TransactionChannel" AS ENUM ('VALIDSTEP', 'PAYU_BUTTON', 'OTHER');

-- AlterTable
ALTER TABLE "payu_settlements" ADD COLUMN     "source_channel" "TransactionChannel" NOT NULL DEFAULT 'OTHER';

-- AlterTable
ALTER TABLE "payu_transactions" ADD COLUMN     "source_channel" "TransactionChannel" NOT NULL DEFAULT 'OTHER';
