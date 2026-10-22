-- Jejak pengingat tagihan (WhatsApp) dari admin/head coach ke parent.

-- CreateTable
CREATE TABLE "payment_reminders" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "sentById" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'whatsapp',
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_reminders_studentId_createdAt_idx" ON "payment_reminders"("studentId", "createdAt");

-- CreateIndex
CREATE INDEX "payment_reminders_sentById_idx" ON "payment_reminders"("sentById");

-- AddForeignKey
ALTER TABLE "payment_reminders" ADD CONSTRAINT "payment_reminders_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_reminders" ADD CONSTRAINT "payment_reminders_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
