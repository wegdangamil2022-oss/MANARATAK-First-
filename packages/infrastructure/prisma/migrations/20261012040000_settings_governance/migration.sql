-- Source preparation only. No live database migration or backfill performed.
ALTER TABLE "SettingDefinitionRecord" ADD COLUMN "consumerDomain" TEXT, ADD COLUMN "lastChangedBy" TEXT;
CREATE TABLE "SettingsGovernanceRecord" (
 "id" TEXT PRIMARY KEY, "kind" TEXT NOT NULL, "revision" INTEGER NOT NULL DEFAULT 1,
 "payload" JSONB NOT NULL, "createdBy" TEXT NOT NULL, "approverId" TEXT,
 "approvedAt" TIMESTAMP(3), "consumedAt" TIMESTAMP(3), "expiresAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "SettingsGovernanceRecord_namespace" CHECK (("kind"='DEPENDENCIES' AND "id"='dependencies') OR ("kind"='PROPOSAL' AND "id" LIKE 'change-set:%'))
);
CREATE INDEX "SettingsGovernanceRecord_kind_createdAt_id_idx" ON "SettingsGovernanceRecord"("kind","createdAt","id");
