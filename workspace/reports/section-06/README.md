# Section 06 / P7 — University-to-City source reconciliation (source only)

Date: **2026-10-10**. Repository baseline: `93b25a9c6b56e1db2a92230d59b78cf7ac64257c`. **Not a database audit.** No DB reads/writes, migrations, seeds, backfills, fuzzy merges or imports were performed.

## Coverage and exact counts

The university input is `workspace/import-sources/reconciliation/m10-12-14/universities-geography.jsonl` (blob `8ff326132d2b572916e6c5de16de90a10a93b8f0`), containing **only 3,549 previously unresolved university geography rows**, not all university records. It contains **2,103 distinct valid country + normalized city keys** and **1 invalid row** (INS-VEN-0043 has an empty city). Consequently, these numbers CANNOT prove the number of absent cities in the live database or the full university universe.

The five city CSV files contain **8,991 rows** (Africa 1607, Americas 1894, Asia 2885, Europe 2527, Oceania 78). No malformed CSV rows were detected by the parser.

| Source-only decision | Distinct country/city keys or invalid rows | University rows |
|---|---:|---:|
| Unique exact/normalized primary name within same country (candidate; verify provenance before any import) | 22 | 61 |
| Unique alternate name/alias | 0 | 0 |
| Not present by exact Unicode-safe normalized name or available source aliases | 2052 | 3416 |
| Multiple candidate source rows in the same country (no auto merge) | 21 | 63 |
| Territory/country-policy review (no automatic parent inference) | 8 | 8 |
| Invalid city or country in university source | 1 | 1 |
| **Total** | **2104** | **3549** |

The previous university reconciliation states were: **NOT_FOUND 3,478**, **AMBIGUOUS 63**, **TERRITORY_MISMATCH 8**. Those states were **not** database counts. This new comparison does not overwrite the original classifications: each case retains its historical status.

## Data-integrity findings

- **8 scoped primary city-name collisions** exist within the CSVs: country ISO3 + regionCode (or unknown) + Unicode-normalized primary name, with different source city IDs. They are documented in `catalog-scoped-identity-collisions.json`. Do **not** collapse them by name or select coordinates without authoritative evidence.
- E.g. Yemen `Ibb` has two source city identities in `YE-IB`; U.S. `Columbia` appears in multiple state regions; region-free university source rows cannot disambiguate them.
- Unicode matching uses `NFKC`, non-locale-dependent case folding and Unicode letters/marks/numbers; punctuation/spacing is normalized; diacritics are **not** removed for identity.
- `cityNameEn`, `cityNameAr`, `localName`, `cityAscii` are compared only inside the same ISO3 country. No fuzzy or transliteration inference is used, and absent university region is never guessed.
- One apparent match only establishes a unique candidate **in the scanned source files**. It does not prove a database FK, city existence in DB, verified city authority, or safe write permission.
- The missing-cities CSV is **REVIEW_ONLY / NOT IMPORT-READY**. It intentionally omits unknown regionCode, coordinates and timezone. Do not feed it to generic/direct promotion.
- All original city CSVs, city IDs, row positions and university source hashes are preserved untouched.

## Deliverables

1. `university-city-source-comparison.jsonl` — **all 2104 individual decisions**, university provenance and any city-source candidate IDs/regions/rows.
2. `review-only-missing-cities.csv` — **2052** unverified country/city candidates awaiting official evidence; not a seed/import payload.
3. `catalog-scoped-identity-collisions.json` — **8** canonical-scope collisions requiring owner decisions.

## Rejection and review gates

The extant source queue provides evidence for `NOT_FOUND`, `AMBIGUOUS`, `TERRITORY_MISMATCH`. It does not establish runtime rejection categories for encoding, required columns, regional FK, CAS, DB constraints or import deduplication; corresponding raw import logs / DB verification are still required. Continue with owner-approved city identity review and official region evidence before preparing an apply batch. Never rewrite existing UUIDs or legacy canonical keys without a separate collision-checked migration and approval.

## Scope left open

Full university XLSX/stage 3–4 coverage, database actual-versus-source gap, regional reconciliation, versioned review/apply receipts, and runtime acceptance evidence remain open. The user-supplied **~1,600** missing-in-DB estimate is neither confirmed nor contradicted by this file-only comparison.
