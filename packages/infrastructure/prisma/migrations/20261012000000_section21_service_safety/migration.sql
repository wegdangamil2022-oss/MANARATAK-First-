-- AlterTable
ALTER TABLE "ServiceCatalogRecord" ADD COLUMN     "fulfillmentPolicy" TEXT NOT NULL DEFAULT 'QUOTE_REQUIRED',
ADD COLUMN     "inputSchema" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "localizedContent" JSONB,
ADD COLUMN     "makerActorId" TEXT,
ADD COLUMN     "publishedSnapshot" JSONB,
ADD COLUMN     "reviewedVersion" INTEGER,
ADD COLUMN     "reviewerActorId" TEXT;

-- AlterTable
ALTER TABLE "ServiceRequestRecord" ADD COLUMN     "invoiceIntent" JSONB,
ADD COLUMN     "invoiceLinkState" TEXT NOT NULL DEFAULT 'NONE',
ADD COLUMN     "payloadFingerprint" TEXT,
ADD COLUMN     "serviceSnapshot" JSONB;

-- AlterTable
ALTER TABLE "ServiceProviderRecord" ADD COLUMN     "makerActorId" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "ServicePackageRecord" ADD COLUMN     "makerActorId" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "ServicePricingRecord" ADD COLUMN     "makerActorId" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "ServicePromotionRecord" ADD COLUMN     "makerActorId" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "ServiceAvailabilitySlotRecord" ADD COLUMN     "makerActorId" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "ServiceBookingRecord" ADD COLUMN     "discountState" TEXT NOT NULL DEFAULT 'RESERVED',
ADD COLUMN     "holdExpiresAt" TIMESTAMP(3),
ADD COLUMN     "makerActorId" TEXT,
ADD COLUMN     "payloadFingerprint" TEXT,
ADD COLUMN     "requestId" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "ServiceWorkflowDefinitionRecord" ADD COLUMN     "makerActorId" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "ServiceWorkflowExecutionRecord" ADD COLUMN     "executionClaim" TEXT,
ADD COLUMN     "makerActorId" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE UNIQUE INDEX "ServiceBookingRecord_requestId_key" ON "ServiceBookingRecord"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceWorkflowExecutionRecord_executionClaim_key" ON "ServiceWorkflowExecutionRecord"("executionClaim");


-- Source-only migration. Legacy pending holds need an expiry before reusing capacity.
UPDATE "ServiceBookingRecord" SET "holdExpiresAt" = CURRENT_TIMESTAMP WHERE "status" = 'PENDING' AND "holdExpiresAt" IS NULL;
-- Conservative single-active-price rule; investigate existing duplicate ACTIVE rows before applying.
CREATE UNIQUE INDEX "ServicePricingRecord_one_active_service" ON "ServicePricingRecord" ("serviceId") WHERE "status" = 'ACTIVE' AND "serviceId" IS NOT NULL;
CREATE UNIQUE INDEX "ServicePricingRecord_one_active_package" ON "ServicePricingRecord" ("packageId") WHERE "status" = 'ACTIVE' AND "packageId" IS NOT NULL;
ALTER TABLE "ServiceCatalogRecord" ADD CONSTRAINT "ServiceCatalogRecord_fulfillment_policy" CHECK ("fulfillmentPolicy" IN ('FREE','CHARGEABLE','QUOTE_REQUIRED')) NOT VALID;
ALTER TABLE "ServicePricingRecord" ADD CONSTRAINT "ServicePricingRecord_bounded_money" CHECK ("amountMinorUnits" ~ '^(0|[1-9][0-9]{0,29})$' AND "scale" BETWEEN 0 AND 6) NOT VALID;
ALTER TABLE "ServiceRequestRecord" ADD COLUMN "assignedStaffId" TEXT, ADD COLUMN "dueAt" TIMESTAMP(3), ADD COLUMN "cancellationState" TEXT NOT NULL DEFAULT 'NONE';
CREATE INDEX "ServiceRequestRecord_staff_due" ON "ServiceRequestRecord" ("assignedStaffId", "status", "dueAt");
ALTER TABLE "ServiceBookingRecord" ADD CONSTRAINT "ServiceBookingRecord_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ServiceRequestRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceCatalogRecord" ADD COLUMN "approvedPrice" JSONB, ADD COLUMN "cancellationPolicyCode" TEXT NOT NULL DEFAULT 'FINANCE_REVIEW_REQUIRED', ADD COLUMN "reviewEvidence" JSONB;
ALTER TABLE "ServiceRequestRecord" ADD COLUMN "retentionUntil" TIMESTAMP(3);
ALTER TABLE "ServiceDeliveryArtifactRecord" ADD COLUMN "stepKey" TEXT;
