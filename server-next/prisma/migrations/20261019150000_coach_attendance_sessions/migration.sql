-- Absensi Coach berbasis sesi (latihan / event / tournament):
-- satu jadwal per sesi dengan jam buka-tutup absen masuk dan batas absen pulang.
-- Absensi coach kini terpisah per sesi (StaffAttendance.sessionId), sementara
-- absensi lama & absensi head coach tetap boleh tanpa sessionId.

-- CreateTable
CREATE TABLE "coach_attendance_sessions" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "branchId" TEXT,
    "coachId" TEXT,
    "trainingSessionId" TEXT,
    "eventId" TEXT,
    "checkInOpen" TEXT NOT NULL DEFAULT '00:00',
    "checkInClose" TEXT NOT NULL DEFAULT '23:59',
    "checkOutClose" TEXT NOT NULL DEFAULT '23:59',
    "status" TEXT NOT NULL DEFAULT 'active',
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coach_attendance_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "coach_attendance_sessions_trainingSessionId_key" ON "coach_attendance_sessions"("trainingSessionId");

-- CreateIndex
CREATE INDEX "coach_attendance_sessions_date_branchId_idx" ON "coach_attendance_sessions"("date", "branchId");

-- CreateIndex
CREATE INDEX "coach_attendance_sessions_eventId_idx" ON "coach_attendance_sessions"("eventId");

-- AlterTable
ALTER TABLE "staff_attendances" ADD COLUMN "sessionId" TEXT;

-- DropIndex (satu hari dulu hanya boleh satu absen; sekarang satu absen per sesi)
DROP INDEX IF EXISTS "staff_attendances_userId_date_branchId_key";

-- CreateIndex
CREATE UNIQUE INDEX "staff_attendances_userId_sessionId_key" ON "staff_attendances"("userId", "sessionId");

-- CreateIndex
CREATE INDEX "staff_attendances_date_idx" ON "staff_attendances"("date");

-- AddForeignKey
ALTER TABLE "coach_attendance_sessions" ADD CONSTRAINT "coach_attendance_sessions_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_attendance_sessions" ADD CONSTRAINT "coach_attendance_sessions_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_attendance_sessions" ADD CONSTRAINT "coach_attendance_sessions_trainingSessionId_fkey" FOREIGN KEY ("trainingSessionId") REFERENCES "training_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_attendance_sessions" ADD CONSTRAINT "coach_attendance_sessions_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_attendance_sessions" ADD CONSTRAINT "coach_attendance_sessions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_attendances" ADD CONSTRAINT "staff_attendances_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "coach_attendance_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
