CREATE TABLE "ImportSourceRegistryEntry" (
  "sourceId" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "baseUrl" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "accessClassification" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "rateLimitPerMinute" INTEGER,
  "robotsPolicyUrl" TEXT,
  "connectorId" TEXT NOT NULL,
  "connectorVersion" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ImportSourceRegistryEntry_pkey" PRIMARY KEY ("sourceId")
);

CREATE INDEX "ImportSourceRegistryEntry_status_idx" ON "ImportSourceRegistryEntry"("status");
CREATE INDEX "ImportSourceRegistryEntry_category_idx" ON "ImportSourceRegistryEntry"("category");

CREATE TABLE "ScholarshipImportVerificationDecision" (
  "id" TEXT NOT NULL, "recordId" TEXT NOT NULL, "state" TEXT NOT NULL, "actorId" TEXT NOT NULL,
  "reason" TEXT NOT NULL, "evidence" JSONB, "correlationId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ScholarshipImportVerificationDecision_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ScholarshipImportVerificationDecision_recordId_createdAt_idx" ON "ScholarshipImportVerificationDecision"("recordId", "createdAt");

CREATE TABLE "ScholarshipImportCanonicalResolutionDecision" (
  "id" TEXT NOT NULL, "recordId" TEXT NOT NULL, "fieldOrRequirementKey" TEXT NOT NULL, "canonicalEntityType" TEXT NOT NULL,
  "canonicalId" TEXT, "rawValue" TEXT NOT NULL, "resolutionType" TEXT NOT NULL, "actorId" TEXT NOT NULL,
  "reason" TEXT, "correlationId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ScholarshipImportCanonicalResolutionDecision_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ScholarshipImportCanonicalResolutionDecision_recordId_createdAt_idx" ON "ScholarshipImportCanonicalResolutionDecision"("recordId", "createdAt");
