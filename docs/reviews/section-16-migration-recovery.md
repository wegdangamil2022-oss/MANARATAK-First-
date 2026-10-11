# Section 16 migration recovery classification

All six `20261011*` CMS migrations are source-only and classified
`BACKUP_RESTORE_REQUIRED`. No migration or recovery operation was executed.

Before applying them after section 28, capture and verify a consistent backup of
CMS roots, locales, editorial ledger, approvals, schedules, redirects, block
schemas and public snapshots. Record the database/schema identity, migration
checksums, backup identity and a restoration rehearsal. Keep a compatible
application binary and coordinate CMS writers/workers during rollout.

| Migration | Evidence and recovery constraint |
| --- | --- |
| review_snapshot_hash | Preserve editorial approvals and source revisions. Never fabricate hashes for old approvals; re-review instead. |
| public_site_snapshots | Preserve current public navigation/announcement payloads and publication provenance. Dropping this table can erase the last known good state. |
| redirect_version | Preserve corrections, actors and concurrency versions. Do not blanket reset versions during recovery. |
| block_schema_approval | Preserve schema approvals and payload compatibility. Recover schema and block publication history together. |
| root_last_editor | Backfill changes historical editor attribution. Restore the pre-migration backup or a reviewed per-row forward correction; do not replace all editors with authors. |
| bounded_search_indexes | Rehearse pg_trgm permissions, index cost and migration duration. Avoid dropping a shared extension used by other owners. An application rollback does not require destructive schema reversal. |

For a failed rollout, stop incompatible CMS writes/workers, restore the verified
pre-migration backup to a controlled target, and verify editorial/publication
consistency before reconnecting the compatible application. Reconcile post-backup
accepted writes through a reviewed recovery plan; do not silently discard them.
An alternative forward fix must preserve governance evidence and be reviewed for
schema compatibility. These instructions are a source plan, not proof of a tested
backup or permission to execute a database mutation.
