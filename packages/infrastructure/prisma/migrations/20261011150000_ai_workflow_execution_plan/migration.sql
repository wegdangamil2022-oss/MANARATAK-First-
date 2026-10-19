-- ABSHEER_MIGRATION_OWNER: ai
-- ABSHEER_MIGRATION_SCOPE: owner_only
-- ABSHEER_ARCH_DECISION: ADR-028
-- SOURCE ONLY: do not apply before the post-section-28 disposable rollout.
-- Expand-only. Legacy runs remain unowned and cannot execute under the new gate.
ALTER TABLE "AIWorkflowRunRecord" ADD COLUMN "requesterReferenceId" TEXT;
ALTER TABLE "AIWorkflowRunRecord" ADD COLUMN "executionPlan" JSONB;
