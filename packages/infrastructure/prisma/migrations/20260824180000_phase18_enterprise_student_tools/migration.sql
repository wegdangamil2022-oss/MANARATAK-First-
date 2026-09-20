CREATE TABLE "StudentToolDefinitionRecord" (
  "id" TEXT NOT NULL, "toolKey" TEXT NOT NULL, "nameAr" TEXT NOT NULL, "nameEn" TEXT NOT NULL,
  "descriptionAr" TEXT NOT NULL, "descriptionEn" TEXT NOT NULL, "category" TEXT NOT NULL,
  "executionType" TEXT NOT NULL, "implementationPriority" TEXT NOT NULL, "desiredLaunchVisibility" TEXT NOT NULL,
  "visibility" TEXT NOT NULL, "implementationStatus" TEXT NOT NULL, "lifecycle" TEXT NOT NULL,
  "availability" JSONB NOT NULL, "featureFlags" JSONB NOT NULL, "rateLimitPolicy" JSONB NOT NULL, "aiCapabilityKey" TEXT, "outputType" TEXT NOT NULL,
  "supportedLocales" JSONB NOT NULL, "estimatedMinutes" INTEGER NOT NULL, "tags" JSONB NOT NULL, "iconAssetId" TEXT,
  "owner" TEXT NOT NULL, "launchOrder" INTEGER NOT NULL, "inputSchema" JSONB NOT NULL, "outputSchema" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudentToolDefinitionRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StudentToolDefinitionRecord_toolKey_key" ON "StudentToolDefinitionRecord"("toolKey");
CREATE INDEX "StudentToolDefinitionRecord_category_visibility_launchOrder_idx" ON "StudentToolDefinitionRecord"("category", "visibility", "launchOrder");
CREATE INDEX "StudentToolDefinitionRecord_implementationStatus_lifecycle_idx" ON "StudentToolDefinitionRecord"("implementationStatus", "lifecycle");
CREATE TABLE "StudentToolVersionRecord" ("id" TEXT NOT NULL, "definitionId" TEXT NOT NULL, "semanticVersion" TEXT NOT NULL, "inputSchemaVersion" TEXT NOT NULL, "outputSchemaVersion" TEXT NOT NULL, "releaseDate" TIMESTAMP(3) NOT NULL, "changeNote" TEXT NOT NULL, "status" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "StudentToolVersionRecord_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "StudentToolVersionRecord_definitionId_semanticVersion_key" ON "StudentToolVersionRecord"("definitionId", "semanticVersion");
CREATE INDEX "StudentToolVersionRecord_definitionId_status_idx" ON "StudentToolVersionRecord"("definitionId", "status");
CREATE TABLE "StudentToolDependencyRecord" ("id" TEXT NOT NULL, "definitionId" TEXT NOT NULL, "phase" TEXT NOT NULL, "type" TEXT NOT NULL, "required" BOOLEAN NOT NULL, "capabilityKey" TEXT, "description" TEXT NOT NULL, CONSTRAINT "StudentToolDependencyRecord_pkey" PRIMARY KEY ("id"));
CREATE INDEX "StudentToolDependencyRecord_definitionId_required_idx" ON "StudentToolDependencyRecord"("definitionId", "required");
CREATE TABLE "StudentToolExecutionRecord" ("id" TEXT NOT NULL, "executionId" TEXT NOT NULL, "definitionId" TEXT NOT NULL, "toolVersion" TEXT NOT NULL, "status" TEXT NOT NULL, "consumerType" TEXT NOT NULL, "studentReferenceHash" TEXT, "anonymousSessionHash" TEXT, "idempotencyKeyHash" TEXT, "correlationId" TEXT NOT NULL, "traceId" TEXT NOT NULL, "aiExecutionReference" TEXT, "dependencyStatus" JSONB, "durationMs" INTEGER, "errorCode" TEXT, "safeUsageMetadata" JSONB, "isTest" BOOLEAN NOT NULL DEFAULT false, "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "completedAt" TIMESTAMP(3), CONSTRAINT "StudentToolExecutionRecord_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "StudentToolExecutionRecord_executionId_key" ON "StudentToolExecutionRecord"("executionId");
CREATE UNIQUE INDEX "StudentToolExecutionRecord_definitionId_idempotencyKeyHash_key" ON "StudentToolExecutionRecord"("definitionId", "idempotencyKeyHash");
CREATE INDEX "StudentToolExecutionRecord_definitionId_status_startedAt_idx" ON "StudentToolExecutionRecord"("definitionId", "status", "startedAt");
CREATE INDEX "StudentToolExecutionRecord_correlationId_idx" ON "StudentToolExecutionRecord"("correlationId");
CREATE INDEX "StudentToolExecutionRecord_traceId_idx" ON "StudentToolExecutionRecord"("traceId");
ALTER TABLE "StudentToolVersionRecord" ADD CONSTRAINT "StudentToolVersionRecord_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "StudentToolDefinitionRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentToolDependencyRecord" ADD CONSTRAINT "StudentToolDependencyRecord_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "StudentToolDefinitionRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentToolExecutionRecord" ADD CONSTRAINT "StudentToolExecutionRecord_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "StudentToolDefinitionRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
