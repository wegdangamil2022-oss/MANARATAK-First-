# Review workspace migration recovery

Migration: `20261024000200_review_workspace`. Classification: FORWARD_FIX_ONLY.

The additive transaction creates coordination/history/policy/view metadata, a normalization function and a read-through owner projection. It never migrates or rewrites academic content. Lock and statement limits abort contention atomically. No default SLA, team approval, notification send or owner publication is seeded.

Application rollback may disable the workbench router and restore its previous UI while retaining cases, notes, assignment history, audit and outbox receipts. Do not delete review events, drop constraints or reverse notification state. Prepare a reviewed forward fix for schema errors. Preserve the import owner's independent leases and decisions.

Only the new, attested, synthetic PostgreSQL 16 target is authorized for the rehearsal. Existing Neon/original/production targets require a separate deployment decision, verified backup/restore, exact role/target checks and the existing migration gate. This source document grants none of those permissions. No destructive down SQL is supplied.
