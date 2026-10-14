# City, region and university source closeout — 2026-10-13

Scope: source geography reconciliation only. Full plan section 12 is deferred at the user's request. No database writes, migrations or publication occurred.

The active city files contain 9,992 cities, each with an existing region belonging to the same country. Corrected 32 region assignments using GeoNames administrative evidence and the CSC place/region corroboration archived in the correction receipts. Preserved 119 unresolved records intact in `city-quarantine.csv`, outside the active import directory; these include legitimate places without a supported region/country scope and are not classified as fictitious cities. Geographic position corroboration covers 9,132 active cities; another 860 retain their original positions pending further evidence. Structural integrity is not a claim of official geographic approval.

Updated the six first-stage university workbooks: 9,353 accepted source matches, including 2,003 canonical city-label corrections, with explicit city source ID and region code. All accepted matches agree with their country and the active city catalog. The remaining 1,370 institutions are preserved in each workbook's `Geography Review` sheet with original fields and a reason. The first import sheet excludes them. All 10,723 institution reference IDs remain present exactly once across the accepted and review sheets.

The quality queue reads both sheets and holds unresolved rows even when a name happens to match. Source candidates remain subject to canonical database ID revalidation; new cities remain NEEDS_MANUAL_REVIEW. Staged university enrichment is evidence, not a new live verification of official websites. No invented region or university FK is assigned.

`summary.json` records hashes, counts and reasons. `university-geography-decisions.jsonl` retains original and corrected rows, matching method and staged evidence. Historical city batches are immutable snapshots: use `python scripts/verify-city-region-reconciliation.py --snapshot 19e8a604` and `python scripts/verify-city-verification.py --snapshot 32ad8354`. Current integrity: `python scripts/verify-geography-closeout.py` (requires openpyxl).

Validation: 35 targeted Vitest cases and four historical evidence negative cases passed; application TypeScript build, current source integrity and offline quality reproduction passed. No large test suite or connected database test ran.
