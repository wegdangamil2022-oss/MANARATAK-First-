-- Source only. No application to an existing database, fake checkpoint, or legacy result backfill.
CREATE TABLE "CourseProviderHealthCheckpoint" (
 "providerId" TEXT PRIMARY KEY, "cursor" TEXT, "cycle" INTEGER NOT NULL DEFAULT 0,
 "scanned" INTEGER NOT NULL DEFAULT 0, "leaseToken" TEXT, "leaseExpiresAt" TIMESTAMP(3),
 "completedAt" TIMESTAMP(3), "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "CourseProviderHealthRetry" (
 "id" TEXT PRIMARY KEY, "providerId" TEXT NOT NULL, "courseId" TEXT NOT NULL,
 "url" TEXT NOT NULL, "urlHash" TEXT NOT NULL, "attempts" INTEGER NOT NULL DEFAULT 0,
 "state" TEXT NOT NULL, "nextAttemptAt" TIMESTAMP(3), "reviewedBy" TEXT, "reviewReason" TEXT, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "CourseProviderHealthRetry_providerId_courseId_urlHash_key" ON "CourseProviderHealthRetry"("providerId","courseId","urlHash");
CREATE INDEX "CourseProviderHealthRetry_providerId_state_nextAttemptAt_id_idx" ON "CourseProviderHealthRetry"("providerId","state","nextAttemptAt","id");
