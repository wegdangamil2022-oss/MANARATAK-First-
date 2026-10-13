import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApiClient, createAdminIdempotencyKey } from '../api/client';
import { canonicalPickerApi, type CanonicalPickerOption } from '../api/canonicalPickers';
import { useTranslation } from '../i18n/I18nProvider';
interface Intake {
  id: string;
  intakeStart: string;
  applicationOpen: string;
  applicationClose: string;
  applicantSegment: string;
  timezone: string;
  officialSourceUrl: string;
  verificationStatus: string;
  status: string;
  window: string;
}
interface Program {
  id: string;
  universityId: string;
  universityName: string;
  parentRevision: number;
  parentStatus: string;
  sourceProgramName: string;
  majorMappingState: string;
  scholarshipCount: number;
  study: {
    languageReferenceIds: string[];
    studyMode: string;
    teachingDelivery: string;
    durationValue: number | null;
    durationUnit: string | null;
    entryEligibility: string | null;
    officialSourceUrl: string | null;
    verificationStatus: string;
    verifiedBy?: string | null;
    verifiedAt?: string | null;
  } | null;
  intakes: Intake[];
}
export function UniversityProgramWorkspace() {
  const { language } = useTranslation();
  const ar = language === 'ar';
  const [filters, setFilters] = useState({
    search: '',
    majorId: '',
    degreeLevelId: '',
    countryReferenceId: '',
    regionReferenceId: '',
    cityReferenceId: '',
    internationalTestId: '',
    languageReferenceId: '',
    programStatus: '',
    parentStatus: '',
    studyMode: '',
    hasScholarships: '',
  });
  const [applied, setApplied] = useState('');
  const [items, setItems] = useState<Program[]>([]);
  const [total, setTotal] = useState(0);
  const [cursor, setCursor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [options, setOptions] = useState<Record<string, CanonicalPickerOption[]>>({});
  const [selected, setSelected] = useState<Program | null>(null);
  const [keyword, setKeyword] = useState('');
  const [reload, setReload] = useState(0);
  const generation = useRef(0);
  const lock = useRef(false);
  const load = async (next = false) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    const current = ++generation.current;
    const params = new URLSearchParams(
      next ? applied : Object.entries(filters).filter(([, v]) => v),
    );
    params.set('limit', '25');
    if (next && cursor) params.set('cursor', cursor);
    try {
      const result = await adminApiClient.request<{
        items: Program[];
        total: number;
        nextCursor: string | null;
      }>(`/admin/university-programs?${params}`, { cache: 'no-store' });
      if (current !== generation.current) return;
      setItems((old) =>
        next
          ? [...old, ...result.items.filter((row) => !old.some((item) => item.id === row.id))]
          : result.items,
      );
      setTotal(result.total);
      setCursor(result.nextCursor);
      if (!next) {
        params.delete('limit');
        setApplied(params.toString());
      }
    } catch {
      if (current === generation.current)
        setError(
          ar
            ? 'تعذر تحميل البرامج أو تغيّرت النسخة؛ تحقق من الصلاحيات وتجهيز القاعدة.'
            : 'Programs unavailable or revision changed; check permissions and database preparation.',
        );
    } finally {
      lock.current = false;
      if (current === generation.current) setBusy(false);
    }
  };
  useEffect(() => {
    void load();
    return () => {
      generation.current++;
    };
  }, [reload]);
  const geo = async () => {
    const country = options.countryReferenceId?.find(
      (item) => item.id === filters.countryReferenceId,
    );
    try {
      const [regions, cities] = await Promise.all([
        canonicalPickerApi.regions(country?.code, keyword),
        canonicalPickerApi.cities(country?.code, filters.regionReferenceId || undefined, keyword),
      ]);
      setOptions((old) => ({ ...old, regionReferenceId: regions, cityReferenceId: cities }));
    } catch {
      setError(ar ? 'تعذر تحميل جغرافيا المالك.' : 'Owner geography unavailable.');
    }
  };
  const choices = async () => {
    const settled = await Promise.allSettled([
      canonicalPickerApi.majors(keyword),
      canonicalPickerApi.degreeLevels(),
      canonicalPickerApi.countries(keyword),
      canonicalPickerApi.tests(),
      canonicalPickerApi.languages(keyword),
    ]);
    const keys = [
      'majorId',
      'degreeLevelId',
      'countryReferenceId',
      'internationalTestId',
      'languageReferenceId',
    ];
    const values: Record<string, CanonicalPickerOption[]> = {};
    settled.forEach((result, i) => {
      values[keys[i]] = result.status === 'fulfilled' ? result.value : [];
    });
    setOptions(values);
    if (settled.some((result) => result.status === 'rejected'))
      setError(
        ar
          ? 'بعض خيارات المالك غير متاحة؛ لا تفترض عدم وجودها.'
          : 'Some owner options are unavailable; do not infer absence.',
      );
  };
  return (
    <section className="space-y-3 rounded-2xl border bg-white p-4">
      <h2 className="font-bold">
        {ar ? 'فهرس البرامج عبر الجامعات' : 'Programs across universities'}
      </h2>
      {error && <p role="alert">{error}</p>}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setSelected(null);
          void load();
        }}
      >
        <fieldset disabled={busy} className="flex flex-wrap gap-3">
          <label>
            {ar ? 'بحث البرنامج أو الجامعة' : 'Program or university search'}
            <input
              value={filters.search}
              maxLength={200}
              onChange={(e) => setFilters((old) => ({ ...old, search: e.target.value }))}
            />
          </label>
          <label>
            {ar ? 'بحث الخيارات المرجعية' : 'Reference option search'}
            <input value={keyword} maxLength={200} onChange={(e) => setKeyword(e.target.value)} />
          </label>
          <button type="button" onClick={() => void choices()}>
            {ar ? 'تحميل خيارات المالكين' : 'Load owner options'}
          </button>
          {Object.entries({
            majorId: ar ? 'التخصص' : 'Major',
            degreeLevelId: ar ? 'الدرجة' : 'Degree',
            countryReferenceId: ar ? 'البلد' : 'Country',
            internationalTestId: ar ? 'الاختبار' : 'Test',
            languageReferenceId: ar ? 'لغة البرنامج' : 'Program language',
            regionReferenceId: ar ? 'المنطقة' : 'Region',
            cityReferenceId: ar ? 'المدينة' : 'City',
          }).map(([key, label]) => (
            <label key={key}>
              {label}
              <select
                value={filters[key as keyof typeof filters]}
                onChange={(e) => setFilters((old) => ({ ...old, [key]: e.target.value }))}
              >
                <option value="">—</option>
                {options[key]?.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <button type="button" onClick={() => void geo()}>
            {ar ? 'تحميل المناطق والمدن' : 'Load regions and cities'}
          </button>
          <label>
            {ar ? 'نمط الدراسة' : 'Study mode'}
            <select
              value={filters.studyMode}
              onChange={(e) => setFilters((old) => ({ ...old, studyMode: e.target.value }))}
            >
              <option value="">—</option>
              {['UNKNOWN', 'FULL_TIME', 'PART_TIME'].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            {ar ? 'حالة البرنامج' : 'Program status'}
            <select
              value={filters.programStatus}
              onChange={(e) => setFilters((old) => ({ ...old, programStatus: e.target.value }))}
            >
              <option value="">—</option>
              {['DRAFT', 'ACTIVE', 'ARCHIVED'].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            {ar ? 'حالة الجامعة' : 'Parent status'}
            <select
              value={filters.parentStatus}
              onChange={(e) => setFilters((old) => ({ ...old, parentStatus: e.target.value }))}
            >
              <option value="">—</option>
              {[
                'IMPORTED',
                'READY_TO_REVIEW',
                'READY_TO_PUBLISH',
                'PUBLISHED',
                'ARCHIVED',
                'REJECTED',
              ].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            {ar ? 'منح مرتبطة' : 'Linked scholarships'}
            <select
              value={filters.hasScholarships}
              onChange={(e) => setFilters((old) => ({ ...old, hasScholarships: e.target.value }))}
            >
              <option value="">—</option>
              <option value="true">{ar ? 'نعم' : 'Yes'}</option>
              <option value="false">{ar ? 'لا' : 'No'}</option>
            </select>
          </label>
          <button type="submit">{ar ? 'تطبيق الفلاتر' : 'Apply filters'}</button>
        </fieldset>
      </form>
      <p>
        {items.length} / {total}
      </p>
      {!busy && !items.length && (
        <p>{ar ? 'لا برامج في النتائج المحملة.' : 'No programs in loaded results.'}</p>
      )}
      <ul>
        {items.map((row) => (
          <li key={row.id} className="rounded border p-3">
            <Link to={`/universities/${encodeURIComponent(row.universityId)}/relationships`}>
              {row.universityName}
            </Link>{' '}
            · {row.sourceProgramName} · {row.majorMappingState} · {row.scholarshipCount}{' '}
            {ar ? 'منح' : 'scholarships'}{' '}
            <button type="button" disabled={busy} onClick={() => setSelected(row)}>
              {ar ? 'الدراسة والقبول' : 'Study and intakes'}
            </button>
          </li>
        ))}
      </ul>
      {cursor && (
        <button
          type="button"
          disabled={
            busy ||
            new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString() !== applied
          }
          onClick={() => void load(true)}
        >
          {ar ? 'تحميل البرامج التالية' : 'Load next programs'}
        </button>
      )}
      {selected && (
        <ProgramEditor
          key={selected.id + selected.parentRevision}
          row={selected}
          languages={options.languageReferenceId ?? []}
          ar={ar}
          onSaved={() => {
            setSelected(null);
            setReload((value) => value + 1);
          }}
        />
      )}
    </section>
  );
}
function ProgramEditor({
  row,
  languages,
  ar,
  onSaved,
}: {
  row: Program;
  languages: CanonicalPickerOption[];
  ar: boolean;
  onSaved: () => void;
}) {
  const [study, setStudy] = useState({
    languageReferenceIds: row.study?.languageReferenceIds ?? [],
    studyMode: row.study?.studyMode ?? 'UNKNOWN',
    teachingDelivery: row.study?.teachingDelivery ?? 'UNKNOWN',
    durationValue: row.study?.durationValue?.toString() ?? '',
    durationUnit: row.study?.durationUnit ?? 'MONTHS',
    entryEligibility: row.study?.entryEligibility ?? '',
    officialSourceUrl: row.study?.officialSourceUrl ?? '',
    verificationStatus: row.study?.verificationStatus ?? 'UNKNOWN',
  });
  const emptyIntake = () => ({
    id: createAdminIdempotencyKey(),
    intakeStart: '',
    applicationOpen: '',
    applicationClose: '',
    applicantSegment: '',
    timezone: 'UTC',
    officialSourceUrl: '',
    verificationStatus: 'UNKNOWN',
    status: 'DRAFT',
  });
  const [intake, setIntake] = useState(emptyIntake);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const command = useRef<{ signature: string; key: string } | null>(null);
  const lock = useRef(false);
  const save = async (kind: 'study' | 'intake') => {
    if (lock.current || reason.trim().length < 3) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const body =
        kind === 'study'
          ? {
              ...study,
              ...(study.durationValue
                ? { durationValue: Number(study.durationValue), durationUnit: study.durationUnit }
                : {}),
              ...(study.officialSourceUrl ? {} : { officialSourceUrl: undefined }),
            }
          : intake;
      if (kind === 'study') {
        if (!study.durationValue) {
          delete (body as Record<string, unknown>).durationValue;
          delete (body as Record<string, unknown>).durationUnit;
        }
      }
      const signature = JSON.stringify([kind, body, reason]);
      if (command.current?.signature !== signature)
        command.current = { signature, key: createAdminIdempotencyKey() };
      await adminApiClient.request(
        `/admin/university-programs/${encodeURIComponent(row.id)}/${kind}`,
        {
          method: 'PUT',
          body: JSON.stringify(body),
          idempotencyKey: command.current.key,
          headers: { 'If-Match': String(row.parentRevision), 'X-Review-Reason': reason },
        },
      );
      command.current = null;
      onSaved();
    } catch {
      setError(
        ar
          ? 'لم يحفظ التغيير؛ حدّث نسخة الجامعة وتحقق من التواريخ واللغة والمصدر.'
          : 'Not saved; reload the parent revision and verify dates, language and source.',
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const field = (name: keyof typeof intake, label: string) => {
    const date = ['intakeStart', 'applicationOpen', 'applicationClose'].includes(name);
    return (
      <label>
        {label}
        {date ? ' (UTC)' : ''}
        <input
          type={date ? 'datetime-local' : 'text'}
          value={date ? intake[name].slice(0, 16) : intake[name]}
          maxLength={2048}
          onChange={(e) =>
            setIntake((old) => ({
              ...old,
              [name]:
                date && e.target.value
                  ? new Date(e.target.value + 'Z').toISOString()
                  : e.target.value,
            }))
          }
        />
      </label>
    );
  };
  return (
    <section className="space-y-3 rounded border p-4">
      <h3>{row.sourceProgramName}</h3>
      {error && <p role="alert">{error}</p>}
      <fieldset
        disabled={busy || ['PUBLISHED', 'ARCHIVED', 'REJECTED'].includes(row.parentStatus)}
        className="space-y-3"
      >
        <label>
          {ar ? 'سبب التغيير' : 'Change reason'}
          <input value={reason} maxLength={2000} onChange={(e) => setReason(e.target.value)} />
        </label>
        <h4>{ar ? 'الدراسة والمتطلبات' : 'Study requirements'}</h4>
        <p>
          {ar ? 'مراجع المصدر ووقت التحقق' : 'Source reviewer and verification time'}:{' '}
          {row.study?.verifiedBy ?? '—'} · {row.study?.verifiedAt ?? '—'}
        </p>
        <label>
          {ar ? 'لغات مؤكدة من P7 (غيابها مجهول)' : 'P7 languages (missing means unknown)'}
          <select
            multiple
            value={study.languageReferenceIds}
            onChange={(e) =>
              setStudy((old) => ({
                ...old,
                languageReferenceIds: [...e.target.selectedOptions].map((option) => option.value),
              }))
            }
          >
            {[
              ...languages,
              ...study.languageReferenceIds
                .filter((id) => !languages.some((item) => item.id === id))
                .map((id) => ({ id, label: id + ' (' + (ar ? 'غير محمل' : 'unloaded') + ')' })),
            ].map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        {(['studyMode', 'teachingDelivery', 'verificationStatus'] as const).map((key) => (
          <label key={key}>
            {key}
            <select
              value={study[key]}
              onChange={(e) => setStudy((old) => ({ ...old, [key]: e.target.value }))}
            >
              {(key === 'studyMode'
                ? ['UNKNOWN', 'FULL_TIME', 'PART_TIME']
                : key === 'teachingDelivery'
                  ? ['UNKNOWN', 'ON_CAMPUS', 'ONLINE', 'HYBRID']
                  : ['UNKNOWN', 'VERIFIED']
              ).map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
        ))}
        <label>
          {ar ? 'مدة الدراسة' : 'Duration'}
          <input
            type="number"
            min="0.01"
            max="1000"
            value={study.durationValue}
            onChange={(e) => setStudy((old) => ({ ...old, durationValue: e.target.value }))}
          />
          <select
            value={study.durationUnit}
            onChange={(e) => setStudy((old) => ({ ...old, durationUnit: e.target.value }))}
          >
            <option>MONTHS</option>
            <option>YEARS</option>
          </select>
        </label>
        <label>
          {ar ? 'متطلبات الدخول الموثقة' : 'Documented entry requirements'}
          <textarea
            value={study.entryEligibility}
            maxLength={4000}
            onChange={(e) => setStudy((old) => ({ ...old, entryEligibility: e.target.value }))}
          />
        </label>
        <label>
          {ar ? 'مصدر رسمي HTTPS' : 'Official HTTPS source'}
          <input
            value={study.officialSourceUrl}
            maxLength={2048}
            onChange={(e) => setStudy((old) => ({ ...old, officialSourceUrl: e.target.value }))}
          />
        </label>
        <button type="button" onClick={() => void save('study')}>
          {ar ? 'حفظ الدراسة' : 'Save study profile'}
        </button>
        <h4>
          {ar
            ? 'نوافذ القبول — أدخل اللحظة بتوقيت UTC'
            : 'Intake windows — enter the instant in UTC'}
        </h4>
        <select
          aria-label={ar ? 'النافذة' : 'Intake'}
          value={row.intakes.some((item) => item.id === intake.id) ? intake.id : ''}
          onChange={(e) => {
            const item = row.intakes.find((value) => value.id === e.target.value);
            setIntake(
              item
                ? {
                    id: item.id,
                    intakeStart: item.intakeStart,
                    applicationOpen: item.applicationOpen,
                    applicationClose: item.applicationClose,
                    applicantSegment: item.applicantSegment,
                    timezone: item.timezone,
                    officialSourceUrl: item.officialSourceUrl,
                    verificationStatus: item.verificationStatus,
                    status: item.status,
                  }
                : emptyIntake(),
            );
          }}
        >
          <option value="">{ar ? 'نافذة جديدة' : 'New intake'}</option>
          {row.intakes.map((item) => (
            <option key={item.id} value={item.id}>
              {item.applicantSegment} · {item.applicationClose} · {item.window}
            </option>
          ))}
        </select>
        {field('intakeStart', ar ? 'بدء الدراسة' : 'Study start')}
        {field('applicationOpen', ar ? 'فتح التقديم' : 'Application opens')}
        {field('applicationClose', ar ? 'إغلاق التقديم' : 'Application closes')}
        {field('applicantSegment', ar ? 'شريحة المتقدم' : 'Applicant segment')}
        {field('timezone', ar ? 'المنطقة الزمنية' : 'Time zone')}
        {field('officialSourceUrl', ar ? 'مصدر رسمي HTTPS' : 'Official HTTPS source')}
        <label>
          {ar ? 'التحقق' : 'Verification'}
          <select
            value={intake.verificationStatus}
            onChange={(e) => setIntake((old) => ({ ...old, verificationStatus: e.target.value }))}
          >
            <option>UNKNOWN</option>
            <option>VERIFIED</option>
          </select>
        </label>
        <label>
          {ar ? 'حالة النافذة' : 'Intake status'}
          <select
            value={intake.status}
            onChange={(e) => setIntake((old) => ({ ...old, status: e.target.value }))}
          >
            <option>DRAFT</option>
            <option>ACTIVE</option>
            <option>ARCHIVED</option>
          </select>
        </label>
        <button type="button" onClick={() => void save('intake')}>
          {ar ? 'حفظ النافذة' : 'Save intake'}
        </button>
      </fieldset>
      {row.parentStatus === 'PUBLISHED' && (
        <p>
          {ar
            ? 'ألغ نشر الجامعة قبل التحرير ثم أعد المراجعة.'
            : 'Unpublish the parent before editing, then review again.'}
        </p>
      )}
    </section>
  );
}
