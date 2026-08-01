-- Schedules move from recurring day-of-week to specific calendar dates, and
-- drop ageGroup entirely. Existing rows have no real date (day-of-week data
-- doesn't map to one), so they're cleared per explicit confirmation — admin
-- re-enters jadwal latihan using actual dates via the updated UI.
DELETE FROM "schedules";

ALTER TABLE "schedules" DROP COLUMN "ageGroup",
DROP COLUMN "day",
ALTER COLUMN "date" SET NOT NULL;
