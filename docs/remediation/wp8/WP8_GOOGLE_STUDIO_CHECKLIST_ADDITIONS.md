# Google Studio Deferred Checklist Additions

These entries must be incorporated into `MANARATAK_Google_Studio_Runtime_Deferred_Work_Checklist` when that external document is next revised. The authoritative in-project source is [WP8 Google Studio Closure Master Register](./WP8_GOOGLE_STUDIO_CLOSURE_MASTER_REGISTER.md).

## WP7 Additions

- Verify every Phase 7-10 Admin canonical selector against real application endpoints and persisted canonical IDs.
- Verify backend RBAC denial for each critical mutation; client visibility is not authorization evidence.
- Verify each critical mutation produces the required audit evidence and that failed mutations do not claim success.
- Record before/after Admin payload and network-request measurements.

## WP8 Additions

- Run the full build and test toolchain with locked project dependencies and retain exact command/output evidence.
- Execute cross-domain contract tests for Reference Data, DegreeLevel, Major linkage, Import handoff, Admin, and architecture boundaries.
- Reconcile source identities against the original Development DB without regenerating IDs or silently remapping relations.
- Execute every owner WP item linked from the master register, preserving owner-specific evidence.
- Complete migration gates in order: Expand, Mapping/Dry Run, Backup, Backfill, Referential Validation, Switch, Rollback Test, Contract Cleanup.
- Update documentation statuses only after concrete runtime/DB evidence exists.
