> Historical snapshot. Latest applied workbook batch: `workspace/reports/university-location-workbook/2026-10-14-batch12/README.md` (104 more bindings, 170 held). User directed the integrated update to main.

# University location review — 2026-10-14

Reviewed the 342 remaining rows from main at `4e203a88ac766a5da6af3e726fe7f6547c531ae0`, recording 780 search queries. Applied 68 primary-address source bindings and added 36 city source records. All 10,723 university rows remain: 10,449 source matched and 274 held for review.

Of the 68 decisions, 39 have a live HTTP primary-address excerpt; 29 have an explicitly labelled primary-source search-index excerpt whose live page was not confirmed. Source matches are not final approval of every campus, administrative boundary, or canonical database foreign key. No database writes, imports or deployments were performed.

- `reviewed-decisions.json`: decisions, address excerpts, source URLs, hashes and scope.
- `source-evidence.jsonl`: evidence and hash meanings.
- `research-coverage.jsonl`: all 342 investigated rows, queries, candidate URLs and HTTP attempt metadata.
- `applied-university-changes.jsonl`: applied before/after university rows.
- `remaining-university-review.csv` and `.jsonl`: the 274 unresolved rows.
- `NEXT_CHAT_HANDOFF.md`: continuation instructions.
- `validation.json`: checks actually performed.

Raw downloaded HTML/PDF caches are outside the repository and are not required to understand the preserved decisions. Fetch sources again for additional live verification. City verification status and publication review safeguards remain in effect.
