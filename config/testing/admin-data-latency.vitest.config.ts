import { defineConfig } from 'vitest/config';
import baseline from '../../.section16-vitest.config';
export default defineConfig({
  ...baseline,
  test: {
    ...baseline.test,
    exclude: ['**/node_modules/**', '**/*.database.spec.ts', '**/RealDatabaseIntegration.spec.ts'],
    include: [
      'packages/domain/tests/authorization/**/*.spec.ts',
      'packages/application/tests/authorization/**/*.spec.ts',
      'packages/application/tests/review-workspace/**/*.spec.ts',
      'apps/admin/tests/dashboard/**/*.spec.tsx',
      'apps/admin/tests/review-queue/**/*.spec.tsx',
      'apps/admin/tests/cms/CmsClientDenials.spec.tsx',
      'apps/admin/tests/international-tests/TestReviewReasonClient.spec.ts',
      'apps/admin/tests/majors/MajorContentCommands.spec.ts',
      'apps/api/tests/presentation/api/router/AuthRouter.spec.ts',
      'apps/api/tests/presentation/api/router/DashboardCatalogBatch.spec.ts',
      'packages/infrastructure/tests/identity/StaffAccessRead.spec.ts',
      'packages/infrastructure/tests/dashboard/DashboardOwnerCounters.spec.ts',
      'packages/infrastructure/tests/majors/{PrismaMajorRepository.integrity,AdminDashboardCounterReads}.spec.ts',
      'packages/application/tests/majors/{AdminMajorUseCases,MajorGovernanceCloseout,CanonicalMajorReferenceService}.spec.ts',
      'apps/admin/tests/security/**/*.spec.ts*',
      'apps/api/tests/presentation/security/**/*.spec.ts',
      'apps/api/tests/presentation/middleware/AuthMiddleware.spec.ts',
      'packages/infrastructure/tests/authorization/**/*.spec.ts',
      'apps/api/tests/presentation/api/router/{ReviewWorkspace,ExecutiveDashboard}Router.spec.ts',
    ],
  },
});
