-- CreateEnum
CREATE TYPE "TaskCategory" AS ENUM ('TASK', 'FEATURE', 'BUG', 'IMPROVEMENT');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "category" "TaskCategory" NOT NULL DEFAULT 'TASK';
