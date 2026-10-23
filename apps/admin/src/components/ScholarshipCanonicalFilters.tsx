import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { adminApiClient } from '../api/client';
import { canonicalPickerApi } from '../api/canonicalPickers';
import { CanonicalPicker } from './CanonicalPicker';
import { Globe2, Languages, Coins, Building2, GraduationCap, Award, ClipboardCheck, BookOpen, ShieldCheck, FileText, Database, Landmark, ArrowDownWideNarrow } from 'lucide-react';

const filterIcons = {countryReferenceId:Globe2,studyLanguageReferenceId:Languages,currencyReferenceId:Coins,universityId:Building2,majorId:GraduationCap,degreeLevelId:Award,internationalTestId:ClipboardCheck};
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
  children,
}: {
  value: ScholarshipCanonicalFilterState;
  onChange: (value: ScholarshipCanonicalFilterState) => void;
  ar: boolean;
  children?: ReactNode;
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
    <div className="space-y-4">
      {error && <p role="status">{error}</p>}
      <div className="scholarship-filter-fields grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {children}
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
            ['majorId', ar ? 'التخصص' : 'Major', canonicalPickerApi.majors],
            [
              'degreeLevelId',
              ar ? 'الدرجة العلمية' : 'Degree',
              canonicalPickerApi.degreeLevels,
            ],
            ['internationalTestId', ar ? 'الاختبار' : 'Test', canonicalPickerApi.tests],
          ] as const
        ).map(([key, label, loader]) => (
          <CanonicalPicker
            key={key}
            label={label}
            icon={(() => { const Icon=filterIcons[key]; return <Icon aria-hidden="true" className="h-3.5 w-3.5 text-[#0E7C86]" />; })()}
            value={value[key]}
            onChange={(id) => update(key, id ?? '')}
            load={loader}
            reloadKey={`scholarship-filter:${key}`}
            optional
            compact
            paged={key !== 'degreeLevelId'}
            allowInactive
          />
        ))}
        <label>
          <span><BookOpen aria-hidden="true" />{ar ? 'البرنامج الأكاديمي' : 'Academic program'}</span>
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
          <span><ShieldCheck aria-hidden="true" />{ar ? 'حالة التحقق' : 'Verification'}</span>
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
          <span title={ar ? 'توفر النص المترجم لا يعني اعتماد النشر' : 'Localized text availability does not imply publication approval'}><FileText aria-hidden="true" />{ar ? 'حالة الترجمة' : 'Translation availability'}</span>
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
        </label>
        <label>
          <span><Languages aria-hidden="true" />{ar ? 'لغة المراجعة' : 'Review locale'}</span>
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
          <span><Database aria-hidden="true" />{ar ? 'نوع المصدر' : 'Source type'}</span>
          <input
            value={value.sourceType}
            maxLength={100}
            onChange={(e) => update('sourceType', e.target.value)}
          />
        </label>
        <label>
          <span><Landmark aria-hidden="true" />{ar ? 'اسم الممول' : 'Sponsor'}</span>
          <input
            value={value.sponsorName}
            maxLength={200}
            onChange={(e) => update('sponsorName', e.target.value)}
          />
        </label>
        <label>
          <span><ArrowDownWideNarrow aria-hidden="true" />{ar ? 'الترتيب' : 'Sort'}</span>
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
    </div>
  );
}
