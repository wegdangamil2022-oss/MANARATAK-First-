import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ExternalLink, Loader2, Plus, Search, Share2, X } from 'lucide-react';
import { ApiClient, type PublicGlobalSearchItem } from '../../../api/client';

type CompareKind = 'scholarships' | 'universities' | 'majors' | 'courses';
type CompareEntry = { kind: CompareKind; slug: string; title: string; subtitle?: string; fields: Array<{ label: string; value: string }>; url: string };
const MAX_ITEMS = 4;

const labels: Record<CompareKind, { ar: string; en: string }> = {
  scholarships: { ar: 'المنح', en: 'Scholarships' }, universities: { ar: 'الجامعات', en: 'Universities' },
  majors: { ar: 'التخصصات', en: 'Majors' }, courses: { ar: 'الدورات', en: 'Courses' },
};
const text = (locale: 'ar'|'en', ar: string, en: string) => locale === 'ar' ? ar : en;
const value = (input: unknown) => Array.isArray(input) ? input.filter(Boolean).join('، ') : input === null || input === undefined || input === '' ? '—' : String(input);

async function hydrate(kind: CompareKind, slug: string, locale: 'ar'|'en'): Promise<CompareEntry> {
  if (kind === 'scholarships') {
    const d = await ApiClient.getScholarshipBySlug(slug, locale);
    return { kind, slug: d.slug, title: d.displayName, subtitle: d.sponsorName || undefined, url: `/${locale}/scholarships/${encodeURIComponent(d.slug)}`, fields: [
      { label: text(locale,'التمويل','Funding'), value: value(d.fundingCoverage || d.fundingTypeCode) },
      { label: text(locale,'الدرجة','Degree'), value: value(d.degreeLevel) },
      { label: text(locale,'دولة الدراسة','Study country'), value: value(d.studyCountry || d.countrySourceLabel) },
      { label: text(locale,'الموعد النهائي','Deadline'), value: value(d.applicationDeadline) },
      { label: text(locale,'اللغة','Language'), value: value(d.studyLanguage) },
    ]};
  }
  if (kind === 'universities') {
    const d = await ApiClient.getUniversityBySlug(slug, locale);
    return { kind, slug: d.slug, title: d.displayName, subtitle: [d.city,d.country].filter(Boolean).join(' · '), url: `/${locale}/universities/${encodeURIComponent(d.slug)}`, fields: [
      { label: text(locale,'الدولة','Country'), value: value(d.country) }, { label: text(locale,'المدينة','City'), value: value(d.city) },
      { label: text(locale,'نوع المؤسسة','Institution type'), value: value(d.institutionType) }, { label: text(locale,'سنة التأسيس','Founded'), value: value(d.foundedYear) },
      { label: text(locale,'لغات الدراسة','Instruction languages'), value: value(d.languagesOfInstruction) },
    ]};
  }
  if (kind === 'majors') {
    const d = await ApiClient.getMajorBySlug(slug, locale);
    return { kind, slug: d.slug, title: d.displayName, subtitle: d.collegeOrFaculty || undefined, url: `/${locale}/majors/${encodeURIComponent(d.slug)}`, fields: [
      { label: text(locale,'الدرجة','Degree level'), value: value(d.degreeLevel) }, { label: text(locale,'المجال','Field'), value: value(d.academicFieldOrDiscipline) },
      { label: text(locale,'الكلية','Faculty'), value: value(d.collegeOrFaculty) }, { label: text(locale,'المهارات','Skills'), value: value(d.acquiredSkills?.slice(0,5)) },
      { label: text(locale,'المسارات المهنية','Career outcomes'), value: value(d.careerOutcomes?.slice(0,5)) },
    ]};
  }
  const d = await ApiClient.getCourseBySlug(slug, locale);
  return { kind, slug: d.slug, title: d.displayName, subtitle: d.providerName || d.platformName || undefined, url: `/${locale}/courses/${encodeURIComponent(d.slug)}`, fields: [
    { label: text(locale,'المصدر','Origin'), value: value(d.originType) }, { label: text(locale,'الوصول','Access'), value: value(d.accessType) },
    { label: text(locale,'الدراسة مجانية','Study free'), value: d.isStudyFree === true ? text(locale,'نعم','Yes') : d.isStudyFree === false ? text(locale,'لا','No') : '—' },
    { label: text(locale,'شهادة مجانية','Free certificate'), value: d.isFreeCertificate === true ? text(locale,'نعم','Yes') : d.isFreeCertificate === false ? text(locale,'لا','No') : '—' },
    { label: text(locale,'المستوى','Difficulty'), value: value(d.difficultyLevel) },
  ]};
}

export function ComparePage({ locale, onBack }: { locale: 'ar'|'en'; onBack: () => void }) {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const initialKind = (params.get('type') as CompareKind) || 'universities';
  const [kind,setKind] = useState<CompareKind>(['scholarships','universities','majors','courses'].includes(initialKind) ? initialKind : 'universities');
  const [items,setItems] = useState<CompareEntry[]>([]); const [query,setQuery] = useState(''); const [results,setResults] = useState<PublicGlobalSearchItem[]>([]);
  const [loading,setLoading] = useState(false); const [error,setError] = useState('');

  const syncUrl = (nextKind: CompareKind, nextItems: CompareEntry[]) => {
    const url = new URL(window.location.href); url.searchParams.set('type', nextKind);
    if (nextItems.length) url.searchParams.set('items', nextItems.map(i=>i.slug).join(',')); else url.searchParams.delete('items');
    window.history.replaceState(window.history.state, '', `${url.pathname}?${url.searchParams.toString()}`);
  };
  useEffect(() => {
    const raw=(new URLSearchParams(window.location.search).get('items')||'').split(',').map(v=>v.trim()).filter(Boolean).slice(0,MAX_ITEMS);
    let active=true; setLoading(true); setError('');
    Promise.all(raw.map(slug=>hydrate(kind,slug,locale))).then(v=>{if(active)setItems(v)}).catch(e=>{if(active)setError(e instanceof Error?e.message:'COMPARE_LOAD_FAILED')}).finally(()=>{if(active)setLoading(false)});
    return()=>{active=false};
  },[kind,locale]);
  useEffect(()=>{ if(!query.trim()){setResults([]);return;} const timer=window.setTimeout(()=>{void ApiClient.searchPublicCatalog({q:query.trim(),locale,limit:8,kinds:[kind]}).then(p=>setResults(p.items)).catch(()=>setResults([]));},220);return()=>window.clearTimeout(timer)},[query,kind,locale]);
  const changeKind=(next:CompareKind)=>{setKind(next);setItems([]);setQuery('');setResults([]);syncUrl(next,[])};
  const add=async (result:PublicGlobalSearchItem)=>{if(items.length>=MAX_ITEMS||items.some(i=>i.slug===result.slug))return;try{setLoading(true);const entry=await hydrate(kind,result.slug,locale);const next=[...items,entry];setItems(next);syncUrl(kind,next);setQuery('');setResults([])}catch(e){setError(e instanceof Error?e.message:'COMPARE_ITEM_LOAD_FAILED')}finally{setLoading(false)}};
  const remove=(slug:string)=>{const next=items.filter(i=>i.slug!==slug);setItems(next);syncUrl(kind,next)};
  const share=async()=>{try{await navigator.clipboard.writeText(window.location.href)}catch{/* browser may deny clipboard; URL remains shareable */}};
  const rows=items[0]?.fields.map(f=>f.label)??[];
  return <section dir={locale==='ar'?'rtl':'ltr'} className="mn-public-container py-5 space-y-4">
    <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><button onClick={onBack} className="h-10 w-10 rounded-xl border flex items-center justify-center" aria-label={text(locale,'العودة','Back')}><ArrowRight className="h-4 w-4"/></button><div><h1 className="text-2xl font-bold text-[var(--mn-heading)]">{text(locale,'المقارنة','Compare')}</h1><p className="text-xs text-[var(--mn-text-muted)]">{text(locale,'قارن حتى 4 عناصر من نفس النوع ببيانات المصدر المنشورة.','Compare up to 4 items of the same type using published owner data.')}</p></div></div><button onClick={()=>void share()} className="rounded-xl border px-3 py-2 text-xs font-bold inline-flex items-center gap-2"><Share2 className="h-4 w-4"/>{text(locale,'نسخ الرابط','Copy link')}</button></div>
    <div className="flex gap-2 overflow-x-auto">{(Object.keys(labels) as CompareKind[]).map(k=><button key={k} onClick={()=>changeKind(k)} className={`mn-filter-chip whitespace-nowrap ${kind===k?'is-selected':''}`}>{labels[k][locale]}</button>)}</div>
    <div className="relative mn-card p-3"><div className="flex items-center gap-2"><Search className="h-4 w-4"/><input value={query} onChange={e=>setQuery(e.target.value)} className="w-full bg-transparent outline-none text-sm" placeholder={text(locale,'ابحث لإضافة عنصر للمقارنة','Search to add an item')}/></div>{results.length>0&&<div className="absolute z-30 mt-2 left-0 right-0 rounded-xl border bg-[var(--mn-surface)] shadow-lg overflow-hidden">{results.map(r=><button key={`${r.kind}:${r.id}`} disabled={items.length>=MAX_ITEMS||items.some(i=>i.slug===r.slug)} onClick={()=>void add(r)} className="w-full flex items-center justify-between gap-3 border-b last:border-b-0 px-3 py-2 text-start disabled:opacity-40"><span><b className="block text-xs">{r.title}</b><span className="text-[10px] text-[var(--mn-text-muted)]">{r.subtitle}</span></span><Plus className="h-4 w-4"/></button>)}</div>}</div>
    {error&&<div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</div>}
    {loading&&<div className="mn-card py-8 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin"/></div>}
    {!loading&&items.length===0&&<div className="mn-card border-dashed py-12 text-center text-sm text-[var(--mn-text-muted)]">{text(locale,'أضف عنصرين أو أكثر لبدء المقارنة.','Add two or more items to start comparing.')}</div>}
    {items.length>0&&<div className="overflow-x-auto rounded-2xl border bg-[var(--mn-surface)]"><table className="min-w-[720px] w-full text-xs"><thead><tr><th className="p-3 text-start w-40">{text(locale,'المعيار','Attribute')}</th>{items.map(i=><th key={i.slug} className="p-3 align-top text-start"><div className="flex justify-between gap-2"><div><div className="font-bold">{i.title}</div><div className="text-[10px] text-[var(--mn-text-muted)]">{i.subtitle}</div></div><button onClick={()=>remove(i.slug)} aria-label={text(locale,'إزالة','Remove')}><X className="h-4 w-4"/></button></div><a href={i.url} className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-[var(--mn-link)]">{text(locale,'فتح التفاصيل','Open detail')}<ExternalLink className="h-3 w-3"/></a></th>)}</tr></thead><tbody>{rows.map((label,rowIndex)=><tr key={label} className="border-t"><th className="p-3 text-start font-bold">{label}</th>{items.map(i=><td key={i.slug} className="p-3 align-top">{i.fields[rowIndex]?.value??'—'}</td>)}</tr>)}</tbody></table></div>}
    <p className="text-[10px] text-[var(--mn-text-muted)]">{text(locale,'الحالة محفوظة في الرابط ويمكن مشاركتها. المقارنة لا تنشئ حقائق جديدة؛ تعرض فقط حقول الكيانات المنشورة.','Comparison state is encoded in the URL and is shareable. No synthetic facts are created; only published owner fields are displayed.')}</p>
  </section>;
}
