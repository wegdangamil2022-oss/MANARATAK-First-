import type { HomeCatalogStatus, HomeCoursePreviews } from './homeCatalogState';
import { mapInternationalTestToExam } from '@absheer/ui';
import {
  ApiClient,
  type PublicCareerJobDto,
  type PublicCmsContentDto,
  type PublicCourseDto,
  type PublicInternationalTestDto,
  type PublicMajorDto,
  type PublicServiceCatalogItemDto,
  type PublicStudentToolDto,
  type PublicUniversityDto,
  type PublicStudyDestinationDto,
} from '../../api/client';
import { mapPublicScholarshipDto } from './publicScholarshipDataSource';
import type {
  CareerExperienceLevel,
  CareerOpportunityKind,
  CareerOpportunityPreview,
  CareerWorkMode,
  CountryDestination,
  Course,
  DegreeLevel,
  Exam,
  ImportedCourse,
  Major,
  PublicArticle,
  Service,
  Scholarship,
  StudentToolCategory,
  StudentToolExecutionLabel,
  StudentToolPreview,
  University,
} from './types';

export type PublicLiveLocale = 'ar' | 'en';

export type PublicLiveDomain =
  | 'scholarships'
  | 'universities'
  | 'majors'
  | 'countries'
  | 'exams'
  | 'courses'
  | 'articles'
  | 'services'
  | 'careers'
  | 'tools';

export type PublicLiveDomainStatus = HomeCatalogStatus;

export interface PublicLiveDataSnapshot {
  scholarships: ReturnType<typeof mapPublicScholarshipDto>[];
  universities: University[];
  majors: Major[];
  countries: CountryDestination[];
  exams: Exam[];
  courses: Course[];
  paidCourses: Course[];
  importedCourses: ImportedCourse[];
  homeCoursePreviews?: HomeCoursePreviews;
  articles: PublicArticle[];
  services: Service[];
  careers: CareerOpportunityPreview[];
  tools: StudentToolPreview[];
}

export interface PublicLiveLoadResult {
  data: PublicLiveDataSnapshot;
  statuses: Record<PublicLiveDomain, PublicLiveDomainStatus>;
  errors: Partial<Record<PublicLiveDomain, string>>;
}

const emptyData = (): PublicLiveDataSnapshot => ({
  scholarships: [], universities: [], majors: [], countries: [], exams: [], courses: [], paidCourses: [], importedCourses: [],
  articles: [], services: [], careers: [], tools: [],
});

const emptyStatuses = (): Record<PublicLiveDomain, PublicLiveDomainStatus> => ({
  scholarships: 'loading', universities: 'loading', majors: 'loading', countries: 'loading', exams: 'loading',
  courses: 'loading', articles: 'loading', services: 'loading', careers: 'loading', tools: 'loading',
});

function splitText(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  if (typeof value !== 'string') return [];
  return value.split(/[,،;\n]/).map((item) => item.trim()).filter(Boolean);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function recordStringArray(value: unknown, key: string): string[] {
  return splitText(asRecord(value)[key]);
}

function firstString(value: unknown, fallback = ''): string {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number') return String(value);
  return fallback;
}

function countryFlagEmoji(iso2Code: string): string {
  const code = iso2Code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return '🌐';
  return String.fromCodePoint(...[...code].map((char) => 127397 + char.charCodeAt(0)));
}

function rankFromUniversity(dto: PublicUniversityDto): number | null {
  const rankings = Array.isArray(dto.rankings) ? dto.rankings : [];
  for (const raw of rankings) {
    const rank = asRecord(raw).rank;
    const numeric = /^\d+$/.test(String(rank ?? '').trim()) ? Number(rank) : NaN;
    if (Number.isFinite(numeric) && numeric > 0) return numeric;
  }
  return null;
}

export function mapPublicUniversityDto(dto: PublicUniversityDto): University {
  const programs = Array.isArray(dto.academicPrograms) ? dto.academicPrograms : [];
  const majorLinks = programs
    .map((raw) => asRecord(raw))
    .filter((program) => typeof program.majorId === 'string' && program.majorMappingState === 'CANONICALLY_MAPPED')
    .map((program) => ({
      label: firstString(program.sourceProgramName, 'برنامج أكاديمي'),
      majorId: String(program.majorId),
      degreeLabel: firstString(asRecord(program.degreeLevel).nameAr, firstString(asRecord(program.degreeLevel).nameEn)),
      programLabel: firstString(program.sourceProgramName),
    }));
  return {
    publishedData: dto,
    localization:dto.localization,
    id: dto.slug,
    ownerId: dto.publicId,
    publicId: dto.publicId,
    slug: dto.slug,
    countryReferenceId: dto.countryReferenceId,
    regionReferenceId: dto.regionReferenceId,
    cityReferenceId: dto.cityReferenceId,
    name: dto.displayName,
    nameEn: dto.localizedNames?.en || dto.canonicalName,
    type: dto.institutionType,
    ownership: dto.institutionalOwnership ?? undefined,
    country: dto.country ?? '',
    city: dto.city ?? undefined,
    foundationYear: dto.foundedYear ?? undefined,
    countryFlag: '',
    globalRank: rankFromUniversity(dto),
    scholarshipCount: null,
    acceptanceRate: null,
    imageUrl: dto.image?.url ?? '',
    description: dto.description ?? '',
    topMajors: majorLinks.map((item) => item.label).slice(0, 8),
    websiteUrl: dto.officialWebsite ?? dto.officialSourceUrl ?? dto.sourceUrl ?? '',
    studyPrograms: {
      majorLinks,
      teachingLanguages: dto.languagesOfInstruction ?? [],
    },
    officialContacts: dto.officialWebsite ? {
      officialWebsite: dto.officialWebsite,
      phone: dto.contactPhone,
    } : undefined,
  };
}

function degreeLevels(value: string): DegreeLevel[] {
  const normalized = value.toLowerCase();
  const result: DegreeLevel[] = [];
  if (/bachelor|undergraduate|بكالوريوس/.test(normalized)) result.push('بكالوريوس');
  if (/master|postgraduate|ماجستير/.test(normalized)) result.push('ماجستير');
  if (/doctor|phd|دكتوراه/.test(normalized)) result.push('دكتوراه');
  if (/fellow|زمال/.test(normalized)) result.push('زمالة أبحاث');
  if (/course|training|دور/.test(normalized)) result.push('دورات تدريبية');
  return result.length ? result : [];
}

export function mapPublicMajorDto(dto: PublicMajorDto): Major {
  const sectionText = (dto.contentSections ?? []).map((section) => section.content).filter(Boolean).join('\n');
  const description = dto.description ?? dto.studentFriendlySummary ?? sectionText;
  return {
    localization:dto.localization,
    id: `${dto.slug}/${(dto.degreeLevel || '').toLowerCase()}`,
    ownerId: dto.publicId,
    publicId: dto.publicId,
    slug: dto.slug,
    name: dto.localizedNameAr || dto.localizedNames?.ar || dto.displayName,
    nameEn: dto.localizedNameEn || dto.localizedNames?.en || dto.canonicalName,
    contentSections: dto.contentSections,
    category: dto.academicFieldOrDiscipline ?? dto.collegeOrFaculty ?? 'تخصص أكاديمي',
    degreeLevels: degreeLevels(dto.degreeLevel),
    degreeLevelName: dto.degreeLevel,
    iconName: 'GraduationCap',
    code: dto.classificationCode ?? undefined,
    description: description ?? '',
    averageScholarships: null,
    futureDemand: null,
    topCountries: [],
    popularCareers: dto.careerOutcomes ?? [],
    academicField: dto.academicFieldOrDiscipline ?? undefined,
    aboutMajor: dto.studentFriendlySummary ?? dto.description,
    acquiredSkills: dto.acquiredSkills ?? [],
    workFields: dto.careerOutcomes ?? [],
  };
}

export type PublicCourseTrack = 'native' | 'imported' | 'paid';

/** P13 owner fields are the only authority for public catalog classification. */
export function classifyCourseTrack(
  dto: Pick<PublicCourseDto, 'originType' | 'accessType'>,
): PublicCourseTrack {
  if (dto.accessType === 'PAID') return 'paid';
  if (dto.originType === 'NATIVE_ABSHEER_COURSE') return 'native';
  return 'imported';
}

export function mapCourse(dto: PublicCourseDto): {
  course: Course;
  imported: ImportedCourse | null;
  track: PublicCourseTrack;
} {
  const levelRaw = (dto.difficultyLevel ?? dto.studyLevelRaw ?? '').toLowerCase();
  const level: Course['level'] = /advanced|متقدم/.test(levelRaw)
    ? 'متقدم'
    : /intermediate|متوسط/.test(levelRaw)
      ? 'متوسط'
      : /beginner|مبتدئ/.test(levelRaw)
        ? 'مبتدئ'
        : /all|جميع/.test(levelRaw)
          ? 'جميع المستويات'
          : 'غير محدد رسميًا';
  const provider = dto.providerName ?? dto.platformName ?? 'أبشر';
  const track = classifyCourseTrack(dto);
  const course: Course = {
    id: dto.slug,
    ownerId: dto.ownerId,
    publicId: dto.publicId,
    slug: dto.slug,
    originType: dto.originType,
    accessType: dto.accessType,
    title: dto.displayName,
    titleEn: dto.titleEn ?? dto.canonicalName,
    provider,
    instructor: dto.instructor ?? provider,
    duration: dto.studyDuration ?? dto.studyDurationRaw ?? '',
    lessonsCount: dto.lessonsCount ?? null,
    level,
    isFree:
      dto.originType === 'EXTERNAL_LINKED_COURSE'
        ? dto.isStudyFree === true
        : ['FREE_STUDY', 'FREE_STUDY_AND_CERTIFICATE'].includes(dto.accessType),
    rating: null,
    studentsCount: null,
    imageUrl: dto.image?.url ?? '',
    category: dto.category ?? 'تعلم',
    directCourseUrl: dto.directCourseUrl,
    courseContent: dto.courseContent,
    description: dto.description,
    prerequisites: dto.prerequisites,
    targetAudience: dto.targetAudience,
    certificateAvailable: dto.certificateAvailable === true,
    learningOutcomes: dto.learningOutcomes?.join('\n'),
    courseModules: dto.curriculumModules,
    acquiredSkills: dto.acquiredSkills ?? [],
  };
  // Native/paid owner courses are never re-shaped into the imported-course provenance model.
  const imported: ImportedCourse | null =
    track === 'imported'
      ? {
          id: dto.slug,
          ownerId: dto.ownerId,
          publicId: dto.publicId,
          slug: dto.slug,
          title: dto.displayName,
          provider,
          platform: dto.platformName ?? provider,
          relatedMajors: dto.relatedMajors,
          field: dto.category ?? splitText(dto.relatedMajorsOrFields)[0] ?? '',
          language: dto.learningLanguage ?? dto.learningLanguageRaw ?? '',
          level,
          duration: dto.studyDuration ?? dto.studyDurationRaw ?? '',
          studyFree: dto.isStudyFree === true,
          freeCertificate: dto.isFreeCertificate === true,
          certificateType:
            dto.certificateType ?? (dto.isFreeCertificate === true ? 'نوع الشهادة غير محدد' : ''),
          topics: splitText(dto.shortCourseTopicsRaw ?? dto.courseContent),
          directCourseUrl: dto.directCourseUrl,
        }
      : null;
  return { course, imported, track };
}

export function mapCountry(
  dto: PublicStudyDestinationDto,
  locale: PublicLiveLocale = 'ar',
): CountryDestination {
  const country = dto.country;
  const isAr = locale === 'ar';
  const currencyCode = dto.livingCostCurrency?.isoCode ?? '';
  const costMin = dto.averageMonthlyLivingCostMin;
  const costMax = dto.averageMonthlyLivingCostMax;
  const livingCostLabel: Record<string, string> = isAr
    ? { LOW: 'منخفضة', MODERATE: 'متوسطة', HIGH: 'مرتفعة', VERY_HIGH: 'مرتفعة جدًا' }
    : { LOW: 'Low', MODERATE: 'Moderate', HIGH: 'High', VERY_HIGH: 'Very high' };
  const studyLanguages = dto.studyLanguages
    .map((item) => (isAr ? item.nameAr || item.name : item.name))
    .filter(Boolean);
  const officialLinks: NonNullable<CountryDestination['officialLinks']> = dto.officialLinks.map(
    (link) => ({
      label: isAr ? link.labelAr : (link.labelEn ?? ''),
      url: link.url,
      note: isAr ? link.noteAr : link.noteEn,
    }),
  );
  if (dto.visaOfficialUrl && !officialLinks.some((link) => link.url === dto.visaOfficialUrl)) {
    officialLinks.unshift({
      label: isAr ? 'المصدر الرسمي للتأشيرة' : 'Official visa source',
      url: dto.visaOfficialUrl,
    });
  }
  return {
    id: country.id,
    ownerId: country.id,
    publicId: dto.publicId,
    slug: dto.slug,
    name: isAr ? country.nameAr || country.name : country.name,
    nameEn: country.officialName ?? country.name,
    flag: countryFlagEmoji(country.iso2Code),
    flagEmoji: countryFlagEmoji(country.iso2Code),
    continent: country.region ?? '',
    livingCost: dto.livingCostTier
      ? (livingCostLabel[dto.livingCostTier] ?? dto.livingCostTier)
      : isAr
        ? 'غير محدد'
        : 'Not specified',
    scholarshipAvailability: '',
    studentSuitability: '',
    isFeatured: dto.isFeatured,
    referenceWarnings: dto.referenceWarnings,
    scholarshipsCount: null,
    universitiesCount: null,
    description: (isAr ? dto.overviewAr : dto.overviewEn) ?? '',
    imageUrl: dto.image?.url ?? '',
    cityReferences: (dto.cities ?? []).map((city) => ({
      id: city.id,
      name: isAr ? city.nameAr || city.name : city.name,
    })),
    popularCities: (dto.cities ?? []).map((city) => (isAr ? city.nameAr || city.name : city.name)),
    monthlyLivingCostRange:
      typeof costMin === 'number' && typeof costMax === 'number' && dto.livingCostCurrency
        ? {
            min: costMin,
            max: costMax,
            currencyReferenceId: dto.livingCostCurrency.id,
            currencyCode,
            period: 'MONTH',
          }
        : null,
    monthlyLivingCostLabel:
      typeof costMin === 'number' && typeof costMax === 'number'
        ? `${costMin.toLocaleString(locale)}–${costMax.toLocaleString(locale)} ${currencyCode}`.trim()
        : '',
    languageOfStudy: studyLanguages,
    visaSummary: (isAr ? dto.visaSummaryAr : dto.visaSummaryEn) ?? undefined,
    lastReviewedAt: dto.lastReviewedAt,
    visaEase: Boolean(dto.lastReviewedAt)
      ? isAr
        ? 'المصادر موثقة'
        : 'Sources verified'
      : isAr
        ? 'راجع الجهة الرسمية'
        : 'Check official sources',
    iso2Code: country.iso2Code,
    iso3Code: country.iso3Code,
    subregion: country.subregion ?? undefined,
    currencyCode: currencyCode || undefined,
    callingCode: country.callingCode ?? undefined,
    officialLanguages: country.defaultLanguageCode ? [country.defaultLanguageCode] : [],
    studySystemSummary: (isAr ? dto.studySystemSummaryAr : dto.studySystemSummaryEn) ?? undefined,
    admissionHighlights: isAr ? dto.admissionHighlightsAr : dto.admissionHighlightsEn,
    visaHighlights: isAr ? dto.visaRequirementsAr : dto.visaRequirementsEn,
    costHighlights: isAr ? dto.costHighlightsAr : dto.costHighlightsEn,
    studentLifeHighlights: isAr ? dto.studentLifeHighlightsAr : dto.studentLifeHighlightsEn,
    officialLinks,
  };
}

export function mapExam(dto: PublicInternationalTestDto): Exam {
  return mapInternationalTestToExam(dto);
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function mapArticle(dto: PublicCmsContentDto): PublicArticle {
  const plain = stripHtml(dto.body);
  const kind = dto.contentType.toUpperCase();
  const supportedTypes: PublicArticle['contentType'][] = [
    'ARTICLE',
    'NEWS',
    'STUDY_GUIDE',
    'CHECKLIST',
    'FAQ',
    'STATIC_PAGE',
    'LANDING_PAGE',
  ];
  if (!supportedTypes.includes(kind as PublicArticle['contentType']))
    throw new Error(`CMS_CONTENT_TYPE_UNSUPPORTED:${dto.contentType}`);
  const contentType = kind as PublicArticle['contentType'];
  return {
    id: dto.slug,
    publicId: dto.publicId,
    ownerId: dto.contentId,
    slug: dto.slug,
    titleAr: dto.title,
    titleEn: dto.title,
    body: dto.body,
    canonicalUrl: dto.canonicalUrl,
    cmsSeo: { locale: dto.locale, availableLocales: dto.availableLocales, title: dto.seoMetadata.title || dto.title, description: dto.seoMetadata.description || dto.summary || "", noIndex: dto.seoMetadata.noIndex, noFollow: dto.seoMetadata.noFollow },
    contentType,
    contentTypeLabelAr: contentType === 'NEWS' ? 'خبر' : contentType === 'STUDY_GUIDE' ? 'دليل دراسي' : contentType === 'CHECKLIST' ? 'قائمة تحقق' : contentType === 'FAQ' ? 'أسئلة شائعة' : contentType === 'STATIC_PAGE' ? 'صفحة ثابتة' : contentType === 'LANDING_PAGE' ? 'صفحة هبوط' : 'مقال',
    categoryAr: dto.categorySlug ?? 'محتوى',
    author: 'أبشر',
    updatedAt: dto.publishedAt,
    readingTime: dto.localizedPayload?.readingTimeMinutes ? `${dto.localizedPayload.readingTimeMinutes} دقائق` : undefined,
    excerptAr: dto.summary ?? plain.slice(0, 220),
    tags: dto.tags.map((tag) => tag.label),
    sections: plain ? [{ title: dto.title, paragraphs: [plain] }] : [],
    officialLinks: [{ label: 'الرابط المنشور', url: dto.canonicalUrl }],
  };
}

export function mapService(dto: PublicServiceCatalogItemDto, locale:PublicLiveLocale='ar'): Service {
  const metadata = asRecord(dto.publicDisplayMetadata);
  const audience: Service['audience'] = /student/i.test(dto.serviceCategory) || /student/i.test(dto.responsibleServiceOwnerType) ? 'student' : 'general';
  return {
    id: dto.slug,
    publicId: dto.publicId,
    slug: dto.slug,
    supportedCountryReferenceIds: dto.supportedCountryReferenceIds ?? [],
    supportedLanguageReferenceIds: dto.supportedLanguageReferenceIds ?? [],
    title: dto.localizedContent?.[locale]?.displayName ?? dto.displayName,
    audience,
    category: ({ STUDENT_SERVICES: 'خدمات الطلاب', DOCUMENT_SERVICES: 'خدمات المستندات', VISA_SERVICES: 'خدمات التأشيرات', TRAVEL_SERVICES: 'خدمات السفر', ACADEMIC_SERVICES: 'خدمات أكاديمية', PROFESSIONAL_SERVICES: 'خدمات مهنية', ENTERPRISE_SERVICES: 'خدمات المؤسسات' } as Record<string,string>)[dto.serviceCategory] || dto.serviceCategory,
    requestable: dto.serviceAvailabilityStatus === 'AVAILABLE',
    badge: firstString(metadata.badge, audience === 'student' ? 'خدمة طلابية' : 'خدمة عامة'),
    shortDescription: dto.localizedContent?.[locale]?.serviceDescription ?? dto.serviceDescription,
    description: dto.localizedContent?.[locale]?.serviceDescription ?? dto.serviceDescription,
    priceLabel: dto.fulfillmentPolicy === 'FREE' ? 'مجانية' : dto.approvedPrice ? `${BigInt(dto.approvedPrice.amountMinorUnits)/10n**BigInt(dto.approvedPrice.scale)}${dto.approvedPrice.scale ? '.'+(BigInt(dto.approvedPrice.amountMinorUnits)%10n**BigInt(dto.approvedPrice.scale)).toString().padStart(dto.approvedPrice.scale,'0') : ''} ${dto.approvedPrice.currencyCode}` : 'عرض سعر معتمد مطلوب قبل التنفيذ',
    turnaround: dto.estimatedDeliveryTime ?? '',
    deliveryMode: ({ ONLINE: 'عبر الإنترنت', IN_PERSON: 'حضوري', HYBRID: 'مدمج' } as Record<string,string>)[dto.deliveryMode] || dto.deliveryMode,
    includes: recordStringArray(metadata, 'includes'),
    excludes: recordStringArray(metadata, 'excludes'),
    requirements: dto.requiredInputsOrDocuments ?? [],
    faqs: Array.isArray(metadata.faqs) ? metadata.faqs.flatMap(value => { const row = asRecord(value); return typeof row.question === 'string' && typeof row.answer === 'string' ? [{ question: row.question, answer: row.answer }] : []; }) : [],
    packages: Array.isArray(metadata.packages) ? metadata.packages.flatMap(value => { const row = asRecord(value); return typeof row.name === 'string' && typeof row.price === 'string' && typeof row.description === 'string' ? [{ name: row.name, price: row.price, description: row.description }] : []; }) : [],
    cancellationPolicy: dto.cancellationPolicyCode === 'FREE_BEFORE_START' ? 'الإلغاء متاح قبل بدء التنفيذ للخدمة المجانية.' : 'تخضع طلبات الإلغاء ومبالغ الاسترداد لمراجعة المالية قبل اعتماد الإلغاء.',
    availabilityNote: ({ AVAILABLE: 'الخدمة متاحة لاستقبال الطلبات', UNAVAILABLE: 'الخدمة غير متاحة حالياً', PAUSED: 'استقبال الطلبات متوقف مؤقتاً' } as Record<string,string>)[dto.serviceAvailabilityStatus] || dto.serviceAvailabilityStatus,
    requestContextFields: (dto.inputSchema ?? []).filter(field=>field.required && field.type==='TEXT').map(field=>field.key),
    contextualLinks: [],
  };
}

const toolCategoryMap: Record<string, StudentToolCategory> = {
  DOCUMENTS_AND_WRITING: 'الكتابة والوثائق', WRITING_DOCUMENTS: 'الكتابة والوثائق',
  UNIVERSITIES: 'البحث والمقارنة', SCHOLARSHIPS: 'الإرشاد والتوجيه',
  STUDENT_PLANNING: 'التخطيط الدراسي', STUDY_PLANNING: 'التخطيط الدراسي',
  ACADEMIC_CALCULATORS: 'الحاسبات الأكاديمية', ADMISSION_READINESS: 'القبول والجاهزية', SEARCH_COMPARISON: 'البحث والمقارنة',
  FINANCIAL_PLANNING: 'التخطيط المالي', DOCUMENT_VERIFICATION: 'التحقق من الوثائق', GUIDANCE: 'الإرشاد والتوجيه',
};
function mapTool(dto: PublicStudentToolDto, locale: PublicLiveLocale): StudentToolPreview {
  const executionLabel: StudentToolExecutionLabel = /AI|MODEL|PROMPT/i.test(dto.executionType) ? 'أداة ذكية' : (/CALC/i.test(dto.executionType) || dto.category === 'ACADEMIC_CALCULATORS') ? 'حسابية' : /HYBRID/i.test(dto.executionType) ? 'هجينة' : 'بيانات ومقارنة';
  const active = dto.implementationStatus === 'IMPLEMENTED' && dto.visibility === 'ACTIVE' && dto.lifecycle === 'ACTIVE' && dto.availability.publicEnabled && !dto.availability.adminOnly && !dto.availability.maintenanceMode && dto.featureFlags.globallyEnabled && !dto.featureFlags.maintenanceMode;
  return {
    id: dto.toolKey,
    ownerId: dto.id,
    toolKey: dto.toolKey,
    title: locale === 'en' ? dto.nameEn : dto.nameAr,
    titleEn: dto.nameEn,
    shortDescription: locale === 'en' ? (dto.descriptionEn ?? dto.descriptionAr) : dto.descriptionAr,
    category: toolCategoryMap[dto.category] ?? 'الإرشاد والتوجيه',
    executionLabel,
    availability: active ? 'متاحة الآن' : 'قريبًا',
    estimatedTime: dto.estimatedMinutes ? `${dto.estimatedMinutes} دقائق` : '',
    badge: dto.lifecycle,
    purpose: locale === 'en' ? (dto.descriptionEn ?? dto.descriptionAr) : dto.descriptionAr,
    howItWorks: [
      'تُراجع المدخلات على الخادم قبل التنفيذ.',
      dto.executionType === 'AI_DELEGATED' ? 'تُنشأ المسودة بالذكاء الاصطناعي اعتمادًا على المعلومات التي أدخلتها.' : dto.executionType === 'HYBRID' ? 'تُجمع البيانات من المجال المالك أولًا، ثم يُستخدم الذكاء الاصطناعي بصورة إرشادية عند توفره.' : 'يُنفذ المنطق المحدد دون نموذج ذكاء اصطناعي.',
      'لا تُحفظ النتيجة في حساب الطالب إلا بطلب حفظ صريح.',
    ],
    inputs: (dto.inputSchema?.fields ?? []).map((field) => `${field.labelAr}${field.required ? ' *' : ''}`),
    outputs: (dto.outputSchema?.fields ?? []).map((field) => field.labelAr),
    notes: dto.executionType === 'AI_DELEGATED' || dto.executionType === 'HYBRID'
      ? ['مخرجات الذكاء الاصطناعي مساعدة إرشادية وليست مصدر حقيقة للجامعة أو المنحة أو الحساب.']
      : undefined,
  };
}

function careerSalaryDecimal(value: unknown, scale: number) {
  const text = String(value).padStart(scale+1, '0');
  return scale ? text.slice(0,-scale)+'.'+text.slice(-scale) : text;
}

export function mapCareer(dto: PublicCareerJobDto): CareerOpportunityPreview {
  const metadata = asRecord(dto.metadata);
  const kind: CareerOpportunityKind =
    dto.opportunityType === 'INTERNSHIP' ? 'تدريب'
      : dto.opportunityType === 'GRADUATE_PROGRAM' ? 'برنامج خريجين'
        : dto.opportunityType === 'MENTORSHIP' ? 'إرشاد مهني'
          : dto.opportunityType === 'CAREER_EVENT' ? 'فعالية مهنية'
            : 'وظيفة';
  const workMode: CareerWorkMode =
    dto.remoteOption || dto.employmentType === 'REMOTE'
      ? 'عن بعد'
      : dto.employmentType === 'HYBRID'
        ? 'هجين'
        : 'حضوري';
  const employer = dto.employer?.displayName ?? 'جهة ناشرة';
  const experienceLevel = firstString(metadata.experienceLevel, 'غير محدد') as CareerExperienceLevel;
  return {
    id: dto.slug,
    ownerId: dto.id,
    publicId: dto.publicId,
    slug: dto.slug,
    countryReferenceId: dto.countryReferenceId,
    cityReferenceId: dto.cityReferenceId,
    title: dto.title,
    titleEn: firstString(asRecord(asRecord(metadata.localizedContent).en).title, dto.title),
    applicationChannel: metadata.applicationChannel === 'INTERNAL' ? 'INTERNAL' : 'EXTERNAL',
    employerName: employer,
    kind,
    subtype: dto.opportunityType,
    country: dto.country ?? dto.employer?.country ?? '',
    city: dto.city ?? dto.employer?.city ?? undefined,
    workMode,
    industry: dto.employer?.industry ?? dto.jobCategory,
    employmentType: dto.employmentType,
    experienceLevel,
    salaryLabel: dto.salaryRange?.minMinorUnits != null ? `${careerSalaryDecimal(dto.salaryRange.minMinorUnits, Number(dto.salaryRange.scale))}–${careerSalaryDecimal(dto.salaryRange.maxMinorUnits, Number(dto.salaryRange.scale))} ${String(dto.salaryRange.currencyCode)} / ${String(dto.salaryRange.period)}`
        : 'غير معلن',
    durationLabel: firstString(metadata.durationLabel) || undefined,
    summary: firstString(metadata.summary, dto.description.slice(0, 220)),
    description: dto.description,
    responsibilities: recordStringArray(metadata, 'responsibilities'),
    requirements: [dto.educationRequirement, ...(dto.languageRequirements ?? [])].filter(
      (value): value is string => Boolean(value),
    ),
    targetSkills: dto.requiredSkills ?? [],
    benefits: recordStringArray(metadata, 'benefits'),
    applicationSteps: recordStringArray(metadata, 'applicationSteps'),
    applicationDeadline: dto.applicationDeadline ?? undefined,
    externalPostingUrl: dto.externalPostingUrl ?? undefined,
    contextLinks: [],
    suggestTools: Boolean(metadata.suggestTools),
  };
}

// The home snapshot is a preview. Discovery pages own continuation and exact filters.
async function previewCursorPage<T>(fetchPage: (cursor?: string) => Promise<{ data: T[] }>): Promise<T[]> {
  return (await fetchPage()).data;
}
async function previewOffsetPage<T>(fetchPage: (page: number) => Promise<{ data: T[] }>): Promise<T[]> {
  return (await fetchPage(1)).data;
}

export async function loadPublishedUniversities(
  locale: PublicLiveLocale = 'ar',
): Promise<University[]> {
  const page = await ApiClient.getUniversities({ locale, limit: 25 });
  return page.data.map(mapPublicUniversityDto);
}
export async function loadPublishedMajors(locale: PublicLiveLocale = 'ar'): Promise<Major[]> {
  const page = await ApiClient.getMajors({ locale, limit: 20 });
  return page.data.map(mapPublicMajorDto);
}
export async function searchPublishedMajors(
  filters: {
    search?: string;
    degreeLevel?: string;
    academicFieldOrDiscipline?: string;
    cursor?: string;
  },
  locale: PublicLiveLocale = 'ar', signal?: AbortSignal,
) {
  const page = await ApiClient.getMajors({ ...filters, locale, limit: 20 }, signal);
  return { data: page.data.map(mapPublicMajorDto), total: page.total, nextCursor: page.nextCursor };
}
export async function loadPublishedCountries(
  locale: PublicLiveLocale = 'ar',
): Promise<CountryDestination[]> {
  const [preview, featured] = await Promise.all([ApiClient.getStudyDestinations({ page: 1, pageSize: 20 }), ApiClient.getStudyDestinations({ page: 1, pageSize: 8, isFeatured: true })]);
  const rows = [...new Map([...preview.data, ...featured.data].map(item => [item.country.id, item])).values()];
  return rows.map(item => mapCountry(item, locale));
}
export async function searchPublishedCountries(
  filters: { q?: string; region?: string; countryReferenceId?: string; page?: number },
  locale: PublicLiveLocale = 'ar',
) {
  const result = await ApiClient.getStudyDestinations({ ...filters, pageSize: 20 });
  return { ...result, data: result.data.map((dto) => mapCountry(dto, locale)) };
}
export async function loadPublishedExams(locale: PublicLiveLocale = 'ar'): Promise<Exam[]> {
  const result = await ApiClient.getInternationalTests({ locale, page: 1, pageSize: 20 });
  return result.data.map(mapExam);
}
/** Each home track has its own bounded published-owner query, independent of other tracks. */
export async function loadPublishedCourses(locale: PublicLiveLocale = 'ar'): Promise<{
  courses: Course[];
  paidCourses: Course[];
  importedCourses: ImportedCourse[];
  homeCoursePreviews: HomeCoursePreviews;
}> {
  const origins = ['EXTERNAL_LINKED_COURSE', 'NATIVE_ABSHEER_COURSE', 'PAID_COURSE'] as const;
  const results = await Promise.allSettled(origins.map(async originType => {
    const page = await ApiClient.getCourses({ originType, limit: 3 }, locale);
    return page.data.filter(dto => dto.originType === originType).map(mapCourse);
  }));
  const values = results.map(result => result.status === 'fulfilled' ? result.value : []);
  const [global, native, paid] = values;
  const globalFailed = results[0].status === 'rejected';
  const nativeFailed = results[1].status === 'rejected' || results[2].status === 'rejected';
  const nativeCards = [...native, ...paid].map(item => item.course);
  return {
    courses: [...native, ...paid].filter(item => item.track === 'native').map(item => item.course),
    paidCourses: [...native, ...paid].filter(item => item.track === 'paid').map(item => item.course),
    importedCourses: global.flatMap(item => item.imported ? [item.imported] : []),
    homeCoursePreviews: {
      global: { courses: global.map(item => item.course), status: globalFailed ? 'unavailable' : global.length ? 'ready' : 'empty' },
      native: { courses: nativeCards, status: nativeFailed ? 'unavailable' : nativeCards.length ? 'ready' : 'empty' },
    },
  };
}

function coursePreviewStatus(previews: HomeCoursePreviews): PublicLiveDomainStatus {
  if (Object.values(previews).some(preview => preview.status === 'unavailable')) return 'unavailable';
  return Object.values(previews).some(preview => preview.courses.length > 0) ? 'ready' : 'empty';
}
export async function loadPublishedArticles(
  locale: PublicLiveLocale = 'ar',
): Promise<PublicArticle[]> {
  // The editorial discovery surface intentionally excludes FAQ/STATIC_PAGE. Those remain
  // first-class P16 content and are delivered through the canonical /content/:slug route.
  const editorialTypes: PublicArticle['contentType'][] = [
    'ARTICLE',
    'NEWS',
    'STUDY_GUIDE',
    'CHECKLIST',
  ];
  const pages = await Promise.all(
    editorialTypes.map((contentType) =>
      previewOffsetPage((page) =>
        ApiClient.getCmsContent({ locale, contentType, page, pageSize: 20 }),
      ),
    ),
  );
  return pages.flat().map(mapArticle);
}
export async function loadPublishedServices(locale: PublicLiveLocale = 'ar'): Promise<Service[]> {
  const page = await ApiClient.getServices({ limit: 20, locale });
  return page.data.map((row) => mapService(row, locale));
}
export async function loadPublishedCareers(locale: PublicLiveLocale = 'ar'): Promise<CareerOpportunityPreview[]> {
  const page = await ApiClient.getCareerJobs({ limit: 20, locale });
  return page.data.map(mapCareer);
}
export async function loadPublishedTools(
  locale: PublicLiveLocale = 'ar',
): Promise<StudentToolPreview[]> {
  const result = await ApiClient.getStudentTools();
  return result
    .filter((item) => item.availability.publicEnabled)
    .map((item) => mapTool(item, locale));
}

const snapshotCache = new Map<string, { result: PublicLiveLoadResult; timestamp: number }>();
const snapshotEpochs = new Map<string, number>();
const inFlightSnapshots = new Map<string, Promise<PublicLiveLoadResult>>();
const SNAPSHOT_CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes cache

export async function refreshPublishedTools(
  locale: PublicLiveLocale,
): Promise<StudentToolPreview[]> {
  const tools = await loadPublishedTools(locale);
  const cached = snapshotCache.get(`snapshot_${locale}`);
  if (cached) cached.result = { ...cached.result, data: { ...cached.result.data, tools }, statuses: { ...cached.result.statuses, tools: tools.length ? 'ready' : 'empty' } };
  return tools;
}

export async function refreshPublishedCountries(locale: PublicLiveLocale): Promise<CountryDestination[]> {
  const countries = await loadPublishedCountries(locale);
  const cached = snapshotCache.get(`snapshot_${locale}`);
  if (cached) cached.result = { ...cached.result, data: { ...cached.result.data, countries }, statuses: { ...cached.result.statuses, countries: countries.length ? 'ready' : 'empty' } };
  return countries;
}

export async function refreshPublishedArticles(locale: PublicLiveLocale): Promise<PublicArticle[]> {
  const articles = await loadPublishedArticles(locale);
  const cached = snapshotCache.get(`snapshot_${locale}`);
  if (cached) cached.result = { ...cached.result, data: { ...cached.result.data, articles }, statuses: { ...cached.result.statuses, articles: articles.length ? 'ready' : 'empty' } };
  return articles;
}

export async function refreshPublishedServices(locale: PublicLiveLocale): Promise<Service[]> {
  const services = await loadPublishedServices(locale);
  const cached = snapshotCache.get(`snapshot_${locale}`);
  if (cached) cached.result = { ...cached.result, data: { ...cached.result.data, services }, statuses: { ...cached.result.statuses, services: services.length ? 'ready' : 'empty' } };
  return services;
}

export async function refreshPublishedCourses(locale: PublicLiveLocale) {
  const courses = await loadPublishedCourses(locale);
  const cached = snapshotCache.get(`snapshot_${locale}`);
  const status = coursePreviewStatus(courses.homeCoursePreviews);
  if (cached) cached.result = {...cached.result, data:{...cached.result.data,...courses},statuses:{...cached.result.statuses,courses:status}};
  return courses;
}

export async function refreshPublishedUniversities(locale: PublicLiveLocale): Promise<University[]> {
  const universities = await loadPublishedUniversities(locale);
  const cached = snapshotCache.get(`snapshot_${locale}`);
  if (cached) cached.result = { ...cached.result, data: { ...cached.result.data, universities }, statuses: { ...cached.result.statuses, universities: universities.length ? 'ready' : 'empty' } };
  return universities;
}

export async function refreshPublishedScholarships(locale: PublicLiveLocale): Promise<Scholarship[]> {
  const rows = await previewCursorPage(cursor => ApiClient.getScholarships({ cursor, limit: 20 }, locale));
  const scholarships = rows.map(dto => mapPublicScholarshipDto(dto));
  const cached = snapshotCache.get(`snapshot_${locale}`);
  if (cached) cached.result = { ...cached.result, data: { ...cached.result.data, scholarships },
    statuses: { ...cached.result.statuses, scholarships: scholarships.length ? 'ready' : 'empty' } };
  return scholarships;
}

export async function refreshPublishedMajors(locale: PublicLiveLocale): Promise<Major[]> {
  const majors = await loadPublishedMajors(locale);
  const cached = snapshotCache.get(`snapshot_${locale}`);
  if (cached) cached.result = { ...cached.result, data: { ...cached.result.data, majors },
    statuses: { ...cached.result.statuses, majors: majors.length ? 'ready' : 'empty' } };
  return majors;
}

export async function refreshPublishedExams(locale: PublicLiveLocale): Promise<Exam[]> {
  const exams = await loadPublishedExams(locale);
  const cached = snapshotCache.get(`snapshot_${locale}`);
  if (cached) {
    cached.result = { ...cached.result, data: { ...cached.result.data, exams },
      statuses: { ...cached.result.statuses, exams: exams.length ? 'ready' : 'empty' } };
  }
  return exams;
}

export async function loadPublicLiveSnapshot(locale: PublicLiveLocale = 'ar', forceRefresh = false): Promise<PublicLiveLoadResult> {
  const cacheKey = `snapshot_${locale}`;

  if (!forceRefresh) {
    const cached = snapshotCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < SNAPSHOT_CACHE_TTL_MS) {
      return cached.result;
    }
    const existingInFlight = inFlightSnapshots.get(cacheKey);
    if (existingInFlight) {
      return existingInFlight;
    }
  }

  const epoch = (snapshotEpochs.get(cacheKey) ?? 0) + 1;
  snapshotEpochs.set(cacheKey, epoch);
  const fetchPromise = (async () => {
    const data = emptyData();
    const statuses = emptyStatuses();
    const errors: Partial<Record<PublicLiveDomain, string>> = {};
    const loaders: Array<[PublicLiveDomain, () => Promise<unknown>]> = [
      ['scholarships', () => previewCursorPage((cursor) => ApiClient.getScholarships({ cursor, limit: 20 }, locale)).then((rows) => rows.map((dto) => mapPublicScholarshipDto(dto)))],
      ['universities', () => loadPublishedUniversities(locale)], ['majors', () => loadPublishedMajors(locale)], ['countries', () => loadPublishedCountries(locale)],
      ['exams', () => loadPublishedExams(locale)], ['courses', () => loadPublishedCourses(locale)], ['articles', () => loadPublishedArticles(locale)],
      ['services', ()=>loadPublishedServices(locale)], ['careers', () => loadPublishedCareers(locale)], ['tools', () => loadPublishedTools(locale)],
    ];
    await Promise.all(loaders.map(async ([domain, loader]) => {
      try {
        const result = await loader();
        if (domain === 'courses') {
          const value = result as Awaited<ReturnType<typeof loadPublishedCourses>>;
          data.courses = value.courses; data.paidCourses = value.paidCourses; data.importedCourses = value.importedCourses;
          data.homeCoursePreviews = value.homeCoursePreviews;
          statuses.courses = coursePreviewStatus(value.homeCoursePreviews);
          return;
        }
        (data as unknown as Record<string, unknown>)[domain] = result;
        const size = Array.isArray(result) ? result.length : 0;
        statuses[domain] = size ? 'ready' : 'empty';
      } catch (error) {
        statuses[domain] = 'unavailable';
        errors[domain] = error instanceof Error ? error.message : `Failed to load ${domain}`;
      }
    }));
    const finalResult = { data, statuses, errors };
    if (snapshotEpochs.get(cacheKey) === epoch) snapshotCache.set(cacheKey, { result: finalResult, timestamp: Date.now() });
    return finalResult;
  })().finally(() => {
    if (snapshotEpochs.get(cacheKey) === epoch) inFlightSnapshots.delete(cacheKey);
  });

  inFlightSnapshots.set(cacheKey, fetchPromise);
  return fetchPromise;
}
