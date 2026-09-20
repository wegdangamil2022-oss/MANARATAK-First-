-- Phase 17 source-only migration. Runtime application is deferred to Google Studio.
CREATE TABLE "AIRegistryRecord" (
  "id" TEXT NOT NULL, "resourceType" TEXT NOT NULL, "key" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT', "providerKey" TEXT, "capabilityKey" TEXT,
  "consumerKey" TEXT, "secretReference" TEXT, "configuration" JSONB NOT NULL,
  "createdBy" TEXT NOT NULL, "updatedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AIRegistryRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AIRegistryRecord_resourceType_key_key" ON "AIRegistryRecord"("resourceType", "key");
CREATE INDEX "AIRegistryRecord_resourceType_status_idx" ON "AIRegistryRecord"("resourceType", "status");
CREATE INDEX "AIRegistryRecord_providerKey_idx" ON "AIRegistryRecord"("providerKey");
CREATE INDEX "AIRegistryRecord_capabilityKey_idx" ON "AIRegistryRecord"("capabilityKey");
CREATE INDEX "AIRegistryRecord_consumerKey_idx" ON "AIRegistryRecord"("consumerKey");

CREATE TABLE "AIPromptVersionRecord" (
  "id" TEXT NOT NULL, "promptKey" TEXT NOT NULL, "version" INTEGER NOT NULL,
  "template" TEXT NOT NULL, "inputSchema" JSONB, "outputSchema" JSONB,
  "checksum" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "createdBy" TEXT NOT NULL, "approvedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AIPromptVersionRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AIPromptVersionRecord_promptKey_version_key" ON "AIPromptVersionRecord"("promptKey", "version");
CREATE INDEX "AIPromptVersionRecord_promptKey_status_idx" ON "AIPromptVersionRecord"("promptKey", "status");

CREATE TABLE "AIPromptDeploymentRecord" (
  "id" TEXT NOT NULL, "promptKey" TEXT NOT NULL, "version" INTEGER NOT NULL,
  "environment" TEXT NOT NULL DEFAULT 'PRODUCTION', "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "deployedBy" TEXT NOT NULL, "deployedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "retiredAt" TIMESTAMP(3), CONSTRAINT "AIPromptDeploymentRecord_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AIPromptDeploymentRecord_promptKey_environment_status_idx" ON "AIPromptDeploymentRecord"("promptKey", "environment", "status");
ALTER TABLE "AIPromptDeploymentRecord" ADD CONSTRAINT "AIPromptDeploymentRecord_promptKey_version_fkey" FOREIGN KEY ("promptKey", "version") REFERENCES "AIPromptVersionRecord"("promptKey", "version") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "AIExecutionRecord" (
  "id" TEXT NOT NULL, "publicId" TEXT NOT NULL, "traceId" TEXT NOT NULL,
  "idempotencyKeyHash" TEXT, "consumerKey" TEXT NOT NULL, "capabilityKey" TEXT NOT NULL,
  "purpose" TEXT NOT NULL, "promptKey" TEXT NOT NULL, "promptVersion" INTEGER,
  "providerKey" TEXT, "modelKey" TEXT, "status" TEXT NOT NULL,
  "safetyDecision" TEXT NOT NULL, "dataClassification" TEXT NOT NULL DEFAULT 'INTERNAL', "inputPreview" TEXT, "outputPreview" TEXT,
  "inputTokens" INTEGER NOT NULL DEFAULT 0, "outputTokens" INTEGER NOT NULL DEFAULT 0,
  "estimatedCost" DECIMAL(18,8), "actualCost" DECIMAL(18,8), "currency" TEXT,
  "errorCode" TEXT, "errorMessage" TEXT, "requesterReferenceId" TEXT, "sourceDomain" TEXT,
  "metadata" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "AIExecutionRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AIExecutionRecord_publicId_key" ON "AIExecutionRecord"("publicId");
CREATE UNIQUE INDEX "AIExecutionRecord_consumerKey_idempotencyKeyHash_key" ON "AIExecutionRecord"("consumerKey", "idempotencyKeyHash");
CREATE INDEX "AIExecutionRecord_traceId_idx" ON "AIExecutionRecord"("traceId");
CREATE INDEX "AIExecutionRecord_status_createdAt_idx" ON "AIExecutionRecord"("status", "createdAt");
CREATE INDEX "AIExecutionRecord_consumerKey_createdAt_idx" ON "AIExecutionRecord"("consumerKey", "createdAt");
CREATE INDEX "AIExecutionRecord_providerKey_modelKey_createdAt_idx" ON "AIExecutionRecord"("providerKey", "modelKey", "createdAt");

CREATE TABLE "AIAsyncJobRecord" (
  "id" TEXT NOT NULL, "publicId" TEXT NOT NULL, "requesterReferenceId" TEXT NOT NULL,
  "consumerKey" TEXT NOT NULL, "capabilityKey" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'QUEUED',
  "payloadCiphertext" TEXT NOT NULL, "payloadIv" TEXT NOT NULL, "payloadAuthTag" TEXT NOT NULL,
  "payloadKeyVersion" TEXT NOT NULL, "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 3, "nextAttemptAt" TIMESTAMP(3),
  "lockedAt" TIMESTAMP(3), "lockedBy" TEXT, "executionPublicId" TEXT, "errorCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3), CONSTRAINT "AIAsyncJobRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AIAsyncJobRecord_publicId_key" ON "AIAsyncJobRecord"("publicId");
CREATE INDEX "AIAsyncJobRecord_status_nextAttemptAt_createdAt_idx" ON "AIAsyncJobRecord"("status", "nextAttemptAt", "createdAt");
CREATE INDEX "AIAsyncJobRecord_consumerKey_createdAt_idx" ON "AIAsyncJobRecord"("consumerKey", "createdAt");
CREATE INDEX "AIAsyncJobRecord_requesterReferenceId_createdAt_idx" ON "AIAsyncJobRecord"("requesterReferenceId", "createdAt");
ALTER TABLE "AIAsyncJobRecord" ADD CONSTRAINT "AIAsyncJobRecord_executionPublicId_fkey" FOREIGN KEY ("executionPublicId") REFERENCES "AIExecutionRecord"("publicId") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "AIExecutionSpanRecord" (
  "id" TEXT NOT NULL, "executionPublicId" TEXT NOT NULL, "traceId" TEXT NOT NULL,
  "name" TEXT NOT NULL, "status" TEXT NOT NULL, "startedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3), "durationMs" INTEGER, "attributes" JSONB,
  CONSTRAINT "AIExecutionSpanRecord_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AIExecutionSpanRecord_executionPublicId_startedAt_idx" ON "AIExecutionSpanRecord"("executionPublicId", "startedAt");
CREATE INDEX "AIExecutionSpanRecord_traceId_idx" ON "AIExecutionSpanRecord"("traceId");
ALTER TABLE "AIExecutionSpanRecord" ADD CONSTRAINT "AIExecutionSpanRecord_executionPublicId_fkey" FOREIGN KEY ("executionPublicId") REFERENCES "AIExecutionRecord"("publicId") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "AIUsageRecord" (
  "id" TEXT NOT NULL, "executionPublicId" TEXT NOT NULL, "consumerKey" TEXT NOT NULL,
  "providerKey" TEXT NOT NULL, "modelKey" TEXT NOT NULL, "inputTokens" INTEGER NOT NULL,
  "outputTokens" INTEGER NOT NULL, "cost" DECIMAL(18,8) NOT NULL, "currency" TEXT NOT NULL,
  "priceSnapshotKey" TEXT, "pricingEffectiveFrom" TIMESTAMP(3), "costKind" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "metadata" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AIUsageRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AIUsageRecord_executionPublicId_providerKey_modelKey_key" ON "AIUsageRecord"("executionPublicId", "providerKey", "modelKey");
CREATE INDEX "AIUsageRecord_consumerKey_createdAt_idx" ON "AIUsageRecord"("consumerKey", "createdAt");
CREATE INDEX "AIUsageRecord_providerKey_modelKey_createdAt_idx" ON "AIUsageRecord"("providerKey", "modelKey", "createdAt");
ALTER TABLE "AIUsageRecord" ADD CONSTRAINT "AIUsageRecord_executionPublicId_fkey" FOREIGN KEY ("executionPublicId") REFERENCES "AIExecutionRecord"("publicId") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "AIWorkflowRunRecord" (
  "id" TEXT NOT NULL, "publicId" TEXT NOT NULL, "workflowKey" TEXT NOT NULL,
  "workflowVersion" INTEGER NOT NULL, "status" TEXT NOT NULL, "traceId" TEXT NOT NULL,
  "inputReferenceHash" TEXT NOT NULL, "outputReferenceHash" TEXT, "currentStep" TEXT, "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AIWorkflowRunRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AIWorkflowRunRecord_publicId_key" ON "AIWorkflowRunRecord"("publicId");
CREATE INDEX "AIWorkflowRunRecord_workflowKey_status_createdAt_idx" ON "AIWorkflowRunRecord"("workflowKey", "status", "createdAt");
CREATE INDEX "AIWorkflowRunRecord_traceId_idx" ON "AIWorkflowRunRecord"("traceId");

CREATE TABLE "AIWorkflowStepRunRecord" (
  "id" TEXT NOT NULL, "runPublicId" TEXT NOT NULL, "stepKey" TEXT NOT NULL,
  "executionId" TEXT, "status" TEXT NOT NULL, "attempt" INTEGER NOT NULL DEFAULT 1,
  "inputReferenceHash" TEXT, "outputReferenceHash" TEXT, "errorMessage" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "completedAt" TIMESTAMP(3),
  CONSTRAINT "AIWorkflowStepRunRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AIWorkflowStepRunRecord_runPublicId_stepKey_attempt_key" ON "AIWorkflowStepRunRecord"("runPublicId", "stepKey", "attempt");
CREATE INDEX "AIWorkflowStepRunRecord_runPublicId_status_idx" ON "AIWorkflowStepRunRecord"("runPublicId", "status");
ALTER TABLE "AIWorkflowStepRunRecord" ADD CONSTRAINT "AIWorkflowStepRunRecord_runPublicId_fkey" FOREIGN KEY ("runPublicId") REFERENCES "AIWorkflowRunRecord"("publicId") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "AIEvaluationRunRecord" (
  "id" TEXT NOT NULL, "publicId" TEXT NOT NULL, "evaluationKey" TEXT NOT NULL,
  "status" TEXT NOT NULL, "promptVersion" INTEGER, "modelKey" TEXT,
  "passed" INTEGER NOT NULL DEFAULT 0, "failed" INTEGER NOT NULL DEFAULT 0,
  "safetyFailures" INTEGER NOT NULL DEFAULT 0, "score" DOUBLE PRECISION, "results" JSONB,
  "approvedBy" TEXT, "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "completedAt" TIMESTAMP(3),
  CONSTRAINT "AIEvaluationRunRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AIEvaluationRunRecord_publicId_key" ON "AIEvaluationRunRecord"("publicId");
CREATE INDEX "AIEvaluationRunRecord_evaluationKey_status_createdAt_idx" ON "AIEvaluationRunRecord"("evaluationKey", "status", "createdAt");

CREATE TABLE "AIKnowledgeSourceRecord" (
  "id" TEXT NOT NULL, "indexKey" TEXT NOT NULL, "sourceType" TEXT NOT NULL,
  "sourceReferenceId" TEXT NOT NULL, "sourceVersion" TEXT, "checksum" TEXT NOT NULL,
  "locale" TEXT, "status" TEXT NOT NULL DEFAULT 'PENDING', "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AIKnowledgeSourceRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AIKnowledgeSourceRecord_indexKey_sourceType_sourceReferenceId_checksum_key" ON "AIKnowledgeSourceRecord"("indexKey", "sourceType", "sourceReferenceId", "checksum");
CREATE INDEX "AIKnowledgeSourceRecord_indexKey_status_idx" ON "AIKnowledgeSourceRecord"("indexKey", "status");

CREATE TABLE "AIEmbeddingRecord" (
  "id" TEXT NOT NULL, "indexKey" TEXT NOT NULL, "sourceReferenceId" TEXT NOT NULL,
  "chunkKey" TEXT NOT NULL, "chunkText" TEXT NOT NULL, "embeddingRef" TEXT NOT NULL,
  "modelKey" TEXT NOT NULL, "dimensions" INTEGER NOT NULL, "checksum" TEXT NOT NULL,
  "metadata" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AIEmbeddingRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AIEmbeddingRecord_indexKey_sourceReferenceId_chunkKey_checksum_key" ON "AIEmbeddingRecord"("indexKey", "sourceReferenceId", "chunkKey", "checksum");
CREATE INDEX "AIEmbeddingRecord_indexKey_modelKey_idx" ON "AIEmbeddingRecord"("indexKey", "modelKey");

CREATE TABLE "AIIndexingRunRecord" (
  "id" TEXT NOT NULL, "publicId" TEXT NOT NULL, "indexKey" TEXT NOT NULL,
  "sourceReferenceId" TEXT NOT NULL, "status" TEXT NOT NULL,
  "chunks" INTEGER NOT NULL DEFAULT 0, "embeddedChunks" INTEGER NOT NULL DEFAULT 0,
  "errorMessage" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3), CONSTRAINT "AIIndexingRunRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AIIndexingRunRecord_publicId_key" ON "AIIndexingRunRecord"("publicId");
CREATE INDEX "AIIndexingRunRecord_indexKey_status_createdAt_idx" ON "AIIndexingRunRecord"("indexKey", "status", "createdAt");
CREATE INDEX "AIIndexingRunRecord_sourceReferenceId_idx" ON "AIIndexingRunRecord"("sourceReferenceId");

CREATE TABLE "AIIncidentEventRecord" (
  "id" TEXT NOT NULL, "incidentPublicId" TEXT NOT NULL, "action" TEXT NOT NULL,
  "actorReferenceId" TEXT, "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AIIncidentEventRecord_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AIIncidentEventRecord_incidentPublicId_createdAt_idx" ON "AIIncidentEventRecord"("incidentPublicId", "createdAt");
