import {adminOptionLabel} from './adminOptionLabels';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { adminApiClient } from '../api/client';
import { RelatedCatalogPicker } from './RelatedCatalogPicker';
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
  context,
}: {
  value: ScholarshipCanonicalFilterState;
  onChange: (value: ScholarshipCanonicalFilterState) => void;
  ar: boolean;
  children?: ReactNode;
  context?:URLSearchParams;
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
      setError('');
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
        ...(key==='degreeLevelId'&&value.degreeLevelId!==next?{majorId:''}:{}),
      ...(['universityId', 'majorId', 'degreeLevelId'].includes(key) && value[key] !== next
        ? { academicProgramId: '' }
        : {}),
    });
  return (
    <div className="space-y-4">
      {error && <div role="status"><p>{error}</p><button type="button" disabled={programsBusy} onClick={() => void loadPrograms(cursor ?? undefined)} className="rounded-xl bg-[#0E7C86] px-3 py-2 text-xs text-white">{ar ? 'إعادة تحميل البرامج' : 'Retry programs'}</button></div>}
      <div className="scholarship-filter-fields grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {children}
        {([
          ['countryReferenceId',ar?'الدولة':'Country'],['studyLanguageReferenceId',ar?'لغة الدراسة':'Study language'],
          ['currencyReferenceId',ar?'العملة':'Currency'],['degreeLevelId',ar?'الدرجة العلمية':'Degree'],
          ['majorId',ar?'التخصص':'Major'],['universityId',ar?'الجامعة':'University'],['internationalTestId',ar?'الاختبار':'Test'],
        ] as const).map(([key,label])=><RelatedCatalogPicker key={key} catalog="scholarships" facet={key} context={{...Object.fromEntries(context??new URLSearchParams()),...value}} ar={ar}
          label={label} value={value[key]} icon={(()=>{const Icon=filterIcons[key];return <Icon size={14}/>;})()} onChange={id=>update(key,id)}/>)}
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
              <option key={status} value={status}>{adminOptionLabel(status, ar)}</option>
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
            <option value="en">{adminOptionLabel("English", ar)}</option>
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
