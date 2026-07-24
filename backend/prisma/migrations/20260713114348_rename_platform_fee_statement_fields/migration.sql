/*
  Warnings:

  - You are about to drop the column `cgst` on the `platform_fee_statements` table. All the data in the column will be lost.
  - You are about to drop the column `igst` on the `platform_fee_statements` table. All the data in the column will be lost.
  - You are about to drop the column `net_settled_amount` on the `platform_fee_statements` table. All the data in the column will be lost.
  - You are about to drop the column `payu_fee_amount` on the `platform_fee_statements` table. All the data in the column will be lost.
  - You are about to drop the column `sgst` on the `platform_fee_statements` table. All the data in the column will be lost.
  - Added the required column `daily_platform_fee` to the `platform_fee_statements` table without a default value. This is not possible if the table is not empty.
  - Added the required column `daily_platform_fee_gst` to the `platform_fee_statements` table without a default value. This is not possible if the table is not empty.
  - Added the required column `net_credited_to_bank` to the `platform_fee_statements` table without a default value. This is not possible if the table is not empty.
  - Added the required column `net_revenue` to the `platform_fee_statements` table without a default value. This is not possible if the table is not empty.
  - Added the required column `per_transaction_fee` to the `platform_fee_statements` table without a default value. This is not possible if the table is not empty.
  - Added the required column `per_transaction_gst` to the `platform_fee_statements` table without a default value. This is not possible if the table is not empty.
  - Added the required column `priority_settlement_fee` to the `platform_fee_statements` table without a default value. This is not possible if the table is not empty.
  - Added the required column `priority_settlement_gst` to the `platform_fee_statements` table without a default value. This is not possible if the table is not empty.
  - Added the required column `reconciliation_variance` to the `platform_fee_statements` table without a default value. This is not possible if the table is not empty.
  - Added the required column `total_fee_amount` to the `platform_fee_statements` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "platform_fee_statements" DROP COLUMN "cgst",
DROP COLUMN "igst",
DROP COLUMN "net_settled_amount",
DROP COLUMN "payu_fee_amount",
DROP COLUMN "sgst",
ADD COLUMN     "daily_platform_fee" DECIMAL(14,2) NOT NULL,
ADD COLUMN     "daily_platform_fee_gst" DECIMAL(14,2) NOT NULL,
ADD COLUMN     "net_credited_to_bank" DECIMAL(14,2) NOT NULL,
ADD COLUMN     "net_revenue" DECIMAL(14,2) NOT NULL,
ADD COLUMN     "per_transaction_fee" DECIMAL(14,2) NOT NULL,
ADD COLUMN     "per_transaction_gst" DECIMAL(14,2) NOT NULL,
ADD COLUMN     "priority_settlement_fee" DECIMAL(14,2) NOT NULL,
ADD COLUMN     "priority_settlement_gst" DECIMAL(14,2) NOT NULL,
ADD COLUMN     "reconciliation_variance" DECIMAL(14,2) NOT NULL,
ADD COLUMN     "total_fee_amount" DECIMAL(14,2) NOT NULL;
