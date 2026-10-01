import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ExternalCourseProviderStatus } from '@manaratak/domain';
import { courseProviderRegistryApi as api, type ProviderRegistryRecord } from '../api/courseProviders';

const emptyForm = { displayName: '', officialWebsite: '', aliases: '', domains: '', reason: '', evidenceReference: '', reviewed: false };
const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'تعذر تنفيذ الطلب';

export function CourseProviderRegistryPage() {
  const [records, setRecords] = useState<ProviderRegistryRecord[]>([]);
  const [page, setPage] = useState(1); const [totalPages, setTotalPages] = useState(0);
  const [query, setQuery] = useState(''); const [draftQuery, setDraftQuery] = useState('');
  const [status, setStatus] = useState<ExternalCourseProviderStatus | ''>('');
  const [reload, setReload] = useState(0); const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null); const [selected, setSelected] = useState<ProviderRegistryRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false); const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm); const [listError, setListError] = useState(''); const [error, setError] = useState(''); const [message, setMessage] = useState('');
  const [rawLabel, setRawLabel] = useState(''); const [review, setReview] = useState(''); const [checking, setChecking] = useState(false);
  const selectionRef = useRef(selectedId); selectionRef.current = selectedId;

  useEffect(() => {
    let active = true; setLoading(true); setListError('');
    api.list({ page, pageSize: 50, q: query || undefined, status: status || undefined }).then(result => {
      if (active) { setRecords(result.data); setTotalPages(result.totalPages); }
    }).catch(err => { if (active) setListError(errorMessage(err)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, query, status, reload]);

  useEffect(() => {
    let active = true; setSelected(null); setError(''); setDetailLoading(Boolean(selectedId));
    if (selectedId) api.get(selectedId).then(result => {
      if (!active) return; setSelected(result);
      setForm({ ...emptyForm, displayName: result.displayName, officialWebsite: result.officialWebsite ?? '', aliases: result.aliases.map(alias => alias.alias + (alias.locale ? '|' + alias.locale : '')).join('\n'), domains: result.allowedDomains.join('\n') });
    }).catch(err => { if (active) setError(errorMessage(err)); }).finally(() => { if (active) setDetailLoading(false); });
    return () => { active = false; };
  }, [selectedId, reload]);

  const save = async (event: FormEvent) => {
    event.preventDefault(); if (!selected || !form.reviewed || saving) return;
    setSaving(true); setError(''); setMessage(''); const targetId = selected.id;
    try {
      const aliases = form.aliases.split(/\r?\n/u).filter(line => line.trim()).map(line => {
        const fields = line.split('|'); if (fields.length > 2) throw new Error('اكتب اسمًا بديلًا ولغة اختيارية فقط في كل سطر');
        return { alias: fields[0].trim(), ...(fields[1]?.trim() ? { locale: fields[1].trim() } : {}) };
      });
      await api.update(targetId, { expectedUpdatedAt: selected.updatedAt, displayName: form.displayName, officialWebsite: form.officialWebsite.trim() || null, aliases,
        allowedDomains: form.domains.split(/\r?\n/u).map(line => line.trim()).filter(Boolean), reason: form.reason, evidenceReference: form.evidenceReference, mappingsReviewed: true });
      if (selectionRef.current === targetId) { setReload(value => value + 1); setMessage('حُفظت المراجعة. لم تتغير هوية المزود أو حالة اعتماده.'); }
    } catch (err) { if (selectionRef.current === targetId) setError(errorMessage(err)); }
    finally { setSaving(false); }
  };
  const checkLabel = async (event: FormEvent) => {
    event.preventDefault(); setChecking(true); setReview(''); const label = rawLabel;
    try { const result = await api.resolveLabel(label); setReview(result.state === 'REVIEW_REQUIRED' ? 'REVIEW_REQUIRED — الاسم غير معروف أو المزود غير معتمد. يحتاج مراجعة؛ لم تُنشأ علاقة.' : 'VERIFIED_MAPPING — ' + result.publicId + ' · ' + result.providerId); }
    catch (err) { setReview(errorMessage(err)); } finally { setChecking(false); }
  };
  const readOnly = selected?.status === 'DISABLED' || selected?.status === 'ARCHIVED';
  return <div dir="rtl" className="space-y-5 p-5">
    <Link to="/courses" className="text-blue-700">العودة إلى الدورات</Link>
    <h1 className="text-2xl font-bold">مزودو الدورات — الأسماء البديلة والنطاقات</h1>
    <form onSubmit={event => { event.preventDefault(); setQuery(draftQuery.trim()); setPage(1); }} className="flex flex-wrap items-end gap-3">
      <label>البحث<input className="block rounded border p-2" value={draftQuery} onChange={event => setDraftQuery(event.target.value)} /></label>
      <label>الحالة<select className="block rounded border p-2" value={status} onChange={event => { setStatus(event.target.value as ExternalCourseProviderStatus | ''); setPage(1); }}><option value="">الكل</option>{Object.values(ExternalCourseProviderStatus).map(value => <option key={value} value={value}>{value}</option>)}</select></label>
      <button className="rounded border p-2" type="submit">بحث</button><button className="rounded border p-2" type="button" disabled={saving} onClick={() => setReload(value => value + 1)}>تحديث</button>
    </form>
    {listError ? <p role="alert" className="text-red-700">{listError}</p> : null}
    {loading ? <p role="status">جارٍ تحميل المزودين…</p> : <ul className="grid gap-2 md:grid-cols-3">{records.map(record => <li key={record.id}><button type="button" disabled={saving} onClick={() => { setSelectedId(record.id); setMessage(''); }} className="w-full rounded border p-3 text-start"><strong>{record.displayName}</strong><span className="block text-xs">{record.publicId} · {record.status}</span></button></li>)}</ul>}
    {!loading && !listError && !records.length ? <p>لا توجد نتائج.</p> : null}
    <div className="flex gap-3"><button type="button" disabled={loading || page <= 1} onClick={() => setPage(value => value - 1)}>السابق</button><span>{page} / {totalPages || 1}</span><button type="button" disabled={loading || page >= totalPages} onClick={() => setPage(value => value + 1)}>التالي</button></div>
    {detailLoading ? <p role="status">جارٍ تحميل التفاصيل…</p> : null}
    {error ? <p role="alert" className="text-red-700">{error} — حدّث التفاصيل قبل إعادة المحاولة عند تعارض النسخة.</p> : null}
    {message ? <p role="status" className="text-green-700">{message}</p> : null}
    {selected ? <form onSubmit={save} className="space-y-3 rounded border p-4">
      <h2 className="font-bold">{selected.canonicalName}</h2><p className="text-xs" dir="ltr">{selected.id} · {selected.publicId} · {selected.slug} · {selected.status}</p>
      {readOnly ? <p>هذا المزود معطّل أو مؤرشف؛ بياناته للقراءة فقط.</p> : null}
      <fieldset disabled={saving || Boolean(readOnly)} className="grid gap-3 md:grid-cols-2">
        <label>اسم العرض<input required maxLength={300} className="block w-full rounded border p-2" value={form.displayName} onChange={event => setForm({ ...form, displayName: event.target.value })} /></label>
        <label>الموقع الرسمي (HTTPS)<input type="url" maxLength={2000} dir="ltr" className="block w-full rounded border p-2" value={form.officialWebsite} onChange={event => setForm({ ...form, officialWebsite: event.target.value })} /></label>
        <label>الأسماء البديلة: اسم|لغة اختيارية، سطر لكل اسم<textarea rows={6} className="block w-full rounded border p-2" value={form.aliases} onChange={event => setForm({ ...form, aliases: event.target.value })} /></label>
        <label>النطاقات المسموحة: اسم نطاق فقط، سطر لكل نطاق<textarea rows={6} dir="ltr" className="block w-full rounded border p-2" value={form.domains} onChange={event => setForm({ ...form, domains: event.target.value })} /></label>
        <label>سبب التعديل<textarea required maxLength={1000} className="block w-full rounded border p-2" value={form.reason} onChange={event => setForm({ ...form, reason: event.target.value })} /></label>
        <label>مرجع دليل المراجعة<input required maxLength={300} className="block w-full rounded border p-2" value={form.evidenceReference} onChange={event => setForm({ ...form, evidenceReference: event.target.value })} /></label>
        <label className="md:col-span-2"><input type="checkbox" checked={form.reviewed} onChange={event => setForm({ ...form, reviewed: event.target.checked })} /> راجعت الأسماء والنطاقات والحذف مقارنةً بالمصدر الرسمي.</label>
        <button type="submit" disabled={!form.reviewed} className="rounded bg-blue-800 p-2 text-white disabled:opacity-50">{saving ? 'جارٍ الحفظ…' : 'حفظ المراجعة'}</button>
      </fieldset>
      <p className="text-xs">اعتماد المزود وصحة المصدر لهما إجراء منفصل. لا يشغّل هذا الحفظ استيرادًا أو اتصالًا بالمواقع.</p>
    </form> : null}
    <form onSubmit={checkLabel} className="space-y-2 rounded border p-4"><label>فحص اسم مزود من المصدر<input required maxLength={300} className="block w-full rounded border p-2" value={rawLabel} disabled={checking} onChange={event => setRawLabel(event.target.value)} /></label><button type="submit" disabled={checking} className="rounded border p-2">{checking ? 'جارٍ الفحص…' : 'فحص الربط'}</button>{review ? <p role="status">{review}</p> : null}</form>
  </div>;
}
