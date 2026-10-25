import { useState } from 'react';
import {
  Save,
  Plus,
  School,
  Globe2,
  ShieldCheck,
  MapPin,
  Building2,
  Coins,
  House,
  Award,
} from 'lucide-react';
import { adminApiClient } from '../api/client';
import { canonicalPickerApi } from '../api/canonicalPickers';
import { CanonicalPicker } from './CanonicalPicker';

export type Row = Record<string, unknown>;
export type Field = {
  key: string;
  label: string;
  type?: 'number' | 'boolean' | 'lines' | 'date' | 'select' | 'currency';
  options?: string[];
  optionLabels?: Record<string, string>;
};
export const sectionDefinitions: {
  key: string;
  title: string;
  fields: Field[];
  defaults?: Row;
  canAdd?: boolean;
}[] = [
  {
    key: 'accreditations',
    title: 'الاعتمادات',
    canAdd: true,
    defaults: { reviewStatus: 'NEEDS_REVIEW' },
    fields: [
      { key: 'name', label: 'اسم الاعتماد' },
      { key: 'organization', label: 'الجهة' },
      { key: 'officialUrl', label: 'الرابط الرسمي' },
      {
        key: 'reviewStatus',
        label: 'حالة المراجعة',
        type: 'select',
        options: ['NEEDS_REVIEW', 'APPROVED', 'REJECTED'],
      },
      { key: 'note', label: 'ملاحظات' },
    ],
  },
  {
    key: 'campuses',
    title: 'الحرم الجامعي',
    canAdd: true,
    fields: [
      { key: 'name', label: 'الاسم' },
      { key: 'address', label: 'العنوان' },
      { key: 'campusType', label: 'نوع الحرم' },
      { key: 'status', label: 'الحالة', type: 'select', options: ['ACTIVE', 'ARCHIVED'] },
    ],
  },
  {
    key: 'organizationUnits',
    title: 'الكليات والأقسام',
    canAdd: true,
    defaults: { unitType: 'FACULTY', status: 'ACTIVE' },
    fields: [
      { key: 'name', label: 'الاسم' },
      {
        key: 'unitType',
        label: 'النوع',
        type: 'select',
        options: ['FACULTY', 'SCHOOL', 'COLLEGE', 'DEPARTMENT'],
      },
      { key: 'status', label: 'الحالة', type: 'select', options: ['ACTIVE', 'ARCHIVED'] },
    ],
  },
  {
    key: 'tuitionProfiles',
    title: 'الرسوم الدراسية',
    canAdd: true,
    defaults: { profileType: 'ANNUAL' },
    fields: [
      { key: 'profileType', label: 'نوع الرسوم' },
      { key: 'organizationUnitName', label: 'الكلية أو البرنامج' },
      { key: 'amount', label: 'المبلغ', type: 'number' },
      { key: 'currencyCode', label: 'رمز العملة' },
      { key: 'currencyReferenceId', label: 'العملة المعتمدة', type: 'currency' },
      { key: 'officialSourceUrl', label: 'رابط الرسوم الرسمي' },
    ],
  },
  {
    key: 'accommodationProfiles',
    title: 'السكن وتكاليف المعيشة',
    canAdd: true,
    fields: [
      { key: 'accommodationAvailable', label: 'السكن متاح', type: 'boolean' },
      { key: 'internationalEligible', label: 'متاح للطلاب الدوليين', type: 'boolean' },
      { key: 'typicalCost', label: 'تكلفة السكن', type: 'number' },
      { key: 'currencyCode', label: 'عملة السكن' },
      { key: 'currencyReferenceId', label: 'عملة السكن المعتمدة', type: 'currency' },
      { key: 'averageMonthlyLivingCost', label: 'المعيشة الشهرية', type: 'number' },
      { key: 'livingCostCurrencyCode', label: 'عملة المعيشة' },
      { key: 'livingCostCurrencyReferenceId', label: 'عملة المعيشة المعتمدة', type: 'currency' },
      { key: 'costVariationNote', label: 'ملاحظات التكلفة' },
    ],
  },
  {
    key: 'rankings',
    title: 'التصنيفات',
    canAdd: true,
    defaults: { provider: 'QS', scope: 'GLOBAL' },
    fields: [
      { key: 'provider', label: 'الجهة', type: 'select', options: ['QS', 'THE', 'ARWU'] },
      { key: 'rankingYear', label: 'السنة', type: 'number' },
      { key: 'rank', label: 'المرتبة أو نطاق الترتيب' },
      { key: 'scope', label: 'نطاق التصنيف' },
      { key: 'scopeLabel', label: 'اسم النطاق' },
      { key: 'officialSourceUrl', label: 'رابط الدليل الرسمي' },
      { key: 'verifiedAt', label: 'تاريخ التحقق', type: 'date' },
      { key: 'note', label: 'ملاحظات' },
    ],
  },
];
const identityFields: Field[] = [
  { key: 'displayName', label: 'اسم العرض' },
  { key: 'institutionType', label: 'نوع المؤسسة' },
  { key: 'institutionalOwnership', label: 'الملكية (حكومية / خاصة)' },
  { key: 'foundedYear', label: 'سنة التأسيس', type: 'number' },
  { key: 'description', label: 'نبذة عن الجامعة', type: 'lines' },
  { key: 'officialWebsite', label: 'الموقع الرسمي' },
  { key: 'officialSourceUrl', label: 'رابط المصدر الرسمي' },
  { key: 'contactEmail', label: 'البريد الإلكتروني' },
  { key: 'contactPhone', label: 'الهاتف' },
  { key: 'languagesOfInstruction', label: 'لغات الدراسة (كل لغة في سطر)', type: 'lines' },
  { key: 'generalRequiredDocuments', label: 'الوثائق المطلوبة (كل وثيقة في سطر)', type: 'lines' },
  {
    key: 'additionalGraduateRequirements',
    label: 'متطلبات الدراسات العليا (كل متطلب في سطر)',
    type: 'lines',
  },
  { key: 'officialRequiredDocumentsUrl', label: 'رابط الوثائق الرسمي' },
];
const admissionsFields: Field[] = [
  { key: 'acceptsInternationalStudents', label: 'تقبل الطلاب الدوليين', type: 'boolean' },
  { key: 'acceptsDescription', label: 'تفاصيل القبول', type: 'lines' },
  { key: 'undergradAdmissionUrl', label: 'رابط قبول البكالوريوس' },
  { key: 'postgradAdmissionUrl', label: 'رابط قبول الدراسات العليا' },
  { key: 'internationalStudentsUrl', label: 'رابط الطلاب الدوليين' },
  { key: 'applicationPortalUrl', label: 'بوابة التقديم' },
];
const nullableKeys = new Set([
  'campusSourceReferenceId',
  'parentSourceReferenceId',
  'campusType',
  'address',
  'organizationUnitName',
  'amount',
  'currencyCode',
  'officialSourceUrl',
  'effectiveFrom',
  'effectiveTo',
  'accommodationAvailable',
  'internationalEligible',
  'typicalCost',
  'averageMonthlyLivingCost',
  'livingCostCurrencyCode',
  'costVariationNote',
  'scopeLabel',
  'note',
]);
const listKeys = new Set([
  'languagesOfInstruction',
  'generalRequiredDocuments',
  'additionalGraduateRequirements',
]);
export function fieldsForm(
  fields: Field[],
  row: Row,
  change: (key: string, value: unknown) => void,
  disabled: boolean,
  ar = true,
  allowReferences = true,
) {
  return (
    <fieldset disabled={disabled} className="grid gap-3 md:grid-cols-2">
      {fields.map((field) => {
        const value = row[field.key];
        const text = Array.isArray(value) ? value.join('\n') : value == null ? '' : String(value);
        return (
          <label key={field.key} className="text-xs font-bold text-[#142B5F]">
            {field.label}
            {field.type === 'currency' && !allowReferences ? (
              <span className="block mt-1">
                {text || (ar ? 'غير محددة' : 'Unspecified')}
                <small className="block">
                  {ar
                    ? 'تغيير العملة يتطلب صلاحية البيانات المرجعية.'
                    : 'Changing currency requires reference-data permission.'}
                </small>
              </span>
            ) : field.type === 'currency' ? (
              <CanonicalPicker
                label={field.label}
                value={typeof value === 'string' ? value : null}
                load={() => canonicalPickerApi.currencies()}
                reloadKey="university-currencies"
                onChange={(next, option) => {
                  change(field.key, next);
                  change(
                    field.key === 'livingCostCurrencyReferenceId'
                      ? 'livingCostCurrencyCode'
                      : 'currencyCode',
                    option?.code ?? null,
                  );
                }}
                optional
                disabled={disabled}
              />
            ) : field.type === 'boolean' ? (
              <select
                value={value == null ? '' : String(value)}
                onChange={(e) =>
                  change(field.key, e.target.value === '' ? null : e.target.value === 'true')
                }
                className="mt-1 w-full rounded-lg border p-2"
              >
                <option value="">{ar ? 'غير محدد' : 'Not specified'}</option>
                <option value="true">{ar ? 'نعم' : 'Yes'}</option>
                <option value="false">{ar ? 'لا' : 'No'}</option>
              </select>
            ) : field.type === 'select' ? (
              <select
                value={text}
                onChange={(e) => change(field.key, e.target.value)}
                className="mt-1 w-full rounded-lg border p-2"
              >
                <option value="">{ar ? 'اختر' : 'Choose'}</option>
                {field.options?.map((option) => (
                  <option key={option} value={option}>
                    {field.optionLabels?.[option] ?? option}
                  </option>
                ))}
              </select>
            ) : field.type === 'lines' ? (
              <textarea
                rows={4}
                value={text}
                onChange={(e) =>
                  change(
                    field.key,
                    listKeys.has(field.key) ? e.target.value.split('\n') : e.target.value,
                  )
                }
                className="mt-1 w-full rounded-lg border p-2"
              />
            ) : (
              <input
                type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                value={field.type === 'date' ? text.slice(0, 10) : text}
                onChange={(e) =>
                  change(
                    field.key,
                    field.type === 'number'
                      ? e.target.value === ''
                        ? null
                        : Number(e.target.value)
                      : e.target.value,
                  )
                }
                className="mt-1 w-full rounded-lg border p-2"
              />
            )}
          </label>
        );
      })}
    </fieldset>
  );
}
export function hydrateUniversityStructureRows(key: string, source: Row[]): Row[] {
  return source.map((row) =>
    key === 'organizationUnits'
      ? {
          ...row,
          campusSourceReferenceId: row.campusSourceReferenceId ?? row.campusId ?? null,
          parentSourceReferenceId:
            row.parentSourceReferenceId ?? row.parentOrganizationUnitId ?? null,
        }
      : { ...row },
  );
}
export function UniversitySectionsEditor({
  id,
  initial,
  disabled,
  onDirtyChange,
  onSaved,
  reviewReason,
}: {
  id: string;
  reviewReason: string;
  initial: Row;
  disabled: boolean;
  onDirtyChange: (dirty: boolean) => void;
  onSaved: () => Promise<void>;
}) {
  const readIdentity = () =>
    Object.fromEntries(
      identityFields.map((field) => [
        field.key,
        initial[field.key] ?? (listKeys.has(field.key) ? [] : ''),
      ]),
    );
  const [identity, setIdentity] = useState<Row>(readIdentity);
  const [admissions, setAdmissions] = useState<Row>((initial.internationalAdmissions as Row) ?? {});
  const [rows, setRows] = useState<Record<string, Row[]>>(() =>
    Object.fromEntries(
      sectionDefinitions.map((section) => [
        section.key,
        hydrateUniversityStructureRows(section.key, (initial[section.key] as Row[]) ?? []),
      ]),
    ),
  );
  const [revision, setRevision] = useState(initial.revision);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const mark = (key: string) => {
    setDirty((current) => new Set(current).add(key));
    onDirtyChange(true);
  };
  const save = async (key: string) => {
    if (!reviewReason.trim()) {
      setError('اكتب سبب التعديل أو المراجعة قبل الحفظ.');
      return;
    }
    setSaving(key);
    setError('');
    setMessage('');
    try {
      const identityPayload = {
        ...identity,
        foundedYear: identity.foundedYear === '' ? null : identity.foundedYear,
      };
      const data =
        key === 'identity'
          ? identityPayload
          : key === 'admissions'
            ? { internationalAdmissions: admissions }
            : key === 'accreditations'
              ? { accreditations: rows[key] }
              : {
                  [key]: rows[key].map((row) =>
                    Object.fromEntries(
                      Object.entries(row)
                        .map(
                          ([field, value]) =>
                            [
                              field,
                              nullableKeys.has(field) && value === '' ? null : value,
                            ] as const,
                        )
                        .map(
                          ([field, value]) =>
                            [
                              field,
                              [
                                'amount',
                                'typicalCost',
                                'averageMonthlyLivingCost',
                                'rankingYear',
                                'latitude',
                                'longitude',
                              ].includes(field) &&
                              value != null &&
                              value !== ''
                                ? Number(value)
                                : value,
                            ] as const,
                        )
                        .filter(
                          ([field, value]) =>
                            ![
                              'universityId',
                              'createdAt',
                              'updatedAt',
                              'campusId',
                              'parentOrganizationUnitId',
                            ].includes(field) &&
                            ((value != null && value !== '') || nullableKeys.has(field)),
                        ),
                    ),
                  ),
                };
      await adminApiClient.request(
        `/admin/universities/${encodeURIComponent(id)}${key === 'identity' || key === 'admissions' || key === 'accreditations' ? '' : '/normalized-details'}`,
        {
          method:
            key === 'identity' || key === 'admissions' || key === 'accreditations'
              ? 'PATCH'
              : 'PUT',
          headers: { 'X-Review-Reason': reviewReason.trim(), 'If-Match': String(revision) },
          body: JSON.stringify(data),
        },
      );
      const saved = await adminApiClient.request<Row>(
        `/admin/universities/${encodeURIComponent(id)}`,
      );
      setRevision(saved.revision);
      if (key === 'identity')
        setIdentity(
          Object.fromEntries(
            identityFields.map((field) => [
              field.key,
              saved[field.key] ?? (listKeys.has(field.key) ? [] : ''),
            ]),
          ),
        );
      else if (key === 'admissions') setAdmissions((saved.internationalAdmissions as Row) ?? {});
      else
        setRows((current) => ({
          ...current,
          [key]: hydrateUniversityStructureRows(key, (saved[key] as Row[]) ?? []),
        }));
      const next = new Set(dirty);
      next.delete(key);
      setDirty(next);
      onDirtyChange(next.size > 0);
      await onSaved();
      setMessage('تم الحفظ وإعادة قراءة القسم من الخادم.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر الحفظ.');
    } finally {
      setSaving('');
    }
  };
  const button = (key: string) => (
    <button
      type="button"
      disabled={disabled || !!saving || !dirty.has(key)}
      onClick={() => void save(key)}
      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0E7C86] px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
    >
      <Save size={16} />
      {saving === key ? 'جارٍ الحفظ…' : 'حفظ القسم'}
      {dirty.has(key) ? ' *' : ''}
    </button>
  );
  return (
    <div className="space-y-5" dir="rtl">
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-emerald-700">
          {message}
        </p>
      )}
      <section
        id="university-section-identity"
        className="scroll-mt-28 rounded-2xl border bg-white p-5"
      >
        <h3 className="mb-4 flex items-center gap-2 font-black text-[#142B5F]">
          <School className="h-5 w-5 text-[#D6A43B]" aria-hidden="true" />
          الهوية والبيانات الأساسية والوثائق
        </h3>
        {fieldsForm(
          identityFields,
          identity,
          (key, value) => {
            setIdentity((current) => ({ ...current, [key]: value }));
            mark('identity');
          },
          disabled || !!saving,
        )}
        {button('identity')}
      </section>
      <section
        id="university-section-admissions"
        className="scroll-mt-28 rounded-2xl border bg-white p-5"
      >
        <h3 className="mb-4 flex items-center gap-2 font-black text-[#142B5F]">
          <Globe2 className="h-5 w-5 text-[#0E7C86]" aria-hidden="true" />
          قبول الطلاب الدوليين والتقديم
        </h3>
        {fieldsForm(
          admissionsFields,
          admissions,
          (key, value) => {
            setAdmissions((current) => ({ ...current, [key]: value }));
            mark('admissions');
          },
          disabled || !!saving,
        )}
        {button('admissions')}
      </section>
      {sectionDefinitions.map((section) => (
        <section
          key={section.key}
          id={'university-section-' + section.key}
          className="scroll-mt-28 rounded-2xl border bg-white p-5"
        >
          <h3 className="mb-4 flex items-center gap-2 font-black text-[#142B5F]">
            {section.key === 'accreditations' ? (
              <ShieldCheck className="h-5 w-5 text-[#0E7C86]" aria-hidden="true" />
            ) : section.key === 'campuses' ? (
              <MapPin className="h-5 w-5 text-[#D6A43B]" aria-hidden="true" />
            ) : section.key === 'organizationUnits' ? (
              <Building2 className="h-5 w-5 text-[#142B5F]" aria-hidden="true" />
            ) : section.key === 'tuitionProfiles' ? (
              <Coins className="h-5 w-5 text-[#D6A43B]" aria-hidden="true" />
            ) : section.key === 'accommodationProfiles' ? (
              <House className="h-5 w-5 text-[#0E7C86]" aria-hidden="true" />
            ) : (
              <Award className="h-5 w-5 text-[#142B5F]" aria-hidden="true" />
            )}
            {section.title}
          </h3>
          {rows[section.key].map((row, index) => (
            <div key={String(row.id ?? index)} className="mb-3 rounded-xl border p-3">
              {fieldsForm(
                section.key === 'organizationUnits'
                  ? [
                      ...section.fields,
                      {
                        key: 'campusSourceReferenceId',
                        label: 'الحرم الجامعي',
                        type: 'select' as const,
                        options: rows.campuses
                          .map((item) => String(item.id ?? item.sourceReferenceId ?? ''))
                          .filter(Boolean),
                        optionLabels: Object.fromEntries(
                          rows.campuses.map((item) => [
                            String(item.id ?? item.sourceReferenceId ?? ''),
                            String(item.name ?? ''),
                          ]),
                        ),
                      },
                      {
                        key: 'parentSourceReferenceId',
                        label: 'الكلية أو الوحدة الأم',
                        type: 'select' as const,
                        options: rows.organizationUnits
                          .filter(
                            (item) =>
                              item !== row &&
                              item.unitType !== 'DEPARTMENT' &&
                              item.status !== 'ARCHIVED',
                          )
                          .map((item) => String(item.id ?? item.sourceReferenceId ?? ''))
                          .filter(Boolean),
                        optionLabels: Object.fromEntries(
                          rows.organizationUnits.map((item) => [
                            String(item.id ?? item.sourceReferenceId ?? ''),
                            String(item.name ?? ''),
                          ]),
                        ),
                      },
                    ]
                  : section.fields,
                row,
                (key, value) => {
                  setRows((current) => ({
                    ...current,
                    [section.key]: current[section.key].map((item, i) =>
                      i === index ? { ...item, [key]: value } : item,
                    ),
                  }));
                  mark(section.key);
                },
                disabled || !!saving,
              )}
            </div>
          ))}
          {!rows[section.key].length && (
            <p className="text-sm text-slate-500">لا توجد بيانات محفوظة لهذا القسم.</p>
          )}
          {section.canAdd && (
            <button
              type="button"
              disabled={disabled || !!saving}
              onClick={() => {
                setRows((current) => ({
                  ...current,
                  [section.key]: [
                    ...current[section.key],
                    {
                      ...section.defaults,
                      ...(['campuses', 'organizationUnits'].includes(section.key)
                        ? { sourceReferenceId: `admin-${section.key}-${crypto.randomUUID()}` }
                        : {}),
                    },
                  ],
                }));
                mark(section.key);
              }}
              className="ml-3 text-sm font-bold text-[#0E7C86]"
            >
              <Plus size={16} className="inline" /> إضافة سجل
            </button>
          )}
          {button(section.key)}
        </section>
      ))}
    </div>
  );
}
