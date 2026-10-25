import { useCallback, useEffect, useState } from 'react';
import { useAdminAuthorization } from '../../security/AdminAuthorizationContext';
import {
  Plus,
  Pencil,
  Save,
  X,
  Archive,
  Trash2,
  Award,
  MapPin,
  Building2,
  ShieldCheck,
} from 'lucide-react';
import { universityStateLabels } from './UniversityLabels';
import {
  fieldsForm,
  sectionDefinitions,
  hydrateUniversityStructureRows,
  type Row,
  type Field,
} from '../../components/UniversitySectionsEditor';
import { Value, type UniversityData, type Commit } from './UniversityStageCard';
const english: Record<string, string> = {
  name: 'Name',
  organization: 'Organization',
  officialUrl: 'Official URL',
  reviewStatus: 'Review state',
  note: 'Notes',
  address: 'Address',
  campusType: 'Campus type',
  status: 'State',
  unitType: 'Unit type',
  campusSourceReferenceId: 'Campus',
  parentSourceReferenceId: 'Parent faculty',
  profileType: 'Tuition context',
  organizationUnitName: 'Faculty or program',
  amount: 'Amount',
  currencyCode: 'Currency code',
  currencyReferenceId: 'Canonical currency',
  officialSourceUrl: 'Official evidence URL',
  accommodationAvailable: 'Accommodation available',
  internationalEligible: 'International students eligible',
  typicalCost: 'Accommodation cost',
  averageMonthlyLivingCost: 'Monthly living cost',
  livingCostCurrencyCode: 'Living currency code',
  livingCostCurrencyReferenceId: 'Canonical living currency',
  costVariationNote: 'Cost variation',
  provider: 'Ranking provider',
  rankingYear: 'Ranking year',
  rank: 'Rank or band',
  scope: 'Scope',
  scopeLabel: 'Scope label',
  verifiedAt: 'Verification date',
};
const addNames: Record<string, [string, string]> = {
  campuses: ['إضافة حرم جامعي', 'Add campus'],
  organizationUnits: ['إضافة كلية / قسم', 'Add faculty / department'],
  accreditations: ['إضافة اعتماد', 'Add accreditation'],
  tuitionProfiles: ['إضافة رسوم تخصصية', 'Add tuition profile'],
  accommodationProfiles: ['إضافة سجل سكن / معيشة', 'Add accommodation / living profile'],
  rankings: ['إضافة تصنيف', 'Add ranking'],
};
export function universityNormalizedPayload(kind: string, rows: Row[], fields: Field[]) {
  const nullable = new Set([
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
  const extras =
    kind === 'campuses'
      ? [
          'countryReferenceId',
          'regionReferenceId',
          'cityReferenceId',
          'latitude',
          'longitude',
          'coordinateSource',
        ]
      : kind === 'organizationUnits'
        ? ['campusSourceReferenceId', 'parentSourceReferenceId']
        : kind === 'tuitionProfiles'
          ? ['effectiveFrom', 'effectiveTo']
          : [];
  const allowed = new Set([
    ...fields.map((f) => f.key),
    ...extras,
    'id',
    'sourceReferenceId',
    'metadata',
  ]);
  return rows.map((row) =>
    Object.fromEntries(
      Object.entries(row)
        .filter(
          ([key, v]) => allowed.has(key) && v !== undefined && (v !== '' || nullable.has(key)),
        )
        .map(([key, value]) => [
          key,
          value === '' && nullable.has(key)
            ? null
            : ['amount', 'typicalCost', 'averageMonthlyLivingCost', 'rankingYear'].includes(key) &&
                value !== null
              ? Number(value)
              : value,
        ]),
    ),
  );
}
export function UniversityNormalizedCard({
  kind,
  title,
  university,
  ar,
  editing,
  busy,
  disabled,
  onEdit,
  onCancel,
  onDirty,
  commit,
  confirm,
  filter,
  fieldKeys,
  provider,
  embedded = false,
}: {
  kind: string;
  title: string;
  university: UniversityData;
  ar: boolean;
  editing: boolean;
  busy: boolean;
  disabled: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onDirty: (dirty: boolean) => void;
  commit: Commit;
  confirm: (message: string, action: () => void) => void;
  filter?: (row: Row) => boolean;
  fieldKeys?: string[];
  provider?: string;
  embedded?: boolean;
}) {
  const { hasPermission } = useAdminAuthorization();
  const canReadReferences = hasPermission('admin:reference-data:manage');
  const definition = sectionDefinitions.find((s) => s.key === kind)!;
  const read = useCallback(
    () => hydrateUniversityStructureRows(kind, (university[kind] as Row[]) ?? []),
    [kind, university],
  );
  const [rows, setRows] = useState(read),
    [reason, setReason] = useState(''),
    [error, setError] = useState('');
  const dirty = editing && (JSON.stringify(rows) !== JSON.stringify(read()) || !!reason);
  useEffect(() => onDirty(dirty), [dirty, onDirty]);
  useEffect(() => {
    if (!editing) {
      setRows(read());
      setReason('');
      setError('');
    }
  }, [editing, read]);
  const baseFields = definition.fields;
  const visibleFields = baseFields
    .filter((f) => !fieldKeys || fieldKeys.includes(f.key))
    .map((f) => ({
      ...f,
      label: ar ? f.label : (english[f.key] ?? f.key),
      ...(ar && f.options
        ? {
            optionLabels: Object.fromEntries(
              f.options.map((option) => [option, universityStateLabels[option] ?? option]),
            ),
          }
        : {}),
    }));
  if (kind === 'organizationUnits')
    for (const [key, values, label] of [
      [
        'campusSourceReferenceId',
        (university.campuses as Row[]) ?? [],
        ar ? 'الحرم الجامعي' : 'Campus',
      ],
      [
        'parentSourceReferenceId',
        rows.filter((r) => r.unitType !== 'DEPARTMENT' && r.status !== 'ARCHIVED'),
        ar ? 'الوحدة الأم' : 'Parent faculty',
      ],
    ] as const)
      visibleFields.push({
        key,
        label,
        type: 'select',
        options: values.map((r) => String(r.id ?? r.sourceReferenceId ?? '')),
        optionLabels: Object.fromEntries(
          values.map((r) => [String(r.id ?? r.sourceReferenceId ?? ''), String(r.name ?? '')]),
        ),
      });
  const selected = rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => (!provider || row.provider === provider) && (!filter || filter(row)));
  const save = async () => {
    setError('');
    try {
      if (!reason.trim()) throw Error(ar ? 'اكتب سبب الحفظ.' : 'Enter a save reason.');
      await commit(
        kind === 'accreditations' ? '' : '/normalized-details',
        kind === 'accreditations' ? 'PATCH' : 'PUT',
        { [kind]: universityNormalizedPayload(kind, rows, baseFields) },
        reason,
      );
      onCancel();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };
  const body = (
    <>
      <header className="university-actions">
        {embedded ? (
          <h3>{title}</h3>
        ) : (
          <h2>
            {kind === 'rankings' ? (
              <Award />
            ) : kind === 'campuses' ? (
              <MapPin />
            ) : kind === 'organizationUnits' ? (
              <Building2 />
            ) : (
              <ShieldCheck />
            )}
            {title}
          </h2>
        )}
        {!editing && (
          <button type="button" onClick={onEdit} disabled={disabled || busy}>
            <Pencil size={16} />
            {ar ? 'تعديل' : 'Edit'}
          </button>
        )}
      </header>
      {!selected.length && (
        <p>{ar ? 'لا توجد بيانات موثقة محفوظة.' : 'No evidenced saved data.'}</p>
      )}
      {selected.map(({ row, index }) => (
        <div className="university-row" key={String(row.id ?? row.sourceReferenceId ?? index)}>
          {kind === 'accommodationProfiles' &&
            row.accommodationAvailable === false &&
            row.typicalCost !== null &&
            row.typicalCost !== undefined &&
            row.typicalCost !== '' && (
              <p role="alert" className="university-notice">
                {ar
                  ? 'تعارض يحتاج مراجعة: السكن غير متاح مع وجود تكلفة سكن؛ لا تُخفى أي من القيمتين ولا تُصحح تلقائيًا.'
                  : 'Review conflict: accommodation is unavailable but an accommodation cost exists. Both values are retained without automatic correction.'}
              </p>
            )}
          {editing ? (
            <>
              {fieldsForm(
                visibleFields,
                row,
                (key, value) =>
                  setRows((old) => old.map((r, i) => (i === index ? { ...r, [key]: value } : r))),
                busy,
                ar,
                canReadReferences,
              )}
              {(!row.id || ['campuses', 'organizationUnits'].includes(kind)) && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    confirm(
                      ar
                        ? row.id
                          ? 'أرشفة السجل مع حفظ معرّفه وعلاقاته. يلزم حفظ القسم بعد التأكيد.'
                          : 'إزالة المسودة غير المحفوظة؟'
                        : row.id
                          ? 'Archive this record without deleting its identity. Save the section to apply.'
                          : 'Remove this unsaved draft?',
                      () =>
                        setRows((old) =>
                          row.id
                            ? old.map((r, i) => (i === index ? { ...r, status: 'ARCHIVED' } : r))
                            : old.filter((_, i) => i !== index),
                        ),
                    )
                  }
                >
                  {row.id ? <Archive size={16} /> : <Trash2 size={16} />}{' '}
                  {ar
                    ? row.id
                      ? 'أرشفة السجل'
                      : 'إزالة المسودة'
                    : row.id
                      ? 'Archive record'
                      : 'Remove draft'}
                </button>
              )}
            </>
          ) : (
            <dl className="university-values">
              {visibleFields.map((field) => (
                <div key={field.key}>
                  <dt>{field.label}</dt>
                  <dd>
                    <Value
                      value={
                        ar && typeof row[field.key] === 'string'
                          ? (universityStateLabels[String(row[field.key])] ?? row[field.key])
                          : row[field.key]
                      }
                      ar={ar}
                    />
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      ))}
      {editing && (
        <>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              setRows((old) => [
                ...old,
                {
                  ...definition.defaults,
                  ...(provider ? { provider } : {}),
                  ...(['campuses', 'organizationUnits'].includes(kind)
                    ? {
                        sourceReferenceId: 'admin-' + kind + '-' + crypto.randomUUID(),
                        status: 'ACTIVE',
                      }
                    : {}),
                  ...(kind === 'tuitionProfiles' && filter
                    ? {
                        profileType: filter({ profileType: 'SPECIALIZED' })
                          ? 'SPECIALIZED'
                          : 'ANNUAL',
                      }
                    : {}),
                },
              ])
            }
          >
            <Plus size={16} />
            {ar ? addNames[kind][0] : addNames[kind][1]}
          </button>
          <label>
            {ar ? 'سبب حفظ هذه الوحدة' : 'Reason for saving this unit'}
            <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={2000} />
          </label>
          <p className="university-notice">
            {ar
              ? 'حفظ هذه الوحدة مستقل عن بقية البطاقات والمراحل؛ لا يعني النشر أو اعتماد المصدر.'
              : 'This unit saves independently of other cards and stages; saving is not publication or source approval.'}
          </p>
          {error && <p role="alert">{error}</p>}
          <div className="university-actions">
            <button type="button" disabled={busy || !dirty} onClick={() => void save()}>
              <Save size={16} />
              {ar ? 'حفظ هذا القسم' : 'Save this section'}
            </button>
            <button type="button" disabled={busy} onClick={onCancel}>
              <X size={16} />
              {ar ? 'إلغاء التغييرات' : 'Cancel changes'}
            </button>
          </div>
        </>
      )}
    </>
  );
  return embedded ? (
    <div className="university-linked-records">{body}</div>
  ) : (
    <section className="university-card">{body}</section>
  );
}
