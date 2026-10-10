-- Preserve pending external archive intent; no data backfill or provider operation.
BEGIN;

-- statement-breakpoint

CREATE FUNCTION manaratak_protect_pending_asset_archive() RETURNS trigger LANGUAGE plpgsql VOLATILE AS $$
DECLARE
  old_operation jsonb := OLD."malwareScanStatus" -> 'archiveOperation';
  new_operation jsonb;
  old_phase text := old_operation ->> 'phase';
  new_phase text;
BEGIN
  IF old_operation IS NULL OR old_operation = 'null'::jsonb OR old_phase = 'COMPLETED' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'ASSET_ARCHIVE_RECOVERY_PENDING' USING ERRCODE = '23514'; END IF;
  new_operation := NEW."malwareScanStatus" -> 'archiveOperation';
  new_phase := new_operation ->> 'phase';
  IF OLD."lifecycleState" <> 'ARCHIVED' OR NEW."lifecycleState" <> 'ARCHIVED' OR NEW."id" <> OLD."id" OR
     NEW."retentionClaimToken" IS DISTINCT FROM OLD."retentionClaimToken" OR
     (old_operation ->> 'version') IS DISTINCT FROM '1' OR
     new_operation IS NULL OR new_operation = 'null'::jsonb OR
     (new_operation - ARRAY['phase', 'updatedAt']) IS DISTINCT FROM (old_operation - ARRAY['phase', 'updatedAt']) OR
     ((old_phase = 'RUNNING' AND new_phase IN ('RUNNING', 'RECOVERY_REQUIRED', 'COMPLETED')) OR
      (old_phase = 'RECOVERY_REQUIRED' AND new_phase = 'RECOVERY_REQUIRED')) IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'ASSET_ARCHIVE_RECOVERY_PENDING' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

-- statement-breakpoint

CREATE TRIGGER "eap_asset_archive_barrier" BEFORE UPDATE OR DELETE ON "AssetRecord"
FOR EACH ROW EXECUTE FUNCTION manaratak_protect_pending_asset_archive();

-- statement-breakpoint

COMMIT;
