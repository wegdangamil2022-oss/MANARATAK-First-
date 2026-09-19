import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, ExternalLink, GraduationCap, Link2, Loader2, Search } from 'lucide-react';
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
  facultyOrUnitName?: string | null;
  officialSourceUrl?: string | null;
  sourceUrl?: string | null;
};
type Candidate = {
  candidateKey: string;
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
  localizedNameAr: string;
  localizedNameEn: string;
  degreeLevel: string;
  degreeLevelId: string;
  academicFieldId: string;
  disciplineId: string;
  academicFieldOrDiscipline: string;
  officialSourceUrl: string;
  existingMajorId: string;
};

const EMPTY: FormState = {
  canonicalMajorName: '', localizedNameAr: '', localizedNameEn: '', degreeLevel: '', degreeLevelId: '',
  academicFieldId: '', disciplineId: '', academicFieldOrDiscipline: '', officialSourceUrl: '', existingMajorId: '',
};
const SOURCE_LABELS: Record<SourceType, string> = {
  UNIVERSITY_PROGRAM: 'برنامج جامعة',
  SCHOLARSHIP_MAJOR_TARGET: 'هدف منحة',
  SCHOLARSHIP_ELIGIBILITY: 'شرط أهلية منحة',
};

export function NewMajorCandidatesPanel({ onTotalChange }: { onTotalChange?: (total: number) => void }) {
  const [data, setData] = useState<PageResult | null>(null);
  const [search, setSearch] = useState('');
  const [sourceType, setSourceType] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [resolvedMajorId, setResolvedMajorId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '25' });
      if (search.trim()) params.set('search', search.trim());
      if (sourceType) params.set('sourceType', sourceType);
      const result = await adminApiClient.request<PageResult>(`/admin/majors/new-candidates?${params}`);
      setData(result);
      onTotalChange?.(result.total);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'تعذر تحميل التخصصات الجديدة.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 200);
    return () => window.clearTimeout(timer);
  }, [search, sourceType, page]);

  const selectCandidate = (candidate: Candidate) => {
    const uniqueDegreeCode = candidate.degreeLevelCodes.length === 1 ? normalizeDegree(candidate.degreeLevelCodes[0]) : '';
    setSelected(candidate);
    setError(null);
    setSuccess(null);
    setResolvedMajorId(null);
    setForm({
      ...EMPTY,
      canonicalMajorName: candidate.displayLabel,
      localizedNameAr: /[\u0600-\u06FF]/.test(candidate.displayLabel) ? candidate.displayLabel : '',
      localizedNameEn: /[A-Za-z]/.test(candidate.displayLabel) ? candidate.displayLabel : '',
      degreeLevel: uniqueDegreeCode,
      degreeLevelId: candidate.degreeLevelIds.length === 1 ? candidate.degreeLevelIds[0] : '',
      officialSourceUrl: candidate.officialSourceUrls[0] ?? '',
    });
  };

  const approve = async () => {
    if (!selected) return;
    if (!form.canonicalMajorName.trim() || !form.degreeLevel || !form.degreeLevelId) {
      setError('الاسم المعتمد والدرجة المرجعية مطلوبان قبل الاعتماد.');
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
          localizedNameAr: form.localizedNameAr.trim() || null,
          localizedNameEn: form.localizedNameEn.trim() || null,
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
    if (!selected || !form.existingMajorId) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await adminApiClient.request(`/admin/majors/new-candidates/${encodeURIComponent(selected.candidateKey)}/link`, {
        method: 'POST',
        body: JSON.stringify({ majorId: form.existingMajorId }),
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

  const countBySource = useMemo(() => (data?.data ?? []).reduce((acc, item) => {
    for (const type of item.sourceTypes) acc[type] = (acc[type] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>), [data]);

  return <div className="space-y-5">
    <section className="rounded-2xl border border-[#DDEFF2] bg-[#FAF7F0] p-4">
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-[#DDEFF2] p-2"><GraduationCap className="h-5 w-5 text-[#0E7C86]" /></span>
        <div>
          <h2 className="font-black text-[#142B5F]">تخصصات جديدة</h2>
          <p className="mt-1 text-sm leading-7 text-[#203442]">هذه ليست قائمة تخصصات منشورة. هي مراجع غير مطابقة وصلت من الجامعات أو المنح، وتبقى خارج الكتالوج الرسمي حتى يراجعها المدير ويعتمد الهوية والدرجة والتصنيف. سياق الكلية يبقى مرتبطًا ببرنامج الجامعة ولا يتحول إلى خاصية عامة للتخصص.</p>
        </div>
      </div>
    </section>

    <section className="grid gap-3 sm:grid-cols-4">
      <Stat label="غير محسومة" value={data?.total ?? 0} />
      <Stat label="من برامج الجامعات" value={countBySource.UNIVERSITY_PROGRAM ?? 0} />
      <Stat label="من أهداف المنح" value={countBySource.SCHOLARSHIP_MAJOR_TARGET ?? 0} />
      <Stat label="من أهلية المنح" value={countBySource.SCHOLARSHIP_ELIGIBILITY ?? 0} />
    </section>

    <section className="grid gap-3 rounded-2xl border border-[#DDEFF2] bg-white p-4 md:grid-cols-[1fr_240px]">
      <label className="relative"><Search className="absolute right-3 top-3.5 h-4 w-4 text-[#0E7C86]" /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} className="min-h-11 w-full rounded-xl border border-[#DDEFF2] bg-[#FAF7F0] pr-10 pl-3 text-sm outline-none focus:border-[#21A7B4]" placeholder="ابحث بالاسم الوارد" /></label>
      <select value={sourceType} onChange={(event) => { setSourceType(event.target.value); setPage(1); }} className="min-h-11 rounded-xl border border-[#DDEFF2] bg-white px-3 text-sm"><option value="">كل المصادر</option>{Object.entries(SOURCE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
    </section>

    {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700"><AlertCircle className="ml-2 inline h-4 w-4" />{error}</div>}
    {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700"><CheckCircle2 className="ml-2 inline h-4 w-4" />{success}{resolvedMajorId && <Link to={`/majors/${encodeURIComponent(resolvedMajorId)}`} className="mr-3 underline">فتح التخصص</Link>}</div>}

    <div className="grid gap-4 xl:grid-cols-[1fr_430px]">
      <section className="space-y-3">
        {loading ? <div className="flex min-h-56 items-center justify-center gap-2 text-sm font-bold"><Loader2 className="h-5 w-5 animate-spin" />جاري جمع المراجع غير المحسومة...</div>
          : (data?.data.length ?? 0) === 0 ? <div className="rounded-2xl border border-[#DDEFF2] bg-[#FAF7F0] p-8 text-center"><CheckCircle2 className="mx-auto h-7 w-7 text-[#0E7C86]" /><p className="mt-2 font-black text-[#142B5F]">لا توجد تخصصات جديدة غير محسومة حاليًا</p></div>
            : data?.data.map(candidate => <button type="button" key={candidate.candidateKey} onClick={() => selectCandidate(candidate)} className={`w-full rounded-2xl border p-4 text-right shadow-sm transition ${selected?.candidateKey === candidate.candidateKey ? 'border-[#21A7B4] bg-[#DDEFF2]/40' : 'border-[#DDEFF2] bg-white hover:border-[#21A7B4]'}`}>
              <div className="flex items-start justify-between gap-3"><div><h3 className="font-black text-[#142B5F]">{candidate.displayLabel}</h3><p className="mt-1 text-xs text-[#203442]">{candidate.sourceCount} مصدر · {candidate.degreeLevelLabels.join('، ') || 'الدرجة تحتاج مراجعة'}</p></div><span className="rounded-full bg-[#FAF7F0] px-2 py-1 text-[11px] font-bold text-[#0E7C86]">{candidate.sourceTypes.map(type => SOURCE_LABELS[type]).join(' · ')}</span></div>
              <div className="mt-3 flex flex-wrap gap-1.5">{candidate.sources.slice(0, 3).map(source => <span key={`${source.sourceType}-${source.sourceId}`} className="rounded-lg bg-[#FAF7F0] px-2 py-1 text-[11px] text-[#203442]">{source.ownerDisplayName}</span>)}{candidate.sourceCount > 3 && <span className="rounded-lg bg-[#FAF7F0] px-2 py-1 text-[11px]">+{candidate.sourceCount - 3}</span>}</div>
            </button>)}
      </section>

      <aside className="h-fit rounded-2xl border border-[#DDEFF2] bg-white p-5 shadow-sm xl:sticky xl:top-4">
        {!selected ? <div className="py-12 text-center text-sm text-[#203442]"><GraduationCap className="mx-auto h-8 w-8 text-[#0E7C86]" /><p className="mt-3 font-bold">اختر تخصصًا من القائمة لمراجعته.</p></div>
          : <div className="space-y-4">
            <div><p className="text-xs font-bold text-[#0E7C86]">المصدر الخام</p><h2 className="mt-1 text-xl font-black text-[#142B5F]">{selected.displayLabel}</h2>{selected.facultyOrUnitNames.length > 0 && <p className="mt-2 text-xs text-[#203442]">سياق الكلية في المصدر: {selected.facultyOrUnitNames.join('، ')}</p>}</div>
            <Input label="الاسم Canonical المعتمد" value={form.canonicalMajorName} onChange={(value) => setForm({ ...form, canonicalMajorName: value })} />
            <div className="grid gap-3 sm:grid-cols-2"><Input label="الاسم العربي" value={form.localizedNameAr} onChange={(value) => setForm({ ...form, localizedNameAr: value })} /><Input label="الاسم الإنجليزي" value={form.localizedNameEn} onChange={(value) => setForm({ ...form, localizedNameEn: value })} /></div>
            <label className="block text-xs font-bold text-[#203442]">نوع الدرجة<select value={form.degreeLevel} onChange={(event) => setForm({ ...form, degreeLevel: event.target.value })} className="mt-1 min-h-10 w-full rounded-lg border border-[#DDEFF2] px-3 text-sm"><option value="">اختر</option><option value="BACHELOR">بكالوريوس — MJR</option><option value="MASTER">ماجستير — MAS</option><option value="DOCTORATE">دكتوراه — DOC</option><option value="FELLOWSHIP">زمالة — FEL</option></select></label>
            <CanonicalPicker label="الدرجة المرجعية" value={form.degreeLevelId} onChange={(id) => setForm({ ...form, degreeLevelId: id ?? '' })} load={() => canonicalPickerApi.degreeLevels()} reloadKey="new-major-degrees" />
            <CanonicalPicker label="المجال الأكاديمي (اختياري)" value={form.academicFieldId} onChange={(id, option) => setForm({ ...form, academicFieldId: id ?? '', academicFieldOrDiscipline: option?.label ?? form.academicFieldOrDiscipline })} load={() => canonicalPickerApi.taxonomyNodes('ACADEMIC_FIELD')} reloadKey="new-major-fields" optional />
            <CanonicalPicker label="التخصص الفرعي/Discipline (اختياري)" value={form.disciplineId} onChange={(id, option) => setForm({ ...form, disciplineId: id ?? '', academicFieldOrDiscipline: option?.label ?? form.academicFieldOrDiscipline })} load={() => canonicalPickerApi.taxonomyNodes('DISCIPLINE')} reloadKey="new-major-disciplines" optional />
            <Input label="المصدر الرسمي" value={form.officialSourceUrl} onChange={(value) => setForm({ ...form, officialSourceUrl: value })} />
            {form.officialSourceUrl && <a href={form.officialSourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-[#0E7C86]"><ExternalLink className="h-3.5 w-3.5" />فتح المصدر</a>}
            <button disabled={saving} onClick={() => void approve()} className="min-h-11 w-full rounded-xl bg-[#0E7C86] px-4 text-sm font-black text-white disabled:opacity-50">{saving ? 'جاري الاعتماد...' : 'اعتماد وربط المصادر'}</button>
            <div className="border-t border-[#DDEFF2] pt-4"><p className="mb-2 text-xs font-black text-[#142B5F]">إذا كان التخصص موجودًا بالفعل</p><CanonicalPicker label="ربط بتخصص Canonical موجود" value={form.existingMajorId} onChange={(id) => setForm({ ...form, existingMajorId: id ?? '' })} load={() => canonicalPickerApi.majors(selected.displayLabel)} reloadKey={`existing-major:${selected.candidateKey}`} optional /><button disabled={saving || !form.existingMajorId} onClick={() => void linkExisting()} className="mt-3 min-h-10 w-full rounded-xl border border-[#0E7C86] px-4 text-xs font-black text-[#0E7C86] disabled:opacity-40"><Link2 className="ml-1 inline h-4 w-4" />ربط الموجود بدون إنشاء نسخة</button></div>
          </div>}
      </aside>
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
function Stat({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl border border-[#DDEFF2] bg-white p-4"><p className="text-xs font-bold text-[#203442]">{label}</p><p className="mt-1 text-2xl font-black text-[#142B5F]">{value}</p></div>; }
function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block text-xs font-bold text-[#203442]">{label}<input value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-[#DDEFF2] bg-white px-3 text-sm outline-none focus:border-[#21A7B4]" /></label>; }
