-- AlterTable: Add custom layout fields to certificate_templates
ALTER TABLE "certificate_templates"
  ADD COLUMN IF NOT EXISTS "background_image_url" TEXT,
  ADD COLUMN IF NOT EXISTS "layout_config" JSONB;
