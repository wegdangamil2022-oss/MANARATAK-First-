import type {
  CareerOpportunityPreview,
  CountryDestination,
  Exam,
  ImportedCourse,
  Major,
  PublicArticle,
  Scholarship,
  Service,
  StudentToolPreview,
  University,
} from './types';

export type GlobalResultKind =
  | 'scholarships'
  | 'universities'
  | 'majors'
  | 'countries'
  | 'courses'
  | 'exams'
  | 'articles'
  | 'services'
  | 'tools'
  | 'jobs';

export interface GlobalSearchTarget {
  anchor?: string;
  searchTerm?: string;
}

export interface GlobalSearchDocument {
  key: string;
  kind: GlobalResultKind;
  title: string;
  titleEn?: string;
  aliases: string[];
  category: string;
  subtitle: string;
  meta?: string;
  targetId: string;
  sectionTitle?: string;
  anchor?: string;
  sectionText: string;
  raw: unknown;
}

export interface RankedGlobalSearchResult extends GlobalSearchDocument {
  matchedSection?: string;
  excerpt?: string;
  score: number;
  matchedBy: 'title-exact' | 'title-prefix' | 'alias' | 'section-title' | 'section-content' | 'partial';
}

const ARABIC_DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const TATWEEL = /\u0640/g;
const NON_WORD = /[^\p{L}\p{N}\s]/gu;

export function normalizeSearchText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(ARABIC_DIACRITICS, '')
    .replace(TATWEEL, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(NON_WORD, ' ')
    .toLocaleLowerCase('ar')
    .replace(/\s+/g, ' ')
    .trim();
}

const selectedFieldText = (value: unknown): string[] => {
  if (value === null || value === undefined || value === '') return [];
  if (Array.isArray(value)) return value.flatMap(selectedFieldText);
  // Object traversal is safe here because callers pass only explicitly selected,
  // user-facing section fields. The raw entity is never passed to this helper.
  if (typeof value === 'object') return Object.values(value as Record<string, unknown>).flatMap(selectedFieldText);
  return [String(value)];
};

const text = (...values: unknown[]): string => values.flatMap(selectedFieldText).filter(Boolean).join(' · ');

const createBase = (
  kind: GlobalResultKind,
  category: string,
  item: any,
  title: string,
  titleEn: string | undefined,
  aliases: string[],
  subtitle: string,
  meta?: string,
) => ({
  key: `${kind}:${String(item.id)}`,
  kind,
  category,
  title,
  titleEn,
  aliases: aliases.filter(Boolean),
  subtitle,
  meta,
  targetId: String(item.id),
  raw: item,
});

function sectionDocs(base: Omit<GlobalSearchDocument, 'sectionText'>, sections: Array<{ title: string; anchor: string; content: unknown[] }>): GlobalSearchDocument[] {
  const docs: GlobalSearchDocument[] = [{ ...base, sectionText: text(base.title, base.titleEn, base.aliases, base.subtitle, base.meta) }];
  for (const section of sections) {
    const sectionText = text(section.content);
    // Section documents must carry user-visible content. A heading alone is not enough
    // to make an entity searchable for that section.
    if (!sectionText) continue;
    docs.push({ ...base, key: `${base.key}:${section.anchor}`, sectionTitle: section.title, anchor: section.anchor, sectionText });
  }
  return docs;
}

export function buildGlobalSearchDocuments(input: {
  scholarships: Scholarship[];
  universities: University[];
  majors: Major[];
  countries: CountryDestination[];
  importedCourses: ImportedCourse[];
  exams: Exam[];
  articles: PublicArticle[];
  services: Service[];
  tools: StudentToolPreview[];
  careers: CareerOpportunityPreview[];
}): GlobalSearchDocument[] {
  const docs: GlobalSearchDocument[] = [];

  for (const item of input.scholarships) {
    const base = createBase('scholarships', 'المنح', item, item.title, item.titleEn, [item.university, item.universityEn, item.country, item.countryEn, item.tag, item.field], `${item.countryFlag} ${item.country} · ${item.university}`, item.fundingType);
    docs.push(...sectionDocs(base, [
      { title: 'نبذة عن المنحة', anchor: 'scholarship-about', content: [item.description, item.field] },
      { title: 'المميزات والتمويل', anchor: 'scholarship-funding', content: [item.fundingType, item.financialCoverage, item.fundingType === 'ممولة بالكامل' ? 'التمويل الكامل تمويل كامل fully funded full funding' : ''] },
      { title: 'شروط ومتطلبات التقديم', anchor: 'scholarship-requirements', content: [item.requirements, item.degreeLevel] },
      { title: 'الجامعات المشاركة', anchor: 'scholarship-universities', content: [item.participatingUniversities?.map((u) => `${u.name} ${u.nameEn}`)] },
      { title: 'الاختبارات المطلوبة', anchor: 'scholarship-exams', content: [item.requiredExams?.map((exam) => `${exam.name} ${exam.nameEn}`)] },
      { title: 'التقديم الرسمي', anchor: 'scholarship-application', content: [item.applicationUrl, item.deadline, item.status] },
    ]));
  }

  for (const item of input.universities) {
    const base = createBase('universities', 'الجامعات', item, item.name, item.nameEn, [item.city || '', item.country, item.type || '', item.ownership || '', ...(item.topMajors || [])], text(item.city, item.country), item.type || 'جامعة');
    docs.push(...sectionDocs(base, [
      { title: 'نبذة عن الجامعة', anchor: 'university-about', content: [item.description, item.foundationYear, item.type, item.ownership] },
      { title: 'التصنيف والاعتماد', anchor: 'university-rankings', content: [item.rankings?.map((r) => `${r.name} ${r.rank} ${r.year}`), item.globalRank] },
      { title: 'الدراسة والتخصصات', anchor: 'university-programs', content: [item.topMajors, item.studyPrograms?.degrees, item.studyPrograms?.faculties, item.studyPrograms?.topKeyMajors, item.studyPrograms?.teachingLanguages, item.studyPrograms?.studyModes] },
      { title: 'القبول والتسجيل', anchor: 'university-admissions', content: [item.internationalAdmissions?.acceptsDescription, item.internationalAdmissions?.acceptsInternationalStudents] },
      { title: 'متطلبات اللغة', anchor: 'language-requirements', content: [item.languageRequirements?.languages, item.languageRequirements?.acceptedTests] },
      { title: 'المنح الدراسية المتاحة', anchor: 'university-scholarships', content: [item.scholarships?.map((s) => `${s.name} ${s.nameEn || ''} ${s.type || ''} ${s.audience || ''}`)] },
      { title: 'الرسوم والتكاليف', anchor: 'university-tuition', content: [item.tuitionFees?.annualAverageTuition, item.tuitionFees?.generalDescription, item.tuitionFees?.undergradTuition, item.tuitionFees?.postgradTuition, item.livingCosts?.monthlyEstimate] },
      { title: 'السكن والحياة الطلابية', anchor: 'university-housing', content: [item.housing?.typicalCost, item.livingCosts?.variationNote] },
      { title: 'التواصل والروابط الرسمية', anchor: 'university-contacts', content: [item.websiteUrl, item.officialContacts?.phone, item.officialContacts?.usefulLinks?.map((l) => l.label)] },
    ]));
  }

  for (const item of input.majors) {
    const base = createBase('majors', 'التخصصات', item, item.name, item.nameEn, [item.category, item.code || '', item.academicField || '', item.professionalOrResearchField || ''], item.nameEn || item.category, text(item.degreeLevels, item.degreeLevelName));
    docs.push(...sectionDocs(base, [
      { title: 'نبذة عن التخصص', anchor: 'major-about', content: [item.description, item.aboutMajor, item.aboutMajorNote, item.natureOfStudy] },
      { title: 'الدراسة والمقررات', anchor: 'major-study', content: [item.whatYouWillStudy, item.foundationSubjects, item.coreSubjects, item.practicalSide, item.subSpecialties] },
      { title: 'المهارات المكتسبة', anchor: 'major-skills', content: [item.acquiredSkills, item.targetCompetencies] },
      { title: 'مجالات العمل', anchor: 'major-careers', content: [item.popularCareers, item.workFields, item.relatedJobs?.map((j) => `${j.job} ${j.entry}`)] },
      { title: 'متطلبات ومسار الدراسة', anchor: 'major-requirements', content: [item.previousQualifications, item.targetBackgrounds, item.experienceOrLicensing, item.graduationRequirements] },
      { title: 'الدراسات العليا', anchor: 'major-postgraduate', content: [item.postgraduateOpportunities, item.postDoctoralOpportunities, item.similarMajors?.map((m) => `${m.name} ${m.difference}`)] },
    ]));
  }

  for (const item of input.countries) {
    const base = createBase('countries', 'الدول', item, item.name, item.nameEn, [item.iso2Code || '', item.iso3Code || '', item.capitalCity || '', item.continent, ...(item.popularCities || [])], `${item.flagEmoji || item.flag || ''} ${item.continent}`.trim(), item.currencyCode);
    docs.push(...sectionDocs(base, [
      { title: 'نبذة عن الدولة', anchor: 'country-about', content: [item.description, item.capitalCity, item.subregion, item.officialLanguages] },
      { title: 'الدراسة والتعليم', anchor: 'country-study', content: [item.studySystemSummary, item.admissionHighlights, item.languageOfStudy, item.featuredMajors?.map((m) => m.name)] },
      { title: 'التأشيرة والقبول', anchor: 'country-visa', content: [item.visaEase, item.visaHighlights] },
      { title: 'التكاليف', anchor: 'country-costs', content: [item.livingCost, item.averageLivingCostUsd, item.costHighlights?.map((c) => `${c.label} ${c.value}`)] },
      { title: 'الجامعات', anchor: 'country-universities', content: [item.featuredUniversities?.map((u) => `${u.name} ${u.nameEn || ''}`)] },
      { title: 'المنح', anchor: 'country-scholarships', content: [item.featuredScholarships?.map((s) => `${s.name} ${s.nameEn || ''}`)] },
      { title: 'الاختبارات المطلوبة', anchor: 'country-exams', content: [item.requiredExams?.map((e) => `${e.name} ${e.nameEn || ''}`)] },
    ]));
  }

  for (const item of input.importedCourses) {
    const base = createBase('courses', 'الدورات', item, item.title, undefined, [item.provider, item.field, item.language, item.level, item.certificateType], item.provider || 'دورة تدريبية', item.language);
    docs.push(...sectionDocs(base, [
      { title: 'عن الدورة', anchor: 'course-about', content: [item.field, item.level, item.duration, item.provider] },
      { title: 'الموضوعات', anchor: 'course-topics', content: [item.topics] },
      { title: 'الشهادة', anchor: 'course-certificate', content: [item.freeCertificate ? 'شهادة مجانية' : '', item.certificateType] },
      { title: 'روابط مرتبطة', anchor: 'course-related', content: [item.relatedMajors?.map((r) => r.name), item.relatedUniversities?.map((r) => r.name), item.relatedScholarships?.map((r) => r.name), item.relatedCountries?.map((r) => r.name), item.relatedExams?.map((r) => r.name)] },
    ]));
  }

  for (const item of input.exams) {
    const base = createBase('exams', 'الاختبارات', item, item.name, item.nameEn, [item.category, item.providerName || '', item.testCode || '', ...(item.tags || [])], item.nameEn || item.category, item.category);
    docs.push(...sectionDocs(base, [
      { title: 'نبذة عن الاختبار', anchor: 'exam-about', content: [item.description, item.providerName, item.language] },
      { title: 'هيكل الاختبار', anchor: 'exam-structure', content: [item.sections?.map((s) => `${s.name} ${s.questionCount || ''} ${s.duration || ''} ${s.score || ''}`), item.duration, item.questionCount] },
      { title: 'الدرجات والنتائج', anchor: 'exam-scores', content: [item.scoreRange, item.passingScore, item.scoreNotes, item.resultNotes, item.validity] },
      { title: 'التسجيل والمتطلبات', anchor: 'exam-registration', content: [item.registrationSteps, item.registrationRequirements, item.feeSummary] },
      { title: 'التحضير والتنبيهات', anchor: 'exam-preparation', content: [item.preparationTips, item.testDayRules, item.importantWarnings, item.retakeNotes] },
      { title: 'الاعتراف والاستخدام', anchor: 'exam-recognition', content: [item.recognitionSummary, item.studentUses, item.relatedUniversities?.map((u) => u.name), item.relatedScholarships?.map((s) => s.name)] },
    ]));
  }

  for (const item of input.articles) {
    const base = createBase('articles', 'المقالات', item, item.titleAr, item.titleEn, [item.categoryAr, item.contentTypeLabelAr, ...(item.tags || [])], item.excerptAr, item.contentTypeLabelAr || item.contentType);
    docs.push(...sectionDocs(base, item.sections.map((section, index) => ({
      title: section.title,
      anchor: `article-section-${index + 1}`,
      content: [section.paragraphs, section.bullets],
    }))));
  }

  for (const item of input.services) {
    const base = createBase('services', 'الخدمات', item, item.title, undefined, [item.category, item.badge, item.audience], item.shortDescription, item.category);
    docs.push(...sectionDocs(base, [
      { title: 'نبذة عن الخدمة', anchor: 'service-about', content: [item.description, item.shortDescription] },
      { title: 'ما تتضمنه الخدمة', anchor: 'service-includes', content: [item.includes] },
      { title: 'المتطلبات', anchor: 'service-requirements', content: [item.requirements, item.requestContextFields] },
      { title: 'الباقات', anchor: 'service-packages', content: [item.packages?.map((p) => `${p.name} ${p.price} ${p.description}`)] },
      { title: 'الأسئلة الشائعة', anchor: 'service-faq', content: [item.faqs.map((f) => `${f.question} ${f.answer}`)] },
    ]));
  }

  for (const item of input.tools) {
    const base = createBase('tools', 'الأدوات', item, item.title, item.titleEn, [item.category, item.executionLabel, item.badge || ''], item.shortDescription, `${item.category} · ${item.availability}`);
    docs.push(...sectionDocs(base, [
      { title: 'الغرض من الأداة', anchor: 'tool-purpose', content: [item.purpose] },
      { title: 'كيف تعمل', anchor: 'tool-how-it-works', content: [item.howItWorks] },
      { title: 'المدخلات والمخرجات', anchor: 'tool-io', content: [item.inputs, item.outputs] },
    ]));
  }

  for (const item of input.careers) {
    const base = createBase('jobs', 'الوظائف والتدريب', item, item.title, item.titleEn, [item.employerName, item.country, item.city || '', item.kind, item.subtype, item.industry, item.workMode], `${item.countryFlag || ''} ${item.country} · ${item.employerName}`.trim(), `${item.kind} · ${item.workMode}`);
    docs.push(...sectionDocs(base, [
      { title: 'نبذة عن الفرصة', anchor: 'career-about', content: [item.summary, item.description] },
      { title: 'المتطلبات', anchor: 'career-requirements', content: [item.requirements, item.experienceLevel] },
      { title: 'المهارات', anchor: 'career-skills', content: [item.targetSkills] },
      { title: 'المسؤوليات والمزايا', anchor: 'career-details', content: [item.responsibilities, item.benefits] },
      { title: 'التقديم', anchor: 'career-application', content: [item.applicationSteps, item.applicationDeadline] },
    ]));
  }

  return docs;
}

function includesAllTokens(value: string, tokens: string[]): boolean {
  return tokens.every((token) => value.includes(token));
}

function excerptAround(source: string, query: string, maxLength = 150): string {
  const clean = String(source || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  const normalized = normalizeSearchText(clean);
  const q = normalizeSearchText(query);
  const at = normalized.indexOf(q);
  if (at < 0 || clean.length <= maxLength) return clean.slice(0, maxLength);
  const start = Math.max(0, at - 45);
  const end = Math.min(clean.length, start + maxLength);
  return `${start > 0 ? '…' : ''}${clean.slice(start, end)}${end < clean.length ? '…' : ''}`;
}

export function rankGlobalSearchDocuments(documents: GlobalSearchDocument[], query: string): RankedGlobalSearchResult[] {
  const q = normalizeSearchText(query);
  if (!q) return [];
  const tokens = q.split(' ').filter(Boolean);
  const best = new Map<string, RankedGlobalSearchResult>();

  for (const doc of documents) {
    const title = normalizeSearchText(doc.title);
    const titleEn = normalizeSearchText(doc.titleEn);
    const aliases = [titleEn, ...doc.aliases.map(normalizeSearchText)].filter(Boolean);
    const sectionTitle = normalizeSearchText(doc.sectionTitle);
    const sectionText = normalizeSearchText(doc.sectionText);

    let score = 0;
    let matchedBy: RankedGlobalSearchResult['matchedBy'] = 'partial';

    if (title === q || titleEn === q) { score = 1000; matchedBy = 'title-exact'; }
    else if (title.startsWith(q) || titleEn.startsWith(q)) { score = 850; matchedBy = 'title-prefix'; }
    else if (aliases.some((alias) => alias === q || alias.startsWith(q) || alias.includes(q))) { score = 700; matchedBy = 'alias'; }
    else if (sectionTitle && (sectionTitle === q || sectionTitle.startsWith(q) || includesAllTokens(sectionTitle, tokens))) { score = 560; matchedBy = 'section-title'; }
    else if (doc.sectionTitle && sectionText && (sectionText.includes(q) || includesAllTokens(sectionText, tokens))) { score = 400; matchedBy = 'section-content'; }
    else {
      const tokenHits = tokens.filter((token) => title.includes(token) || titleEn.includes(token) || aliases.some((alias) => alias.includes(token)) || sectionTitle.includes(token) || sectionText.includes(token)).length;
      if (tokenHits === 0) continue;
      score = 120 + tokenHits * 35;
      matchedBy = 'partial';
    }

    if (doc.sectionTitle) score -= 2; // Prefer the top-level entity when title quality is equal.
    const result: RankedGlobalSearchResult = {
      ...doc,
      matchedSection: doc.sectionTitle,
      excerpt: doc.sectionTitle ? excerptAround(doc.sectionText, query) : doc.subtitle,
      score,
      matchedBy,
    };
    const entityKey = `${doc.kind}:${doc.targetId}`;
    const current = best.get(entityKey);
    if (!current || result.score > current.score) best.set(entityKey, result);
  }

  return [...best.values()].sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'ar'));
}
