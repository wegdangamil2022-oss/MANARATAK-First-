> Latest continuation: `workspace/reports/university-location-workbook/2026-10-14-batch12/README.md`: 104 additional source bindings, 170 held; current source counts 10,553 / 10,723 universities and 10,676 cities. Earlier counts below describe historical batches.

> Historical snapshot. Latest continuation: `workspace/reports/university-location-verification/2026-10-14/NEXT_CHAT_HANDOFF.md` (68 additional bindings; 274 remaining).

# Geography corrections and university restoration — 2026-10-13

> **Latest follow-up:** 188 further source bindings were applied after researching all 530 remaining rows; 117 city names changed and 123 locality rows were added. Current totals: 10,381 matched universities, 342 review universities and 10,574 cities. See [the primary-address follow-up report](../../university-location-verification/2026-10-13/README.md). The batch counts below describe the earlier 359-restoration snapshot, not the current inventory. Full factual verification remains incomplete.

The user authorized city and region additions, corrections and removals and requested research of all 889 excluded university rows. This batch returns all **10,723 institutions** to the original six workbooks: **10,193** have a source city binding, and **530** remain visible in `Geography Review`. No institution was deleted to improve a matching percentage.

## Cities and regions

- All **194** countries in the existing registry have an active city. Added Vaduz, Saint George's, Yaren, Ngerulmud and Funafuti; restored the original Singapore and Monaco source IDs.
- Singapore and Monaco use explicit country-wide city-state scopes, administrative level 0. `SG-NATIONAL` and `MC-NATIONAL` are internal source scope identifiers, **not ISO 3166-2 subdivisions**. Assigning the entire city-state to one CDC or quarter would be inaccurate. Their existing subdivisions remain present beneath their own country scope.
- Corrected Jakarta to `ID-JK`, Wamena to `ID-PE`, Moussoro and Cheddra to `TD-BG`, Ga-Rankuwa to `ZA-GP`, and Quezon City to `PH-00` (NCR, not Quezon Province). Propagated the relevant city/region changes to university source rows.
- Resolved the 53 `FUZZY_MATCH_REVIEW` source statuses with archived location corroboration, current gazetteer records and named administrative evidence. This establishes source region relations, **not final official geographic approval of every record**; cities retain `NEEDS_MANUAL_REVIEW`.
- Removed the Caluquembe municipality record from the city list after GeoNames confirmed it is `A/ADM2`; retained the town (`P/PPLA2`). Merged the Jakarta and Quezon City source duplicates, retaining original city IDs and redirecting source university references. No canonical database IDs were merged.
- Also corrected Sadat City → Monufia (`EG-MNF`), Edogawa → Tokyo (`JP-13`), Zagreb → its separate city-county (`HR-21`), La Libertad → Santa Elena (`EC-SE`) and Maputo → Maputo Cidade (`MZ-MPM`). Corrected five Bangladesh district assignments and three Veszprém county assignments that incorrectly used the separate Veszprém city jurisdiction. Each correction includes primary authority URLs in the city receipts and propagates to accepted university references. Merged the Sadat City and Zagreb duplicates while retaining original source IDs.
- Aligned Americas continent labels with the country workbook's North America / South America classification.
- Current inventory: **10,451 cities**, **5,003 region/scope records**. No missing same-country parent, region parent cycle, scoped city-name collision or unmatched active university city reference was found by the source checker.

## University research

`research-coverage.jsonl` records the initial research of all **889** reference IDs, **1,528** targeted searches, and attempted official contact pages with response hashes or errors. Live page hashes represent fetched HTTP bytes; search-excerpt hashes are not presented as live page verification. A search or a domain match alone was not accepted as an address. Supplemental reviews are recorded in `additional-reviewed-decisions.json`, with short address excerpts and evidence kinds that distinguish search-index snippets from live HTTP pages.

Restored **359** university source bindings and added **160** locality rows during the restoration steps. The additional 37 decisions are frozen in `additional-reviewed-decisions.json`; 22 were reviewed against institution/government address evidence and 15 against the registry plus populated-settlement identity and subdivision scope. Decisions and exact before/after source rows are in `university-changes.jsonl` and `proposed-university-restorations.json`. They distinguish reviewed primary addresses from curated ROR registry corroboration. The 214 registry-corroborated decisions are **not new independent live main-campus verifications**; their workbook review reason and receipt scope retain this limitation. GeoNames and ROR locations can be broader municipalities or outdated administrative names, so contradicted postal/campus suggestions were retained for review rather than silently accepted.

Examples of corrected localities include Damietta University → New Damietta; Sphinx University → New Assiut; Badr University in Assiut → New Nasser City; Ashesi University → Berekuso; Universitas Cordova → Taliwang; Universitas Hamzanwadi → Pancor. New coordinates come from the recorded gazetteer place, never from an inferred campus or a random city centroid. Primary-address-only localities have empty coordinates.

**The user’s requested full factual verification of all university locations is not complete.** The remaining **530** source rows are in the workbooks, `remaining-university-review.csv` and `.jsonl`. They include unresolved or conflicting campus addresses, ambiguous locality identities, insufficient region evidence and eight `XKX` institutions: Kosovo is absent from the existing country registry, so they were not assigned to another country. Resolving a code/name join is not a substitute for proving the actual institution locality.

The immutable previous archive and historical receipts remain available for comparison and recovery. All source publication/manual-review safeguards remain in place. No database connection, import, seed, migration, canonical FK assignment or deployment occurred. Source integrity is not runtime readiness. Complete independent geographic verification of every city/region is also unfinished: administrative splits, country/campus scope and contradictory external gazetteer assignments require further evidence. A zero broken-join count does not prove global factual correctness.

## Verification

- `python scripts/verify-geography-research-restoration.py` checks source checksums, every change receipt, geographic identity conservation, country/continent/region links, parent labels/cycles, city-state scope semantics, coordinates, all 10,723 university identities, unchanged non-geography fields and exact accepted city bindings.
- `python scripts/tests/verify-geography-research-restoration.test.py` rejects institution deletion, silent city changes even with recomputed hashes, and altered historical archives.
- `npm run imports:qc:prepare` followed by `npm run imports:qc:verify` reproduces the governed source queue: 10,193 exact source candidates; 522 source review rows; 8 territory policy mismatches.
- The four targeted source quality/geography/course publication test files pass 35 cases. See `validation.json`.
- Historical batches: `python scripts/verify-active-geography-alignment.py --snapshot ecc5123d`, `python scripts/verify-university-city-research.py --snapshot 8a1bb4e6`.

GeoNames data attribution: https://www.geonames.org/ (CC BY 4.0). ROR release v2.14 (2026-10-06): https://zenodo.org/records/23187250 (registry CC0; GeoNames location attribution applies). Downloaded full datasets and raw HTTP research caches were temporary; applied decisions preserve the source URL, hashes and selected evidence in repository receipts.
