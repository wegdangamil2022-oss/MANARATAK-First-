-- Existing operational JSON only; no backfill, retention policy or provider operation.
BEGIN;

-- statement-breakpoint

CREATE FUNCTION manaratak_protect_pending_asset_restore() RETURNS trigger LANGUAGE plpgsql VOLATILE AS $$
DECLARE
  old_operation jsonb := OLD."malwareScanStatus" -> 'restoreOperation';
  new_operation jsonb;
  old_phase text := old_operation ->> 'phase';
  new_phase text;
BEGIN
  IF old_operation IS NULL OR old_operation = 'null'::jsonb OR old_phase IN ('COMPLETED', 'CANCELLED') THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'ASSET_RESTORE_RECOVERY_PENDING' USING ERRCODE = '23514'; END IF;
  new_operation := NEW."malwareScanStatus" -> 'restoreOperation';
  new_phase := new_operation ->> 'phase';
  -- Lease expiry never authorizes takeover while an external operation may still be running.
  IF OLD."lifecycleState" <> 'DELETED' OR NEW."id" <> OLD."id" OR
     OLD."retentionClaimToken" IS DISTINCT FROM (old_operation ->> 'operationId') OR
     (old_operation ->> 'version') IS DISTINCT FROM '1' OR
     new_operation IS NULL OR new_operation = 'null'::jsonb OR
     (new_operation - ARRAY['phase', 'updatedAt']) IS DISTINCT FROM (old_operation - ARRAY['phase', 'updatedAt']) THEN
    RAISE EXCEPTION 'ASSET_RESTORE_RECOVERY_PENDING' USING ERRCODE = '23514';
  END IF;
  IF old_phase = 'RESTORING' AND new_phase = 'COMPLETED' AND NEW."lifecycleState" = 'ACTIVE' AND
     NEW."retentionClaimToken" IS NULL AND NEW."retentionClaimUntil" IS NULL AND
     OLD."retentionClaimUntil" > (clock_timestamp() AT TIME ZONE 'UTC') THEN RETURN NEW; END IF;
  -- Cancellation is permitted only before the persisted provider-start boundary.
  IF old_phase = 'PREPARED' AND new_phase = 'CANCELLED' AND NEW."lifecycleState" = 'DELETED' AND
     NEW."retentionClaimToken" IS NULL AND NEW."retentionClaimUntil" IS NULL THEN RETURN NEW; END IF;
  IF NEW."lifecycleState" = 'DELETED' AND NEW."retentionClaimToken" = OLD."retentionClaimToken" AND
     ((old_phase = 'PREPARED' AND new_phase IN ('PREPARED', 'RESTORING')) OR
      (old_phase = 'RESTORING' AND new_phase IN ('RESTORING', 'RECOVERY_REQUIRED')) OR
      (old_phase = 'RECOVERY_REQUIRED' AND new_phase = 'RECOVERY_REQUIRED')) THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'ASSET_RESTORE_RECOVERY_PENDING' USING ERRCODE = '23514';
END;
$$;

-- statement-breakpoint

CREATE TRIGGER "eap_asset_restore_barrier" BEFORE UPDATE OR DELETE ON "AssetRecord"
FOR EACH ROW EXECUTE FUNCTION manaratak_protect_pending_asset_restore();

-- statement-breakpoint

COMMIT;
