-- ABSHEER_MIGRATION_OWNER: cms
-- ABSHEER_MIGRATION_SCOPE: owner_only
-- ABSHEER_ARCH_DECISION: ADR-028
-- Source-only migration; apply only under Post-28 runtime change control.
-- Historical approvals have NULL digest and must be resubmitted/reapproved.
ALTER TABLE "CmsWorkflowReview" ADD COLUMN "reviewSnapshotHash" TEXT;
