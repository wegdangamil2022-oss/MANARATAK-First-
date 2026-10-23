# Scholarship catalog layout restoration — 2026-10-23

Owner request: use the uploaded project design for scholarship cards and detail sections; integrate country, major and related filters with funding/deadline filters; keep the catalog heading horizontal and creation separate from filtering.

Reference: `C:/Users/HP/Downloads/MANARATAK-First--main.zip`, previously extracted under the private `admin-first10-20261023/MANARATAK-First--main` directory. Its scholarship list and catalog detail already contain the wide cards and nine detail sections. Those structures and current canonical editing contracts are retained rather than replacing them with an older data model.

## Changes

- One search/filter card contains funding, deadline, country, language, currency, university, major, degree, test, academic program, verification, translation, source, sponsor and ordering controls. The separate relationship/source filter panel is removed.
- Searchable canonical selectors use compact presentation here; search and bounded page navigation still work, off-page IDs remain retained, and historical inactive records can still be targeted by read filters. Other editor pickers keep their existing presentation.
- The create action is in the hero. It reveals one existing private-draft form, preserving review reasons, permissions and creation request semantics.
- The hero reserves usable width for the title and wraps actions separately. Cairo, existing palette and icons remain in use.
- Original wide cards and all nine detail sections remain: identity, overview, funding, degrees/majors, eligibility, documents, official links, notes and health/audit. Canonical relationship editing and lifecycle review additions remain present.
- Unknown degrees/deadlines/funding on cards are no longer replaced by invented values. The detail sidebar reports the owner's completeness result instead of a hardcoded 100% claim.

## Verification

- TypeScript admin build passed.
- Admin Vite build passed. Existing large-chunk/font-resolution build warnings remain.
- Focused B06 canonical-authoring suite: 9 passed. The additional compact-picker case verifies page navigation, exact selected ID preservation and search pagination reset. Existing label assertion updated for the simplified visible major label.
- ESLint: zero errors, six warnings in existing hook/type patterns.
- Isolated Chromium check against the actual built bundle: 1360, 820 and 390px widths, Cairo, no horizontal overflow, create-form reveal, exact country ID sent to list API, card-to-detail navigation and all nine detail sections. Synthetic API responses only; no database contact or content writes in this browser check.

## Boundary

The current strict scholarship-list API has country, university, major, degree and academic-program IDs, but no faculty/college filter. A faculty control was not fabricated or mapped to an unrelated major ID. Supporting it requires a separately reviewed domain/query contract. No API, database, migration, publishing or production changes are part of this layout change.

This confirms layout and existing client interactions, not acceptance of live scholarship import/publishing against Neon. The local runtime retains its existing authentication/read diagnostic restrictions.

## Filter appearance follow-up

At the owner's request, all 16 filter fields now share the funding/deadline appearance: 48px controls, Cairo at 12px/700, identical colors, borders and radius, consistent labels, and an icon before each label. Review locale has its own labeled grid cell instead of a second unlabeled row under translation. CSS changes are scoped to the scholarship filter grid; selector icons are optional elsewhere.

Admin TypeScript and Vite build passed. A focused synthetic browser style check at 1360/820/390px confirmed 16 matching computed control styles, all 16 fields with icons, and no horizontal overflow. Existing authoring suites were not repeated for this presentation-only follow-up.

## Simplified filter controls

The owner subsequently requested removal of per-field previous/next controls and search icons. Compact scholarship selectors now place continuation inside the select as “Load more options”; choosing it appends the next bounded owner page without applying the continuation marker as a filter or dropping earlier options/current IDs. Other authoring selectors retain their search and pagination. Filter icons alternate gold, indigo and turquoise. The main scholarship text search remains available.

Verification: 9 focused canonical-authoring tests passed, including compact continuation without external buttons and preservation of earlier options/current selection; admin TypeScript and build passed. Synthetic browser checks at three widths confirmed no per-field buttons, all three icon colors, consistent 48px controls and no horizontal overflow.
