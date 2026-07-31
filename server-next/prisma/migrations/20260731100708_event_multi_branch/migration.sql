-- CreateTable
CREATE TABLE "event_branches" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,

    CONSTRAINT "event_branches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "event_branches_eventId_branchId_key" ON "event_branches"("eventId", "branchId");

-- AddForeignKey
ALTER TABLE "event_branches" ADD CONSTRAINT "event_branches_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_branches" ADD CONSTRAINT "event_branches_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: preserve existing single-branch targeting as a row in the new
-- join table before the old column is dropped. A NULL branchId already meant
-- "all branches" and needs no row (absence of rows keeps that same meaning).
INSERT INTO "event_branches" ("id", "eventId", "branchId")
SELECT md5(random()::text || clock_timestamp()::text), "id", "branchId" FROM "events" WHERE "branchId" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "events" DROP CONSTRAINT "events_branchId_fkey";

-- AlterTable
ALTER TABLE "events" DROP COLUMN "branchId";
