import {approvedOwnerDescriptions} from '../../localization/OwnerLocalizedDescription';
import { normalizeCourseDeliveryPolicy, courseLessonAccess } from '@manaratak/domain';
import {
  CourseAccessType,
  CourseImportCompletenessState,
  CourseOriginType,
  CourseStatus,
  ICourseRepository,
  ICourseCurriculumRepository,
  CourseContentStatus,
  PaginatedCourseResult,
  PublicCourseDto,
  PublicCourseFilters
} from '@manaratak/domain';
import { DEFAULT_LOCALE, isSupportedLocale, type SupportedLocale } from '@manaratak/shared';
import { ApplicationLocaleProjectionService } from '../../localization/ApplicationLocaleProjectionService';

type LocalizableCourseSummary = {
  displayName: string;
  localizedNames?: Record<string, string>;
};

export class PublicCourseUseCases {
  private readonly localeProjection = new ApplicationLocaleProjectionService();

  constructor(private readonly repository: ICourseRepository, private readonly curriculumRepository?: ICourseCurriculumRepository) {}

  public async listCourses(
    filters: PublicCourseFilters,
    locale: SupportedLocale = DEFAULT_LOCALE,
  ): Promise<PaginatedCourseResult<PublicCourseDto>> {
    const paginated = await this.repository.listPublished(filters);

    return {
      ...paginated,
      data: paginated.data.map((course) => this.mapToPublicDto(course, locale))
    };
  }

  public async getCourse(
    slug: string,
    locale: SupportedLocale = DEFAULT_LOCALE,
  ): Promise<PublicCourseDto> {
    const course = await this.repository.findPublishedBySlug(slug);

    if (!course || course.status !== CourseStatus.PUBLISHED || course.completenessStatus !== CourseImportCompletenessState.COMPLETE || !this.publicEligible(course)) {
      throw new Error('Course not found');
    }

    const result = this.mapToPublicDto(course, locale);
    if (course.originType !== CourseOriginType.EXTERNAL_LINKED_COURSE && this.curriculumRepository) {
      const curriculum = await this.curriculumRepository.getCurriculumSnapshot(course.id);
      const modules = curriculum.modules.filter(module=>module.status !== CourseContentStatus.ARCHIVED).sort((a,b)=>a.position-b.position);
      result.curriculumModules = modules.map(module=>({title:module.title,description:module.description ?? ''}));
      const moduleIds = new Set(modules.map(module=>module.id));
      result.lessonsCount = curriculum.lessons.filter(lesson=>lesson.status!==CourseContentStatus.ARCHIVED && moduleIds.has(lesson.moduleId)).length;
    }
    return result;
  }

  public localizeRelationshipPage<T extends LocalizableCourseSummary>(
    result: PaginatedCourseResult<T>,
    locale: SupportedLocale = DEFAULT_LOCALE,
  ): PaginatedCourseResult<T> {
    return {
      ...result,
      data: result.data.map((course) => {
        const { localizedNames: _localizedNames, ...publicCourse } = course;
        return {
          ...publicCourse,
          displayName: this.resolveDisplayName(course.displayName, course.localizedNames, locale),
        } as T;
      }),
    };
  }

  private async previewDefinition(slug: string) {
    const course = await this.repository.findPublishedBySlug(slug);
    if (
      !course || course.status !== CourseStatus.PUBLISHED || course.completenessStatus !== CourseImportCompletenessState.COMPLETE ||
      course.originType !== CourseOriginType.NATIVE_MANARATAK_COURSE ||
      !this.curriculumRepository?.getLearningVersion
    )
      throw Error('Course not found');
    const definition = await this.curriculumRepository.getLearningVersion(
      course.id,
      course.version,
      course.updatedAt,
    );
    if (!definition) throw Error('Course not found');
    return { course, definition };
  }

  public async preview(slug: string, locale: SupportedLocale = DEFAULT_LOCALE) {
    const { course, definition } = await this.previewDefinition(slug);
    const summary = this.mapToPublicDto(course, locale);
    const curriculum = definition.curriculum,
      policy = normalizeCourseDeliveryPolicy(definition.course.optionalFields?.deliveryPolicy);
    const previewIds = new Set(
      courseLessonAccess(curriculum, policy, [])
        .filter((row) => row.previewAvailable)
        .map((row) => row.lessonId),
    );
    const modules = curriculum.modules
      .filter((row) => row.status !== CourseContentStatus.ARCHIVED)
      .sort((a, b) => a.position - b.position);
    const moduleIds = new Set(modules.map((row) => row.id));
    return {
      course: {
        id: course.id,
        slug,
        displayName: summary.displayName,
        description: summary.description,
        learningOutcomes: summary.learningOutcomes,
      },
      curriculum: {
        modules: modules.map(({ id, title, position }) => ({ id, title, position })),
        lessons: curriculum.lessons
          .filter(
            (row) => row.status !== CourseContentStatus.ARCHIVED && moduleIds.has(row.moduleId),
          )
          .sort((a, b) => a.position - b.position)
          .map(({ id, moduleId, title, summary, position, contentText }) => ({
            id,
            moduleId,
            title,
            summary,
            position,
            previewAvailable: previewIds.has(id),
            contentText: previewIds.has(id) ? contentText : null,
          })),
        contentBlocks: (curriculum.contentBlocks ?? [])
          .filter(
            (row) =>
              row.status !== 'ARCHIVED' && row.type !== 'QUIZ' && previewIds.has(row.lessonId),
          )
          .map(({ id, lessonId, type, payload, assetReferenceId, position, version }) => ({
            id,
            lessonId,
            type,
            payload,
            assetReferenceId,
            quizId: null,
            position,
            version,
          })),
        assets: curriculum.assets
          .filter((row) => previewIds.has(row.lessonId))
          .map(({ id, lessonId, title, assetType, position, isRequired }) => ({
            id,
            lessonId,
            title,
            assetType,
            position,
            isRequired,
          })),
      },
    };
  }

  public async resolvePreviewAsset(slug: string, lessonId: string, referenceId: string) {
    const { definition } = await this.previewDefinition(slug);
    const policy = normalizeCourseDeliveryPolicy(definition.course.optionalFields?.deliveryPolicy);
    if (
      !courseLessonAccess(definition.curriculum, policy, []).some(
        (row) => row.lessonId === lessonId && row.previewAvailable,
      )
    )
      throw Error('Course preview not found');
    const asset = definition.curriculum.assets.find(
      (row) => row.id === referenceId && row.lessonId === lessonId,
    );
    if (!asset) throw Error('Course preview not found');
    return asset.assetId;
  }

  private mapToPublicDto(course: any, locale: SupportedLocale): PublicCourseDto {
    const optional =
      course.optionalFields && typeof course.optionalFields === 'object' && !Array.isArray(course.optionalFields)
        ? (course.optionalFields as Record<string, unknown>)
        : {};
    const optionalPublic = this.pickOptionalPublicFields(optional);
    const descriptions = approvedOwnerDescriptions('COURSE', course);
    const pair = descriptions[locale];
    return {
      ownerId: course.id,
      publicId: course.publicId,
      slug: course.slug,
      displayName: this.resolveDisplayName(course.displayName, optional.localizedNames, locale),
      canonicalName: course.canonicalName,
      titleEn: descriptions.en?.displayName ?? (typeof optional.titleEn === "string" ? optional.titleEn : undefined),
      relatedMajors: course.relatedMajors ?? [],
      accessType: course.accessType,
      originType: course.originType,
      directCourseUrl: course.directCourseUrl,
      externalProviderId: course.externalProviderId ?? null,
      isStudyFree: course.isStudyFree ?? null,
      isFreeCertificate: course.isFreeCertificate ?? null,
      certificateType: course.certificateType ?? null,
      learningLanguageReferenceId: course.learningLanguageReferenceId ?? null,
      platformName: course.platformName ?? null,
      providerName: course.providerName ?? null,
      learningLanguage: course.learningLanguage ?? null,
      studyDuration: course.studyDuration ?? null,
      certificateAvailable: course.certificateAvailable ?? null,
      category: course.category ?? null,
      difficultyLevel: course.difficultyLevel ?? null,
      sourceUrl: course.sourceUrl ?? null,
      officialSourceUrl: course.officialSourceUrl ?? null,
      thumbnailAssetId: course.thumbnailAssetId ?? null,
      shortCourseTopicsRaw: course.shortCourseTopicsRaw ?? null,
      studyLevelRaw: course.studyLevelRaw ?? null,
      studyDurationRaw: course.studyDurationRaw ?? null,
      learningLanguageRaw: course.learningLanguageRaw ?? null,
      ...optionalPublic,
      ...(pair ? {displayName:pair.displayName,description:pair.description} : {}),
      updatedAt: course.updatedAt,
    };
  }

  private resolveDisplayName(
    sourceValue: string,
    localizedNames: unknown,
    locale: SupportedLocale,
  ): string {
    const localizedValues: Partial<Record<SupportedLocale, string>> = {};
    if (localizedNames && typeof localizedNames === 'object' && !Array.isArray(localizedNames)) {
      for (const [candidateLocale, value] of Object.entries(localizedNames as Record<string, unknown>)) {
        if (!isSupportedLocale(candidateLocale) || typeof value !== 'string' || !value.trim()) continue;
        localizedValues[candidateLocale] = value.trim();
      }
    }
    return (
      this.localeProjection.resolveValue<string>({
      requestedLocale: locale,
      sourceValue,
      localizedValues,
    }).value ?? sourceValue
    );
  }

  private pickOptionalPublicFields(optional: Record<string, unknown>): Partial<PublicCourseDto> {
    const allowed = [
      'courseContent', 'acquiredSkills', 'description', 'instructor', 'prerequisites', 'targetAudience', 'learningOutcomes', 'relatedMajorsOrFields',
    ] as const;
    const result: Record<string, unknown> = {};
    for (const key of allowed) if (optional[key] !== undefined) result[key] = optional[key];
    return result as Partial<PublicCourseDto>;
  }

  private publicEligible(course: any): boolean {
    if (course.originType !== CourseOriginType.EXTERNAL_LINKED_COURSE) return true;
    return (
      [CourseAccessType.FREE_STUDY, CourseAccessType.FREE_STUDY_AND_CERTIFICATE].includes(course.accessType)
      && course.isStudyFree === true
    );
  }
}
