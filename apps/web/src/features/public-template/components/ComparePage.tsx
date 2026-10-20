import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ExternalLink, Loader2, Plus, Search, Share2, X } from 'lucide-react';
import { ApiClient } from '../../../api/client';
import type { Scholarship, University, Major, Course, ImportedCourse } from '../types';

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

type CompareSuggestion = { kind: CompareKind; id: string; slug: string; title: string; subtitle?: string };
type CompareFixtures = { scholarships?: Scholarship[]; universities?: University[]; majors?: Major[]; courses?: Course[]; paidCourses?: Course[]; importedCourses?: ImportedCourse[] };
type ComparePageProps = CompareFixtures & { locale: 'ar' | 'en'; onBack: () => void; dataMode?: 'api' | 'prototype' };

// The visual comparison table is shared with API mode; only its data source changes.
function designEntries(locale: 'ar' | 'en', fixtures: CompareFixtures): CompareEntry[] {
  const l = (ar: string, en: string) => text(locale, ar, en);
  const sampleScholarships = (fixtures.scholarships ?? []).map((d): CompareEntry => ({
    kind: 'scholarships', slug: d.slug || d.id, title: locale === 'ar' ? d.title : d.titleEn, subtitle: d.university,
    url: '/' + locale + '/scholarships/' + encodeURIComponent(d.slug || d.id),
    fields: [
      { label: l('التمويل','Funding'), value: value(d.fundingType) }, { label: l('الدرجة','Degree'), value: value(d.degreeLevel) },
      { label: l('دولة الدراسة','Study country'), value: value(locale === 'ar' ? d.country : d.countryEn) },
      { label: l('الموعد النهائي','Deadline'), value: value(d.deadline) }, { label: l('اللغة','Language'), value: '—' },
    ],
  }));
  const sampleUniversities = (fixtures.universities ?? []).map((d): CompareEntry => ({
    kind: 'universities', slug: d.slug || d.id, title: locale === 'ar' ? d.name : d.nameEn, subtitle: [d.city,d.country].filter(Boolean).join(' · '),
    url: '/' + locale + '/universities/' + encodeURIComponent(d.slug || d.id),
    fields: [
      { label: l('الدولة','Country'), value: value(d.country) }, { label: l('المدينة','City'), value: value(d.city) },
      { label: l('نوع المؤسسة','Institution type'), value: value(d.ownership || d.type) },
      { label: l('سنة التأسيس','Founded'), value: value(d.foundationYear) },
      { label: l('لغات الدراسة','Instruction languages'), value: value(d.studyPrograms?.teachingLanguages) },
    ],
  }));
  const sampleMajors = (fixtures.majors ?? []).map((d): CompareEntry => ({
    kind: 'majors', slug: d.slug || d.id, title: locale === 'ar' ? d.name : d.nameEn, subtitle: d.category,
    url: '/' + locale + '/majors/' + encodeURIComponent(d.slug || d.id),
    fields: [
      { label: l('الدرجة','Degree level'), value: value(d.degreeLevels) }, { label: l('المجال','Field'), value: value(d.academicField || d.category) },
      { label: l('الكلية','Faculty'), value: value(d.category) }, { label: l('المهارات','Skills'), value: value(d.acquiredSkills?.slice(0,5)) },
      { label: l('المسارات المهنية','Career outcomes'), value: value(d.popularCareers?.slice(0,5)) },
    ],
  }));
  const nativeCourses = [...new Map([...(fixtures.courses ?? []), ...(fixtures.paidCourses ?? [])].map(d => [d.id,d])).values()];
  const sampleCourses = nativeCourses.map((d): CompareEntry => ({
    kind: 'courses', slug: d.slug || d.id, title: locale === 'ar' ? d.title : d.titleEn, subtitle: d.provider,
    url: '/' + locale + '/courses/' + encodeURIComponent(d.slug || d.id),
    fields: [
      { label: l('المصدر','Origin'), value: value(d.provider) }, { label: l('الوصول','Access'), value: value(d.accessType || (d.isFree ? l('مجاني','Free') : l('مدفوع','Paid'))) },
      { label: l('الدراسة مجانية','Study free'), value: d.isFree ? l('نعم','Yes') : l('لا','No') },
      { label: l('شهادة مجانية','Free certificate'), value: '—' }, { label: l('المستوى','Difficulty'), value: value(d.level) },
    ],
  }));
  const externalCourses = (fixtures.importedCourses ?? []).map((d): CompareEntry => ({
    kind: 'courses', slug: d.slug || d.id, title: d.title, subtitle: d.provider,
    url: '/' + locale + '/courses/' + encodeURIComponent(d.slug || d.id),
    fields: [
      { label: l('المصدر','Origin'), value: value(d.provider) }, { label: l('الوصول','Access'), value: value(d.platform) },
      { label: l('الدراسة مجانية','Study free'), value: d.studyFree ? l('نعم','Yes') : l('لا','No') },
      { label: l('شهادة مجانية','Free certificate'), value: d.freeCertificate ? l('نعم','Yes') : l('لا','No') },
      { label: l('المستوى','Difficulty'), value: value(d.level) },
    ],
  }));
  return [...sampleScholarships, ...sampleUniversities, ...sampleMajors, ...sampleCourses, ...externalCourses];
}

export function ComparePage({ locale, onBack, dataMode = 'api', scholarships, universities, majors, courses, paidCourses, importedCourses }: ComparePageProps) {
  const demoEntries = useMemo(() => dataMode === 'prototype'
    ? designEntries(locale, { scholarships, universities, majors, courses, paidCourses, importedCourses }) : [],
    [dataMode, locale, scholarships, universities, majors, courses, paidCourses, importedCourses]);
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const initialKind = (params.get('type') as CompareKind) || 'universities';
  const [kind,setKind] = useState<CompareKind>(['scholarships','universities','majors','courses'].includes(initialKind) ? initialKind : 'universities');
  const [items,setItems] = useState<CompareEntry[]>([]); const [query,setQuery] = useState(''); const [results,setResults] = useState<CompareSuggestion[]>([]);
  const [loading,setLoading] = useState(false); const [error,setError] = useState('');

  const syncUrl = (nextKind: CompareKind, nextItems: CompareEntry[]) => {
    const url = new URL(window.location.href); url.searchParams.set('type', nextKind);
    if (nextItems.length) url.searchParams.set('items', nextItems.map(i=>i.slug).join(',')); else url.searchParams.delete('items');
    window.history.replaceState(window.history.state, '', `${url.pathname}?${url.searchParams.toString()}`);
  };
  useEffect(() => {
    const raw=(new URLSearchParams(window.location.search).get('items')||'').split(',').map(v=>v.trim()).filter(Boolean).slice(0,MAX_ITEMS);
    let active=true; setLoading(true); setError('');
    if (dataMode === 'prototype') {
      setItems(raw.flatMap(slug => demoEntries.filter(entry => entry.kind === kind && entry.slug === slug)).slice(0,MAX_ITEMS));
      setLoading(false);
      return () => { active = false; };
    }
    Promise.all(raw.map(slug=>hydrate(kind,slug,locale))).then(v=>{if(active)setItems(v)}).catch(e=>{if(active)setError(e instanceof Error?e.message:'COMPARE_LOAD_FAILED')}).finally(()=>{if(active)setLoading(false)});
    return()=>{active=false};
  },[kind,locale,dataMode,demoEntries]);
  useEffect(()=>{ if(!query.trim()){setResults([]);return;} const timer=window.setTimeout(()=>{
    if (dataMode === 'prototype') {
      const q = query.trim().toLocaleLowerCase();
      setResults(demoEntries.filter(item => item.kind === kind && [item.title,item.subtitle,item.slug].some(part => (part || '').toLocaleLowerCase().includes(q))).slice(0,8).map(item => ({kind:item.kind,id:item.slug,slug:item.slug,title:item.title,subtitle:item.subtitle})));
      return;
    }
    void ApiClient.searchPublicCatalog({q:query.trim(),locale,limit:8,kinds:[kind]}).then(p=>setResults(p.items.map(item=>({kind,id:item.id,slug:item.slug,title:item.title,subtitle:item.subtitle})))).catch(()=>setResults([]));
  },220);return()=>window.clearTimeout(timer)},[query,kind,locale,dataMode,demoEntries]);
  const changeKind=(next:CompareKind)=>{setKind(next);setItems([]);setQuery('');setResults([]);syncUrl(next,[])};
  const add=async (result:CompareSuggestion)=>{if(items.length>=MAX_ITEMS||items.some(i=>i.slug===result.slug))return;try{setLoading(true);const entry=dataMode === 'prototype' ? demoEntries.find(item=>item.kind===kind&&item.slug===result.slug) : await hydrate(kind,result.slug,locale);if(!entry)throw new Error('COMPARE_PREVIEW_ITEM_UNAVAILABLE');const next=[...items,entry];setItems(next);syncUrl(kind,next);setQuery('');setResults([])}catch(e){setError(e instanceof Error?e.message:'COMPARE_ITEM_LOAD_FAILED')}finally{setLoading(false)}};
  const remove=(slug:string)=>{const next=items.filter(i=>i.slug!==slug);setItems(next);syncUrl(kind,next)};
  const share=async()=>{try{await navigator.clipboard.writeText(window.location.href)}catch{/* browser may deny clipboard; URL remains shareable */}};
  const rows=items[0]?.fields.map(f=>f.label)??[];
  return <section dir={locale==='ar'?'rtl':'ltr'} className="mn-public-container py-5 space-y-4">
    <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><button onClick={onBack} className="h-10 w-10 rounded-xl border flex items-center justify-center" aria-label={text(locale,'العودة','Back')}><ArrowRight className="h-4 w-4"/></button><div><h1 className="text-2xl font-bold text-[var(--mn-heading)]">{text(locale,'المقارنة','Compare')}</h1><p className="text-xs text-[var(--mn-text-muted)]">{dataMode === 'prototype' ? text(locale,'قارن عناصر المعاينة لتجربة التصميم؛ لا توجد بيانات حقيقية بعد.','Compare design samples; live data is not connected yet.') : text(locale,'قارن حتى 4 عناصر من نفس النوع ببيانات المصدر المنشورة.','Compare up to 4 items of the same type using published owner data.')}</p></div></div><button onClick={()=>void share()} className="rounded-xl border px-3 py-2 text-xs font-bold inline-flex items-center gap-2"><Share2 className="h-4 w-4"/>{text(locale,'نسخ الرابط','Copy link')}</button></div>
    <div className="flex gap-2 overflow-x-auto">{(Object.keys(labels) as CompareKind[]).map(k=><button key={k} onClick={()=>changeKind(k)} className={`mn-filter-chip whitespace-nowrap ${kind===k?'is-selected':''}`}>{labels[k][locale]}</button>)}</div>
    <div className="relative mn-card p-3"><div className="flex items-center gap-2"><Search className="h-4 w-4"/><input value={query} onChange={e=>setQuery(e.target.value)} className="w-full bg-transparent outline-none text-sm" placeholder={text(locale,'ابحث لإضافة عنصر للمقارنة','Search to add an item')}/></div>{results.length>0&&<div className="absolute z-30 mt-2 left-0 right-0 rounded-xl border bg-[var(--mn-surface)] shadow-lg overflow-hidden">{results.map(r=><button key={`${r.kind}:${r.id}`} disabled={items.length>=MAX_ITEMS||items.some(i=>i.slug===r.slug)} onClick={()=>void add(r)} className="w-full flex items-center justify-between gap-3 border-b last:border-b-0 px-3 py-2 text-start disabled:opacity-40"><span><b className="block text-xs">{r.title}</b><span className="text-[10px] text-[var(--mn-text-muted)]">{r.subtitle}</span></span><Plus className="h-4 w-4"/></button>)}</div>}</div>
    {error&&<div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</div>}
    {loading&&<div className="mn-card py-8 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin"/></div>}
    {!loading&&items.length===0&&<div className="mn-card border-dashed py-12 text-center text-sm text-[var(--mn-text-muted)]">{text(locale,'أضف عنصرين أو أكثر لبدء المقارنة.','Add two or more items to start comparing.')}</div>}
    {items.length>0&&<div className="overflow-x-auto rounded-2xl border bg-[var(--mn-surface)]"><table className="min-w-[720px] w-full text-xs"><thead><tr><th className="p-3 text-start w-40">{text(locale,'المعيار','Attribute')}</th>{items.map(i=><th key={i.slug} className="p-3 align-top text-start"><div className="flex justify-between gap-2"><div><div className="font-bold">{i.title}</div><div className="text-[10px] text-[var(--mn-text-muted)]">{i.subtitle}</div></div><button onClick={()=>remove(i.slug)} aria-label={text(locale,'إزالة','Remove')}><X className="h-4 w-4"/></button></div><a href={i.url} className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-[var(--mn-link)]">{text(locale,'فتح التفاصيل','Open detail')}<ExternalLink className="h-3 w-3"/></a></th>)}</tr></thead><tbody>{rows.map((label,rowIndex)=><tr key={label} className="border-t"><th className="p-3 text-start font-bold">{label}</th>{items.map(i=><td key={i.slug} className="p-3 align-top">{i.fields[rowIndex]?.value??'—'}</td>)}</tr>)}</tbody></table></div>}
    <p className="text-[10px] text-[var(--mn-text-muted)]">{dataMode === 'prototype' ? text(locale,'هذه معاينة للمقارنة ببيانات توضيحية؛ ستستخدم نفس الواجهة البيانات المنشورة عند ربط المنصة.','Design comparison with example data; the same interface will use published records later.') : text(locale,'الحالة محفوظة في الرابط ويمكن مشاركتها. المقارنة لا تنشئ حقائق جديدة؛ تعرض فقط حقول الكيانات المنشورة.','Comparison state is encoded in the URL and is shareable. No synthetic facts are created; only published owner fields are displayed.')}</p>
  </section>;
}
