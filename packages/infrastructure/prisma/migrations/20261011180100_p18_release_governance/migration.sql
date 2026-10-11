-- MANARATAK_MIGRATION_OWNER: student_tools
-- MANARATAK_MIGRATION_SCOPE: owner_only
-- MANARATAK_ARCH_DECISION: ADR-028
-- SOURCE ONLY / UNAPPLIED: legacy definitions have no author or approval and cannot be newly activated.
ALTER TABLE "StudentToolDefinitionRecord" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "StudentToolDefinitionRecord" ADD COLUMN "lastModifiedBy" TEXT;
ALTER TABLE "StudentToolDefinitionRecord" ADD COLUMN "releaseApproval" JSONB;
