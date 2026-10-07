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
    const course = await this.repository.findBySlug(slug);

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

  private mapToPublicDto(course: any, locale: SupportedLocale): PublicCourseDto {
    const optional = course.optionalFields && typeof course.optionalFields === 'object' && !Array.isArray(course.optionalFields)
      ? course.optionalFields as Record<string, unknown>
      : {};
    const optionalPublic = this.pickOptionalPublicFields(optional);
    return {
      ownerId: course.id,
      publicId: course.publicId,
      slug: course.slug,
      displayName: this.resolveDisplayName(course.displayName, optional.localizedNames, locale),
      canonicalName: course.canonicalName,
      titleEn: typeof optional.titleEn === "string" ? optional.titleEn : undefined,
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
    return this.localeProjection.resolveValue<string>({
      requestedLocale: locale,
      sourceValue,
      localizedValues,
    }).value ?? sourceValue;
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
    return course.accessType === CourseAccessType.FREE_STUDY_AND_CERTIFICATE
      && course.isStudyFree === true
      && course.isFreeCertificate === true;
  }
}
