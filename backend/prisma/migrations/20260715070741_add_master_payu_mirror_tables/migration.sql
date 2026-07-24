-- CreateTable
CREATE TABLE "master_payu_transactions" (
    "id" TEXT NOT NULL,
    "payu_id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "txnid" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "amount" DECIMAL(12,2),
    "productinfo" TEXT,
    "email" TEXT,
    "mode" TEXT,
    "service_fees" DECIMAL(12,2),
    "convenience_fee" DECIMAL(12,2),
    "cgst" DECIMAL(12,2),
    "sgst" DECIMAL(12,2),
    "igst" DECIMAL(12,2),
    "settlement_amount" DECIMAL(12,2),
    "addedon" TIMESTAMP(3),
    "settlement_date" TIMESTAMP(3),
    "raw" JSONB NOT NULL,
    "import_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "master_payu_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_payu_settlements" (
    "id" TEXT NOT NULL,
    "settlement_key" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "merchant_txn_id" TEXT NOT NULL,
    "requested_action" TEXT NOT NULL,
    "amount_net_signed" DECIMAL(12,2),
    "total_processing_fees" DECIMAL(12,2),
    "total_service_tax" DECIMAL(12,2),
    "merchant_utr" TEXT,
    "settlement_date" TIMESTAMP(3),
    "bank_match_status" "BankMatchStatus" NOT NULL DEFAULT 'UNMATCHED',
    "bank_transaction_id" TEXT,
    "raw" JSONB NOT NULL,
    "import_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "master_payu_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "master_payu_transactions_payu_id_key" ON "master_payu_transactions"("payu_id");

-- CreateIndex
CREATE INDEX "master_payu_transactions_status_idx" ON "master_payu_transactions"("status");

-- CreateIndex
CREATE INDEX "master_payu_transactions_txnid_idx" ON "master_payu_transactions"("txnid");

-- CreateIndex
CREATE INDEX "master_payu_transactions_addedon_idx" ON "master_payu_transactions"("addedon");

-- CreateIndex
CREATE UNIQUE INDEX "master_payu_settlements_settlement_key_key" ON "master_payu_settlements"("settlement_key");

-- CreateIndex
CREATE INDEX "master_payu_settlements_merchant_txn_id_idx" ON "master_payu_settlements"("merchant_txn_id");

-- CreateIndex
CREATE INDEX "master_payu_settlements_merchant_utr_idx" ON "master_payu_settlements"("merchant_utr");

-- CreateIndex
CREATE INDEX "master_payu_settlements_bank_match_status_idx" ON "master_payu_settlements"("bank_match_status");

-- CreateIndex
CREATE INDEX "master_payu_settlements_settlement_date_idx" ON "master_payu_settlements"("settlement_date");

-- AddForeignKey
ALTER TABLE "master_payu_transactions" ADD CONSTRAINT "master_payu_transactions_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "master_brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_payu_transactions" ADD CONSTRAINT "master_payu_transactions_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "master_source_file_archives"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_payu_settlements" ADD CONSTRAINT "master_payu_settlements_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "master_brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_payu_settlements" ADD CONSTRAINT "master_payu_settlements_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "master_source_file_archives"("id") ON DELETE SET NULL ON UPDATE CASCADE;
