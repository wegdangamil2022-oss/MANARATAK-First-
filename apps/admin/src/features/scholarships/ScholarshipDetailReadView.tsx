import type { ScholarshipDto } from '@manaratak/domain';
import { ExternalLink, FileText } from 'lucide-react';

export function scholarshipHttpUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim() || /[\u0000-\u0020\u007f\\]/.test(value))
    return null;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) &&
      !url.username &&
      !url.password &&
      !!url.hostname
      ? url.href
      : null;
  } catch {
    return null;
  }
}
const labels: Record<string, [string, string]> = {
  displayName: ['اسم المنحة', 'Scholarship name'],
  providerName: ['الجهة المانحة', 'Provider'],
  countrySourceLabel: ['بلد الدراسة', 'Study country'],
  countryScope: ['نطاق الدول', 'Country scope'],
  academicYear: ['العام الأكاديمي', 'Academic year'],
  cycleName: ['الدورة', 'Cycle'],
  studyLanguageSourceLabel: ['لغة الدراسة', 'Study language'],
  applicationDeadline: ['الموعد النهائي', 'Deadline'],
  deadlineType: ['نوع الموعد', 'Deadline type'],
  applicationMethod: ['طريقة التقديم', 'Application method'],
  sourceLocale: ['لغة المصدر', 'Source language'],
  description: ['نبذة المنحة', 'Overview'],
  fundingTypeCode: ['نوع التمويل', 'Funding type'],
  amountMinorUnits: ['المبلغ بوحدات العملة الصغرى', 'Amount in minor currency units'],
  amountCurrencyCode: ['العملة', 'Currency'],
  isFullyFunded: ['تمويل كامل مثبت بالحقل', 'Full funding flag'],
  notes: ['الملاحظات', 'Notes'],
  benefitTypeCode: ['نوع الميزة', 'Benefit type'],
  coverageTypeCode: ['التغطية', 'Coverage'],
  amount: ['المبلغ', 'Amount'],
  valueText: ['القيمة الوصفية', 'Source value'],
  durationText: ['المدة', 'Duration'],
  frequencyCode: ['التكرار', 'Frequency'],
  isCovered: ['مشمول', 'Covered'],
  isOptional: ['اختياري', 'Optional'],
  currencyReferenceId: ['مرجع العملة', 'Currency reference'],
  sourceLabel: ['الاسم في المصدر', 'Source label'],
  degreeLevelId: ['مرجع الدرجة', 'Degree reference'],
  majorId: ['مرجع التخصص', 'Major reference'],
  itemTypeCode: ['نوع الشرط', 'Condition type'],
  operatorCode: ['المقارنة', 'Operator'],
  minimumValue: ['الحد الأدنى', 'Minimum'],
  maximumValue: ['الحد الأعلى', 'Maximum'],
  countryReferenceId: ['مرجع الدولة', 'Country reference'],
  internationalTestId: ['مرجع الاختبار', 'Test reference'],
  isRequired: ['إلزامي', 'Required'],
  documentTypeCode: ['نوع المستند', 'Document type'],
  universityId: ['مرجع الجامعة', 'University reference'],
  academicProgramId: ['مرجع البرنامج', 'Program reference'],
  relationshipTypeCode: ['نوع العلاقة', 'Relationship type'],
  applicationUrl: ['بوابة التقديم المباشر', 'Direct application portal'],
  officialWebsite: ['الموقع الرسمي للجهة', 'Provider website'],
  officialSourceUrl: ['دليل الإعلان الرسمي', 'Official announcement'],
  sourceUrl: ['رابط المصدر', 'Source URL'],
  isOfficial: ['مصدر رسمي وفق السجل', 'Official source flag'],
  accessedAt: ['وقت الوصول', 'Access time'],
  verifiedAt: ['وقت التحقق', 'Verification time'],
  title: ['العنوان', 'Title'],
  sourceType: ['نوع المصدر', 'Source type'],
  retrievedAt: ['وقت الجلب', 'Retrieved at'],
  descriptionText: ['الوصف', 'Description'],
  resolutionStatus: ['حالة الربط', 'Resolution state'],
  displayOrder: ['ترتيب العرض', 'Display order'],
  priorityOrder: ['ترتيب الأولوية', 'Priority order'],
  degreeLabel: ['الدرجة', 'Degree'],
  majorLabel: ['التخصص', 'Major'],
  programName: ['البرنامج', 'Program'],
};
export function ScholarshipDetailReadView({
  scholarship,
  tab,
  language,
}: {
  scholarship: ScholarshipDto;
  tab: string;
  language: string;
}) {
  const tr = (ar: string, en: string) => (language === 'ar' ? ar : en);
  const label = (key: string) => labels[key]?.[language === 'ar' ? 0 : 1] ?? key;
  const scalar = (value: unknown): string =>
    value === null || value === undefined || value === ''
      ? tr('غير محدد', 'Not specified')
      : typeof value === 'boolean'
        ? tr(value ? 'نعم' : 'لا', value ? 'Yes' : 'No')
        : typeof value === 'object'
          ? JSON.stringify(value)
          : String(value);
  const data = scholarship as unknown as Record<string, unknown>;
  const fields = (row: Record<string, unknown>, keys: string[]) => (
    <dl className="scholarship-read-grid">
      {keys.map((key) => (
        <div key={key}>
          <dt>{label(key)}</dt>
          <dd>{scalar(row[key])}</dd>
        </div>
      ))}
    </dl>
  );
  const group = (key: string, title: string, columns: string[]) => {
    const rows = Array.isArray(data[key]) ? (data[key] as Record<string, unknown>[]) : [];
    return (
      <section className="scholarship-read-card" key={key}>
        <h2>
          <FileText aria-hidden="true" />
          {title}
        </h2>
        {rows.length ? (
          <div className="scholarship-read-rows">
            {rows.map((row, index) => (
              <article
                key={String(
                  row.targetKey ??
                    row.benefitKey ??
                    row.itemKey ??
                    row.documentKey ??
                    row.linkKey ??
                    index,
                )}
              >
                {fields(row, columns)}
              </article>
            ))}
          </div>
        ) : (
          <p>{tr('لا توجد بيانات محفوظة في هذا القسم.', 'No saved data in this section.')}</p>
        )}
      </section>
    );
  };
  if (tab === 'identity')
    return (
      <section className="scholarship-read-card">
        <h2>{tr('المعلومات الأساسية', 'Basic information')}</h2>
        {fields(data, [
          'displayName',
          'providerName',
          'countrySourceLabel',
          'countryScope',
          'academicYear',
          'cycleName',
          'studyLanguageSourceLabel',
          'applicationDeadline',
          'deadlineType',
          'applicationMethod',
          'sourceLocale',
        ])}
        <details>
          <summary>{tr('المعرّفات التقنية', 'Technical identifiers')}</summary>
          {fields(data, ['publicId', 'id', 'canonicalName', 'canonicalDedupKey'])}
        </details>
      </section>
    );
  if (tab === 'overview' || tab === 'notes')
    return (
      <section className="scholarship-read-card">
        <h2>
          {tr(
            tab === 'overview' ? 'نبذة المنحة' : 'الملاحظات',
            tab === 'overview' ? 'Overview' : 'Notes',
          )}
        </h2>
        <p className="scholarship-long-text">
          {scalar(data[tab === 'overview' ? 'description' : 'notes'])}
        </p>
      </section>
    );
  if (tab === 'funding')
    return (
      <>
        <section className="scholarship-read-card">
          <h2>{tr('التمويل والمزايا', 'Funding and benefits')}</h2>
          {fields(data, [
            'fundingTypeCode',
            'amountMinorUnits',
            'amountCurrencyCode',
            'isFullyFunded',
          ])}
        </section>
        {group('benefits', tr('المزايا المحفوظة', 'Saved benefits'), [
          'benefitTypeCode',
          'coverageTypeCode',
          'amount',
          'currencyReferenceId',
          'valueText',
          'durationText',
          'frequencyCode',
          'isCovered',
          'isOptional',
          'notes',
        ])}
      </>
    );
  if (tab === 'degrees_majors')
    return (
      <>
        {group('degreeTargets', tr('الدرجات المشمولة', 'Degree targets'), [
          'sourceLabel',
          'degreeLevelId',
        ])}
        {group('majorTargets', tr('التخصصات المشمولة', 'Major targets'), [
          'sourceLabel',
          'majorId',
        ])}
        {group('fundedProgramPairs', tr('البرامج الممولة الموثقة', 'Evidenced funded programs'), [
          'degreeLabel',
          'majorLabel',
          'programName',
        ])}
      </>
    );
  if (tab === 'eligibility')
    return group('eligibilityItems', tr('شروط الأهلية', 'Eligibility'), [
      'itemTypeCode',
      'operatorCode',
      'valueText',
      'minimumValue',
      'maximumValue',
      'countryReferenceId',
      'degreeLevelId',
      'majorId',
      'internationalTestId',
      'isRequired',
      'priorityOrder',
    ]);
  if (tab === 'documents')
    return group('requiredDocumentItems', tr('المستندات المطلوبة', 'Required documents'), [
      'displayName',
      'documentTypeCode',
      'description',
      'internationalTestId',
      'sourceLabel',
      'isRequired',
      'displayOrder',
    ]);
  if (tab === 'links_unis')
    return (
      <>
        <section className="scholarship-read-card">
          <h2>{tr('الروابط والمصادر', 'Links and sources')}</h2>
          {['applicationUrl', 'officialWebsite', 'officialSourceUrl', 'sourceUrl'].map((key) => {
            const url = scholarshipHttpUrl(data[key]);
            return (
              <div className="scholarship-source-link" key={key}>
                <strong>{label(key)}</strong>
                {url ? (
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink aria-hidden="true" />
                    {url}
                  </a>
                ) : (
                  <span>{tr('لا يوجد رابط صالح محفوظ.', 'No valid saved link.')}</span>
                )}
                {url?.startsWith('http:') ? (
                  <p>
                    {tr(
                      'اتصال غير مشفر؛ لا تدخل بيانات حساسة.',
                      'Unencrypted connection; do not enter sensitive data.',
                    )}
                  </p>
                ) : null}
              </div>
            );
          })}
        </section>
        {group('sourceEvidence', tr('أدلة المصدر', 'Source evidence'), [
          'sourceUrl',
          'sourceType',
          'isOfficial',
          'retrievedAt',
          'verifiedAt',
          'notes',
        ])}
        {group(
          'universityLinks',
          tr('الجامعات والبرامج المرتبطة', 'Linked universities and programs'),
          ['sourceLabel', 'universityId', 'academicProgramId', 'relationshipTypeCode'],
        )}
      </>
    );
  return null;
}
