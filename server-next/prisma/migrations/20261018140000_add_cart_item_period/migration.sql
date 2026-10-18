-- Billing BPJS otomatis: kolom periode (bulan/tahun) pada item keranjang.
-- (Drift FK "schedules" dari migrate-diff tidak disertakan — tidak terkait.)

-- AlterTable
ALTER TABLE "cart_items" ADD COLUMN     "periodMonth" INTEGER,
ADD COLUMN     "periodYear" INTEGER;

-- CreateIndex
CREATE INDEX "cart_items_type_periodMonth_periodYear_idx" ON "cart_items"("type", "periodMonth", "periodYear");
