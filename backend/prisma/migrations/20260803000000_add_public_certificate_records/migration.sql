-- CreateTable
CREATE TABLE "public_certificates" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "offer_id" TEXT NOT NULL,
    "certificate_url" TEXT NOT NULL,
    "certificate_r2_key" TEXT NOT NULL,
    "certificate_file_name" TEXT,
    "certificate_mime_type" TEXT,
    "certificate_size" INTEGER,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "public_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "public_certificates_certificate_r2_key_key" ON "public_certificates"("certificate_r2_key");

-- CreateIndex
CREATE INDEX "public_certificates_email_idx" ON "public_certificates"("email");

-- CreateIndex
CREATE INDEX "public_certificates_offer_id_idx" ON "public_certificates"("offer_id");

-- CreateIndex
CREATE UNIQUE INDEX "public_certificates_offer_id_key" ON "public_certificates"("offer_id");
