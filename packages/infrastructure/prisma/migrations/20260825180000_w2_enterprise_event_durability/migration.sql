-- W2 source-only migration: durable Enterprise Event Foundation persistence.
-- Apply only during the controlled Google Studio runtime migration gate.
CREATE TABLE "EnterpriseEventRecord" (
  "id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "ownerReference" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "payloadMetadata" JSONB NOT NULL,
  "version" TEXT NOT NULL,
  "metadata" JSONB NOT NULL,
  "correlationReference" TEXT,
  "causationReference" TEXT,
  "lifecycleState" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EnterpriseEventRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EnterpriseEventRecord_reference_key"
ON "EnterpriseEventRecord"("reference");

CREATE INDEX "EnterpriseEventRecord_ownerReference_idx"
ON "EnterpriseEventRecord"("ownerReference");

CREATE INDEX "EnterpriseEventRecord_eventType_lifecycleState_idx"
ON "EnterpriseEventRecord"("eventType", "lifecycleState");

CREATE INDEX "EnterpriseEventRecord_lifecycleState_idx"
ON "EnterpriseEventRecord"("lifecycleState");
