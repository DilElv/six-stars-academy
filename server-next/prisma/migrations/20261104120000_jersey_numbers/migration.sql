-- Registry nomor punggung jersey per produk + kategori usia. Nomor yang tidak
-- punya baris berarti Tersedia, sehingga tidak perlu membuat 500 baris per
-- produk di awal.
CREATE TABLE "jersey_numbers" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "ageGroup" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'available',
    "studentId" TEXT,
    "cartItemId" TEXT,
    "playerName" TEXT,
    "size" TEXT,
    "note" TEXT,
    "reservedAt" TIMESTAMP(3),
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jersey_numbers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "jersey_numbers_productId_ageGroup_number_key"
    ON "jersey_numbers"("productId", "ageGroup", "number");
CREATE UNIQUE INDEX "jersey_numbers_cartItemId_key"
    ON "jersey_numbers"("cartItemId");
CREATE INDEX "jersey_numbers_productId_ageGroup_status_idx"
    ON "jersey_numbers"("productId", "ageGroup", "status");
CREATE INDEX "jersey_numbers_studentId_idx"
    ON "jersey_numbers"("studentId");

ALTER TABLE "jersey_numbers"
    ADD CONSTRAINT "jersey_numbers_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "jersey_numbers"
    ADD CONSTRAINT "jersey_numbers_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "jersey_numbers"
    ADD CONSTRAINT "jersey_numbers_cartItemId_fkey"
    FOREIGN KEY ("cartItemId") REFERENCES "cart_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
