-- A coach/head-coach checks in/out separately per branch now, so the daily
-- uniqueness constraint must include branchId. NULLs remain distinct under
-- Postgres unique indexes, so old rows recorded before branchId was always
-- populated are unaffected.
DROP INDEX IF EXISTS "staff_attendances_userId_date_key";
CREATE UNIQUE INDEX "staff_attendances_userId_date_branchId_key" ON "staff_attendances"("userId", "date", "branchId");
