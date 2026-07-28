-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "callbackPayload" JSONB,
ADD COLUMN     "eventParticipantId" TEXT,
ADD COLUMN     "failReason" TEXT,
ADD COLUMN     "paymentLink" TEXT,
ADD COLUMN     "qrString" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "payments_eventParticipantId_key" ON "payments"("eventParticipantId");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_eventParticipantId_fkey" FOREIGN KEY ("eventParticipantId") REFERENCES "event_participants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

