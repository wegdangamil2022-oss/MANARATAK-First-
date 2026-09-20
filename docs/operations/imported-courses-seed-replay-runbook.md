# Imported Courses Seed / Replay Runbook

> Provider replay in WP-IC-10R1 performs a **forced reanalysis** of the selected staged batch. Ordinary analysis remains cache/idempotency aware. This is intended for cases where reviewed provider aliases/source health or analysis rules changed; it does not bypass controlled transfer approvals.


## Initial 3,663 seed
The authoritative seed remains the WP-IC-08 controlled pilot. Do not replace it with direct SQL or direct Prisma writes to canonical Course records.

1. Verify the authoritative workbook filename and SHA-256.
2. Register the workbook through the existing Asset platform.
3. Run WP-IC-08 source verification.
4. Run WP-IC-08 dry-run with the strong canonical Course sentinel.
5. Reconcile all 3,663 source rows with zero unexplained loss, zero silent overwrite, zero duplicate provider identities, and zero auto-publication.
6. Use the explicit WP-IC-08 transfer confirmation only after review.
7. Re-run transfer in idempotency mode; replay must be unchanged.

## Provider continuation
After seed, use WP-IC-09 provider continuation:
- `FULL_SNAPSHOT` for complete provider inventory;
- `INCREMENTAL` only when the provider/source semantics support it;
- registered connector runs only for approved provider connector definitions;
- source drift is reviewed before staging resumes.

## Replay
Replay the existing provider batch through the continuation replay endpoint or WP-IC-05 transfer path. Never create a parallel replay engine. A URL change remains metadata on the same stable source identity and Course.

## Recovery rule
If a transfer partially fails, preserve import records, analyses, source identities, provenance, and receipts. Fix the blocking condition and replay the existing records. Do not erase evidence to make the run appear clean.
