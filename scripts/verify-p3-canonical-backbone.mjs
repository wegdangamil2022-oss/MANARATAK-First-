import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const checks = [];
const assert = (name, condition, detail = '') => {
  checks.push({ name, pass: Boolean(condition), detail });
};

const schema = read('packages/infrastructure/prisma/schema.prisma');
const uniDomain = read('packages/domain/src/universities/universities.ts');
const uniRepo = read('packages/infrastructure/src/universities/PrismaUniversityRepository.ts');
const uniPublic = read('apps/api/src/presentation/api/router/UniversityPublicRouter.ts');
const scholarshipContracts = read('packages/domain/src/scholarships/contracts.ts');
const scholarshipRepo = read('packages/infrastructure/src/scholarships/PrismaScholarshipRepository.ts');
const scholarshipPublic = read('apps/api/src/presentation/api/router/ScholarshipPublicRouter.ts');
const scholarshipAdmin = read('apps/api/src/presentation/api/router/ScholarshipAdminRouter.ts');
const scholarshipImportAdminApi = read('apps/admin/src/api/scholarshipImportCenter.ts');
const scholarshipImportAdminPage = read('apps/admin/src/pages/ScholarshipImportCenterPage.tsx');
const scholarshipCatalogAdminApi = read('apps/admin/src/api/scholarshipCatalog.ts');
const closureMatrix = read('docs/remediation/CROSS_PHASE_RELATIONSHIP_CLOSURE_MATRIX.md');
const resolution = read('packages/application/src/scholarships/resolution/ScholarshipCanonicalResolutionService.ts');
const lookup = read('packages/infrastructure/src/scholarships/PrismaScholarshipCanonicalLookupGateway.ts');
const transfer = read('packages/application/src/scholarships/import-center/ScholarshipImportAtomicTransferUseCase.ts');
const screeningReader = read('packages/application/src/scholarships/import-center/ScholarshipImportScreeningReader.ts');
const adminUseCases = read('packages/application/src/scholarships/use-cases/AdminScholarshipUseCases.ts');

// Existing normalized owner schema must be reused, not rebuilt.
assert('P11 AcademicProgram remains University + DegreeLevel + Major',
  /model UniversityAcademicProgram[\s\S]*universityId[\s\S]*degreeLevelId[\s\S]*majorId/.test(schema));
assert('P11 admission requirements use canonical InternationalTest id',
  /model UniversityProgramAdmissionRequirement[\s\S]*internationalTestId/.test(schema));
assert('P12 Scholarship root uses canonical Country and Language refs',
  /model Scholarship[\s\S]*countryReferenceId[\s\S]*studyLanguageReferenceId/.test(schema));
for (const [name, pattern] of [
  ['Currency', /model ScholarshipBenefit[\s\S]*currencyReferenceId/],
  ['DegreeLevel', /model ScholarshipDegreeTarget[\s\S]*degreeLevelId/],
  ['Major', /model ScholarshipMajorTarget[\s\S]*majorId/],
  ['InternationalTest', /model ScholarshipEligibilityItem[\s\S]*internationalTestId/],
  ['University and AcademicProgram', /model ScholarshipUniversityLink[\s\S]*universityId[\s\S]*academicProgramId/],
]) assert(`P12 canonical ${name} relation exists`, pattern.test(schema));

// P11 read contract and API must carry canonical ids.
assert('University DTO exposes canonical AcademicProgram read model', /academicPrograms\?: UniversityAcademicProgramReadDto\[\]/.test(uniDomain));
assert('AcademicProgram read DTO carries Degree/Major/Test ids',
  /interface UniversityAcademicProgramReadDto[\s\S]*degreeLevelId[\s\S]*majorId[\s\S]*admissionRequirements/.test(uniDomain)
  && /interface UniversityProgramAdmissionRequirementReadDto[\s\S]*internationalTestId/.test(uniDomain));
assert('Prisma University mapping emits canonical AcademicProgram ids',
  /academicPrograms:[\s\S]*degreeLevelId: program\.degreeLevelId[\s\S]*majorId: program\.majorId[\s\S]*internationalTestId: requirement\.internationalTestId/.test(uniRepo));
assert('Public University filters accept canonical Country/Region/City ids',
  /countryReferenceId:[\s\S]*regionReferenceId:[\s\S]*cityReferenceId:/.test(uniPublic));
assert('Public University router rejects unknown legacy relation params', /\.strict\(\)/.test(uniPublic));
assert('Public University router has no country-name query field', !/\bcountry:\s*z\.string/.test(uniPublic));

// P12 final list/query contracts are canonical-id based.
for (const field of ['countryReferenceId','studyLanguageReferenceId','currencyReferenceId','degreeLevelId','majorId','internationalTestId','universityId','academicProgramId']) {
  assert(`Scholarship filter contract exposes ${field}`, scholarshipContracts.includes(`${field}?: string`));
  assert(`Public Scholarship router accepts ${field}`, scholarshipPublic.includes(`${field}: z.string()`));
}
assert('Public Scholarship router rejects legacy relation params', /\.strict\(\)/.test(scholarshipPublic));
assert('Public Scholarship router has no studyCountry query field', !/studyCountry:\s*z\.string/.test(scholarshipPublic));
assert('Public Scholarship router has no degreeLevel text query field', !/\bdegreeLevel:\s*z\.string/.test(scholarshipPublic));
assert('Admin Scholarship list is canonical-id filtered',
  /countryReferenceId: z\.string[\s\S]*degreeLevelId: z\.string[\s\S]*academicProgramId: z\.string/.test(scholarshipAdmin));

const adminList = scholarshipRepo.slice(scholarshipRepo.indexOf('async list(filters:'), scholarshipRepo.indexOf('async getAdminSummary'));
const publicList = scholarshipRepo.slice(scholarshipRepo.indexOf('async listPublished('), scholarshipRepo.indexOf('private mapToDto'));
assert('Admin Scholarship relation filters do not match Country names', !/primaryCountry|countrySourceLabel/.test(adminList));
assert('Admin Scholarship degree filter does not match sourceLabel', !/sourceLabel/.test(adminList));
assert('Public Scholarship relation filters do not match source labels', !/countrySourceLabel|sourceLabel/.test(publicList));
for (const field of ['countryReferenceId','studyLanguageReferenceId','currencyReferenceId','degreeLevelId','majorId','internationalTestId','universityId','academicProgramId']) {
  assert(`Repository public filter uses ${field}`, publicList.includes(`filters.${field}`));
}

// AcademicProgram can only resolve from explicit canonical id, never name lookup.
assert('AcademicProgram resolver requires explicit canonical id', /target === 'ACADEMIC_PROGRAM' && !normalized\.canonicalId/.test(resolution));
assert('AcademicProgram lookup uses findUnique(id)', /findAcademicProgram[\s\S]*universityAcademicProgram\.findUnique[\s\S]*where: \{ id: request\.canonicalId \}/.test(lookup));
assert('Atomic transfer persists canonical AcademicProgram ids', /academicProgramId: resolved\?\.canonicalReferenceId/.test(transfer));
assert('Publication guard distinguishes AcademicProgram targets', /ACADEMIC_PROGRAM/.test(adminUseCases) && /academicProgramId/.test(adminUseCases));
assert('Publication guard checks monetary Currency canonical id', /area: 'CURRENCY'/.test(adminUseCases) && /currencyReferenceId/.test(adminUseCases));
assert('Admin Import Center API exposes AcademicProgram canonical target', /ScholarshipCanonicalTarget[\s\S]*'ACADEMIC_PROGRAM'/.test(scholarshipImportAdminApi));
assert('Admin Import Center renders AcademicProgram canonical screening decisions', /allowedTargets:[\s\S]*'ACADEMIC_PROGRAM'/.test(scholarshipImportAdminPage));
assert('Import screening preserves requested canonical id as review input when source label is absent', /rawValue: this\.string\(item\.rawValue \?\? item\.requestedCanonicalId \?\? item\.canonicalId\)/.test(screeningReader));
assert('Admin Import Center preserves requested canonical id for unresolved review rows', /entry\.rawValue\) \?\? stringValue\(entry\.requestedCanonicalId\) \?\? stringValue\(entry\.canonicalId\)/.test(scholarshipImportAdminPage));
assert('Admin Scholarship Catalog contract exposes Currency and AcademicProgram unresolved areas', /ScholarshipCatalogUnresolvedLink[\s\S]*'CURRENCY'[\s\S]*'ACADEMIC_PROGRAM'/.test(scholarshipCatalogAdminApi));
assert('P3 relationship matrix marks R-001 through R-013 source-closed/runtime-pending',
  Array.from({ length: 13 }, (_, index) => `R-${String(index + 1).padStart(3, '0')}`).every((id) => {
    const line = closureMatrix.split('\n').find((candidate) => candidate.startsWith(`| ${id} `));
    return Boolean(line && line.includes('| Runtime Pending | P3 CLOSED |'));
  }));
assert('P3 relationship matrix status totals are internally updated',
  closureMatrix.includes('`Runtime Pending`: **29**') && closureMatrix.includes('`Partial`: **33**') && closureMatrix.includes('`Missing`: **5**'));

const failures = checks.filter((check) => !check.pass);
console.log(JSON.stringify({ status: failures.length ? 'FAIL' : 'PASS', checks: checks.length, passed: checks.length - failures.length, failures }, null, 2));
if (failures.length) process.exit(1);
