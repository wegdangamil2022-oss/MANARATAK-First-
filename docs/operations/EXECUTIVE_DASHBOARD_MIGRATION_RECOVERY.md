# Dashboard analytics migration recovery

Migration: 20261024000100_executive_dashboard_analytics.

Classification: FORWARD_FIX_ONLY. The schema is additive; the previous application can continue using the existing service/user tables with new columns at their safe defaults. Code rollback must disable public collection and evidence commands first, retain the added tables, consent/withdrawal records, attestations, migration ledger and outbox, and continue expiry/withdrawal handling. Do not drop tables or erase student records to make an older application start.

A shared staging/production apply still requires the normal reviewed target declaration, verified compatible backup and restore/reconciliation evidence, application-role grants and migration gate. This branch authorizes a new isolated PostgreSQL 16 synthetic test target only. A shared apply is not approved by this document.

If migration execution fails, inspect the migration ledger and transaction outcome before retrying. Do not edit a previously applied migration. Prepare an additive forward fix and independently review any repair of data. No migrate reset, db push or destructive down script is authorized. Preserve legal holds on service attestations and their source assets. Keep privacy withdrawal available even when collection is disabled.

For fresh disposable laboratories, retain the failed cluster/evidence and create a new target under the existing native/container lab policy when reprovisioning is needed. Never reuse or reset an unrelated database.