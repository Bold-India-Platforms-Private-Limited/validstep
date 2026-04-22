-- AlterEnum: Add HOLD value to BatchStatus
-- Cannot use ALTER TYPE inside a transaction in PostgreSQL, so this runs outside.
ALTER TYPE "BatchStatus" ADD VALUE IF NOT EXISTS 'HOLD';
