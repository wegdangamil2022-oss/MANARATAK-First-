-- MANARATAK_MIGRATION_OWNER: student
-- MANARATAK_MIGRATION_SCOPE: owner_only
-- MANARATAK_ARCH_DECISION: ADR-028

-- W5 / MNT-AUD-0074: P15 private scholarship application tracker.
-- Ownership: Student Workspace / Phase 15. Scholarship facts remain owned by Phase 12.
CREATE TABLE "StudentApplicationTracker" (
  "id" TEXT NOT NULL, "studentReferenceId" TEXT NOT NULL, "scholarshipId" TEXT NOT NULL, "scholarshipSlug" TEXT,
  "stage" TEXT NOT NULL DEFAULT 'PREPARING_DOCUMENTS', "notes" TEXT, "deadlineAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'ACTIVE', "version" INTEGER NOT NULL DEFAULT 1, "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudentApplicationTracker_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "StudentApplicationChecklistItem" (
  "id" TEXT NOT NULL, "trackerId" TEXT NOT NULL, "label" TEXT NOT NULL, "completed" BOOLEAN NOT NULL DEFAULT false,
  "position" INTEGER NOT NULL, "completedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudentApplicationChecklistItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StudentApplicationTracker_studentReferenceId_scholarshipId_key" ON "StudentApplicationTracker"("studentReferenceId", "scholarshipId");
CREATE INDEX "StudentApplicationTracker_studentReferenceId_status_updatedAt_idx" ON "StudentApplicationTracker"("studentReferenceId", "status", "updatedAt");
CREATE INDEX "StudentApplicationTracker_deadlineAt_status_idx" ON "StudentApplicationTracker"("deadlineAt", "status");
CREATE UNIQUE INDEX "StudentApplicationChecklistItem_trackerId_position_key" ON "StudentApplicationChecklistItem"("trackerId", "position");
CREATE INDEX "StudentApplicationChecklistItem_trackerId_completed_idx" ON "StudentApplicationChecklistItem"("trackerId", "completed");
ALTER TABLE "StudentApplicationTracker" ADD CONSTRAINT "StudentApplicationTracker_studentReferenceId_fkey" FOREIGN KEY ("studentReferenceId") REFERENCES "StudentWorkspace"("studentReferenceId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentApplicationChecklistItem" ADD CONSTRAINT "StudentApplicationChecklistItem_trackerId_fkey" FOREIGN KEY ("trackerId") REFERENCES "StudentApplicationTracker"("id") ON DELETE CASCADE ON UPDATE CASCADE;
