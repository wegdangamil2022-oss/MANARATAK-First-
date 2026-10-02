# M10-12 / M10-13 / M10-14 — governed source review queues

These are deterministic, **offline source artifacts**, not DB contents or permission to import. The raw source files are unchanged. Canonical IDs remain `null` until an explicit reviewed choice against a verified canonical snapshot and live owner validation.

From the repository root:

```sh
npm run imports:qc:verify
npm run imports:qc:test
```

On a clean checkout, first run `npm run build -w @manaratak/application` to compile its referenced Core/Domain/Shared packages. This is a local TypeScript build, with no DB connection. CI does this before invoking the read-only verifier; the verifier itself never builds or rewrites artifacts.

`verify` reads source artifacts and compares byte-for-byte derived outputs; it never changes files or opens a DB connection. `npm run imports:qc:prepare` intentionally regenerates only this directory's derived outputs for code review. Do not use it to discard a stale-output failure without reviewing the changed source/policy. It never changes upstream workbooks/Markdown or any DB record.

## Files

| File | Meaning |
| --- | --- |
| `manifest.json` | Paths, SHA-256 and byte lengths of every source input; derived output hashes. |
| `summary.json` | Actual source counts; source-only status; no DB counts. |
| `universities-geography.jsonl` | One row per ambiguous/missing/territory university city. INS ID, physical source row, raw labels, row hash, candidates, hold/correction policy. |
| `universities-stage34-quarantine.jsonl` | One row per unique invalid INS ID; stage-tagged issues, original Markdown line/hash. No double-counting overlap. |
| `scholarships-sections.jsonl` | All 514 sections with disposition and source decision. Only 349 explicit candidates get a canonical review queue; all remain held. |
| `courses-url-decisions.json` | Three excluded URL overlaps with both original rows and exact artifact evidence; one separate English edition annotation. |
| `courses-relationships.jsonl` | First line declares common policies; following lines group exact raw provider/language/topic terms and retain dataset/physical-row evidence. Candidate codes/public IDs are source proposals, never DB UUIDs. |

## University decisions and differences from the planning baseline

- 10,723 source identities: 7,129 exact candidates, 45 conservative normalized candidates, 3,478 city-name correction requests, 63 ambiguous city holds, 8 territory holds.
- The plan records 64 normalized / 3,459 missing matches; its row-level decisions are not part of the available source queue. This implementation uses exact aliases plus Unicode/case/whitespace/diacritic normalization, without punctuation/fuzzy fallback, and produces 45 / 3,478. **19 additional rows stay held** rather than being assumed to be valid matches. The difference remains explicit. These are missing **city matches**, not 3,459 missing official university names.
- All 63 ambiguous decisions are `HOLD_SCOPED_MANUAL_CITY_SELECTION`. All 8 territory decisions are `HOLD_COUNTRY_POLICY_NO_PARENT_INFERENCE`; `XKX` is not silently reassigned to `SRB` or another country. A country/territory policy decision requires reviewed authoritative evidence.
- Stage 3 invalid: **1,320**. Stage 4 invalid: **558**. There are 61 non-finite engineering-fee payloads, 37 already overlapping the old accommodation errors; the historical 534 therefore omitted 24 additional invalid rows. The typed QC quarantines them with `SOURCE_PAYLOAD_SHAPE_INVALID`; the legacy dry-run validator also rejects non-finite money. No undefined/NaN financial write is permitted.
- Invalid in both: **487**. Unique invalid: **1,391**. Source-valid in both: **139**, still requiring canonical identities and relationships in the connected environment.
- Unresolved raw geography may be retained in a Draft. A supplied city without a canonical reference or an explicit pending geography review state blocks publication. Invalid Stage 3/4 plans cannot reach the commit gateway.

## Scholarships

514 unique sections = 349 explicit `IMPORTED` candidates + 5 merged duplicates + 2 review + 1 excluded + 1 control-only + 156 unmarked. No unknown marker exists in the current file; future unknown markers stay held.

The summary's 359 is not evidence identifying ten more records. No synthetic ten records, no inferred status changes, no automatic merge. Every section retains its raw-byte source hash and decision. Original CRLF and section text are preserved by the reader.

The 349 candidates require explicit provider university / beneficiary university / AcademicProgram owner / DegreeLevel / InternationalTest reviews. General majors are not canonical programs. An existing INS identity is required for university resolution. A program must belong to the selected university. A non-university provider or inapplicable test requires a reviewed semantic decision, not a name-based inference.

## Courses

21,562 input rows → 21,559 distinct URL projections, with only the three known row pairs excluded and bound to the current source SHA-256. A new/changed overlap stops projection. Distinct POK Italian/English URLs remain separate; only the derived English display name is annotated. Raw titles remain unchanged.

Identity proposals use provider + normalized URL + language. They are not provider-native IDs or DB identities; existing provider adapters and actual stored identities must be checked in the connected environment. Unknown provider aliases/foreign domains, languages and every unresolved taxonomy term require explicit review. Provider headquarters are never inferred as a study country.

External courses retain the free-study **and** free-certificate, verified official-source and direct-link policies. Native/Paid origins retain their separate policy. A proposed language ID or a second unresolved topic cannot be hidden by an unrelated approved relationship. The old approximately 5,000-course artifact remains missing: no complete-history claim is made. No HTTP link checks were performed.

## Manual canonical choices

`CanonicalSourceReview` accepts a verified canonical snapshot with stable UUIDs, kind, active status, country scope, and program owner. It proposes exact candidates only. `decide` requires the same source key/hash and snapshot hash, an actor UUID, explicit reason/evidence, and `SELECT_EXISTING`, `HOLD`, or `EXCLUDE`. Foreign, inactive, missing, unscoped or stale targets fail closed; university choices must retain their verified INS public identity. The result contains an auditable decision hash and zero DB writes.

This source review record is **not an authorization token**. Existing owner APIs must reauthenticate the actor, verify current permissions, recheck canonical identity/scope/status and persist audit/outbox evidence when applying a reviewed choice. Do not write a source candidate public ID into a UUID FK.

## RUNTIME_UNTESTED

All live schema parity, canonical snapshot verification, permissions/audit persistence, concurrency, actual FK ownership, read-after-write and HTTP link health checks require the connected runtime. No migrations, seeds, imports, DB connections, deployment or Google AI Studio access occurred in this task. M10 is not closed; pilots/wide imports have not begun.
