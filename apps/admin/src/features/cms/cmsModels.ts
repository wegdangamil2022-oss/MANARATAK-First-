import { translateCms } from './cmsCopy';
export type Locale = 'ar' | 'en';
export interface Content {
  id: string;
  publicId: string;
  slug: string;
  siteIdentifier: string;
  primaryLocale: Locale;
  contentType: string;
  status: string;
  title: string;
  summary?: string | null;
  categoryId?: string | null;
  featuredAssetId?: string | null;
  version: number;
  updatedAt: string;
  scheduledAt?: string | null;
  localizedStates?: Array<{ locale: string; state: string; scheduledAt: string | null }>;
}
export interface Localized {
  id: string;
  locale: Locale;
  localizedSlug: string;
  title: string;
  summary?: string | null;
  body: string;
  readingTimeMinutes?: number | null;
  featuredAssetId?: string | null;
  attachmentAssetIds?: string[];
  tagIds?: string[];
  seoMetadata?: Seo | null;
  metadata?: Record<string, unknown> | null;
  state: string;
  version: number;
  scheduledAt?: string | null;
}
export interface DomainLink {
  id?: string;
  targetType: string;
  targetId: string;
  relationType: string;
  sortOrder: number;
}
export interface Detail extends Content {
  publishedLocales?: string[];
  localizedPayloads: Localized[];
  tags: Tag[];
  revisions: Array<{ id: string; versionNumber: number; reason: string; capturedAt: string }>;
  readiness: Record<
    string,
    { ready: boolean; missing: string[]; warnings: string[]; previewHash?: string }
  >;
  domainLinks: DomainLink[];
}
export interface Category {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  status: string;
}
export interface Tag {
  id: string;
  normalizedValue: string;
  labelAr: string;
  labelEn: string;
}
export interface Seo {
  title: string;
  description: string;
  canonicalUrl?: string | null;
  keywords: string[];
  noIndex: boolean;
  noFollow: boolean;
  openGraphTitle?: string | null;
  openGraphDescription?: string | null;
  openGraphAssetId?: string | null;
}
export interface ListResponse {
  data: Content[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
export interface EditorState {
  openGraphTitle: string;
  openGraphDescription: string;
  localizedSlug: string;
  title: string;
  summary: string;
  body: string;
  readingTimeMinutes: string;
  featuredAssetId: string;
  attachmentAssetIds: string;
  tagIds: string[];
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string;
  keywords: string;
  openGraphAssetId: string;
  noIndex: boolean;
  noFollow: boolean;
  version?: number;
}
export interface TaxonomyState {
  categorySlug: string;
  categoryAr: string;
  categoryEn: string;
  tagValue: string;
  tagAr: string;
  tagEn: string;
}

export const blankEditor = (): EditorState => ({
  openGraphTitle: '',
  openGraphDescription: '',
  localizedSlug: '',
  title: '',
  summary: '',
  body: '',
  readingTimeMinutes: '5',
  featuredAssetId: '',
  attachmentAssetIds: '',
  tagIds: [],
  seoTitle: '',
  seoDescription: '',
  canonicalUrl: '',
  keywords: '',
  openGraphAssetId: '',
  noIndex: false,
  noFollow: false,
});
export const contentTypes = [
  'ARTICLE',
  'NEWS',
  'STATIC_PAGE',
  'STUDY_GUIDE',
  'FAQ',
  'CHECKLIST',
  'LANDING_PAGE',
];

export function toEditor(value: Localized | undefined, fallbackSlug: string): EditorState {
  if (!value) return { ...blankEditor(), localizedSlug: fallbackSlug };
  const seo = value.seoMetadata;
  return {
    openGraphTitle: seo?.openGraphTitle ?? '',
    openGraphDescription: seo?.openGraphDescription ?? '',
    localizedSlug: value.localizedSlug,
    title: value.title,
    summary: value.summary ?? '',
    body: value.body,
    readingTimeMinutes: String(value.readingTimeMinutes ?? 5),
    featuredAssetId: value.featuredAssetId ?? '',
    attachmentAssetIds: (value.attachmentAssetIds ?? []).join(', '),
    tagIds: value.tagIds ?? [],
    seoTitle: seo?.title ?? '',
    seoDescription: seo?.description ?? '',
    canonicalUrl: seo?.canonicalUrl ?? '',
    keywords: seo?.keywords?.join(', ') ?? '',
    openGraphAssetId: seo?.openGraphAssetId ?? '',
    noIndex: seo?.noIndex ?? false,
    noFollow: seo?.noFollow ?? false,
    version: value.version,
  };
}
export function splitValues(value: string): string[] {
  return [
    ...new Set(
      value
        .split(/[,،\n]/)
        .map((x) => x.trim())
        .filter(Boolean),
    ),
  ];
}
export function messageOf(reason: unknown, language: string = 'ar'): string {
  const readbackMessage = reason instanceof Error ? reason.message : '';
  if (readbackMessage.includes('CMS_ACCEPTED_READBACK_UNAVAILABLE'))
    return language === 'ar'
      ? 'تم قبول العملية لكن تعذر التحقق من الحالة المحفوظة. أعد تحميل المادة قبل أي إجراء آخر.'
      : 'The operation was accepted but its saved state could not be verified. Reload the material before another action.';
  if (/CMS_\w*READBACK_MISMATCH/.test(readbackMessage))
    return language === 'ar'
      ? 'البيانات المقروءة لا تطابق المادة أو النسخة المطلوبة. أعد التحميل.'
      : 'The returned data does not match the requested material or version. Reload it.';
  const tr = (text: string) => translateCms(text, language);
  const message = reason instanceof Error ? reason.message : tr('تعذر إكمال العملية.');
  const explanations: Record<string, string> = {
    MFA_STEP_UP_REQUIRED:
      language === 'ar'
        ? 'يلزم تأكيد المصادقة الإضافية قبل الحفظ. تعديلاتك باقية في المحرر.'
        : 'Confirm MFA before saving. Your edits remain in the editor.',
    MFA_ENROLLMENT_REQUIRED:
      language === 'ar'
        ? 'يلزم تفعيل المصادقة الإضافية قبل هذا الإجراء. تعديلاتك باقية.'
        : 'MFA enrollment is required. Your edits remain in the editor.',
    CMS_ROOT_REVIEW_REQUIRED:
      language === 'ar'
        ? 'تغيير تصنيف مادة منشورة أو قيد المراجعة يتطلب مسار مراجعة بيانات المادة.'
        : 'Published or reviewed content requires the governed root-review workflow before changing classification.',
    CMS_VERSION_CONFLICT: tr(
      'تغيرت النسخة لدى مستخدم آخر. أعد تحميل المادة قبل الحفظ؛ تعديلاتك الحالية لم تُحذف.',
    ),
    CMS_MAKER_CHECKER_VIOLATION: tr(
      'يلزم ناشر آخر لاعتماد هذه النسخة؛ لا يستطيع محررها اعتمادها بنفسه.',
    ),
    CMS_CONTENT_LOCKED_FOR_WORKFLOW: tr(
      'النسخة مقفلة للمراجعة أو الجدولة. أعدها للمسودة عبر الإجراء الرسمي أولًا.',
    ),
    CMS_INVALID_LIFECYCLE_TRANSITION: tr('هذا الإجراء لا يتوافق مع حالة النسخة الحالية.'),
    CMS_REJECTION_REASON_REQUIRED: tr('أدخل سبب إعادة المادة للمحرر.'),
    CMS_UNSAFE_RICH_TEXT: tr(
      'يتضمن النص تنسيق HTML غير مسموح. استخدم العناوين والفقرات والقوائم والروابط الآمنة.',
    ),
  };
  const code = Object.keys(explanations).find((key) => message.includes(key));
  if (code) return explanations[code];
  if (/401|UNAUTHORIZED|AUTHENTICATED_ACTOR_REQUIRED/.test(message))
    return language === 'ar'
      ? 'انتهت الجلسة؛ أعد تسجيل الدخول.'
      : 'Session expired. Sign in again.';
  if (/403|PERMISSION_DENIED|FORBIDDEN/.test(message))
    return language === 'ar'
      ? 'ليست لديك صلاحية لهذا الإجراء.'
      : 'You do not have permission for this action.';
  if (/429|RATE_LIMIT/.test(message))
    return language === 'ar'
      ? 'طلبات كثيرة؛ انتظر قليلًا ثم أعد المحاولة.'
      : 'Too many requests. Wait before retrying.';
  if (/404|NOT_FOUND/.test(message))
    return language === 'ar'
      ? 'السجل غير موجود أو لم يعد متاحًا.'
      : 'This record is missing or no longer available.';

  return tr('تعذر إكمال العملية.');
}
export function labelOf(value: string, language: string = 'ar'): string {
  const tr = (text: string) => translateCms(text, language);
  return (
    (
      {
        ARTICLE: tr('مقال'),
        NEWS: tr('خبر'),
        STUDY_GUIDE: tr('دليل دراسي'),
        CHECKLIST: tr('قائمة تجهيز'),
        FAQ: tr('أسئلة شائعة'),
        STATIC_PAGE: tr('صفحة ثابتة'),
        LANDING_PAGE: tr('صفحة هبوط'),
        MISSING: tr('لا توجد نسخة'),
        ACTIVE: tr('فعال'),
        DRAFT: tr('مسودة'),
        IN_REVIEW: tr('قيد المراجعة'),
        READY_TO_PUBLISH: tr('جاهز للنشر'),
        SCHEDULED: tr('مجدول'),
        PUBLISHED: tr('منشور'),
        ARCHIVED: tr('مؤرشف'),
      } as Record<string, string>
    )[value] ?? value.replaceAll('_', ' ')
  );
}
