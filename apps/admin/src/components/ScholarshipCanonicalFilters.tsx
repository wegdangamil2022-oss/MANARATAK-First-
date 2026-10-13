import { useEffect, useRef, useState } from 'react';
import { adminApiClient } from '../api/client';
import { canonicalPickerApi, type CanonicalPickerOption } from '../api/canonicalPickers';
export interface ScholarshipCanonicalFilterState {
  universityId: string;
  academicProgramId: string;
  internationalTestId: string;
  majorId: string;
  degreeLevelId: string;
  verificationStatus: string;
  translationState: string;
  translationLocale: string;
  sourceType: string;
  sponsorName: string;
  sort: string;
}
export const emptyScholarshipCanonicalFilters: ScholarshipCanonicalFilterState = {
  universityId: '',
  academicProgramId: '',
  internationalTestId: '',
  majorId: '',
  degreeLevelId: '',
  verificationStatus: '',
  translationState: '',
  translationLocale: 'en',
  sourceType: '',
  sponsorName: '',
  sort: 'CREATED_DESC',
};
export function ScholarshipCanonicalFilters({
  value,
  onChange,
  ar,
}: {
  value: ScholarshipCanonicalFilterState;
  onChange: (value: ScholarshipCanonicalFilterState) => void;
  ar: boolean;
}) {
  const [options, setOptions] = useState<Record<string, CanonicalPickerOption[]>>({});
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [programs, setPrograms] = useState<Array<{ id: string; sourceProgramName: string }>>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const generation = useRef(0);
  const load = async () => {
    setBusy(true);
    setError('');
    const results = await Promise.allSettled([
      canonicalPickerApi.universities(search),
      canonicalPickerApi.majors(search),
      canonicalPickerApi.degreeLevels(),
      canonicalPickerApi.tests(),
    ]);
    const keys = ['universityId', 'majorId', 'degreeLevelId', 'internationalTestId'];
    const data: Record<string, CanonicalPickerOption[]> = {};
    results.forEach((result, i) => {
      data[keys[i]] = result.status === 'fulfilled' ? result.value : [];
    });
    setOptions(data);
    setBusy(false);
    if (results.some((result) => result.status === 'rejected'))
      setError(
        ar
          ? 'بعض خيارات المالك غير متاحة بصلاحيتك؛ لا تمنح صلاحية إدارة إضافية لمجرد الاختيار.'
          : 'Some owner options are unavailable under your permissions; do not grant management access just for selection.',
      );
  };
  const loadPrograms = async (next = false) => {
    const current = generation.current;
    const params = new URLSearchParams({ limit: '25' });
    if (value.universityId) params.set('universityId', value.universityId);
    if (value.majorId) params.set('majorId', value.majorId);
    if (value.degreeLevelId) params.set('degreeLevelId', value.degreeLevelId);
    if (next && cursor) params.set('cursor', cursor);
    try {
      const result = await adminApiClient.request<{
        items: Array<{ id: string; sourceProgramName: string }>;
        nextCursor: string | null;
      }>(`/public/university-programs?${params}`, { cache: 'no-store' });
      if (current !== generation.current) return;
      setPrograms((old) =>
        next
          ? [
              ...old,
              ...result.items.filter((row) => !old.some((previous) => previous.id === row.id)),
            ]
          : result.items,
      );
      setCursor(result.nextCursor);
    } catch {
      if (current === generation.current)
        setError(
          ar ? 'تعذر تحميل البرامج المنشورة المطابقة.' : 'Matching published programs unavailable.',
        );
    }
  };
  useEffect(() => {
    generation.current++;
    setPrograms([]);
    setCursor(null);
    void loadPrograms();
    return () => {
      generation.current++;
    };
  }, [value.universityId, value.majorId, value.degreeLevelId]);
  const update = (key: keyof ScholarshipCanonicalFilterState, next: string) =>
    onChange({
      ...value,
      [key]: next,
      ...(['universityId', 'majorId', 'degreeLevelId'].includes(key)
        ? { academicProgramId: '' }
        : {}),
    });
  return (
    <section className="space-y-3 rounded border p-3">
      <h3 className="font-bold">
        {ar ? 'العلاقات ومراجعة المصدر' : 'Canonical links and source review'}
      </h3>
      <label>
        {ar ? 'بحث خيارات المالك' : 'Owner option search'}
        <input value={search} maxLength={200} onChange={(e) => setSearch(e.target.value)} />
      </label>
      <button type="button" disabled={busy} onClick={() => void load()}>
        {ar ? 'تحميل الخيارات' : 'Load options'}
      </button>
      {error && <p role="status">{error}</p>}
      {Object.entries({
        universityId: ar ? 'الجامعة' : 'University',
        majorId: ar ? 'التخصص الرسمي' : 'Canonical major',
        degreeLevelId: ar ? 'الدرجة الرسمية' : 'Canonical degree',
        internationalTestId: ar ? 'الاختبار' : 'Test',
      }).map(([key, label]) => (
        <label key={key}>
          {label}
          <select
            value={value[key as keyof typeof value]}
            onChange={(e) => update(key as keyof typeof value, e.target.value)}
          >
            <option value="">—</option>
            {value[key as keyof typeof value] &&
              !options[key]?.some((item) => item.id === value[key as keyof typeof value]) && (
                <option value={value[key as keyof typeof value]}>
                  {value[key as keyof typeof value]} ({ar ? 'خيار غير محمل' : 'unloaded option'})
                </option>
              )}
            {options[key]?.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      ))}
      <label>
        {ar ? 'البرنامج التابع' : 'Dependent academic program'}
        <select
          value={value.academicProgramId}
          onChange={(e) => update('academicProgramId', e.target.value)}
        >
          <option value="">—</option>
          {value.academicProgramId &&
            !programs.some((row) => row.id === value.academicProgramId) && (
              <option value={value.academicProgramId}>
                {value.academicProgramId} ({ar ? 'غير محمل' : 'unloaded'})
              </option>
            )}
          {programs.map((row) => (
            <option key={row.id} value={row.id}>
              {row.sourceProgramName}
            </option>
          ))}
        </select>
      </label>
      {cursor && (
        <button type="button" onClick={() => void loadPrograms(true)}>
          {ar ? 'تحميل برامج أخرى' : 'Load more programs'}
        </button>
      )}
      <label>
        {ar ? 'حالة التحقق' : 'Verification'}
        <select
          value={value.verificationStatus}
          onChange={(e) => update('verificationStatus', e.target.value)}
        >
          <option value="">—</option>
          {['PENDING', 'VERIFIED', 'FAILED'].map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
      </label>
      <label>
        {ar
          ? 'النص المحلي المتاح (لا يعني اعتماد النشر)'
          : 'Localized text availability (not publication approval)'}
        <select
          value={value.translationState}
          onChange={(e) => update('translationState', e.target.value)}
        >
          <option value="">—</option>
          <option value="TRANSLATED">{ar ? 'نص محلي متاح' : 'Localized text available'}</option>
          <option value="NEEDS_TRANSLATION">
            {ar ? 'نص محلي مفقود' : 'Localized text missing'}
          </option>
        </select>
        <select
          aria-label={ar ? 'لغة المراجعة' : 'Review locale'}
          value={value.translationLocale}
          onChange={(e) => update('translationLocale', e.target.value)}
        >
          <option value="en">English</option>
          <option value="ar">العربية</option>
        </select>
      </label>
      <label>
        {ar ? 'نوع المصدر' : 'Source type'}
        <input
          value={value.sourceType}
          maxLength={100}
          onChange={(e) => update('sourceType', e.target.value)}
        />
      </label>
      <label>
        {ar ? 'اسم الممول' : 'Sponsor'}
        <input
          value={value.sponsorName}
          maxLength={200}
          onChange={(e) => update('sponsorName', e.target.value)}
        />
      </label>
      <label>
        {ar ? 'الترتيب' : 'Sort'}
        <select value={value.sort} onChange={(e) => update('sort', e.target.value)}>
          <option value="CREATED_DESC">{ar ? 'الأحدث إنشاء' : 'Newest created'}</option>
          <option value="UPDATED_DESC">{ar ? 'الأحدث تحديث' : 'Newest updated'}</option>
          <option value="DEADLINE_ASC">
            {ar
              ? 'أقرب إغلاق (المجهول وطوال العام أخيرًا)'
              : 'Closing first (unknown/year-round last)'}
          </option>
          <option value="COMPLETENESS_ASC">{ar ? 'حالة الاكتمال' : 'Completeness state'}</option>
        </select>
      </label>
    </section>
  );
}
