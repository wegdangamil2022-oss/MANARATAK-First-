# WP12-2 — Normalized Scholarship Model

Source package status only. Runtime migration and backfill remain pending.

## Scope

- expand the existing Scholarship aggregate without regenerating identity;
- retain `optionalFields` during migration compatibility;
- add normalized Benefits, Degree Targets, Major Targets, Eligibility Items, Required Documents, Source Evidence, and University Links;
- add nullable canonical references only; WP12-3 owns exact resolution;
- expose normalized children through the repository without arbitrary JSON flattening.

## Runtime boundary

```text
MIGRATIONS_APPLIED = 0
CLOUD_SQL_MUTATIONS = 0
BACKFILL_EXECUTED = NO
RUNTIME_MIGRATION = PENDING
```
