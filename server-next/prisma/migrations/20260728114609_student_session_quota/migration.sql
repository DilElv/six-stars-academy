-- AlterTable
ALTER TABLE "students" ADD COLUMN     "sessionsUsed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalSessions" INTEGER;
