-- MANARATAK_MIGRATION_OWNER: foundation_control_plane
-- MANARATAK_MIGRATION_SCOPE: owner_only
-- MANARATAK_ARCH_DECISION: ADR-028

CREATE TABLE "ApiSearchRequestRecord" (
  "id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "query" TEXT NOT NULL,
  "filters" JSONB NOT NULL,
  "logicalOperator" TEXT NOT NULL,
  "page" INTEGER NOT NULL,
  "limit" INTEGER NOT NULL,
  "sortField" TEXT,
  "sortDirection" TEXT,
  "state" TEXT NOT NULL,
  "totalCount" INTEGER,
  "executionTimeMs" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApiSearchRequestRecord_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ApiSearchRequestRecord_reference_createdAt_idx" ON "ApiSearchRequestRecord"("reference", "createdAt");
CREATE INDEX "ApiSearchRequestRecord_scope_createdAt_idx" ON "ApiSearchRequestRecord"("scope", "createdAt");
CREATE INDEX "ApiSearchRequestRecord_createdAt_idx" ON "ApiSearchRequestRecord"("createdAt");
