# Active university, city and region alignment — 2026-10-13

The user explicitly authorized correcting, adding or deleting mismatched source data. This batch removes the 889 unresolved university rows from the six active stage-1 workbooks and preserves them in the six review-only workbooks in this report directory. Their original identities, every original field and review reasons remain intact in the archive and `excluded-universities.jsonl`. The empty `Geography Review` sheets in the active workbooks retain their headers for importer compatibility.

There are **9,834 active university rows** and **10,289 active city rows**. Every university's `City` exactly equals its city catalog's `cityNameEn`; `City Source ID`, `City Region Code` and `ISO3` identify that same city, region and country. Every active city has a region code belonging to its ISO2/ISO3 country, and the country exists in the country registry. Cities needed no further changes in this batch. No active institution is excluded without an unchanged original record and exclusion receipt.

The excluded institutions are not declared invalid or fictitious. They cannot be imported from the active source directory until their actual geography is researched and a separately verified correction restores them. The archive is outside `workspace/import-sources` and is not scanned by source preparation. The earlier 119 city quarantine records remain unchanged outside the active city directory.

**Zero mismatches applies to the retained active source rows.** It is not official geographic verification of all historical records, and it does not resolve the 889 archived university cases or the earlier 860 city-position evidence cases. New-city review status and publication safeguards are unchanged. No database connection, FK mutation, migration, seed or deployment occurred.

Verification:

- `python scripts/verify-active-geography-alignment.py`: checks all active bindings, country registry, source hashes, original accepted fields, archive fields and conservation of all 10,723 university identities.
- `python scripts/tests/verify-active-geography-alignment.test.py`: rejects silent active row deletion, changed city labels and damaged archive records even if current file hashes are updated.
- `python scripts/verify-university-city-research.py --snapshot 8a1bb4e6`: verifies the preceding immutable research batch.
- `npm run imports:qc:prepare` then `npm run imports:qc:verify`: rebuilds and reproduces the source quality queue from the active workbooks.

See `summary.json` for before/after/archive checksums and per-file exclusion counts; `validation.json` records the executed checks. `scripts/align-active-university-geography.py` reproduces the exclusion from the baseline on a clean checkout and refuses to run over an existing alignment report.
