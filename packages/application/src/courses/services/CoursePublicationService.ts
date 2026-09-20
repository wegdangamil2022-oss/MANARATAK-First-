import {
  COURSE_PUBLISHED_EVENT_TYPE,
  CourseAccessType,
  CourseDto,
  CourseImportCompletenessState,
  CourseOriginType,
  CourseStatus,
  ICourseRepository,
  ICourseRelationshipRepository,
  IImportedCourseOperationsRepository,
  ITransactionalCourseRepository,
} from '@manaratak/domain';
import { AtomicDomainMutationCoordinator, AtomicMutationRequestContext } from '../../event-foundation/use-cases/AtomicDomainMutationCoordinator';

const VERIFIED_LINK_STATES = new Set(['VERIFIED_DIRECT', 'REDIRECTED_VALID']);

/** One authoritative publication boundary for every Course origin. */
export class CoursePublicationService {
  public constructor(
    private readonly repository: ICourseRepository,
    private readonly importedOperations?: IImportedCourseOperationsRepository,
    private readonly atomicMutations?: AtomicDomainMutationCoordinator,
    private readonly relationshipRepository?: ICourseRelationshipRepository,
  ) {}

  public async assertPublicationReady(course: CourseDto): Promise<void> {
    if (course.completenessStatus !== CourseImportCompletenessState.COMPLETE) {
      throw new Error('COURSE_PUBLICATION_REQUIRES_COMPLETE_RECORD');
    }

    if (this.relationshipRepository) {
      const [source, taxonomyLinks, majorProjections, testRelationships] = await Promise.all([
        this.relationshipRepository.getRelationshipSource(course.id),
        this.relationshipRepository.listTaxonomyLinks(course.id),
        this.relationshipRepository.listMajorProjections(course.id),
        this.relationshipRepository.listInternationalTestRelationships(course.id),
      ]);
      const rawLanguage = source?.learningLanguageRaw?.trim() || course.learningLanguage?.trim();
      if (rawLanguage && !source?.learningLanguageReferenceId) {
        throw new Error('COURSE_PUBLICATION_CANONICAL_LANGUAGE_REQUIRED');
      }
      if (source?.shortCourseTopicsRaw?.trim() && !taxonomyLinks.some((item) => item.reviewState === 'APPROVED')) {
        throw new Error('COURSE_PUBLICATION_APPROVED_TAXONOMY_REQUIRED');
      }
      if (taxonomyLinks.some((item) => item.reviewState === 'PROPOSED' || item.reviewState === 'REVIEW_REQUIRED')
        || majorProjections.some((item) => item.projectionState === 'PROPOSED' || item.projectionState === 'REVIEW_REQUIRED')
        || testRelationships.some((item) => item.reviewState === 'PROPOSED')) {
        throw new Error('COURSE_PUBLICATION_RELATIONSHIP_REVIEW_REQUIRED');
      }
    }

    if (course.originType !== CourseOriginType.EXTERNAL_LINKED_COURSE) return;
    if (!this.importedOperations) throw new Error('IMPORTED_COURSE_PUBLICATION_EVIDENCE_NOT_CONFIGURED');

    if (
      course.accessType !== CourseAccessType.FREE_STUDY_AND_CERTIFICATE ||
      course.isStudyFree !== true ||
      course.isFreeCertificate !== true
    ) {
      throw new Error('IMPORTED_COURSE_FREE_STUDY_AND_CERTIFICATE_REQUIRED');
    }

    const detail = await this.importedOperations.getImportedCourseById(course.id);
    if (!detail) throw new Error('IMPORTED_COURSE_PUBLICATION_EVIDENCE_NOT_FOUND');
    if (!detail.sourceVerified) throw new Error('IMPORTED_COURSE_SOURCE_VERIFICATION_REQUIRED');
    if (!VERIFIED_LINK_STATES.has(detail.linkHealth)) {
      throw new Error(`IMPORTED_COURSE_DIRECT_LINK_VERIFICATION_REQUIRED:${detail.linkHealth}`);
    }
  }

  public async publish(course: CourseDto, context?: AtomicMutationRequestContext): Promise<void> {
    if (course.status !== CourseStatus.READY_TO_PUBLISH) {
      throw new Error('Only READY_TO_PUBLISH courses can be PUBLISHED');
    }
    await this.assertPublicationReady(course);

    const transactional = this.repository as Partial<ITransactionalCourseRepository>;
    if (!this.atomicMutations || typeof transactional.withTransaction !== 'function') {
      throw new Error('COURSE_ATOMIC_PUBLICATION_REQUIRED');
    }

    const publishedAt = new Date();
    const publishedVersion = course.version + 1;
    await this.atomicMutations.execute({
      domain: 'COURSES',
      aggregateType: 'COURSE',
      aggregateId: course.id,
      action: 'COURSE_PUBLISHED',
      context,
      outbox: {
        id: `course-published:${course.id}:v${publishedVersion}`,
        eventType: COURSE_PUBLISHED_EVENT_TYPE,
        payload: {
          courseId: course.id,
          publicId: course.publicId,
          slug: course.slug,
          courseVersion: publishedVersion,
          originType: course.originType,
          accessType: course.accessType,
          publishedAt: publishedAt.toISOString(),
          sourcePhase: 'Phase 13 - Learning Platform',
        },
        metadata: { eventVersion: '1.0.0', category: 'LearningPlatform' },
      },
    }, async persistence => {
      const tx = (this.repository as ITransactionalCourseRepository).withTransaction(persistence);
      const current = await tx.findById(course.id);
      if (!current || current.status !== CourseStatus.READY_TO_PUBLISH || current.version !== course.version) {
        throw new Error('COURSE_PUBLICATION_STATE_CHANGED');
      }
      await tx.updateStatus(course.id, CourseStatus.PUBLISHED);
    });
  }
}
