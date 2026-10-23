import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Clock3, FileSpreadsheet, Languages, Link2, School, ShieldCheck, TimerReset } from 'lucide-react';
import { Link } from 'react-router-dom';
import { signalSla, type ReviewFilters, type ReviewItem } from './ReviewContracts';
import type { ReviewPageState } from './ReviewLoader';

/** Presentation of the retained, permission-filtered window; never a global total. */
export function ReviewOverview({ items, states, filters, onFilter, language, now }: {
  items: ReviewItem[];
  states: ReviewPageState[];
  filters: ReviewFilters;
  onFilter: (key: keyof ReviewFilters, value: string) => void;
  language: string;
  now: number;
}) {
  const tr = (ar: string, en: string) => language === 'ar' ? ar : en;
  const Arrow = language === 'ar' ? ArrowLeft : ArrowRight;
  const readable = states.filter(state => state.availability !== 'access_denied');
  const domains = [...new Map(readable.map(state => [state.source.domain, state.source])).values()];
  const names: Record<string, string> = {
    scholarships: tr('المنح', 'Scholarships'), universities: tr('الجامعات', 'Universities'),
    majors: tr('التخصصات', 'Majors'), courses: tr('الدورات', 'Courses'), tests: tr('الاختبارات', 'Tests'),
    services: tr('الخدمات', 'Services'), cms: tr('المحتوى', 'Content'), careers: tr('الوظائف', 'Careers'),
    'study-destinations': tr('وجهات الدراسة', 'Study destinations'),
  };
  const count = (reason: string) => {
    const sources = readable.filter(state => state.source.reason === reason);
    const matching = items.filter(item => item.signals.some(signal => signal.reason === reason)).length;
    return matching || sources.some(state => state.availability === 'ready' || state.availability === 'partial') ? matching : null;
  };
  const number = (value: number | null) => value === null ? '—' : new Intl.NumberFormat(language).format(value);
  const sla = items.flatMap(item => item.signals.map(signal => signalSla(signal, now)));
  const metrics = [
    { key: 'workflow_review', title: tr('قيد المراجعة', 'In review'), icon: Clock3, color: '#142B5F', value: count('workflow_review') },
    { key: 'incomplete', title: tr('بيانات ناقصة', 'Incomplete'), icon: AlertTriangle, color: '#D6A43B', value: count('incomplete') },
    { key: 'ready_to_publish', title: tr('جاهز لدى المالك', 'Owner ready'), icon: CheckCircle2, color: '#0E7C86', value: count('ready_to_publish') },
    { key: 'imported_unreviewed', title: tr('مستورد للمراجعة', 'Imported for review'), icon: FileSpreadsheet, color: '#21A7B4', value: count('imported_unreviewed') },
    { key: 'overdue', title: tr('متجاوز الموعد بدليل', 'Evidenced overdue'), icon: TimerReset, color: '#D6A43B', value: sla.length > 0 && sla.every(value => value !== 'unknown') ? sla.filter(value => value === 'overdue').length : null },
  ];
  const quality = [
    { key: 'needs_translation', title: tr('بحاجة لترجمة', 'Translation needed'), icon: Languages },
    { key: 'source_verification', title: tr('تحقق المصدر', 'Source verification'), icon: ShieldCheck },
    { key: 'broken_link', title: tr('روابط معطلة', 'Broken links'), icon: Link2 },
    { key: 'import_review', title: tr('مراجعة الاستيراد', 'Import review'), icon: FileSpreadsheet },
  ];
  return <>
    <section className="rounded-3xl border border-[#DDEFF2] bg-white p-5 shadow-sm" aria-labelledby="review-signals">
      <h2 id="review-signals" className="text-lg font-black text-[#142B5F]">{tr('إشارات دورة المراجعة', 'Review lifecycle signals')}</h2>
      <p className="mb-4 mt-1 text-xs leading-6 text-slate-500">{tr('أعداد العينة المقروءة فقط، قبل الفلاتر. قد تتداخل الإشارات؛ الشرطة تعني أن القياس غير متاح، ولا تعني صفرًا.', 'Retained sample counts before filters. Signals may overlap; a dash means unavailable, never zero.')}</p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {metrics.map(({ key, title, icon: Icon, color, value }) => <button key={key} type="button"
          aria-pressed={key === 'overdue' ? filters.view === 'overdue' : filters.reason === key}
          onClick={() => key === 'overdue' ? onFilter('view', filters.view === 'overdue' ? 'all' : 'overdue') : onFilter('reason', filters.reason === key ? 'all' : key)}
          className="relative min-h-36 overflow-hidden rounded-2xl border border-[#DDEFF2] bg-white p-4 text-start shadow-xs transition hover:-translate-y-0.5 hover:shadow-md aria-pressed:ring-2 aria-pressed:ring-[#21A7B4]">
          <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: color }} />
          <Icon aria-hidden="true" className="mb-3 h-5 w-5" style={{ color }} />
          <span className="block text-2xl font-black text-[#142B5F]">{number(value)}</span>
          <span className="mt-2 block text-xs font-bold text-slate-600">{title}</span>
        </button>)}
      </div>
    </section>
    <section className="rounded-3xl border border-[#DDEFF2] bg-white p-5 shadow-sm" aria-labelledby="review-quality">
      <h2 id="review-quality" className="mb-4 text-lg font-black text-[#142B5F]">{tr('إشارات الجودة المتخصصة', 'Specialized quality signals')}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{quality.map(({ key, title, icon: Icon }) =>
        <button key={key} type="button" aria-pressed={filters.reason === key} onClick={() => onFilter('reason', filters.reason === key ? 'all' : key)} className="flex items-center gap-3 rounded-2xl border border-[#DDEFF2] bg-[#FAF7F0]/40 p-4 text-start aria-pressed:ring-2 aria-pressed:ring-[#21A7B4]">
          <Icon aria-hidden="true" className="h-5 w-5 shrink-0 text-[#0E7C86]" /><span className="flex-1 text-xs font-bold">{title}</span><span className="text-xl font-black">{number(count(key))}</span>
        </button>)}</div>
    </section>
    <section className="rounded-3xl border border-[#DDEFF2] bg-white p-5 shadow-sm" aria-labelledby="review-domains">
      <h2 id="review-domains" className="mb-4 text-lg font-black text-[#142B5F]">{tr('المراجعة حسب المجال', 'Review by domain')}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{domains.map(source => {
        const readings = readable.filter(state => state.source.domain === source.domain);
        const rows = items.filter(item => item.domain === source.domain);
        const known = rows.length > 0 || readings.some(state => state.availability === 'ready' || state.availability === 'partial');
        return <article key={source.domain} className="rounded-2xl border border-[#DDEFF2] p-4">
          <button type="button" aria-pressed={filters.domain === source.domain} onClick={() => onFilter('domain', filters.domain === source.domain ? 'all' : source.domain)} className="w-full border-0 p-0 text-start aria-pressed:text-[#0E7C86]">
            <School aria-hidden="true" className="mb-3 h-5 w-5 text-[#0E7C86]" /><span className="block font-black">{names[source.domain] ?? source.domain}</span>
            <span className="mt-2 block text-2xl font-black">{number(known ? rows.length : null)}</span>
            <span className="text-xs text-slate-500">{tr('سجلات في العينة', 'Records in sample')}</span>
          </button>
          <Link to={source.path} className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#142B5F] px-3 py-2 text-xs font-bold text-white hover:bg-[#0E7C86]">{tr('فتح المجال', 'Open workspace')}<Arrow aria-hidden="true" className="h-4 w-4" /></Link>
        </article>;
      })}</div>
    </section>
  </>;
}
