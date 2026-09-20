-- MANARATAK_MIGRATION_OWNER: identity
-- MANARATAK_MIGRATION_SCOPE: owner_only
-- MANARATAK_ARCH_DECISION: ADR-028

CREATE TABLE "AdminEmergencyAccessRecord" (
  "id" TEXT NOT NULL,
  "principalId" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "changeTicket" TEXT NOT NULL,
  "requestedBy" TEXT NOT NULL,
  "approvedBy" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "revokedBy" TEXT,
  "revocationReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdminEmergencyAccessRecord_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AdminEmergencyAccessRecord_principalId_expiresAt_idx" ON "AdminEmergencyAccessRecord"("principalId", "expiresAt");
CREATE INDEX "AdminEmergencyAccessRecord_roleId_expiresAt_idx" ON "AdminEmergencyAccessRecord"("roleId", "expiresAt");
CREATE INDEX "AdminEmergencyAccessRecord_revokedAt_expiresAt_idx" ON "AdminEmergencyAccessRecord"("revokedAt", "expiresAt");
