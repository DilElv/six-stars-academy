-- Audit Pembayaran: tabel jejak audit perubahan/konfirmasi pembayaran.
-- (Drift FK "schedules" dari migrate-diff tidak disertakan — tidak terkait.)

-- CreateTable
CREATE TABLE "payment_audit_logs" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "actorRole" TEXT,
    "studentId" TEXT,
    "amount" INTEGER,
    "before" JSONB,
    "after" JSONB,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_audit_logs_paymentId_idx" ON "payment_audit_logs"("paymentId");

-- CreateIndex
CREATE INDEX "payment_audit_logs_createdAt_idx" ON "payment_audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "payment_audit_logs" ADD CONSTRAINT "payment_audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
