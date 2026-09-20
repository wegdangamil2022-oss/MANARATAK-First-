-- MANARATAK_MIGRATION_OWNER: background_jobs
-- MANARATAK_MIGRATION_SCOPE: owner_only
-- MANARATAK_ARCH_DECISION: ADR-028
-- MNT-AUD-0007: PostgreSQL-backed durable background worker foundation.
-- Source migration only. Apply only through the approved database remediation/provisioning gates.
CREATE TABLE "BackgroundJobRecord" (
  "id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "jobType" TEXT NOT NULL,
  "parameters" JSONB NOT NULL,
  "ownerReference" TEXT,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "runAt" TIMESTAMP(3),
  "cronExpression" TEXT,
  "timeoutSeconds" INTEGER NOT NULL DEFAULT 300,
  "concurrentLimit" INTEGER,
  "maxAttempts" INTEGER NOT NULL DEFAULT 1,
  "backoffType" TEXT NOT NULL DEFAULT 'exponential',
  "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
  "attempt" INTEGER NOT NULL DEFAULT 0,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leasedBy" TEXT,
  "leaseToken" TEXT,
  "leaseUntil" TIMESTAMP(3),
  "heartbeatAt" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "lastCompletedAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "lastErrorCode" TEXT,
  "lastErrorText" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BackgroundJobRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BackgroundJobExecutionRecord" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "jobReference" TEXT NOT NULL,
  "attempt" INTEGER NOT NULL,
  "workerId" TEXT NOT NULL,
  "leaseToken" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "heartbeatAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "outcome" TEXT NOT NULL DEFAULT 'RUNNING',
  "errorCode" TEXT,
  "errorText" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BackgroundJobExecutionRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BackgroundJobDeadLetterRecord" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "jobReference" TEXT NOT NULL,
  "jobType" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "attempt" INTEGER NOT NULL,
  "errorCode" TEXT NOT NULL,
  "errorText" TEXT NOT NULL,
  "failedAt" TIMESTAMP(3) NOT NULL,
  "replayedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BackgroundJobDeadLetterRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BackgroundJobRecord_reference_key" ON "BackgroundJobRecord"("reference");
CREATE INDEX "BackgroundJobRecord_status_availableAt_priority_idx" ON "BackgroundJobRecord"("status", "availableAt", "priority");
CREATE INDEX "BackgroundJobRecord_leaseUntil_idx" ON "BackgroundJobRecord"("leaseUntil");
CREATE INDEX "BackgroundJobRecord_jobType_status_idx" ON "BackgroundJobRecord"("jobType", "status");
CREATE INDEX "BackgroundJobRecord_ownerReference_idx" ON "BackgroundJobRecord"("ownerReference");
CREATE UNIQUE INDEX "BackgroundJobExecutionRecord_leaseToken_key" ON "BackgroundJobExecutionRecord"("leaseToken");
CREATE INDEX "BackgroundJobExecutionRecord_jobReference_attempt_idx" ON "BackgroundJobExecutionRecord"("jobReference", "attempt");
CREATE INDEX "BackgroundJobExecutionRecord_outcome_startedAt_idx" ON "BackgroundJobExecutionRecord"("outcome", "startedAt");
CREATE INDEX "BackgroundJobExecutionRecord_jobReference_startedAt_idx" ON "BackgroundJobExecutionRecord"("jobReference", "startedAt");
CREATE UNIQUE INDEX "BackgroundJobDeadLetterRecord_jobReference_key" ON "BackgroundJobDeadLetterRecord"("jobReference");
CREATE INDEX "BackgroundJobDeadLetterRecord_failedAt_idx" ON "BackgroundJobDeadLetterRecord"("failedAt");
CREATE INDEX "BackgroundJobDeadLetterRecord_jobType_failedAt_idx" ON "BackgroundJobDeadLetterRecord"("jobType", "failedAt");

ALTER TABLE "BackgroundJobExecutionRecord" ADD CONSTRAINT "BackgroundJobExecutionRecord_jobReference_fkey"
  FOREIGN KEY ("jobReference") REFERENCES "BackgroundJobRecord"("reference") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BackgroundJobDeadLetterRecord" ADD CONSTRAINT "BackgroundJobDeadLetterRecord_jobReference_fkey"
  FOREIGN KEY ("jobReference") REFERENCES "BackgroundJobRecord"("reference") ON DELETE CASCADE ON UPDATE CASCADE;
