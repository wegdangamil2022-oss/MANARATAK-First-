import { StudentToolDefinition } from '@manaratak/domain';
export const STUDENT_TOOL_SCHEMAS: Record<
  string,
  Pick<StudentToolDefinition, 'inputSchema' | 'outputSchema'>
> = {
  'gpa-calculator': {
    inputSchema: {
      version: '2',
      fields: [
        {
          key: 'scale',
          type: 'number',
          required: true,
          labelAr: 'سلم المعدل',
          labelEn: 'GPA scale',
          constraints: { min: 1, max: 10 },
        },
        {
          key: 'courses',
          type: 'array',
          required: true,
          labelAr: 'المقررات',
          labelEn: 'Courses',
          constraints: { minItems: 1, maxItems: 50 },
        },
        {
          key: 'existingCumulativeGpa',
          type: 'number',
          required: false,
          labelAr: 'المعدل التراكمي الحالي',
          labelEn: 'Existing cumulative GPA',
        },
        {
          key: 'existingCompletedCredits',
          type: 'number',
          required: false,
          labelAr: 'الساعات المكتملة',
          labelEn: 'Completed credits',
        },
      ],
    },
    outputSchema: {
      version: '2',
      fields: [
        {
          key: 'semesterGpa',
          type: 'number',
          required: true,
          labelAr: 'معدل الفصل',
          labelEn: 'Semester GPA',
        },
        {
          key: 'projectedCumulativeGpa',
          type: 'number',
          required: false,
          labelAr: 'المعدل المتوقع',
          labelEn: 'Projected cumulative GPA',
        },
        {
          key: 'courses',
          type: 'array',
          required: true,
          labelAr: 'تفاصيل المقررات',
          labelEn: 'Course breakdown',
        },
        {
          key: 'totalSemesterCredits',
          type: 'number',
          required: true,
          labelAr: 'ساعات الفصل',
          labelEn: 'Semester credits',
        },
        {
          key: 'qualityPoints',
          type: 'number',
          required: true,
          labelAr: 'النقاط',
          labelEn: 'Quality points',
        },
        {
          key: 'scale',
          type: 'number',
          required: true,
          labelAr: 'سلم المعدل',
          labelEn: 'GPA scale',
        },
        {
          key: 'projectedTotalCredits',
          type: 'number',
          required: false,
          labelAr: 'الساعات المتوقعة',
          labelEn: 'Projected credits',
        },
      ],
    },
  },
  'university-comparison': {
    inputSchema: {
      version: '2',
      fields: [
        {
          key: 'universityIds',
          type: 'array',
          required: true,
          labelAr: 'معرفات الجامعات المنشورة',
          labelEn: 'Published university IDs',
          constraints: { minItems: 2, maxItems: 4, unique: true },
        },
        {
          key: 'hideUnavailableRows',
          type: 'boolean',
          required: false,
          labelAr: 'إخفاء غير المتاح',
          labelEn: 'Hide unavailable rows',
        },
      ],
    },
    outputSchema: {
      version: '2',
      fields: [
        {
          key: 'comparedCanonicalIds',
          type: 'array',
          required: true,
          labelAr: 'المعرفات المقارنة',
          labelEn: 'Compared IDs',
        },
        {
          key: 'universities',
          type: 'array',
          required: true,
          labelAr: 'الجامعات المتاحة',
          labelEn: 'Available universities',
        },
        {
          key: 'unavailableUniversityIds',
          type: 'array',
          required: true,
          labelAr: 'غير المتاح',
          labelEn: 'Unavailable IDs',
        },
      ],
    },
  },
  'motivation-letter-generator': {
    inputSchema: {
      version: '2',
      fields: [
        {
          key: 'target',
          type: 'object',
          required: true,
          labelAr: 'الجهة والبرنامج المستهدف',
          labelEn: 'Target',
        },
        {
          key: 'studentBackground',
          type: 'object',
          required: true,
          labelAr: 'الخلفية الدراسية',
          labelEn: 'Student background',
        },
        {
          key: 'motivation',
          type: 'object',
          required: true,
          labelAr: 'الدوافع والأهداف',
          labelEn: 'Motivation',
        },
        {
          key: 'outputPreferences',
          type: 'object',
          required: true,
          labelAr: 'تفضيلات المسودة',
          labelEn: 'Output preferences',
        },
      ],
    },
    outputSchema: {
      version: '2',
      fields: [
        {
          key: 'safetyStatus',
          type: 'string',
          required: true,
          labelAr: 'حالة الأمان',
          labelEn: 'Safety status',
        },
        {
          key: 'sections',
          type: 'array',
          required: false,
          labelAr: 'الأقسام',
          labelEn: 'Sections',
        },
        { key: 'draft', type: 'string', required: true, labelAr: 'المسودة', labelEn: 'Draft' },
        {
          key: 'warnings',
          type: 'array',
          required: true,
          labelAr: 'التنبيهات',
          labelEn: 'Warnings',
        },
        {
          key: 'aiExecutionId',
          type: 'string',
          required: true,
          labelAr: 'مرجع تنفيذ Phase 17',
          labelEn: 'Phase 17 execution reference',
        },
      ],
    },
  },
  'scholarship-recommendation': {
    inputSchema: {
      version: '2',
      fields: [
        {
          key: 'studyField',
          type: 'string',
          required: false,
          labelAr: 'مجال الدراسة',
          labelEn: 'Study field',
        },
        {
          key: 'studyLanguage',
          type: 'string',
          required: false,
          labelAr: 'لغة الدراسة',
          labelEn: 'Study language',
        },
        {
          key: 'targetYear',
          type: 'number',
          required: false,
          labelAr: 'سنة الدراسة',
          labelEn: 'Target year',
        },
        {
          key: 'academicInterests',
          type: 'array',
          required: false,
          labelAr: 'الاهتمامات الدراسية',
          labelEn: 'Academic interests',
        },
        {
          key: 'careerGoals',
          type: 'string',
          required: false,
          labelAr: 'الأهداف المهنية',
          labelEn: 'Career goals',
        },
        {
          key: 'useProfile',
          type: 'boolean',
          required: false,
          labelAr: 'استخدام التفضيلات المحفوظة',
          labelEn: 'Use saved preferences',
        },
        {
          key: 'allowAI',
          type: 'boolean',
          required: false,
          labelAr: 'الترتيب الذكي',
          labelEn: 'AI ranking',
        },
        {
          key: 'targetDegree',
          type: 'string',
          required: false,
          labelAr: 'الدرجة المستهدفة',
          labelEn: 'Target degree',
        },
        {
          key: 'preferredCountries',
          type: 'array',
          required: false,
          labelAr: 'الدول المفضلة',
          labelEn: 'Preferred countries',
        },
        {
          key: 'fundingPreference',
          type: 'string',
          required: false,
          labelAr: 'تفضيل التمويل',
          labelEn: 'Funding preference',
        },
      ],
    },
    outputSchema: {
      version: '2',
      fields: [
        {
          key: 'aiExecutionId',
          type: 'string',
          required: false,
          labelAr: 'مرجع الذكاء الاصطناعي',
          labelEn: 'AI execution reference',
        },
        {
          key: 'fallbackReason',
          type: 'string',
          required: false,
          labelAr: 'سبب المطابقة المباشرة',
          labelEn: 'Fallback reason',
        },
        {
          key: 'mode',
          type: 'string',
          required: true,
          labelAr: 'نوع الترتيب',
          labelEn: 'Ranking mode',
        },
        {
          key: 'recommendations',
          type: 'array',
          required: true,
          labelAr: 'المنح الموصى بها',
          labelEn: 'Recommendations',
        },
        {
          key: 'disclaimer',
          type: 'string',
          required: true,
          labelAr: 'إخلاء المسؤولية',
          labelEn: 'Disclaimer',
        },
      ],
    },
  },
};

// Handler-owned nested input contracts, stored in each immutable version snapshot.
const string = (minLength = 0, maxLength = 4000) => ({ type: 'string', minLength, maxLength });
const number = (minimum: number, maximum: number) => ({ type: 'number', minimum, maximum });
const array = (items: Record<string, unknown>, maxItems: number, minItems = 0) => ({
  type: 'array',
  items,
  minItems,
  maxItems,
});
const object = (properties: Record<string, unknown>, required: string[]) => ({
  type: 'object',
  additionalProperties: false,
  properties,
  required,
});
const course = object(
  {
    label: string(1, 120),
    creditHours: { ...number(0, 30), exclusiveMinimum: 0 },
    gradePoints: number(0, 10),
  },
  ['label', 'creditHours', 'gradePoints'],
);
STUDENT_TOOL_SCHEMAS['gpa-calculator'].inputSchema.jsonSchema = object(
  {
    scale: number(1, 10),
    courses: array(course, 50, 1),
    existingCumulativeGpa: number(0, 10),
    existingCompletedCredits: { ...number(0, 1000), exclusiveMinimum: 0 },
  },
  ['scale', 'courses'],
);
STUDENT_TOOL_SCHEMAS['university-comparison'].inputSchema.jsonSchema = object(
  {
    universityIds: { ...array(string(1, 20000), 4, 2), uniqueItems: true },
    hideUnavailableRows: { type: 'boolean' },
  },
  ['universityIds'],
);
const texts = array(string(0, 20000), 20);
STUDENT_TOOL_SCHEMAS['motivation-letter-generator'].inputSchema.jsonSchema = object(
  {
    target: object(
      {
        universityId: string(1, 200),
        program: string(2, 200),
        degreeLevel: string(2, 100),
        country: string(0, 80),
        applicationType: string(2, 100),
      },
      ['program', 'degreeLevel', 'applicationType'],
    ),
    studentBackground: object(
      {
        education: string(10),
        academicInterests: texts,
        experiences: texts,
        achievements: texts,
        skills: texts,
      },
      ['education', 'academicInterests', 'experiences', 'achievements', 'skills'],
    ),
    motivation: object(
      {
        whyField: string(10),
        whyProgram: string(10),
        careerGoals: string(10),
        contribution: string(5),
        emphasizedExperiences: texts,
      },
      ['whyField', 'whyProgram', 'careerGoals', 'contribution', 'emphasizedExperiences'],
    ),
    outputPreferences: object(
      {
        language: { enum: ['ar', 'en'] },
        targetWords: { ...number(250, 1200), type: 'integer' },
        tone: { const: 'FORMAL' },
        specialInstructions: string(0, 1000),
      },
      ['language', 'targetWords', 'tone'],
    ),
  },
  ['target', 'studentBackground', 'motivation', 'outputPreferences'],
);
STUDENT_TOOL_SCHEMAS['scholarship-recommendation'].inputSchema.jsonSchema = object(
  {
    targetDegree: string(0, 200),
    studyField: string(0, 200),
    preferredCountries: array(string(0, 20000), 10),
    fundingPreference: { enum: ['FULL', 'PARTIAL', 'ANY'] },
    studyLanguage: string(0, 200),
    targetYear: { ...number(2020, 2100), type: 'integer' },
    academicInterests: texts,
    careerGoals: string(0, 1000),
    useProfile: { type: 'boolean' },
    allowAI: { type: 'boolean' },
  },
  [],
);
