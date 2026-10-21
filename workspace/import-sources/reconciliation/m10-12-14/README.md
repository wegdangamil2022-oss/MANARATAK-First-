# M10-12 / M10-13 / M10-14 — governed source review queues

These are deterministic, **offline source artifacts**, not DB contents or permission to import. Canonical IDs remain `null` until an explicit reviewed choice against a verified canonical snapshot and live owner validation.

2026-10-22: the owner replaced the active scholarship source with degree-only v6.6. Scholarship queues and source hashes were regenerated; the prior queues remain in Git. See [source replacement and screening](../../scholarships/README.md). Database writes remain paused.

2026-10-13: the city CSVs were deliberately corrected and extended in [the city source reconciliation](../../../reports/city-region-reconciliation/2026-10-13/README.md). These derived queues and their source hashes were regenerated against the changed files; upstream university workbooks, course and scholarship inputs remain unchanged.

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
| `scholarships-sections.jsonl` | All 947 sections with disposition and source decision. Only 703 explicit source candidates get a canonical review queue; 244 verification-pending markers stay unpromoted. All remain held. |
| `courses-url-decisions.json` | Three excluded URL overlaps with both original rows and exact artifact evidence; one separate English edition annotation. |
| `courses-relationships.jsonl` | First line declares common policies; following lines group exact raw provider/language/topic terms and retain dataset/physical-row evidence. Candidate codes/public IDs are source proposals, never DB UUIDs. |

## University decisions and differences from the planning baseline

- 10,723 source identities after the 2026-10-13 city corrections: 8,029 exact candidates, 45 conservative normalized candidates, 2,578 city-name correction requests, 63 ambiguous city holds, 8 territory holds.
- The original queue had 7,129 exact / 45 normalized / 3,478 missing matches. The original plan's 64 normalized / 3,459 missing counts were not row-level authority. The new source files improve 900 university matches without changing the matching policy. These remain source candidates and missing **city matches**, not missing official university names or approved database relationships.
- All 63 ambiguous decisions are `HOLD_SCOPED_MANUAL_CITY_SELECTION`. All 8 territory decisions are `HOLD_COUNTRY_POLICY_NO_PARENT_INFERENCE`; `XKX` is not silently reassigned to `SRB` or another country. A country/territory policy decision requires reviewed authoritative evidence.
- Stage 3 invalid: **1,320**. Stage 4 invalid: **558**. There are 61 non-finite engineering-fee payloads, 37 already overlapping the old accommodation errors; the historical 534 therefore omitted 24 additional invalid rows. The typed QC quarantines them with `SOURCE_PAYLOAD_SHAPE_INVALID`; the legacy dry-run validator also rejects non-finite money. No undefined/NaN financial write is permitted.
- Invalid in both: **487**. Unique invalid: **1,391**. Source-valid in both: **139**, still requiring canonical identities and relationships in the connected environment.
- Unresolved raw geography may be retained in a Draft. A supplied city without a canonical reference or an explicit pending geography review state blocks publication. Invalid Stage 3/4 plans cannot reach the commit gateway.

## Scholarships

947 unique sections = 703 explicit `IMPORTED` source candidates + 244 China transcription / 2027 verification-pending markers. The latter remain `UNKNOWN_MARKER` and `DO_NOT_PROMOTE`; the source's status text is retained verbatim.

The old v3.21 summary's 359 is not used for the replacement. The new file declares total records rather than a distinct imported count, so the declared imported count and summary difference are null. No inferred status changes or automatic merge occurs. Every section retains its original text, line endings, source hash and decision. Section labels, rather than shifted ordinal positions, distinguish participating universities, requirements and application links.

The 703 candidates require explicit provider university / beneficiary university / AcademicProgram owner / DegreeLevel / InternationalTest reviews. General majors are not canonical programs. An existing INS identity is required for university resolution. A program must belong to the selected university. A missing participating-university section stays empty, never populated from eligibility text. A non-university provider or inapplicable test requires a reviewed semantic decision, not a name-based inference.

## Courses

21,562 input rows → 21,559 distinct URL projections, with only the three known row pairs excluded and bound to the current source SHA-256. A new/changed overlap stops projection. Distinct POK Italian/English URLs remain separate; only the derived English display name is annotated. Raw titles remain unchanged.

Identity proposals use provider + normalized URL + language. They are not provider-native IDs or DB identities; existing provider adapters and actual stored identities must be checked in the connected environment. Unknown provider aliases/foreign domains, languages and every unresolved taxonomy term require explicit review. Provider headquarters are never inferred as a study country.

External courses retain the free-study **and** free-certificate, verified official-source and direct-link policies. Native/Paid origins retain their separate policy. A proposed language ID or a second unresolved topic cannot be hidden by an unrelated approved relationship. The old approximately 5,000-course artifact remains missing: no complete-history claim is made. No HTTP link checks were performed.

## Manual canonical choices

`CanonicalSourceReview` accepts a verified canonical snapshot with stable UUIDs, kind, active status, country scope, and program owner. It proposes exact candidates only. `decide` requires the same source key/hash and snapshot hash, an actor UUID, explicit reason/evidence, and `SELECT_EXISTING`, `HOLD`, or `EXCLUDE`. Foreign, inactive, missing, unscoped or stale targets fail closed; university choices must retain their verified INS public identity. The result contains an auditable decision hash and zero DB writes.

This source review record is **not an authorization token**. Existing owner APIs must reauthenticate the actor, verify current permissions, recheck canonical identity/scope/status and persist audit/outbox evidence when applying a reviewed choice. Do not write a source candidate public ID into a UUID FK.

## RUNTIME_UNTESTED

All live schema parity, canonical snapshot verification, permissions/audit persistence, concurrency, actual FK ownership, read-after-write and HTTP link health checks require the connected runtime. No migrations, seeds, imports, DB connections, deployment or Google AI Studio access occurred in this task. M10 is not closed; pilots/wide imports have not begun.
