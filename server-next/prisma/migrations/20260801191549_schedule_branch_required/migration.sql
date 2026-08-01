-- A Schedule with no branch is invisible to head-coach/coach views (they
-- filter by their own branchId), so admin and head-coach both silently
-- desync whenever a branch is left unset. Branch is now required.
DELETE FROM "schedules" WHERE "branchId" IS NULL;

ALTER TABLE "schedules" ALTER COLUMN "branchId" SET NOT NULL;
