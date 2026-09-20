-- W12 source-only migration: AI governance and execution safety.
-- Runtime application/backfill evidence is deferred to Google Studio.
-- Expand-first: legacy evaluation/workflow rows remain readable but can never satisfy the new exact-target gates without governed evidence.

CREATE TABLE "AICapabilityPromptBindingRecord" (
  "id" TEXT NOT NULL,
  "capabilityKey" TEXT NOT NULL,
  "promptKey" TEXT NOT NULL,
  "promptVersion" INTEGER NOT NULL,
  "boundBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AICapabilityPromptBindingRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AICapabilityPromptBindingRecord_capabilityKey_key"
  ON "AICapabilityPromptBindingRecord"("capabilityKey");
CREATE INDEX "AICapabilityPromptBindingRecord_promptKey_promptVersion_idx"
  ON "AICapabilityPromptBindingRecord"("promptKey", "promptVersion");
ALTER TABLE "AICapabilityPromptBindingRecord"
  ADD CONSTRAINT "AICapabilityPromptBindingRecord_promptKey_promptVersion_fkey"
  FOREIGN KEY ("promptKey", "promptVersion") REFERENCES "AIPromptVersionRecord"("promptKey", "version")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Fail closed before deriving bindings from legacy ACTIVE prompt registry rows.
DO $$
BEGIN
  IF EXISTS (
    SELECT "capabilityKey"
    FROM "AIRegistryRecord"
    WHERE "resourceType" = 'prompts' AND "status" = 'ACTIVE' AND "capabilityKey" IS NOT NULL
    GROUP BY "capabilityKey"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'W12_PROMPT_CAPABILITY_BINDING_COLLISION';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "AIRegistryRecord" r
    WHERE r."resourceType" = 'prompts'
      AND r."status" = 'ACTIVE'
      AND r."capabilityKey" IS NOT NULL
      AND COALESCE(r."configuration"->>'activeVersion', '') !~ '^[1-9][0-9]*$'
  ) THEN
    RAISE EXCEPTION 'W12_ACTIVE_PROMPT_VERSION_MISSING';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "AIRegistryRecord" r
    LEFT JOIN "AIPromptVersionRecord" v
      ON v."promptKey" = r."key"
     AND v."version" = (r."configuration"->>'activeVersion')::INTEGER
    WHERE r."resourceType" = 'prompts'
      AND r."status" = 'ACTIVE'
      AND r."capabilityKey" IS NOT NULL
      AND v."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'W12_ACTIVE_PROMPT_VERSION_NOT_FOUND';
  END IF;
END $$;

INSERT INTO "AICapabilityPromptBindingRecord"
  ("id", "capabilityKey", "promptKey", "promptVersion", "boundBy", "createdAt", "updatedAt")
SELECT
  'w12-binding-' || md5(r."capabilityKey"),
  r."capabilityKey",
  r."key",
  (r."configuration"->>'activeVersion')::INTEGER,
  r."updatedBy",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "AIRegistryRecord" r
WHERE r."resourceType" = 'prompts'
  AND r."status" = 'ACTIVE'
  AND r."capabilityKey" IS NOT NULL;

CREATE TABLE "AIQuotaReservationRecord" (
  "id" TEXT NOT NULL,
  "reservationKey" TEXT NOT NULL,
  "executionPublicId" TEXT NOT NULL,
  "consumerKey" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'RESERVED',
  "reservedTokens" INTEGER NOT NULL,
  "reservedCost" DECIMAL(18,8) NOT NULL,
  "actualTokens" INTEGER,
  "actualCost" DECIMAL(18,8),
  "currency" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AIQuotaReservationRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AIQuotaReservationRecord_reservationKey_key"
  ON "AIQuotaReservationRecord"("reservationKey");
CREATE UNIQUE INDEX "AIQuotaReservationRecord_executionPublicId_key"
  ON "AIQuotaReservationRecord"("executionPublicId");
CREATE INDEX "AIQuotaReservationRecord_consumerKey_createdAt_idx"
  ON "AIQuotaReservationRecord"("consumerKey", "createdAt");
CREATE INDEX "AIQuotaReservationRecord_consumerKey_status_createdAt_idx"
  ON "AIQuotaReservationRecord"("consumerKey", "status", "createdAt");

CREATE TABLE "AIProviderCircuitRecord" (
  "key" TEXT NOT NULL,
  "failures" INTEGER NOT NULL DEFAULT 0,
  "state" TEXT NOT NULL DEFAULT 'CLOSED',
  "openedAt" TIMESTAMP(3),
  "probeLeaseAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AIProviderCircuitRecord_pkey" PRIMARY KEY ("key")
);

ALTER TABLE "AIAsyncJobRecord" ADD COLUMN "leaseExpiresAt" TIMESTAMP(3);

CREATE TABLE "AIWorkflowVersionRecord" (
  "id" TEXT NOT NULL,
  "workflowKey" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "checksum" TEXT NOT NULL,
  "definition" JSONB NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AIWorkflowVersionRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AIWorkflowVersionRecord_workflowKey_version_key"
  ON "AIWorkflowVersionRecord"("workflowKey", "version");
CREATE INDEX "AIWorkflowVersionRecord_workflowKey_createdAt_idx"
  ON "AIWorkflowVersionRecord"("workflowKey", "createdAt");

ALTER TABLE "AIWorkflowStepRunRecord" ADD COLUMN "outputSnapshot" JSONB;

-- Legacy runs intentionally remain without target evidence. They cannot pass the W12 deployment gate.
ALTER TABLE "AIEvaluationRunRecord"
  ADD COLUMN "targetType" TEXT,
  ADD COLUMN "targetKey" TEXT,
  ADD COLUMN "targetVersion" INTEGER,
  ADD COLUMN "targetChecksum" TEXT,
  ADD COLUMN "targetEvidence" JSONB;
CREATE INDEX "AIEvaluationRunRecord_targetType_targetKey_targetVersion_completedAt_idx"
  ON "AIEvaluationRunRecord"("targetType", "targetKey", "targetVersion", "completedAt");

-- No DB mutation/backfill beyond deterministic active-prompt binding is authorized here.
-- Workflow version activation, legacy evaluation reconciliation, provider circuit/quota runtime proof,
-- and migration deployment remain PENDING_GOOGLE_STUDIO.
