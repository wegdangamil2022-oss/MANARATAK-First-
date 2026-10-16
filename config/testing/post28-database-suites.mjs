export const DATABASE_SUITES = Object.freeze({
  assets: {
    files: ['packages/infrastructure/tests/asset-platform/PrismaAssetPostgres.database.spec.ts',
      'packages/infrastructure/tests/asset-platform/PrismaAssetReferenceSerialization.database.spec.ts'],
    minimumCases: 32,
  },
  leases: {
    files: ['packages/infrastructure/tests/background-jobs/PrismaBackgroundJobLease.database.spec.ts',
      'packages/infrastructure/tests/event-foundation/PrismaTransactionalOutboxLease.database.spec.ts'],
    minimumCases: 2,
  },
  persistence: {files: ['packages/infrastructure/tests/database/WholePlatformPersistence.integration.spec.ts'], minimumCases: 4},
  sections123: {files: ['tests/e2e/sections123/section01.database.spec.ts',
    'tests/e2e/sections123/section02.database.spec.ts', 'tests/e2e/sections123/section03.database.spec.ts'], minimumCases: 12},
});
export function databaseSuite(name) {
  if (!Object.hasOwn(DATABASE_SUITES,name)) throw new Error('POST28_DATABASE_SUITE_UNKNOWN');
  return DATABASE_SUITES[name];
}
