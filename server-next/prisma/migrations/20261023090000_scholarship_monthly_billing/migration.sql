-- Tarif beasiswa final per bulan. NULL mempertahankan seluruh data lama dan
-- harga reguler; 0 adalah beasiswa penuh yang valid.
ALTER TABLE "students" ADD COLUMN "scholarshipCategory" TEXT;
ALTER TABLE "students" ADD COLUMN "scholarshipMonthlyRate" INTEGER;

-- Validasi database agar tarif negatif tidak pernah tersimpan.
ALTER TABLE "students"
  ADD CONSTRAINT "students_scholarshipMonthlyRate_nonnegative"
  CHECK ("scholarshipMonthlyRate" IS NULL OR "scholarshipMonthlyRate" >= 0);
