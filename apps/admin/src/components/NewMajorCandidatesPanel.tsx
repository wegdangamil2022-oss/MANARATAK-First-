import type { NewMajorCandidateComparison } from '@manaratak/domain';
import {useAdminAuthorization} from '../security/AdminAuthorizationContext';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, ExternalLink, GraduationCap, Link2, Loader2, Search } from 'lucide-react';
import { useTranslation } from '../i18n/I18nProvider';
import { adminApiClient } from '../api/client';
import { canonicalPickerApi } from '../api/canonicalPickers';
import { CanonicalPicker } from './CanonicalPicker';

type SourceType = 'UNIVERSITY_PROGRAM' | 'SCHOLARSHIP_MAJOR_TARGET' | 'SCHOLARSHIP_ELIGIBILITY';
type Source = {
  sourceType: SourceType;
  sourceId: string;
  ownerDisplayName: string;
  rawLabel: string;
  degreeLevelId?: string | null;
  degreeLevelCode?: string | null;
  degreeLevelLabel?: string | null;
  degreeReferences?:Array<{id:string;code:string;label?:string}>;
  facultyOrUnitName?: string | null;
  officialSourceUrl?: string | null;
  sourceUrl?: string | null;
};
type Candidate = {
  candidateKey: string;
  sourceDigest:string;
  sourcesTruncated?:boolean;
  confirmedDegree?: 'BACHELOR'|'MASTER'|'DOCTORATE'|'FELLOWSHIP'|'UNKNOWN';
  displayLabel: string;
  normalizedLabel: string;
  sourceCount: number;
  sourceTypes: SourceType[];
  degreeLevelIds: string[];
  degreeLevelCodes: string[];
  degreeLevelLabels: string[];
  facultyOrUnitNames: string[];
  officialSourceUrls: string[];
  sources: Source[];
};
type PageResult = { data: Candidate[]; total: number; page: number; pageSize: number; totalPages: number };
type FormState = {
  canonicalMajorName: string;
  reason:string;
  degreeLevel: string;
  degreeLevelId: string;
  academicFieldId: string;
  disciplineId: string;
  academicFieldOrDiscipline: string;
  officialSourceUrl: string;
  existingMajorId: string;
};

const EMPTY: FormState = {
  canonicalMajorName: '', reason:'', degreeLevel: '', degreeLevelId: '',
  academicFieldId: '', disciplineId: '', academicFieldOrDiscipline: '', officialSourceUrl: '', existingMajorId: '',
};
const SOURCE_LABELS: Record<SourceType, string> = {
  UNIVERSITY_PROGRAM: 'برنامج جامعة',
  SCHOLARSHIP_MAJOR_TARGET: 'هدف منحة',
  SCHOLARSHIP_ELIGIBILITY: 'شرط أهلية منحة',
};

export function NewMajorCandidatesPanel({ onTotalChange }: { onTotalChange?: (total: number) => void }) {
  const {hasPermission}=useAdminAuthorization();
  const {language,dir}=useTranslation();
  const text=(ar:string,en:string)=>language==='ar'?ar:en;
  const degrees:Record<string,string>={BACHELOR:text('بكالوريوس','Bachelor'),MASTER:text('ماجستير','Master'),DOCTORATE:text('دكتوراه','Doctorate'),FELLOWSHIP:text('زمالة','Fellowship'),UNKNOWN:text('الدرجة غير محددة','Degree unconfirmed')};
  const canReadTaxonomy=hasPermission('admin:academic-taxonomy:manage');
  const canReview=hasPermission('admin:majors:review');
  const canResolve=canReview && hasPermission('admin:universities:manage') && hasPermission('admin:scholarships:manage');
  const [data, setData] = useState<PageResult | null>(null);
  const [search, setSearch] = useState('');
  const [sourceType, setSourceType] = useState('');
  const [degreeLevel,setDegreeLevel]=useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [resolvedMajorId, setResolvedMajorId] = useState<string | null>(null);

  const [comparison,setComparison]=useState<NewMajorCandidateComparison|null>(null);
  const [comparisonError,setComparisonError]=useState('');
  useEffect(()=>{
    const abort=new AbortController();setComparison(null);setComparisonError('');
    if(!selected||!form.existingMajorId)return ()=>abort.abort();
    adminApiClient.request<NewMajorCandidateComparison>(`/admin/majors/new-candidates/${encodeURIComponent(selected.candidateKey)}/comparison?majorId=${encodeURIComponent(form.existingMajorId)}`,{signal:abort.signal,cache:'no-store'})
      .then(result=>{if(!abort.signal.aborted)setComparison(result);}).catch(error=>{if(!abort.signal.aborted)setComparisonError(error instanceof Error?error.message:'تعذر تحميل المقارنة');});
    return ()=>abort.abort();
  },[selected,form.existingMajorId]);
  const generation=useRef(0);
  const load = useCallback(async (signal?:AbortSignal) => {
    const current=++generation.current;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '25' });
      if (search.trim()) params.set('search', search.trim());
      if (sourceType) params.set('sourceType', sourceType);
      if (degreeLevel) params.set('degreeLevel',degreeLevel);
      const result = await adminApiClient.request<PageResult>(`/admin/majors/new-candidates?${params}`,{signal});
      if(signal?.aborted || current!==generation.current) return;
      setData(result);
      if(onTotalChange){const total=search.trim()||sourceType||degreeLevel?await adminApiClient.request<{total:number}>('/admin/majors/new-candidates?page=1&pageSize=1',{signal}):result;if(!signal?.aborted&&current===generation.current)onTotalChange(total.total);}
    } catch (reason) {
      if(signal?.aborted || current!==generation.current) return;
      setError(reason instanceof Error ? reason.message : 'تعذر تحميل التخصصات الجديدة.');
    } finally {
      if(current===generation.current && !signal?.aborted) setLoading(false);
    }
  },[search,sourceType,degreeLevel,page,onTotalChange]);

  useEffect(() => {
    const controller=new AbortController();
    const timer = window.setTimeout(() => void load(controller.signal), 200);
    return () => {window.clearTimeout(timer);controller.abort();};
  }, [load]);

  const selectCandidate = (candidate: Candidate) => {
    const uniqueDegreeCode = candidate.degreeLevelCodes.length === 1 ? normalizeDegree(candidate.degreeLevelCodes[0]) : '';
    setSelected(candidate);
    setError(null);
    setSuccess(null);
    setResolvedMajorId(null);
    setForm({
      ...EMPTY,
      canonicalMajorName: candidate.displayLabel,
      degreeLevel: uniqueDegreeCode,
      degreeLevelId: candidate.degreeLevelIds.length === 1 ? candidate.degreeLevelIds[0] : '',
      officialSourceUrl: candidate.officialSourceUrls[0] ?? '',
    });
  };

  const approve = async () => {
    if (!selected || saving) return;
    if(!form.reason.trim()) {setError('سبب القرار مطلوب.');return;}
    if (!form.canonicalMajorName.trim() || !form.degreeLevel || !form.degreeLevelId || (!form.academicFieldId && !form.disciplineId)) {
      setError('الاسم المعتمد والدرجة المرجعية والتصنيف مطلوبة قبل الاعتماد.');
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await adminApiClient.request<{
        type: string;
        majorId: string;
        classificationCode?: string;
        linkedSources: Record<string, number>;
      }>(`/admin/majors/new-candidates/${encodeURIComponent(selected.candidateKey)}/approve`, {
        method: 'POST',
        body: JSON.stringify({
          canonicalMajorName: form.canonicalMajorName.trim(),
          reason:form.reason.trim(),sourceDigest:selected.sourceDigest,
          degreeLevel: form.degreeLevel,
          degreeLevelId: form.degreeLevelId,
          academicFieldId: form.academicFieldId || null,
          disciplineId: form.disciplineId || null,
          academicFieldOrDiscipline: form.academicFieldOrDiscipline.trim() || null,
          officialSourceUrl: form.officialSourceUrl.trim() || null,
        }),
      });
      setSuccess(result.type === 'CREATED'
        ? `تم إنشاء التخصص بالرقم ${result.classificationCode ?? ''}. انتقل الآن إلى دورة المراجعة المعتادة قبل النشر.`
        : result.type === 'PROFILE_ADDED'
          ? `كان مفهوم التخصص موجودًا؛ تمت إضافة مستوى جديد بالرقم ${result.classificationCode ?? ''} وربط المصادر به.`
          : 'تم ربط المصادر بالتخصص الموجود بدل إنشاء نسخة مكررة.');
      setResolvedMajorId(result.majorId);
      setSelected(null);
      setForm(EMPTY);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'تعذر اعتماد التخصص الجديد.');
    } finally {
      setSaving(false);
    }
  };

  const linkExisting = async () => {
    if (!selected || !comparison?.canLink || comparison.target.id!==form.existingMajorId || comparison.candidate.sourceDigest!==selected.sourceDigest || saving) return;
    if(!form.reason.trim()) {setError('سبب الربط مطلوب.');return;}
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await adminApiClient.request(`/admin/majors/new-candidates/${encodeURIComponent(selected.candidateKey)}/link`, {
        method: 'POST',
        body: JSON.stringify({ majorId: form.existingMajorId,expectedTargetRevision:comparison.target.revision,reason:form.reason.trim(),sourceDigest:selected.sourceDigest }),
      });
      setSuccess('تم ربط المراجع غير المحسومة بالتخصص الموجود دون إنشاء نسخة مكررة.');
      setResolvedMajorId(form.existingMajorId);
      setSelected(null);
      setForm(EMPTY);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'تعذر ربط التخصص الموجود.');
    } finally {
      setSaving(false);
    }
  };

  const reject = async () => {
    if(!selected || saving || !form.reason.trim()) {setError('اختر تخصصًا واكتب سبب الرفض.');return;}
    setSaving(true);setError(null);
    try {
      await adminApiClient.request(`/admin/majors/new-candidates/${encodeURIComponent(selected.candidateKey)}/reject`,{method:'POST',body:JSON.stringify({reason:form.reason.trim(),sourceDigest:selected.sourceDigest})});
      setSelected(null);setForm(EMPTY);setSuccess('تم حفظ قرار الرفض. سيعود المرجع للمراجعة إذا تغيرت أدلته.');await load();
    }catch(error){setError(error instanceof Error?error.message:'تعذر الرفض.');}finally{setSaving(false);}
  };

  return <div className="major-discovery space-y-4" dir={dir}>
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="major-discovery-title">{text('تخصصات جديدة','New major candidates')}</h2><p className="mt-2 text-[12px] text-slate-600">{text('تخصصات لم تُطابَق بعد. ابحث عن تفاصيلها وأضفها بنفسك لاحقًا.','Unresolved major references. Research and add their content yourself later.')}</p></div>
      <span role="status" className="rounded-xl bg-[#DDEFF2] px-3 py-2 text-[12px] font-bold text-[#0E7C86]">{loading?'…':error?text('تعذر التحقق','Unavailable'):data?.total??'—'} {text('مرشحًا','candidates')}</span>
    </header>
    <section aria-label={text('بحث المرشحين','Candidate filters')} className="grid gap-3 rounded-2xl border border-[#DDEFF2] bg-white p-4 sm:grid-cols-2">
      <div className="flex gap-2 sm:col-span-2"><label className="relative min-w-0 flex-1"><Search aria-hidden="true" className="absolute end-3 top-3.5 h-4 w-4 text-[#0E7C86]" /><input aria-label={text('البحث في المراجع الجديدة','Search candidates')} value={search} onChange={event=>{setSearch(event.target.value);setPage(1);}} className="min-h-11 w-full rounded-xl border border-[#DDEFF2] pe-10 ps-3 text-[13px]" placeholder={text('ابحث بالاسم الوارد','Search source name')} /></label><button type="button" disabled={!search} onClick={()=>{setSearch('');setPage(1);}} className="rounded-xl border border-[#DDEFF2] px-3 text-[12px]">{text('مسح','Clear')}</button></div>
      <label className="text-[12px] font-bold">{text('الدرجة العلمية','Degree')}<select value={degreeLevel} onChange={event=>{setDegreeLevel(event.target.value);setPage(1);}} className="mt-1 min-h-11 w-full rounded-xl border border-[#DDEFF2] px-3 text-[13px]"><option value="">{text('كل الدرجات','All degrees')}</option>{Object.entries(degrees).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
      <label className="text-[12px] font-bold">{text('مصدر المرجع','Source')}<select value={sourceType} onChange={event=>{setSourceType(event.target.value);setPage(1);}} className="mt-1 min-h-11 w-full rounded-xl border border-[#DDEFF2] px-3 text-[13px]"><option value="">{text('كل المصادر','All sources')}</option>{Object.entries(SOURCE_LABELS).map(([key,label])=><option key={key} value={key}>{language==='ar'?label:key.replaceAll('_',' ')}</option>)}</select></label>
    </section>

    {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700"><AlertCircle className="ml-2 inline h-4 w-4" />{error}</div>}
    {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700"><CheckCircle2 className="ml-2 inline h-4 w-4" />{success}{resolvedMajorId && <Link to={`/majors/${encodeURIComponent(resolvedMajorId)}`} className="mr-3 underline">فتح التخصص</Link>}</div>}

    <div className={`grid gap-4 ${selected?'xl:grid-cols-[1fr_430px]':''}`}>
      <section aria-label={text('مرشحو التخصصات','Major candidates')} className="major-discovery-list">
        {loading ? <div className="flex min-h-56 items-center justify-center gap-2 text-sm font-bold"><Loader2 className="h-5 w-5 animate-spin" />جاري جمع المراجع غير المحسومة...</div>
          : error ? <button type="button" onClick={()=>void load()} className="min-h-11 rounded-xl border border-[#DDEFF2] px-4">{text('إعادة المحاولة','Retry')}</button> : (data?.data.length ?? 0) === 0 ? <div className="rounded-2xl border border-[#DDEFF2] bg-[#FAF7F0] p-8 text-center"><CheckCircle2 className="mx-auto h-7 w-7 text-[#0E7C86]" /><p className="mt-2 font-black text-[#142B5F]">لا توجد تخصصات جديدة غير محسومة حاليًا</p></div>
            : data?.data.map(candidate => <button type="button" key={candidate.candidateKey} onClick={() => selectCandidate(candidate)} className={`w-full rounded-2xl border p-4 text-right shadow-sm transition ${selected?.candidateKey === candidate.candidateKey ? 'border-[#21A7B4] bg-[#DDEFF2]/40' : 'border-[#DDEFF2] bg-white hover:border-[#21A7B4]'}`}>
              <div className="flex items-center justify-between gap-3"><h3 title={candidate.displayLabel} className="min-w-0 text-[15px] font-bold text-[#142B5F] [overflow-wrap:anywhere] line-clamp-2">{candidate.displayLabel}</h3><span className="shrink-0 rounded-lg bg-[#DDEFF2] px-2 py-1 text-[11px] font-bold text-[#0E7C86]">{degrees[candidate.confirmedDegree??'UNKNOWN']??degrees.UNKNOWN}</span></div>
            </button>)}
      </section>

      {selected && <aside className="h-fit rounded-2xl border border-[#DDEFF2] bg-white p-5 shadow-sm xl:sticky xl:top-4">
        {!selected ? <div className="py-12 text-center text-sm text-[#203442]"><GraduationCap className="mx-auto h-8 w-8 text-[#0E7C86]" /><p className="mt-3 font-bold">اختر تخصصًا من القائمة لمراجعته.</p></div>
          : <div className="space-y-4"><button type="button" className="min-h-10 rounded-lg border px-3 text-[12px]" onClick={()=>setSelected(null)}>{text('إغلاق المراجعة','Close review')}</button>
            <div><p className="text-xs font-bold text-[#0E7C86]">المصدر الخام</p><h2 className="mt-1 text-xl font-black text-[#142B5F]">{selected.displayLabel}</h2>{selected.facultyOrUnitNames.length > 0 && <p className="mt-2 text-xs text-[#203442]">سياق الكلية في المصدر: {selected.facultyOrUnitNames.join('، ')}</p>}</div>
            <section aria-label={text('أدلة المصدر','Source evidence')} className="space-y-2 rounded-xl bg-[#FAF7F0] p-3 text-[12px]">{selected.sources.map(source=><div key={source.sourceType+source.sourceId}><strong>{source.ownerDisplayName}</strong><p>{source.rawLabel} · {source.degreeLevelLabel??text('درجة غير مثبتة','Degree unconfirmed')}</p>{source.degreeReferences?.length ? <p>{text('سياق درجات محتملة للمنحة، لا يثبت درجة هذا التخصص: ','Possible scholarship degrees; not confirmed for this major: ')}{source.degreeReferences.map(degree=>degree.label??degree.code).join('، ')}</p>:null}</div>)}</section>
            {selected.confirmedDegree==='FELLOWSHIP'&&<p role="status">{text('هذا مرشح زمالة؛ إنشاء الهوية يتم عبر عقد تأليف الزمالات المخصص، وليس اعتماد التخصص العام.','Fellowship identity creation uses the dedicated fellowship authoring contract.')}</p>}
            <Input label="الاسم Canonical المعتمد" value={form.canonicalMajorName} onChange={(value) => setForm({ ...form, canonicalMajorName: value })} />
            <Input label="سبب القرار" value={form.reason} onChange={value=>setForm({...form,reason:value})}/>
            {form.existingMajorId && <section aria-label="مقارنة المرشح بالأصل الموجود" className="rounded border p-3 space-y-2">
              {comparisonError && <p role="alert">{comparisonError}</p>}
              {!comparison&&!comparisonError&&<p role="status">جارٍ تحميل المقارنة…</p>}
              {comparison&&<><div className="grid gap-3 sm:grid-cols-2"><div><h3>المصدر الوارد</h3><p>{comparison.candidate.displayLabel}</p><p>الدرجات: {comparison.candidate.degreeLevelIds.join('، ')||'غير مثبتة'}</p><p>{comparison.candidate.facultyOrUnitNames.join('، ')}</p><p>المراجع: {comparison.candidate.sourceCount}</p></div><div><h3>التخصص الموجود</h3><p>{comparison.target.displayName} · {comparison.target.canonicalName}</p><p>{comparison.target.status} · v{comparison.target.revision}</p><p>الدرجات: {comparison.target.degreeLevelIds.join('، ')}</p><p>المجال: {comparison.target.academicFieldOrDiscipline||comparison.target.academicFieldId||comparison.target.disciplineId||'غير محدد'}</p><p>الأسماء البديلة: {comparison.target.aliases.join('، ')||'لا توجد'}</p></div></div><p>{comparison.nameSignal==='EXACT_NORMALIZED'?'تطابق اسم مطبّع؛ قرار الربط يبقى بشريًا.':'الاسمان مختلفان؛ راجع الهوية والمصدر قبل الربط.'}</p>{comparison.blockers.length>0&&<p role="alert">الربط غير متاح: {comparison.blockers.join('، ')}</p>}<ul>{[...comparison.candidate.officialSourceUrls,...comparison.target.sourceUrls].filter(url=>{try{const parsed=new URL(url);return parsed.protocol==='https:'&&!parsed.username&&!parsed.password;}catch{return false;}}).map((url,index)=><li key={`${url}-${index}`}><a href={url} target="_blank" rel="noopener noreferrer" className="underline">{url}</a></li>)}</ul></>}
            </section>}
            {selected.sourcesTruncated && <p role="alert">هذه المجموعة كبيرة؛ يجب تقسيم مراجعة مراجعها قبل الاعتماد.</p>}

            <label className="block text-xs font-bold text-[#203442]">نوع الدرجة<select value={form.degreeLevel} onChange={(event) => setForm({ ...form, degreeLevel: event.target.value })} className="mt-1 min-h-10 w-full rounded-lg border border-[#DDEFF2] px-3 text-sm"><option value="">اختر</option><option value="BACHELOR">بكالوريوس — MJR</option><option value="MASTER">ماجستير — MAS</option><option value="DOCTORATE">دكتوراه — DOC</option></select></label>
            {canReadTaxonomy?<CanonicalPicker label="الدرجة المرجعية" value={form.degreeLevelId} onChange={(id) => setForm({ ...form, degreeLevelId: id ?? '' })} load={() => canonicalPickerApi.degreeLevels()} reloadKey="new-major-degrees" />:<p className="text-xs">الدرجة المرجعية: {form.degreeLevelId||"غير محددة"} — يلزم إذن إدارة التصنيف لاختيار مرجع آخر.</p>}
            {canReadTaxonomy&&<CanonicalPicker label="المجال الأكاديمي (اختياري)" value={form.academicFieldId} onChange={(id, option) => setForm({ ...form, academicFieldId: id ?? '', academicFieldOrDiscipline: option?.label ?? form.academicFieldOrDiscipline })} load={() => canonicalPickerApi.taxonomyNodes('ACADEMIC_FIELD')} reloadKey="new-major-fields" optional />}
            {canReadTaxonomy&&<CanonicalPicker label="التخصص الفرعي/Discipline (اختياري)" value={form.disciplineId} onChange={(id, option) => setForm({ ...form, disciplineId: id ?? '', academicFieldOrDiscipline: option?.label ?? form.academicFieldOrDiscipline })} load={() => canonicalPickerApi.taxonomyNodes('DISCIPLINE')} reloadKey="new-major-disciplines" optional />}
            <Input label="المصدر الرسمي" value={form.officialSourceUrl} onChange={(value) => setForm({ ...form, officialSourceUrl: value })} />
            {/^https:\/\//i.test(form.officialSourceUrl) && <a href={form.officialSourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-[#0E7C86]"><ExternalLink className="h-3.5 w-3.5" />فتح المصدر</a>}
            <button disabled={saving || !canResolve || selected.sourcesTruncated || selected.confirmedDegree==='FELLOWSHIP' || form.degreeLevel==='FELLOWSHIP' || !form.reason.trim()} onClick={() => void approve()} className="min-h-11 w-full rounded-xl bg-[#0E7C86] px-4 text-sm font-black text-white disabled:opacity-50">{saving ? 'جاري الاعتماد...' : 'اعتماد وربط المصادر'}</button>
            <button type="button" disabled={saving || !canReview} onClick={()=>void reject()} className="min-h-10 w-full rounded-xl border border-red-300 text-red-700">رفض المرجع مع حفظ السبب</button>
            <div className="border-t border-[#DDEFF2] pt-4"><p className="mb-2 text-xs font-black text-[#142B5F]">إذا كان التخصص موجودًا بالفعل</p><CanonicalPicker label="ربط بتخصص Canonical موجود" value={form.existingMajorId} onChange={(id) => setForm({ ...form, existingMajorId: id ?? '' })} paged load={(query,page) => canonicalPickerApi.majors(query,page)} reloadKey={`existing-major:${selected.candidateKey}`} optional /><button disabled={saving || !canResolve || selected.sourcesTruncated || !comparison?.canLink || comparison.target.id!==form.existingMajorId} onClick={() => void linkExisting()} className="mt-3 min-h-10 w-full rounded-xl border border-[#0E7C86] px-4 text-xs font-black text-[#0E7C86] disabled:opacity-40"><Link2 className="ml-1 inline h-4 w-4" />ربط الموجود بدون إنشاء نسخة</button></div>
          </div>}
      </aside>}
    </div>

    {(data?.totalPages ?? 1) > 1 && <div className="flex justify-center gap-3"><button disabled={page <= 1} onClick={() => setPage(v => Math.max(1, v - 1))} className="rounded-lg border border-[#DDEFF2] px-4 py-2 text-sm disabled:opacity-40">السابق</button><span className="py-2 text-sm font-bold">{page} / {data?.totalPages}</span><button disabled={page >= (data?.totalPages ?? 1)} onClick={() => setPage(v => v + 1)} className="rounded-lg border border-[#DDEFF2] px-4 py-2 text-sm disabled:opacity-40">التالي</button></div>}
  </div>;
}

function normalizeDegree(raw: string): string {
  const value = raw.toUpperCase();
  if (value.includes('BACHELOR')) return 'BACHELOR';
  if (value.includes('MASTER')) return 'MASTER';
  if (value.includes('DOCTOR') || value === 'PHD') return 'DOCTORATE';
  if (value.includes('FELLOW')) return 'FELLOWSHIP';
  return '';
}
function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block text-xs font-bold text-[#203442]">{label}<input value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-[#DDEFF2] bg-white px-3 text-sm outline-none focus:border-[#21A7B4]" /></label>; }
