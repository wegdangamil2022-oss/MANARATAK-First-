-- MANARATAK_MIGRATION_OWNER: foundation_control_plane
-- MANARATAK_MIGRATION_SCOPE: owner_only
-- MANARATAK_ARCH_DECISION: ADR-028

CREATE TABLE "ApiIdempotencyRecord" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "scopeHash" TEXT NOT NULL,
  "principalId" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "routeKey" TEXT NOT NULL,
  "keyHash" TEXT NOT NULL,
  "requestFingerprint" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "statusCode" INTEGER,
  "responseBody" JSONB,
  "leaseToken" TEXT,
  "leaseExpiresAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApiIdempotencyRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ApiIdempotencyRecord_scopeHash_key" ON "ApiIdempotencyRecord"("scopeHash");
CREATE INDEX "ApiIdempotencyRecord_expiresAt_idx" ON "ApiIdempotencyRecord"("expiresAt");
CREATE INDEX "ApiIdempotencyRecord_principalId_createdAt_idx" ON "ApiIdempotencyRecord"("principalId", "createdAt");
