-- Disposable-environment rollback companion for ABSH-AUD-0007 migration verification.
DROP TABLE IF EXISTS "BackgroundJobDeadLetterRecord";
DROP TABLE IF EXISTS "BackgroundJobExecutionRecord";
DROP TABLE IF EXISTS "BackgroundJobRecord";
