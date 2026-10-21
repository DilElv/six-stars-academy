-- Jam mulai/selesai event, coach bertugas per jadwal latihan, dan tautan
-- jadwal latihan -> sesi absensi coach.

-- AlterTable
ALTER TABLE "events" ADD COLUMN "startTime" TEXT, ADD COLUMN "endTime" TEXT;

-- AlterTable
ALTER TABLE "coach_attendance_sessions" ADD COLUMN "scheduleId" TEXT, ADD COLUMN "windowManual" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "schedule_coaches" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schedule_coaches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "coach_attendance_sessions_scheduleId_key" ON "coach_attendance_sessions"("scheduleId");

-- CreateIndex
CREATE INDEX "schedule_coaches_userId_idx" ON "schedule_coaches"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_coaches_scheduleId_userId_key" ON "schedule_coaches"("scheduleId", "userId");

-- AddForeignKey
ALTER TABLE "coach_attendance_sessions" ADD CONSTRAINT "coach_attendance_sessions_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_coaches" ADD CONSTRAINT "schedule_coaches_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_coaches" ADD CONSTRAINT "schedule_coaches_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
