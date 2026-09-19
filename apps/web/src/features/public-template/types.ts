export type Language = 'ar' | 'en';

export type CategoryType =
  | 'all'
  | 'scholarships'
  | 'universities'
  | 'countries'
  | 'majors'
  | 'courses'
  | 'articles'
  | 'services'
  | 'exams'
  | 'jobs'
  | 'tools';

export type DegreeLevel =
  'بكالوريوس' | 'ماجستير' | 'دكتوراه' | 'دورات تدريبية' | 'زمالة أبحاث' | 'all';

export type FundingType = 'ممولة بالكامل' | 'ممولة جزئياً' | 'إعفاء من الرسوم' | 'راتب شهري وسكن';

export type ScholarshipStatus = 'مفتوحة الآن' | 'تفتح قريبًا' | 'مغلقة';

export interface ScholarshipUniversityRef {
  id: string;
  name: string;
  nameEn: string;
  city?: string;
}

export interface ScholarshipExamRef {
  id: string;
  name: string;
  nameEn: string;
}

export interface Scholarship {
  /** Stable public route key (slug in live mode). */
  id: string;
  publicId?: string;
  slug?: string;
  ownerId?: string;
  countryReferenceId?: string | null;
  title: string;
  titleEn: string;
  country: string;
  countryEn: string;
  countryFlag: string;
  university: string;
  universityEn: string;
  degreeLevel: DegreeLevel[];
  fundingType: FundingType | string;
  financialCoverage: string[];
  deadline: string; // YYYY-MM-DD
  daysLeft: number;
  featured: boolean;
  tag: string;
  imageUrl: string;
  field: string;
  requirements: string[];
  description: string;
  applicationUrl: string;
  withoutIelts: boolean | null;
  matchScore?: number;
  status?: ScholarshipStatus;
  participatingUniversities?: ScholarshipUniversityRef[];
  requiredExams?: ScholarshipExamRef[];
  relatedArticles?: RelatedArticleRef[];
}


export interface CountryEntityRef {
  id: string;
  name: string;
  nameEn?: string;
  meta?: string;
}

export interface CountryOfficialLink {
  label: string;
  url: string;
  note?: string;
}

export interface CountryDestination {
  /** Canonical Phase 7 reference ID in live mode. */
  id: string;
  publicId?: string;
  slug?: string;
  ownerId?: string;
  name: string;
  nameEn: string;
  flag: string;
  flagEmoji: string;
  continent: string;
  livingCost: string; // e.g. 'منخفضة' | 'متوسطة' | 'مرتفعة'
  scholarshipAvailability: string; // e.g. 'متوفرة بكثرة' | 'متوفرة' | 'محدودة'
  studentSuitability: string; // e.g. 'عالية' | 'ممتازة' | 'جيدة جداً'
  scholarshipsCount: number | null;
  universitiesCount: number | null;
  description: string;
  imageUrl: string;
  popularCities: string[];
  averageLivingCostUsd: string;
  languageOfStudy: string[];
  visaEase: string;

  // Public country detail template fields. These mirror the Phase 07 country reference
  // profile and cross-phase navigation contracts without pretending every country is enriched yet.
  iso2Code?: string;
  iso3Code?: string;
  capitalCity?: string;
  subregion?: string;
  currencyCode?: string;
  callingCode?: string;
  officialLanguages?: string[];
  timezones?: string[];
  studySystemSummary?: string;
  admissionHighlights?: string[];
  visaHighlights?: string[];
  costHighlights?: Array<{ label: string; value: string }>;
  studentLifeHighlights?: string[];
  featuredUniversities?: CountryEntityRef[];
  featuredScholarships?: CountryEntityRef[];
  featuredMajors?: CountryEntityRef[];
  requiredExams?: CountryEntityRef[];
  officialLinks?: CountryOfficialLink[];
  relatedArticles?: RelatedArticleRef[];
}

export interface UniversityRanking {
  name: string;
  year: number;
  rank: string;
  link?: string;
}

export interface UniversityTuitionFees {
  currency: string; // e.g. 'جنيه إسترليني (£)', 'دولار أمريكي ($)', 'يورو (€)'
  currencySymbol?: string; // e.g. '£', '$', '€', '¥'
  annualAverageTuition?: string; // e.g. '33,050 - 48,620 £ / سنوياً'
  generalDescription?: string;
  undergradTuition?: string;
  undergradNote?: string;
  medicineTuition?: string; // إذا كان متوفراً
  medicineNote?: string;
  engineeringTuition?: string; // إذا كان متوفراً
  engineeringNote?: string;
  postgradTuition?: string;
  postgradNote?: string;
  officialTuitionUrl?: string; // رابط الرسوم الرسمي
}

export interface UniversityScholarship {
  id: string;
  name: string;
  nameEn?: string;
  type?: string;
  audience?: string;
  officialUrl: string;
  /** Canonical scholarship identity inside MANARATAK when this university scholarship is mapped. */
  platformScholarshipId?: string;
}

export interface UniversityLanguageRequirements {
  required: boolean;
  languages: string[];
  acceptedTests: string[];
  officialUrl: string;
  /** Optional canonical test links used for internal navigation without replacing source labels. */
  acceptedTestLinks?: Array<{ label: string; examId: string }>;
}

export interface UniversityDocumentRequirements {
  generalDocuments: string[];
  graduateAdditionalDocuments: string[];
  officialUrl: string;
}

export interface UniversityHousing {
  available: boolean;
  internationalStudentsEligible: boolean;
  typicalCost: string;
  currency: string;
  officialUrl?: string;
}

export interface UniversityLivingCosts {
  monthlyEstimate: string;
  currency: string;
  variationNote: string;
  officialUrl?: string;
}

export interface UniversityOfficialLink {
  label: string;
  url: string;
}

export interface UniversityOfficialContacts {
  phone?: string;
  officialWebsite: string;
  mainSocial?: UniversityOfficialLink;
  governmentRegister?: UniversityOfficialLink;
  usefulLinks?: UniversityOfficialLink[];
}

export interface UniversityDataTrust {
  lastVerified: string;
  sourceLabel: string;
  sourceUrl: string;
}

export interface UniversityStudyPrograms {
  degrees?: string[];
  faculties?: string[];
  topKeyMajors?: string[];
  /** Canonical Major targets behind selected university program/major labels. */
  majorLinks?: Array<{ label: string; majorId: string; degreeLabel?: string; programLabel?: string }>;
  teachingLanguages?: string[];
  studyModes?: string[];
  undergradDirectoryUrl?: string;
  postgradDirectoryUrl?: string;
}

export interface UniversityInternationalAdmissions {
  acceptsInternationalStudents?: boolean;
  acceptsDescription?: string;
  undergradAdmissionUrl?: string;
  postgradAdmissionUrl?: string;
  internationalStudentsUrl?: string;
  applicationPortalUrl?: string;
}

export interface University {
  /** Stable public route key (slug in live mode). */
  id: string;
  publicId?: string;
  slug?: string;
  ownerId?: string;
  countryReferenceId?: string | null;
  regionReferenceId?: string | null;
  cityReferenceId?: string | null;
  name: string;
  nameEn: string;
  type?: string; // e.g. جامعة، كلية جامعية، معهد
  ownership?: string; // e.g. حكومية، خاصة
  country: string;
  continent?: string;
  city?: string;
  foundationYear?: number;
  countryFlag: string;
  globalRank: number | null;
  scholarshipCount: number | null;
  acceptanceRate: string | null;
  imageUrl: string;
  description: string;
  topMajors: string[];
  websiteUrl: string;
  rankings?: UniversityRanking[];
  tuitionFees?: UniversityTuitionFees;
  scholarships?: UniversityScholarship[];
  languageRequirements?: UniversityLanguageRequirements;
  documentRequirements?: UniversityDocumentRequirements;
  housing?: UniversityHousing;
  livingCosts?: UniversityLivingCosts;
  officialContacts?: UniversityOfficialContacts;
  dataTrust?: UniversityDataTrust;
  studyPrograms?: UniversityStudyPrograms;
  internationalAdmissions?: UniversityInternationalAdmissions;
  relatedArticles?: RelatedArticleRef[];
}


export interface ImportedCourseEntityRef {
  id?: string;
  name: string;
  meta?: string;
}

export interface ImportedCourse {
  /** Stable public route key (slug in live mode). */
  id: string;
  publicId?: string;
  slug?: string;
  ownerId?: string;
  title: string;
  provider: string;
  field: string;
  language: string;
  level: string;
  duration: string;
  studyFree: boolean;
  freeCertificate: boolean;
  certificateType: string;
  topics: string[];
  directCourseUrl: string;
  relatedMajors?: ImportedCourseEntityRef[];
  relatedUniversities?: ImportedCourseEntityRef[];
  relatedScholarships?: ImportedCourseEntityRef[];
  relatedCountries?: ImportedCourseEntityRef[];
  relatedExams?: ImportedCourseEntityRef[];
  relatedArticles?: RelatedArticleRef[];
}

export type ServiceAudience = 'student' | 'general';

export type ServiceContextCategory =
  | 'universities'
  | 'scholarships'
  | 'countries'
  | 'majors'
  | 'exams'
  | 'articles';

export interface ServicePackage {
  name: string;
  price: string;
  description: string;
}

export interface ServiceFaq {
  question: string;
  answer: string;
}

export interface ServiceContextLink {
  category: ServiceContextCategory;
  label: string;
  description: string;
}

/**
 * Public-template service prototype.
 *
 * Important separation for Phase 20:
 * - `contextualLinks` are discovery/navigation suggestions only.
 * - `requestContextFields` belong to the student's individual request context.
 * - Neither field asserts a canonical direct relation to a university/scholarship/country.
 * Production direct-relation and availability contracts stay deferred to the canonical API/schema phase.
 */
export interface Service {
  /** Stable public route key (slug in live mode). */
  id: string;
  publicId?: string;
  ownerId?: string;
  supportedCountryReferenceIds?: string[];
  supportedLanguageReferenceIds?: string[];
  slug: string;
  title: string;
  audience: ServiceAudience;
  category: string;
  badge: string;
  shortDescription: string;
  description: string;
  priceLabel: string;
  turnaround: string;
  deliveryMode: string;
  includes: string[];
  excludes: string[];
  requirements: string[];
  packages?: ServicePackage[];
  faqs: ServiceFaq[];
  cancellationPolicy: string;
  availabilityNote?: string;
  requestContextFields: string[];
  contextualLinks: ServiceContextLink[];
}

export interface Course {
  /** Stable public route key (slug in live mode). */
  id: string;
  publicId?: string;
  slug?: string;
  ownerId?: string;
  /** Authoritative P13 classification; never inferred from provider display text. */
  originType?: string;
  accessType?: string;
  title: string;
  titleEn: string;
  provider: string;
  instructor: string;
  duration: string;
  lessonsCount: number | null;
  level: 'مبتدئ' | 'متوسط' | 'متقدم';
  isFree: boolean;
  rating: number | null;
  studentsCount: number | null;
  imageUrl: string;
  category: string;
  directCourseUrl?: string;
  courseContent?: string;
  acquiredSkills?: string[];
  courseModules?: { title: string; description: string }[];
  learningOutcomes?: string;
  progressPercent?: number;
}

export interface Major {
  /** Stable public route key (slug in live mode). */
  id: string;
  publicId?: string;
  slug?: string;
  ownerId?: string;
  name: string;
  nameEn: string;
  category: string;
  degreeLevels?: DegreeLevel[];
  degreeLevelName?: string;
  iconName: string;
  code?: string;
  duration?: string;
  commonDegrees?: string;
  description: string;
  averageScholarships: number | null;
  futureDemand: 'مرتفع جداً' | 'مرتفع' | 'متوسط' | null;
  topCountries: string[];
  popularCareers: string[];

  // Detailed Information
  associatedMajor?: string;
  academicField?: string;
  professionalOrResearchField?: string;
  fellowshipType?: string;
  fellowshipTypeDetails?: string[];
  licensingRequirement?: string;
  targetAudience?: string[];
  previousQualifications?: string[];
  previousQualificationsNote?: string;
  durationAndPattern?: string[];
  rotationsAndClinical?: string[];
  supervisedProcedures?: string[];
  researchAndQuality?: string[];
  targetCompetencies?: string[];
  assessmentAndCompletionRequirements?: string[];
  resultingCertificate?: string[];
  practiceScopeAndLicensing?: string;
  relationToResidencyBoardPhD?: { pathway: string; relation: string }[];
  similarFellowships?: { name: string; difference: string }[];
  professionalRegulatoryAlert?: string;
  programTypes?: string;
  studyModes?: string;
  natureOfStudy?: string;
  availabilityNature?: string;
  aboutMajor?: string;
  aboutMajorNote?: string;
  doctorateTypes?: string[];
  targetBackgrounds?: string[];
  closeBackgrounds?: string[];
  directEntryInfo?: string[];
  experienceOrLicensing?: string[];
  programStages?: string[];
  advancedTheory?: string[];
  researchMethodologies?: string[];
  ethicsAndIntegrity?: string[];
  qualifyingExamInfo?: string;
  researchProposalInfo?: string;
  originalContributionInfo?: string;
  supervisionEnvironment?: string[];
  supervisionAndEnvironment?: string[];
  researchPublishingTeaching?: string[];
  postDoctoralOpportunitiesIntro?: string;
  postDoctoralOpportunities?: string[];
  whatYouWillStudy?: string[];
  foundationSubjects?: string[];
  coreSubjects?: string[];
  practicalSide?: string[];
  subSpecialties?: string[];
  graduationRequirements?: string[];
  acquiredSkills?: string[];
  workFields?: string[];
  relatedJobs?: { job: string; entry: string; matchRate?: string; notes?: string }[];
  postgraduateOpportunitiesIntro?: string;
  postgraduateOpportunities?: string[];
  similarMajors?: { name: string; difference: string }[];
  academicAlertPoints?: { num?: string; title: string; desc: string }[];
  academicAlert?: string;
  relatedArticles?: RelatedArticleRef[];
}


export type ArticleEntityType = 'SCHOLARSHIP' | 'UNIVERSITY' | 'COUNTRY' | 'MAJOR' | 'EXAM' | 'COURSE';

export interface ArticleEntityRef {
  type: ArticleEntityType;
  id?: string;
  name: string;
  nameEn?: string;
  meta?: string;
}

export interface RelatedArticleRef {
  id: string;
  title: string;
  typeLabel?: string;
  category?: string;
  meta?: string;
}

export interface ArticleSection {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface ArticleOfficialLink {
  label: string;
  url: string;
  note?: string;
}

export interface PublicArticle {
  id: string;
  publicId?: string;
  ownerId?: string;
  slug: string;
  titleAr: string;
  titleEn: string;
  contentType: 'STUDY_GUIDE' | 'ARTICLE' | 'NEWS' | 'CHECKLIST' | 'FAQ' | 'STATIC_PAGE';
  contentTypeLabelAr: string;
  categoryAr: string;
  author: string;
  reviewer?: string;
  updatedAt: string;
  readingTime?: string;
  excerptAr: string;
  tags?: string[];
  sections: ArticleSection[];
  linkedEntities?: ArticleEntityRef[];
  officialLinks?: ArticleOfficialLink[];
}


export type FavoriteKind =
  | 'scholarship'
  | 'university'
  | 'major'
  | 'country'
  | 'course'
  | 'exam'
  | 'article'
  | 'service'
  | 'tool'
  | 'career';

export type FavoriteKey = `${FavoriteKind}:${string}`;

export interface ApplicationMilestone {
  id: string;
  scholarshipId: string;
  scholarshipTitle: string;
  country: string;
  deadline: string;
  stage:
    | 'تجهيز المستندات'
    | 'كتابة خطاب الدافع'
    | 'خطابات التوصية'
    | 'تم إرسال الطلب'
    | 'المقابلة الشخصية'
    | 'تم القبول بنجاح';
  progress: number; // 0 to 100
  notes: string;
  checklist: {
    id: string;
    task: string;
    completed: boolean;
  }[];
}

export interface PushNotificationItem {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  type: 'urgent' | 'opportunity' | 'course' | 'deadline' | 'system';
  read: boolean;
  actionType?: 'scholarship' | 'course' | 'ai-tools' | 'tracker';
  targetId?: string;
}

export interface UserProfile {
  name: string;
  email: string;
  degreeLevel: string;
  targetMajor: string;
  gpa: string;
  englishLevel: string;
  targetCountries: string[];
  avatarUrl?: string;
  notificationsEnabled: boolean;
}

export interface ExamFact {
  label: string;
  value: string;
}

export interface ExamVariant {
  name: string;
  meta: string;
  note?: string;
}

export interface ExamSectionDetail {
  name: string;
  questionCount?: string;
  duration?: string;
  score?: string;
  meta?: string;
}

export interface ExamEntityRef {
  id?: string;
  name: string;
  nameEn?: string;
  meta?: string;
}

export interface ExamOfficialLink {
  label: string;
  url: string;
  note?: string;
}

export interface Exam {
  /** Stable public route key (slug in live mode). */
  id: string;
  publicId?: string;
  slug?: string;
  ownerId?: string;
  name: string;
  nameEn: string;
  category: string;
  description: string;
  tags: string[];

  // Golden public-test fields. They align with the normalized InternationalTest
  // contracts while keeping this standalone public-template snapshot mock-driven.
  providerName?: string;
  testCode?: string;
  language?: string;
  scoreRange?: string;
  passingScore?: string;
  validity?: string;
  duration?: string;
  questionCount?: string;
  feeSummary?: string;
  recognitionSummary?: string;
  verificationLabel?: string;
  lastVerifiedAt?: string;
  status?: string;
  keyFacts?: ExamFact[];
  variants?: ExamVariant[];
  sections?: ExamSectionDetail[];
  studentUses?: string[];
  scoreNotes?: string[];
  deliveryModes?: string[];
  registrationSteps?: string[];
  registrationRequirements?: string[];
  resultNotes?: string[];
  retakeNotes?: string[];
  testDayRules?: string[];
  preparationTips?: string[];
  importantWarnings?: string[];
  relatedUniversities?: ExamEntityRef[];
  relatedScholarships?: ExamEntityRef[];
  relatedCountries?: ExamEntityRef[];
  comparisonCards?: Array<{ title: string; text: string }>;
  officialLinks?: ExamOfficialLink[];
  relatedArticles?: RelatedArticleRef[];
}

export type StudentToolCategory =
  | 'الكتابة والوثائق'
  | 'الإرشاد والتوجيه'
  | 'التخطيط الدراسي'
  | 'الحاسبات الأكاديمية'
  | 'القبول والجاهزية'
  | 'البحث والمقارنة'
  | 'التخطيط المالي'
  | 'التحقق من الوثائق';

export type StudentToolExecutionLabel = 'أداة ذكية' | 'حسابية' | 'بيانات ومقارنة' | 'هجينة';
export type StudentToolAvailability = 'متاحة الآن' | 'قريبًا';

export interface StudentToolContextLink {
  category: CategoryType;
  label: string;
  description: string;
}

export interface StudentToolServiceSuggestion {
  serviceId: string;
  label: string;
  note: string;
}

export interface StudentToolPreview {
  id: string;
  publicId?: string;
  ownerId?: string;
  toolKey: string;
  title: string;
  titleEn: string;
  shortDescription: string;
  category: StudentToolCategory;
  executionLabel: StudentToolExecutionLabel;
  availability: StudentToolAvailability;
  estimatedTime: string;
  badge?: string;
  purpose: string;
  howItWorks: string[];
  inputs: string[];
  outputs: string[];
  notes?: string[];
  contextualLinks?: StudentToolContextLink[];
  serviceSuggestions?: StudentToolServiceSuggestion[];
}

export type CareerOpportunityKind = 'وظيفة' | 'تدريب' | 'برنامج خريجين' | 'إرشاد مهني' | 'فعالية مهنية';
export type CareerWorkMode = 'حضوري' | 'عن بعد' | 'هجين';
export type CareerExperienceLevel = 'طالب جامعي' | 'حديث التخرج' | 'مبتدئ' | 'غير محدد';

export interface CareerContextLink {
  category: CategoryType;
  label: string;
  description: string;
}

export interface CareerOpportunityPreview {
  /** Stable public route key (slug in live mode). */
  id: string;
  publicId?: string;
  slug?: string;
  ownerId?: string;
  countryReferenceId?: string;
  cityReferenceId?: string | null;
  title: string;
  titleEn: string;
  employerName: string;
  kind: CareerOpportunityKind;
  subtype: string;
  country: string;
  countryFlag?: string;
  city?: string;
  workMode: CareerWorkMode;
  industry: string;
  employmentType: string;
  experienceLevel: CareerExperienceLevel;
  salaryLabel: string;
  durationLabel?: string;
  summary: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  targetSkills: string[];
  benefits: string[];
  applicationSteps: string[];
  applicationDeadline?: string;
  externalPostingUrl?: string;
  contextLinks?: CareerContextLink[];
  suggestTools?: boolean;
}
