import { readFileSync } from 'node:fs';
const read=(p)=>readFileSync(p,'utf8');
const helper=read('packages/infrastructure/src/api-foundation/StableCursor.ts');
const publicRouters=[
 'UniversityPublicRouter.ts','MajorPublicRouter.ts','CoursePublicRouter.ts','ScholarshipPublicRouter.ts','ServicePublicRouter.ts','CareerPublicRouter.ts'
].map((n)=>read(`apps/api/src/presentation/api/router/${n}`));
const repos=[
 'packages/infrastructure/src/universities/PrismaUniversityRepository.ts',
 'packages/infrastructure/src/majors/PrismaMajorRepository.ts',
 'packages/infrastructure/src/courses/PrismaCourseRepository.ts',
 'packages/infrastructure/src/courses/PrismaCourseRelationshipRepository.ts',
 'packages/infrastructure/src/scholarships/PrismaScholarshipRepository.ts',
 'packages/infrastructure/src/services-platform/PrismaServicePlatformRepository.ts',
 'packages/infrastructure/src/career-alumni/PrismaCareerRepository.ts',
].map(read);
const live=read('apps/web/src/features/public-template/publicLiveDataSource.ts');
const scholarship=read('apps/web/src/features/public-template/publicScholarshipDataSource.ts');
const checks=[
 ['opaque-versioned-cursor', helper.includes("const PREFIX = 'mn1:'") && helper.includes("toString('base64url')") && helper.includes("Buffer.from(cursor, 'base64url')")],
 ['immutable-keyset-order', helper.includes("orderBy: { id: 'asc' }") && helper.includes("cursor: { id: afterId }") && helper.includes('skip: 1')],
 ['bounded-limit-plus-one', helper.includes('take: limit + 1') && helper.includes('boundedCursorLimit')],
 ['owner-public-repositories', repos.every((s)=>s.includes('queryStableCursorPage'))],
 ['public-router-contract', publicRouters.every((s)=>s.includes('cursor: z.string()') && s.includes('limit: z.coerce.number()'))],
 ['no-offset-public-router', publicRouters.every((s)=>!s.includes('pageSize:') && !s.includes('page: z.'))],
 ['web-cursor-continuation', live.includes('collectCursorPages') && live.includes('PUBLIC_CURSOR_DID_NOT_ADVANCE') && scholarship.includes('PUBLIC_SCHOLARSHIP_CURSOR_DID_NOT_ADVANCE')],
 ['first-page-snapshot-removed', !live.includes("getUniversities({ locale, page: 1") && !live.includes("getCourses({ page: 1") && !live.includes("getServices({ page: 1") && !live.includes("getCareerJobs({ page: 1")],
];
let passed=0; for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`); if(ok) passed++;}
console.log(`W4_CURSOR_PAGINATION=${passed===checks.length?'PASS':'FAIL'} ${passed}/${checks.length}`);
process.exitCode=passed===checks.length?0:1;
