# MANARATAK 2.0 — Owner functional decisions DEC-01…DEC-07

- Date: 2026-10-16
- Scope: Post28 / owner product policy for scholarships, programmes, courses and international-test requirements
- Basis: explicit owner approvals during the current planning conversation; background and original questions in `docs/remediation/POST28_ISOLATED_VALIDATION_EXECUTION_PLAN_v1.3_2026-10-16.md`, §12.6, and `docs/remediation/post28-readiness-20261016/decisions.json`.
- Branch: `fix/post28-ci-environment-inventory-20261016`
- Status: **OWNER_FUNCTIONAL_DIRECTION_APPROVED (7/7)**; **NOT technical closure, not R06 scenario acceptance, not production authorization**.

This document records the product owner's decisions. It does not authorize database mutations, historical migration edits, rollout, override of test gates, changes in the R00–R14 order, or silent adoption of a specific Prisma/SQL implementation. The existing machine registry and measured acceptance evidence retain their statuses until independently updated from appropriate runtime proof. The seven approvals are not seven passed tests.

## DEC-01 — Scholarships: degree × major association

**Owner direction: approved.** Within a scholarship, every advertised major must be associated with the *specific academic degree* for which it is funded/eligible. On the public scholarship detail page, selecting bachelor's/master's/doctorate displays only those majors associated with that degree within that scholarship. The same authoritative relation must drive search, filters, owner/admin and public results. Do not infer arbitrary degree-major pairs by intersecting independent scholarship-wide degree and major lists.

Example: funded BSc–Computer Science and PhD–Medicine do **not** establish BSc–Medicine. Support for a generic scholarship that does not specify programme/major must be represented honestly as unknown/general, not expanded to unsupported pairs.

**Technical follow-up:** assess canonical programme ID vs explicit versioned degree-major scholarship target/eligibility representation; preserve correct owner provenance, migrations/review gates, forward/reverse read semantics, and positive/negative `CD-007`/`CD-008` tests. The choice of physical schema is **not** approved here.

## DEC-02 — Scholarships: country semantics

**Owner direction: approved.** Keep separately:
1. **Study destination country** (where study occurs).
2. **Eligible applicant nationality/country** (who may apply; multiple nationalities can be eligible when evidenced).
3. **Sponsoring/funding country** (source of funding).

Neither country-of-study nor sponsor country is automatically an applicant's nationality. Owner records and user filters must observe these separate meanings.

**Technical follow-up:** confirm canonical reference IDs, source evidence, eligibility scope and valid country mapping. **Multi-destination scholarship representation/cardinality is not yet approved**; do not invent multi-country support or conflate multiple nationalities with multiple destinations. `CD-009` remains pending full proof.

## DEC-03 — Free external courses vs free certificates

**Owner direction: approved.** A course can appear in the **free study/free courses** category when the instruction/study itself is free. Certificate price is a separate, evidenced attribute: free, paid or unknown. A paid certificate does not disqualify otherwise-free study, but must be clearly disclosed. Do not claim a free certificate without evidence, and do not classify paid study as free merely because a certificate is free.

**Technical follow-up:** unify import mapping, publishing guard, public catalog/graph and UI on this policy; preserve evidence and implement `FX-COURSE-01` / `CD-012` positive/negative cases. No automatic publishing simply because a course is classified free.

## DEC-04 — Courses associated with majors and degree levels

**Owner direction: approved.** Show courses relevant to a major in the general major-course listing. Offer bachelor/master/doctorate-level filtering **only when the course-to-degree/profile association is explicitly documented**. Unscoped courses may remain in the general major listing, but must not be promoted to a specific academic degree merely because a course description contains a training-level label such as `studyLevelRaw`.

This differs from DEC-01: scholarship funded major-degree pairs require explicit evidence; a general course need not claim an academic degree.

**Technical follow-up:** verify `CourseMajorProjection.profileId`, owner query, API and UI behaviour; if no supported documented degree facet exists, do not show a misleading one. `CD-017` requires end-to-end evidence.

## DEC-05 — Revocation of course taxonomy relationships and derived projections

**Owner direction: approved.** Rejecting/revoking an incorrect course-to-major/taxonomy link must promptly remove it from public pages, search and any derived projections/cache that depend on **that specific link**, while leaving unrelated, independently approved `DIRECT_REVIEWED` or other valid associations intact. Preserve decision provenance, actor, timestamp, audit history; changed mapping, removed source term or changed official course-source identity requires affected links/projections to be reviewed before being presented as approved again.

**Technical follow-up:** define legal state transitions, atomic transaction and outbox/invalidation boundaries, retry/idempotency and rollback. Do not delete historical audit evidence, or silently reinstate invalidated links. Test `CD-013`…`CD-016`, including concurrent/failure and stale-cache cases. Exact state names/data migration are **not** implicitly approved.

## DEC-06 — Prevent logically duplicate programme test requirements

**Owner direction: approved.** Prevent two active logically identical admission-test requirements for the same academic programme, including when optional `testVariantId`/`testVersionId` values are `NULL`, and under concurrent admin/import writers. Genuinely distinct tests, variants or versions may co-exist where justified by the programme's official requirements. Do not rely on an ordinary nullable composite unique key to establish uniqueness it cannot enforce.

**Technical follow-up:** test actual PostgreSQL concurrency and all write paths, and choose a safe DB + application protection approach (for example suitable unique index semantics, transactional serialization, or equivalent); review deployment/upgrade compatibility. No particular index, constraint, or data cleanup is owner-approved yet. `CD-005` remains pending complete proof.

## DEC-07 — Canonical teaching language at academic-programme level

**Owner direction: approved.** Teaching language belongs to each actual **academic programme**, not to a university as a whole or to the display language of a website. A programme can have one or multiple evidenced teaching languages using canonical language references. Without a verified source the value is **unspecified**, never assumed to be English. University/programme/scholarship listings and teaching-language filters must use the authoritative *programme-level* relationship; a scholarship filter must not imply language support where the eligible scholarship-programme relationship does not establish it.

**Technical follow-up:** verify the canonical owner read/query and source evidence for `FG-024`, UI and API filters, market-specific proof and stale-reference invalidation. **Mandatory launch countries/markets are deliberately deferred for later owner selection**; do not claim FG-024 or G3 is fully accepted or invent launch markets.

## Evidence and implementation guardrails

1. **Functional approval is not test acceptance.** Maintain separate fields for `ownerFunctionalDecision=APPROVED`, `technicalDesign=REVIEW_REQUIRED`, `runtimeEvidence=PENDING`, and `acceptance=CURRENT_STATUS_FROM_MEASURED_EVIDENCE`. The R06 required-case matrix currently has no fully accepted mandatory scenario merely by virtue of this document.
2. Before implementing, compare each decision with canonical owner domain services, SQL/Prisma schema, historical migrations, public/search read paths, cache and API/UI, as applicable. Report any remaining ambiguity. Do not infer implementation from the product approval alone.
3. The business decision is explicit; technical selection (new schema shape/unique-index strategy/state machine) is delegated for design review, **not** a blanket authorization to change a database. Changes need reviewed append-only migrations and newly frozen SHA/isolated runtime evidence as prescribed by the gates.
4. `DEC-02` multi-destination design and `DEC-07` launch-market selection remain open scope decisions. Any other newly found edge case needing product preference must be surfaced rather than silently decided.
5. Continue safe independent R06 evidence while preserving R05/other blockers. Tests must distinguish source-only validation, local PostgreSQL rehearsal, cloud/Neon evidence, full owner workflow acceptance and production GO/NO_GO.
6. Do not automatically change the existing `decisions.json` `status` to `CLOSED` or mark `CD-*` `fullScenarioPassed=true`; update the machine registry only with traceable approved semantics and separate verified implementation evidence.

## Hand-off to Codex

Treat these seven clauses as the **owner-approved functional contract** for further investigation and fixes. Cross-reference §12.6, `docs/remediation/post28-readiness-20261016/decisions.json` and the newest `required-case-status.json`. For each `DEC-0x`, report the technical implementation choice, affected models/queries/screens, source tests, real PostgreSQL/API/UI tests where required, unresolved scope, source SHA and evidence hashes. Do not convert the approval into `R06=PASS` or bypass pending prerequisites. Do not merge `main`, use production databases or deploy as a result of this record.
