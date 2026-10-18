-- Verifikasi absensi coach/head coach dihapus (absen harian & absen event).
-- Absen masuk/pulang yang masih 'pending' langsung dianggap sah ('approved')
-- supaya langsung masuk laporan (foto + timestamp) dan payroll tanpa perlu
-- disetujui admin. Baris yang sudah 'rejected' dibiarkan apa adanya — admin
-- masih bisa menolak manual lewat `PUT /:id/reject` bila selfie terbukti palsu.

UPDATE "staff_attendances"
SET "verifyStatus" = 'approved',
    "verifiedAt" = COALESCE("verifiedAt", "checkInTime")
WHERE "verifyStatus" = 'pending';

UPDATE "staff_attendances"
SET "checkOutVerifyStatus" = 'approved',
    "checkOutVerifiedAt" = COALESCE("checkOutVerifiedAt", "checkOutTime")
WHERE "checkOutVerifyStatus" = 'pending';

UPDATE "event_staff_attendances"
SET "verifyStatus" = 'approved',
    "verifiedAt" = COALESCE("verifiedAt", "checkInTime")
WHERE "verifyStatus" = 'pending';

UPDATE "event_staff_attendances"
SET "checkOutVerifyStatus" = 'approved',
    "checkOutVerifiedAt" = COALESCE("checkOutVerifiedAt", "checkOutTime")
WHERE "checkOutVerifyStatus" = 'pending';
