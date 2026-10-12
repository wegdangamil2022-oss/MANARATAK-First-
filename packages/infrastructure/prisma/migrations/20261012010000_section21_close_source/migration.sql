-- AlterTable
ALTER TABLE "ServiceRequestRecord" ADD COLUMN     "cancellationNextCheckAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "inputsErasedAt" TIMESTAMP(3),
ADD COLUMN     "invoiceNextCheckAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "legalHoldUntil" TIMESTAMP(3),
ADD COLUMN     "slaEscalatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ServiceBookingRecord" ADD COLUMN     "inputSnapshot" JSONB,
ADD COLUMN     "inputsErasedAt" TIMESTAMP(3);

