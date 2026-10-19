CREATE TABLE "AuditWorkspaceRecord" (
 "id" TEXT PRIMARY KEY, "kind" TEXT NOT NULL, "version" INTEGER NOT NULL,
 "data" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "AuditWorkspaceRecord_kind_check" CHECK ("kind" IN ('CASE','ALERT_RULE','RETENTION_POLICY')),
 CONSTRAINT "AuditWorkspaceRecord_namespace_check" CHECK (("kind"='CASE' AND "id" LIKE 'audit-case:%') OR ("kind"='ALERT_RULE' AND "id" LIKE 'audit-alert:%') OR ("kind"='RETENTION_POLICY' AND "id"='audit-retention-policy')),
 CONSTRAINT "AuditWorkspaceRecord_version_check" CHECK ("version" > 0)
);
CREATE INDEX "AuditWorkspaceRecord_kind_id_idx" ON "AuditWorkspaceRecord"("kind", "id");
CREATE TABLE "AuditAlertOccurrenceRecord" (
 "id" TEXT PRIMARY KEY, "ruleId" TEXT NOT NULL, "ruleVersion" INTEGER NOT NULL,
 "bucket" TIMESTAMP(3) NOT NULL, "matchedCount" INTEGER NOT NULL,
 "state" TEXT NOT NULL DEFAULT 'PENDING', "claimToken" TEXT, "claimUntil" TIMESTAMP(3),
 "intentId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "AuditAlertOccurrenceRecord_state_check" CHECK ("state" IN ('PENDING','DELIVERING','INTENT_CREATED','FAILED','CANCELLED'))
);
CREATE UNIQUE INDEX "AuditAlertOccurrenceRecord_intentId_key" ON "AuditAlertOccurrenceRecord"("intentId");
CREATE UNIQUE INDEX "AuditAlertOccurrenceRecord_ruleId_ruleVersion_bucket_key" ON "AuditAlertOccurrenceRecord"("ruleId", "ruleVersion", "bucket");
CREATE INDEX "AuditAlertOccurrenceRecord_state_claimUntil_idx" ON "AuditAlertOccurrenceRecord"("state", "claimUntil");

CREATE INDEX "PolicyRecord_ruleType_id_idx" ON "PolicyRecord"("ruleType","id");

-- Native envelope covers every trusted INSERT, including legacy owner writers.
-- No existing event is updated. Missing class durations retain events indefinitely.
CREATE OR REPLACE FUNCTION absheer_assign_audit_retention() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  policy jsonb;
  durations jsonb := '{}'::jsonb;
  retention_class text;
  selected_days integer;
  entry record;
  metadata jsonb;
  policy_status text;
BEGIN
  SELECT data INTO policy FROM "AuditWorkspaceRecord" WHERE id='audit-retention-policy' AND kind='RETENTION_POLICY';
  IF policy IS NOT NULL THEN durations := policy->'durations'; END IF;
  IF durations IS NULL OR jsonb_typeof(durations)<>'object' THEN RAISE EXCEPTION 'AUDIT_RETENTION_POLICY_INVALID'; END IF;
  FOR entry IN SELECT * FROM jsonb_each(durations) LOOP
    IF entry.key NOT IN ('SECURITY_CRITICAL','FINANCIAL','IDENTITY_ACCESS','AUTHENTICATION','STANDARD_ADMIN') OR
       jsonb_typeof(entry.value)<>'number' OR (entry.value::text)::numeric<>trunc((entry.value::text)::numeric) OR
       (entry.value::text)::numeric<1 OR (entry.value::text)::numeric>365000 THEN
      RAISE EXCEPTION 'AUDIT_RETENTION_DURATION_INVALID';
    END IF;
  END LOOP;
  retention_class := CASE
    WHEN jsonb_typeof(NEW."complianceMetadata")='array' AND NEW."complianceMetadata" ? 'SECURITY_CRITICAL' THEN 'SECURITY_CRITICAL'
    WHEN upper(NEW.category) ~ 'FINANC(E|IAL)' THEN 'FINANCIAL'
    WHEN upper(NEW.category) ~ 'IDENTITY|AUTHORIZATION|CREDENTIAL' THEN 'IDENTITY_ACCESS'
    WHEN upper(NEW.category) ~ 'AUTHENTICATION|^AUTH$' THEN 'AUTHENTICATION'
    WHEN NEW.severity='CRITICAL' OR upper(NEW.category)='CRITICAL_MUTATION' THEN 'SECURITY_CRITICAL'
    ELSE 'STANDARD_ADMIN' END;
  metadata := CASE WHEN jsonb_typeof(NEW."contextMetadata")='object' THEN NEW."contextMetadata"
    ELSE jsonb_build_object('legacyContext',NEW."contextMetadata") END;
  -- A repository-resolved policy value is re-read at INSERT; it is not reclassified as an owner override.
  IF NEW."retentionPeriodInDays" IS NOT NULL AND metadata->>'retentionPolicyStatus' IS DISTINCT FROM 'APPROVED_POLICY' THEN
    selected_days := NEW."retentionPeriodInDays"; policy_status := 'EXPLICIT_OWNER_DURATION';
  ELSE
    selected_days := (durations->>retention_class)::integer;
    policy_status := CASE WHEN selected_days IS NULL THEN 'UNCONFIGURED_RETAIN' ELSE 'APPROVED_POLICY' END;
  END IF;
  IF selected_days IS NOT NULL AND (selected_days<1 OR selected_days>365000) THEN RAISE EXCEPTION 'AUDIT_RETENTION_DURATION_INVALID'; END IF;
  NEW."retentionPeriodInDays" := selected_days;
  NEW."retentionExpiresAt" := CASE WHEN selected_days IS NULL THEN NULL ELSE NEW.timestamp + make_interval(days=>selected_days) END;
  NEW."contextMetadata" := metadata || jsonb_build_object('retentionClass',retention_class,'retentionPolicyStatus',policy_status);
  RETURN NEW;
END;
$$;
CREATE TRIGGER "audit_retention_envelope" BEFORE INSERT ON "AuditRecord"
FOR EACH ROW EXECUTE FUNCTION absheer_assign_audit_retention();
