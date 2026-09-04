/*
  Warnings:

  - You are about to drop the column `break_taken` on the `public_certificates` table. All the data in the column will be lost.
  - You are about to drop the column `delivered_at` on the `public_certificates` table. All the data in the column will be lost.
  - You are about to drop the column `delivery_status` on the `public_certificates` table. All the data in the column will be lost.
  - You are about to drop the column `download_count` on the `public_certificates` table. All the data in the column will be lost.
  - You are about to drop the column `duration` on the `public_certificates` table. All the data in the column will be lost.
  - You are about to drop the column `issue_date_text` on the `public_certificates` table. All the data in the column will be lost.
  - You are about to drop the column `last_downloaded_at` on the `public_certificates` table. All the data in the column will be lost.
  - You are about to drop the column `mail_address` on the `public_certificates` table. All the data in the column will be lost.
  - You are about to drop the column `mobile_no` on the `public_certificates` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `public_certificates` table. All the data in the column will be lost.
  - You are about to drop the column `source_label` on the `public_certificates` table. All the data in the column will be lost.
  - You are about to drop the column `upload_error` on the `public_certificates` table. All the data in the column will be lost.
  - You are about to drop the column `upload_status` on the `public_certificates` table. All the data in the column will be lost.
  - Made the column `certificate_url` on table `public_certificates` required. This step will fail if there are existing NULL values in that column.
  - Made the column `certificate_r2_key` on table `public_certificates` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "CertRepoUploadStatus" AS ENUM ('PENDING', 'UPLOADED', 'FAILED');

-- DropIndex
DROP INDEX "public_certificates_upload_status_idx";

-- AlterTable
ALTER TABLE "public_certificates" DROP COLUMN "break_taken",
DROP COLUMN "delivered_at",
DROP COLUMN "delivery_status",
DROP COLUMN "download_count",
DROP COLUMN "duration",
DROP COLUMN "issue_date_text",
DROP COLUMN "last_downloaded_at",
DROP COLUMN "mail_address",
DROP COLUMN "mobile_no",
DROP COLUMN "name",
DROP COLUMN "source_label",
DROP COLUMN "upload_error",
DROP COLUMN "upload_status",
ALTER COLUMN "certificate_url" SET NOT NULL,
ALTER COLUMN "certificate_r2_key" SET NOT NULL;

-- DropEnum
DROP TYPE "PublicCertUploadStatus";

-- CreateTable
CREATE TABLE "certificate_repo_entries" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "offer_id" TEXT NOT NULL,
    "certificate_url" TEXT,
    "certificate_r2_key" TEXT,
    "certificate_file_name" TEXT,
    "certificate_mime_type" TEXT,
    "certificate_size" INTEGER,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT,
    "mail_address" TEXT,
    "mobile_no" TEXT,
    "duration" TEXT,
    "issue_date_text" TEXT,
    "delivery_status" TEXT,
    "delivered_at" TIMESTAMP(3),
    "break_taken" TEXT,
    "source_label" TEXT,
    "upload_status" "CertRepoUploadStatus" NOT NULL DEFAULT 'PENDING',
    "upload_error" TEXT,
    "download_count" INTEGER NOT NULL DEFAULT 0,
    "last_downloaded_at" TIMESTAMP(3),

    CONSTRAINT "certificate_repo_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "certificate_repo_entries_offer_id_key" ON "certificate_repo_entries"("offer_id");

-- CreateIndex
CREATE UNIQUE INDEX "certificate_repo_entries_certificate_r2_key_key" ON "certificate_repo_entries"("certificate_r2_key");

-- CreateIndex
CREATE INDEX "certificate_repo_entries_email_idx" ON "certificate_repo_entries"("email");

-- CreateIndex
CREATE INDEX "certificate_repo_entries_offer_id_idx" ON "certificate_repo_entries"("offer_id");

-- CreateIndex
CREATE INDEX "certificate_repo_entries_upload_status_idx" ON "certificate_repo_entries"("upload_status");
