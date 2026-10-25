# Courses administration — approved v1.14

Source: `C:/Users/HP/Downloads/مراجعة_الإدارة_العامة_منارتك_v1.14.md`, section 07, read 2026-10-25.
Baseline: `feat/international-tests-admin-20261025` at `41642933`; latest main inspected at `10179ab9`, relevant course files identical.
Branch: `feat/courses-admin-workspaces-20261025`. No main merge or original database writes.

## Delivery order

1. **07.C common entry and read contracts.** Establish the three static routes before the ID route, one URL-driven filter state, stable server sorting and bounded pagination, accurate certificate/study states, honest filtered statistics, and reusable table/cards. Paid is an interface-only preparation page. Preserve actual import/provider/learning-path tools and existing authoring access.
2. **07.A external courses.** Reuse the common catalog, then implement a single five-section drawer, versioned section edits, source/link/readiness commands, manual creation and safe snapshot-based bulk publication. Test identity/dedup, source preservation, concurrency and large catalogs on isolated PostgreSQL.
3. **07.B native courses.** Reuse the native catalog and existing authoring contracts, complete the unified editor/content blocks/versioned learner experience, student reports and certificate links. Existing financial gates remain; new paid operations are explicitly deferred by 07.C.07.

## Why this order

The common read boundary establishes the meanings of origin versus access, certificate facts and filter scope once. External administration then provides a complete source-governed workflow without coupling it to the substantially larger internal learning/version/progress model. Each phase has its own verification and completion record; entry routes do not imply the later workflows are complete.

## Constraints

- Reuse Course, provider registry, original import operations and canonical relations; no parallel catalog.
- Cairo, indigo/petrol/cyan, limited gold, scoped styles, RTL/LTR and phone verification.
- No fabricated metrics, prices, certificate evidence, source content or student activity.
- No production migrations/imports/acceptance writes, live payments/certificates or changes to other admin sections.
- Keep old detail links valid until their replacements are verified. Do not delete existing useful functions.

Task details and verification checkpoints: `tasks/todo.md`.
