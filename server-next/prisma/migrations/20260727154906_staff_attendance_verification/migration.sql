-- AlterTable
ALTER TABLE "staff_attendances" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "locationName" TEXT,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "photo" TEXT,
ADD COLUMN     "rejectReason" TEXT,
ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedById" TEXT,
ADD COLUMN     "verifyStatus" TEXT NOT NULL DEFAULT 'pending';

-- AddForeignKey
ALTER TABLE "staff_attendances" ADD CONSTRAINT "staff_attendances_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
