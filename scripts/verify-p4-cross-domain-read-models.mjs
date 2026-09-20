import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const files = {
  graph: read('packages/application/src/read-models/CrossDomainGraphReadService.ts'),
  appIndex: read('packages/application/src/index.ts'),
  universityDomain: read('packages/domain/src/universities/universities.ts'),
  universityRepo: read('packages/infrastructure/src/universities/PrismaUniversityRepository.ts'),
  scholarshipRepo: read('packages/infrastructure/src/scholarships/PrismaScholarshipRepository.ts'),
  scholarshipRouter: read('apps/api/src/presentation/api/router/ScholarshipPublicRouter.ts'),
  majorDomain: read('packages/domain/src/majors/majors.ts'),
  majorRepo: read('packages/infrastructure/src/majors/PrismaMajorRepository.ts'),
  courseDomain: read('packages/domain/src/courses/relationships.ts'),
  courseRepo: read('packages/infrastructure/src/courses/PrismaCourseRelationshipRepository.ts'),
  courseRouter: read('apps/api/src/presentation/api/router/CoursePublicRouter.ts'),
  universityRouter: read('apps/api/src/presentation/api/router/UniversityPublicRouter.ts'),
  graphRouter: read('apps/api/src/presentation/api/router/CrossDomainReadModelRouter.ts'),
  container: read('apps/api/src/infrastructure/di/container.ts'),
  app: read('apps/api/src/app.ts'),
  matrix: read('docs/remediation/CROSS_PHASE_RELATIONSHIP_CLOSURE_MATRIX.md'),
  courseRel: read('packages/domain/src/courses/relationships.ts'),
};

let passed = 0;
const failures = [];
function check(id, condition, detail) {
  if (condition) { passed += 1; console.log(`PASS ${id} — ${detail}`); }
  else { failures.push({ id, detail }); console.error(`FAIL ${id} — ${detail}`); }
}

check('P4-001', files.graph.includes('class CrossDomainGraphReadService'), 'composition-only graph service exists');
check('P4-002', files.appIndex.includes("export * from './read-models';"), 'graph service exported by application layer');
check('P4-003', files.graph.includes('getMajorGraphBySlug'), 'Major graph read exists');
check('P4-004', files.graph.includes('getUniversityGraphBySlug'), 'University graph read exists');
check('P4-005', files.graph.includes('getScholarshipGraphBySlug'), 'Scholarship graph read exists');
check('P4-006', files.graph.includes('getCountryGraphByIso2Code'), 'Country graph aggregation exists');
check('P4-007', files.graph.includes('majorId: major.id'), 'Major→University/Scholarship owner query uses canonical major owner ID');
check('P4-008', files.graph.includes('listPublishedCoursesForMajor(major.id'), 'Major→Course uses P13 owner projection query');
check('P4-009', !files.graph.includes('listPublished({ major: major.displayName') && !files.graph.includes('listPublishedCoursesForMajor(major.displayName'), 'graph service does not relationship-resolve by Major display name');
check('P4-010', !/sourceLabel[\s\S]{0,100}(find|list|filter)/i.test(files.graph), 'graph service does not resolve by sourceLabel');
check('P4-011', files.universityDomain.includes('majorId?: string;'), 'P11 public owner query accepts canonical majorId');
check('P4-012', files.universityRepo.includes("majorMappingState: 'CANONICALLY_MAPPED'"), 'P11 reverse read is restricted to canonical program mappings');
check('P4-013', files.universityRepo.includes('major: { is: { status: MajorStatus.PUBLISHED } }'), 'P11 reverse read requires published linked Major');
check('P4-013A', files.universityRepo.includes('degreeLevelId: { not: null }'), 'P11 reverse read fails closed when AcademicProgram DegreeLevel is unresolved');
check('P4-013B', files.graph.includes('publishedMajorIds.has(program.majorId)'), 'University graph emits AcademicPrograms only for published linked Majors');
check('P4-014', files.universityRepo.includes('status: UniversityStatus.PUBLISHED'), 'P11 public University lifecycle gate retained');
check('P4-015', files.universityRouter.includes('majorId: z.string().trim().min(1).optional()'), 'University public API exposes canonical majorId filter');
check('P4-016', files.scholarshipRepo.includes('majorTargets: { some: { majorId: filters.majorId'), 'P12 reverse read includes canonical major targets');
check('P4-017', files.scholarshipRepo.includes('eligibilityItems: { some: { majorId: filters.majorId'), 'P12 reverse read includes canonical major eligibility');
check('P4-018', files.scholarshipRepo.includes('major: { is: { status: MajorStatus.PUBLISHED } }'), 'P12 public reverse-major read requires published Major');
check('P4-019', files.scholarshipRepo.includes('university: { is: { status: UniversityStatus.PUBLISHED } }'), 'P12 University reverse read retains published linked owner');
check('P4-020', files.scholarshipRouter.includes('majorId: z.string().min(1).optional()'), 'Scholarship public API exposes canonical majorId');
check('P4-021', files.scholarshipRouter.includes('universityId: z.string().min(1).optional()'), 'Scholarship public API exposes canonical universityId');
check('P4-022', files.courseDomain.includes('ownerId: string;'), 'P13 relationship DTO exposes stable ownerId');
check('P4-023', files.courseRepo.includes("projectionState: 'APPROVED'"), 'P13 public reverse-major read requires approved projection');
check('P4-024', /const where: Prisma\.CourseWhereInput = \{[\s\S]{0,180}status: 'PUBLISHED'/.test(files.courseRepo), 'P13 public relationship read requires published Course');
check('P4-025', files.courseRepo.includes('records.map(({ id, optionalFields, ...record })') && files.courseRepo.includes('return { ownerId: id, ...record'), 'P13 maps internal id to explicit ownerId without leaking id field');
check('P4-026', files.courseRouter.includes('courseRelationshipQueryService.listPublishedRelatedCourses'), 'P13 relationship query wired to public Course API');
check('P4-027', files.courseRouter.includes('majorId: z.string().trim().min(1).optional()'), 'Course public API exposes canonical majorId');
check('P4-028', files.graph.includes('providerHeadquartersCountryReferenceId: country.id'), 'Country→Course graph preserves provider-headquarters semantics');
check('P4-029', files.courseRel.includes("'PROVIDER_HEADQUARTERS_ONLY' | 'NO_GEOGRAPHY'"), 'no invented Course study-country semantics');
check('P4-030', files.graph.includes('countryReferenceId: country.id'), 'Country graph queries P11/P12 with canonical P7 country ID');
check('P4-031', files.graph.includes('providerHeadquartersCourses'), 'Country graph labels course relationship semantically');
check('P4-032', files.graph.includes('ownerId: country.id'), 'Country graph exposes canonical owner identity');
check('P4-032A', files.graph.includes('!country || !country.isActive'), 'Country graph retains P7 active lifecycle gate');
check('P4-033', files.graph.includes('publicId: major.publicId') && files.graph.includes('slug: major.slug'), 'Major linked identity includes publicId/slug');
check('P4-034', files.graph.includes('publicId: university.publicId') && files.graph.includes('slug: university.slug'), 'University linked identity includes publicId/slug');
check('P4-035', files.graph.includes('publicId: scholarship.publicId') && files.graph.includes('slug: scholarship.slug'), 'Scholarship linked identity includes publicId/slug');
check('P4-035A', files.graph.includes('countryOwnerId: university.countryReferenceId'), 'University graph preserves canonical P7 country owner link');
check('P4-036', files.universityRepo.includes('findPublishedAcademicProgramsByIds'), 'P11 owner exposes AcademicProgram identity read model');
check('P4-037', files.majorRepo.includes('findPublishedByIds'), 'P10 owner exposes published Major batch hydration');
check('P4-038', files.universityRepo.includes('findPublishedByIds'), 'P11 owner exposes published University batch hydration');
check('P4-038A', files.graph.includes("Required<Pick<IMajorRepository, 'findPublishedByIds'>>") && files.graph.includes("'findPublishedByIds' | 'findPublishedAcademicProgramsByIds'"), 'P4 application composition port requires owner batch-read capabilities');
check('P4-039', files.graph.includes('Math.min(50'), 'cross-domain collection page size is bounded');
check('P4-039A', files.courseRouter.includes('z.coerce.number().int().min(1)') && files.universityRouter.includes('z.coerce.number().int().min(1)'), 'P11/P13 public reverse-read pagination rejects invalid numeric input');
check('P4-040', files.graphRouter.includes("router.get('/majors/:slug'"), 'public graph Major route exposed');
check('P4-041', files.graphRouter.includes("router.get('/universities/:slug'"), 'public graph University route exposed');
check('P4-042', files.graphRouter.includes("router.get('/scholarships/:slug'"), 'public graph Scholarship route exposed');
check('P4-043', files.graphRouter.includes("router.get('/countries/:iso2Code'"), 'public graph Country route exposed');
check('P4-044', files.container.includes('PrismaCourseRelationshipRepository'), 'P13 relationship repository registered in API DI');
check('P4-045', files.container.includes('CourseRelationshipQueryService'), 'P13 relationship query service registered in API DI');
check('P4-046', files.container.includes('CrossDomainGraphReadService'), 'cross-domain graph service registered in API DI');
check('P4-047', files.container.includes('CrossDomainReadModelRouter'), 'graph router registered in API DI');
check('P4-048', files.app.includes("v1Router.use('/public/graph'"), 'graph router mounted in v1 public API');
check('P4-049', !files.majorDomain.includes('major: major.displayName'), 'Major phase links do not use display-name relationship query');
check('P4-050', files.majorDomain.includes("href: this.withQuery('/universities'"), 'Major phase links preserve P24 University UI route with canonical query');
check('P4-051', files.majorDomain.includes("href: this.withQuery('/scholarships'"), 'Major phase links preserve P24 Scholarship UI route with canonical query');
check('P4-052', files.majorDomain.includes("href: this.withQuery('/courses'"), 'Major phase links preserve P24 Course UI route with canonical query');
for (let i = 14; i <= 19; i += 1) {
  const id = `R-${String(i).padStart(3, '0')}`;
  const line = files.matrix.split('\n').find((candidate) => candidate.startsWith(`| ${id} |`)) ?? '';
  check(`P4-MATRIX-${id}`, line.includes('| Runtime Pending | P4 CLOSED |'), `${id} source closure recorded as runtime-pending only`);
}

console.log(JSON.stringify({ status: failures.length ? 'FAIL' : 'PASS', checks: passed + failures.length, passed, failures }, null, 2));
if (failures.length) process.exit(1);
