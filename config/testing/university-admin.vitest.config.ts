import { defineConfig } from 'vitest/config';
import baseline from '../../.section16-vitest.config';
export default defineConfig({
  ...baseline,
  test: {
    ...baseline.test,
    maxWorkers: 1,
    fileParallelism: false,
    testTimeout: 30000,
    include: [
      'packages/application/tests/universities/AdminUniversityUseCases.spec.ts',
      'packages/application/tests/universities/UniversityStageCards.spec.ts',
      'packages/infrastructure/tests/universities/UniversityStageSourceReader.spec.ts',
      'packages/infrastructure/tests/universities/PrismaUniversityRepository.spec.ts',
      'apps/api/tests/presentation/api/router/UniversityAdminRouter.spec.ts',
      'apps/admin/tests/universities/**/*.spec.tsx',
    ],
  },
});
