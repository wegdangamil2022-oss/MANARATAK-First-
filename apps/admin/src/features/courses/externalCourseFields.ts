import type { CourseDto, ManualExternalCourseInput } from '@manaratak/domain';

export type ExternalSection = 'identity' | 'learning' | 'certificate' | 'content' | 'source';
export const externalSections = [
  { id: 'identity', ar: 'بيانات الدورة الأساسية', en: 'Course identity' },
  { id: 'learning', ar: 'التعلم والتصنيف', en: 'Learning and classification' },
  { id: 'certificate', ar: 'الدراسة والشهادة', en: 'Study and certificate' },
  { id: 'content', ar: 'الوصف والمحتوى الموثق', en: 'Documented content' },
  { id: 'source', ar: 'المصدر والمراجعة والنشر', en: 'Source, review and publication' },
] as const;
export const externalFields: Record<Exclude<ExternalSection, 'source'>, Array<{ key: string; ar: string; en: string; kind?: 'textarea' | 'list' | 'boolean'; immutable?: boolean; required?: boolean }>> = {
  identity: [
    { key: 'originalSourceTitle', ar: 'العنوان الأصلي', en: 'Original title', immutable: true, required: true },
    { key: 'displayName', ar: 'اسم العرض', en: 'Display title' },
    { key: 'platformName', ar: 'اسم منصة المصدر', en: 'Source platform' },
    { key: 'directCourseUrl', ar: 'رابط الدورة الأصلي', en: 'Original course URL', immutable: true, required: true },
  ],
  learning: [
    { key: 'learningLanguageRaw', ar: 'لغة المصدر', en: 'Source language' },
    { key: 'studyLevelRaw', ar: 'مستوى المصدر', en: 'Source level' },
    { key: 'studyDurationRaw', ar: 'المدة كما وردت في المصدر', en: 'Duration as provided by source' },
    { key: 'shortCourseTopicsRaw', ar: 'موضوعات الدورة من المصدر', en: 'Source course topics', kind: 'textarea' },
  ],
  certificate: [
    { key: 'isStudyFree', ar: 'الدراسة مجانية', en: 'Free study', kind: 'boolean' },
    { key: 'isFreeCertificate', ar: 'الشهادة مجانية', en: 'Free certificate', kind: 'boolean' },
    { key: 'certificateAvailable', ar: 'الشهادة متاحة', en: 'Certificate available', kind: 'boolean' },
    { key: 'certificateType', ar: 'نوع الشهادة', en: 'Certificate type' },
    { key: 'certificateConditions', ar: 'شروط الشهادة الموثقة', en: 'Documented certificate conditions', kind: 'textarea' },
  ],
  content: [
    { key: 'description', ar: 'وصف الدورة', en: 'Course description', kind: 'textarea' },
    { key: 'learningOutcomes', ar: 'مخرجات التعلم — عنصر في كل سطر', en: 'Learning outcomes — one per line', kind: 'list' },
    { key: 'prerequisites', ar: 'المتطلبات — عنصر في كل سطر', en: 'Prerequisites — one per line', kind: 'list' },
    { key: 'acquiredSkills', ar: 'المهارات — عنصر في كل سطر', en: 'Skills — one per line', kind: 'list' },
  ],
};
export function externalForm(course?: CourseDto): Record<string, string> {
  const form: Record<string, string> = {};
  const values = { ...course?.optionalFields, ...course } as Record<string, unknown>;
  for (const fields of Object.values(externalFields)) for (const field of fields) {
    const value = values[field.key];
    form[field.key] = field.kind === 'boolean' ? value === true ? 'true' : value === false ? 'false' : '' : Array.isArray(value) ? value.join('\n') : typeof value === 'string' ? value : '';
  }
  form.externalProviderId = course?.externalProviderId ?? '';
  form.evidenceUrl = ''; form.evidenceObservedAt = ''; form.evidenceNote = '';
  return form;
}
export function externalSectionPayload(form: Record<string, string>, section: Exclude<ExternalSection, 'source'>, create = false): Record<string, unknown> {
  return Object.fromEntries(externalFields[section].filter(field => create || !field.immutable).map(field => [field.key,
    field.kind === 'boolean' ? form[field.key] === '' ? null : form[field.key] === 'true' : field.kind === 'list' ? form[field.key].split('\n').map(value => value.trim()).filter(Boolean) : form[field.key].trim(),
  ]));
}
export function manualExternalPayload(form: Record<string, string>): ManualExternalCourseInput {
  const fields = Object.assign({}, ...Object.keys(externalFields).map(section => externalSectionPayload(form, section as Exclude<ExternalSection, 'source'>, true)));
  if (!fields.displayName) delete fields.displayName;
  return { ...fields, externalProviderId: form.externalProviderId, evidenceUrl: form.evidenceUrl.trim(), evidenceObservedAt: new Date(form.evidenceObservedAt).toISOString(), evidenceNote: form.evidenceNote } as ManualExternalCourseInput;
}
export function externalIssue(code: string, tr: (ar: string, en: string) => string): string {
  if (code === 'COURSE_FINISH_EDIT_FIRST') return tr('احفظ تعديل القسم أو ألغِه قبل تنفيذ إجراء آخر.', 'Save or cancel section editing before another operation.');
  if (code === 'TRANSLATION_SOURCE_CHANGED_REVIEW_REQUIRED') return tr('تغير المصدر؛ راجع الترجمة المعتمدة قبل النشر.', 'The source changed; review approved translations before publication.');
  if (/BULK_BUSY/.test(code)) return tr('هناك خطوة قيد التنفيذ لهذه الدفعة. انتظر اكتمالها ثم أعد القراءة.', 'A step is already running for this batch. Wait for it to finish, then reload.');
  if (/BULK_EXPIRED/.test(code)) return tr('انتهت صلاحية هذه المعاينة. أنشئ معاينة جديدة قبل النشر.', 'This preview expired. Create a new preview before publication.');
  if (/BULK_PREVIEW_REQUIRED|BULK_ELIGIBLE_ONLY/.test(code)) return tr('أكمل فحص المعاينة وأكد نشر المؤهل فقط قبل التنفيذ.', 'Complete the preview and explicitly confirm eligible-only publication.');
  if (/BULK_NO_ELIGIBLE/.test(code)) return tr('لا توجد دورات مؤهلة للنشر في هذه المعاينة.', 'No courses are eligible for publication in this preview.');
  if (/BULK_SELECTION_LIMIT/.test(code)) return tr('الحد الأقصى 20 ألف دورة لكل دفعة. ضيّق الفلاتر ثم أعد المعاينة.', 'The limit is 20,000 courses per batch. Narrow the filters and preview again.');
  if (/BULK_EMPTY|BULK_EXTERNAL_SELECTION/.test(code)) return tr('حدد دورات خارجية موجودة فقط، أو حدّث الفلاتر قبل المعاينة.', 'Select existing external courses only, or refresh filters before previewing.');
  if (/BULK_IDEMPOTENCY_CONFLICT|BULK_SNAPSHOT_CONFLICT/.test(code)) return tr('لا تطابق العملية الاختيار الثابت. اقرأ الدفعة المحفوظة أو أنشئ معاينة جديدة.', 'The operation does not match the frozen selection. Reload the saved batch or create a new preview.');
  if (/STALE|STATE_CHANGED|PRECONDITION|409/.test(code)) return tr('تغير السجل منذ فتحه. مدخلاتك محفوظة؛ ألغِ التحرير لقراءة أحدث نسخة ومقارنتها.', 'The record changed. Your input is retained; cancel editing to read and compare the latest version.');
  if (/DUPLICATE/.test(code)) return tr('توجد هوية مطابقة أو دورة مرتبطة بهذا المصدر. راجع السجل الموجود بدل إنشاء نسخة مكررة.', 'A matching source identity or course exists. Review it instead of creating a duplicate.');
  if (/CERTIFICATE_FACTS_CONFLICT/.test(code)) return tr('لا يمكن اعتماد شهادة مجانية مع اختيار أن الشهادة غير متاحة.', 'A free certificate cannot also be unavailable.');
  if (/EVIDENCE_DATE_INVALID/.test(code)) return tr('أدخل تاريخ دليل صحيحًا لا يقع في المستقبل.', 'Enter a valid evidence date that is not in the future.');
  if (/PROVIDER.*NOT_APPROVED|DOMAIN_NOT_APPROVED/.test(code)) return tr('يجب اعتماد المزود ونطاق المصدر أولًا في سجل المزودين.', 'Approve the provider and source domain in the provider registry first.');
  if (/LANGUAGE/.test(code)) return tr('تحتاج لغة التدريس إلى ربط واعتماد مرجع اللغة.', 'The learning language needs an approved canonical reference.');
  if (/TAXONOMY|RELATIONSHIP|SOURCE_TERM/.test(code)) return tr('توجد علاقات أكاديمية أو موضوعات مصدر تحتاج مراجعة واعتمادًا.', 'Academic relationships or source topics still need review.');
  if (/LINK|VERIFICATION/.test(code)) return tr('يلزم تحقق صالح من المصدر ورابط مباشر للدورة قبل المتابعة.', 'A verified source and direct course link are required.');
  if (/COMPLETE|READY|REVIEW_REQUIRED/.test(code)) return tr('أكمل البيانات ومرحلة المراجعة والجاهزية المطلوبة أولًا.', 'Complete the required data, review and readiness stages first.');
  if (/FREE_STUDY/.test(code)) return tr('النشر الخارجي الحالي يتطلب دليل دراسة مجانية على هذه الدورة.', 'External publication currently requires free-study evidence for this course.');
  if (/403|FORBIDDEN/.test(code)) return tr('لا تسمح الصلاحية أو سياسة المصدر بهذا الإجراء.', 'Your permission or source policy does not allow this operation.');
  return tr('تعذر إتمام الإجراء. تحقق من البيانات واتصال الخدمة ثم أعد المحاولة.', 'Could not complete the operation. Check the data and service connection, then retry.');
}
