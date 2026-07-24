-- CreateEnum
CREATE TYPE "AccountingImportType" AS ENUM ('TRANSACTION_REPORT', 'SETTLEMENT_REPORT', 'BANK_STATEMENT');

-- CreateEnum
CREATE TYPE "BankMatchStatus" AS ENUM ('UNMATCHED', 'MATCHED_EXACT', 'MATCHED_AMOUNT_DATE', 'IGNORED');

-- CreateTable
CREATE TABLE "accounting_imports" (
    "id" TEXT NOT NULL,
    "type" "AccountingImportType" NOT NULL,
    "original_filename" TEXT NOT NULL,
    "stored_path" TEXT NOT NULL,
    "row_count" INTEGER NOT NULL DEFAULT 0,
    "period_label" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploaded_by" TEXT,

    CONSTRAINT "accounting_imports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payu_transactions" (
    "id" TEXT NOT NULL,
    "txnid" TEXT NOT NULL,
    "payu_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "addedon" TIMESTAMP(3),
    "success_at" TIMESTAMP(3),
    "amount" DECIMAL(12,2),
    "productinfo" TEXT,
    "firstname" TEXT,
    "lastname" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "bank_name" TEXT,
    "mode" TEXT,
    "error_code" TEXT,
    "error_message" TEXT,
    "transaction_fee" DECIMAL(12,2),
    "service_fees" DECIMAL(12,2),
    "convenience_fee" DECIMAL(12,2),
    "tsp_charges" DECIMAL(12,2),
    "mer_service_fee" DECIMAL(12,2),
    "cgst" DECIMAL(12,2),
    "sgst" DECIMAL(12,2),
    "igst" DECIMAL(12,2),
    "settlement_amount" DECIMAL(12,2),
    "settlement_date" TIMESTAMP(3),
    "utr" TEXT,
    "recon_ref_number" TEXT,
    "category" TEXT,
    "sub_category" TEXT,
    "raw" JSONB NOT NULL,
    "import_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payu_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payu_settlements" (
    "id" TEXT NOT NULL,
    "settlement_key" TEXT NOT NULL,
    "merchant_txn_id" TEXT NOT NULL,
    "requested_action" TEXT NOT NULL,
    "recon_ref_number" TEXT,
    "payu_id" TEXT,
    "merchant_utr" TEXT,
    "bank_reference_no" TEXT,
    "bank_arn" TEXT,
    "amount" DECIMAL(12,2),
    "net_amount" DECIMAL(12,2),
    "amount_net_signed" DECIMAL(12,2),
    "status" TEXT,
    "settlement_date" TIMESTAMP(3),
    "added_on" TIMESTAMP(3),
    "succeed_on" TIMESTAMP(3),
    "service_tax" DECIMAL(12,2),
    "cgst" DECIMAL(12,2),
    "sgst" DECIMAL(12,2),
    "igst" DECIMAL(12,2),
    "total_processing_fees" DECIMAL(12,2),
    "total_service_tax" DECIMAL(12,2),
    "bank_match_status" "BankMatchStatus" NOT NULL DEFAULT 'UNMATCHED',
    "bank_transaction_id" TEXT,
    "raw" JSONB NOT NULL,
    "import_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payu_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_transactions" (
    "id" TEXT NOT NULL,
    "txn_date" TIMESTAMP(3) NOT NULL,
    "narration" TEXT NOT NULL,
    "ref_no" TEXT,
    "value_date" TIMESTAMP(3),
    "withdrawal_amt" DECIMAL(12,2),
    "deposit_amt" DECIMAL(12,2),
    "closing_balance" DECIMAL(12,2),
    "match_status" "BankMatchStatus" NOT NULL DEFAULT 'UNMATCHED',
    "import_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_fee_statements" (
    "id" TEXT NOT NULL,
    "statement_number" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "gross_amount" DECIMAL(14,2) NOT NULL,
    "refund_amount" DECIMAL(14,2) NOT NULL,
    "payu_fee_amount" DECIMAL(14,2) NOT NULL,
    "cgst" DECIMAL(14,2) NOT NULL,
    "sgst" DECIMAL(14,2) NOT NULL,
    "igst" DECIMAL(14,2) NOT NULL,
    "net_settled_amount" DECIMAL(14,2) NOT NULL,
    "transaction_count" INTEGER NOT NULL,
    "pdf_path" TEXT,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_fee_statements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "accounting_imports_type_idx" ON "accounting_imports"("type");

-- CreateIndex
CREATE UNIQUE INDEX "payu_transactions_payu_id_key" ON "payu_transactions"("payu_id");

-- CreateIndex
CREATE INDEX "payu_transactions_txnid_idx" ON "payu_transactions"("txnid");

-- CreateIndex
CREATE INDEX "payu_transactions_status_idx" ON "payu_transactions"("status");

-- CreateIndex
CREATE INDEX "payu_transactions_addedon_idx" ON "payu_transactions"("addedon");

-- CreateIndex
CREATE INDEX "payu_transactions_settlement_date_idx" ON "payu_transactions"("settlement_date");

-- CreateIndex
CREATE INDEX "payu_transactions_utr_idx" ON "payu_transactions"("utr");

-- CreateIndex
CREATE INDEX "payu_transactions_import_id_idx" ON "payu_transactions"("import_id");

-- CreateIndex
CREATE UNIQUE INDEX "payu_settlements_settlement_key_key" ON "payu_settlements"("settlement_key");

-- CreateIndex
CREATE INDEX "payu_settlements_merchant_txn_id_idx" ON "payu_settlements"("merchant_txn_id");

-- CreateIndex
CREATE INDEX "payu_settlements_settlement_date_idx" ON "payu_settlements"("settlement_date");

-- CreateIndex
CREATE INDEX "payu_settlements_merchant_utr_idx" ON "payu_settlements"("merchant_utr");

-- CreateIndex
CREATE INDEX "payu_settlements_bank_match_status_idx" ON "payu_settlements"("bank_match_status");

-- CreateIndex
CREATE INDEX "payu_settlements_import_id_idx" ON "payu_settlements"("import_id");

-- CreateIndex
CREATE INDEX "bank_transactions_txn_date_idx" ON "bank_transactions"("txn_date");

-- CreateIndex
CREATE INDEX "bank_transactions_ref_no_idx" ON "bank_transactions"("ref_no");

-- CreateIndex
CREATE INDEX "bank_transactions_match_status_idx" ON "bank_transactions"("match_status");

-- CreateIndex
CREATE INDEX "bank_transactions_import_id_idx" ON "bank_transactions"("import_id");

-- CreateIndex
CREATE UNIQUE INDEX "bank_transactions_txn_date_ref_no_withdrawal_amt_deposit_am_key" ON "bank_transactions"("txn_date", "ref_no", "withdrawal_amt", "deposit_amt", "closing_balance");

-- CreateIndex
CREATE UNIQUE INDEX "platform_fee_statements_statement_number_key" ON "platform_fee_statements"("statement_number");

-- AddForeignKey
ALTER TABLE "payu_transactions" ADD CONSTRAINT "payu_transactions_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "accounting_imports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payu_settlements" ADD CONSTRAINT "payu_settlements_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "accounting_imports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payu_settlements" ADD CONSTRAINT "payu_settlements_bank_transaction_id_fkey" FOREIGN KEY ("bank_transaction_id") REFERENCES "bank_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "accounting_imports"("id") ON DELETE SET NULL ON UPDATE CASCADE;
