import { randomUUID } from 'node:crypto';
import { AtomicMutationRequestContext } from '../../event-foundation/use-cases/AtomicDomainMutationCoordinator';
import { CoursePublicationService } from '../services/CoursePublicationService';
import {
  AssetId,
  AssetLifecycleState,
  CourseAccessType,
  CourseContentStatus,
  CourseDto,
  CourseImportCompletenessState,
  CourseLessonType,
  CourseNamingService,
  CourseOriginType,
  CourseQuestionType,
  CourseStatus,
  CreateNativeCourseDto,
  ICourseCurriculumRepository,
  ICourseEnrollmentPolicyRepository,
  ICourseRelationshipRepository,
  ICourseRepository,
  IAssetRecordRepository,
  NativeCourseReadinessCheckDto,
  NativeCourseReadinessDto,
} from '@manaratak/domain';

export class NativeCourseUseCases {
  public constructor(
    private readonly courseRepository: ICourseRepository,
    private readonly curriculumRepository: ICourseCurriculumRepository,
    private readonly assetRepository?: IAssetRecordRepository,
    private readonly publicationService?: CoursePublicationService,
    private readonly relationshipRepository?: ICourseRelationshipRepository,
    private readonly enrollmentPolicyRepository?: ICourseEnrollmentPolicyRepository,
  ) {}

  public async create(input: CreateNativeCourseDto): Promise<CourseDto> {
    const titleAr = CourseNamingService.normalize(input.titleAr);
    if (!titleAr) throw new Error('NATIVE_COURSE_TITLE_REQUIRED');

    const canonicalName = titleAr.toLocaleLowerCase('ar');
    const canonicalDedupKey = `native:${canonicalName}`;
    if (await this.courseRepository.findByDedupKey(canonicalDedupKey)) {
      throw new Error('NATIVE_COURSE_CANONICAL_DUPLICATE');
    }

    const identity = randomUUID().replace(/-/g, '');
    const publicId = `CRS-NAT-${identity.slice(0, 12).toUpperCase()}`;
    const slugBase =
      CourseNamingService.normalize(input.titleEn || titleAr)
        .toLocaleLowerCase('en')
        .replace(/[^\p{L}\p{N}]+/gu, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 48) || 'course';
    const slug = `${slugBase}-${identity.slice(0, 8).toLowerCase()}`;

    return this.courseRepository.create({
      publicId,
      slug,
      canonicalName,
      canonicalDedupKey,
      displayName: titleAr,
      accessType: input.accessType ? CourseAccessType[input.accessType] : CourseAccessType.FREE_STUDY,
      originType: CourseOriginType.NATIVE_MANARATAK_COURSE,
      directCourseUrl: `/courses/${slug}`,
      status: CourseStatus.DRAFT,
      completenessStatus: CourseImportCompletenessState.INCOMPLETE,
      platformName: 'MANARATAK',
      providerName: 'MANARATAK',
      learningLanguage: input.learningLanguage,
      learningLanguageRaw: input.learningLanguage,
      category: input.category,
      difficultyLevel: input.difficultyLevel,
      optionalFields: {
        titleAr,
        ...(input.titleEn?.trim() ? { titleEn: input.titleEn.trim() } : {}),
      },
    });
  }

  public async getReadiness(courseId: string): Promise<NativeCourseReadinessDto> {
    const course = await this.requireNative(courseId);
    const curriculum = await this.curriculumRepository.getCurriculumSnapshot(courseId);
    const fields = course.optionalFields ?? {};
    const description = this.text(fields.description) || this.text(fields.courseContent);
    const learningOutcomes = Array.isArray(fields.learningOutcomes)
      ? fields.learningOutcomes.filter((item) => typeof item === 'string' && item.trim())
      : [];
    const completionCriteria = fields.completionCriteria && typeof fields.completionCriteria === 'object' && !Array.isArray(fields.completionCriteria)
      ? fields.completionCriteria as Record<string, unknown>
      : {};
    const minimumProgress = Number(completionCriteria.minimumProgress ?? 100);
    const completionPolicyValid = minimumProgress === 100;
    const [taxonomyLinks, majorProjections, testRelationships, enrollmentPolicy] = await Promise.all([
      this.relationshipRepository ? this.relationshipRepository.listTaxonomyLinks(courseId) : Promise.resolve([]),
      this.relationshipRepository ? this.relationshipRepository.listMajorProjections(courseId) : Promise.resolve([]),
      this.relationshipRepository ? this.relationshipRepository.listInternationalTestRelationships(courseId) : Promise.resolve([]),
      this.enrollmentPolicyRepository ? this.enrollmentPolicyRepository.getPolicy(courseId) : Promise.resolve(null),
    ]);
    const relationshipReviewOpen = taxonomyLinks.some((item) => ['PROPOSED', 'REVIEW_REQUIRED'].includes(item.reviewState))
      || majorProjections.some((item) => ['PROPOSED', 'REVIEW_REQUIRED'].includes(item.projectionState))
      || testRelationships.some((item) => item.reviewState === 'PROPOSED');
    const approvedTaxonomyLinks = taxonomyLinks.filter((item) => item.reviewState === 'APPROVED');
    const approvedMajorProjections = majorProjections.filter((item) => item.projectionState === 'APPROVED');
    const sourceAcademicTopic = course.shortCourseTopicsRaw?.trim() || course.category?.trim();
    const taxonomyReady = !sourceAcademicTopic || approvedTaxonomyLinks.length > 0;
    const discoveryRelationshipReady = approvedTaxonomyLinks.length > 0 || approvedMajorProjections.length > 0 || testRelationships.some((item) => item.reviewState === 'APPROVED');
    const canonicalLanguageReady = !course.learningLanguage?.trim() || Boolean(course.learningLanguageReferenceId);
    const financialPolicyReady = course.accessType !== CourseAccessType.PAID || enrollmentPolicy?.requiresFinancialClearance === true;
    const modules = curriculum.modules.filter(
      (item) => item.status !== CourseContentStatus.ARCHIVED,
    );
    const lessons = curriculum.lessons.filter(
      (item) => item.status !== CourseContentStatus.ARCHIVED,
    );
    const lessonAssets = new Map<string, number>();
    for (const asset of curriculum.assets) {
      const validHandle = Boolean(asset.assetId?.trim()) && !/^https?:\/\//i.test(asset.assetId);
      if (validHandle)
        lessonAssets.set(asset.lessonId, (lessonAssets.get(asset.lessonId) ?? 0) + 1);
    }
    const lessonQuizzes = new Set(
      curriculum.quizzes.filter((quiz) => quiz.lessonId).map((quiz) => quiz.lessonId as string),
    );
    const incompleteLessons = lessons.filter((lesson) => {
      const hasText = Boolean(lesson.contentText?.trim());
      const hasAsset = (lessonAssets.get(lesson.id) ?? 0) > 0;
      const hasQuiz = lessonQuizzes.has(lesson.id) || lesson.lessonType === CourseLessonType.QUIZ;
      return !hasText && !hasAsset && !hasQuiz;
    });
    const invalidAssets = curriculum.assets.filter(
      (asset) => !asset.assetId?.trim() || /^https?:\/\//i.test(asset.assetId),
    );
    for (const asset of curriculum.assets.filter((item) => !invalidAssets.includes(item))) {
      const record = this.assetRepository
        ? await this.assetRepository.findById(new AssetId(asset.assetId))
        : null;
      if (!record || record.state !== AssetLifecycleState.ACTIVE) invalidAssets.push(asset);
    }
    const cover =
      course.thumbnailAssetId && this.assetRepository
        ? await this.assetRepository.findById(new AssetId(course.thumbnailAssetId))
        : null;
    const coverReady = Boolean(cover && cover.state === AssetLifecycleState.ACTIVE);
    const activeQuizzes = curriculum.quizzes.filter((quiz) => quiz.status !== CourseContentStatus.ARCHIVED);
    const invalidQuizzes = activeQuizzes.filter((quiz) => {
      const questions = curriculum.questions.filter((question) => question.quizId === quiz.id && question.status !== CourseContentStatus.ARCHIVED);
      const containsUnsupportedManualGrading = questions.some((question) =>
        question.questionType === CourseQuestionType.SHORT_ANSWER || question.questionType === CourseQuestionType.ESSAY,
      );
      return (
        quiz.passingScore == null ||
        quiz.passingScore < 0 ||
        quiz.passingScore > 100 ||
        (quiz.maxAttempts != null && quiz.maxAttempts < 1) ||
        questions.length === 0 ||
        containsUnsupportedManualGrading
      );
    });
    const assessmentRequired = completionCriteria.assessmentRequired === true;
    const assessmentPolicyReady = !assessmentRequired || activeQuizzes.length > 0;
    const trackableLessons = lessons.filter((lesson) => lesson.lessonType !== CourseLessonType.QUIZ);

    const checks: NativeCourseReadinessCheckDto[] = [
      this.check(
        'title',
        'عنوان الدورة',
        Boolean(course.displayName.trim()),
        'أضف عنوانًا واضحًا للدورة.',
        'basics',
      ),
      this.check(
        'description',
        'وصف الدورة',
        Boolean(description),
        'أضف وصفًا أو محتوى تعريفيًا للدورة.',
        'basics',
      ),
      this.check(
        'classification',
        'التصنيف والمستوى واللغة',
        Boolean(course.category && course.difficultyLevel && course.learningLanguage),
        'أكمل المجال والمستوى ولغة التدريس.',
        'basics',
      ),
      this.check(
        'learning-outcomes',
        'مخرجات التعلم',
        learningOutcomes.length > 0,
        'أضف مخرج تعلم واحدًا على الأقل.',
        'basics',
      ),
      this.check(
        'canonical-language',
        'لغة مرجعية معتمدة',
        canonicalLanguageReady,
        'اربط لغة التدريس بسجل Reference Language معتمد.',
        'relationships',
      ),
      this.check(
        'taxonomy-link',
        'التصنيف الأكاديمي المعتمد',
        taxonomyReady,
        'اربط المجال الأكاديمي بعقدة Academic Taxonomy معتمدة بدل الاكتفاء بالنص الحر.',
        'relationships',
      ),
      this.check(
        'discovery-relationship',
        'علاقة اكتشاف أكاديمية',
        discoveryRelationshipReady,
        'اعتمد علاقة واحدة على الأقل مع تصنيف أو تخصص أو اختبار حتى تظهر الدورة في سياقها الأكاديمي الصحيح.',
        'relationships',
      ),
      this.check(
        'relationship-review',
        'مراجعة العلاقات الأكاديمية',
        !relationshipReviewOpen,
        'توجد علاقات تخصص/تصنيف/اختبار بانتظار المراجعة.',
        'relationships',
      ),
      this.check(
        'modules',
        'وحدات المنهج',
        modules.length > 0,
        'أضف وحدة واحدة على الأقل.',
        'curriculum',
      ),
      this.check(
        'lessons',
        'دروس المنهج',
        lessons.length > 0,
        'أضف درسًا واحدًا على الأقل.',
        'curriculum',
      ),
      this.check(
        'trackable-lessons',
        'دروس قابلة لتتبع التقدم',
        trackableLessons.length > 0,
        'أضف درسًا تعليميًا واحدًا على الأقل غير نوع QUIZ حتى يمكن احتساب تقدم الطالب.',
        'curriculum',
      ),
      this.check(
        'lesson-content',
        'محتوى الدروس',
        lessons.length > 0 && incompleteLessons.length === 0,
        incompleteLessons.length
          ? `${incompleteLessons.length} درس/دروس بلا محتوى فعلي.`
          : undefined,
        'curriculum',
      ),
      this.check(
        'assets',
        'سلامة أصول الدروس',
        invalidAssets.length === 0,
        invalidAssets.length ? 'توجد مراجع أصول غير صالحة.' : undefined,
        'curriculum',
      ),
      this.check(
        'assessments',
        'سلامة الاختبارات',
        invalidQuizzes.length === 0,
        invalidQuizzes.length ? 'أكمل أسئلة الاختبارات وقواعد النجاح. الأسئلة المقالية/القصيرة غير قابلة للنشر حتى يتصل مسار التصحيح اليدوي.' : undefined,
        'assessments',
      ),
      this.check(
        'assessment-policy',
        'اتساق شرط التقييم',
        assessmentPolicyReady,
        'تم اشتراط اجتياز تقييم دون وجود اختبار نشط.',
        'assessments',
      ),
      this.check(
        'completion-policy',
        'سياسة إكمال صالحة',
        completionPolicyValid,
        'إكمال دورة منارتك يتطلب 100% من الدروس القابلة للتتبع.',
        'completion',
      ),
      this.check(
        'financial-clearance',
        'سياسة الوصول المالي',
        financialPolicyReady,
        'الدورة المدفوعة يجب أن تتطلب تصريحًا ماليًا قبل التسجيل.',
        'enrollment',
      ),
      {
        key: 'cover',
        label: 'غلاف الدورة',
        state: course.thumbnailAssetId ? (coverReady ? 'COMPLETE' : 'INCOMPLETE') : 'OPTIONAL',
        message: course.thumbnailAssetId
          ? coverReady
            ? undefined
            : 'أصل الغلاف غير موجود أو غير نشط في منصة الأصول.'
          : 'الغلاف اختياري حاليًا ويمكن إضافته لتحسين العرض.',
        targetSection: 'basics',
      },
    ];
    const required = checks.filter((item) => item.state !== 'OPTIONAL');
    const completed = required.filter((item) => item.state === 'COMPLETE').length;
    return {
      ready: required.length > 0 && completed === required.length,
      percentage: Math.round((completed / required.length) * 100),
      checks,
    };
  }

  public async markReadyToReview(courseId: string): Promise<void> {
    const readiness = await this.getReadiness(courseId);
    if (!readiness.ready) throw new Error('NATIVE_COURSE_NOT_READY');
    await this.courseRepository.update(courseId, {
      completenessStatus: CourseImportCompletenessState.COMPLETE,
    });
    await this.courseRepository.updateStatus(courseId, CourseStatus.READY_TO_REVIEW);
  }

  public async markReadyToPublish(courseId: string): Promise<void> {
    const course = await this.requireNative(courseId);
    if (course.status !== CourseStatus.READY_TO_REVIEW)
      throw new Error('NATIVE_COURSE_REVIEW_REQUIRED');
    const readiness = await this.getReadiness(courseId);
    if (!readiness.ready) throw new Error('NATIVE_COURSE_NOT_READY');
    await this.courseRepository.update(courseId, {
      completenessStatus: CourseImportCompletenessState.COMPLETE,
    });
    await this.courseRepository.updateStatus(courseId, CourseStatus.READY_TO_PUBLISH);
  }

  public async publish(courseId: string, context?: AtomicMutationRequestContext): Promise<void> {
    const course = await this.requireNative(courseId);
    if (course.status !== CourseStatus.READY_TO_PUBLISH)
      throw new Error('NATIVE_COURSE_NOT_READY_TO_PUBLISH');
    const readiness = await this.getReadiness(courseId);
    if (!readiness.ready) throw new Error('NATIVE_COURSE_NOT_READY');
    if (!this.publicationService) throw new Error('COURSE_PUBLICATION_POLICY_NOT_CONFIGURED');
    await this.publicationService.publish(course, context);
  }

  private async requireNative(courseId: string): Promise<CourseDto> {
    const course = await this.courseRepository.findById(courseId);
    if (!course) throw new Error('NATIVE_COURSE_NOT_FOUND');
    if (course.originType !== CourseOriginType.NATIVE_MANARATAK_COURSE) {
      throw new Error('NATIVE_COURSE_ORIGIN_REQUIRED');
    }
    return course;
  }

  private text(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private check(
    key: string,
    label: string,
    complete: boolean,
    message: string | undefined,
    targetSection: NativeCourseReadinessCheckDto['targetSection'],
  ): NativeCourseReadinessCheckDto {
    return {
      key,
      label,
      state: complete ? 'COMPLETE' : 'INCOMPLETE',
      ...(complete || !message ? {} : { message }),
      targetSection,
    };
  }
}
