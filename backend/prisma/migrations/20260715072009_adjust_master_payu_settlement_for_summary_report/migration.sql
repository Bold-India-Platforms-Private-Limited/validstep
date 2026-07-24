-- AlterTable
ALTER TABLE "master_payu_settlements" ADD COLUMN     "adjustment_amount" DECIMAL(12,2),
ADD COLUMN     "chargeback_amount" DECIMAL(12,2),
ADD COLUMN     "refund_amount" DECIMAL(12,2),
ADD COLUMN     "settled_amount" DECIMAL(12,2),
ADD COLUMN     "settlement_id" TEXT,
ADD COLUMN     "transactions_count" INTEGER,
ADD COLUMN     "txns_amount" DECIMAL(12,2),
ALTER COLUMN "merchant_txn_id" DROP NOT NULL,
ALTER COLUMN "requested_action" DROP NOT NULL;
