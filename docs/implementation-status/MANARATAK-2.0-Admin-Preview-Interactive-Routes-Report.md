# MANARATAK 2.0 - Admin Preview Interactive Routes Report

## Goal
Make the Admin Preview Shell usable by turning each card into an interactive navigation item and providing safe, generic preview pages for the Google Studio environment. 

## Routes Added
Registered the following same-origin preview routes under `/admin` in `apps/web/src/router/index.tsx`:
- `/admin/dashboard`
- `/admin/scholarships`
- `/admin/universities`
- `/admin/majors`
- `/admin/international-tests`
- `/admin/courses`
- `/admin/services`
- `/admin/cms`
- `/admin/student-tools`
- `/admin/health`

## Files Changed
- `apps/web/src/router/index.tsx`: Registered new paths mapped to preview components.
- `apps/web/src/features/admin-preview/AdminPreviewShell.tsx`: Transformed UI cards into functional `<Link>` components targeting their respective sub-routes.
- `apps/web/src/features/admin-preview/AdminGenericPreviewPage.tsx` (New): A generic template displaying the page title, a "Preview only" status badge, and an explanatory description.
- `apps/web/src/features/admin-preview/AdminScholarshipsPreviewPage.tsx` (New): A specialized preview showcasing intended admin actions (Add, Import) as disabled buttons, alongside static view counters for Imported Records, Needs Review, Published, and Archive.
- `apps/web/src/features/admin-preview/AdminHealthPreviewPage.tsx` (New): A static system status preview confirming the Google Studio preview shell is active.
- `apps/web/src/features/admin-preview/index.ts` (New): Export barrel.
- `apps/web/src/i18n/en.ts` & `apps/web/src/i18n/ar.ts`: Appended translated UI strings for page titles, buttons, and preview messages (e.g., `admin_dashboard`, `preview_only_desc`, `back_to_admin`).

## Card Navigation Behavior
- Cards are now fully interactive `<Link>` elements, supporting keyboard navigation and screen readers (via `aria-label`).
- Focus states include a visible ring (`focus:ring-2 focus:ring-blue-500`) for accessibility.

## Protected Access Behavior
- Each preview component (Generic, Scholarships, Health) actively validates `localStorage.getItem('manaratak_demo_role') === 'admin'`.
- If a public user attempts to access these routes directly, they are seamlessly redirected to `/login` via `<Navigate to="/login" replace />`.

## Remaining Blockers Before Real Admin Operations
- Backend APIs (like scholarship imports) are not yet integrated into this web preview. Real mutations will be restricted to the true `apps/admin` portal running locally on port 3001, or they require wiring to the unified server if full preview capabilities are requested later.

## Verification
- Local build completed successfully.
- Linter passed.
- Unit tests verified.
