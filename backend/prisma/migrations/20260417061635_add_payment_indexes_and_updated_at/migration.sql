/*
  Warnings:

  - Added the required column `updated_at` to the `payments` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable: add updated_at with a default for existing rows, then make it auto-update via trigger
ALTER TABLE "payments" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT NOW();
-- Remove the column default so Prisma manages it at the ORM level
ALTER TABLE "payments" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "orders_payu_txn_id_idx" ON "orders"("payu_txn_id");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");
