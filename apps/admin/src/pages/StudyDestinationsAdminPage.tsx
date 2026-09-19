import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, FileWarning, Globe2, Loader2, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { adminApiClient } from '../api/client';
import { useTranslation } from '../i18n/I18nProvider';

type DestinationStatus = 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'ARCHIVED';
type CompletenessStatus = 'INCOMPLETE' | 'READY_FOR_REVIEW' | 'READY_TO_PUBLISH' | 'COMPLETE';

interface ReferenceCountry {
  id: string;
  iso2Code: string;
  iso3Code: string;
  name: string;
  nameAr?: string | null;
  officialName?: string | null;
  region?: string | null;
  subregion?: string | null;
  defaultCurrencyCode?: string | null;
  defaultLanguageCode?: string | null;
  isActive: boolean;
}

interface DestinationProfile {
  id: string;
  status: DestinationStatus;
  completenessStatus: CompletenessStatus;
  sourceVerificationStatus: 'UNVERIFIED' | 'VERIFIED';
  publishedAt?: string | null;
  isFeatured: boolean;
}

interface Readiness {
  readyForReview: boolean;
  readyForPublish: boolean;
  completenessStatus: CompletenessStatus;
  checks: Array<{ key: string; label: string; complete: boolean; blocking: boolean; message?: string }>;
}

interface ListItem {
  country: ReferenceCountry;
  profile: DestinationProfile | null;
  readiness: Readiness | null;
}

interface PageResult {
  data: ListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const statusLabel = (status: string, isAr: boolean) => ({
  NO_PROFILE: isAr ? 'غير مهيأة' : 'No profile',
  DRAFT: isAr ? 'مسودة' : 'Draft',
  IN_REVIEW: isAr ? 'قيد المراجعة' : 'In review',
  PUBLISHED: isAr ? 'منشورة' : 'Published',
  ARCHIVED: isAr ? 'مؤرشفة' : 'Archived',
  INCOMPLETE: isAr ? 'ناقصة' : 'Incomplete',
  READY_FOR_REVIEW: isAr ? 'جاهزة للمراجعة' : 'Ready for review',
  READY_TO_PUBLISH: isAr ? 'جاهزة للنشر' : 'Ready to publish',
  COMPLETE: isAr ? 'مكتملة' : 'Complete',
  VERIFIED: isAr ? 'المصادر موثقة' : 'Sources verified',
  UNVERIFIED: isAr ? 'المصادر غير موثقة' : 'Sources unverified',
}[status] ?? status);

function flagEmoji(code: string): string {
  try { return String.fromCodePoint(...code.toUpperCase().split('').map((char) => 127397 + char.charCodeAt(0))); }
  catch { return '🌐'; }
}

export function StudyDestinationsAdminPage() {
  const { language } = useTranslation();
  const isAr = language === 'ar';
  const [result, setResult] = useState<PageResult>({ data: [], total: 0, page: 1, pageSize: 50, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('');
  const [status, setStatus] = useState('');
  const [completeness, setCompleteness] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: '1', pageSize: '100' });
      if (query.trim()) params.set('q', query.trim());
      if (region) params.set('region', region);
      if (status) params.set('status', status);
      if (completeness) params.set('completenessStatus', completeness);
      setResult(await adminApiClient.request<PageResult>(`/admin/study-destinations?${params}`));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'STUDY_DESTINATIONS_LOAD_FAILED');
    } finally {
      setLoading(false);
    }
  }, [query, region, status, completeness]);

  useEffect(() => { const id = window.setTimeout(load, 220); return () => window.clearTimeout(id); }, [load]);

  const stats = useMemo(() => {
    const rows = result.data;
    return {
      canonical: result.total,
      configured: rows.filter((item) => item.profile).length,
      published: rows.filter((item) => item.profile?.status === 'PUBLISHED').length,
      ready: rows.filter((item) => item.readiness?.readyForPublish).length,
      missing: rows.filter((item) => !item.profile).length,
    };
  }, [result]);

  return (
    <div className="mx-auto max-w-7xl space-y-6" dir={isAr ? 'rtl' : 'ltr'}>
      <header className="rounded-3xl border border-[#142B5F]/15 bg-gradient-to-br from-[#142B5F] to-[#0E7C86] p-6 text-white shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[#F8D58A]"><Globe2 className="h-5 w-5" /><span className="text-sm font-bold">MANARATAK · Study Destinations</span></div>
            <h1 className="text-3xl font-black">{isAr ? 'دول الدراسة' : 'Study Destinations'}</h1>
            <p className="mt-2 max-w-3xl text-sm text-white/80">{isAr ? 'ملفات تحريرية موثقة فوق الدولة المرجعية Canonical؛ لا تُعامل كل دولة في Reference Data تلقائيًا كوجهة دراسة.' : 'Verified editorial profiles layered on canonical countries; Reference Data countries are not automatically study destinations.'}</p>
          </div>
          <button onClick={load} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/20"><RefreshCw className="h-4 w-4" />{isAr ? 'تحديث' : 'Refresh'}</button>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric icon={Globe2} label={isAr ? 'دول ضمن النتيجة' : 'Countries in result'} value={stats.canonical} />
        <Metric icon={ShieldCheck} label={isAr ? 'ملفات مهيأة' : 'Configured profiles'} value={stats.configured} />
        <Metric icon={CheckCircle2} label={isAr ? 'منشورة' : 'Published'} value={stats.published} accent />
        <Metric icon={CheckCircle2} label={isAr ? 'جاهزة للنشر' : 'Ready to publish'} value={stats.ready} />
        <Metric icon={FileWarning} label={isAr ? 'بدون ملف' : 'No profile'} value={stats.missing} />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          <label className="relative block">
            <Search className={`absolute top-3 h-4 w-4 text-slate-400 ${isAr ? 'right-3' : 'left-3'}`} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={isAr ? 'ابحث باسم الدولة أو ISO...' : 'Search country or ISO...'} className={`w-full rounded-xl border border-slate-200 py-2.5 text-sm outline-none focus:border-[#142B5F] focus:ring-2 focus:ring-[#142B5F]/10 ${isAr ? 'pr-10 pl-3' : 'pl-10 pr-3'}`} />
          </label>
          <select value={region} onChange={(e) => setRegion(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="">{isAr ? 'كل المناطق' : 'All regions'}</option>{['Asia','Africa','Europe','Americas','Oceania'].map((value) => <option key={value}>{value}</option>)}</select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="">{isAr ? 'كل حالات الملف' : 'All profile states'}</option>{['NO_PROFILE','DRAFT','IN_REVIEW','PUBLISHED','ARCHIVED'].map((value) => <option value={value} key={value}>{statusLabel(value, isAr)}</option>)}</select>
          <select value={completeness} onChange={(e) => setCompleteness(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="">{isAr ? 'كل حالات الاكتمال' : 'All completeness'}</option>{['INCOMPLETE','READY_FOR_REVIEW','READY_TO_PUBLISH','COMPLETE'].map((value) => <option value={value} key={value}>{statusLabel(value, isAr)}</option>)}</select>
        </div>
      </section>

      {error && <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800"><AlertCircle className="h-5 w-5" />{error}</div>}
      {loading ? <div className="flex min-h-56 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-[#142B5F]" /></div> : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {result.data.map(({ country, profile, readiness }) => {
            const blocking = readiness?.checks.filter((check) => check.blocking && !check.complete).length ?? 0;
            return <article key={country.id} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#142B5F]/30 hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3"><div className="text-4xl">{flagEmoji(country.iso2Code)}</div><div className="min-w-0"><h2 className="truncate text-lg font-black text-slate-900">{isAr ? (country.nameAr || country.name) : country.name}</h2><p className="text-xs text-slate-500">{country.iso2Code} · {country.iso3Code} · {country.region || '-'}</p></div></div>
                <StatusBadge value={profile?.status ?? 'NO_PROFILE'} isAr={isAr} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs"><Info label={isAr ? 'الاكتمال' : 'Completeness'} value={profile ? statusLabel(profile.completenessStatus, isAr) : '-'} /><Info label={isAr ? 'المصادر' : 'Sources'} value={profile ? statusLabel(profile.sourceVerificationStatus, isAr) : '-'} /><Info label={isAr ? 'العملة المرجعية' : 'Reference currency'} value={country.defaultCurrencyCode || '-'} /><Info label={isAr ? 'اللغة المرجعية' : 'Reference language'} value={country.defaultLanguageCode || '-'} /></div>
              {profile && <div className={`mt-4 rounded-xl px-3 py-2 text-xs font-semibold ${blocking ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}>{blocking ? (isAr ? `${blocking} متطلبات تمنع النشر` : `${blocking} publishing blockers`) : (isAr ? 'لا توجد موانع نشر في فحص الجاهزية' : 'No publishing blockers in readiness check')}</div>}
              <Link to={`/study-destinations/${country.iso2Code}`} className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-[#142B5F] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#142B5F]">{profile ? (isAr ? 'إدارة ملف الدولة' : 'Manage destination') : (isAr ? 'تهيئة ملف وجهة الدراسة' : 'Configure destination')}</Link>
            </article>;
          })}
          {!result.data.length && <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">{isAr ? 'لا توجد نتائج مطابقة.' : 'No matching destinations.'}</div>}
        </section>
      )}
    </div>
  );
}

function Metric({ icon: Icon, label, value, accent = false }: { icon: typeof Globe2; label: string; value: number; accent?: boolean }) {
  return <div className={`rounded-2xl border bg-white p-4 shadow-sm ${accent ? 'border-[#D6A43B]/50' : 'border-slate-200'}`}><div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-500">{label}</span><Icon className={`h-4 w-4 ${accent ? 'text-[#D6A43B]' : 'text-[#142B5F]'}`} /></div><div className="mt-2 text-2xl font-black text-slate-900">{value}</div></div>;
}
function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-lg bg-slate-50 p-2"><div className="text-[10px] font-bold uppercase text-slate-400">{label}</div><div className="mt-1 truncate font-semibold text-slate-700">{value}</div></div>; }
function StatusBadge({ value, isAr }: { value: string; isAr: boolean }) { const styles = value === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-800' : value === 'IN_REVIEW' ? 'bg-amber-100 text-amber-800' : value === 'ARCHIVED' ? 'bg-slate-200 text-slate-600' : value === 'NO_PROFILE' ? 'bg-rose-50 text-rose-700' : 'bg-blue-50 text-blue-700'; return <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ${styles}`}>{statusLabel(value, isAr)}</span>; }
