-- W11 Student Platform source-only migration.
-- DO NOT APPLY outside the Google Studio runtime/database recovery gate.
-- Runtime sequence: backup -> read-only collision/integrity checks -> migration dry-run -> deploy -> verify -> rollback proof.

CREATE TABLE "StudentPrivacyConsentDecision" (
  "id" TEXT NOT NULL,
  "studentReferenceId" TEXT NOT NULL,
  "workspaceVersion" INTEGER NOT NULL,
  "actorId" TEXT NOT NULL,
  "actorType" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "beforePreferences" JSONB NOT NULL,
  "afterPreferences" JSONB NOT NULL,
  "changedFields" JSONB NOT NULL,
  "correlationId" TEXT,
  "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudentPrivacyConsentDecision_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StudentPrivacyConsentDecision_studentReferenceId_fkey"
    FOREIGN KEY ("studentReferenceId") REFERENCES "StudentWorkspace"("studentReferenceId") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "StudentPrivacyConsentDecision_studentReferenceId_decidedAt_idx"
  ON "StudentPrivacyConsentDecision"("studentReferenceId", "decidedAt");
CREATE INDEX "StudentPrivacyConsentDecision_actorId_decidedAt_idx"
  ON "StudentPrivacyConsentDecision"("actorId", "decidedAt");

CREATE TABLE "StudentPersonalStatistics" (
  "id" TEXT NOT NULL,
  "studentReferenceId" TEXT NOT NULL,
  "savedItems" INTEGER NOT NULL DEFAULT 0,
  "activeCourses" INTEGER NOT NULL DEFAULT 0,
  "completedCourses" INTEGER NOT NULL DEFAULT 0,
  "averageCourseProgress" INTEGER NOT NULL DEFAULT 0,
  "certificates" INTEGER NOT NULL DEFAULT 0,
  "unreadNotifications" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudentPersonalStatistics_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StudentPersonalStatistics_studentReferenceId_key" UNIQUE ("studentReferenceId"),
  CONSTRAINT "StudentPersonalStatistics_studentReferenceId_fkey"
    FOREIGN KEY ("studentReferenceId") REFERENCES "StudentWorkspace"("studentReferenceId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Backfill exact statistics from full projections. This does not infer or alter consent.
INSERT INTO "StudentPersonalStatistics" (
  "id", "studentReferenceId", "savedItems", "activeCourses", "completedCourses",
  "averageCourseProgress", "certificates", "unreadNotifications", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  w."studentReferenceId",
  (SELECT COUNT(*)::int FROM "StudentSavedItem" s WHERE s."studentReferenceId" = w."studentReferenceId"),
  (SELECT COUNT(*)::int FROM "StudentLearningProjection" l WHERE l."studentReferenceId" = w."studentReferenceId" AND l."status" IN ('ACTIVE','IN_PROGRESS')),
  (SELECT COUNT(*)::int FROM "StudentLearningProjection" l WHERE l."studentReferenceId" = w."studentReferenceId" AND l."status" = 'COMPLETED'),
  COALESCE((SELECT ROUND(AVG(l."progressPercentage"))::int FROM "StudentLearningProjection" l WHERE l."studentReferenceId" = w."studentReferenceId"), 0),
  (SELECT COUNT(*)::int FROM "StudentCertificateReadProjection" c WHERE c."studentReferenceId" = w."studentReferenceId"),
  (SELECT COUNT(*)::int FROM "StudentNotificationProjection" n WHERE n."studentReferenceId" = w."studentReferenceId" AND n."readAt" IS NULL),
  CURRENT_TIMESTAMP
FROM "StudentWorkspace" w
ON CONFLICT ("studentReferenceId") DO NOTHING;

-- Existing privacy JSON is historical state, not retroactive consent evidence.
-- No StudentPrivacyConsentDecision rows are fabricated during backfill.
