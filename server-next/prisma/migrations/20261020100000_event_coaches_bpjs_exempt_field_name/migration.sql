-- Coach bertugas per sesi absensi (banyak coach), pengecualian BPJS per anak,
-- dan nama lapangan manual pada sesi latihan.

-- AlterTable
ALTER TABLE "students" ADD COLUMN "bpjsExempt" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "training_sessions" ADD COLUMN "fieldName" TEXT;

-- CreateTable
CREATE TABLE "coach_attendance_session_coaches" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coach_attendance_session_coaches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "coach_attendance_session_coaches_userId_idx" ON "coach_attendance_session_coaches"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "coach_attendance_session_coaches_sessionId_userId_key" ON "coach_attendance_session_coaches"("sessionId", "userId");

-- AddForeignKey
ALTER TABLE "coach_attendance_session_coaches" ADD CONSTRAINT "coach_attendance_session_coaches_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "coach_attendance_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_attendance_session_coaches" ADD CONSTRAINT "coach_attendance_session_coaches_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
