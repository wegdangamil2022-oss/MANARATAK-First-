import { useEffect, useState } from 'react';
import { REFERENCE_QUALITY_ISSUES, type ReferenceQualityIssueKind, type ReferenceQualityReport } from '@absheer/domain';
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
const tabs = { COUNTRY: 'countries', CURRENCY: 'currencies', LANGUAGE: 'languages', REGION: 'regions', CITY: 'cities' };
export function ReferenceQualityWorkspace() {
  const { language } = useTranslation();
  const ar = language === 'ar';
  const [countryInput, setCountryInput] = useState('');
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
    referenceDataAdminApi.qualityIssues({ countryIso2Code: country || undefined, kind: kind || undefined, page }, abort.signal)
      .then(result => { if (!abort.signal.aborted) { setReport(result); setStatus('ready'); } })
      .catch(() => { if (!abort.signal.aborted) setStatus('error'); });
    return () => abort.abort();
  }, [country, kind, page, revision]);
  const recordLink = (row: ReferenceQualityReport['data'][number]) => {
    const url = new URL(window.location.href);
    url.searchParams.set('p7Tab', tabs[row.entityType]);
    url.searchParams.set('p7Status', 'all');
    url.searchParams.set('p7Page', '1');
    url.searchParams.set('p7Q', row.name);
    for (const key of ['p7Country', 'p7UpdatedFrom', 'p7MappingStatus']) url.searchParams.delete(key);
    if (row.entityType === 'CITY' || row.entityType === 'REGION') url.searchParams.set('p7Country', row.countryIso2Code ?? '');
    return url.pathname + url.search;
  };
  return <section dir={ar ? 'rtl' : 'ltr'} className="space-y-3 rounded-2xl border bg-white p-4">
    <h3 className="font-bold">{ar ? 'مشكلات جودة السجلات المرجعية' : 'Reference record quality issues'}</h3>
    <p className="text-xs">{ar ? 'التعارضات حسب الأسماء البديلة النشطة والمطبّعة المحفوظة؛ مراجعة الأسماء التاريخية والتغطية الرسمية تبقى غير مثبتة.' : 'Alias conflicts use active stored normalized aliases; historical normalization and official coverage remain unverified.'}</p>
    <form className="flex flex-wrap gap-3" onSubmit={event => { event.preventDefault(); setCountry(countryInput.trim().toUpperCase()); setPage(1); }}>
      <label>{ar ? 'الدولة (ISO2، فارغ = الكل)' : 'Country (ISO2, empty = all)'} <input aria-label={ar ? 'رمز الدولة' : 'Country code'} maxLength={2} pattern="[A-Za-z]{2}|" value={countryInput} onChange={event => setCountryInput(event.target.value)} className="rounded border p-2" /></label>
      <button type="submit" className="rounded border p-2">{ar ? 'تصفية' : 'Filter'}</button>
      <button type="button" onClick={() => setRevision(value => value + 1)} className="rounded border p-2">{ar ? 'تحديث' : 'Refresh'}</button>
    </form>
    <label>{ar ? 'نوع المشكلة' : 'Issue type'} <select value={kind} onChange={event => { setKind(event.target.value as typeof kind); setPage(1); }} className="rounded border p-2">
      <option value="">{ar ? 'الكل' : 'All'}</option>{REFERENCE_QUALITY_ISSUES.map(issue => <option key={issue} value={issue}>{labels[issue][ar ? 0 : 1]}</option>)}
    </select></label>
    {status === 'loading' && <p role="status">{ar ? 'جارٍ تحميل المشكلات…' : 'Loading issues…'}</p>}
    {status === 'error' && <p role="alert">{ar ? 'تعذر قراءة تقرير الجودة. النتيجة غير معروفة؛ حاول التحديث.' : 'Quality report unavailable. Results are unknown; try refreshing.'}</p>}
    {report && <>
      <div className="flex flex-wrap gap-2">{REFERENCE_QUALITY_ISSUES.map(issue => <button type="button" key={issue} aria-pressed={kind === issue} onClick={() => { setKind(issue); setPage(1); }} className="rounded border p-2 text-xs">{labels[issue][ar ? 0 : 1]}: {report.counts[issue]}</button>)}</div>
      <p className="text-xs">{ar ? 'وقت التقرير' : 'As of'}: {report.asOf}</p>
      {!report.data.length && <p role="status">{ar ? 'لا توجد مشكلات مطابقة.' : 'No matching issues.'}</p>}
      <ul>{report.data.map(row => <li key={`${row.entityType}:${row.referenceId}:${row.kind}`} className="border-b py-2">
        <a href={recordLink(row)} className="underline">{row.name}</a> · {labels[row.kind][ar ? 0 : 1]} · {row.countryIso2Code ?? 'GLOBAL'}
        <span className="block text-xs" dir="ltr">{row.referenceId}</span>
      </li>)}</ul>
      <nav aria-label={ar ? 'صفحات مشكلات الجودة' : 'Quality issue pages'} className="flex gap-3">
        <button type="button" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>{ar ? 'السابق' : 'Previous'}</button>
        <span>{page} · {report.total}</span>
        <button type="button" disabled={page >= 1000 || page * report.pageSize >= report.total} onClick={() => setPage(value => value + 1)}>{ar ? 'التالي' : 'Next'}</button>
      </nav>
    </>}
  </section>;
}
