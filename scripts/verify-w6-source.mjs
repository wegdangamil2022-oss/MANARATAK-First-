import { readFileSync } from 'node:fs';

const read = path => readFileSync(path, 'utf8');
const files = {
  architecture: read('docs/phases/phase-10-major-platform/phase-10-01-enterprise-architecture-specification.md'),
  guide: read('docs/phases/phase-10-major-platform/phase-10-03-implementation-guide.md'),
  domain: read('packages/domain/src/majors/majors.ts'),
  publication: read('packages/domain/src/majors/MajorPublicationReadinessPolicy.ts'),
  canonical: read('packages/application/src/majors/services/CanonicalMajorReferenceService.ts'),
  promotion: read('packages/application/src/majors/use-cases/MajorImportPromotionUseCase.ts'),
  admin: read('packages/application/src/majors/use-cases/AdminMajorUseCases.ts'),
  repository: read('packages/infrastructure/src/majors/PrismaMajorRepository.ts'),
  composition: read('apps/api/src/infrastructure/di/container.ts'),
  tests: read('packages/application/tests/majors/MajorImportPromotionUseCase.spec.ts'),
};

const checks = [
  ['P10-GOV-005',
    files.architecture.includes('root-Major duplicates') &&
    files.architecture.includes('Degree level and source classification system belong to `MajorLevelProfile`') &&
    files.guide.includes('root-Major concept key') &&
    files.guide.includes('Google Studio read-only reconciliation gate')],
  ['P10-TAX-001',
    files.canonical.includes('listNodes({ status: AcademicTaxonomyStatus.ACTIVE })') &&
    files.canonical.includes('id: node.nodeId') &&
    files.composition.includes('canonicalMajorReferenceService: asFunction') &&
    files.composition.includes('new CanonicalMajorReferenceService(academicTaxonomyRepository, degreeLevelRepository)')],
  ['P10-CAN-002',
    files.canonical.includes('DegreeLevelStatus.ACTIVE') &&
    files.canonical.includes('AcademicTaxonomyStatus.ACTIVE') &&
    files.admin.includes('canonicalReferences.publicationIssues(major)') &&
    files.promotion.includes('this.canonicalReferences.resolve(payload)')],
  ['P10-CMP-003',
    files.domain.includes('function hasMajorSourceIdentity') &&
    files.domain.includes('if (!hasMajorSourceIdentity(payload))') &&
    files.publication.includes('hasMajorSourceIdentity(entity)') &&
    files.admin.includes('sourceImportRecordId: existing.sourceImportRecordId') &&
    files.promotion.includes('sourceImportRecordId: record.id')],
  ['P10-VERS-004',
    files.promotion.includes('candidate.versionNumber > latest.versionNumber') &&
    files.promotion.includes('acquireVersionAllocationLock?.(majorId)') &&
    files.repository.includes('pg_advisory_xact_lock') &&
    files.tests.includes('allocates from the highest version even when repository results are unsorted')],
];

let passed = 0;
for (const [finding, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${finding}`);
  if (ok) passed += 1;
}
console.log(`W6_SOURCE_VERIFIER=${passed === checks.length ? 'PASS' : 'FAIL'} ${passed}/${checks.length}`);
console.log('W6_RUNTIME_DB_PROOF=PENDING_NON_BLOCKING');
process.exitCode = passed === checks.length ? 0 : 1;
