# Phase 08 P8K-1: Academic Taxonomy Admin UI Readiness Audit

## 1. Existing UI Confirmation
- **Files Inspected:** `apps/admin/src/App.tsx`, `apps/admin/src/pages/AdminDashboardPage.tsx`, `apps/web/src/router/index.tsx`, `apps/admin/src/pages/*`, `apps/admin/src/i18n/*`
- **Result:** The Academic Taxonomy admin UI **does not exist yet**. There are no routes, pages, or references to `AcademicTaxonomyAdminPage`, `AcademicTaxonomyDetailPage`, or `/admin/academic-taxonomy` in the admin or web apps.

## 2. Current Admin Page Patterns
- **API Fetching:** Admin pages typically use `adminApiClient.request<PaginatedResponse<any>>` or a custom `useFetchData` hook calling the `/api/v1/...` endpoints directly.
- **Routing:** Routes are added manually in `apps/admin/src/App.tsx` within the `<Routes>` component. Navigation links are also hardcoded in the header `<nav>`.
- **Dashboard Cards:** Cards are dynamically rendered in `AdminDashboardPage.tsx` by adding an entry to the `summarySources` array, which specifies the `key`, `labelKey`, `href`, `endpoint`, and `icon`.
- **i18n:** Translations are maintained as simple flat key-value pairs in `apps/admin/src/i18n/en.ts` and `apps/admin/src/i18n/ar.ts`.
- **State Handling:** Pages handle `loading`, `error`, and `data` states using standard React `useState` and `useEffect` patterns. Errors are displayed in simple text, and a loading spinner (`Loader2` from `lucide-react`) is shown during fetches.
- **Detail Pages:** Detail pages fetch data by ID from the route params and display read-only details or forms for editing, often utilizing a tabbed interface (`activeTab` state) for complex sections.

## 3. Recommended P8K-2 UI Implementation Structure
**Required Routes (in `apps/admin/src/App.tsx`):**
- `<Route path="/academic-taxonomy" element={<AcademicTaxonomyAdminPage />} />`
- `<Route path="/academic-taxonomy/:nodeId" element={<AcademicTaxonomyDetailPage />} />`

**Main Page Requirements (`AcademicTaxonomyAdminPage`):**
- **Title:** Academic Taxonomy / التصنيف الأكاديمي
- **Search:** Input field utilizing `GET /api/v1/academic-taxonomy/search`
- **Filters:** Dropdowns for `nodeType`, `standardType`, and `status`.
- **Display:** A table or list view showing `canonicalName`, `canonicalCode`, `nodeType`, `standardType`, and `status`.
- **API:** Fetch list via `GET /api/v1/academic-taxonomy/nodes`. No mock data or Phase 10 fake nodes.

**Detail Page Requirements (`AcademicTaxonomyDetailPage`):**
- **Data Fetching:** 
  - Node Details: `GET /api/v1/academic-taxonomy/nodes/:nodeId`
  - Children: `GET /api/v1/academic-taxonomy/nodes/:nodeId/children`
  - Parents: `GET /api/v1/academic-taxonomy/nodes/:nodeId/parents`
- **Tabs/Sections:**
  - Overview (basic info)
  - Hierarchy (parents/children)
  - Aliases (pending states if read endpoints not ready)
  - Standards & Mappings (pending states if read endpoints not ready)
  - Validation
  - Import Review

## 4. API Boundary
- **Rule:** The UI must strictly use real endpoints.
- **Restrictions:** No fake taxonomy data, no mock nodes, no Phase 10 major data, no Phase 06 direct calls, and no publish/auto-merge UI.

## 5. Dashboard and Navigation Integration Points
- **Dashboard Card:** Add an entry to `summarySources` in `apps/admin/src/pages/AdminDashboardPage.tsx` linking to `/academic-taxonomy`, using the endpoint `/api/v1/academic-taxonomy/nodes` to fetch the total count.
- **Nav Label:** Add a `<a href="/academic-taxonomy">` link in the `<header>` nav section of `apps/admin/src/App.tsx`.
- **Translations:** 
  - English (`apps/admin/src/i18n/en.ts`): `"admin_nav_academic_taxonomy": "Academic Taxonomy"`
  - Arabic (`apps/admin/src/i18n/ar.ts`): `"admin_nav_academic_taxonomy": "التصنيف الأكاديمي"`

## 6. Allowed Files for P8K-2 Implementation
- `apps/admin/src/App.tsx`
- `apps/admin/src/pages/AdminDashboardPage.tsx`
- `apps/admin/src/pages/AcademicTaxonomyAdminPage.tsx` (to be created)
- `apps/admin/src/pages/AcademicTaxonomyDetailPage.tsx` (to be created)
- `apps/admin/src/i18n/en.ts`
- `apps/admin/src/i18n/ar.ts`

## 7. Forbidden Files
- `packages/**`
- `apps/api/**`
- `schema.prisma`
- Phase 06 files
- `package.json`
- Unrelated admin/web files

## 8. Confirmation
- **Status:** Audit completed successfully.
- **Changes:** No files were modified during this audit.

**Classification:** PHASE_08_P8K1_ACADEMIC_TAXONOMY_ADMIN_UI_AUDIT_COMPLETE_NO_CODE_CHANGES
