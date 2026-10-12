# Geography source reconciliation — library versus GitHub (2026-10-12)

## Scope and status
- Source-only audit of five city CSVs and five administrative-region CSVs. **No database connection, import, migration, or seed.**
- Library input files have UTF-8 BOM + CRLF, while repo files have UTF-8 without BOM + LF. After normalizing *only* those encodings, every input has exactly the same Git blob SHA as the GitHub `main` version (10/10).
- `main` base commit audited: `01c505532272d3bb085966a35b630ab55da11393`.
- All ten original file paths and column schemas preserved. Only the five listed rows in the Asia city CSV changed.

## Exact pre-repair source matches

| Source | City or region rows | Git blob SHA |
| --- | ---: | --- |
| cities/africa | 1607 | `8b18c689807ea9b4fd2d4adb5e9d04b80e6ffaae` |
| cities/americas | 1894 | `b79ce7016629cf872cf5c10352c9f5da6ff651bc` |
| cities/asia | 2885 | `6f0c654badb10cdb24aebf84b2bd396d94c44d70` |
| cities/europe | 2527 | `9c72a74a5ec5b63d36a825ec72acc8138f25e54b` |
| cities/oceania | 78 | `6fa66f36357cbec4211446b6120394ccbee45da3` |
| regions/africa | 1117 | `bef9172a2c016feae9f6fd3083ef2f19c89cca65` |
| regions/americas | 638 | `08176d3b2cb377186993ca8213e18c966bed643b` |
| regions/asia | 1164 | `fa1b11cd641113c8f38a65939e88c1666c0e7d93` |
| regions/europe | 1913 | `b68908b57f4f82f6d14b9a6b09828f5d975af4e3` |
| regions/oceania | 169 | `ac4addc902b7c7611719c76197148731325453d9` |

## Approved source-level corrections

| cityId | Before | After | Evidence |
| --- | --- | --- | --- |
| `city_am_ashtarak` | `AM-AR` Ararat | `AM-AG` Aragatsotn | [Armenia territorial administration](https://www.pages.am/en/system-of-territorial-administration-of-armenia/) |
| `city_la_louang_namtha` | no region code | `LA-LM` | [Lao News Agency](https://kpl.gov.la/En/Page/Footer/Luangnamtha.aspx) |
| `city_la_muang_sing` | no region code | `LA-LM` | [Lao News Agency — Sing district](https://kpl.gov.la/En/Page/Footer/Luangnamtha.aspx) |
| `city_th_na_klang` | no region code | `TH-39` | [Thai academic research](https://elibrary.tsri.or.th/fullP/MRG6080181/MRG6080181_full.pdf) |
| `city_th_nong_bua_lamphu` | no region code | `TH-39` | [Tourism Authority of Thailand](https://www.tourismthailand.org/Destinations/Provinces/Nong-Bua-Lam-Phu/581) |

Each changed record keeps its original `cityId`, `sourceCityId`, country, coordinates, and other source fields. A change note records the previous region, reviewer rationale and source URL. `verificationStatus=NEEDS_MANUAL_REVIEW` remains unchanged; these edits only verify the **administrative region relation**.

## Deterministic invariants checked

- Cities: 8,991 before and after; regions: 5,001 before and after.
- No duplicate city IDs or region IDs.
- Only 5 Asia city rows changed, restricted to `regionCode`, `regionNameEn`, `regionMatchStatus` and `notes`.
- All nonempty region codes refer to a region in the same ISO2 country in the ten source CSVs.
- City source rows missing `regionCode`: 1,480 before, 1,476 after.
- Verified patched Asia CSV blob: `66d0715455b75afddf354370fae5e14d4b5100ab`.

## Remaining limitations / no automatic promotion

- 1,476 source cities still have no region code; those require provenance and scoped geographic review.
- Some geography input countries/territories have inconsistent region coverage, and source-only validity does not establish live database FK consistency.
- 8 city-name scoped identity collisions remain review-only; do not merge UUIDs or rows automatically.
- University-to-city reconciliation is only complete for the previously unresolved subset, not all university records.
- Source files are **not** automatically imported into Google AI Studio/PostgreSQL. Any DB write still requires read-only preflight, explicit database mutation approval, identity collision checks, audit/outbox, rollback/recovery evidence, and post-validation.
