# Scholarship source — current version 6.6

On 2026-10-22 the owner supplied `MANARATAK_Degree_Scholarships_Master_v6_6_2027_Audit_001_010_947.md` and requested replacement of the old repository source. This is now the sole active scholarship dataset in `../dataset-manifest.json`. Its supplied bytes are unchanged: **4,892,567 bytes**, SHA-256 `f09c81d8a58c79ff05ef69a6009d181e31fe34d37f2c010ee566cd77e22902fd`.

## What was replaced

The v3.21 file was removed from the current tree to avoid two competing active masters. Its complete original bytes and the old derived queues remain recoverable in Git at commit `565f3ebcb0282d3db27b9283d060c5a32b5843e0` under `workspace/import-sources/scholarships/MANARATAK_Scholarship_Import_Master_Guide_v3.21(1).md` (SHA-256 `bcca756349fc16873ea9758f95708c8b1d5b11a9a1c35a7b44c2b2d02854c337`).

The new file has **947 unique source identities**: 343 also occur in the old 514-section file, 604 were absent from that file, and 171 old identities are absent from this one. These are exact identity comparisons, not a claim of 604 distinct new programs: name changes, splits, merges and exclusions still require source review. Absence from the new file never authorizes deleting database records or their student/history relationships.

## Reader and review states

- 900 records have 12 numbered sections; 47 have 13, including participating universities. Sections are resolved by their exact names so missing university sections cannot shift conditions or application URLs into the wrong relationship.
- Numbered display positions are not source IDs. The reader retains the explicit original/new `SCH-*` ID, source line, complete raw section and SHA-256. Other referenced/merged IDs in a record are not new records.
- 703 records have explicit `IMPORTED`-prefixed source metadata, across final-status, batch-status and decision labels. These are **held source candidates**, not database import receipts, publication approval or proof that applications are open.
- 244 records have China transcription / 2027 verification-pending markers. They remain `UNKNOWN_MARKER` / `DO_NOT_PROMOTE` and receive no inferred canonical assignments. No record is silently marked imported.
- The file declares 947 total records, not a separately evidenced count of imported records. `declaredImportedCount` and the comparison difference are therefore `null`; the old v3.21 summary claim of 359 is not reused.

The file includes historical/closed awards, conditional language evidence and alternative/waived requirements. Its 2027 audit is limited to records 0001–0010; it does not establish fresh official verification of every record. Its introductory degree-category counts predate later additions and are not used as authoritative totals. Missing application links or referenced companion reports must be reviewed before promotion.

`ScholarshipMasterGuideReader` supports this format and the historical format. `ScholarshipSourceQuality` prepares only offline review queues. Canonical university, program, degree and international-test choices remain held for review against existing identities; no name-based links are created. The runtime manual-file importer still accepts its existing JSON/NDJSON/CSV contracts, not direct execution of this Markdown.

**Database work remains paused.** This replacement, reader update and regeneration do not run migrations, seeds, imports, ledger recovery, publication or database cleanup. Follow the owner's separate relationship/mapping review before a later approved import.

Local verification for this replacement: 28 tests passed across the three directly affected reader/source-quality suites, including reproduction of the governed outputs and unchanged unrelated queues. Strict TypeScript checking of the six changed scripts/test files and scoped ESLint passed. This is offline source evidence; no runtime or current-head CI acceptance is claimed.

The secret scanner initially misidentified an Indonesian university news URL's `sk-` title fragment as an OpenAI key. An exact URL-and-artifact exception covers only that non-secret slug in the supplied Markdown and its derived queue. No key pattern or directory-wide check is disabled. Three focused Node tests passed, including a separate synthetic credential on the same line and changed-host/path/slug rejection; these three were rerun after changing how the fixture URL is assembled. The subsequent tracked-file secret scan passed. Markdown's original trailing spaces are intentional hard breaks and were preserved; whitespace checks pass for code/other changes.
