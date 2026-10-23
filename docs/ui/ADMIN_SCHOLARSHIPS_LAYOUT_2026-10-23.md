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
