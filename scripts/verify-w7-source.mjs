import { readFileSync } from 'node:fs';

const read = path => readFileSync(path, 'utf8');
const files = {
  policy: read('packages/domain/src/universities/UniversityPublicationReadinessPolicy.ts'),
  contracts: read('packages/domain/src/universities/UniversityReadinessContracts.ts'),
  planner: read('packages/application/src/universities/use-cases/UniversityImportChangePlan.ts'),
  repository: read('packages/infrastructure/src/universities/PrismaUniversityRepository.ts'),
  executor: read('packages/infrastructure/src/universities/PrismaUniversityImportChangeExecutorGateway.ts'),
  schema: read('packages/infrastructure/prisma/schema.prisma'),
  migration: read('packages/infrastructure/prisma/migrations/20260825234500_w7_university_source_identity/migration.sql'),
  plannerTests: read('packages/application/tests/universities/UniversityImportChangePlan.spec.ts'),
  executorTests: read('packages/infrastructure/tests/universities/PrismaUniversityImportChangeExecutorGateway.spec.ts'),
};

const checks = [
  ['P11-SRC-004',
    files.schema.includes('sourceIdentityKey String                    @unique') &&
    files.executor.includes('UNIVERSITY_SOURCE_PROVENANCE_OWNERSHIP_MISMATCH') &&
    files.executor.includes('before.universityId !== university.id') &&
    files.migration.includes('University source identity collision') &&
    files.executorTests.includes('immutable source provenance belongs to another University')],
  ['P11-REL-002',
    files.repository.includes('if (unit.campusSourceReferenceId && !campusId)') &&
    files.repository.includes('UNIVERSITY_CAMPUS_REFERENCE_NOT_FOUND') &&
    files.repository.includes('if (program.organizationUnitSourceReferenceId && !organizationUnitId)') &&
    files.repository.includes('UNIVERSITY_ORGANIZATION_REFERENCE_NOT_FOUND')],
  ['P11-IMPORT-003',
    files.contracts.includes('admissionRequirements?: ReadonlyArray') &&
    files.planner.includes('ADMISSION_REQUIREMENT_CANONICAL_RESOLUTION_REQUIRED') &&
    files.planner.includes("text(requirement.internationalTestId)") &&
    files.executor.includes('academicProgram.universityId !== university.id') &&
    files.plannerTests.includes('emits executable admission requirements only with canonical identities')],
  ['P11-PUB-001',
    files.policy.includes("program.majorMappingState === 'CANONICALLY_MAPPED'") &&
    !files.policy.includes("program.status === 'MATCHED'")],
];

let passed = 0;
for (const [finding, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${finding}`);
  if (ok) passed += 1;
}
console.log(`W7_SOURCE_VERIFIER=${passed === checks.length ? 'PASS' : 'FAIL'} ${passed}/${checks.length}`);
console.log('W7_RUNTIME_DB_PROOF=PENDING_GOOGLE_STUDIO');
process.exitCode = passed === checks.length ? 0 : 1;
