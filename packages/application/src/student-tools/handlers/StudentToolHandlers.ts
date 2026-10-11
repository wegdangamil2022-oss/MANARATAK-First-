import { STUDENT_TOOL_SCHEMAS } from './StudentToolSchemas';
import {
  GpaCalculatorInput,
  GpaCalculatorOutput,
  IEnterpriseAIConsumerGateway,
  IScholarshipRecommendationGateway,
  IStudentToolHandler,
  IStudentContextGateway,
  IUniversityComparisonGateway,
  MotivationLetterInput,
  MotivationLetterOutput,
  ScholarshipRecommendationInput,
  ScholarshipRecommendationOutput,
  StudentToolExecutionContext,
  StudentToolAIExecutionError,
  StudentToolExecutionType,
  UniversityComparisonInput,
  UniversityComparisonOutput,
} from '@manaratak/domain';

function known(input: Record<string, unknown>, fields: string[]) {
  if (Object.keys(input).some((key) => !fields.includes(key)))
    throw new Error('TOOL_INPUT_INVALID:unknown_field');
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('TOOL_INPUT_INVALID');
  return value as Record<string, unknown>;
}
function text(value: unknown, field: string, min = 1, max = 4000) {
  if (typeof value !== 'string' || value.trim().length < min || value.length > max)
    throw new Error(`TOOL_INPUT_INVALID:${field}`);
  return value.trim();
}
function strings(value: unknown, field: string, max = 20) {
  if (!Array.isArray(value) || value.length > max || value.some((item) => typeof item !== 'string'))
    throw new Error(`TOOL_INPUT_INVALID:${field}`);
  return [...new Set(value.map((item) => (item as string).trim()).filter(Boolean))];
}
function finite(value: unknown, field: string) {
  if (typeof value !== 'number' || !Number.isFinite(value))
    throw new Error(`TOOL_OUTPUT_INVALID:${field}`);
  return value;
}

export class GpaCalculatorHandler implements IStudentToolHandler<
  GpaCalculatorInput,
  GpaCalculatorOutput
> {
  readonly toolKey = 'gpa-calculator';
  readonly contract = STUDENT_TOOL_SCHEMAS['gpa-calculator'];
  readonly executionType = StudentToolExecutionType.DETERMINISTIC;
  validate(value: unknown): GpaCalculatorInput {
    const input = object(value);
    known(input, ['scale', 'courses', 'existingCumulativeGpa', 'existingCompletedCredits']);
    const scale = (typeof input.scale === 'number' ? input.scale : NaN);
    if (!Number.isFinite(scale) || scale < 1 || scale > 10)
      throw new Error('TOOL_INPUT_INVALID:scale');
    if (!Array.isArray(input.courses) || input.courses.length < 1 || input.courses.length > 50)
      throw new Error('TOOL_INPUT_INVALID:courses');
    const courses = input.courses.map((raw: unknown, index: number) => {
      const course = object(raw);
      known(course, ['label', 'creditHours', 'gradePoints']);
      const creditHours = (typeof course.creditHours === 'number' ? course.creditHours : NaN);
      const gradePoints = (typeof course.gradePoints === 'number' ? course.gradePoints : NaN);
      if (!Number.isFinite(creditHours) || creditHours <= 0 || creditHours > 30)
        throw new Error(`TOOL_INPUT_INVALID:courses.${index}.creditHours`);
      if (!Number.isFinite(gradePoints) || gradePoints < 0 || gradePoints > scale)
        throw new Error(`TOOL_INPUT_INVALID:courses.${index}.gradePoints`);
      return {
        label: text(course.label, `courses.${index}.label`, 1, 120),
        creditHours,
        gradePoints,
      };
    });
    const existingCumulativeGpa =
      input.existingCumulativeGpa == null ? undefined : (typeof input.existingCumulativeGpa === 'number' ? input.existingCumulativeGpa : NaN);
    const existingCompletedCredits =
      input.existingCompletedCredits == null ? undefined : (typeof input.existingCompletedCredits === 'number' ? input.existingCompletedCredits : NaN);
    if ((existingCumulativeGpa == null) !== (existingCompletedCredits == null))
      throw new Error('TOOL_INPUT_INVALID:cumulativePair');
    if (
      existingCumulativeGpa != null &&
      (!Number.isFinite(existingCumulativeGpa) ||
        existingCumulativeGpa < 0 ||
        existingCumulativeGpa > scale)
    )
      throw new Error('TOOL_INPUT_INVALID:existingCumulativeGpa');
    if (
      existingCompletedCredits != null &&
      (!Number.isFinite(existingCompletedCredits) ||
        existingCompletedCredits <= 0 ||
        existingCompletedCredits > 1000)
    )
      throw new Error('TOOL_INPUT_INVALID:existingCompletedCredits');
    return { scale, courses, existingCumulativeGpa, existingCompletedCredits };
  }
  async execute(
    _context: StudentToolExecutionContext,
    input: GpaCalculatorInput,
  ): Promise<GpaCalculatorOutput> {
    const courses = input.courses.map((course) => ({
      ...course,
      qualityPoints: course.creditHours * course.gradePoints,
    }));
    const totalSemesterCredits = courses.reduce((sum, course) => sum + course.creditHours, 0);
    const qualityPoints = courses.reduce((sum, course) => sum + course.qualityPoints, 0);
    const round = (n: number) => Number(n.toFixed(4));
    const output: GpaCalculatorOutput = {
      semesterGpa: round(qualityPoints / totalSemesterCredits),
      totalSemesterCredits: round(totalSemesterCredits),
      qualityPoints: round(qualityPoints),
      scale: input.scale,
      courses: courses.map((course) => ({ ...course, qualityPoints: round(course.qualityPoints) })),
    };
    if (input.existingCumulativeGpa != null && input.existingCompletedCredits != null) {
      output.projectedTotalCredits = round(input.existingCompletedCredits + totalSemesterCredits);
      output.projectedCumulativeGpa = round(
        (input.existingCumulativeGpa * input.existingCompletedCredits + qualityPoints) /
          output.projectedTotalCredits,
      );
    }
    return output;
  }
  validateOutput(value: unknown): GpaCalculatorOutput {
    const output = object(value);
    finite(output.semesterGpa, 'semesterGpa');
    finite(output.totalSemesterCredits, 'totalSemesterCredits');
    finite(output.qualityPoints, 'qualityPoints');
    finite(output.scale, 'scale');
    if (!Array.isArray(output.courses) || output.courses.length < 1)
      throw new Error('TOOL_OUTPUT_INVALID:courses');
    return value as GpaCalculatorOutput;
  }
}

export class UniversityComparisonHandler implements IStudentToolHandler<
  UniversityComparisonInput,
  UniversityComparisonOutput
> {
  readonly toolKey = 'university-comparison';
  readonly contract = STUDENT_TOOL_SCHEMAS['university-comparison'];
  readonly executionType = StudentToolExecutionType.DETERMINISTIC;
  constructor(private readonly universities: IUniversityComparisonGateway) {}
  validate(value: unknown): UniversityComparisonInput {
    const input = object(value);
    known(input, ['universityIds', 'hideUnavailableRows']);
    if (input.hideUnavailableRows != null && typeof input.hideUnavailableRows !== 'boolean') throw new Error('TOOL_INPUT_INVALID:hideUnavailableRows');
    if (!Array.isArray(input.universityIds)) throw new Error('TOOL_INPUT_INVALID:universityIds');
    const rawIds = input.universityIds.map((item) => (typeof item === 'string' ? item.trim() : ''));
    if (new Set(rawIds).size !== rawIds.length)
      throw new Error('TOOL_INPUT_INVALID:duplicateUniversityIds');
    const universityIds = strings(input.universityIds, 'universityIds', 4);
    if (universityIds.length < 2 || universityIds.length > 4)
      throw new Error('TOOL_INPUT_INVALID:universityIds');
    return { universityIds, hideUnavailableRows: input.hideUnavailableRows === true };
  }
  async execute(_context: StudentToolExecutionContext, input: UniversityComparisonInput) {
    const result = await this.universities.getUniversitiesByPublicIds(input.universityIds);
    return {
      universities: result.available,
      unavailableUniversityIds: result.unavailableIds,
      comparedCanonicalIds: result.available.map((item) => item.publicId),
    };
  }
  validateOutput(value: unknown): UniversityComparisonOutput {
    const output = object(value);
    if (!Array.isArray(output.universities) || !Array.isArray(output.unavailableUniversityIds))
      throw new Error('TOOL_OUTPUT_INVALID:universities');
    return value as UniversityComparisonOutput;
  }
}

export class MotivationLetterGeneratorHandler implements IStudentToolHandler<
  MotivationLetterInput,
  MotivationLetterOutput
> {
  readonly toolKey = 'motivation-letter-generator';
  readonly contract = STUDENT_TOOL_SCHEMAS['motivation-letter-generator'];
  readonly executionType = StudentToolExecutionType.AI_DELEGATED;
  constructor(private readonly ai: IEnterpriseAIConsumerGateway) {}
  validate(value: unknown): MotivationLetterInput {
    const input = object(value);
    known(input, ['target', 'studentBackground', 'motivation', 'outputPreferences']);
    const target = object(input.target);
    const background = object(input.studentBackground);
    const motivation = object(input.motivation);
    const preferences = object(input.outputPreferences);
    known(target, ['universityId', 'program', 'degreeLevel', 'country', 'applicationType']);
    known(background, ['education', 'academicInterests', 'experiences', 'achievements', 'skills']);
    known(motivation, [
      'whyField',
      'whyProgram',
      'careerGoals',
      'contribution',
      'emphasizedExperiences',
    ]);
    known(preferences, ['language', 'targetWords', 'tone', 'specialInstructions']);
    if (target.universityId != null) text(target.universityId, 'target.universityId', 1, 200);
    if (target.country != null) text(target.country, 'target.country', 0, 80);
    if (preferences.specialInstructions != null) text(preferences.specialInstructions, 'specialInstructions', 0, 1000);
    const language =
      preferences.language === 'en' ? 'en' : preferences.language === 'ar' ? 'ar' : null;
    const targetWords = (typeof preferences.targetWords === 'number' ? preferences.targetWords : NaN);
    if (
      !language ||
      !Number.isInteger(targetWords) ||
      targetWords < 250 ||
      targetWords > 1200 ||
      preferences.tone !== 'FORMAL'
    )
      throw new Error('TOOL_INPUT_INVALID:outputPreferences');
    return {
      target: {
        universityId: typeof target.universityId === 'string' ? target.universityId : undefined,
        program: text(target.program, 'target.program', 2, 200),
        degreeLevel: text(target.degreeLevel, 'target.degreeLevel', 2, 100),
        country: typeof target.country === 'string' ? target.country.trim() : undefined,
        applicationType: text(target.applicationType, 'target.applicationType', 2, 100),
      },
      studentBackground: {
        education: text(background.education, 'studentBackground.education', 10),
        academicInterests: strings(background.academicInterests, 'academicInterests'),
        experiences: strings(background.experiences, 'experiences'),
        achievements: strings(background.achievements, 'achievements'),
        skills: strings(background.skills, 'skills'),
      },
      motivation: {
        whyField: text(motivation.whyField, 'motivation.whyField', 10),
        whyProgram: text(motivation.whyProgram, 'motivation.whyProgram', 10),
        careerGoals: text(motivation.careerGoals, 'motivation.careerGoals', 10),
        contribution: text(motivation.contribution, 'motivation.contribution', 5),
        emphasizedExperiences: strings(motivation.emphasizedExperiences, 'emphasizedExperiences'),
      },
      outputPreferences: {
        language,
        targetWords,
        tone: 'FORMAL',
        specialInstructions:
          typeof preferences.specialInstructions === 'string'
            ? preferences.specialInstructions.slice(0, 1000)
            : undefined,
      },
    };
  }
  async execute(
    context: StudentToolExecutionContext,
    input: MotivationLetterInput,
  ): Promise<MotivationLetterOutput> {
    if (context.privacyConsent !== true) throw new Error('TOOL_PRIVACY_CONSENT_REQUIRED');
    const response = await this.ai.executeCapability<
      MotivationLetterInput,
      Omit<MotivationLetterOutput, 'aiExecutionId' | 'safetyStatus'>
    >({
      consumerKey:
        context.consumerType === 'ADMIN_TEST'
          ? 'phase18-student-tools-test'
          : context.consumerType === 'ANONYMOUS'
            ? 'phase18-student-tools-anonymous'
            : 'phase18-student-tools',
      requesterReferenceId:
        context.authenticatedStudentReference ?? context.anonymousSessionReference,
      privacyConsent: context.privacyConsent,
      capabilityKey: 'student-tools.motivation-letter.generate',
      correlationId: context.correlationId,
      locale: context.locale,
      dataClassification: 'PRIVATE_STUDENT_DATA',
      payload: input,
      idempotencyKey: context.executionId,
      outputSchema: {
        type: 'object',
        required: ['draft', 'warnings'],
        properties: { draft: { type: 'string' }, warnings: { type: 'array' } },
      },
    });
    if (response.status !== 'COMPLETED' || !response.result || !response.executionReference)
      throw new StudentToolAIExecutionError(
        response.status === 'BLOCKED'
          ? 'TOOL_EXECUTION_BLOCKED'
          : response.status === 'NOT_CONFIGURED'
            ? 'TOOL_AI_CAPABILITY_UNAVAILABLE'
            : 'TOOL_AI_UNKNOWN_OUTCOME',
        response.executionReference,
      );
    return {
      ...response.result,
      aiExecutionId: response.executionReference,
      safetyStatus: response.safetyStatus ?? 'ALLOWED',
    };
  }
  validateOutput(value: unknown): MotivationLetterOutput {
    const output = object(value);
    text(output.draft, 'draft', 1, 20_000);
    strings(output.warnings, 'warnings', 30);
    text(output.aiExecutionId, 'aiExecutionId', 1, 200);
    text(output.safetyStatus, 'safetyStatus', 1, 80);
    if (output.sections != null) {
      if (!Array.isArray(output.sections) || output.sections.length > 30)
        throw new Error('TOOL_OUTPUT_INVALID:sections');
      for (const section of output.sections) {
        const item = object(section);
        text(item.heading, 'sections.heading', 1, 200);
        text(item.content, 'sections.content', 1, 10_000);
      }
    }
    return value as MotivationLetterOutput;
  }
}

export class ScholarshipRecommendationHandler implements IStudentToolHandler<
  ScholarshipRecommendationInput,
  ScholarshipRecommendationOutput
> {
  readonly toolKey = 'scholarship-recommendation';
  readonly contract = STUDENT_TOOL_SCHEMAS['scholarship-recommendation'];
  readonly executionType = StudentToolExecutionType.HYBRID;
  constructor(
    private readonly scholarships: IScholarshipRecommendationGateway,
    private readonly ai: IEnterpriseAIConsumerGateway,
    private readonly studentContext: IStudentContextGateway,
  ) {}
  validate(value: unknown): ScholarshipRecommendationInput {
    const input = object(value);
    known(input, [
      'targetDegree',
      'studyField',
      'preferredCountries',
      'fundingPreference',
      'studyLanguage',
      'targetYear',
      'academicInterests',
      'careerGoals',
      'useProfile',
      'allowAI',
    ]);
    for (const key of ['targetDegree', 'studyField', 'studyLanguage', 'careerGoals'])
      if (input[key] != null) text(input[key], key, 0, key === 'careerGoals' ? 1000 : 200);
    for (const key of ['useProfile', 'allowAI'])
      if (input[key] != null && typeof input[key] !== 'boolean')
        throw new Error('TOOL_INPUT_INVALID');
    if (input.fundingPreference != null && !['FULL', 'PARTIAL', 'ANY'].includes(String(input.fundingPreference))) throw new Error('TOOL_INPUT_INVALID:fundingPreference');
    const fundingPreference =
      typeof input.fundingPreference === 'string' &&
      ['FULL', 'PARTIAL', 'ANY'].includes(input.fundingPreference)
        ? (input.fundingPreference as 'FULL' | 'PARTIAL' | 'ANY')
        : 'ANY';
    const targetYear = input.targetYear == null ? undefined : (typeof input.targetYear === 'number' ? input.targetYear : NaN);
    if (targetYear != null && (!Number.isInteger(targetYear) || targetYear < 2020 || targetYear > 2100))
      throw new Error('TOOL_INPUT_INVALID:targetYear');
    return {
      useProfile: input.useProfile === true,
      allowAI: input.allowAI === true,
      targetDegree: typeof input.targetDegree === 'string' ? input.targetDegree.trim() : undefined,
      studyField: typeof input.studyField === 'string' ? input.studyField.trim() : undefined,
      preferredCountries: strings(input.preferredCountries ?? [], 'preferredCountries', 10),
      fundingPreference,
      studyLanguage:
        typeof input.studyLanguage === 'string' ? input.studyLanguage.trim() : undefined,
      targetYear,
      academicInterests: strings(input.academicInterests ?? [], 'academicInterests'),
      careerGoals:
        typeof input.careerGoals === 'string' ? input.careerGoals.slice(0, 1000) : undefined,
    };
  }
  async execute(
    context: StudentToolExecutionContext,
    input: ScholarshipRecommendationInput,
  ): Promise<ScholarshipRecommendationOutput> {
    const privateContext =
      input.useProfile === true &&
      context.privacyConsent === true &&
      context.consumerType !== 'ADMIN_TEST' &&
      context.authenticatedStudentReference
        ? await this.studentContext.getMinimalContext(context.authenticatedStudentReference)
        : null;
    const effectiveInput: ScholarshipRecommendationInput = {
      ...input,
      targetDegree: input.targetDegree || privateContext?.targetDegree,
      academicInterests: input.academicInterests?.length ? input.academicInterests : (privateContext?.interests ?? []),
    };
    const candidates = (
      await this.scholarships.findPublishedCandidates({
        countries: effectiveInput.preferredCountries,
        targetDegree: effectiveInput.targetDegree,
        fundingPreference: effectiveInput.fundingPreference,
        studyLanguage: effectiveInput.studyLanguage,
      })
    ).slice(0, 25);
    const fallback = candidates.map((scholarship) => ({
      scholarship,
      constraintSummary: [
        effectiveInput.targetDegree ? `degree:${effectiveInput.targetDegree}` : 'degree:any',
        effectiveInput.fundingPreference
          ? `funding:${effectiveInput.fundingPreference}`
          : 'funding:any',
      ],
    }));
    if (!candidates.length)
      return {
        mode: 'DETERMINISTIC_FALLBACK',
        recommendations: [],
        disclaimer:
          context.locale === 'en'
            ? 'Advisory matches use currently published scholarships only.'
            : 'النتائج إرشادية وتعتمد فقط على المنح المنشورة حاليًا.',
      };
    if (input.allowAI !== true || context.privacyConsent !== true)
      return {
        mode: 'DETERMINISTIC_FALLBACK',
        recommendations: fallback,
        fallbackReason: 'MANUAL_ONLY',
        disclaimer:
          context.locale === 'en'
            ? 'Matches use published scholarships only. No private preferences were sent to AI.'
            : 'مطابقة المنح المنشورة فقط؛ لم ترسل تفضيلاتك الخاصة إلى الذكاء الاصطناعي.',
      };
    const response = await this.ai.executeCapability<
      {
        preferences: ScholarshipRecommendationInput;
        candidates: Array<{ publicId: string; displayName: string; country?: string | null; degreeLevels: string[]; fundingType?: string | null }>;
      },
      { rankings: Array<{ publicId: string; explanation: string }> }
    >({
      consumerKey:
        context.consumerType === 'ADMIN_TEST'
          ? 'phase18-student-tools-test'
          : context.consumerType === 'ANONYMOUS'
            ? 'phase18-student-tools-anonymous'
            : 'phase18-student-tools',
      requesterReferenceId:
        context.authenticatedStudentReference ?? context.anonymousSessionReference,
      privacyConsent: context.privacyConsent,
      capabilityKey: 'student-tools.scholarship-recommendation.rank',
      correlationId: context.correlationId,
      locale: context.locale,
      dataClassification: 'PRIVATE_STUDENT_DATA',
      payload: {
        preferences: effectiveInput,
        candidates: candidates.map(({ publicId, displayName, country, degreeLevels, fundingType }) => ({ publicId, displayName, country, degreeLevels, fundingType })),
      },
      idempotencyKey: context.executionId,
      outputSchema: {
        type: 'object',
        required: ['rankings'],
        additionalProperties: false,
        properties: {
          rankings: {
            type: 'array',
            minItems: candidates.length,
            maxItems: candidates.length,
            items: {
              type: 'object',
              required: ['publicId', 'explanation'],
              additionalProperties: false,
              properties: {
                publicId: { type: 'string', enum: candidates.map((item) => item.publicId) },
                explanation: { type: 'string', maxLength: 2000 },
              },
            },
          },
        },
      },
    });
    if (response.status === 'BLOCKED') throw new StudentToolAIExecutionError('TOOL_EXECUTION_BLOCKED', response.executionReference);
    if (response.status === 'FAILED') throw new StudentToolAIExecutionError('TOOL_AI_UNKNOWN_OUTCOME', response.executionReference);
    if (response.status !== 'COMPLETED' || !response.result)
      return {
        mode: 'DETERMINISTIC_FALLBACK',
        recommendations: fallback,
        fallbackReason: 'AI_NOT_CONFIGURED',
        disclaimer:
          context.locale === 'en'
            ? 'Showing direct matches because private AI ranking is unavailable.'
            : 'الترتيب احتياطي ويعتمد على المطابقة المباشرة لأن خدمة التحليل الذكي غير مهيأة.',
      };
    const byId = new Map(candidates.map((item) => [item.publicId, item]));
    const rankings = response.result.rankings;
    if (
      !Array.isArray(rankings) ||
      rankings.length !== candidates.length ||
      new Set(rankings.map((item) => item?.publicId)).size !== candidates.length ||
      rankings.some(
        (item) =>
          !item ||
          !byId.has(item.publicId) ||
          typeof item.explanation !== 'string' ||
          item.explanation.length > 2000,
      )
    ) {
      return {
        mode: 'DETERMINISTIC_FALLBACK',
        recommendations: fallback,
        fallbackReason: 'AI_RANKING_INVALID',
        aiExecutionId: response.executionReference,
        disclaimer:
          context.locale === 'en'
            ? 'AI ranking could not be verified; showing direct matches.'
            : 'تعذر التحقق من ترتيب الذكاء الاصطناعي؛ تعرض المطابقات المباشرة.',
      };
    }
    const recommendations = rankings
      .filter((item) => byId.has(item.publicId))
      .map((item) => ({
        scholarship: byId.get(item.publicId)!,
        explanation: item.explanation,
        constraintSummary:
          fallback.find((entry) => entry.scholarship.publicId === item.publicId)
            ?.constraintSummary ?? [],
      }));
    if (!recommendations.length)
      return {
        mode: 'DETERMINISTIC_FALLBACK',
        recommendations: fallback,
        disclaimer:
          context.locale === 'en'
            ? 'Unverified AI ranking; showing direct matches only.'
            : 'تعذر التحقق من ترتيب التحليل الذكي؛ عُرضت المطابقة المباشرة فقط.',
      };
    return {
      mode: 'AI_ADVISORY',
      recommendations,
      disclaimer:
        context.locale === 'en'
          ? 'Advisory recommendations do not guarantee admission or funding.'
          : 'هذه توصيات إرشادية وليست قرار قبول أو ضمان تمويل.',
      aiExecutionId: response.executionReference,
    };
  }
  validateOutput(value: unknown): ScholarshipRecommendationOutput {
    const output = object(value);
    if (!['AI_ADVISORY', 'DETERMINISTIC_FALLBACK'].includes(String(output.mode)))
      throw new Error('TOOL_OUTPUT_INVALID:mode');
    if (!Array.isArray(output.recommendations) || output.recommendations.length > 25)
      throw new Error('TOOL_OUTPUT_INVALID:recommendations');
    text(output.disclaimer, 'disclaimer', 1, 2000);
    return value as ScholarshipRecommendationOutput;
  }
}
