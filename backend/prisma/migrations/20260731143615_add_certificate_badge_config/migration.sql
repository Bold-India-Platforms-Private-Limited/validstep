-- CreateTable
CREATE TABLE "certificate_badge_configs" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "x" DOUBLE PRECISION NOT NULL DEFAULT 3,
    "y" DOUBLE PRECISION NOT NULL DEFAULT 96,
    "scale" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certificate_badge_configs_pkey" PRIMARY KEY ("id")
);
