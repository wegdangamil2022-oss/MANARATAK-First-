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

export interface PublicExam {
  locale?: 'ar' | 'en';
  availabilitySummary?: string;
  /** Stable public route key (slug in live mode). */
  id: string;
  publicId?: string;
  slug?: string;
  ownerId?: string;
  name: string;
  nameEn: string;
  category: string;
  categoryLabel?: string;
  description: string;
  tags: string[];

  // Public presentation fields shared by API data and explicit preview examples.
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
}


/** The same adapter is used for saved admin previews and published API data. */
export interface InternationalTestPresentationInput {
  locale?: 'ar' | 'en';
  locations?:{countries?:Array<{id:string;name:string;nameAr?:string;iso2Code:string}>;cities?:Array<{id:string;name:string;nameAr?:string;countryIso2Code:string}>};
  relatedUniversities?: ExamEntityRef[];
  relatedScholarships?: ExamEntityRef[];
  id: string;
  publicId?: string;
  slug?: string;
  canonicalName: string;
  description?: string | null;
  displayName?: string;
  localizedNameAr?: string | null;
  localizedNameEn?: string | null;
  abbreviation?: string | null;
  testCode?: string | null;
  testCategory: string;
  providerName: string;
  status: string;
  registrationRequirements?: string | null;
  identificationRequirements?: string | null;
  retakePolicy?: string | null;
  cancellationReschedulingNotes?: string | null;
  accessibilityNotes?: string | null;
  variants?: Array<{ variantName: string; deliveryMode: string; isActive: boolean; administrativeNotes?: string }>;
  sections?: Array<{ sectionName: string; sectionType: string; order: number; durationMinutes?: number; questionTypes?: string[]; scoreMinimum?: number; scoreMaximum?: number }>;
  scoreScale?: { overallMinimum: number; overallMaximum: number; scoreIncrement?: number; bandsOrLevels?: string[]; passFailRules?: string; cefrEquivalency?: string; crossTestEquivalency?: string; resultValidityDurationMonths?: number; resultDeliveryTimeDays?: number; scoreReportingUrl?: string };
  fees?: Array<{ feeType: string; amount: number; currencyCode: string; hasRegionalVariation?: boolean; validityWindowNotes?: string }>;
  officialLinks?: Array<{ linkType: string; url: string; description?: string }>;
  countryRelationships?: Array<{ canonicalReferenceId?: string; referenceCode?: string; relationshipType: string; notes?: string }>;
  languageRelationships?: Array<{ canonicalReferenceId?: string; referenceCode?: string; relationshipType: string; notes?: string }>;
  availability?: { testingWindowsNotes?: string };
  preparationMaterials?: Array<{ title: string; description?: string; url?: string }>;
}

const categoryLabels: Record<string, string> = {
  ENGLISH_LANGUAGE: 'اللغة الإنجليزية', NON_ENGLISH_LANGUAGE: 'لغات أخرى',
  GENERAL_UNDERGRADUATE_ADMISSION: 'قبول البكالوريوس', GRADUATE_ADMISSION: 'قبول الدراسات العليا',
  NATIONAL_INTERNATIONAL_ADMISSION: 'قبول وطني ودولي', SPECIALIZED_ADMISSION: 'قبول تخصصي',
  PROFESSIONAL_LICENSING_CERTIFICATION: 'ترخيص وشهادات مهنية', LANGUAGE_PROFICIENCY: 'اختبارات اللغة',
  UNDERGRAD_ADMISSION: 'قبول البكالوريوس', GRAD_ADMISSION: 'قبول الدراسات العليا',
  PROFESSIONAL_LICENSING: 'ترخيص مهني', ACADEMIC_PLACEMENT: 'تحديد المستوى', OTHER: 'أخرى',
};
const deliveryLabels: Record<string, string> = { ONLINE: 'عبر الإنترنت', IN_PERSON: 'حضوري', HYBRID: 'حضوري وعبر الإنترنت' };
const lines = (value?: string | null): string[] => value?.split(/\n/).map(text => text.trim()).filter(Boolean) ?? [];
const nonEmpty = (...values: Array<string | null | undefined>) => values.find(value => value?.trim())?.trim() ?? '';
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const safeLink = (url?: string): boolean => !!url && /^https?:\/\//i.test(url);

export function mapInternationalTestToExam(dto: InternationalTestPresentationInput): PublicExam {
  const locale=dto.locale??'ar'; const en=locale==='en'; const number=new Intl.NumberFormat(locale);
  const score = dto.scoreScale;
  const variants = dto.variants?.filter(variant => variant.isActive) ?? [];
  const sections = [...(dto.sections ?? [])].sort((a, b) => a.order - b.order);
  const durations = sections.map(section => section.durationMinutes);
  const duration = durations.length && durations.every(finite) ? `${number.format(durations.reduce((sum, value) => sum + value, 0))} ${en?'minutes (section total)':'دقيقة (مجموع الأقسام)'}` : undefined;
  const scoreRange = score && finite(score.overallMinimum) && finite(score.overallMaximum) ? `${score.overallMinimum}–${score.overallMaximum}` : undefined;
  const feeLabels: Record<string, string> = { REGISTRATION: 'التسجيل', LATE_REGISTRATION: 'التسجيل المتأخر', RESCHEDULING: 'تغيير الموعد', CANCELLATION: 'الإلغاء', OTHER: 'رسوم أخرى' };
  const feeSummary = dto.fees?.map(fee => `${en?fee.feeType.replace(/_/g,' '):feeLabels[fee.feeType] || fee.feeType}: ${number.format(fee.amount)} ${fee.currencyCode}${fee.hasRegionalVariation ? (en?' (regional variation)':' (تختلف حسب المنطقة)') : ''}${fee.validityWindowNotes ? ` — ${fee.validityWindowNotes}` : ''}`).join(' • ');
  const links = (dto.officialLinks ?? []).filter(link => safeLink(link.url)).map(link => ({ label: link.description || link.linkType, url: link.url }));
  if (safeLink(score?.scoreReportingUrl) && !links.some(link => link.url === score?.scoreReportingUrl)) links.push({ label: 'تقارير النتائج', url: score!.scoreReportingUrl! });
  for (const material of dto.preparationMaterials ?? []) {
    if (safeLink(material.url) && !links.some(link => link.url === material.url)) links.push({ label: material.title, url: material.url! });
  }
  const nameEn = nonEmpty(dto.localizedNameEn, dto.abbreviation, dto.testCode, dto.canonicalName);
  return {
    id: dto.slug || dto.id, ownerId: dto.id, publicId: dto.publicId, slug: dto.slug,
    locale, name: en?nonEmpty(dto.displayName,dto.localizedNameEn,dto.canonicalName):nonEmpty(dto.displayName,dto.localizedNameAr,dto.canonicalName), nameEn,
    category: dto.testCategory, categoryLabel: en?dto.testCategory.replace(/_/g,' '):categoryLabels[dto.testCategory] || dto.testCategory,
    description: dto.description?.trim() || '', tags: [dto.abbreviation, dto.testCode, dto.providerName].filter((value): value is string => !!value),
    providerName: dto.providerName, testCode: dto.testCode ?? undefined, status: dto.status,
    scoreRange, duration,
    language: dto.languageRelationships?.map(relation => relation.referenceCode || relation.notes).filter(Boolean).join('، ') || undefined,
    variants: variants.map(variant => ({ name: variant.variantName, meta: en?variant.deliveryMode.replace(/_/g,' '):deliveryLabels[variant.deliveryMode] || variant.deliveryMode, note: variant.administrativeNotes })),
    deliveryModes: [...new Set(variants.map(variant => en?variant.deliveryMode.replace(/_/g,' '):deliveryLabels[variant.deliveryMode] || variant.deliveryMode))],
    sections: sections.map(section => ({ name: section.sectionName,
      duration: finite(section.durationMinutes) ? `${number.format(section.durationMinutes)} ${en?'minutes':'دقيقة'}` : undefined,
      score: finite(section.scoreMinimum) && finite(section.scoreMaximum) ? `${section.scoreMinimum}–${section.scoreMaximum}` : undefined,
      meta: section.questionTypes?.join('، ') || section.sectionType,
    })),
    scoreNotes: score ? [scoreRange ? `${en?'Score range':'نطاق الدرجات'}: ${scoreRange}` : '', finite(score.scoreIncrement) ? `${en?'Score increment':'زيادة الدرجة'}: ${score.scoreIncrement}` : '',
      ...(score.bandsOrLevels ?? []), ...lines(score.passFailRules), ...lines(score.cefrEquivalency), ...lines(score.crossTestEquivalency)].filter(Boolean) : [],
    registrationRequirements: [...lines(dto.registrationRequirements), ...lines(dto.identificationRequirements)],
    resultNotes: score ? [finite(score.resultValidityDurationMonths) ? en?`Recorded validity: ${score.resultValidityDurationMonths} months; check the accepting institution's policy.`:`مدة الصلاحية المسجلة: ${score.resultValidityDurationMonths} شهر؛ راجع سياسة الجهة المستقبلة.` : '',
      finite(score.resultDeliveryTimeDays) ? en?`Recorded result delivery: ${score.resultDeliveryTimeDays} days; check the official provider's schedule.`:`مدة إصدار النتيجة المسجلة: ${score.resultDeliveryTimeDays} يوم؛ راجع مواعيد الجهة الرسمية.` : ''].filter(Boolean) : [],
    retakeNotes: [...lines(dto.retakePolicy), ...lines(dto.cancellationReschedulingNotes)],
    importantWarnings: lines(dto.accessibilityNotes),
    preparationTips: dto.preparationMaterials?.map(material => [material.title, material.description].filter(Boolean).join(' — ')) ?? [],
    feeSummary, availabilitySummary: dto.availability?.testingWindowsNotes,
    relatedUniversities:dto.relatedUniversities,relatedScholarships:dto.relatedScholarships,
    relatedCountries: dto.locations?.countries?.map(country=>({id:country.id,name:en?country.name:country.nameAr||country.name,meta:country.iso2Code}))??dto.countryRelationships?.map(relation => ({ id: relation.canonicalReferenceId, name: relation.referenceCode || relation.notes || relation.canonicalReferenceId || 'دولة مرتبطة', meta: relation.relationshipType })) ?? [],
    officialLinks: links,
  };
}
