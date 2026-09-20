# WP3 Database Closure Register

> **Operational supersession notice (2026-09-06):** Any instruction in this historical remediation artifact that requires an “Original Development Database”, a Google Studio recovery gate, or `WP1_RECOVERY_GATE` is superseded by [`docs/operations/GREENFIELD_DATABASE_PROVISIONING.md`](../../operations/GREENFIELD_DATABASE_PROVISIONING.md). This file remains historical/evidence context and is not current database-operation authority.

No item authorizes a database operation. Mutations remain blocked until the Google Studio recovery gate is closed.

| Item | Classification | Current evidence | Required closure | Data operation | Owner |
|---|---|---|---|---|---|
| Stable IDs in existing reference rows | DB_MIGRATION_REQUIRED | Repository maps existing model IDs | Verify identity and uniqueness in restored development DB | Validation only | Reference Data |
| Country standard-code quality | DB_MIGRATION_REQUIRED | ISO format validation exists | Detect invalid/duplicate ISO2/ISO3 values | Possible backfill | Reference Data + DB Operations |
| Currency/language code quality | DB_MIGRATION_REQUIRED | Format validation exists | Validate existing canonical codes and aliases | Possible backfill | Reference Data + DB Operations |
| Region to Country integrity | DB_MIGRATION_REQUIRED | Region carries country code | Validate every region and approve constraint if needed | Validation/migration | Reference Data + DB Operations |
| City to Country integrity | DB_MIGRATION_REQUIRED | New writes require an active country | Audit existing cities and approve relationship constraint | Backfill/migration | Reference Data + DB Operations |
| City to Region compatibility | DB_MIGRATION_REQUIRED | New writes check region-country compatibility | Audit existing links and free-text region values | Backfill/migration | Reference Data + DB Operations |
| Alias and historic-name persistence | DB_MIGRATION_REQUIRED | No authoritative alias model exists | Design alias ownership, uniqueness, lifecycle, and rollback | Schema/migration | Reference Data |
| Superseded/merged lifecycle | DB_MIGRATION_REQUIRED | Only `isActive` exists | Design successor linkage without regenerating IDs | Schema/migration/backfill | Reference Data |
| University location strings | DB_MIGRATION_REQUIRED | University model/import uses country and city text | Resolve during WP5 and backfill after recovery gate | Backfill | Universities |
| International Test center strings | DB_MIGRATION_REQUIRED | Center contract uses ISO/name strings | Adopt resolver in WP5 and backfill IDs | Backfill | International Tests |
| International Test currency codes | DB_MIGRATION_REQUIRED | Fee contract carries unresolved standard code | Resolve against canonical Currency | Validation/backfill | International Tests |
| Study Destination profile persistence | DB CLOSURE REQUIRED | Ownership is separate; no Phase 07 model is claimed | Implement only in the owning downstream phase | Schema/migration | Study Destination/CMS/Admin owner |
