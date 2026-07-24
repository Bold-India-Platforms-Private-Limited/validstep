-- CreateEnum
CREATE TYPE "LedgerCategoryType" AS ENUM ('REVENUE', 'EXPENSE', 'TRANSFER', 'TAX', 'REFUND', 'OTHER');

-- CreateEnum
CREATE TYPE "RuleMatchType" AS ENUM ('CONTAINS', 'STARTS_WITH', 'REGEX');

-- CreateEnum
CREATE TYPE "MasterFileType" AS ENUM ('PAYU_TRANSACTION_REPORT', 'PAYU_SETTLEMENT_REPORT', 'RAZORPAY_PAYMENT_REPORT', 'RAZORPAY_SETTLEMENT_REPORT', 'BANK_STATEMENT');

-- CreateTable
CREATE TABLE "master_brands" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "master_brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_payment_gateway_accounts" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "master_payment_gateway_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_bank_accounts" (
    "id" TEXT NOT NULL,
    "bank_name" TEXT NOT NULL,
    "account_no_masked" TEXT NOT NULL,
    "ifsc" TEXT,
    "nickname" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "master_bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_ledger_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "LedgerCategoryType" NOT NULL,
    "brand_id" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "master_ledger_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_ledger_classification_rules" (
    "id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "match_type" "RuleMatchType" NOT NULL,
    "pattern" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "master_ledger_classification_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_bank_transactions" (
    "id" TEXT NOT NULL,
    "bank_account_id" TEXT NOT NULL,
    "txn_date" TIMESTAMP(3) NOT NULL,
    "narration" TEXT NOT NULL,
    "ref_no" TEXT,
    "value_date" TIMESTAMP(3),
    "withdrawal_amt" DECIMAL(14,2),
    "deposit_amt" DECIMAL(14,2),
    "closing_balance" DECIMAL(14,2),
    "category_id" TEXT,
    "brand_id" TEXT,
    "matched_rule_id" TEXT,
    "is_manual_entry" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "import_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "master_bank_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_razorpay_payments" (
    "id" TEXT NOT NULL,
    "razorpay_id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2),
    "currency" TEXT,
    "status" TEXT NOT NULL,
    "order_id" TEXT,
    "method" TEXT,
    "fee" DECIMAL(12,2),
    "tax" DECIMAL(12,2),
    "amount_refunded" DECIMAL(12,2),
    "refund_status" TEXT,
    "email" TEXT,
    "contact" TEXT,
    "description" TEXT,
    "bank" TEXT,
    "created_at_source" TIMESTAMP(3),
    "raw" JSONB NOT NULL,
    "import_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "master_razorpay_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_razorpay_settlements" (
    "id" TEXT NOT NULL,
    "settlement_id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "amount" DECIMAL(14,2),
    "status" TEXT,
    "fees" DECIMAL(12,2),
    "tax" DECIMAL(12,2),
    "utr" TEXT,
    "additional_utr" TEXT,
    "created_at_source" TIMESTAMP(3),
    "bank_match_status" "BankMatchStatus" NOT NULL DEFAULT 'UNMATCHED',
    "bank_transaction_id" TEXT,
    "raw" JSONB NOT NULL,
    "import_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "master_razorpay_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_source_file_archives" (
    "id" TEXT NOT NULL,
    "file_type" "MasterFileType" NOT NULL,
    "brand_id" TEXT,
    "gateway_id" TEXT,
    "bank_account_id" TEXT,
    "original_filename" TEXT NOT NULL,
    "stored_path" TEXT NOT NULL,
    "sha256_checksum" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "period_label" TEXT,
    "row_count" INTEGER NOT NULL DEFAULT 0,
    "uploaded_by" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "master_source_file_archives_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "master_brands_code_key" ON "master_brands"("code");

-- CreateIndex
CREATE UNIQUE INDEX "master_payment_gateway_accounts_code_key" ON "master_payment_gateway_accounts"("code");

-- CreateIndex
CREATE UNIQUE INDEX "master_ledger_categories_name_key" ON "master_ledger_categories"("name");

-- CreateIndex
CREATE INDEX "master_ledger_classification_rules_is_active_idx" ON "master_ledger_classification_rules"("is_active");

-- CreateIndex
CREATE INDEX "master_bank_transactions_txn_date_idx" ON "master_bank_transactions"("txn_date");

-- CreateIndex
CREATE INDEX "master_bank_transactions_ref_no_idx" ON "master_bank_transactions"("ref_no");

-- CreateIndex
CREATE INDEX "master_bank_transactions_category_id_idx" ON "master_bank_transactions"("category_id");

-- CreateIndex
CREATE INDEX "master_bank_transactions_brand_id_idx" ON "master_bank_transactions"("brand_id");

-- CreateIndex
CREATE UNIQUE INDEX "master_razorpay_payments_razorpay_id_key" ON "master_razorpay_payments"("razorpay_id");

-- CreateIndex
CREATE INDEX "master_razorpay_payments_status_idx" ON "master_razorpay_payments"("status");

-- CreateIndex
CREATE INDEX "master_razorpay_payments_created_at_source_idx" ON "master_razorpay_payments"("created_at_source");

-- CreateIndex
CREATE UNIQUE INDEX "master_razorpay_settlements_settlement_id_key" ON "master_razorpay_settlements"("settlement_id");

-- CreateIndex
CREATE INDEX "master_razorpay_settlements_utr_idx" ON "master_razorpay_settlements"("utr");

-- CreateIndex
CREATE INDEX "master_razorpay_settlements_bank_match_status_idx" ON "master_razorpay_settlements"("bank_match_status");

-- CreateIndex
CREATE INDEX "master_source_file_archives_file_type_idx" ON "master_source_file_archives"("file_type");

-- AddForeignKey
ALTER TABLE "master_payment_gateway_accounts" ADD CONSTRAINT "master_payment_gateway_accounts_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "master_brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_ledger_categories" ADD CONSTRAINT "master_ledger_categories_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "master_brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_ledger_classification_rules" ADD CONSTRAINT "master_ledger_classification_rules_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "master_ledger_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_bank_transactions" ADD CONSTRAINT "master_bank_transactions_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "master_bank_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_bank_transactions" ADD CONSTRAINT "master_bank_transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "master_ledger_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_bank_transactions" ADD CONSTRAINT "master_bank_transactions_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "master_brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_bank_transactions" ADD CONSTRAINT "master_bank_transactions_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "master_source_file_archives"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_razorpay_payments" ADD CONSTRAINT "master_razorpay_payments_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "master_brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_razorpay_payments" ADD CONSTRAINT "master_razorpay_payments_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "master_source_file_archives"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_razorpay_settlements" ADD CONSTRAINT "master_razorpay_settlements_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "master_brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_razorpay_settlements" ADD CONSTRAINT "master_razorpay_settlements_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "master_source_file_archives"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_source_file_archives" ADD CONSTRAINT "master_source_file_archives_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "master_brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_source_file_archives" ADD CONSTRAINT "master_source_file_archives_gateway_id_fkey" FOREIGN KEY ("gateway_id") REFERENCES "master_payment_gateway_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_source_file_archives" ADD CONSTRAINT "master_source_file_archives_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "master_bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
