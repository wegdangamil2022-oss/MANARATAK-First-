import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
const has = (rel, text) => exists(rel) && read(rel).includes(text);
const notHas = (rel, text) => !exists(rel) || !read(rel).includes(text);
const assertions = [];
const check = (name, condition, detail = '') => assertions.push({ name, condition: Boolean(condition), detail });
const walk = (dir) => {
  const out = [];
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return out;
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    if (['dist', 'node_modules', '.git'].includes(entry.name)) continue;
    const child = path.join(abs, entry.name);
    if (entry.isDirectory()) out.push(...walk(path.relative(root, child)));
    else out.push(child);
  }
  return out;
};
const sourceText = (dir) => walk(dir).filter((f) => /\.(ts|tsx|js|mjs)$/.test(f)).map((f) => fs.readFileSync(f, 'utf8')).join('\n');

const pickerApi = 'apps/admin/src/api/canonicalPickers.ts';
const picker = 'apps/admin/src/components/CanonicalPicker.tsx';
const app = 'apps/admin/src/App.tsx';
const referenceRouter = 'apps/api/src/presentation/api/router/ReferenceDataAdminRouter.ts';
const universityPage = 'apps/admin/src/pages/UniversityRelationshipEditorPage.tsx';
const universityRouter = 'apps/api/src/presentation/api/router/UniversityAdminRouter.ts';
const scholarshipPage = 'apps/admin/src/pages/ScholarshipRelationshipEditorPage.tsx';
const scholarshipRouter = 'apps/api/src/presentation/api/router/ScholarshipAdminRouter.ts';
const scholarshipUseCases = 'packages/application/src/scholarships/use-cases/AdminScholarshipUseCases.ts';
const scholarshipLookup = 'packages/infrastructure/src/scholarships/PrismaScholarshipCanonicalLookupGateway.ts';
const scholarshipContract = 'packages/application/src/scholarships/resolution/ScholarshipCanonicalResolutionContracts.ts';
const scholarshipTest = 'packages/application/tests/scholarships/ScholarshipCanonicalAuthoringUseCases.spec.ts';
const coursePage = 'apps/admin/src/pages/CourseDetailPage.tsx';
const servicePage = 'apps/admin/src/pages/ServicesAdminPage.tsx';
const careerPage = 'apps/admin/src/pages/CareerAdminPage.tsx';
const di = 'apps/api/src/infrastructure/di/container.ts';
const matrix = 'docs/remediation/CROSS_PHASE_RELATIONSHIP_CLOSURE_MATRIX.md';
const closureDoc = 'docs/remediation/p9/P9_ADMIN_RELATIONSHIP_AUTHORING_CLOSURE_2026-09-03.md';

// Unified canonical picker contract: IDs + labels + lifecycle, fail-visible states.
check('P9-PICKER-001 canonical picker API exists', exists(pickerApi));
check('P9-PICKER-001 canonical option carries id', has(pickerApi, 'id: string;'));
check('P9-PICKER-001 canonical option carries label', has(pickerApi, 'label: string;'));
check('P9-PICKER-001 canonical option carries lifecycle', has(pickerApi, 'lifecycle: CanonicalPickerLifecycle;'));
check('P9-PICKER-002 inactive lifecycle states are blocked', has(pickerApi, 'DEPRECATED|ARCHIVED|SUPERSEDED|MERGED|REJECTED|INACTIVE'));
check('P9-PICKER-002 picker disables blocked options', has(picker, 'disabled={!canonicalOptionIsSelectable(item)}'));
check('P9-PICKER-003 existing missing canonical IDs are explicit', has(picker, 'Canonical ID not found in owner API'));
check('P9-PICKER-003 blocked existing relation is explicit', has(picker, 'Existing relation is'));
check('P9-PICKER-004 country owner loader exists', has(pickerApi, 'async countries('));
check('P9-PICKER-004 language owner loader exists', has(pickerApi, 'async languages('));
check('P9-PICKER-004 currency owner loader exists', has(pickerApi, 'async currencies('));
check('P9-PICKER-004 degree/major/test owner loaders exist', has(pickerApi, 'async degreeLevels(') && has(pickerApi, 'async majors(') && has(pickerApi, 'async tests('));
check('P9-PICKER-004 university/program owner loaders exist', has(pickerApi, 'async universities(') && has(pickerApi, 'async programs('));
check('P9-REF-001 P7 language owner read is exposed', has(referenceRouter, "'/languages'"));
check('P9-REF-001 P7 currency owner read is exposed', has(referenceRouter, "'/currencies'"));

// Admin must remain presentation/control-plane only.
const adminSource = sourceText('apps/admin/src');
check('P9-BOUNDARY-001 no @prisma/client import in Admin source', !adminSource.includes('@prisma/client'));
check('P9-BOUNDARY-001 no Prisma repository import in Admin source', !/Prisma[A-Za-z0-9_]*Repository/u.test(adminSource));
check('P9-BOUNDARY-001 no direct prisma client usage in Admin source', !/\bprisma\.[a-zA-Z_]/u.test(adminSource));

// University authoring through P11 owner APIs.
check('P9-UNI-001 University relationship editor route exists', has(app, 'UniversityRelationshipEditorPage') && has(app, 'path="/universities/:id"'));
check('P9-UNI-001 geography writes canonical IDs', has(universityPage, 'countryReferenceId') && has(universityPage, 'regionReferenceId') && has(universityPage, 'cityReferenceId'));
check('P9-UNI-001 geography mutation calls owner PATCH API', has(universityPage, "method: 'PATCH'") && has(universityPage, 'JSON.stringify({ countryReferenceId, regionReferenceId, cityReferenceId })'));
check('P9-UNI-002 AcademicProgram authoring uses stable owner CRUD API', has(universityPage, '/academic-programs') && has(universityRouter, "'/:id/academic-programs'") && has(universityRouter, "'/:id/academic-programs/:programId'"));
check('P9-UNI-002 program editor consumes Degree/Major/Test canonical pickers', has(universityPage, 'canonicalPickerApi.degreeLevels()') && has(universityPage, 'canonicalPickerApi.majors()') && has(universityPage, 'canonicalPickerApi.tests()'));
check('P9-UNI-003 University owner router accepts canonical geography IDs', has(universityRouter, 'countryReferenceId') && has(universityRouter, 'regionReferenceId') && has(universityRouter, 'cityReferenceId'));
check('P9-UNI-003 organization-unit identity is retained in read DTO path', has('packages/domain/src/universities/universities.ts', 'organizationUnitId?: string | null') && has('packages/infrastructure/src/universities/PrismaUniversityRepository.ts', 'organizationUnitId'));
check('P9-UNI-004 Program canonical ID is preserved on edit', has('packages/domain/src/universities/universities.ts', 'upsertAcademicProgram?(') && has('packages/infrastructure/src/universities/PrismaUniversityRepository.ts', 'const program = programId') && has('packages/infrastructure/src/universities/PrismaUniversityRepository.ts', 'universityAcademicProgram.update'));
check('P9-UNI-004 Program removal archives instead of hard-deleting canonical identity', has('packages/infrastructure/src/universities/PrismaUniversityRepository.ts', "data: { status: 'ARCHIVED' }") && has(universityPage, "{ method: 'DELETE' }"));
check('P9-UNI-004 Admin editor no longer uses destructive normalized-details replacement for programs', notHas(universityPage, '/normalized-details'));
check('P9-UNI-005 owner validation constrains Program campus/unit to the same University', has('packages/infrastructure/src/universities/UniversityCanonicalRelationshipValidator.ts', 'validateProgramAuthoring') && has('packages/infrastructure/src/universities/UniversityCanonicalRelationshipValidator.ts', "where: { id: input.organizationUnitId, universityId }") && has('packages/infrastructure/src/universities/UniversityCanonicalRelationshipValidator.ts', "where: { universityId, id: { in: campusIds } }"));
check('P9-UNI-005 owner validation rejects inactive canonical relationships', has('packages/infrastructure/src/universities/UniversityCanonicalRelationshipValidator.ts', 'UNIVERSITY_PROGRAM_DEGREE_LEVEL_NOT_ACTIVE') && has('packages/infrastructure/src/universities/UniversityCanonicalRelationshipValidator.ts', 'UNIVERSITY_ADMISSION_TEST_NOT_ACTIVE'));
check('P9-UNI-006 published University relationship structure is immutable', has('packages/application/src/universities/use-cases/AdminUniversityUseCases.ts', 'UNIVERSITY_PUBLISHED_STRUCTURE_IMMUTABLE'));
check('P9-UNI-007 stable Program authoring regression tests exist', has('packages/application/tests/universities/AdminUniversityUseCases.spec.ts', 'without replacing its canonical ID') && has('packages/application/tests/universities/AdminUniversityUseCases.spec.ts', 'instead of hard-deleting its canonical identity'));

// Scholarship canonical relationship authoring through P12 owner authority.
check('P9-SCH-001 Scholarship relationship editor route exists', has(app, 'ScholarshipRelationshipEditorPage') && has(app, 'path="/scholarships/:id/relationships"'));
check('P9-SCH-001 Admin sends one canonical relationship replacement payload', has(scholarshipPage, '/canonical-relationships') && has(scholarshipPage, "method: 'PUT'"));
check('P9-SCH-002 owner API route exists', has(scholarshipRouter, "'/:id/canonical-relationships'"));
check('P9-SCH-002 owner Application use case is called by router', has(scholarshipRouter, 'adminScholarshipUseCases.replaceCanonicalRelationships'));
check('P9-SCH-003 owner use case validates canonical references', has(scholarshipUseCases, 'assertCanonicalReference'));
check('P9-SCH-003 inactive references fail closed', has(scholarshipUseCases, 'SCHOLARSHIP_CANONICAL_REFERENCE_NOT_ACTIVE') && has(scholarshipUseCases, 'SUSPENDED'));
check('P9-SCH-003 missing references fail closed', has(scholarshipUseCases, 'SCHOLARSHIP_CANONICAL_REFERENCE_NOT_FOUND'));
check('P9-SCH-004 program/university ownership mismatch fails closed', has(scholarshipUseCases, 'SCHOLARSHIP_ACADEMIC_PROGRAM_UNIVERSITY_MISMATCH') && has(scholarshipContract, 'ownerId?: string | null'));
check('P9-SCH-004 published structure remains immutable', has(scholarshipUseCases, 'SCHOLARSHIP_PUBLISHED_STRUCTURE_IMMUTABLE'));
check('P9-SCH-005 canonical lookup supports internal owner identity', has(scholarshipLookup, 'canonicalId'));
check('P9-SCH-005 canonical lookup exposes lifecycle to authoring guard', has(scholarshipLookup, 'lifecycle'));
check('P9-SCH-005 unsupported canonical lookup targets fail closed', has(scholarshipLookup, 'SCHOLARSHIP_CANONICAL_TARGET_UNSUPPORTED'));
check('P9-SCH-006 DI injects canonical lookup gateway into owner use case', has(di, 'new AdminScholarshipUseCases(scholarshipRepository, atomicDomainMutationCoordinator, scholarshipCanonicalLookupGateway)'));
check('P9-SCH-007 focused canonical authoring specification exists', exists(scholarshipTest) && has(scholarshipTest, 'fails closed when Admin submits an inactive canonical reference') && has(scholarshipTest, 'does not belong to the selected University'));

// Courses: expose existing P13 resolution/review authority instead of duplicating it.
check('P9-COURSE-001 relationship analysis is owner-API driven', has(coursePage, '/relationships/analyze'));
check('P9-COURSE-001 language canonical relationship is owner-API driven', has(coursePage, '/relationships/language') && has(coursePage, 'languageReferenceId'));
check('P9-COURSE-002 major projection is owner-API driven', has(coursePage, '/relationships/majors/project'));
check('P9-COURSE-002 major projection decision is owner-API driven', has(coursePage, '/relationships/majors/${projectionId}/${decision}'));
check('P9-COURSE-003 taxonomy proposal approval/rejection remains owner-API driven', has(coursePage, '/relationships/taxonomy/'));

// P20 Services: no comma-separated relationship truth.
check('P9-SVC-001 Service Admin writes canonical country IDs', has(servicePage, 'supportedCountryReferenceIds: form.supportedCountryReferenceIds'));
check('P9-SVC-001 Service Admin writes canonical language IDs', has(servicePage, 'supportedLanguageReferenceIds: form.supportedLanguageReferenceIds'));
check('P9-SVC-002 Service Admin uses canonical multi picker for country/language', has(servicePage, 'CanonicalMultiPicker') && has(servicePage, 'canonicalPickerApi.countries()') && has(servicePage, 'canonicalPickerApi.languages()'));
check('P9-SVC-002 old text relationship form fields are absent', notHas(servicePage, 'supportedCountries: string') && notHas(servicePage, 'supportedLanguages: string'));

// P21 Career: canonical geography only for authoring.
check('P9-CAREER-001 employer/job forms carry countryReferenceId', has(careerPage, 'countryReferenceId'));
check('P9-CAREER-001 employer/job forms carry cityReferenceId', has(careerPage, 'cityReferenceId'));
check('P9-CAREER-002 Career Admin uses P7 country/city canonical pickers', has(careerPage, 'canonicalPickerApi.countries()') && has(careerPage, 'canonicalPickerApi.cities('));
check('P9-CAREER-002 Career owner API receives canonical geography', has(careerPage, 'countryReferenceId: jobForm.countryReferenceId') && has(careerPage, 'cityReferenceId: jobForm.cityReferenceId'));
check('P9-CAREER-003 text geography is not the create-job relationship payload', !/country:\s*jobForm\./u.test(read(careerPage)) && !/city:\s*jobForm\./u.test(read(careerPage)));

// Existing P14/P16/P17/P18/P19 owner control planes remain present.
for (const [id, page, router] of [
  ['R-049', 'apps/admin/src/pages/CertificateAdminPage.tsx', 'apps/api/src/presentation/api/router/CertificateAdminRouter.ts'],
  ['R-050', 'apps/admin/src/pages/CmsAdminPage.tsx', 'apps/api/src/presentation/api/router/CmsAdminRouter.ts'],
  ['R-051', 'apps/admin/src/pages/AIGovernancePage.tsx', 'apps/api/src/presentation/api/router/AIAdminRouter.ts'],
  ['R-052', 'apps/admin/src/pages/StudentToolsAdminPage.tsx', 'apps/api/src/presentation/api/router/StudentToolsAdminRouter.ts'],
  ['R-053', 'apps/admin/src/pages/FinanceAdminPage.tsx', 'apps/api/src/presentation/api/router/FinanceAdminRouter.ts'],
]) check(`P9-EXISTING-001 ${id} owner Admin page/router remain present`, exists(page) && exists(router));

// Matrix and closure record are conservative: source-closed, runtime proof still pending.
const matrixText = read(matrix);
check('P9-MATRIX-001 active matrix is current source-rebaseline authority', /\*\*Status:\*\* ACTIVE — SOURCE_REBASELINED \/ RUNTIME_EVIDENCE_PENDING/.test(matrixText) && /\*\*Version:\*\* 3\.0\.0-source-rebaselined/.test(matrixText));
for (let n = 42; n <= 55; n += 1) {
  const id = `R-${String(n).padStart(3, '0')}`;
  const line = read(matrix).split('\n').find((value) => value.startsWith(`| ${id} |`)) ?? '';
  check(`P9-MATRIX-002 ${id} is source-closed with runtime proof pending`, line.includes('| Runtime Pending | P9 CLOSED |'), line);
  check(`P9-MATRIX-003 ${id} no longer reports a P9 source gap`, !line.includes('| Partial |') && !line.includes('| Missing |'), line);
}
check('P9-DOC-001 closure record exists', exists(closureDoc));
check('P9-DOC-001 closure record preserves source/runtime boundary', has(closureDoc, 'SOURCE CLOSED / RUNTIME PENDING') && has(closureDoc, 'pre-P9 compiled artifact'));
check('P9-DOC-001 closure record states no live migration was executed', has(closureDoc, 'none was executed'));

let failed = 0;
for (const item of assertions) {
  if (item.condition) console.log(`PASS ${item.name}`);
  else {
    failed += 1;
    console.error(`FAIL ${item.name}${item.detail ? ` :: ${item.detail}` : ''}`);
  }
}
console.log(`P9_PLAN_CLOSURE_VERIFIER = ${failed ? 'FAIL' : 'PASS'} ${assertions.length - failed}/${assertions.length}`);
process.exitCode = failed ? 1 : 0;
