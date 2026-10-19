-- Bukti pembayaran (foto/screenshot transfer, QRIS, dsb.). WAJIB diunggah
-- supaya pembayaran dihitung sebagai pemasukan di laporan keuangan.
ALTER TABLE "payments" ADD COLUMN "proofUrl" TEXT;
ALTER TABLE "payments" ADD COLUMN "proofNote" TEXT;
ALTER TABLE "payments" ADD COLUMN "proofUploadedAt" TIMESTAMP(3);
ALTER TABLE "payments" ADD COLUMN "proofUploadedById" TEXT;
-- Penanda "bebas bukti" untuk data lama supaya tetap dihitung apa adanya.
ALTER TABLE "payments" ADD COLUMN "proofExempt" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "payments_proofUploadedById_idx" ON "payments"("proofUploadedById");

ALTER TABLE "payments" ADD CONSTRAINT "payments_proofUploadedById_fkey"
  FOREIGN KEY ("proofUploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Semua pembayaran yang sudah ada (sebelum fitur ini) dibebaskan dari
-- kewajiban bukti — sesuai keputusan "biarkan apa adanya".
UPDATE "payments" SET "proofExempt" = true;
