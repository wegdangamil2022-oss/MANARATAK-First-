# University administration layout — 2026-10-23

Owner request: apply the scholarship catalog's approved control appearance to universities, put creation at the top, preserve the uploaded project's content and all existing fixes, and organize cards and university details.

Reference: previously extracted `MANARATAK-First--main.zip` university list and relationship editor. The source list uses a table. That table remains available; a wide-card view matching the approved scholarship presentation is added as the default. This is a design adaptation, not a claim that the reference ZIP contained this card view.

## Result

- Hero actions: create university, academic program workspace, refresh, import center and study destinations. Creation reveals one existing private-draft form with its permissions, source/reason requirements and request contract intact.
- One search/filter area: country, administrative region, city, institution type, review/publication status, completeness and sorting. These are supported by the existing strict University list API; no unsupported filters are fabricated.
- Shared approved filter appearance: 48px height, Cairo, consistent sizes/borders and gold/indigo/turquoise icons. No per-field search icons or previous/next controls. Compact options continue inside the dropdown.
- Geographic choices load through the canonical owner APIs. Parent selection clears descendants, and region/city loaders receive the exact country code. Deep-linked country IDs beyond the first bounded page are resolved without guessing or rewriting selected IDs. Failed lookups remain visible and dependent choices stay disabled until resolved.
- Wide cards show actual name/location, status, foundation year, completeness and details navigation; unknown values are not invented. The original table, website links, total counts and list pagination remain available.
- Detail header and navigation organize ten existing areas: identity/documents, location, admissions, accreditations, campuses, faculties/departments, programs/tests, tuition, accommodation/living costs and rankings. Section fields, independent save operations, review reasons, optimistic revisions, publication guards and admission-score additions remain intact. Navigation uses anchors without unmounting forms, preserving unsaved changes.
- No API, schema, database, migration or external deployment changes.

## Evidence

- Two targeted location-filter tests passed: exact country resolution on page two and dependent-loader enabling/country-code propagation.
- Admin TypeScript and Vite build passed. Existing font-resolution/chunk-size build warnings remain.
- Changed TSX lint: zero errors, five existing hook warnings.
- Chromium against the actual built artifact with synthetic responses: seven filters; exact country/region/city requests and descendant resets; reset; single create form; card/table switch; all ten detail anchors; unsaved identity edits retained across navigation; no JavaScript errors or content-write requests.
- At 1360/820/390px, filter controls measured 48px with Cairo and all three icon colors; list and detail had no horizontal page overflow.
- Browser fixtures do not verify live imported university content or authorize publishing. Local authentication/read runtime restrictions remain in force.

Private evidence directory: `private/admin-university-layout-20261023`, including browser JSON, screenshots, staged bundle and the artifact-install receipt.
