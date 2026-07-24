-- AlterTable
ALTER TABLE "payu_settlements" ADD COLUMN     "priority_settlement_fee" DECIMAL(12,2),
ADD COLUMN     "priority_settlement_tax" DECIMAL(12,2);
