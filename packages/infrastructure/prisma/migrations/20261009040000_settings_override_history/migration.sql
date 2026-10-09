-- Source-only plan: no target database execution authorized.
-- Drain old Settings writers/readers first: old versions ignore CLEAR_OVERRIDE.
ALTER TABLE "SettingVersionRecord"
  ADD COLUMN "operation" TEXT NOT NULL DEFAULT 'SET',
  ADD COLUMN "changeReason" TEXT;
ALTER TABLE "SettingVersionRecord" ADD CONSTRAINT "SettingVersionRecord_operation_check"
  CHECK ("operation" IN ('SET', 'CLEAR_OVERRIDE'));
ALTER TABLE "SettingVersionRecord" ADD CONSTRAINT "SettingVersionRecord_clear_reason_check"
  CHECK ("operation" <> 'CLEAR_OVERRIDE' OR
    ("changeReason" IS NOT NULL AND length(btrim("changeReason")) BETWEEN 3 AND 1000));
