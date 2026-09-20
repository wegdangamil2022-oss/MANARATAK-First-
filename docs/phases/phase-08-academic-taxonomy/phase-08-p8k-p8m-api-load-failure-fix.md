> **Historical / superseded runtime note (MNT-AUD-0109, W2):** `createInMemoryPrismaClient()` was removed from the canonical production composition on 2026-09-06. This document is retained only as historical evidence and must not be used as current runtime authority.

# Phase 08 P8K/P8M Runtime Fix: Academic Taxonomy API Load Failure

## Root Cause
The `createInMemoryPrismaClient` used by the DI container in the preview environment did not include mock handlers or arrays for the newly created `academicTaxonomyNode`, `academicTaxonomyEdge`, `academicTaxonomyAlias`, and `academicStandardMapping` entities. When the frontend attempted to query `/api/v1/academic-taxonomy/nodes`, the backend crashed with `TypeError: Cannot read properties of undefined (reading 'findMany')` because `prisma.academicTaxonomyNode` was undefined.

## Files Modified
- `apps/api/src/infrastructure/di/container.ts`: Added `academicTaxonomyNode`, `academicTaxonomyEdge`, `academicTaxonomyAlias`, and `academicStandardMapping` collections (empty arrays) and initialized their mock Prisma handlers using `createModelHandler`.

## API Responses
After the fix and restarting the dev server, the endpoints are functioning successfully.
- Request: `GET /api/v1/academic-taxonomy/nodes`
- Response: `{"data":[]}`
- As required, the UI now displays the empty state message: "لا توجد عناصر تصنيف أكاديمي حتى الآن." without any red error banners.

## Constraints Confirmed
- No fake taxonomy data was seeded or inserted into the arrays.
- The UI naturally falls back to its empty state when `data: []` is returned.
- No dummy Phase 10 integration or fallback models were introduced.
- The UI exclusively hits the actual `adminApiClient.request('/academic-taxonomy/nodes')` which cleanly calls the backend without hardcoding or bypass.

## Test Results
- `npx vitest run apps/api/tests/presentation/api/router/AcademicTaxonomyPublicRouter.spec.ts apps/api/tests/presentation/api/router/AcademicTaxonomyAdminRouter.spec.ts`
  - Result: 2 Files Passed, 19 Tests Passed.
- `npx tsc --noEmit` on `apps/admin`:
  - Exited with code `0`. Clean compilation.

## Final Decision
The API load failure has been fully resolved by completing the DI container mocking for the development environment.

Classification:
PHASE_08_ACADEMIC_TAXONOMY_API_LOAD_FAILURE_FIXED
