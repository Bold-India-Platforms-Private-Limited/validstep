-- CreateTable
CREATE TABLE "master_customer_invoice_numbers" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "gateway" TEXT NOT NULL,
    "gateway_txn_id" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "invoice_no" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "master_customer_invoice_numbers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "master_customer_invoice_numbers_brand_gateway_gateway_txn_i_key" ON "master_customer_invoice_numbers"("brand", "gateway", "gateway_txn_id");

-- CreateIndex
CREATE UNIQUE INDEX "master_customer_invoice_numbers_brand_seq_key" ON "master_customer_invoice_numbers"("brand", "seq");
