import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  readXlsxWorkbook,
  spreadsheetRowsToObjects,
} from '@manaratak/shared';
import { FileCheck2, Loader2, Upload } from 'lucide-react';

import type { ReferenceDataCollection, ReferenceDataFilters } from '@manaratak/domain';
import { getReferenceDataPage, referenceDataAdminApi } from '../api/referenceData';
import { AdministrativeRegionsTab } from './AdministrativeRegionsTab';
import { canonicalPickerApi } from '../api/canonicalPickers';
import { CanonicalPicker } from '../components/CanonicalPicker';
import { ReferenceGovernanceButton, CityCountryQuality } from '../components/ReferenceGovernancePanel';

/** Bounded owner-API query state, shareable as URL parameters. */
function readP7Url() {
  const params = new URLSearchParams(window.location.search);
  const rawPage = Number(params.get('p7Page') ?? '1');
  return {
    page: Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1,
    q: params.get('p7Q') ?? '',
    status: params.get('p7Status') === 'all' ? 'all' as const :
      params.get('p7Status') === 'nonactive' ? 'nonactive' as const : 'active' as const,
    country: params.get('p7Country') ?? '',
  };
}

function useFetchData(collection: ReferenceDataCollection) {
  const initial = useRef(readP7Url()).current;
  const [data, setData] = useState<any[]>([]);
  const [page, setPage] = useState(initial.page);
  const [q, setQ] = useState(initial.q);
  const [status, setStatus] = useState<'active' | 'all' | 'nonactive'>(initial.status);
  const [country, setCountry] = useState(initial.country);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestSequence = useRef(0);
  const deferredQ = React.useDeferredValue(q);
  const supportsCountry = collection === 'cities' || collection === 'regions';
  const updateQ = (next: string) => { setQ(next); setPage(1); };
  const updateStatus = (next: 'active' | 'all' | 'nonactive') => { setStatus(next); setPage(1); };
  const updateCountry = (next: string) => { setCountry(next.toUpperCase()); setPage(1); };
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('p7Page', String(page));
    if (q) url.searchParams.set('p7Q', q); else url.searchParams.delete('p7Q');
    url.searchParams.set('p7Status', status);
    if (supportsCountry && country) url.searchParams.set('p7Country', country);
    else url.searchParams.delete('p7Country');
    window.history.replaceState(window.history.state, '', url.toString());
  }, [page, q, status, country, supportsCountry]);
  const fetchData = useCallback(async () => {
    const sequence = ++requestSequence.current;
    setLoading(true); setError(null);
    try {
      const filters: ReferenceDataFilters = { page, pageSize: 50, q: deferredQ || undefined, activeOnly: status === 'active', nonActiveOnly: status === 'nonactive' };
      if (supportsCountry && country) filters.countryIso2Code = country;
      const result = await getReferenceDataPage<any>(collection, filters);
      if (sequence !== requestSequence.current) return;
      setData(result.data); setTotal(result.total); setTotalPages(result.totalPages);
    } catch (err: unknown) {
      if (sequence !== requestSequence.current) return;
      setData([]); setTotal(0); setTotalPages(0);
      setError(err instanceof Error ? err.message : 'Reference data unavailable');
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }, [collection, page, deferredQ, status, country, supportsCountry]);
  useEffect(() => {
    void fetchData();
    return () => { requestSequence.current++; };
  }, [fetchData]);
  return { data, loading, error, refetch: fetchData, page, total, totalPages, setPage,
    q, setQ: updateQ, status, setStatus: updateStatus, country, setCountry: updateCountry, supportsCountry };
}

function ReferenceFilters({ q, setQ, status, setStatus, country, setCountry, supportsCountry }: Pick<ReturnType<typeof useFetchData>,
  'q' | 'setQ' | 'status' | 'setStatus' | 'country' | 'setCountry' | 'supportsCountry'>) {
  return <div className="flex flex-wrap gap-3 mb-4 items-end" dir="rtl">
    <label className="flex flex-col gap-1 text-xs font-bold">بحث / Search
      <input className="border rounded-lg px-3 py-2 text-sm" aria-label="بحث البيانات المرجعية" value={q} onChange={e => setQ(e.target.value)} placeholder="الاسم أو الرمز" />
    </label>
    <label className="flex flex-col gap-1 text-xs font-bold">الحالة / Status
      <select className="border rounded-lg px-3 py-2 text-sm" value={status} onChange={e => setStatus(e.target.value as 'active' | 'all' | 'nonactive')}>
        <option value="active">النشطة فقط / Active</option>
        <option value="all">جميع الحالات / All</option>
        <option value="nonactive">غير النشطة فقط / Non-active</option>
      </select>
    </label>
    {supportsCountry && <label className="flex flex-col gap-1 text-xs font-bold">رمز الدولة / ISO2
      <input className="border rounded-lg px-3 py-2 text-sm w-24" value={country} maxLength={2} onChange={e => setCountry(e.target.value)} placeholder="YE" />
    </label>}
  </div>;
}

function ReferencePagination({ page, totalPages, setPage, loading }: {
  page: number; totalPages: number; setPage: (page: number) => void; loading: boolean;
}) {
  return <div dir="rtl" className="flex items-center gap-3 mb-3">
    <button type="button" className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-black text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 transition" disabled={loading || page <= 1} onClick={() => setPage(page - 1)}>السابق</button>
    <span className="text-xs font-black text-slate-600">الصفحة {page} / {Math.max(1, totalPages)}</span>
    <button type="button" className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-black text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 transition" disabled={loading || page >= totalPages} onClick={() => setPage(page + 1)}>التالي</button>
  </div>;
}

export function ReferenceDataAdminPage() {
  const tabValues: ReferenceDataCollection[] = ['countries', 'currencies', 'languages', 'regions', 'cities'];
  const [activeTab, setActiveTab] = useState<ReferenceDataCollection>(() => {
    const value = new URLSearchParams(window.location.search).get('p7Tab');
    return tabValues.includes(value as ReferenceDataCollection) ? value as ReferenceDataCollection : 'countries';
  });
  const selectTab = (tab: ReferenceDataCollection) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('p7Tab', tab);
    url.searchParams.set('p7Page', '1');
    window.history.replaceState(window.history.state, '', url.toString());
  };
  const [tabRevision, setTabRevision] = useState(0);
  const [quality, setQuality] = useState<Awaited<ReturnType<typeof referenceDataAdminApi.qualitySnapshot>> | null>(null);
  const [standards, setStandards] = useState<Awaited<ReturnType<typeof referenceDataAdminApi.standardsReadiness>> | null>(null);
  const [standardsError, setStandardsError] = useState(false);
  const [qualityState, setQualityState] = useState<'loading' | 'ready' | 'error'>('loading');
  useEffect(() => {
    let live = true;
    referenceDataAdminApi.standardsReadiness().then(result => {
      if (live) setStandards(result);
    }).catch(() => { if (live) setStandardsError(true); });
    referenceDataAdminApi.qualitySnapshot().then(result => {
      if (live) { setQuality(result); setQualityState('ready'); }
    }).catch(() => { if (live) setQualityState('error'); });
    return () => { live = false; };
  }, []);
  const drillDown = (collection: ReferenceDataCollection, nonActiveOnly = false) => {
    const url = new URL(window.location.href);
    url.searchParams.set('p7Status', nonActiveOnly ? 'nonactive' : 'active');
    url.searchParams.set('p7Page', '1');
    url.searchParams.delete('p7Q');
    window.history.replaceState(window.history.state, '', url.toString());
    // Remount the selected tab so its URL-backed owner filters reload.
    setActiveTab(collection);
    setTabRevision(revision => revision + 1);
  };

  const tabLabels: Record<string, string> = {
    countries: 'الدول المعتمدة',
    currencies: 'العملات المتداولة',
    languages: 'اللغات المدعومة',
    regions: 'المناطق الإدارية والولايات',
    cities: 'المدن والمناطق المحلية'
  };

  return (
    <div dir="rtl" className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4 bg-gradient-to-r from-indigo-50/50 to-teal-50/40 p-5 rounded-3xl border border-slate-100">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-900">البيانات المرجعية والمؤسسية</h2>
          <p className="text-sm text-slate-500 mt-1 font-medium">الإعدادات المرجعية الأساسية لبيانات الدول، العملات، اللغات، الولايات، والمناطق والمدن المحلية لتسهيل عمليات الاستيراد والقبول.</p>
        </div>
      </div>
      
      <section className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
        <h3 className="font-black text-base">جودة وتغطية البيانات المرجعية / Reference quality</h3>
        {qualityState === 'loading' && <p role="status">جارٍ تحميل المؤشرات من خادم البيانات المرجعية…</p>}
        {qualityState === 'error' && <p role="alert" className="text-red-600">تعذر جلب بيانات المؤشرات. الجودة والتغطية: غير معروفة / Unknown.</p>}
        {quality && <div className="grid grid-cols-2 md:grid-cols-5 gap-2">{quality.data.map(item => (
          <button key={item.collection} type="button" onClick={() => drillDown(item.collection)}
            className="text-right rounded-xl border p-3 hover:bg-slate-50" aria-label={`عرض تفاصيل ${item.collection}`}>
            <span className="block text-xs font-bold">{item.collection}</span>
            <span className="block text-lg font-black">{item.active} / {item.total}</span>
            <span className="block text-xs">غير نشطة: {item.nonActive}</span>
            <span className="block text-xs text-amber-700">التغطية الموثّقة: unknown</span>
          </button>
        ))}</div>}
        <p className="text-xs text-slate-600">الأعداد من خادم P7 فقط. جودة الأسماء البديلة والروابط والمصادر الرسمية: unknown حتى تتوفر أدلة قابلة للفحص. انقر على المجموعة للاطلاع على سجلاتها.</p>
      </section>
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-2">
        <h3 className="font-bold text-sm">حالة المعايير المرجعية / Official standards evidence</h3>
        {!standards && !standardsError && <p role="status" className="text-xs">جارٍ قراءة سجل المصادر المعتمدة…</p>}
        {standardsError && <p role="alert" className="text-xs text-red-800">تعذر قراءة سجل المعايير؛ لا يمكن إثبات سلامة مصدر البيانات.</p>}
        {standards && <>
          <div className="flex flex-wrap gap-2">{standards.data.map(item =>
            <span key={item.standardFamily} className="rounded border border-amber-300 bg-white px-2 py-1 text-xs">
              {item.standardFamily}: {item.readiness === 'EVIDENCE_RECORDED' ? item.sourceVersion : 'غير موثق / Missing reviewed snapshot'}
            </span>)}</div>
          <p className="text-xs text-amber-900">مطابقة صيغة الرموز وحدها لا تثبت الانتماء إلى ISO أو IANA أو CLDR.
            تظل الشهادات غير معتمدة حتى تُراجع نسخ المصدر والتجزئة الرقمية (SHA-256) والجهة المراجعة.</p>
        </>}
      </section>
      <div className="bg-white border border-slate-200/80 rounded-3xl shadow-xs overflow-hidden">
        <div className="flex border-b border-slate-100 bg-slate-50/60 overflow-x-auto p-2 gap-2">
          {(['countries', 'currencies', 'languages', 'regions', 'cities'] as const).map(tab => (
            <button 
              key={tab}
              className={`px-5 py-2.5 text-sm font-black rounded-xl transition-all duration-200 whitespace-nowrap ${
                activeTab === tab 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/15' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              onClick={() => selectTab(tab)}
            >
              {tabLabels[tab] || tab}
            </button>
          ))}
        </div>
        
        <div className="p-6">
          {activeTab === 'countries' && <CountriesTab key={tabRevision} />}
          {activeTab === 'currencies' && <CurrenciesTab key={tabRevision} />}
          {activeTab === 'languages' && <LanguagesTab key={tabRevision} />}
          {activeTab === 'cities' && <CitiesTab key={tabRevision} />}
          {activeTab === 'regions' && <AdministrativeRegionsTab key={tabRevision} />}
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, required = false, disabled = false }: any) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">{label} {required && '*'}</label>
      <input 
        type="text" 
        value={value} 
        onChange={e => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
      />
    </div>
  );
}

/** Code is persisted for Country defaults but options are server-owned canonical
 * records. Do not grant selection to inactive or arbitrary typed free text.
 */
function ActiveReferenceCodeChooser({ label, type, value, onChange }: {
  label: string; type: 'CURRENCY' | 'LANGUAGE'; value: string;
  onChange: (code: string) => void;
}) {
  const [q, setQ] = useState('');
  const [options, setOptions] = useState<Awaited<ReturnType<typeof canonicalPickerApi.currencies>>>([]);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState('');
  useEffect(() => {
    if (q.trim().length < 2) { setOptions([]); setPending(false); return; }
    let alive = true;
    const handle = setTimeout(() => {
      setPending(true);
      const load = type === 'CURRENCY' ? canonicalPickerApi.currencies : canonicalPickerApi.languages;
      load(q.trim()).then(items => {
        if (alive) { setOptions(items.filter(item => item.lifecycle === 'ACTIVE')); setFailure(''); }
      }).catch((err: unknown) => {
        if (alive) { setOptions([]); setFailure(err instanceof Error ? err.message : 'تعذر البحث'); }
      }).finally(() => { if (alive) setPending(false); });
    }, 250);
    return () => { alive = false; clearTimeout(handle); };
  }, [type, q]);
  return <div className="space-y-2">
    <label className="text-sm font-medium text-gray-700">{label}
      <span className="text-xs font-mono ms-2">{value || 'Not selected'}</span>
      <input className="w-full border rounded px-3 py-2 text-sm mt-1" value={q}
        placeholder="Search canonical references by code/name…"
        onChange={e => setQ(e.target.value)} />
    </label>
    {pending && <p className="text-xs">جاري البحث…</p>}
    {failure && <p role="alert" className="text-red-700 text-xs">{failure}</p>}
    <div className="flex flex-wrap gap-2 max-h-36 overflow-auto">
      {options.map(item => <button key={item.id} type="button" className="border rounded px-2 py-1 text-xs"
        disabled={!item.code} onClick={() => { onChange(item.code || ''); setQ(''); setOptions([]); }}>
        {item.code} — {item.label}</button>)}
      {value && <button type="button" onClick={() => { onChange(''); setQ(''); setOptions([]); }}
        className="text-red-700 underline text-xs">Clear</button>}
    </div>
  </div>;
}

function CountriesTab() {
  const queryState = useFetchData('countries');
  const { data, loading, error, refetch, page, total, totalPages, setPage, status } = queryState;
  const [form, setForm] = useState({ iso2Code: '', iso3Code: '', name: '', nameAr: '', officialName: '', region: '', subregion: '', defaultCurrencyCode: '', defaultLanguageCode: '', callingCode: '' });
  const [editing, setEditing] = useState<{ id: string; expectedVersion: number; lifecycleState: string } | null>(null);
  const [saveStatus, setSaveStatus] = useState<{loading: boolean, error?: string, success?: string}>({ loading: false });
  const [preview, setPreview] = useState<any>(null);
  const [previewStatus, setPreviewStatus] = useState<{ loading: boolean; error?: string }>({ loading: false });

  const handlePreview = async (file?: File) => {
    if (!file) return;
    setPreview(null);
    setPreviewStatus({ loading: true });
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const workbook = await readXlsxWorkbook(bytes);
      const sheet = workbook.sheets.get('Countries');
      if (!sheet) throw new Error('The workbook must contain a Countries sheet.');
      const records = spreadsheetRowsToObjects<Record<string, unknown>>(sheet, { defaultValue: null, raw: false });
      const hash = await crypto.subtle.digest('SHA-256', bytes);
      const sha256 = Array.from(new Uint8Array(hash)).map(value => value.toString(16).padStart(2, '0')).join('');
      setPreview(await referenceDataAdminApi.previewCountries({ sourceName: file.name, sourceVersion: sha256.slice(0, 16), sha256, records }));
      setPreviewStatus({ loading: false });
    } catch (err: any) {
      setPreviewStatus({ loading: false, error: err.message });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus({ loading: true });
    try {
      await referenceDataAdminApi.saveCountry({ ...form, ...(editing ? { id: editing.id, expectedVersion: editing.expectedVersion } : {}),
        nameAr: form.nameAr || null, officialName: form.officialName || null,
        region: form.region || null, subregion: form.subregion || null,
        defaultCurrencyCode: form.defaultCurrencyCode || null,
        defaultLanguageCode: form.defaultLanguageCode || null,
        callingCode: form.callingCode || null });
      setSaveStatus({ loading: false, success: 'Saved successfully' });
      setForm({ iso2Code: '', iso3Code: '', name: '', nameAr: '', officialName: '', region: '', subregion: '', defaultCurrencyCode: '', defaultLanguageCode: '', callingCode: '' });
      setEditing(null);
      refetch();
    } catch (err: any) {
      setSaveStatus({ loading: false, error: err.message });
    }
  };

  return (
    <div className="space-y-8">
      <section className="border border-gray-200 bg-white p-4 rounded-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="font-bold text-lg">Country source preview</h3>
            <p className="text-sm text-gray-500">Validate the unified workbook before database promotion.</p>
          </div>
          <label className="inline-flex items-center justify-center gap-2 bg-black text-white px-4 py-2 rounded text-sm font-medium cursor-pointer hover:bg-gray-800">
            <Upload className="h-4 w-4" /> Select workbook
            <input type="file" accept=".xlsx" className="sr-only" onChange={event => handlePreview(event.target.files?.[0])} />
          </label>
        </div>
        {previewStatus.loading && <div className="flex items-center gap-2 text-sm text-gray-600"><Loader2 className="h-4 w-4 animate-spin" /> Validating source...</div>}
        {previewStatus.error && <p className="text-sm text-red-600">{previewStatus.error}</p>}
        {preview && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <PreviewMetric label="Records" value={preview.totalRecords} />
              <PreviewMetric label="Valid" value={preview.validRecords} />
              <PreviewMetric label="Invalid" value={preview.invalidRecords} />
              <PreviewMetric label="Needs review" value={preview.reviewRequiredRecords} />
            </div>
            <div className="flex items-start gap-2 border border-amber-200 bg-amber-50 text-amber-800 p-3 rounded text-sm">
              <FileCheck2 className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Dry run complete. Database writes: {preview.databaseWrites}. Promotion remains blocked until the database recovery gate and source review are closed.</span>
            </div>
          </div>
        )}
      </section>
      <form onSubmit={handleSave} className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
        <h3 className="font-bold text-lg">{editing ? 'تحرير الدولة المحددة / Edit country' : 'إضافة دولة / Add country'}</h3>
        {editing && <p className="text-xs">Canonical ID: {editing.id} | expectedVersion: {editing.expectedVersion} | {editing.lifecycleState}</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="ISO2 Code" required disabled={Boolean(editing)} value={form.iso2Code} onChange={(v: string) => setForm({...form, iso2Code: v})} />
          <Input label="ISO3 Code" required disabled={Boolean(editing)} value={form.iso3Code} onChange={(v: string) => setForm({...form, iso3Code: v})} />
          <Input label="Name" required value={form.name} onChange={(v: string) => setForm({...form, name: v})} />
          <Input label="Arabic Name (optional)" value={form.nameAr} onChange={(v: string) => setForm({...form, nameAr: v})} />
          <Input label="Official country name (optional)" value={form.officialName} onChange={(v: string) => setForm({...form, officialName: v})} />
          <Input label="Region (optional)" value={form.region} onChange={(v: string) => setForm({...form, region: v})} />
          <Input label="Subregion (optional)" value={form.subregion} onChange={(v: string) => setForm({...form, subregion: v})} />
          <Input label="Calling code (optional)" value={form.callingCode} onChange={(v: string) => setForm({...form, callingCode: v})} />
          <ActiveReferenceCodeChooser label="Default currency (active ISO4217)" type="CURRENCY"
            value={form.defaultCurrencyCode} onChange={code => setForm(prev => ({ ...prev, defaultCurrencyCode: code }))} />
          <ActiveReferenceCodeChooser label="Default language (active ISO639)" type="LANGUAGE"
            value={form.defaultLanguageCode} onChange={code => setForm(prev => ({ ...prev, defaultLanguageCode: code }))} />
        </div>
        <div className="flex items-center gap-4">
          <button type="submit" disabled={saveStatus.loading || (Boolean(editing) && editing?.lifecycleState !== 'ACTIVE')} className="bg-black text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
            {saveStatus.loading ? 'Saving...' : 'Save'}
          </button>
          {saveStatus.success && <span className="text-green-600 text-sm">{saveStatus.success}</span>}
          {saveStatus.error && <span className="text-red-600 text-sm">{saveStatus.error}</span>}
          {editing && <button type="button" onClick={() => { setEditing(null); setForm({ iso2Code: '', iso3Code: '', name: '', nameAr: '', officialName: '', region: '', subregion: '', defaultCurrencyCode: '', defaultLanguageCode: '', callingCode: '' }); setSaveStatus({ loading: false }); }}>إلغاء التحرير / Cancel</button>}
        </div>
      </form>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">{status === 'active' ? 'Active records' : status === 'nonactive' ? 'Non-active records' : 'All records'} ({total})</h3>
          <button onClick={refetch} className="text-sm text-blue-600 hover:underline">Refresh</button>
        </div>
        <ReferenceFilters {...queryState} />
        <ReferencePagination page={page} totalPages={totalPages} setPage={setPage} loading={loading} />
        {loading && <p className="text-gray-500">Loading...</p>}
        {error && <p className="text-red-600">{error}</p>}
        {!loading && !error && data.length === 0 && <p className="text-gray-500 text-sm">No records found.</p>}
        {data.length > 0 && (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr><th className="p-3">ISO2</th><th className="p-3">ISO3</th><th className="p-3">Name</th><th className="p-3">Region</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.map(item => (
                  <tr key={item.iso2Code} className="hover:bg-gray-50">
                    <td className="p-3 font-mono">{item.iso2Code}</td><td className="p-3 font-mono">{item.iso3Code}</td><td className="p-3">{item.name}</td><td className="p-3">{item.region || '-'}</td><td className="p-3">{item.lifecycleState}</td>
                    <td className="p-3"><button type="button" className="text-indigo-600 underline" onClick={() => {
                      setEditing({ id: item.id, expectedVersion: item.versionNumber, lifecycleState: item.lifecycleState });
                      setForm({ iso2Code: item.iso2Code, iso3Code: item.iso3Code, name: item.name,
                         nameAr: item.nameAr ?? '', officialName: item.officialName ?? '',
                         region: item.region ?? '', subregion: item.subregion ?? '',
                         callingCode: item.callingCode ?? '',
                         defaultCurrencyCode: item.defaultCurrencyCode ?? '',
                         defaultLanguageCode: item.defaultLanguageCode ?? '' });
                      setSaveStatus({ loading: false });
                    }}>تحرير / Edit</button> <ReferenceGovernanceButton entityType="COUNTRY" record={item} onChanged={refetch} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function PreviewMetric({ label, value }: { label: string; value: number }) {
  return <div className="border border-gray-200 rounded p-3"><div className="text-xs text-gray-500">{label}</div><div className="text-xl font-bold mt-1">{value}</div></div>;
}

function DerivedReferencePreview({ kind }: { kind: 'currencies' | 'languages' }) {
  const [result, setResult] = useState<any>(null);
  const [status, setStatus] = useState<{ loading: boolean; error?: string }>({ loading: false });

  const preview = async (file?: File) => {
    if (!file) return;
    setResult(null);
    setStatus({ loading: true });
    try {
      const workbook = await readXlsxWorkbook(new Uint8Array(await file.arrayBuffer()));
      const sheet = workbook.sheets.get('Countries');
      if (!sheet) throw new Error('The workbook must contain a Countries sheet.');
      const records = spreadsheetRowsToObjects<Record<string, unknown>>(sheet, { defaultValue: null, raw: false });
      setResult(await referenceDataAdminApi.previewDerivedReferences(records));
      setStatus({ loading: false });
    } catch (err: any) {
      setStatus({ loading: false, error: err.message });
    }
  };

  const candidates = result?.[kind] ?? [];
  return (
    <section className="border border-gray-200 bg-white p-4 rounded-lg space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="font-bold text-lg">{kind === 'currencies' ? 'Currency candidates' : 'Language candidates'}</h3>
          <p className="text-sm text-gray-500">Extract source codes and usage evidence from the unified Country workbook.</p>
        </div>
        <label className="inline-flex items-center justify-center gap-2 border border-gray-300 px-4 py-2 rounded text-sm font-medium cursor-pointer hover:bg-gray-50">
          <Upload className="h-4 w-4" /> Select workbook
          <input type="file" accept=".xlsx" className="sr-only" onChange={event => preview(event.target.files?.[0])} />
        </label>
      </div>
      {status.loading && <div className="flex items-center gap-2 text-sm text-gray-600"><Loader2 className="h-4 w-4 animate-spin" /> Extracting candidates...</div>}
      {status.error && <p className="text-sm text-red-600">{status.error}</p>}
      {result && (
        <>
          <div className="flex items-center justify-between border border-amber-200 bg-amber-50 text-amber-800 p-3 rounded text-sm">
            <span>{candidates.length} source codes found. Authoritative enrichment is required before promotion.</span>
            <span className="font-mono">writes: {result.databaseWrites}</span>
          </div>
          <div className="overflow-x-auto border border-gray-200 rounded-lg max-h-72">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-700 sticky top-0"><tr><th className="p-3">Code</th><th className="p-3">Suggested display</th><th className="p-3">Usage</th><th className="p-3">Countries</th></tr></thead>
              <tbody className="divide-y divide-gray-200">
                {candidates.map((candidate: any) => <tr key={candidate.code}><td className="p-3 font-mono">{candidate.code}</td><td className="p-3">{candidate.suggestedDisplayName || '-'}</td><td className="p-3">{candidate.usageCount}</td><td className="p-3">{candidate.countryIso2Codes.length}</td></tr>)}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

function CurrenciesTab() {
  const queryState = useFetchData('currencies');
  const { data, loading, error, refetch, page, total, totalPages, setPage, status } = queryState;
  const [form, setForm] = useState({ isoCode: '', name: '', nameAr: '', symbol: '', numericCode: '', minorUnit: '' });
  const [editing, setEditing] = useState<{ id: string; expectedVersion: number; lifecycleState: string } | null>(null);
  const [saveStatus, setSaveStatus] = useState<{loading: boolean, error?: string, success?: string}>({ loading: false });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus({ loading: true });
    try {
      await referenceDataAdminApi.saveCurrency({ ...form, ...(editing ? { id: editing.id, expectedVersion: editing.expectedVersion } : {}), nameAr: form.nameAr || null, symbol: form.symbol || null,
        numericCode: form.numericCode || null,
        minorUnit: form.minorUnit === '' ? null : Number(form.minorUnit) });
      setSaveStatus({ loading: false, success: 'Saved successfully' });
      setForm({ isoCode: '', name: '', nameAr: '', symbol: '', numericCode: '', minorUnit: '' });
      setEditing(null);
      refetch();
    } catch (err: any) {
      setSaveStatus({ loading: false, error: err.message });
    }
  };

  return (
    <div className="space-y-8">
      <DerivedReferencePreview kind="currencies" />
      <form onSubmit={handleSave} className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
        <h3 className="font-bold text-lg">{editing ? 'تحرير العملة المحددة / Edit currency' : 'إضافة عملة / Add currency'}</h3>
        {editing && <p className="text-xs">Canonical ID: {editing.id} | expectedVersion: {editing.expectedVersion} | {editing.lifecycleState}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="ISO Code" required disabled={Boolean(editing)} value={form.isoCode} onChange={(v: string) => setForm({...form, isoCode: v})} />
          <Input label="Name" required value={form.name} onChange={(v: string) => setForm({...form, name: v})} />
          <Input label="Arabic Name (optional)" value={form.nameAr} onChange={(v: string) => setForm({...form, nameAr: v})} />
          <Input label="Symbol (optional)" value={form.symbol} onChange={(v: string) => setForm({...form, symbol: v})} />
          <Input label="Numeric Code (optional)" value={form.numericCode} onChange={(v: string) => setForm({...form, numericCode: v})} />
          <label className="flex flex-col gap-1 text-sm">عدد الخانات العشرية / ISO minor unit (0–4)
            <input type="number" min={0} max={4} step={1} value={form.minorUnit} className="border rounded px-3 py-2"
              onChange={e => setForm({ ...form, minorUnit: e.target.value })} />
          </label>
        </div>
        <div className="flex items-center gap-4">
          <button type="submit" disabled={saveStatus.loading || (Boolean(editing) && editing?.lifecycleState !== 'ACTIVE')} className="bg-black text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
            {saveStatus.loading ? 'Saving...' : 'Save'}
          </button>
          {saveStatus.success && <span className="text-green-600 text-sm">{saveStatus.success}</span>}
          {saveStatus.error && <span className="text-red-600 text-sm">{saveStatus.error}</span>}
          {editing && <button type="button" onClick={() => { setEditing(null); setForm({ isoCode: '', name: '', nameAr: '', symbol: '', numericCode: '', minorUnit: '' }); setSaveStatus({ loading: false }); }}>إلغاء التحرير / Cancel</button>}
        </div>
      </form>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">{status === 'active' ? 'Active records' : status === 'nonactive' ? 'Non-active records' : 'All records'} ({total})</h3>
          <button onClick={refetch} className="text-sm text-blue-600 hover:underline">Refresh</button>
        </div>
        <ReferenceFilters {...queryState} />
        <ReferencePagination page={page} totalPages={totalPages} setPage={setPage} loading={loading} />
        {loading && <p className="text-gray-500">Loading...</p>}
        {error && <p className="text-red-600">{error}</p>}
        {!loading && !error && data.length === 0 && <p className="text-gray-500 text-sm">No records found.</p>}
        {data.length > 0 && (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr><th className="p-3">ISO Code</th><th className="p-3">Name</th><th className="p-3">Symbol</th><th className="p-3">Numeric</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.map(item => (
                  <tr key={item.isoCode} className="hover:bg-gray-50">
                    <td className="p-3 font-mono">{item.isoCode}</td><td className="p-3">{item.name}</td><td className="p-3">{item.symbol || '-'}</td><td className="p-3">{item.numericCode || '-'}</td><td className="p-3">{item.lifecycleState}</td>
                    <td className="p-3"><button type="button" className="text-indigo-600 underline" onClick={() => {
                      setEditing({ id: item.id, expectedVersion: item.versionNumber, lifecycleState: item.lifecycleState });
                      setForm({ isoCode: item.isoCode, name: item.name, nameAr: item.nameAr ?? '',
                         symbol: item.symbol ?? '', numericCode: item.numericCode ?? '',
                         minorUnit: item.minorUnit == null ? '' : String(item.minorUnit) });
                      setSaveStatus({ loading: false });
                    }}>تحرير / Edit</button> <ReferenceGovernanceButton entityType="CURRENCY" record={item} onChanged={refetch} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function LanguagesTab() {
  const queryState = useFetchData('languages');
  const { data, loading, error, refetch, page, total, totalPages, setPage, status } = queryState;
  const [form, setForm] = useState({ isoCode: '', name: '', nameAr: '', nativeName: '', direction: 'LTR' as 'LTR' | 'RTL' });
  const [editing, setEditing] = useState<{ id: string; expectedVersion: number; lifecycleState: string } | null>(null);
  const [saveStatus, setSaveStatus] = useState<{loading: boolean, error?: string, success?: string}>({ loading: false });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus({ loading: true });
    try {
      await referenceDataAdminApi.saveLanguage({ ...form, ...(editing ? { id: editing.id, expectedVersion: editing.expectedVersion } : {}), nameAr: form.nameAr || null, nativeName: form.nativeName || null });
      setSaveStatus({ loading: false, success: 'Saved successfully' });
      setForm({ isoCode: '', name: '', nameAr: '', nativeName: '', direction: 'LTR' });
      setEditing(null);
      refetch();
    } catch (err: any) {
      setSaveStatus({ loading: false, error: err.message });
    }
  };

  return (
    <div className="space-y-8">
      <DerivedReferencePreview kind="languages" />
      <form onSubmit={handleSave} className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
        <h3 className="font-bold text-lg">{editing ? 'تحرير اللغة المحددة / Edit language' : 'إضافة لغة / Add language'}</h3>
        {editing && <p className="text-xs">Canonical ID: {editing.id} | expectedVersion: {editing.expectedVersion} | {editing.lifecycleState}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="ISO Code" required disabled={Boolean(editing)} value={form.isoCode} onChange={(v: string) => setForm({...form, isoCode: v})} />
          <Input label="Name" required value={form.name} onChange={(v: string) => setForm({...form, name: v})} />
          <Input label="Arabic Name (optional)" value={form.nameAr} onChange={(v: string) => setForm({...form, nameAr: v})} />
          <Input label="Native Name (optional)" value={form.nativeName} onChange={(v: string) => setForm({...form, nativeName: v})} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Direction *</label>
            <select 
              value={form.direction} 
              onChange={e => setForm({...form, direction: e.target.value as 'LTR' | 'RTL'})}
              className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="LTR">LTR</option>
              <option value="RTL">RTL</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button type="submit" disabled={saveStatus.loading || (Boolean(editing) && editing?.lifecycleState !== 'ACTIVE')} className="bg-black text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
            {saveStatus.loading ? 'Saving...' : 'Save'}
          </button>
          {saveStatus.success && <span className="text-green-600 text-sm">{saveStatus.success}</span>}
          {saveStatus.error && <span className="text-red-600 text-sm">{saveStatus.error}</span>}
          {editing && <button type="button" onClick={() => { setEditing(null); setForm({ isoCode: '', name: '', nameAr: '', nativeName: '', direction: 'LTR' }); setSaveStatus({ loading: false }); }}>إلغاء التحرير / Cancel</button>}
        </div>
      </form>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">{status === 'active' ? 'Active records' : status === 'nonactive' ? 'Non-active records' : 'All records'} ({total})</h3>
          <button onClick={refetch} className="text-sm text-blue-600 hover:underline">Refresh</button>
        </div>
        <ReferenceFilters {...queryState} />
        <ReferencePagination page={page} totalPages={totalPages} setPage={setPage} loading={loading} />
        {loading && <p className="text-gray-500">Loading...</p>}
        {error && <p className="text-red-600">{error}</p>}
        {!loading && !error && data.length === 0 && <p className="text-gray-500 text-sm">No records found.</p>}
        {data.length > 0 && (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr><th className="p-3">ISO Code</th><th className="p-3">Name</th><th className="p-3">Native</th><th className="p-3">Dir</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.map(item => (
                  <tr key={item.isoCode} className="hover:bg-gray-50">
                    <td className="p-3 font-mono">{item.isoCode}</td><td className="p-3">{item.name}</td><td className="p-3">{item.nativeName || '-'}</td><td className="p-3">{item.direction}</td><td className="p-3">{item.lifecycleState}</td>
                    <td className="p-3"><button type="button" className="text-indigo-600 underline" onClick={() => {
                      setEditing({ id: item.id, expectedVersion: item.versionNumber, lifecycleState: item.lifecycleState });
                      setForm({ isoCode: item.isoCode, name: item.name, nameAr: item.nameAr ?? '', nativeName: item.nativeName ?? '', direction: item.direction });
                      setSaveStatus({ loading: false });
                    }}>تحرير / Edit</button> <ReferenceGovernanceButton entityType="LANGUAGE" record={item} onChanged={refetch} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function CitiesTab() {
  const queryState = useFetchData('cities');
  const { data, loading, error, refetch, page, total, totalPages, setPage, status } = queryState;
  const [form, setForm] = useState({ countryIso2Code: '', name: '', nameAr: '', region: '', timezone: '', latitude: '', longitude: '' });
  const [editing, setEditing] = useState<{ id: string; expectedVersion: number; lifecycleState: string } | null>(null);
  const [countryId, setCountryId] = useState<string | null>(null);
  const [regionId, setRegionId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<{loading: boolean, error?: string, success?: string}>({ loading: false });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!countryId || !form.countryIso2Code) {
      setSaveStatus({ loading: false, error: 'الرجاء تحديد دولة معتمدة نشطة أولاً.' });
      return;
    }
    setSaveStatus({ loading: true });
    try {
      await referenceDataAdminApi.saveCity({ ...form, ...(editing ? { id: editing.id, expectedVersion: editing.expectedVersion } : {}), administrativeRegionId: regionId,
        nameAr: form.nameAr || null, region: form.region || null, timezone: form.timezone || null,
        latitude: form.latitude.trim() === '' ? null : Number(form.latitude),
        longitude: form.longitude.trim() === '' ? null : Number(form.longitude) });
      setSaveStatus({ loading: false, success: 'تم حفظ المدينة المحددة بنجاح!' });
      setForm({ countryIso2Code: '', name: '', nameAr: '', region: '', timezone: '', latitude: '', longitude: '' });
      setCountryId(null); setRegionId(null); setEditing(null);
      refetch();
    } catch (err: any) {
      setSaveStatus({ loading: false, error: err.message });
    }
  };

  return (
    <div dir="rtl" className="space-y-8">
      <form onSubmit={handleSave} className="bg-gradient-to-br from-indigo-50/40 via-white to-teal-50/30 p-6 rounded-3xl border border-indigo-100/80 space-y-5 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-[#0E7C86]"></div>
          <h3 className="font-black text-lg text-slate-800">{editing ? 'تحرير المدينة المحددة' : 'إضافة مدينة جديدة'}</h3>
          {editing && <p className="text-xs">Canonical ID: {editing.id} | expectedVersion: {editing.expectedVersion} | {editing.lifecycleState}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <CanonicalPicker label="الدولة المعتمدة" value={countryId} load={(query) => canonicalPickerApi.countries(query)} onChange={(next, option) => { setCountryId(next); setRegionId(null); setForm({ ...form, countryIso2Code: option?.code ?? '' }); }} disabled={saveStatus.loading || Boolean(editing)} />
          <Input label="الاسم بالإنجليزية" required value={form.name} onChange={(v: string) => setForm({...form, name: v})} />
          <Input label="الاسم باللغة العربية (اختياري)" value={form.nameAr} onChange={(v: string) => setForm({...form, nameAr: v})} />
          <CanonicalPicker label="المنطقة الإدارية المعتمدة (اختياري)" value={regionId} load={(query) => canonicalPickerApi.regions(form.countryIso2Code || undefined, query)} reloadKey={`city-region:${form.countryIso2Code}`} onChange={setRegionId} optional disabled={saveStatus.loading || !countryId || Boolean(editing)} />
          <Input label="تسمية المنطقة الإدارية الأصلية (اختياري)" value={form.region} onChange={(v: string) => setForm({...form, region: v})} />
          <label className="flex flex-col gap-1 text-sm">منطقة زمنية IANA (اختياري)
            <input list="p7-city-iana-timezones" className="border rounded px-3 py-2" value={form.timezone}
              placeholder="Asia/Riyadh"
              onChange={e => setForm({ ...form, timezone: e.target.value })} />
            <datalist id="p7-city-iana-timezones">
              {typeof Intl.supportedValuesOf === 'function' &&
                ['UTC', ...Intl.supportedValuesOf('timeZone')].map(zone => <option key={zone} value={zone} />)}
            </datalist>
            <small className="text-slate-500">Runtime ICU suggestions; official IANA version evidence remains pending.</small>
          </label>
          <label className="flex flex-col gap-1 text-sm">Latitude (−90 … 90)
            <input type="number" min={-90} max={90} step="any" value={form.latitude} className="border rounded px-3 py-2"
              onChange={e => setForm({ ...form, latitude: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1 text-sm">Longitude (−180 … 180)
            <input type="number" min={-180} max={180} step="any" value={form.longitude} className="border rounded px-3 py-2"
              onChange={e => setForm({ ...form, longitude: e.target.value })} />
          </label>
        </div>
        <div className="flex items-center gap-4 pt-2">
          <button type="submit" disabled={saveStatus.loading || !countryId || (Boolean(editing) && editing?.lifecycleState !== 'ACTIVE')} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-black hover:bg-indigo-700 disabled:opacity-50 transition shadow-md shadow-indigo-600/15">
            {saveStatus.loading ? 'جارٍ الحفظ الآن...' : 'حفظ بيانات المدينة'}
          </button>
          {saveStatus.success && <span className="text-green-600 text-sm font-bold">{saveStatus.success}</span>}
          {saveStatus.error && <span className="text-red-600 text-sm font-bold">{saveStatus.error}</span>}
          {editing && <button type="button" onClick={() => { setEditing(null); setForm({ countryIso2Code: '', name: '', nameAr: '', region: '', timezone: '', latitude: '', longitude: '' }); setCountryId(null); setRegionId(null); setSaveStatus({ loading: false }); }}>إلغاء التحرير / Cancel</button>}
        </div>
      </form>

      <div className="space-y-4">
        <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <h3 className="font-black text-lg text-slate-800">{status === 'active' ? 'المدن النشطة' : status === 'nonactive' ? 'المدن غير النشطة' : 'جميع حالات المدن'} ({total})</h3>
          <button onClick={refetch} className="text-sm font-black text-indigo-600 hover:text-indigo-800 transition">تحديث القائمة</button>
        </div>
        <ReferenceFilters {...queryState} />
        <CityCountryQuality countryIso2Code={queryState.country} />
        <ReferencePagination page={page} totalPages={totalPages} setPage={setPage} loading={loading} />
        {loading && <p className="text-slate-500 font-bold">جارٍ تحميل قائمة المدن والمسافات المتاحة…</p>}
        {error && <p className="text-red-600 font-bold">{error}</p>}
        {!loading && !error && data.length === 0 && <p className="text-slate-500 text-sm">لا توجد سجلات مدن مضافة حالياً.</p>}
        {data.length > 0 && (
          <div className="overflow-hidden border border-slate-200/80 rounded-2xl shadow-xs">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-black">
                <tr>
                  <th className="p-3 text-right">رمز الدولة</th>
                  <th className="p-3 text-right">اسم المدينة</th>
                  <th className="p-3 text-right">المنطقة الإدارية</th>
                  <th className="p-3 text-right">المنطقة الزمنية</th>
                  <th className="p-3 text-right">حالة السجل</th>
                  <th className="p-3 text-right">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map(item => (
                  <tr key={item.id} className="hover:bg-indigo-50/20 transition duration-150">
                    <td className="p-3 font-mono text-slate-600">{item.countryIso2Code}</td>
                    <td className="p-3 font-bold text-slate-800">{item.nameAr || item.name}</td>
                    <td className="p-3 text-slate-600">{item.administrativeRegion?.nameAr || item.administrativeRegion?.name || item.region || '-'}</td>
                    <td className="p-3 font-mono text-slate-500 text-xs">{item.timezone || '-'}</td>
                    <td className="p-3 text-xs">{item.lifecycleState}</td>
                    <td className="p-3"><button type="button" className="text-indigo-600 underline" onClick={() => {
                      setEditing({ id: item.id, expectedVersion: item.versionNumber, lifecycleState: item.lifecycleState });
                      setForm({ countryIso2Code: item.countryIso2Code, name: item.name, nameAr: item.nameAr ?? '',
                         region: item.region ?? '', timezone: item.timezone ?? '',
                         latitude: item.latitude == null ? '' : String(item.latitude),
                         longitude: item.longitude == null ? '' : String(item.longitude) });
                      setCountryId(item.countryReferenceId ?? null);
                      setRegionId(item.administrativeRegionId ?? null);
                      setSaveStatus({ loading: false });
                    }}>تحرير / Edit</button> <ReferenceGovernanceButton entityType="CITY" record={item} onChanged={refetch} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
