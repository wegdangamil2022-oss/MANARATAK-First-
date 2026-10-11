-- MANARATAK_MIGRATION_OWNER: cms
-- MANARATAK_MIGRATION_SCOPE: owner_only
-- MANARATAK_ARCH_DECISION: ADR-028
-- Source-only migration; apply only under Post-28 runtime change control.
-- Historical approvals have NULL digest and must be resubmitted/reapproved.
ALTER TABLE "CmsWorkflowReview" ADD COLUMN "reviewSnapshotHash" TEXT;
