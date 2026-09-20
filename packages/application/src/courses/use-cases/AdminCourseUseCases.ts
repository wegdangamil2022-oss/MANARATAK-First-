import { AssetReferencePolicy, assertAssetReferenceUsable } from '../../asset-platform/AssetReferencePolicy';
import {
  CourseCompletenessClassifier,
  CourseDto,
  CourseFilters,
  CourseImportCompletenessState,
  CourseOriginType,
  CourseStatus,
  ICourseRepository,
  PaginatedCourseResult,
  UpdateCourseDto,
} from '@manaratak/domain';
import { assertNoTranslationPayloadFields } from '@manaratak/shared';
import { AtomicMutationRequestContext } from '../../event-foundation/use-cases/AtomicDomainMutationCoordinator';
import { CoursePublicationService } from '../services/CoursePublicationService';

const IMPORT_LINEAGE_FIELDS: ReadonlyArray<keyof UpdateCourseDto> = [
  'directCourseUrl',
  'sourceUrl',
  'officialSourceUrl',
  'externalProviderId',
  'originalSourceTitle',
];

export class AdminCourseUseCases {
  constructor(
    private readonly repository: ICourseRepository,
    private readonly publicationService?: CoursePublicationService,
    private readonly assetReferences?: AssetReferencePolicy,
  ) {}

  public async listCourses(filters: CourseFilters): Promise<PaginatedCourseResult<CourseDto>> {
    return this.repository.list(filters);
  }

  public async getCourse(id: string): Promise<CourseDto> {
    const course = await this.repository.findById(id);
    if (!course) throw new Error(`Course with id ${id} not found`);
    return course;
  }

  public async updateCourse(id: string, updates: UpdateCourseDto): Promise<CourseDto> {
    await assertAssetReferenceUsable(this.assetReferences, updates.thumbnailAssetId, { purpose: 'COURSE_THUMBNAIL' });
    assertNoTranslationPayloadFields('COURSE', updates.optionalFields, ['localizedNames', 'titleEn']);
    const existing = await this.getCourse(id);
    if (updates.originType && updates.originType !== existing.originType) {
      throw new Error('COURSE_ORIGIN_TYPE_MUTATION_FORBIDDEN');
    }
    if (existing.status === CourseStatus.PUBLISHED && Object.keys(updates).some((key) => (updates as Record<string, unknown>)[key] !== undefined)) {
      throw new Error('COURSE_PUBLISHED_STRUCTURE_IMMUTABLE_UNPUBLISH_FIRST');
    }

    if (existing.originType === CourseOriginType.EXTERNAL_LINKED_COURSE) {
      for (const field of IMPORT_LINEAGE_FIELDS) {
        if (updates[field] !== undefined && !this.equal(updates[field], existing[field as keyof CourseDto])) {
          throw new Error(`IMPORTED_COURSE_${String(field).toUpperCase()}_CHANGE_REQUIRES_CONTROLLED_IMPORT`);
        }
      }
    }

    if (existing.originType === CourseOriginType.NATIVE_MANARATAK_COURSE) {
      if (updates.directCourseUrl && !updates.directCourseUrl.startsWith('/courses/')) {
        throw new Error('NATIVE_COURSE_INTERNAL_URL_REQUIRED');
      }
      return this.repository.update(id, {
        ...updates,
        originType: undefined,
        learningLanguageRaw: updates.learningLanguage !== undefined
          ? updates.learningLanguage
          : updates.learningLanguageRaw,
        completenessStatus: existing.completenessStatus,
      });
    }

    if (existing.originType !== CourseOriginType.EXTERNAL_LINKED_COURSE) {
      return this.repository.update(id, {
        ...updates,
        originType: undefined,
        completenessStatus: existing.completenessStatus,
      });
    }

    const classification = CourseCompletenessClassifier.classify({
      courseName: updates.displayName ?? existing.displayName,
      accessType: updates.accessType ?? existing.accessType,
      originType: existing.originType,
      directCourseUrl: existing.directCourseUrl,
      platformName: updates.platformName !== undefined ? updates.platformName || undefined : existing.platformName || undefined,
      providerName: updates.providerName !== undefined ? updates.providerName || undefined : existing.providerName || undefined,
      sourceUrl: existing.sourceUrl || undefined,
      officialSourceUrl: existing.officialSourceUrl || undefined,
    });

    return this.repository.update(id, {
      ...updates,
      originType: undefined,
      directCourseUrl: undefined,
      sourceUrl: undefined,
      officialSourceUrl: undefined,
      externalProviderId: undefined,
      originalSourceTitle: undefined,
      completenessStatus: classification.state,
    });
  }

  public async markReadyToReview(id: string): Promise<void> {
    const existing = await this.getCourse(id);
    if (existing.completenessStatus === CourseImportCompletenessState.INCOMPLETE ||
        existing.completenessStatus === CourseImportCompletenessState.REJECTED) {
      throw new Error('Cannot mark non-reviewable course as READY_TO_REVIEW');
    }
    if (existing.status !== CourseStatus.READY_TO_REVIEW) {
      await this.repository.updateStatus(id, CourseStatus.READY_TO_REVIEW);
    }
  }

  public async markReadyToPublish(id: string): Promise<void> {
    const existing = await this.getCourse(id);
    if (existing.originType === CourseOriginType.NATIVE_MANARATAK_COURSE) {
      throw new Error('NATIVE_COURSE_LIFECYCLE_REQUIRES_NATIVE_BOUNDARY');
    }
    if (!this.publicationService) throw new Error('COURSE_PUBLICATION_POLICY_NOT_CONFIGURED');
    await this.publicationService.assertPublicationReady(existing);
    await this.repository.updateStatus(id, CourseStatus.READY_TO_PUBLISH);
  }

  public async publish(id: string, context?: AtomicMutationRequestContext): Promise<void> {
    const existing = await this.getCourse(id);
    if (existing.originType === CourseOriginType.NATIVE_MANARATAK_COURSE) {
      throw new Error('NATIVE_COURSE_LIFECYCLE_REQUIRES_NATIVE_BOUNDARY');
    }
    if (!this.publicationService) throw new Error('COURSE_PUBLICATION_POLICY_NOT_CONFIGURED');
    await this.publicationService.publish(existing, context);
  }

  public async unpublish(id: string): Promise<void> {
    const existing = await this.getCourse(id);
    if (existing.status !== CourseStatus.PUBLISHED) {
      throw new Error('Cannot unpublish a course that is not PUBLISHED');
    }
    await this.repository.updateStatus(id, CourseStatus.READY_TO_REVIEW);
  }

  public async reject(id: string): Promise<void> {
    const existing = await this.getCourse(id);
    if (existing.status === CourseStatus.PUBLISHED) {
      throw new Error('Cannot reject a PUBLISHED course. Unpublish first.');
    }
    await this.repository.updateStatus(id, CourseStatus.REJECTED);
  }

  public async archive(id: string): Promise<void> {
    await this.repository.updateStatus(id, CourseStatus.ARCHIVED);
  }

  private equal(left: unknown, right: unknown): boolean {
    return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
  }
}
