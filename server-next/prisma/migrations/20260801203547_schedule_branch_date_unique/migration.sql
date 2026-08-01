-- Production had real conflicting rows (same branch+date entered twice)
-- that block the unique index below — cleared per explicit confirmation,
-- admin re-enters jadwal latihan through the now-conflict-blocking UI.
DELETE FROM "schedules";

-- One branch can only have one jadwal per date, enforced at the DB level so
-- it holds even under concurrent requests, not just the picker UI.
CREATE UNIQUE INDEX "schedules_branchId_date_key" ON "schedules"("branchId", "date");
