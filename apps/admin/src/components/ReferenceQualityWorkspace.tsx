import { CanonicalPicker } from './CanonicalPicker';
import { canonicalPickerApi } from '../api/canonicalPickers';
import { useEffect, useState } from 'react';
import {
  REFERENCE_QUALITY_ISSUES,
  type ReferenceQualityIssueKind,
  type ReferenceQualityReport,
} from '@manaratak/domain';
import { referenceDataAdminApi } from '../api/referenceData';
import { useTranslation } from '../i18n/I18nProvider';

const labels: Record<ReferenceQualityIssueKind, [string, string]> = {
  MISSING_CURRENCY: ['عملة افتراضية مفقودة', 'Missing default currency'],
  INVALID_CURRENCY: ['مرجع عملة غير صالح', 'Invalid currency reference'],
  MISSING_LANGUAGE: ['لغة افتراضية مفقودة', 'Missing default language'],
  INVALID_LANGUAGE: ['مرجع لغة غير صالح', 'Invalid language reference'],
  AMBIGUOUS_ALIAS: ['أسماء بديلة متعارضة', 'Ambiguous aliases'],
  MISSING_REGION: ['منطقة إدارية مفقودة', 'Missing region'],
  MISSING_TIMEZONE: ['منطقة زمنية مفقودة', 'Missing timezone'],
  BROKEN_COUNTRY: ['رابط دولة مكسور', 'Broken country link'],
  BROKEN_REGION: ['رابط منطقة غير متطابق', 'Broken region link'],
};
const tabs = {
  COUNTRY: 'countries',
  CURRENCY: 'currencies',
  LANGUAGE: 'languages',
  REGION: 'regions',
  CITY: 'cities',
};
export function ReferenceQualityWorkspace() {
  const { language } = useTranslation();
  const ar = language === 'ar';
  const [countryId, setCountryId] = useState<string | null>(null);
  const [query, setQuery] = useState(''),
    [search, setSearch] = useState(''),
    [entityType, setEntityType] = useState<
      NonNullable<import('@manaratak/domain').ReferenceQualityQuery['entityType']> | ''
    >('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(query.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);
  const [country, setCountry] = useState('');
  const [kind, setKind] = useState<ReferenceQualityIssueKind | ''>('');
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [report, setReport] = useState<ReferenceQualityReport | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  useEffect(() => {
    const abort = new AbortController();
    setReport(null);
    setStatus('loading');
    referenceDataAdminApi
      .qualityIssues(
        {
          countryIso2Code: country || undefined,
          kind: kind || undefined,
          q: search || undefined,
          entityType: entityType || undefined,
          page,
        },
        abort.signal,
      )
      .then((result) => {
        if (!abort.signal.aborted) {
          setReport(result);
          setStatus('ready');
        }
      })
      .catch(() => {
        if (!abort.signal.aborted) setStatus('error');
      });
    return () => abort.abort();
  }, [country, kind, page, revision, search, entityType]);
  const recordLink = (row: ReferenceQualityReport['data'][number]) => {
    const url = new URL(window.location.href);
    url.searchParams.set('p7Tab', tabs[row.entityType]);
    url.searchParams.set('section', tabs[row.entityType]);
    url.searchParams.set('recordId', row.referenceId);
    url.searchParams.set('p7Status', 'all');
    url.searchParams.set('p7Page', '1');
    url.searchParams.delete('p7Q');
    for (const key of ['p7Country', 'p7UpdatedFrom', 'p7MappingStatus'])
      url.searchParams.delete(key);
    if (row.entityType === 'CITY' || row.entityType === 'REGION')
      url.searchParams.set('p7Country', row.countryIso2Code ?? '');
    return url.pathname + url.search;
  };
  return (
    <section dir={ar ? 'rtl' : 'ltr'} className="space-y-3 rounded-2xl border bg-white p-4">
      <h3 className="font-bold">
        {ar ? 'مشكلات جودة السجلات المرجعية' : 'Reference record quality issues'}
      </h3>
      <p className="text-xs">
        {ar
          ? 'التعارضات حسب الأسماء البديلة النشطة والمطبّعة المحفوظة؛ مراجعة الأسماء التاريخية والتغطية الرسمية تبقى غير مثبتة.'
          : 'Alias conflicts use active stored normalized aliases; historical normalization and official coverage remain unverified.'}
      </p>
      <div className="reference-filter-grid">
        <label>
          {ar ? 'البحث في السجلات المتأثرة' : 'Search affected records'}
          <input value={query} maxLength={200} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <label>
          {ar ? 'نوع السجل' : 'Record type'}
          <select
            value={entityType}
            onChange={(event) => {
              setEntityType(event.target.value as typeof entityType);
              setPage(1);
            }}
          >
            <option value="">{ar ? 'الكل' : 'All'}</option>
            {Object.entries({
              COUNTRY: ['دولة', 'Country'],
              CURRENCY: ['عملة', 'Currency'],
              LANGUAGE: ['لغة', 'Language'],
              REGION: ['منطقة إدارية', 'Administrative region'],
              CITY: ['مدينة', 'City'],
            }).map(([key, label]) => (
              <option key={key} value={key}>
                {label[ar ? 0 : 1]}
              </option>
            ))}
          </select>
        </label>
        <CanonicalPicker
          paged
          optional
          label={ar ? 'الدولة' : 'Country'}
          value={countryId}
          load={canonicalPickerApi.countries}
          onChange={(id, option) => {
            setCountryId(id);
            setCountry(option?.code ?? '');
            setPage(1);
          }}
        />
      </div>
      <div className="reference-actions">
        <button type="button" onClick={() => setRevision((value) => value + 1)}>
          {ar ? 'تحديث التقرير' : 'Refresh report'}
        </button>
        <button
          type="button"
          onClick={() => {
            setCountryId(null);
            setCountry('');
            setEntityType('');
            setKind('');
            setQuery('');
            setPage(1);
          }}
        >
          {ar ? 'مسح الفلاتر' : 'Clear filters'}
        </button>
      </div>
      <label>
        {ar ? 'نوع المشكلة' : 'Issue type'}{' '}
        <select
          value={kind}
          onChange={(event) => {
            setKind(event.target.value as typeof kind);
            setPage(1);
          }}
          className="rounded border p-2"
        >
          <option value="">{ar ? 'الكل' : 'All'}</option>
          {REFERENCE_QUALITY_ISSUES.map((issue) => (
            <option key={issue} value={issue}>
              {labels[issue][ar ? 0 : 1]}
            </option>
          ))}
        </select>
      </label>
      {status === 'loading' && (
        <p role="status">{ar ? 'جارٍ تحميل المشكلات…' : 'Loading issues…'}</p>
      )}
      {status === 'error' && (
        <p role="alert">
          {ar
            ? 'تعذر قراءة تقرير الجودة. النتيجة غير معروفة؛ حاول التحديث.'
            : 'Quality report unavailable. Results are unknown; try refreshing.'}
        </p>
      )}
      {report && (
        <>
          <div className="flex flex-wrap gap-2">
            {REFERENCE_QUALITY_ISSUES.map((issue) => (
              <button
                type="button"
                key={issue}
                aria-pressed={kind === issue}
                onClick={() => {
                  setKind(issue);
                  setPage(1);
                }}
                className="rounded border p-2 text-xs"
              >
                {labels[issue][ar ? 0 : 1]}: {report.counts[issue]}
              </button>
            ))}
          </div>
          <p className="text-xs">
            {ar ? 'وقت التقرير' : 'As of'}: {new Date(report.asOf).toLocaleString(language)} ·{' '}
            {ar
              ? 'المؤشرات تخص الدولة ونوع السجل والبحث الحالي، قبل فلتر نوع المشكلة.'
              : 'Counts use current country, record type and search, before the issue-kind filter.'}
          </p>
          {!report.data.length && (
            <p role="status">{ar ? 'لا توجد مشكلات مطابقة.' : 'No matching issues.'}</p>
          )}
          <ul>
            {report.data.map((row) => (
              <li
                key={`${row.entityType}:${row.referenceId}:${row.kind}`}
                className="border-b py-2"
              >
                <a href={recordLink(row)} className="underline">
                  {ar ? row.nameAr || row.name : row.name}
                </a>{' '}
                · {labels[row.kind][ar ? 0 : 1]} · {row.countryIso2Code ?? 'GLOBAL'}
                <span className="block text-xs" dir="ltr">
                  {row.referenceId}
                </span>
              </li>
            ))}
          </ul>
          <nav
            aria-label={ar ? 'صفحات مشكلات الجودة' : 'Quality issue pages'}
            className="flex gap-3"
          >
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((value) => value - 1)}
            >
              {ar ? 'السابق' : 'Previous'}
            </button>
            <span>
              {page} · {report.total}
            </span>
            <button
              type="button"
              disabled={page >= 1000 || page * report.pageSize >= report.total}
              onClick={() => setPage((value) => value + 1)}
            >
              {ar ? 'التالي' : 'Next'}
            </button>
          </nav>
        </>
      )}
    </section>
  );
}
