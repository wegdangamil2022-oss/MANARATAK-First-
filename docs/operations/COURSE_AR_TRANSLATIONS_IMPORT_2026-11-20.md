# Arabic course translation import

Completed on 2026-11-20 against the Manaratak development database `neondb` (OID 16395) in Neon project `hidden-smoke-02928871`, branch `br-sweet-king-b9pem1dg`. The execution used the existing `manaratak_app` role through Neon's TLS-protected WebSocket connection after direct PostgreSQL connectivity failed.

The [Arabic workbook](../../workspace/import-sources/course-translations/README.md) had 21,562 rows and matched all 21,559 existing course records by normalized URL. Three URLs appeared twice. The earliest row supplied the translation, and duplicate variants were retained in provenance. The payload also retained evidence of the 336 incomplete Arabic pairs that it replaced.

A fresh frozen plan was built from the verified workbook and current database before the first committed batch. Its SHA-256 was `7f3143fac1e299baea6ba7ff0dd0cd8f341585b1a1bd3e99e030bdffe4288773`. A one-course preflight exercised the audited transaction and application reader, then rolled back. The run resumed after a switch to bounded concurrency and reused the receipts for the first 24 committed batches.

| Post-import check | Result |
| --- | --- |
| Course records with a verified Arabic title and description | 21,559 |
| Course versions captured and verified against the stored courses | 21,559 |
| Audited transaction batches | 216 |
| Audit records and outbox records | 216 of each |
| Course status | All 21,559 remained `IMPORTED` |
| Course facts, including teaching language | Matched every frozen record |
| Course relationship and source lineage tables | All 11 checked fingerprints matched |
| External-course Arabic presence filters | 21,559 with Arabic text and 0 without |
| Center for translation coverage | 21,559 courses with Arabic text and 0 missing |
| Search by an imported Arabic title | Matched the selected course |
| Teaching language filter for English among translated courses | 14,847 matches |

The database import is complete. The translation editor, badges, and public reader changes are on `fix/course-ar-translations`. No courses were published during the import.
