-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "emailSentAt" TIMESTAMP(3),
ADD COLUMN     "recipientCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sentCount" INTEGER NOT NULL DEFAULT 0;
