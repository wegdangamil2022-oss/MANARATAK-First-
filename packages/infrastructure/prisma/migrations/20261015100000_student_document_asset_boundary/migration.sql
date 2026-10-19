-- ABSHEER_MIGRATION_OWNER: cross_context
-- ABSHEER_MIGRATION_SCOPE: cross_context_approved
-- ABSHEER_ARCH_DECISION: ADR-028
-- B05 SOURCE ONLY, NOT APPLIED. Owners: student binding / assets lifecycle.
-- Before deploy: verify actual migration/checksum state, inspect existing constraints,
-- inventory orphans, drain competing writers, and rehearse both lock orderings.
-- NOT VALID preserves existing evidence; it still checks new writes. Validate separately
-- only after the owner resolves existing orphans. Never guess an asset or delete a binding.
BEGIN;
ALTER TABLE "StudentApplicationDocumentBinding"
  ADD CONSTRAINT "StudentApplicationDocumentBinding_assetId_fkey"
  FOREIGN KEY ("assetId") REFERENCES "AssetRecord"("id")
  ON DELETE RESTRICT ON UPDATE RESTRICT NOT VALID;
CREATE INDEX "StudentApplicationDocumentBinding_assetId_idx" ON "StudentApplicationDocumentBinding"("assetId");

CREATE TRIGGER "eap_asset_reference_owner"
  BEFORE INSERT OR UPDATE OF "assetId" ON "StudentApplicationDocumentBinding"
  FOR EACH ROW EXECUTE FUNCTION absheer_require_active_asset_reference('assetId', 'false', 'false');

-- Add a guard for this owner without replacing the existing consumer/lifecycle functions.
CREATE FUNCTION absheer_guard_student_document_asset_lifecycle() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE used boolean;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW."id" = OLD."id" AND (NEW."lifecycleState" = OLD."lifecycleState" OR NEW."lifecycleState" = 'ACTIVE') THEN RETURN NEW; END IF;
  END IF;
  -- The asset row lock conflicts with the owner's FOR SHARE; require fresh committed reads.
  IF current_setting('transaction_isolation') <> 'read committed' THEN
    RAISE EXCEPTION 'ASSET_REFERENCE_ISOLATION_UNSUPPORTED' USING ERRCODE = '23514';
  END IF;
  EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I."StudentApplicationDocumentBinding" WHERE "assetId" = $1)', TG_TABLE_SCHEMA)
    INTO used USING OLD."id";
  IF used THEN RAISE EXCEPTION 'ASSET_REFERENCE_IN_USE' USING ERRCODE = '23514'; END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "eap_asset_lifecycle_student_document"
  BEFORE DELETE OR UPDATE OF "lifecycleState", "id" ON "AssetRecord"
  FOR EACH ROW EXECUTE FUNCTION absheer_guard_student_document_asset_lifecycle();
COMMIT;
