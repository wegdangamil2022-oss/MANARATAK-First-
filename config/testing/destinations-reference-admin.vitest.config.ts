import { defineConfig } from 'vitest/config';
import baseline from '../../.section16-vitest.config';
export default defineConfig({ ...baseline, test: { ...baseline.test, maxWorkers: 1, fileParallelism: false,
  include: ['packages/domain/tests/reference-data/**/*.spec.ts', 'packages/domain/tests/study-destinations/**/*.spec.ts',
    'packages/application/tests/study-destinations/**/*.spec.ts', 'packages/application/tests/reference-data/**/*.spec.ts',
    'packages/infrastructure/tests/reference-data/**/*.spec.ts', 'packages/infrastructure/tests/study-destinations/**/*.spec.ts', 'packages/application/tests/read-models/CrossDomainGraphReadService.spec.ts',
    'apps/api/tests/presentation/api/router/StudyDestination*.spec.ts', 'apps/api/tests/presentation/api/router/ReferenceData*.spec.ts',
    'apps/api/tests/presentation/api/router/AcademicProgramExplorerRouter.spec.ts',
    'apps/admin/tests/destinations-reference/**/*.spec.ts*'],
  exclude: ['**/*.database.spec.ts', '**/*.integration.spec.ts'], testTimeout: 30000,
} });
