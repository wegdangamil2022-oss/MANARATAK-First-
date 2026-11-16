# MANARATAK — plan-to-code audit and remediation register (2026-10-11)

**Reference:** User Library `MANARATAK_ADMIN_REVIEW_CODEX(20261008-165132).md` (2026-10-08) and `main` @ `397753adc5718189a82d2c48bb88fd09a5450ba6` (2026-10-10). This Library plan is an *earlier audit snapshot*, not automatic evidence that fixes on later commits are absent or complete.

**Working PR:** [#15](https://github.com/wegdangamil2022-oss/MANARATAK-First-/pull/15) on `fix/plan-audit-ci-20261011`, source-only. No production mutation, deployment, import, migration, main merge, E2E browser or live provider test is authorized or claimed.

## Verification verdict

**NOT CLOSED / NOT PRODUCTION READY.** The plan reviews 28 sections and lists **at least 572 distinct numbered tasks in sections 08–28**; sections 01–07 are separate numbered checklists excluded from that count. A passing architecture guard or historical source-check is *not* proof that every task has met its acceptance criteria. The original final-system section itself recorded NO-GO. Any missing acceptance test, active database evidence, verified privacy boundary, reviewer decision, schema application or reproducible runtime is **UNVERIFIED**, not PASS.

## Section matrix

| Review section | Owner/module | Plan scope | Evidence-based status at this PR |
| --- | --- | ---: | --- |
| 01 | Identity & RBAC | source/checklist | IAM source/status verification required |
| 02 | Audit Center | source/checklist | audit source/status verification required |
| 03 | Enterprise Asset Platform | source/checklist | EAP runtime and privacy verification pending |
| 04 | Settings & Configuration | source/checklist | runtime verification pending |
| 05 | Universal Import / P6 | source/checklist | governed imports implemented in source, live promotion not certified |
| 06 | Global Reference Data / P7 | source/checklist | source closeout documented, migration/runtime still deferred |
| 07 | Academic Taxonomy / P8 | source/checklist | source closeout documented, runtime deferred |
| 08 | International Tests / P9 | 17 explicit tasks | later source fixes on main, full 17-task review unverified |
| 09 | Majors / P10 | 24 explicit tasks | later source fixes on main, full 24-task review unverified |
| 10 | Universities / P11 | 23 explicit tasks | later source fixes on main, full 23-task review unverified |
| 11 | Scholarships / P12 | 30 explicit tasks | later source fixes on main, full 30-task review unverified |
| 12 | Study Destinations | 26 explicit tasks | 26 audit tasks not re-certified |
| 13 | Learning & Courses / P13 | 28 explicit tasks | later source fixes on main, full 28-task review unverified |
| 14 | Certificates / P14 | 33 explicit tasks | 33 audit tasks; new main commits 1819c975, ba228426, 397753 require per-item verification |
| 15 | Student Support / P15 | 26 explicit tasks | partial scoped fixes in this PR; 26-task closure not certified |
| 16 | CMS / P16 | 30 explicit tasks | partial scoped fixes in this PR; 30-task closure not certified |
| 17 | Localization / P17 | 24 explicit tasks | 24 audit tasks; partial Arabic CI repair only |
| 18 | AI Platform | 30 explicit tasks | 30 audit tasks, no closure verified |
| 19 | Student Tools | 28 explicit tasks | 28 audit tasks, no closure verified |
| 20 | Finance | 29 explicit tasks | 29 audit tasks, no closure verified |
| 21 | Services | 28 explicit tasks | 28 audit tasks, no closure verified |
| 22 | Career / Jobs | 28 explicit tasks | 28 audit tasks, no closure verified |
| 23 | Notifications | 27 explicit tasks | 27 audit tasks, no closure verified |
| 24 | Review Queue | 26 explicit tasks | 26 audit tasks, no closure verified |
| 25 | Health & Readiness | 27 explicit tasks | 27 audit tasks, no closure verified |
| 26 | Admin Dashboard | 28 explicit tasks | 28 audit tasks, no closure verified |
| 27 | Cross-Module Integration | 37 explicit tasks | 37 audit tasks, no closure verified |
| 28 | Final System Audit | 23 explicit tasks | 23 audit tasks; reviewed baseline was explicit NO-GO |

## Source remediation delivered in this PR (not full closure)

- **Repository-level**: Native ESM API import, IAM Arabic-copy quality, Google AI Studio config inventory, 14 missing fail-closed migration-recovery classifications and exact dependency-injection reachability manifest (360 registrations using analyzer evidence).
- **Architecture**: Admin P7 type boundary, canonical reference identity in scholarship/courses selectors, scoped operational tool classification. GitHub Actions Source Architecture Guards observed PASS; see CI for individual source/quality gates.
- **P15 `STU-ADM-001`**: Consent history remains in canonical Student owner record; audit/outbox event omits before/after privacy preferences. Source regression assertions added.
- **P15 `STU-ADM-002`**: Cross-domain Support reads of course/certificate/service detail require independent owner permissions. No support impersonation. Source regression assertions added.
- **P15 `STU-ADM-004/005/006`**: Conditional version-based updates and required client version on workspace editing; stale commands fail closed. Scope is source-level; actual PostgreSQL concurrency not yet certified.
- **P16 `CMS-ADM-003`**: Republish now updates localized slug/canonical fields; old slug redirect and uniqueness/browser behavior still need DB/SEO smoke proof.
- **P16 `CMS-ADM-010`**: Strict locale slug lookup stops silently delivering another language as the requested locale.
- **P16 `CMS-ADM-020`**: Public redirect response returns only destination and status, excluding editor/reason/internal IDs; Supertest contract added.
- **P14**: Main already contains recent certificate-authoring/security commits. This PR does not certify all 33 P14 findings resolved; compare by `CERT-ADM-001..033` and test actual issuance/revocation/grants independently.

## High-priority remaining and blocked acceptance

1. **Fix every still-red CI gate without skipping checks.** At the time this document was prepared, the full source-closure pipeline was being re-run after DI manifest reconciliation. Do not label it green unless the exact head SHA's workflow concludes success.
2. **P14:** Per-item evidence for issuer external authority, private certificate artifact delivery/ACL and concurrent certificate replacement (CERT-ADM-001..003), followed by cryptographic verification, EAP and runtime race tests. No certificate is independently accredited merely by the MANARATAK completion workflow.
3. **P15:** Verify `STU-ADM-003` support actor/reason auditable *inside* the canonical mutation transaction; recheck remaining workspace/event/cache/retention/UX tasks and verify P15 fix regressions on disposable DB. Do not expose real students or privacy consents.
4. **P16:** Prioritize `CMS-ADM-001/002/004/005`: granular role-level author/reviewer/publisher separation, complete publication approval snapshot, last-known-good live navigation/announcement while editing, effective-editor maker/checker checks. Then `CMS-ADM-006..030` and real public URL/SEO tests.
5. **Cross-platform:** Reconcile every named audit task in the 28-section plan with a code reference, unit/API negative test, reviewer disposition, commit and environment-specific runtime evidence. Source closure and production readiness are distinct decisions.

## Safety boundaries

- Do **not** deploy code or apply Prisma migrations, seeds, backfills, destructive patches, real PII probes or live imports on this review PR.
- Do **not** merge to `main` until all required gates are green, source correctness re-reviewed, and operator approves rollout/migrations separately.
- No task counts above are a number of *still open* items: they count audit findings at the original October 8 baseline. Never subtract code commits from task totals without acceptance evidence.
