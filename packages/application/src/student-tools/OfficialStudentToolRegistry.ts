import {
  StudentToolDefinition,
  StudentToolExecutionType,
  StudentToolImplementationPriority,
  StudentToolImplementationStatus,
  StudentToolLifecycleStatus,
  StudentToolVisibilityStatus,
} from '@manaratak/domain';

const NAMES = [
  'Personal Statement Generator',
  'Personal Statement Reviewer',
  'Motivation Letter Generator',
  'Motivation Letter Reviewer',
  'Recommendation Letter Generator',
  'Recommendation Letter Reviewer',
  'Scholarship Essay Generator',
  'Scholarship Essay Reviewer',
  'Research Proposal Generator',
  'Research Proposal Reviewer',
  'CV Builder',
  'CV Analyzer',
  'CV Reviewer',
  'Academic Translator',
  'Academic Proofreader',
  'Grammar Assistant',
  'Academic Writing Assistant',
  'Email Generator',
  'Email Improver',
  'Career Advisor',
  'Major Advisor',
  'University Advisor',
  'Scholarship Advisor',
  'Interview Coach',
  'Interview Simulator',
  'Research Assistant',
  'Study Strategy Generator',
  'Study Planner',
  'Deadline Tracker',
  'Timeline Planner',
  'Semester Planner',
  'GPA Calculator',
  'GPA Planner',
  'Graduation GPA Predictor',
  'Grade Converter',
  'Credit Hour Calculator',
  'Admission Chance Calculator',
  'Eligibility Checker',
  'Application Readiness Score',
  'Required Documents Checklist',
  'Document Validator',
  'University Comparison',
  'University Finder',
  'University Recommendation',
  'Scholarship Comparison',
  'Scholarship Recommendation',
  'Country Comparison',
  'Country Recommendation',
  'Living Cost Comparison',
  'Tuition Comparison',
  'Major Recommendation',
  'Career Recommendation',
  'Currency Converter',
  'Tuition Calculator',
  'Living Cost Calculator',
  'Budget Planner',
  'ROI Calculator',
  'Visa Requirement Checker',
  'Country Study Readiness Checklist',
  'Study Abroad Budget Estimator',
  'Travel Preparation Checklist',
  'Work While Studying Checker',
  'Scholarship Name Cleaner',
  'Scholarship Duplicate Detector',
  'University Duplicate Detector',
  'Major Matching Tool',
  'Major Skill Fit Checker',
  'University Admission Requirement Matcher',
  'Course Path Builder',
  'Free Course Certificate Checker',
  'Course Language Filter Assistant',
  'Learning Goal Planner',
  'Document Completeness Checker',
  'Application Package Builder',
  'Translation Quality Checker',
  'Interview Question Generator',
  'Scholarship Import Completeness Checker',
  'University Import Completeness Checker',
  'Major Import Completeness Checker',
  'Course Import Completeness Checker',
  'Imported Record Deduplication Reviewer',
  'Missing Data Fetch Assistant',
  'Source Trust Score Reviewer',
] as const;

const ACTIVE: Record<
  string,
  {
    ar: string;
    descriptionAr: string;
    type: StudentToolExecutionType;
    capability?: StudentToolDefinition['aiCapabilityKey'];
    dependencies: StudentToolDefinition['dependencies'];
  }
> = {
  'gpa-calculator': {
    ar: 'حاسبة المعدل التراكمي',
    descriptionAr: 'احسب معدل الفصل وتوقّع معدلك التراكمي بدقة.',
    type: StudentToolExecutionType.DETERMINISTIC,
    dependencies: [],
  },
  'university-comparison': {
    ar: 'مقارنة الجامعات',
    descriptionAr: 'قارن بيانات الجامعات المنشورة من المصدر الرسمي للمنصة.',
    type: StudentToolExecutionType.DETERMINISTIC,
    dependencies: [
      {
        phase: 'PHASE_11',
        type: 'DATA',
        required: true,
        description: 'Canonical published universities',
      },
    ],
  },
  'motivation-letter-generator': {
    ar: 'منشئ خطاب الدافع',
    descriptionAr: 'أنشئ مسودة منظمة وآمنة قابلة للمراجعة والتخصيص.',
    type: StudentToolExecutionType.AI_DELEGATED,
    capability: 'student-tools.motivation-letter.generate',
    dependencies: [
      {
        phase: 'PHASE_17',
        type: 'EXECUTION',
        required: true,
        capabilityKey: 'student-tools.motivation-letter.generate',
        description: 'Enterprise AI consumer capability',
      },
    ],
  },
  'scholarship-recommendation': {
    ar: 'توصية المنح',
    descriptionAr: 'رتّب المنح المنشورة الملائمة لأهدافك مع تفسير واضح.',
    type: StudentToolExecutionType.HYBRID,
    capability: 'student-tools.scholarship-recommendation.rank',
    dependencies: [
      {
        phase: 'PHASE_12',
        type: 'DATA',
        required: true,
        description: 'Canonical published scholarships',
      },
      {
        phase: 'PHASE_17',
        type: 'EXECUTION',
        required: false,
        capabilityKey: 'student-tools.scholarship-recommendation.rank',
        description: 'Optional advisory ranking',
      },
    ],
  },
};

const SCHEMAS: Record<
  string,
  Pick<StudentToolDefinition, 'inputSchema' | 'outputSchema'>
> = {
  'gpa-calculator': {
    inputSchema: { version: '1', fields: [
      { key: 'scale', type: 'number', required: true, labelAr: 'سلم المعدل', labelEn: 'GPA scale', constraints: { min: 1, max: 10 } },
      { key: 'courses', type: 'array', required: true, labelAr: 'المقررات', labelEn: 'Courses', constraints: { minItems: 1, maxItems: 50 } },
      { key: 'existingCumulativeGpa', type: 'number', required: false, labelAr: 'المعدل التراكمي الحالي', labelEn: 'Existing cumulative GPA' },
      { key: 'existingCompletedCredits', type: 'number', required: false, labelAr: 'الساعات المكتملة', labelEn: 'Completed credits' },
    ] },
    outputSchema: { version: '1', fields: [
      { key: 'semesterGpa', type: 'number', required: true, labelAr: 'معدل الفصل', labelEn: 'Semester GPA' },
      { key: 'projectedCumulativeGpa', type: 'number', required: false, labelAr: 'المعدل المتوقع', labelEn: 'Projected cumulative GPA' },
      { key: 'courses', type: 'array', required: true, labelAr: 'تفاصيل المقررات', labelEn: 'Course breakdown' },
    ] },
  },
  'university-comparison': {
    inputSchema: { version: '1', fields: [
      { key: 'universityIds', type: 'array', required: true, labelAr: 'معرفات الجامعات المنشورة', labelEn: 'Published university IDs', constraints: { minItems: 2, maxItems: 4, unique: true } },
    ] },
    outputSchema: { version: '1', fields: [
      { key: 'universities', type: 'array', required: true, labelAr: 'الجامعات المتاحة', labelEn: 'Available universities' },
      { key: 'unavailableUniversityIds', type: 'array', required: true, labelAr: 'غير المتاح', labelEn: 'Unavailable IDs' },
    ] },
  },
  'motivation-letter-generator': {
    inputSchema: { version: '1', fields: [
      { key: 'target', type: 'object', required: true, labelAr: 'الجهة والبرنامج المستهدف', labelEn: 'Target' },
      { key: 'studentBackground', type: 'object', required: true, labelAr: 'الخلفية الدراسية', labelEn: 'Student background' },
      { key: 'motivation', type: 'object', required: true, labelAr: 'الدوافع والأهداف', labelEn: 'Motivation' },
      { key: 'outputPreferences', type: 'object', required: true, labelAr: 'تفضيلات المسودة', labelEn: 'Output preferences' },
    ] },
    outputSchema: { version: '1', fields: [
      { key: 'draft', type: 'string', required: true, labelAr: 'المسودة', labelEn: 'Draft' },
      { key: 'warnings', type: 'array', required: true, labelAr: 'التنبيهات', labelEn: 'Warnings' },
      { key: 'aiExecutionId', type: 'string', required: true, labelAr: 'مرجع تنفيذ Phase 17', labelEn: 'Phase 17 execution reference' },
    ] },
  },
  'scholarship-recommendation': {
    inputSchema: { version: '1', fields: [
      { key: 'targetDegree', type: 'string', required: false, labelAr: 'الدرجة المستهدفة', labelEn: 'Target degree' },
      { key: 'preferredCountries', type: 'array', required: true, labelAr: 'الدول المفضلة', labelEn: 'Preferred countries' },
      { key: 'fundingPreference', type: 'string', required: false, labelAr: 'تفضيل التمويل', labelEn: 'Funding preference' },
    ] },
    outputSchema: { version: '1', fields: [
      { key: 'mode', type: 'string', required: true, labelAr: 'نوع الترتيب', labelEn: 'Ranking mode' },
      { key: 'recommendations', type: 'array', required: true, labelAr: 'المنح الموصى بها', labelEn: 'Recommendations' },
      { key: 'disclaimer', type: 'string', required: true, labelAr: 'إخلاء المسؤولية', labelEn: 'Disclaimer' },
    ] },
  },
};

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
function category(name: string) {
  if (/GPA|Grade|Credit/.test(name)) return 'ACADEMIC_CALCULATORS';
  if (/University/.test(name)) return 'UNIVERSITIES';
  if (/Scholarship/.test(name)) return 'SCHOLARSHIPS';
  if (
    /CV|Letter|Statement|Essay|Proposal|Document|Translator|Proofreader|Grammar|Writing|Email|Translation/.test(
      name,
    )
  )
    return 'DOCUMENTS_AND_WRITING';
  if (/Cost|Tuition|Budget|Currency|ROI/.test(name)) return 'FINANCIAL_PLANNING';
  if (/Import|Duplicate|Source|Missing Data/.test(name)) return 'ADMIN_DATA_QUALITY';
  return 'STUDENT_PLANNING';
}

export const OFFICIAL_STUDENT_TOOL_COUNT = 83;
export const IMPLEMENTED_STUDENT_TOOL_KEYS = Object.freeze(Object.keys(ACTIVE));

export const OFFICIAL_STUDENT_TOOLS: StudentToolDefinition[] = NAMES.map((name, index) => {
  const toolKey = slugify(name);
  const active = ACTIVE[toolKey];
  const adminOnly = category(name) === 'ADMIN_DATA_QUALITY';
  return {
    toolKey,
    nameAr: active?.ar ?? name,
    nameEn: name,
    descriptionAr: active?.descriptionAr ?? `أداة ${name} ضمن خارطة تطوير أدوات الطلاب.`,
    descriptionEn: active
      ? `Production-ready ${name} for the student platform.`
      : `${name} is registered in the official product roadmap.`,
    category: category(name),
    executionType:
      active?.type ??
      (adminOnly
        ? StudentToolExecutionType.ADMIN_INTERNAL
        : StudentToolExecutionType.DETERMINISTIC),
    implementationPriority: active
      ? StudentToolImplementationPriority.P1_CORE_LAUNCH
      : index < 40
        ? StudentToolImplementationPriority.P2_EXPANSION
        : StudentToolImplementationPriority.P3_LATER,
    desiredLaunchVisibility: active
      ? StudentToolVisibilityStatus.ACTIVE
      : adminOnly
        ? StudentToolVisibilityStatus.HIDDEN_ADMIN_ONLY
        : StudentToolVisibilityStatus.COMING_SOON,
    visibility: active
      ? StudentToolVisibilityStatus.ACTIVE
      : adminOnly
        ? StudentToolVisibilityStatus.HIDDEN_ADMIN_ONLY
        : StudentToolVisibilityStatus.COMING_SOON,
    implementationStatus: active
      ? StudentToolImplementationStatus.IMPLEMENTED
      : StudentToolImplementationStatus.PLANNED,
    lifecycle: active ? StudentToolLifecycleStatus.ACTIVE : StudentToolLifecycleStatus.DRAFT,
    availability: {
      publicEnabled: !adminOnly,
      anonymousEnabled: !!active && toolKey !== 'motivation-letter-generator',
      authenticatedEnabled: !!active,
      adminOnly,
      allowedLocales: ['ar', 'en'],
      allowedRegions: [],
      maintenanceMode: false,
    },
    featureFlags: {
      globallyEnabled: !!active,
      anonymousEnabled: !!active && toolKey !== 'motivation-letter-generator',
      authenticatedEnabled: !!active,
      maintenanceMode: false,
    },
    rateLimitPolicy: {
      anonymousRequestsPerMinute: active?.type === StudentToolExecutionType.AI_DELEGATED ? 2 : 10,
      authenticatedRequestsPerMinute:
        active?.type === StudentToolExecutionType.AI_DELEGATED || active?.type === StudentToolExecutionType.HYBRID
          ? 6
          : 30,
      adminTestRequestsPerMinute: 5,
    },
    aiCapabilityKey: active?.capability ?? null,
    outputType: active ? 'STRUCTURED_RESULT' : 'NOT_AVAILABLE',
    supportedLocales: ['ar', 'en'],
    estimatedMinutes: active ? 5 : 0,
    tags: [category(name).toLowerCase()],
    iconAssetId: null,
    dependencies: active?.dependencies ?? [],
    currentVersion: {
      semanticVersion: active ? '1.0.0' : '0.0.0',
      inputSchemaVersion: '1',
      outputSchemaVersion: '1',
      releaseDate: new Date('2026-08-24T00:00:00.000Z'),
      changeNote: active ? 'Phase 18 source implementation' : 'Official roadmap registration',
      status: active ? 'ACTIVE' : 'DRAFT',
    },
    inputSchema: SCHEMAS[toolKey]?.inputSchema ?? { version: '1', fields: [] },
    outputSchema: SCHEMAS[toolKey]?.outputSchema ?? { version: '1', fields: [] },
    owner: 'Phase18StudentTools',
    launchOrder: index + 1,
  };
});

if (
  OFFICIAL_STUDENT_TOOLS.length !== OFFICIAL_STUDENT_TOOL_COUNT ||
  IMPLEMENTED_STUDENT_TOOL_KEYS.length !== 4
)
  throw new Error('INVALID_OFFICIAL_STUDENT_TOOL_REGISTRY');
