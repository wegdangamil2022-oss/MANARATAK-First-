import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const read = (path) => readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
const files = {
  courseEntity: read('packages/domain/src/courses/entities/Course.ts'),
  publicDto: read('packages/domain/src/courses/entities/PublicCourseDto.ts'),
  relations: read('packages/domain/src/courses/relationships.ts'),
  progressEntity: read('packages/domain/src/courses/entities/CourseProgress.ts'),
  completedEvent: read('packages/domain/src/courses/events/CourseCompletedEvent.ts'),
  pathCompletedEvent: read('packages/domain/src/courses/events/LearningPathCompletedEvent.ts'),
  importIdentity: read('packages/application/src/courses/use-cases/CourseImportIdentityDiffUseCase.ts'),
  importCoordinator: read('packages/application/src/courses/use-cases/CourseImportCoordinator.ts'),
  legacyPromotion: read('packages/application/src/courses/use-cases/CourseImportPromotionUseCase.ts'),
  useCaseIndex: read('packages/application/src/courses/use-cases/index.ts'),
  importedAdmin: read('packages/application/src/courses/use-cases/ImportedCourseAdminUseCases.ts'),
  publicUseCases: read('packages/application/src/courses/use-cases/PublicCourseUseCases.ts'),
  relationships: read('packages/application/src/courses/services/CourseRelationshipResolutionService.ts'),
  progress: read('packages/application/src/courses/use-cases/CourseProgressUseCases.ts'),
  learningPath: read('packages/application/src/courses/use-cases/LearningPathUseCases.ts'),
  directPublisher: read('packages/application/src/courses/gateways/EnterpriseCourseCompletionEventPublisher.ts'),
  gatewayIndex: read('packages/application/src/courses/gateways/index.ts'),
  courseRepo: read('packages/infrastructure/src/courses/PrismaCourseRepository.ts'),
  relationshipRepo: read('packages/infrastructure/src/courses/PrismaCourseRelationshipRepository.ts'),
  safeLink: read('packages/infrastructure/src/courses/SafeImportedCourseLinkChecker.ts'),
  progressRepo: read('packages/infrastructure/src/courses/PrismaCourseProgressRepository.ts'),
  learningRepo: read('packages/infrastructure/src/courses/PrismaLearningPathRepository.ts'),
  publicRouter: read('apps/api/src/presentation/api/router/CoursePublicRouter.ts'),
  adminRouter: read('apps/api/src/presentation/api/router/CourseAdminRouter.ts'),
  learnerRouter: read('apps/api/src/presentation/api/router/CourseLearnerRouter.ts'),
  di: read('apps/api/src/infrastructure/di/container.ts'),
  matrix: read('docs/remediation/CROSS_PHASE_RELATIONSHIP_CLOSURE_MATRIX.md'),
};

let passed = 0;
const failures = [];
function check(id, condition, detail) {
  if (condition) { passed += 1; console.log(`PASS ${id} — ${detail}`); }
  else { failures.push({ id, detail }); console.error(`FAIL ${id} — ${detail}`); }
}

// P6 generic ingestion -> P13 canonical transfer boundary and source identity.
check('P5-IMP-001', files.importIdentity.includes('ExternalCourseProviderStatus.APPROVED'), 'import analysis requires an approved external provider');
check('P5-IMP-002', files.importIdentity.includes('isDomainApproved(provider.id, normalizedUrl)'), 'import analysis requires provider-domain approval');
check('P5-IMP-003', files.importIdentity.includes('COURSE_PROVIDER_DOMAIN_NOT_APPROVED'), 'provider-domain rejection is fail-closed');
check('P5-IMP-004', files.importIdentity.includes('sourceNativeKey'), 'stable source native identity is modeled');
check('P5-IMP-005', files.importIdentity.includes('languageVersionKey'), 'language/version identity dimension is modeled');
check('P5-IMP-006', files.importIdentity.includes('CourseSourceIdentityStrategy'), 'source identity strategy is explicit');
check('P5-IMP-007', files.importCoordinator.includes('COURSE_IMPORT_SOURCE_IDENTITY_PROPOSAL_REQUIRED'), 'canonical transfer requires a source identity proposal');
check('P5-IMP-008', files.importCoordinator.includes("identity.status !== 'ACTIVE'"), 'canonical transfer rejects inactive source identities');
check('P5-IMP-009', files.importCoordinator.includes('canonicalDedupKey(identity.providerId, identity.sourceNativeKey, identity.languageVersionKey)'), 'canonical dedup is provider/native-key/language-version based');
check('P5-IMP-010', files.importCoordinator.includes('assertStableProvider'), 'canonical provider identity cannot silently drift');
check('P5-IMP-011', files.importCoordinator.includes("approvedFields.has('directCourseUrl')"), 'direct URL changes require explicit review approval');
check('P5-IMP-012', files.importCoordinator.includes('sourceIdentityCurrentUrl'), 'URL lineage uses source identity current URL');
check('P5-IMP-013', files.importCoordinator.includes('sourceArtifactHash'), 'source provenance hash is retained');
check('P5-IMP-014', files.importCoordinator.includes('atomicMutations.execute'), 'P13 canonical transfer uses atomic mutation coordination');
check('P5-IMP-015', files.importCoordinator.includes('withTransaction(context)'), 'course canonical write participates in the atomic transaction');
check('P5-IMP-016', files.importCoordinator.includes('COURSE_IMPORT_TRANSFER_AUTO_PUBLISH_FORBIDDEN') && !files.importCoordinator.includes('updateStatus(course.id, CourseStatus.PUBLISHED)'), 'import coordinator explicitly forbids automatic publication');
check('P5-IMP-017', files.legacyPromotion.includes('COURSE_IMPORT_LEGACY_PROMOTION_DISABLED_USE_COURSE_IMPORT_COORDINATOR'), 'legacy pre-registry promotion path is disabled');
check('P5-IMP-018', !files.useCaseIndex.includes("./CourseImportPromotionUseCase"), 'disabled legacy promotion is not exported from the P13 use-case barrel');

// Direct URL/source security and publication gates.
check('P5-SEC-001', files.safeLink.includes("parsed.protocol !== 'https:'"), 'link checker requires HTTPS');
check('P5-SEC-002', files.safeLink.includes('COURSE_LINK_HTTPS_REQUIRED'), 'non-HTTPS links fail closed');
check('P5-SEC-003', files.safeLink.includes('allowedDomains'), 'link checker is constrained by provider allow-list');
check('P5-SEC-004', files.safeLink.includes('MAX_REDIRECTS'), 'redirect traversal is bounded');
check('P5-SEC-005', files.safeLink.includes('resolvePublicAddress'), 'link checker resolves the target before connecting');
check('P5-SEC-006', files.safeLink.includes('publicNetworkAddressPolicy.isPublic') && files.safeLink.includes('COURSE_LINK_PRIVATE_ADDRESS_BLOCKED') && files.safeLink.includes('COURSE_LINK_PRIVATE_DNS_TARGET_BLOCKED'), 'private/special literal and DNS targets are rejected');
check('P5-SEC-007', files.importedAdmin.includes('IMPORTED_COURSE_DIRECT_URL_CHANGE_REQUIRES_CONTROLLED_IMPORT'), 'admin cannot bypass URL lineage by editing the direct URL');
check('P5-SEC-008', files.importedAdmin.includes('IMPORTED_COURSE_PROVIDER_IDENTITY_CHANGE_FORBIDDEN'), 'admin cannot replace imported provider identity');
check('P5-SEC-009', files.importedAdmin.includes('IMPORTED_COURSE_SOURCE_DOMAIN_NOT_APPROVED'), 'source verification rechecks approved provider domain');
check('P5-SEC-010', files.importedAdmin.includes('IMPORTED_COURSE_LINK_VERIFICATION_REQUIRED'), 'publication requires a verified direct link');
check('P5-SEC-011', files.importedAdmin.includes('COURSE_FETCH_MISSING_PROVIDER_POLICY_FILE_ONLY'), 'file-only providers cannot be crawled');
check('P5-SEC-012', files.importedAdmin.includes('COURSE_FETCH_MISSING_CONNECTOR_ADAPTER_UNAVAILABLE'), 'missing registered connector never falls back to arbitrary crawling');

// Canonical relationship closure R-020..R-022.
check('P5-REL-001', files.relations.includes('CourseRelationshipReviewReadModel'), 'P13 has an owner review read model');
check('P5-REL-002', files.relationships.includes('getReviewModel(courseId'), 'relationship review model is implemented');
check('P5-REL-003', files.relationships.includes('approveLanguageReference'), 'canonical ReferenceLanguage owner review exists');
check('P5-REL-004', files.relationships.includes("listTaxonomyLinks(courseId, 'APPROVED')"), 'Major projection derives only from approved taxonomy links');
check('P5-REL-005', files.relationships.includes('projectionState: \'PROPOSED\''), 'Course→Major projection remains reviewable before approval');
check('P5-REL-006', files.relations.includes('reviewTaxonomyLink(input: {\n    courseId: string;'), 'taxonomy review contract requires course owner id');
check('P5-REL-007', files.relations.includes('reviewMajorProjection(input: {\n    courseId: string;'), 'Major projection review contract requires course owner id');
check('P5-REL-008', files.relationshipRepo.includes('where: { id: input.linkId, courseId: input.courseId }'), 'taxonomy review persistence is course-owner scoped');
check('P5-REL-009', files.relationshipRepo.includes('where: { id: input.projectionId, courseId: input.courseId }'), 'Major review persistence is course-owner scoped');
check('P5-REL-010', files.relationshipRepo.includes("projectionState: 'APPROVED'"), 'public Course→Major read requires approved projection');
check('P5-REL-011', files.relationshipRepo.includes("reviewState: 'APPROVED'"), 'public Course→taxonomy read requires approved link');
check('P5-REL-012', files.relationshipRepo.includes('where.learningLanguageReferenceId = filters.learningLanguageReferenceId'), 'public language filter uses canonical ReferenceLanguage id');
check('P5-REL-013', files.relationshipRepo.includes('headquartersCountryReferenceId: filters.providerHeadquartersCountryReferenceId'), 'country relationship retains provider-headquarters semantics');
check('P5-REL-014', files.relationshipRepo.includes('const pageSize = Math.min(50'), 'relationship public read is bounded to 50');
check('P5-REL-015', files.adminRouter.includes("router.get('/:id/relationships'"), 'course owner relationship read model is exposed in admin API');
check('P5-REL-016', files.adminRouter.includes("router.post('/:id/relationships/analyze'"), 'course owner can trigger relationship analysis');
check('P5-REL-017', files.adminRouter.includes("/:id/relationships/taxonomy/:linkId/approve"), 'taxonomy approval API is course-owner scoped');
check('P5-REL-018', files.adminRouter.includes("/:id/relationships/majors/:projectionId/approve"), 'Major projection approval API is course-owner scoped');
check('P5-REL-019', files.di.includes('courseRelationshipResolutionService:'), 'relationship resolution service is runtime-wired in DI');
check('P5-REL-020', files.publicRouter.includes('learningLanguageReferenceId: z.string().trim().min(1).optional()'), 'public course API exposes canonical language filter');
check('P5-REL-021', files.publicRouter.includes('providerHeadquartersCountryReferenceId: z.string().trim().min(1).optional()'), 'public course API exposes provider-HQ country filter');
check('P5-REL-022', files.publicDto.includes('ownerId: string'), 'public course read model exposes stable ownerId');
check('P5-REL-023', files.courseEntity.includes('learningLanguageReferenceId?: string'), 'generic Course DTO carries canonical language relation as read-only field');
check('P5-REL-024', files.courseRepo.includes('learningLanguageReferenceId: record.learningLanguageReferenceId'), 'generic Course repository hydrates canonical language relation');
check('P5-REL-025', files.publicUseCases.includes('learningLanguageReferenceId: course.learningLanguageReferenceId'), 'public course detail emits canonical language relation');
check('P5-REL-026', files.publicUseCases.includes('pickOptionalPublicFields'), 'public optional fields are allow-listed rather than spread wholesale');

// Course/module/lesson/enrollment/progress/assessment/completion contract closure.
check('P5-LRN-001', files.progressEntity.includes('interface CourseEnrollmentDto'), 'Course enrollment contract exists');
check('P5-LRN-002', files.progressEntity.includes('interface CourseLessonProgressDto'), 'Lesson progress contract exists');
check('P5-LRN-003', files.progressEntity.includes('interface CourseQuizAttemptDto'), 'Assessment attempt contract exists');
check('P5-LRN-004', files.progressEntity.includes('interface CourseCompletionDto'), 'Course completion contract exists');
check('P5-LRN-005', files.learnerRouter.includes("router.post('/:courseId/enroll'"), 'learner enrollment API exists');
check('P5-LRN-006', files.learnerRouter.includes("router.put('/:courseId/lessons/:lessonId/progress'"), 'lesson progress API exists');
check('P5-LRN-007', files.learnerRouter.includes("router.post('/:courseId/quizzes/:quizId/attempts'"), 'assessment attempt API exists');
check('P5-LRN-008', files.learnerRouter.includes("router.post('/:courseId/complete'"), 'course completion API exists');
check('P5-LRN-009', !/interface SubmitQuizAttemptDto[\s\S]{0,260}\bscore\s*:/.test(files.progressEntity), 'learner assessment submission cannot submit a score');
check('P5-LRN-010', files.progressEntity.includes('interface GradeQuizAttemptDto'), 'server-side graded attempt contract is separate');
check('P5-LRN-011', files.learnerRouter.includes('z.object({ answers: z.record'), 'learner assessment API accepts answers only');
check('P5-LRN-012', files.progress.includes('score >= quiz.passingScore'), 'assessment score is calculated server-side');
check('P5-LRN-013', files.progress.includes('COURSE_ASSESSMENT_NOT_PASSED'), 'completion fails closed on unmet assessment requirement');
check('P5-LRN-014', files.progress.includes('Course progress must reach 100% before completion'), 'course completion requires full progress');
check('P5-LRN-015', files.progressRepo.includes('withTransaction(context'), 'course progress repository supports atomic completion persistence');
check('P5-LRN-016', files.learningRepo.includes('withTransaction(context'), 'learning-path repository supports atomic completion persistence');

// Completion event authority: P13 emits; P14 owns certificates.
check('P5-EVT-001', files.completedEvent.includes("COURSE_COMPLETED_EVENT_TYPE = 'CourseCompleted'"), 'CourseCompleted domain event contract exists');
check('P5-EVT-002', files.pathCompletedEvent.includes("LEARNING_PATH_COMPLETED_EVENT_TYPE = 'LearningPathCompleted'"), 'LearningPathCompleted domain event contract exists');
check('P5-EVT-003', files.progress.includes('atomicMutations.execute'), 'CourseCompleted is emitted through atomic mutation coordinator');
check('P5-EVT-004', files.progress.includes('COURSE_COMPLETED_EVENT_TYPE'), 'CourseProgressUseCases emits the CourseCompleted type');
check('P5-EVT-005', files.progress.includes('certificateOwnerPhase: \'Phase 14 - Enterprise Certificates Platform\''), 'CourseCompleted delegates certificate authority to P14');
check('P5-EVT-006', files.learningPath.includes('atomicMutations.execute'), 'LearningPathCompleted is emitted through atomic mutation coordinator');
check('P5-EVT-007', files.learningPath.includes('LEARNING_PATH_COMPLETED_EVENT_TYPE'), 'LearningPathUseCases emits the LearningPathCompleted type');
check('P5-EVT-008', files.learningPath.includes('eligibleForCertificate: false'), 'learning path completion does not mint a certificate in P13');
check('P5-EVT-009', files.directPublisher.includes('COURSE_COMPLETION_DIRECT_PUBLISH_FORBIDDEN_USE_ATOMIC_OUTBOX'), 'non-atomic direct completion publisher fails closed');
check('P5-EVT-010', !files.gatewayIndex.includes('EnterpriseCourseCompletionEventPublisher'), 'direct completion publisher is not exported through P13 gateway barrel');
check('P5-EVT-011', !files.di.includes('courseCompletionEventPublisher:'), 'direct completion publisher is not DI-wired');

function collectTs(root) {
  const out = [];
  for (const name of readdirSync(root)) {
    const path = join(root, name);
    const st = statSync(path);
    if (st.isDirectory()) out.push(...collectTs(path));
    else if (/\.(ts|tsx)$/.test(name)) out.push(path);
  }
  return out;
}
const p13Source = [
  ...collectTs('packages/domain/src/courses'),
  ...collectTs('packages/application/src/courses'),
  ...collectTs('packages/infrastructure/src/courses'),
  ...collectTs('apps/api/src/presentation/api/router').filter((path) => /Course/.test(path)),
].map((path) => `${path}\n${read(path)}`).join('\n');
check('P5-EVT-012', !/from ['"][^'"]*certificates[^'"]*['"]/.test(p13Source), 'P13 course source does not import certificate-generation modules');
check('P5-EVT-013', !/\b(generateCertificate|issueCertificate|createCertificate)\s*\(/.test(p13Source), 'P13 course source contains no certificate generation call');

for (const id of ['R-020', 'R-021', 'R-022']) {
  const line = files.matrix.split('\n').find((candidate) => candidate.startsWith(`| ${id} |`)) ?? '';
  check(`P5-MATRIX-${id}`, line.includes('| Runtime Pending | P5 CLOSED |'), `${id} source closure recorded as runtime-pending P5 CLOSED`);
}
const r023 = files.matrix.split('\n').find((candidate) => candidate.startsWith('| R-023 |')) ?? '';
check('P5-MATRIX-R-023', r023.includes('| Partial | P6 |') || r023.includes('| Runtime Pending | P6 CLOSED |'), 'P13→P14 delivery is either explicitly deferred to P6 or subsequently source-closed by P6');
check('P5-SCOPE-001', existsSync('docs/remediation/p5/P5_LEARNING_IMPORTED_COURSES_CLOSURE_2026-09-03.md'), 'P5 closure evidence document exists');

console.log(JSON.stringify({ status: failures.length ? 'FAIL' : 'PASS', checks: passed + failures.length, passed, failures }, null, 2));
if (failures.length) process.exit(1);
