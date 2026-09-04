-- CreateEnum
CREATE TYPE "PublicCertUploadStatus" AS ENUM ('PENDING', 'UPLOADED', 'FAILED');

-- AlterTable
ALTER TABLE "public_certificates" ADD COLUMN     "break_taken" TEXT,
ADD COLUMN     "delivered_at" TIMESTAMP(3),
ADD COLUMN     "delivery_status" TEXT,
ADD COLUMN     "download_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "duration" TEXT,
ADD COLUMN     "issue_date_text" TEXT,
ADD COLUMN     "last_downloaded_at" TIMESTAMP(3),
ADD COLUMN     "mail_address" TEXT,
ADD COLUMN     "mobile_no" TEXT,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "source_label" TEXT,
ADD COLUMN     "upload_error" TEXT,
ADD COLUMN     "upload_status" "PublicCertUploadStatus" NOT NULL DEFAULT 'PENDING',
ALTER COLUMN "certificate_url" DROP NOT NULL,
ALTER COLUMN "certificate_r2_key" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "public_certificates_upload_status_idx" ON "public_certificates"("upload_status");
