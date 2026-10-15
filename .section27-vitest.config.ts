import { defineConfig } from 'vitest/config';
import base from './.section16-vitest.config';
export default defineConfig({
  ...base,
  test: {
    ...base.test,
    include: [
      'packages/application/tests/students/StudentApplicationTrackerUseCases.spec.ts',
      'packages/infrastructure/tests/students/PrismaStudentApplicationTrackerRepository.spec.ts',
      'apps/web/tests/students/StudentApplicationDocuments.spec.tsx',
      'apps/admin/tests/pages/CrossModuleIntegrity.spec.tsx',
    ],
  },
});
