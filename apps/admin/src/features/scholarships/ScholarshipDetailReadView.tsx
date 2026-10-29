import type { ScholarshipDto } from '@manaratak/domain';
import { ScholarshipEligibilityCriteria } from './ScholarshipEligibilityCriteria';
import { ExternalLink, FileText, Pencil } from 'lucide-react';
import {
  benefitText,
  scholarshipPresentation,
  scholarshipHttpUrl,
} from './ScholarshipPresentation';
export { scholarshipHttpUrl } from './ScholarshipPresentation';

const labels: Record<string, [string, string]> = {
  displayName: ['اسم المنحة', 'Scholarship name'],
  educationalDegree: ['الدرجة التعليمية', 'Educational degree'],
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
  sourceTypeCode: ['نوع المصدر', 'Source type'],
  sourceName: ['اسم المصدر', 'Source name'],
  trustLevel: ['مستوى الثقة', 'Trust level'],
  capturedAt: ['وقت توثيق المصدر', 'Captured at'],
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
  onEdit,
  onCriterionSaved,
  onCriterionDirtyChange,
}: {
  scholarship: ScholarshipDto;
  tab: string;
  language: string;
  onEdit?: (field?: string) => void;
  onCriterionSaved?: (updated: ScholarshipDto) => Promise<void>;
  onCriterionDirtyChange?: (dirty: boolean) => void;
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
  const presentation = scholarshipPresentation(scholarship, language === 'ar');
  const edit = (field: string, title: string) =>
    onEdit ? (
      <button
        type="button"
        className="scholarship-card-edit"
        aria-label={`${tr('تعديل', 'Edit')} ${title}`}
        onClick={() => onEdit(field)}
      >
        <Pencil aria-hidden="true" />
        {tr('تعديل', 'Edit')}
      </button>
    ) : null;
  const textCards = (
    rows: Array<{ key: string; title: string; text: string }>,
    section: string,
  ) => (
    <section className="scholarship-read-card">
      <div className="scholarship-group-heading">
        <h2>{section}</h2>
        {edit('collection', section)}
      </div>
      <div className="scholarship-card-grid">
        {rows.map((row, index) => (
          <article key={row.key} className="scholarship-editor-card">
            <div className="scholarship-card-heading">
              <h3>{row.title.length > 80 ? `${section} · ${index + 1}` : row.title}</h3>
              {edit(row.key, row.title.length > 80 ? `${section} · ${index + 1}` : row.title)}
            </div>
            {row.text !== row.title || row.title.length > 80 ? (
              <p className="scholarship-long-text">{row.text || tr('غير محدد', 'Not specified')}</p>
            ) : null}
          </article>
        ))}
      </div>
      {!rows.length && (
        <p>{tr('لا توجد بيانات محفوظة في هذا القسم.', 'No saved data in this section.')}</p>
      )}
    </section>
  );
  const fieldValue = (key: string, value: unknown) => {
    if (
      ['applicationDeadline', 'accessedAt', 'retrievedAt', 'capturedAt', 'verifiedAt'].includes(
        key,
      ) &&
      value
    ) {
      const date = new Date(String(value));
      if (Number.isFinite(+date))
        return (
          new Intl.DateTimeFormat(language, {
            dateStyle: 'medium',
            ...(key === 'applicationDeadline' ? {} : { timeStyle: 'short' as const }),
            timeZone: 'UTC',
          }).format(date) + ' UTC'
        );
    }
    return scalar(value);
  };
  const fields = (row: Record<string, unknown>, keys: string[], editable = true) => (
    <dl className="scholarship-read-grid">
      {keys.map((key) => (
        <div key={key}>
          <dt>{label(key)}</dt>
          <dd>{fieldValue(key, row[key])}</dd>
          {editable && edit(key, label(key))}
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
                {fields(row, columns, false)}
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
        {fields(
          {
            ...data,
            educationalDegree: (scholarship.degreeTargets ?? [])
              .map((item) => item.sourceLabel || item.degreeLevelId)
              .filter(Boolean)
              .join('، '),
            fundingTypeCode: ['FULL', 'FULLY_FUNDED'].includes(scholarship.fundingTypeCode ?? '')
              ? tr('تمويل كامل', 'Full funding')
              : ['PARTIAL', 'PARTIALLY_FUNDED'].includes(scholarship.fundingTypeCode ?? '')
                ? tr('تمويل جزئي', 'Partial funding')
                : scholarship.fundingTypeCode,
          },
          [
            'displayName',
            'providerName',
            'countrySourceLabel',
            ...(scholarship.academicYear ? ['academicYear'] : []),
            'studyLanguageSourceLabel',
            'applicationDeadline',
            'educationalDegree',
            'fundingTypeCode',
          ],
        )}
        {!scholarship.academicYear &&
          edit('academicYear', tr('إضافة السنة الدراسية', 'Add academic year'))}
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
        {edit(
          tab === 'overview' ? 'description' : 'notes',
          tr(
            tab === 'overview' ? 'نبذة المنحة' : 'الملاحظات',
            tab === 'overview' ? 'Overview' : 'Notes',
          ),
        )}
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
        {presentation.fundingGroups.map((funding) => (
          <div key={funding.id}>
            {textCards(
              funding.benefitKeys.map((key) => {
                const item = scholarship.benefits!.find((row) => row.benefitKey === key)!;
                return {
                  key,
                  title: item.valueText?.split('\n')[0] || tr('ميزة المنحة', 'Scholarship benefit'),
                  text: benefitText(item, language === 'ar'),
                };
              }),
              funding.title || tr('مجموعة تمويل', 'Funding group'),
            )}
          </div>
        ))}
        {edit('funding-groups', tr('إضافة مجموعة تمويل', 'Add funding group'))}
      </>
    );
  if (tab === 'degrees_majors')
    return (
      <>
        {(scholarship.degreeTargets ?? []).map((degree) => (
          <div key={degree.targetKey}>
            {textCards(
              (scholarship.majorTargets ?? [])
                .filter((major) => major.metadata?.degreeTargetKey === degree.targetKey)
                .map((major) => ({
                  key: major.targetKey,
                  title: major.sourceLabel || tr('تخصص', 'Major'),
                  text: major.sourceLabel || '',
                })),
              degree.sourceLabel ||
                degree.degreeLevelId ||
                tr('درجة تعليمية', 'Educational degree'),
            )}
          </div>
        ))}
        {!!scholarship.majorTargets?.filter(
          (major) =>
            !major.metadata?.degreeTargetKey ||
            !scholarship.degreeTargets?.some(
              (degree) => degree.targetKey === major.metadata?.degreeTargetKey,
            ),
        ).length &&
          textCards(
            scholarship.majorTargets
              .filter(
                (major) =>
                  !major.metadata?.degreeTargetKey ||
                  !scholarship.degreeTargets?.some(
                    (degree) => degree.targetKey === major.metadata?.degreeTargetKey,
                  ),
              )
              .map((major) => ({
                key: major.targetKey,
                title: major.sourceLabel || tr('تخصص', 'Major'),
                text: major.sourceLabel || '',
              })),
            tr('تخصصات مشتركة أو غير موزعة', 'Shared or unassigned majors'),
          )}
        {!scholarship.degreeTargets?.length && (
          <p>{tr('لم تُحدّد الدرجات بعد.', 'No degrees specified yet.')}</p>
        )}
        {group('fundedProgramPairs', tr('البرامج الممولة الموثقة', 'Evidenced funded programs'), [
          'degreeLabel',
          'majorLabel',
          'programName',
        ])}
      </>
    );
  if (tab === 'eligibility')
    return (
      <ScholarshipEligibilityCriteria
        scholarship={scholarship}
        language={language}
        onSaved={onCriterionSaved}
        onDirtyChange={onCriterionDirtyChange}
      />
    );
  if (tab === 'documents')
    return textCards(
      (scholarship.requiredDocumentItems ?? []).map((item) => ({
        key: item.documentKey,
        title: item.displayName,
        text: item.description || item.displayName,
      })),
      tr('المستندات المطلوبة', 'Required documents'),
    );
  if (tab === 'links_unis')
    return (
      <>
        {presentation.sourceGroups.map((sourceGroup) => (
          <section className="scholarship-read-card" key={sourceGroup.id}>
            <div className="scholarship-group-heading">
              <h2>{sourceGroup.title || tr('الروابط والمصادر', 'Links and sources')}</h2>
              {edit(sourceGroup.id, tr('قسم الروابط', 'Link section'))}
            </div>
            <div className="scholarship-card-grid">
              {sourceGroup.links.map((link) => {
                const url = scholarshipHttpUrl(link.url);
                return (
                  <div className="scholarship-source-link scholarship-editor-card" key={link.id}>
                    <strong>{link.title}</strong>
                    {edit(link.id, link.title)}
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
            </div>
          </section>
        ))}
        {edit('source-groups', tr('إضافة قسم روابط', 'Add link section'))}
        {!!scholarship.sourceEvidence?.length && (
          <details className="scholarship-read-card">
            <summary>{tr('أدلة الاستيراد الأصلية', 'Original source evidence')}</summary>
            {group('sourceEvidence', tr('أدلة المصدر', 'Source evidence'), [
              'sourceName',
              'sourceUrl',
              'sourceTypeCode',
              'trustLevel',
              'isOfficial',
              'capturedAt',
              'verifiedAt',
            ])}
          </details>
        )}
        {group(
          'universityLinks',
          tr('الجامعات والبرامج المرتبطة', 'Linked universities and programs'),
          ['sourceLabel', 'universityId', 'academicProgramId', 'relationshipTypeCode'],
        )}
      </>
    );
  return null;
}
