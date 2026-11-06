const hasArabic = (value?: string | null) => /[\u0600-\u06ff]/.test(value ?? '');
export function courseNames(course: { displayName?: string; originalSourceTitle?: string }) {
  return {
    arabic: hasArabic(course.displayName) ? course.displayName!.trim() : hasArabic(course.originalSourceTitle) ? course.originalSourceTitle!.trim() : '',
    english: !hasArabic(course.originalSourceTitle) && course.originalSourceTitle?.trim() ? course.originalSourceTitle.trim() : !hasArabic(course.displayName) ? course.displayName?.trim() ?? '' : '',
  };
}

const providerArabic: Record<string, string> = {
  'saylor university': 'جامعة سايلور', 'fao elearning academy': 'أكاديمية الفاو للتعلم الإلكتروني',
  'hp life': 'إتش بي لايف', 'freecodecamp': 'فري كود كامب', 'ibm skillsbuild': 'آي بي إم سكيلز بيلد',
  'hubspot academy': 'أكاديمية هب سبوت', 'semrush academy': 'أكاديمية سمراش',
};
export function courseProviderNames(course: { providerName?: string; providerDisplayName?: string; platformName?: string }) {
  const values = [course.providerName, course.providerDisplayName, course.platformName].filter((value): value is string => Boolean(value?.trim()));
  const english = [course.providerDisplayName, course.platformName, course.providerName].find(value => value?.trim() && !hasArabic(value))?.trim() ?? '';
  return { arabic: values.find(hasArabic)?.trim() ?? providerArabic[english.toLowerCase()] ?? '', english };
}

const arabicValues: Record<string, string> = {
  english: 'الإنجليزية', arabic: 'العربية', french: 'الفرنسية', german: 'الألمانية', spanish: 'الإسبانية',
  portuguese: 'البرتغالية', italian: 'الإيطالية', chinese: 'الصينية', japanese: 'اليابانية', korean: 'الكورية',
  russian: 'الروسية', turkish: 'التركية', dutch: 'الهولندية',
  'not officially specified': 'غير محدد رسميًا', 'not specified': 'غير محدد', unknown: 'غير معلوم',
  beginner: 'مبتدئ', introductory: 'تمهيدي', intermediate: 'متوسط', advanced: 'متقدم', 'all levels': 'جميع المستويات',
  'certificate of completion': 'شهادة إكمال', 'certificate of participation': 'شهادة مشاركة',
  'digital badge': 'شارة رقمية', 'fao digital badge': 'شارة رقمية من الفاو',
  'openhpi confirmation of participation': 'إفادة مشاركة', none: 'لا توجد', 'n/a': 'غير محدد',
  'business & entrepreneurship': 'الأعمال وريادة الأعمال', 'planning & analysis': 'التخطيط والتحليل',
  'decision-making': 'اتخاذ القرار', 'practical applications': 'تطبيقات عملية',
  'accounting fundamentals': 'أساسيات المحاسبة', 'financial statements': 'القوائم المالية',
  'cost & transactions': 'التكاليف والمعاملات', 'decision support': 'دعم اتخاذ القرار',
  fisheries: 'مصايد الأسماك', aquaculture: 'الاستزراع المائي', 'marine resources': 'الموارد البحرية',
  'sustainable management': 'الإدارة المستدامة', 'course concepts': 'مفاهيم الدورة', 'core principles': 'المبادئ الأساسية',
  'projects & exercises': 'المشروعات والتمارين',
};

/** Display labels only: source values and canonical language/relationship IDs are unchanged. */
export function arabicCourseValue(raw?: string | null): string {
  const value = raw?.trim();
  if (!value) return 'غير مذكور في الملف';
  const exact = arabicValues[value.toLowerCase()];
  if (exact) return exact;
  if (/[•|]/.test(value)) return value.split(/\s*[•|]\s*/).map(arabicCourseValue).join(' • ');
  return value.replace(/\bmultilingual\b/gi, 'متعددة اللغات').replace(/\blanguages\b/gi, 'لغات')
    .replace(/\blessons?\b/gi, 'دروس').replace(/\bhours?\b/gi, 'ساعة')
    .replace(/\bminutes?\b|\bmin\b/gi, 'دقيقة').replace(/\bweeks?\b/gi, 'أسابيع')
    .replace(/\bmonths?\b/gi, 'أشهر').replace(/\bapprox\./gi, 'نحو').replace(/\beach\b/gi, 'لكل درس');
}
