import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'apps/api/tests/presentation/api/router/MajorImportE2E.spec.ts',
      'apps/api/tests/presentation/api/router/CheckDbE2E.spec.ts',
      'packages/infrastructure/tests/auth/PrismaCredentialIntegration.spec.ts',
      'packages/infrastructure/tests/auth/RealDatabaseIntegration.spec.ts',
      'packages/infrastructure/tests/courses/PrismaCourseRepository.integration.spec.ts',
      'packages/infrastructure/tests/courses/PrismaExternalCourseProviderRepository.integration.spec.ts',
      'packages/infrastructure/tests/courses/PrismaCourseRelationships.integration.spec.ts',
      'packages/infrastructure/tests/courses/PrismaImportedCourseOperationsRepository.integration.spec.ts',
      'packages/infrastructure/tests/courses/ImportedCourseRuntimeDatabaseIntegration.spec.ts',
      'packages/infrastructure/tests/courses/ImportedCourseRealTransferDatabaseIntegration.spec.ts',
      'packages/infrastructure/tests/background-jobs/PrismaBackgroundJobLease.database.spec.ts',
      'packages/infrastructure/tests/event-foundation/PrismaTransactionalOutboxLease.database.spec.ts',
      'packages/infrastructure/tests/database/WholePlatformPersistence.integration.spec.ts',
    ],
    testTimeout: 20_000,
    hookTimeout: 30_000,
    fileParallelism: false,
  },
});
