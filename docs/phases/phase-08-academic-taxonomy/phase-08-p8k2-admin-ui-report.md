# Phase 08 P8K-2: Academic Taxonomy Admin UI Minimal Binding

## Implementation Overview

### Files Created:
1. `apps/admin/src/pages/AcademicTaxonomyAdminPage.tsx`
2. `apps/admin/src/pages/AcademicTaxonomyDetailPage.tsx`

### Files Modified:
1. `apps/admin/src/App.tsx`
2. `apps/admin/src/pages/AdminDashboardPage.tsx`
3. `apps/admin/src/i18n/en.ts`
4. `apps/admin/src/i18n/ar.ts`

### Routes Added (in `App.tsx`):
- `/academic-taxonomy` -> `AcademicTaxonomyAdminPage`
- `/academic-taxonomy/:nodeId` -> `AcademicTaxonomyDetailPage`

### API Endpoints Used (via `adminApiClient.request`):
- `GET /api/v1/academic-taxonomy/nodes` (List nodes)
- `GET /api/v1/academic-taxonomy/search` (Search nodes)
- `GET /api/v1/academic-taxonomy/nodes/:nodeId` (Node detail)
- `GET /api/v1/academic-taxonomy/nodes/:nodeId/children` (Node children)
- `GET /api/v1/academic-taxonomy/nodes/:nodeId/parents` (Node parents)

### Dashboard / Nav / i18n Changes:
- **Nav Header:** Added Academic Taxonomy link in `App.tsx` header.
- **Translations:** Added `admin_nav_academic_taxonomy` to `en.ts` ("Academic Taxonomy") and `ar.ts` ("التصنيف الأكاديمي").
- **Dashboard:** Appended Academic Taxonomy as a new card in `AdminDashboardPage.tsx` (`summarySources`), using the `Network` icon and pointing to `/academic-taxonomy/nodes` to evaluate total active taxonomy records, and added a link to it in the quick links section.

### Scope and Constraint Confirmation:
- **No Fake Data:** Used strictly real endpoint payloads. No mocked fallback trees are rendered.
- **No Phase 10 Data:** No references to generic major classification (Phase 10) structures or fake scores exist.
- **No Phase 06 Direct Calls:** The Import Review tab correctly displays only a warning message emphasizing that Phase 06 imports happen via batches, without direct actions.
- **No External Modifications:** `packages/`, `apps/api/`, and `schema.prisma` files were fully respected and completely avoided.

### Code Quality:
- `npx tsc --noEmit` executed successfully with 0 errors.
- `npm run lint` executed successfully with no errors introduced in the modified files.

Classification:
PHASE_08_P8K2_ACADEMIC_TAXONOMY_ADMIN_UI_MINIMAL_BOUND
