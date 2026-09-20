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
  StudentToolExecutionType,
  UniversityComparisonInput,
  UniversityComparisonOutput,
} from '@manaratak/domain';

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
  readonly executionType = StudentToolExecutionType.DETERMINISTIC;
  validate(value: unknown): GpaCalculatorInput {
    const input = object(value);
    const scale = Number(input.scale);
    if (!Number.isFinite(scale) || scale < 1 || scale > 10)
      throw new Error('TOOL_INPUT_INVALID:scale');
    if (!Array.isArray(input.courses) || input.courses.length < 1 || input.courses.length > 50)
      throw new Error('TOOL_INPUT_INVALID:courses');
    const courses = input.courses.map((raw: unknown, index: number) => {
      const course = object(raw);
      const creditHours = Number(course.creditHours);
      const gradePoints = Number(course.gradePoints);
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
      input.existingCumulativeGpa == null ? undefined : Number(input.existingCumulativeGpa);
    const existingCompletedCredits =
      input.existingCompletedCredits == null ? undefined : Number(input.existingCompletedCredits);
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
  readonly executionType = StudentToolExecutionType.DETERMINISTIC;
  constructor(private readonly universities: IUniversityComparisonGateway) {}
  validate(value: unknown): UniversityComparisonInput {
    const input = object(value);
    if (!Array.isArray(input.universityIds))
      throw new Error('TOOL_INPUT_INVALID:universityIds');
    const rawIds = input.universityIds.map((item) =>
      typeof item === 'string' ? item.trim() : '',
    );
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
  readonly executionType = StudentToolExecutionType.AI_DELEGATED;
  constructor(private readonly ai: IEnterpriseAIConsumerGateway) {}
  validate(value: unknown): MotivationLetterInput {
    const input = object(value);
    const target = object(input.target);
    const background = object(input.studentBackground);
    const motivation = object(input.motivation);
    const preferences = object(input.outputPreferences);
    const language =
      preferences.language === 'en' ? 'en' : preferences.language === 'ar' ? 'ar' : null;
    const targetWords = Number(preferences.targetWords);
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
    const response = await this.ai.executeCapability<
      MotivationLetterInput,
      Omit<MotivationLetterOutput, 'aiExecutionId' | 'safetyStatus'>
    >({
      consumerKey: 'phase18-student-tools',
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
      throw new Error(
        response.status === 'NOT_CONFIGURED'
          ? 'TOOL_AI_CAPABILITY_UNAVAILABLE'
          : (response.errorCode ?? 'TOOL_EXECUTION_FAILED'),
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
  readonly executionType = StudentToolExecutionType.HYBRID;
  constructor(
    private readonly scholarships: IScholarshipRecommendationGateway,
    private readonly ai: IEnterpriseAIConsumerGateway,
    private readonly studentContext: IStudentContextGateway,
  ) {}
  validate(value: unknown): ScholarshipRecommendationInput {
    const input = object(value);
    const fundingPreference =
      typeof input.fundingPreference === 'string' &&
      ['FULL', 'PARTIAL', 'ANY'].includes(input.fundingPreference)
        ? (input.fundingPreference as 'FULL' | 'PARTIAL' | 'ANY')
        : 'ANY';
    const targetYear = input.targetYear == null ? undefined : Number(input.targetYear);
    if (targetYear != null && (!Number.isInteger(targetYear) || targetYear < 2020 || targetYear > 2100))
      throw new Error('TOOL_INPUT_INVALID:targetYear');
    return {
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
    const privateContext = context.authenticatedStudentReference
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
        effectiveInput.fundingPreference ? `funding:${effectiveInput.fundingPreference}` : 'funding:any',
      ],
    }));
    if (!candidates.length)
      return {
        mode: 'DETERMINISTIC_FALLBACK',
        recommendations: [],
        disclaimer: 'النتائج إرشادية وتعتمد فقط على المنح المنشورة حاليًا.',
      };
    const response = await this.ai.executeCapability<
      {
        preferences: ScholarshipRecommendationInput;
        candidates: Array<{ publicId: string; displayName: string; country?: string | null; degreeLevels: string[]; fundingType?: string | null }>;
      },
      { rankings: Array<{ publicId: string; explanation: string }> }
    >({
      consumerKey: 'phase18-student-tools',
      capabilityKey: 'student-tools.scholarship-recommendation.rank',
      correlationId: context.correlationId,
      locale: context.locale,
      dataClassification: 'CANONICAL_PUBLIC_DATA',
      payload: {
        preferences: effectiveInput,
        candidates: candidates.map(({ publicId, displayName, country, degreeLevels, fundingType }) => ({ publicId, displayName, country, degreeLevels, fundingType })),
      },
      idempotencyKey: context.executionId,
      outputSchema: {
        type: 'object',
        required: ['rankings'],
        properties: { rankings: { type: 'array' } },
      },
    });
    if (response.status !== 'COMPLETED' || !response.result)
      return {
        mode: 'DETERMINISTIC_FALLBACK',
        recommendations: fallback,
        disclaimer:
          'الترتيب احتياطي ويعتمد على المطابقة المباشرة لأن خدمة التحليل الذكي غير مهيأة.',
      };
    const byId = new Map(candidates.map((item) => [item.publicId, item]));
    const rankings = Array.isArray(response.result.rankings)
      ? response.result.rankings.filter(
          (item) =>
            item &&
            typeof item.publicId === 'string' &&
            typeof item.explanation === 'string' &&
            item.explanation.length <= 2_000,
        )
      : [];
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
        disclaimer: 'تعذر التحقق من ترتيب التحليل الذكي؛ عُرضت المطابقة المباشرة فقط.',
      };
    return {
      mode: 'AI_ADVISORY',
      recommendations,
      disclaimer: 'هذه توصيات إرشادية وليست قرار قبول أو ضمان تمويل.',
      aiExecutionId: response.executionReference,
    };
  }
  validateOutput(value: unknown): ScholarshipRecommendationOutput {
    const output = object(value);
    if (!['AI_ADVISORY', 'DETERMINISTIC_FALLBACK'].includes(String(output.mode)))
      throw new Error('TOOL_OUTPUT_INVALID:mode');
    if (!Array.isArray(output.recommendations))
      throw new Error('TOOL_OUTPUT_INVALID:recommendations');
    text(output.disclaimer, 'disclaimer', 1, 2000);
    return value as ScholarshipRecommendationOutput;
  }
}
