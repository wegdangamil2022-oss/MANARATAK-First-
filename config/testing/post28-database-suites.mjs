export const DATABASE_SUITES = Object.freeze({
  'owner-relations': {files: ['tests/database/post28-owner-relations.database.spec.mjs'],minimumCases:20},
  'university-relations': {files: ['tests/database/post28-university-relations.database.spec.mjs'],minimumCases:7},
  'document-consent': {files: ['tests/database/post28-document-consent.database.spec.mjs'],minimumCases:10},
  'owner-workflows': {files: ['tests/database/post28-owner-workflows.database.spec.mjs'],minimumCases:19},
  'core-transactions': {files: ['tests/database/post28-core-transactions.database.spec.mjs'],minimumCases:8},
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
