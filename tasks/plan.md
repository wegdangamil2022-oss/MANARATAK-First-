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


# Destinations and reference administration — approved v1.16

Baseline: latest main 10179ab97eddba9b236238714dea1d68859f469e inspected; relevant source files match the current branch baseline. Work branch: feat/destinations-reference-admin-20261026, stacked on completed courses branch. Preserve the earlier course work and its remaining operational notes above.

1. Section 08: preserve list cards, fix URL/context and metric scope. Ten sections in four groups, one content language, readable/editable cards, lossless arrays, explicit translation guards, protected preview, source/readiness repair links. Reuse original versioned owner commands and read contracts; lazy owner relationships with server filters/pages.
2. Verify section 08 contracts, permissions, EN preservation, conflicts, publication invalidation, old links, desktop/mobile/RTL/LTR using isolated fixtures. Deliver the two slices together after shared draft-guard and owner-integration acceptance; both remain isolated from main.
3. Section 09: six-entry reference workspace, five paged table/card lists, per-section URL/filter state, canonical hierarchical choices, read-first detail dialogs and existing governance. Keep source previews, owner approvals, standards and nine quality issue types available in the sixth workspace.
4. Verify reference identity/version/lifecycle/owner protections, conflict/empty/error states, UI keyboard/mobile. Build/typecheck and inspect current runtime without writing synthetic data to the original database. No production migration, seeding, merge or external activation authorized by this task.

Data ownership: P7 canonical identity; StudyDestinationProfile current editorial owner (future CMS integration is not migrated here); universities/programs/majors/scholarships remain read-only owner links. Missing source/translation/metrics remain explicit. No new schema is assumed.
