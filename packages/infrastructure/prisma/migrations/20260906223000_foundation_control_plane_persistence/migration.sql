-- MANARATAK_MIGRATION_OWNER: foundation_control_plane
-- MANARATAK_MIGRATION_SCOPE: owner_only
-- MANARATAK_ARCH_DECISION: ADR-028
-- MNT-AUD-0049: durable persistence for mounted Phase 05 control-plane aggregates.

CREATE TABLE "WorkflowControlRecord" (
  "id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "ownerReference" TEXT NOT NULL,
  "lifecycleState" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkflowControlRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WorkflowControlRecord_reference_key" ON "WorkflowControlRecord"("reference");
CREATE INDEX "WorkflowControlRecord_ownerReference_idx" ON "WorkflowControlRecord"("ownerReference");
CREATE INDEX "WorkflowControlRecord_lifecycleState_idx" ON "WorkflowControlRecord"("lifecycleState");

CREATE TABLE "ApiServiceControlRecord" (
  "id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "ownerReference" TEXT NOT NULL,
  "lifecycleState" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApiServiceControlRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ApiServiceControlRecord_reference_key" ON "ApiServiceControlRecord"("reference");
CREATE INDEX "ApiServiceControlRecord_ownerReference_idx" ON "ApiServiceControlRecord"("ownerReference");
CREATE INDEX "ApiServiceControlRecord_lifecycleState_idx" ON "ApiServiceControlRecord"("lifecycleState");

CREATE TABLE "SharedComponentControlRecord" (
  "id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "ownerReference" TEXT NOT NULL,
  "lifecycleState" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SharedComponentControlRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SharedComponentControlRecord_reference_version_key" ON "SharedComponentControlRecord"("reference", "version");
CREATE INDEX "SharedComponentControlRecord_reference_idx" ON "SharedComponentControlRecord"("reference");
CREATE INDEX "SharedComponentControlRecord_ownerReference_idx" ON "SharedComponentControlRecord"("ownerReference");
CREATE INDEX "SharedComponentControlRecord_lifecycleState_idx" ON "SharedComponentControlRecord"("lifecycleState");

CREATE TABLE "WorkflowExecutionProjection" (
  "workflowReference" TEXT NOT NULL,
  "executionCount" INTEGER NOT NULL DEFAULT 0,
  "lastExecutedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkflowExecutionProjection_pkey" PRIMARY KEY ("workflowReference")
);

CREATE TABLE "ApiServiceExposureProjection" (
  "serviceReference" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "lifecycleState" TEXT NOT NULL,
  "exposureIntent" JSONB NOT NULL,
  "exposedAt" TIMESTAMP(3),
  "decommissionedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApiServiceExposureProjection_pkey" PRIMARY KEY ("serviceReference")
);

CREATE TABLE "SharedComponentRenderingProjection" (
  "componentReference" TEXT NOT NULL,
  "componentId" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "lifecycleState" TEXT NOT NULL,
  "definition" JSONB NOT NULL,
  "renderingIntent" JSONB NOT NULL,
  "synchronizedAt" TIMESTAMP(3),
  "decommissionedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SharedComponentRenderingProjection_pkey" PRIMARY KEY ("componentReference")
);
