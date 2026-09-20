-- MANARATAK_MIGRATION_OWNER: services
-- MANARATAK_MIGRATION_SCOPE: owner_only
-- MANARATAK_ARCH_DECISION: ADR-028
-- MNT-AUD-0058: retained Phase 20 owner scope: providers/packages/pricing/promotions/scheduling/bookings/workflow/delivery.

CREATE TABLE "ServiceProviderRecord" (
  "id" TEXT NOT NULL,
  "publicId" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "timezone" TEXT NOT NULL,
  "capacity" INTEGER NOT NULL,
  "countryReferenceId" TEXT,
  "qualificationMetadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServiceProviderRecord_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ServiceProviderRecord_capacity_check" CHECK ("capacity" > 0)
);
CREATE UNIQUE INDEX "ServiceProviderRecord_publicId_key" ON "ServiceProviderRecord"("publicId");
CREATE INDEX "ServiceProviderRecord_status_countryReferenceId_idx" ON "ServiceProviderRecord"("status", "countryReferenceId");

CREATE TABLE "ServiceProviderServiceRecord" (
  "providerId" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  CONSTRAINT "ServiceProviderServiceRecord_pkey" PRIMARY KEY ("providerId", "serviceId")
);
CREATE INDEX "ServiceProviderServiceRecord_serviceId_idx" ON "ServiceProviderServiceRecord"("serviceId");

CREATE TABLE "ServicePackageRecord" (
  "id" TEXT NOT NULL,
  "publicId" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServicePackageRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ServicePackageRecord_publicId_key" ON "ServicePackageRecord"("publicId");
CREATE INDEX "ServicePackageRecord_status_updatedAt_idx" ON "ServicePackageRecord"("status", "updatedAt");

CREATE TABLE "ServicePackageItemRecord" (
  "id" TEXT NOT NULL,
  "packageId" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "required" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "ServicePackageItemRecord_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ServicePackageItemRecord_sequence_check" CHECK ("sequence" > 0),
  CONSTRAINT "ServicePackageItemRecord_quantity_check" CHECK ("quantity" > 0)
);
CREATE UNIQUE INDEX "ServicePackageItemRecord_packageId_sequence_key" ON "ServicePackageItemRecord"("packageId", "sequence");
CREATE INDEX "ServicePackageItemRecord_serviceId_idx" ON "ServicePackageItemRecord"("serviceId");

CREATE TABLE "ServicePricingRecord" (
  "id" TEXT NOT NULL,
  "publicId" TEXT NOT NULL,
  "serviceId" TEXT,
  "packageId" TEXT,
  "currencyCode" TEXT NOT NULL,
  "scale" INTEGER NOT NULL,
  "amountMinorUnits" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "effectiveTo" TIMESTAMP(3),
  "immutableFingerprint" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ServicePricingRecord_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ServicePricingRecord_owner_check" CHECK (("serviceId" IS NULL) <> ("packageId" IS NULL)),
  CONSTRAINT "ServicePricingRecord_scale_check" CHECK ("scale" BETWEEN 0 AND 6),
  CONSTRAINT "ServicePricingRecord_amount_check" CHECK ("amountMinorUnits" ~ '^[0-9]+$'),
  CONSTRAINT "ServicePricingRecord_window_check" CHECK ("effectiveTo" IS NULL OR "effectiveTo" > "effectiveFrom")
);
CREATE UNIQUE INDEX "ServicePricingRecord_publicId_key" ON "ServicePricingRecord"("publicId");
CREATE UNIQUE INDEX "ServicePricingRecord_immutableFingerprint_key" ON "ServicePricingRecord"("immutableFingerprint");
CREATE INDEX "ServicePricingRecord_serviceId_status_effectiveFrom_idx" ON "ServicePricingRecord"("serviceId", "status", "effectiveFrom");
CREATE INDEX "ServicePricingRecord_packageId_status_effectiveFrom_idx" ON "ServicePricingRecord"("packageId", "status", "effectiveFrom");

CREATE TABLE "ServiceDiscountRecord" (
  "id" TEXT NOT NULL,
  "publicId" TEXT NOT NULL,
  "code" TEXT,
  "discountType" TEXT NOT NULL,
  "valueMinorUnits" TEXT,
  "percentageBasisPoints" INTEGER,
  "currencyCode" TEXT,
  "serviceId" TEXT,
  "packageId" TEXT,
  "activeFrom" TIMESTAMP(3) NOT NULL,
  "activeTo" TIMESTAMP(3),
  "maxRedemptions" INTEGER,
  "redemptionCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ServiceDiscountRecord_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ServiceDiscountRecord_window_check" CHECK ("activeTo" IS NULL OR "activeTo" > "activeFrom"),
  CONSTRAINT "ServiceDiscountRecord_percentage_check" CHECK ("percentageBasisPoints" IS NULL OR "percentageBasisPoints" BETWEEN 1 AND 10000),
  CONSTRAINT "ServiceDiscountRecord_redemption_check" CHECK ("maxRedemptions" IS NULL OR "maxRedemptions" > 0),
  CONSTRAINT "ServiceDiscountRecord_redemption_count_check" CHECK ("redemptionCount" >= 0 AND ("maxRedemptions" IS NULL OR "redemptionCount" <= "maxRedemptions"))
);
CREATE UNIQUE INDEX "ServiceDiscountRecord_publicId_key" ON "ServiceDiscountRecord"("publicId");
CREATE UNIQUE INDEX "ServiceDiscountRecord_code_key" ON "ServiceDiscountRecord"("code");
CREATE INDEX "ServiceDiscountRecord_serviceId_activeFrom_activeTo_idx" ON "ServiceDiscountRecord"("serviceId", "activeFrom", "activeTo");
CREATE INDEX "ServiceDiscountRecord_packageId_activeFrom_activeTo_idx" ON "ServiceDiscountRecord"("packageId", "activeFrom", "activeTo");

CREATE TABLE "ServicePromotionRecord" (
  "id" TEXT NOT NULL,
  "publicId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "discountId" TEXT NOT NULL,
  "serviceId" TEXT,
  "packageId" TEXT,
  "activeFrom" TIMESTAMP(3) NOT NULL,
  "activeTo" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServicePromotionRecord_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ServicePromotionRecord_window_check" CHECK ("activeTo" IS NULL OR "activeTo" > "activeFrom")
);
CREATE UNIQUE INDEX "ServicePromotionRecord_publicId_key" ON "ServicePromotionRecord"("publicId");
CREATE INDEX "ServicePromotionRecord_status_activeFrom_activeTo_idx" ON "ServicePromotionRecord"("status", "activeFrom", "activeTo");
CREATE INDEX "ServicePromotionRecord_serviceId_packageId_idx" ON "ServicePromotionRecord"("serviceId", "packageId");

CREATE TABLE "ServiceAvailabilitySlotRecord" (
  "id" TEXT NOT NULL,
  "publicId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "timezone" TEXT NOT NULL,
  "capacity" INTEGER NOT NULL,
  "status" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServiceAvailabilitySlotRecord_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ServiceAvailabilitySlotRecord_window_check" CHECK ("endsAt" > "startsAt"),
  CONSTRAINT "ServiceAvailabilitySlotRecord_capacity_check" CHECK ("capacity" > 0)
);
CREATE UNIQUE INDEX "ServiceAvailabilitySlotRecord_publicId_key" ON "ServiceAvailabilitySlotRecord"("publicId");
CREATE INDEX "ServiceAvailabilitySlotRecord_providerId_startsAt_endsAt_status_idx" ON "ServiceAvailabilitySlotRecord"("providerId", "startsAt", "endsAt", "status");
CREATE INDEX "ServiceAvailabilitySlotRecord_serviceId_startsAt_status_idx" ON "ServiceAvailabilitySlotRecord"("serviceId", "startsAt", "status");

CREATE TABLE "ServiceBookingRecord" (
  "id" TEXT NOT NULL,
  "publicId" TEXT NOT NULL,
  "studentReferenceId" TEXT NOT NULL,
  "serviceId" TEXT,
  "packageId" TEXT,
  "providerId" TEXT NOT NULL,
  "slotId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "timezone" TEXT NOT NULL,
  "pricingSnapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServiceBookingRecord_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ServiceBookingRecord_owner_check" CHECK (("serviceId" IS NULL) <> ("packageId" IS NULL)),
  CONSTRAINT "ServiceBookingRecord_window_check" CHECK ("endsAt" > "startsAt")
);
CREATE UNIQUE INDEX "ServiceBookingRecord_publicId_key" ON "ServiceBookingRecord"("publicId");
CREATE INDEX "ServiceBookingRecord_studentReferenceId_status_updatedAt_idx" ON "ServiceBookingRecord"("studentReferenceId", "status", "updatedAt");
CREATE INDEX "ServiceBookingRecord_providerId_slotId_status_idx" ON "ServiceBookingRecord"("providerId", "slotId", "status");

CREATE TABLE "ServiceBookingItemRecord" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "packageItemId" TEXT,
  "sequence" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL,
  "status" TEXT NOT NULL,
  CONSTRAINT "ServiceBookingItemRecord_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ServiceBookingItemRecord_sequence_check" CHECK ("sequence" > 0),
  CONSTRAINT "ServiceBookingItemRecord_quantity_check" CHECK ("quantity" > 0)
);
CREATE UNIQUE INDEX "ServiceBookingItemRecord_bookingId_sequence_key" ON "ServiceBookingItemRecord"("bookingId", "sequence");
CREATE INDEX "ServiceBookingItemRecord_serviceId_status_idx" ON "ServiceBookingItemRecord"("serviceId", "status");

CREATE TABLE "ServiceWorkflowDefinitionRecord" (
  "id" TEXT NOT NULL,
  "publicId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "serviceId" TEXT,
  "packageId" TEXT,
  "status" TEXT NOT NULL,
  "steps" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServiceWorkflowDefinitionRecord_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ServiceWorkflowDefinitionRecord_owner_check" CHECK (("serviceId" IS NULL) <> ("packageId" IS NULL))
);
CREATE UNIQUE INDEX "ServiceWorkflowDefinitionRecord_publicId_key" ON "ServiceWorkflowDefinitionRecord"("publicId");
CREATE INDEX "ServiceWorkflowDefinitionRecord_serviceId_status_idx" ON "ServiceWorkflowDefinitionRecord"("serviceId", "status");
CREATE INDEX "ServiceWorkflowDefinitionRecord_packageId_status_idx" ON "ServiceWorkflowDefinitionRecord"("packageId", "status");

CREATE TABLE "ServiceWorkflowExecutionRecord" (
  "id" TEXT NOT NULL,
  "publicId" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "workflowDefinitionId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "currentStepKey" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "failureReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServiceWorkflowExecutionRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ServiceWorkflowExecutionRecord_publicId_key" ON "ServiceWorkflowExecutionRecord"("publicId");
CREATE INDEX "ServiceWorkflowExecutionRecord_bookingId_status_idx" ON "ServiceWorkflowExecutionRecord"("bookingId", "status");
CREATE INDEX "ServiceWorkflowExecutionRecord_workflowDefinitionId_status_idx" ON "ServiceWorkflowExecutionRecord"("workflowDefinitionId", "status");

CREATE TABLE "ServiceDeliveryArtifactRecord" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "workflowExecutionId" TEXT,
  "artifactType" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "deliveredBy" TEXT NOT NULL,
  "deliveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ServiceDeliveryArtifactRecord_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ServiceDeliveryArtifactRecord_bookingId_artifactType_idx" ON "ServiceDeliveryArtifactRecord"("bookingId", "artifactType");
CREATE INDEX "ServiceDeliveryArtifactRecord_assetId_idx" ON "ServiceDeliveryArtifactRecord"("assetId");

ALTER TABLE "ServiceProviderServiceRecord" ADD CONSTRAINT "ServiceProviderServiceRecord_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ServiceProviderRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServiceProviderServiceRecord" ADD CONSTRAINT "ServiceProviderServiceRecord_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceCatalogRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServicePackageItemRecord" ADD CONSTRAINT "ServicePackageItemRecord_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ServicePackageRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServicePackageItemRecord" ADD CONSTRAINT "ServicePackageItemRecord_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceCatalogRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServicePricingRecord" ADD CONSTRAINT "ServicePricingRecord_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceCatalogRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServicePricingRecord" ADD CONSTRAINT "ServicePricingRecord_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ServicePackageRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceDiscountRecord" ADD CONSTRAINT "ServiceDiscountRecord_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceCatalogRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceDiscountRecord" ADD CONSTRAINT "ServiceDiscountRecord_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ServicePackageRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServicePromotionRecord" ADD CONSTRAINT "ServicePromotionRecord_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "ServiceDiscountRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServicePromotionRecord" ADD CONSTRAINT "ServicePromotionRecord_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceCatalogRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServicePromotionRecord" ADD CONSTRAINT "ServicePromotionRecord_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ServicePackageRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceAvailabilitySlotRecord" ADD CONSTRAINT "ServiceAvailabilitySlotRecord_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ServiceProviderRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceAvailabilitySlotRecord" ADD CONSTRAINT "ServiceAvailabilitySlotRecord_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceCatalogRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceBookingRecord" ADD CONSTRAINT "ServiceBookingRecord_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceCatalogRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceBookingRecord" ADD CONSTRAINT "ServiceBookingRecord_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ServicePackageRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceBookingRecord" ADD CONSTRAINT "ServiceBookingRecord_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ServiceProviderRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceBookingRecord" ADD CONSTRAINT "ServiceBookingRecord_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "ServiceAvailabilitySlotRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceBookingItemRecord" ADD CONSTRAINT "ServiceBookingItemRecord_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "ServiceBookingRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServiceBookingItemRecord" ADD CONSTRAINT "ServiceBookingItemRecord_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceCatalogRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceBookingItemRecord" ADD CONSTRAINT "ServiceBookingItemRecord_packageItemId_fkey" FOREIGN KEY ("packageItemId") REFERENCES "ServicePackageItemRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceWorkflowDefinitionRecord" ADD CONSTRAINT "ServiceWorkflowDefinitionRecord_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceCatalogRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceWorkflowDefinitionRecord" ADD CONSTRAINT "ServiceWorkflowDefinitionRecord_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ServicePackageRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceWorkflowExecutionRecord" ADD CONSTRAINT "ServiceWorkflowExecutionRecord_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "ServiceBookingRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceWorkflowExecutionRecord" ADD CONSTRAINT "ServiceWorkflowExecutionRecord_workflowDefinitionId_fkey" FOREIGN KEY ("workflowDefinitionId") REFERENCES "ServiceWorkflowDefinitionRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceDeliveryArtifactRecord" ADD CONSTRAINT "ServiceDeliveryArtifactRecord_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "ServiceBookingRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceDeliveryArtifactRecord" ADD CONSTRAINT "ServiceDeliveryArtifactRecord_workflowExecutionId_fkey" FOREIGN KEY ("workflowExecutionId") REFERENCES "ServiceWorkflowExecutionRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
