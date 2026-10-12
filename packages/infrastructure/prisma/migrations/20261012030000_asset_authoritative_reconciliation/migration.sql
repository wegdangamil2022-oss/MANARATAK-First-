BEGIN;

CREATE OR REPLACE FUNCTION manaratak_protect_pending_asset_archive() RETURNS trigger LANGUAGE plpgsql VOLATILE AS $$
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
  -- Only a terminal owner-verified provider fence permits recovery after lease expiry.
  IF old_phase IN ('RUNNING', 'RECOVERY_REQUIRED') AND new_phase = 'COMPLETED' AND
     NEW."id" = OLD."id" AND OLD."lifecycleState" = 'ARCHIVED' AND NEW."lifecycleState" = 'ARCHIVED' AND
     (new_operation - ARRAY['phase','updatedAt','recoveryProof']) = (old_operation - ARRAY['phase','updatedAt','recoveryProof']) AND
     (new_operation #>> '{recoveryProof,operationId}') = (old_operation ->> 'operationId') AND
     (new_operation #>> '{recoveryProof,fenced}') = 'true' AND
     (new_operation #>> '{recoveryProof,fenceDigest}') ~ '^[a-f0-9]{64}$' AND
     (new_operation #>> '{recoveryProof,observedAt}')::timestamptz BETWEEN clock_timestamp() - interval '5 minutes' AND clock_timestamp() + interval '5 minutes' AND
     NEW."retentionClaimToken" IS NOT DISTINCT FROM OLD."retentionClaimToken" THEN RETURN NEW; END IF;

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

CREATE OR REPLACE FUNCTION manaratak_protect_pending_asset_restore() RETURNS trigger LANGUAGE plpgsql VOLATILE AS $$
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
  -- Only a terminal owner-verified provider fence permits recovery after lease expiry.
  IF old_phase IN ('RESTORING', 'RECOVERY_REQUIRED') AND new_phase IN ('COMPLETED','CANCELLED') AND
     NEW."id" = OLD."id" AND OLD."lifecycleState" = 'DELETED' AND ((new_phase='COMPLETED' AND NEW."lifecycleState"='ACTIVE') OR (new_phase='CANCELLED' AND NEW."lifecycleState"='DELETED')) AND
     (new_operation - ARRAY['phase','updatedAt','recoveryProof']) = (old_operation - ARRAY['phase','updatedAt','recoveryProof']) AND
     (new_operation #>> '{recoveryProof,operationId}') = (old_operation ->> 'operationId') AND
     (new_operation #>> '{recoveryProof,fenced}') = 'true' AND
     (new_operation #>> '{recoveryProof,fenceDigest}') ~ '^[a-f0-9]{64}$' AND
     (new_operation #>> '{recoveryProof,observedAt}')::timestamptz BETWEEN clock_timestamp() - interval '5 minutes' AND clock_timestamp() + interval '5 minutes' AND
     OLD."retentionClaimToken" = (old_operation ->> 'operationId') AND NEW."retentionClaimToken" IS NULL AND NEW."retentionClaimUntil" IS NULL THEN RETURN NEW; END IF;

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

COMMIT;
