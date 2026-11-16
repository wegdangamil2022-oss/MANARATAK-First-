-- MANARATAK_MIGRATION_OWNER: learning
-- MANARATAK_MIGRATION_SCOPE: owner_only
-- MANARATAK_ARCH_DECISION: ADR-028
-- Forward reconciliation of 20261013040000_course_source_approvals; source only, not executed.
CREATE TABLE "CourseSourceApproval" ("id" TEXT PRIMARY KEY, "courseId" TEXT NOT NULL REFERENCES "Course"("id") ON DELETE RESTRICT, "courseVersion" INTEGER NOT NULL CHECK ("courseVersion">0), "providerId" TEXT NOT NULL, "providerRevision" TIMESTAMP(3) NOT NULL, "reviewedBy" TEXT NOT NULL, "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "reason" TEXT NOT NULL, "facts" JSONB NOT NULL, "factsHash" TEXT NOT NULL, "evidenceUrls" JSONB NOT NULL);
CREATE INDEX "CourseSourceApproval_courseId_courseVersion_reviewedAt_idx" ON "CourseSourceApproval"("courseId","courseVersion","reviewedAt");
-- Append-only source proof; no legacy approval fabricated or backfilled.
