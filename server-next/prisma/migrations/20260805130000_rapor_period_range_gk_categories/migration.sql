-- AlterTable: assessments — period range, active-category toggle, GK fields
ALTER TABLE "assessments" ADD COLUMN "endMonth" INTEGER;
ALTER TABLE "assessments" ADD COLUMN "endYear" INTEGER;
ALTER TABLE "assessments" ADD COLUMN "activeCategories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "assessments" ADD COLUMN "gkCatching" INTEGER;
ALTER TABLE "assessments" ADD COLUMN "gkKicking" INTEGER;
ALTER TABLE "assessments" ADD COLUMN "gkThrowing" INTEGER;
ALTER TABLE "assessments" ADD COLUMN "gkVolleying" INTEGER;
ALTER TABLE "assessments" ADD COLUMN "gkDropKick" INTEGER;
ALTER TABLE "assessments" ADD COLUMN "gkGoalKick" INTEGER;
ALTER TABLE "assessments" ADD COLUMN "gkFootwork" INTEGER;
ALTER TABLE "assessments" ADD COLUMN "gkOneVsOneTeknik" INTEGER;
ALTER TABLE "assessments" ADD COLUMN "gkPositionAttacking" INTEGER;
ALTER TABLE "assessments" ADD COLUMN "gkPositionDefending" INTEGER;
ALTER TABLE "assessments" ADD COLUMN "gkDealCrossing" INTEGER;
ALTER TABLE "assessments" ADD COLUMN "gkDealCornerKick" INTEGER;
ALTER TABLE "assessments" ADD COLUMN "gkDealFreeKick" INTEGER;
ALTER TABLE "assessments" ADD COLUMN "gkDealLongPass" INTEGER;
ALTER TABLE "assessments" ADD COLUMN "gkOneVsOneTaktik" INTEGER;

-- Backfill: existing single-month rows become a 1-month period, and default
-- to every field-player category active (matches what was effectively shown
-- before this feature existed — nothing was ever hidden).
UPDATE "assessments" SET "endMonth" = "month", "endYear" = "year" WHERE "endMonth" IS NULL;
UPDATE "assessments" SET "activeCategories" = ARRAY['teknik','attacking','defending','fisik','mental']
  WHERE "activeCategories" = ARRAY[]::TEXT[];

ALTER TABLE "assessments" ALTER COLUMN "endMonth" SET NOT NULL;
ALTER TABLE "assessments" ALTER COLUMN "endYear" SET NOT NULL;

-- Replace the old single-month unique index with a period-range-aware one.
DROP INDEX IF EXISTS "assessments_studentId_month_year_key";
CREATE UNIQUE INDEX "assessments_studentId_month_year_endMonth_endYear_key" ON "assessments"("studentId", "month", "year", "endMonth", "endYear");

-- AlterTable: reports — same period-range columns, backfilled the same way
ALTER TABLE "reports" ADD COLUMN "endMonth" INTEGER;
ALTER TABLE "reports" ADD COLUMN "endYear" INTEGER;
UPDATE "reports" SET "endMonth" = "month", "endYear" = "year" WHERE "endMonth" IS NULL;
ALTER TABLE "reports" ALTER COLUMN "endMonth" SET NOT NULL;
ALTER TABLE "reports" ALTER COLUMN "endYear" SET NOT NULL;
