-- CreateTable
CREATE TABLE "customer_queries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "order_id" TEXT,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_queries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_queries_user_id_idx" ON "customer_queries"("user_id");

-- CreateIndex
CREATE INDEX "customer_queries_order_id_idx" ON "customer_queries"("order_id");

-- CreateIndex
CREATE INDEX "customer_queries_status_idx" ON "customer_queries"("status");

-- AddForeignKey
ALTER TABLE "customer_queries" ADD CONSTRAINT "customer_queries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_queries" ADD CONSTRAINT "customer_queries_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

