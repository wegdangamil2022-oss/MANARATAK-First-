import { defineConfig } from 'vitest/config';
import baseline from './.section15-vitest.config';
export default defineConfig({
  ...baseline,
  test: {
    ...baseline.test,
    include: [
      'packages/infrastructure/tests/students/StudentSupportSourceGaps.spec.ts',
      'packages/infrastructure/tests/students/PrismaStudentWorkspaceRepository.spec.ts',
      'apps/api/tests/infrastructure/workers/PollingWorkerRuntime.spec.ts',
      'apps/api/tests/presentation/api/router/StudentSupportAdminRouter.spec.ts',
      'packages/infrastructure/tests/services-platform/PrismaServicePaymentSupportTriage.spec.ts',
      'packages/application/tests/services-platform/ServiceRequestUseCases.spec.ts',
      'apps/admin/tests/students/StudentSupportAdminPage.spec.tsx',
    ],
  },
});
