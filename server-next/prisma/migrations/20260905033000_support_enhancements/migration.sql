ALTER TABLE "students"
ADD COLUMN "sessionMonth" INTEGER,
ADD COLUMN "sessionYear" INTEGER;

ALTER TABLE "payments" ADD COLUMN "effectsAppliedAt" TIMESTAMP(3);

UPDATE "payments"
SET "effectsAppliedAt" = COALESCE("paidAt", "updatedAt")
WHERE "status" = 'success';

CREATE TABLE "event_staff_attendances" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "branchId" TEXT,
  "date" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'hadir',
  "checkInTime" TIMESTAMP(3),
  "photo" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "locationName" TEXT,
  "verifyStatus" TEXT NOT NULL DEFAULT 'pending',
  "verifiedById" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "rejectReason" TEXT,
  "checkOutTime" TIMESTAMP(3),
  "checkOutPhoto" TEXT,
  "checkOutLatitude" DOUBLE PRECISION,
  "checkOutLongitude" DOUBLE PRECISION,
  "checkOutLocationName" TEXT,
  "checkOutVerifyStatus" TEXT,
  "checkOutVerifiedById" TEXT,
  "checkOutVerifiedAt" TIMESTAMP(3),
  "checkOutRejectReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "event_staff_attendances_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "event_staff_attendances_eventId_userId_key"
ON "event_staff_attendances"("eventId", "userId");

ALTER TABLE "event_staff_attendances" ADD CONSTRAINT "event_staff_attendances_eventId_fkey"
FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_staff_attendances" ADD CONSTRAINT "event_staff_attendances_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_staff_attendances" ADD CONSTRAINT "event_staff_attendances_branchId_fkey"
FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "event_staff_attendances" ADD CONSTRAINT "event_staff_attendances_verifiedById_fkey"
FOREIGN KEY ("verifiedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "event_staff_attendances" ADD CONSTRAINT "event_staff_attendances_checkOutVerifiedById_fkey"
FOREIGN KEY ("checkOutVerifiedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
