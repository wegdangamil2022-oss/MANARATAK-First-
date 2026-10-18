export const DATABASE_SUITES = Object.freeze({
  'admission-import-concurrency': {files: ['tests/database/post28-admission-import-concurrency.database.spec.mjs'],minimumCases:10},
  'real-pdf-lifecycle': {files: ['tests/database/post28-real-pdf-lifecycle.database.spec.mjs'],minimumCases:6},
  'scholarship-country-semantics': {files: ['tests/database/post28-scholarship-country-semantics.database.spec.mjs'],minimumCases:7},
  'course-major-visibility': {files: ['tests/database/post28-course-major-visibility.database.spec.mjs'],minimumCases:8},
  'dec05-owner-atomic': {files: ['tests/database/post28-dec05-owner-atomic.database.spec.mjs'],minimumCases:8},
  'dec01-program-pairs': {files: ['tests/database/post28-dec01-program-pairs.database.spec.mjs'],minimumCases:10},
  'dec05-taxonomy-invalidation': {files: ['tests/database/post28-dec05-taxonomy-invalidation.database.spec.mjs'],minimumCases:6},
  'dec03-free-study': {files: ['tests/database/post28-dec03-free-study.database.spec.mjs'],minimumCases:8},
  'finance-local-closure': {files: ['tests/database/post28-finance-local-closure.database.spec.mjs'],minimumCases:14},
  'reference-import-closure': {files: ['tests/database/post28-reference-import-closure.database.spec.mjs'],minimumCases:18},
  'finance-provider-safety': {files: ['tests/database/post28-finance-provider-safety.database.spec.mjs'],minimumCases:6},
  'owner-http-closure': {files: ['tests/database/post28-owner-http-closure.database.spec.mjs'],minimumCases:12},
  'attestation-closure': {files: ['tests/database/post28-attestation-closure.database.spec.mjs'],minimumCases:14},
  'learning-closure': {files: ['tests/database/post28-learning-closure.database.spec.mjs'],minimumCases:12},
  'university-geography': {files: ['tests/database/post28-university-geography.database.spec.mjs'],minimumCases:18},
  'scholarship-public-relations': {files: ['tests/database/post28-scholarship-public-relations.database.spec.mjs'],minimumCases:4},
  'scholarship-admin': {files: ['tests/database/post28-scholarship-admin.database.spec.mjs'],minimumCases:18},
  'relation-commands': {files: ['tests/database/post28-relation-commands.database.spec.mjs'],minimumCases:8},
  'http-finance': {files: ['tests/database/post28-http-finance.database.spec.mjs'],minimumCases:14},
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
