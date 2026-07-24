-- AlterTable
ALTER TABLE "batches" ADD COLUMN     "certificate_delivery_date" TIMESTAMP(3),
ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "payu_transactions" ADD COLUMN     "order_id" TEXT;

-- CreateTable
CREATE TABLE "delivery_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "order_id" TEXT,
    "event" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "delivery_events_user_id_idx" ON "delivery_events"("user_id");

-- CreateIndex
CREATE INDEX "delivery_events_order_id_idx" ON "delivery_events"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "payu_transactions_order_id_key" ON "payu_transactions"("order_id");

-- AddForeignKey
ALTER TABLE "delivery_events" ADD CONSTRAINT "delivery_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_events" ADD CONSTRAINT "delivery_events_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payu_transactions" ADD CONSTRAINT "payu_transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

