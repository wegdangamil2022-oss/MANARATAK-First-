-- MANARATAK_MIGRATION_OWNER: shared-services-career
-- MANARATAK_MIGRATION_SCOPE: cross_context_approved
-- MANARATAK_ARCH_DECISION: ADR-028
-- MNT-AUD-0096: version fencing for mutable Phase 20/21 admin-managed aggregates.

ALTER TABLE "ServiceCatalogRecord" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "ServiceRequestRecord" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "CareerEmployerRecord" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "CareerJobPostingRecord" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

CREATE UNIQUE INDEX "ServiceCatalogRecord_id_version_key" ON "ServiceCatalogRecord"("id", "version");
CREATE UNIQUE INDEX "ServiceRequestRecord_id_version_key" ON "ServiceRequestRecord"("id", "version");
CREATE UNIQUE INDEX "CareerEmployerRecord_id_version_key" ON "CareerEmployerRecord"("id", "version");
CREATE UNIQUE INDEX "CareerJobPostingRecord_id_version_key" ON "CareerJobPostingRecord"("id", "version");
