-- Little Maverick (U-8 and under, non-GK) assessment columns
ALTER TABLE "assessments" ADD COLUMN "lmAgility" INTEGER;
ALTER TABLE "assessments" ADD COLUMN "lmSpeed" INTEGER;
ALTER TABLE "assessments" ADD COLUMN "lmStrength" INTEGER;
ALTER TABLE "assessments" ADD COLUMN "lmCoordination" INTEGER;
ALTER TABLE "assessments" ADD COLUMN "lmDribbling" INTEGER;
ALTER TABLE "assessments" ADD COLUMN "lmPassing" INTEGER;
ALTER TABLE "assessments" ADD COLUMN "lmShooting" INTEGER;
ALTER TABLE "assessments" ADD COLUMN "lmBallControl" INTEGER;
ALTER TABLE "assessments" ADD COLUMN "lmThrowIn" INTEGER;
ALTER TABLE "assessments" ADD COLUMN "lmPositioning" INTEGER;
ALTER TABLE "assessments" ADD COLUMN "lmDecisionMaking" INTEGER;
ALTER TABLE "assessments" ADD COLUMN "lmDiscipline" INTEGER;
ALTER TABLE "assessments" ADD COLUMN "lmMotivation" INTEGER;
ALTER TABLE "assessments" ADD COLUMN "lmTeamwork" INTEGER;
ALTER TABLE "assessments" ADD COLUMN "lmResponsiveness" INTEGER;

-- Staff check-out, mirroring check-in fields + its own independent verification
ALTER TABLE "staff_attendances" ADD COLUMN "checkOutTime" TIMESTAMP(3);
ALTER TABLE "staff_attendances" ADD COLUMN "checkOutPhoto" TEXT;
ALTER TABLE "staff_attendances" ADD COLUMN "checkOutLatitude" DOUBLE PRECISION;
ALTER TABLE "staff_attendances" ADD COLUMN "checkOutLongitude" DOUBLE PRECISION;
ALTER TABLE "staff_attendances" ADD COLUMN "checkOutLocationName" TEXT;
ALTER TABLE "staff_attendances" ADD COLUMN "checkOutVerifyStatus" TEXT;
ALTER TABLE "staff_attendances" ADD COLUMN "checkOutVerifiedById" TEXT;
ALTER TABLE "staff_attendances" ADD COLUMN "checkOutVerifiedAt" TIMESTAMP(3);
ALTER TABLE "staff_attendances" ADD COLUMN "checkOutRejectReason" TEXT;

ALTER TABLE "staff_attendances" ADD CONSTRAINT "staff_attendances_checkOutVerifiedById_fkey"
  FOREIGN KEY ("checkOutVerifiedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
