import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const files = {
  repoContract: read('packages/domain/src/tests-platform/repository.ts'),
  validation: read('packages/domain/src/tests-platform/validation.ts'),
  publication: read('packages/domain/src/tests-platform/InternationalTestPublicationReadinessPolicy.ts'),
  importSchema: read('packages/domain/src/tests-platform/tests.ts'),
  canonical: read('packages/application/src/tests-platform/use-cases/InternationalTestCanonicalRelationshipService.ts'),
  useCases: read('packages/application/src/tests-platform/use-cases/InternationalTestUseCases.ts'),
  localized: read('packages/application/src/tests-platform/use-cases/LocalizedInternationalTestPublicUseCases.ts'),
  promotion: read('packages/application/src/tests-platform/use-cases/InternationalTestImportPromotionUseCase.ts'),
  repository: read('packages/infrastructure/src/international-tests/PrismaInternationalTestRepository.ts'),
  router: read('apps/api/src/presentation/api/router/InternationalTestPublicRouter.ts'),
  adminRouter: read('apps/api/src/presentation/api/router/InternationalTestAdminRouter.ts'),
  composition: read('apps/api/src/infrastructure/di/container.ts'),
  schema: read('packages/infrastructure/prisma/schema.prisma'),
  migration: read('packages/infrastructure/prisma/migrations/20260825220000_w5_international_test_canonical_integrity/migration.sql'),
  reconciliation: read('scripts/reconcile-w5-international-test-reference-ids.ts'),
};

const ordered = (source, first, second) => source.indexOf(first) >= 0 && source.indexOf(first) < source.indexOf(second);
const mapToDto = files.repository.slice(files.repository.indexOf('private mapToDto'));
const reservedKeysDeclaration = files.repository.slice(
  files.repository.indexOf('INTERNATIONAL_TEST_OPTIONAL_FIELDS_RESERVED_KEYS'),
  files.repository.indexOf(']);', files.repository.indexOf('INTERNATIONAL_TEST_OPTIONAL_FIELDS_RESERVED_KEYS')),
);
const hasReservedKey = (key) => reservedKeysDeclaration.includes(`'${key}'`);
const createsRelationship = (relationship) => new RegExp(`${relationship}:\\s*\\{\\s*create:`).test(files.repository);

const checks = [
  ['P9-PUB-001',
    files.repository.includes('INTERNATIONAL_TEST_OPTIONAL_FIELDS_RESERVED_KEYS') &&
    hasReservedKey('status') &&
    hasReservedKey('completenessStatus') &&
    ordered(mapToDto, '...safeOptionalFields,', '...rest,') &&
    files.repoContract.includes('findPublishedBySlug') &&
    files.repository.includes('status: InternationalTestStatus.PUBLISHED') &&
    files.repository.includes('isPubliclyVisible: true') &&
    files.useCases.includes('this.repository.findPublishedBySlug(slug)') &&
    files.localized.includes('this.repository.findPublishedBySlug(slug)') &&
    files.adminRouter.includes('rootCreateSchema.parse(req.body)') &&
    files.adminRouter.includes('rootUpdateSchema.parse(req.body)')],
  ['P9-REF-002',
    files.schema.includes('canonicalReferenceId String?') &&
    files.schema.includes('canonicalCountry ReferenceCountry?') &&
    files.schema.includes('canonicalLanguage ReferenceLanguage?') &&
    files.migration.includes('REFERENCES "ReferenceCountry"("id")') &&
    files.migration.includes('REFERENCES "ReferenceLanguage"("id")') &&
    files.repository.includes('canonicalReferenceId: country.id') &&
    files.repository.includes('canonicalReferenceId: language.id') &&
    files.reconciliation.includes('canonicalReferenceId: null') &&
    files.reconciliation.includes('PENDING_GOOGLE_STUDIO')],
  ['P9-REL-003',
    files.useCases.includes('this.canonicalRelationshipService.canonicalize(data)') &&
    createsRelationship('countryRelationships') &&
    createsRelationship('languageRelationships') &&
    createsRelationship('academicTaxonomyRelationships') &&
    createsRelationship('degreeRelationships') &&
    files.repository.includes('deleteMany: {}')],
  ['P9-IMP-004',
    files.promotion.includes('this.canonicalRelationshipService.canonicalize') &&
    files.canonical.includes('resolveCountry({ id: relationship.canonicalReferenceId })') &&
    files.canonical.includes('resolveLanguage({ id: relationship.canonicalReferenceId })') &&
    files.canonical.includes('academicTaxonomyRepository.getNode') &&
    files.canonical.includes('degreeLevelRepository.getDegreeLevelById') &&
    files.canonical.includes('Active canonical') &&
    files.promotion.includes('Active canonical Language not found') &&
    files.composition.includes('degreeLevelRepository') &&
    files.composition.includes('academicTaxonomyRepository') &&
    files.importSchema.includes('countryRelationships: z.array') &&
    files.importSchema.includes('degreeRelationships: z.array')],
  ['P9-PUB-005',
    files.validation.includes("'scoreScale', 'officialRegistrationUrl'") &&
    files.validation.includes("link?.linkType === 'REGISTRATION'") &&
    files.publication.includes('INTERNATIONAL_TEST_NORMALIZED_SCORE_SCALE_REQUIRED') &&
    files.publication.includes('INTERNATIONAL_TEST_OFFICIAL_REGISTRATION_URL_REQUIRED') &&
    files.publication.includes("entity.officialLinks?.find(link => link.linkType === 'REGISTRATION')")],
  ['P9-VERS-008',
    files.repository.includes('Prisma.TransactionIsolationLevel.Serializable') &&
    files.repository.includes('FOR UPDATE') &&
    ordered(files.repository, 'FOR UPDATE', 'const versionNumber = (latestVersion?.versionNumber ?? 0) + 1') &&
    files.schema.includes('@@unique([testId, versionNumber])')],
  ['P9-COMP-006',
    files.validation.includes("const coreIdentityPresent = ['canonicalName', 'providerName', 'testCategory']") &&
    files.validation.includes('const canBeReviewed = coreIdentityPresent && !hasErrors') &&
    files.validation.includes('else if (canBeReviewed)') &&
    files.validation.includes('InternationalTestCompletenessStatus.NEEDS_REVIEW')],
  ['P9-PAGE-007',
    files.router.includes('z.coerce.number().int().min(1).max(1000000)') &&
    files.router.includes('z.coerce.number().int().min(1).max(50)') &&
    files.router.includes('next(err)') &&
    files.repository.includes('Math.max(1, Math.floor(requestedPage))') &&
    files.repository.includes('Math.min(100, Math.max(1, Math.floor(requestedPageSize)))')],
];

let passed = 0;
for (const [finding, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${finding}`);
  if (ok) passed += 1;
}
console.log(`W5_SOURCE_VERIFIER=${passed === checks.length ? 'PASS' : 'FAIL'} ${passed}/${checks.length}`);
console.log('W5_RUNTIME_DB_PROOF=PENDING_GOOGLE_STUDIO');
process.exitCode = passed === checks.length ? 0 : 1;
