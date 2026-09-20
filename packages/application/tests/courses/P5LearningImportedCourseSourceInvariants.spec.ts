import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8').replace(/\r\n/g, '\n');

describe('P5 Learning / Imported Courses source closure', () => {
  it('disables legacy import promotion and non-atomic completion publishing', () => {
    const promotion = read('packages/application/src/courses/use-cases/CourseImportPromotionUseCase.ts');
    const publisher = read('packages/application/src/courses/gateways/EnterpriseCourseCompletionEventPublisher.ts');
    const useCaseBarrel = read('packages/application/src/courses/use-cases/index.ts');
    const gatewayBarrel = read('packages/application/src/courses/gateways/index.ts');
    const di = read('apps/api/src/infrastructure/di/container.ts');

    expect(promotion).toContain('COURSE_IMPORT_LEGACY_PROMOTION_DISABLED_USE_COURSE_IMPORT_COORDINATOR');
    expect(useCaseBarrel).not.toContain("./CourseImportPromotionUseCase");
    expect(publisher).toContain('COURSE_COMPLETION_DIRECT_PUBLISH_FORBIDDEN_USE_ATOMIC_OUTBOX');
    expect(gatewayBarrel).not.toContain('EnterpriseCourseCompletionEventPublisher');
    expect(di).not.toContain('courseCompletionEventPublisher:');
  });

  it('keeps source URL/provider identity gated by approved provider domains', () => {
    const analysis = read('packages/application/src/courses/use-cases/CourseImportIdentityDiffUseCase.ts');
    const coordinator = read('packages/application/src/courses/use-cases/CourseImportCoordinator.ts');
    const operations = read('packages/application/src/courses/use-cases/ImportedCourseAdminUseCases.ts');

    expect(analysis).toContain('ExternalCourseProviderStatus.APPROVED');
    expect(analysis).toContain('isDomainApproved(provider.id, normalizedUrl)');
    expect(coordinator).toContain('COURSE_IMPORT_SOURCE_IDENTITY_PROPOSAL_REQUIRED');
    expect(operations).toContain('IMPORTED_COURSE_DIRECT_URL_CHANGE_REQUIRES_CONTROLLED_IMPORT');
    expect(operations).toContain('IMPORTED_COURSE_LINK_VERIFICATION_REQUIRED');
  });

  it('scopes Course taxonomy/Major reviews to the owning course and canonical ids', () => {
    const contracts = read('packages/domain/src/courses/relationships.ts');
    const repository = read('packages/infrastructure/src/courses/PrismaCourseRelationshipRepository.ts');
    const router = read('apps/api/src/presentation/api/router/CourseAdminRouter.ts');

    expect(contracts).toContain('reviewTaxonomyLink(input: {\n    courseId: string;');
    expect(contracts).toContain('reviewMajorProjection(input: {\n    courseId: string;');
    expect(repository).toContain('where: { id: input.linkId, courseId: input.courseId }');
    expect(repository).toContain('where: { id: input.projectionId, courseId: input.courseId }');
    expect(router).toContain("router.get('/:id/relationships'");
  });

  it('uses transactional outbox completion and leaves certificate issuance outside P13', () => {
    const progress = read('packages/application/src/courses/use-cases/CourseProgressUseCases.ts');
    const paths = read('packages/application/src/courses/use-cases/LearningPathUseCases.ts');

    expect(progress).toContain('atomicMutations.execute');
    expect(progress).toContain('COURSE_COMPLETED_EVENT_TYPE');
    expect(paths).toContain('atomicMutations.execute');
    expect(paths).toContain('LEARNING_PATH_COMPLETED_EVENT_TYPE');
    expect(progress).not.toMatch(/\b(generateCertificate|issueCertificate|createCertificate)\s*\(/);
    expect(paths).not.toMatch(/\b(generateCertificate|issueCertificate|createCertificate)\s*\(/);
  });
});
