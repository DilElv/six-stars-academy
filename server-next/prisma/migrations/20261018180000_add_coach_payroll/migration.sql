-- Payroll Coach: honor harian per coach + slip honor bulanan.
-- (Drift FK "schedules" dari migrate-diff tidak disertakan — tidak terkait.)

-- AlterTable
ALTER TABLE "users" ADD COLUMN "dailyRate" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "coach_payrolls" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "dailyRate" INTEGER NOT NULL DEFAULT 0,
    "daysPresent" INTEGER NOT NULL DEFAULT 0,
    "bonus" INTEGER NOT NULL DEFAULT 0,
    "deduction" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "paidAt" TIMESTAMP(3),
    "generatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coach_payrolls_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "coach_payrolls_month_year_idx" ON "coach_payrolls"("month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "coach_payrolls_coachId_month_year_key" ON "coach_payrolls"("coachId", "month", "year");

-- AddForeignKey
ALTER TABLE "coach_payrolls" ADD CONSTRAINT "coach_payrolls_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_payrolls" ADD CONSTRAINT "coach_payrolls_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
