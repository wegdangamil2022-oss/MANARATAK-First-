import { useCallback, useEffect, useRef, useState } from 'react';
import { adminApiClient } from '../api/client';
import { canonicalPickerApi } from '../api/canonicalPickers';
import { CanonicalPicker } from './CanonicalPicker';
export interface ScholarshipCanonicalFilterState {
  countryReferenceId: string;
  studyLanguageReferenceId: string;
  currencyReferenceId: string;
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
  countryReferenceId: '',
  studyLanguageReferenceId: '',
  currencyReferenceId: '',
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
  const [error, setError] = useState('');
  const [programs, setPrograms] = useState<Array<{ id: string; sourceProgramName: string }>>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const generation = useRef(0);
  const [programsBusy, setProgramsBusy] = useState(false);
  const loadPrograms = useCallback(
    async (after?: string) => {
      const current = generation.current;
      setProgramsBusy(true);
      const params = new URLSearchParams({ limit: '25' });
      if (value.universityId) params.set('universityId', value.universityId);
      if (value.majorId) params.set('majorId', value.majorId);
      if (value.degreeLevelId) params.set('degreeLevelId', value.degreeLevelId);
      if (after) params.set('cursor', after);
      try {
        const result = await adminApiClient.request<{
          items: Array<{ id: string; sourceProgramName: string }>;
          nextCursor: string | null;
        }>(`/public/university-programs?${params}`, { cache: 'no-store' });
        if (current !== generation.current) return;
        setPrograms((old) =>
          after
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
            ar
              ? 'تعذر تحميل البرامج المنشورة المطابقة.'
              : 'Matching published programs unavailable.',
          );
      } finally {
        if (current === generation.current) setProgramsBusy(false);
      }
    },
    [value.universityId, value.majorId, value.degreeLevelId, ar],
  );
  useEffect(() => {
    const request = ++generation.current;
    setPrograms([]);
    setCursor(null);
    void loadPrograms();
    return () => {
      generation.current = request + 1;
    };
  }, [loadPrograms]);
  const update = (key: keyof ScholarshipCanonicalFilterState, next: string) =>
    onChange({
      ...value,
      [key]: next,
      ...(['universityId', 'majorId', 'degreeLevelId'].includes(key) && value[key] !== next
        ? { academicProgramId: '' }
        : {}),
    });
  return (
    <section className="space-y-4">
      <h3 className="font-bold">
        {ar ? 'العلاقات ومراجعة المصدر' : 'Canonical links and source review'}
      </h3>
      {error && <p role="status">{error}</p>}
      <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {(
          [
            ['countryReferenceId', ar ? 'الدولة' : 'Country', canonicalPickerApi.countries],
            [
              'studyLanguageReferenceId',
              ar ? 'لغة الدراسة' : 'Study language',
              canonicalPickerApi.languages,
            ],
            ['currencyReferenceId', ar ? 'العملة' : 'Currency', canonicalPickerApi.currencies],
            ['universityId', ar ? 'الجامعة' : 'University', canonicalPickerApi.universities],
            ['majorId', ar ? 'التخصص الرسمي' : 'Canonical major', canonicalPickerApi.majors],
            [
              'degreeLevelId',
              ar ? 'الدرجة الرسمية' : 'Canonical degree',
              canonicalPickerApi.degreeLevels,
            ],
            ['internationalTestId', ar ? 'الاختبار' : 'Test', canonicalPickerApi.tests],
          ] as const
        ).map(([key, label, loader]) => (
          <CanonicalPicker
            key={key}
            label={label}
            value={value[key]}
            onChange={(id) => update(key, id ?? '')}
            load={loader}
            reloadKey={`scholarship-filter:${key}`}
            optional
            paged={key !== 'degreeLevelId'}
            allowInactive
          />
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
          <button
            type="button"
            disabled={programsBusy}
            onClick={() => void loadPrograms(cursor ?? undefined)}
          >
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
      </div>
    </section>
  );
}
