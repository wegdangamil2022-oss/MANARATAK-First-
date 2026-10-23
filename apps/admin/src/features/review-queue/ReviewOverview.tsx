import { AlertTriangle, ArrowLeft, ArrowRight, BookOpen, BriefcaseBusiness, CheckCircle2, Clock3, FileSpreadsheet, GraduationCap, Globe2, Languages, Layers, Link2, ListChecks, Newspaper, School, ShieldCheck, TestTube2, TimerReset, Wrench, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { signalSla, type ReviewFilters, type ReviewItem } from './ReviewContracts';
import type { ReviewPageState } from './ReviewLoader';
import { ReviewSupportingPanels } from './ReviewSupportingPanels';

/** Presentation of the retained, permission-filtered window; never a global total. */
export function ReviewOverview({ items, states, filters, onFilter, language, now, canOpenTranslations = false }: {
  items: ReviewItem[];
  states: ReviewPageState[];
  filters: ReviewFilters;
  onFilter: (key: keyof ReviewFilters, value: string) => void;
  language: string;
  now: number;
  canOpenTranslations?: boolean;
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
  const domainIcons: Record<string, LucideIcon> = {scholarships:GraduationCap,universities:School,majors:GraduationCap,courses:BookOpen,tests:TestTube2,services:Wrench,cms:Newspaper,careers:BriefcaseBusiness,'study-destinations':Globe2};
  const count = (reason: string) => {
    const sources = readable.filter(state => state.source.reason === reason);
    const matching = items.filter(item => item.signals.some(signal => signal.reason === reason)).length;
    return matching || sources.some(state => state.availability === 'ready' || state.availability === 'partial') ? matching : null;
  };
  const number = (value: number | null) => value === null ? '—' : new Intl.NumberFormat(language).format(value);
  const sla = items.flatMap(item => item.signals.map(signal => signalSla(signal, now)));
  const domainCount = (domain: string, reason: string) => {
    const sources = readable.filter(state => state.source.domain === domain && state.source.reason === reason);
    const matching = items.filter(item => item.domain === domain && item.signals.some(signal => signal.reason === reason)).length;
    return matching || sources.some(state => state.availability === 'ready' || state.availability === 'partial') ? matching : null;
  };
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
      <h2 id="review-signals"><ListChecks aria-hidden="true" />{tr('حالات المراجعة', 'Review lifecycle signals')}</h2>
      <p className="mb-4 mt-1 text-xs leading-6 text-slate-500">{tr('أعداد العينة المقروءة فقط، قبل الفلاتر. قد تتداخل الإشارات؛ الشرطة تعني أن القياس غير متاح، ولا تعني صفرًا.', 'Retained sample counts before filters. Signals may overlap; a dash means unavailable, never zero.')}</p>
      <div className="review-analysis-grid">
        {metrics.map(({ key, title, icon: Icon, color, value }) => <button key={key} type="button"
          aria-pressed={key === 'overdue' ? filters.view === 'overdue' : filters.reason === key}
          onClick={() => key === 'overdue' ? onFilter('view', filters.view === 'overdue' ? 'all' : 'overdue') : onFilter('reason', filters.reason === key ? 'all' : key)}
          className="review-analysis-metric relative overflow-hidden rounded-2xl border border-[#DDEFF2] bg-white p-4 text-start shadow-xs transition hover:shadow-md aria-pressed:ring-2 aria-pressed:ring-[#21A7B4]">
          <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: color }} />
          <Icon aria-hidden="true" style={{ color }} />
          <span className="review-analysis-title">{title}</span>
          <span className="review-analysis-value">{number(value)}</span>
        </button>)}
        <div aria-describedby="review-sla-near-limit" className="review-analysis-metric relative overflow-hidden rounded-2xl border border-[#DDEFF2] bg-[#DDEFF2]/20 p-4 shadow-xs">
          <span className="absolute inset-x-0 top-0 h-1 bg-[#21A7B4]" />
          <Clock3 aria-hidden="true" className="text-[#21A7B4]" />
          <span className="review-analysis-title">{tr('يقترب من الموعد', 'Approaching SLA')}</span>
          <span className="review-analysis-value">—</span>
        </div>
      </div>
      <p id="review-sla-near-limit" className="mt-3 text-xs leading-6 text-slate-500">{tr('اقتراب SLA غير مقاس هنا؛ يحتاج حدّ إنذار معتمدًا من القسم. لا يُستنتج من وقت تعديل السجل.', 'Approaching SLA is not measured here; an owner-defined warning threshold is required. Record modification time is not a substitute.')}</p>
    </section>
    <section className="rounded-3xl border border-[#DDEFF2] bg-white p-5 shadow-sm" aria-labelledby="review-quality">
      <h2 id="review-quality"><ShieldCheck aria-hidden="true" />{tr('فحوص جودة المحتوى', 'Specialized quality signals')}</h2>
      <div className="review-quality-grid">{quality.map(({ key, title, icon: Icon }) =>
        <button key={key} type="button" aria-pressed={filters.reason === key} onClick={() => onFilter('reason', filters.reason === key ? 'all' : key)} className="review-analysis-metric">
          <Icon aria-hidden="true" /><span className="review-analysis-title">{title}</span><span className="review-analysis-value">{number(count(key))}</span>
        </button>)}</div>
    </section>
    <ReviewSupportingPanels language={language} states={readable} canOpenTranslations={canOpenTranslations} />
    <section className="rounded-3xl border border-[#DDEFF2] bg-white p-5 shadow-sm" aria-labelledby="review-domains">
      <h2 id="review-domains"><Layers aria-hidden="true" />{tr('المراجعة حسب القسم', 'Review by domain')}</h2>
      <div className="review-domain-grid">{domains.map(source => {
        const readings = readable.filter(state => state.source.domain === source.domain);
        const rows = items.filter(item => item.domain === source.domain);
        const known = rows.length > 0 || readings.some(state => state.availability === 'ready' || state.availability === 'partial');
        const complete = readings.every(state => state.availability === 'ready' && !state.windowLimited);
        const Icon = domainIcons[source.domain] ?? School;
        return <article key={source.domain} className="review-domain-card">
          <button type="button" aria-pressed={filters.domain === source.domain} onClick={() => onFilter('domain', filters.domain === source.domain ? 'all' : source.domain)} className="review-domain-heading">
            <Icon aria-hidden="true" /><span>{names[source.domain] ?? source.domain}</span>
            <b>{number(known ? rows.length : null)}</b>
          </button>
          <p className="mt-2 text-xs text-slate-500">{complete ? tr('قراءة متاحة ضمن نطاق المصدر', 'Read available within source scope') : tr('تغطية جزئية أو غير متاحة', 'Coverage partial or unavailable')}</p>
          <dl>
            {[
              ['workflow_review', tr('مراجعة', 'Review')],
              ['incomplete', tr('ناقص', 'Incomplete')],
              ['ready_to_publish', tr('جاهز', 'Ready')],
            ].map(([reason, title]) => <div key={reason}><dt>{title}</dt><dd>{number(domainCount(source.domain, reason))}</dd></div>)}
          </dl>
          <Link to={source.path} className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#142B5F] px-3 py-2 text-xs font-bold text-white hover:bg-[#0E7C86]">{tr('فتح المجال', 'Open workspace')}<Arrow aria-hidden="true" className="h-4 w-4" /></Link>
        </article>;
      })}</div>
    </section>
  </>;
}
