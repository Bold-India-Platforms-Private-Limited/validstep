-- CreateEnum
CREATE TYPE "CertificateSource" AS ENUM ('SYSTEM_GENERATED', 'ADMIN_UPLOADED');

-- AlterTable
ALTER TABLE "certificates" ADD COLUMN     "verification_code" TEXT,
ADD COLUMN     "certificate_source" "CertificateSource" NOT NULL DEFAULT 'SYSTEM_GENERATED';

-- CreateIndex
CREATE UNIQUE INDEX "certificates_verification_code_key" ON "certificates"("verification_code");
