import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ReferenceLifecycleState } from '@manaratak/domain';
import type { AdministrativeRegionDto, ReferenceAliasInput, ReferenceDataPage, ReferenceVersionDto } from '@manaratak/domain';
import { getReferenceDataPage, referenceDataAdminApi } from '../api/referenceData';
import { canonicalPickerApi } from '../api/canonicalPickers';
import { CanonicalPicker } from '../components/CanonicalPicker';

const emptyForm = { countryIso2Code: '', countryId: '', regionCode: '', name: '', nameAr: '', localName: '', regionType: '' };
const aliasTypes = ['COMMON', 'HISTORIC', 'PROVIDER', 'TRANSLITERATION', 'OTHER'] as const;
const message = (error: unknown) => error instanceof Error ? error.message : 'تعذّر تنفيذ الطلب';

export function AdministrativeRegionsTab() {
  const [filters, setFilters] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedPage = Number(params.get('p7Page') ?? '1');
    const rawStatus = params.get('p7Status');
    return {
      country: params.get('p7Country') ?? '',
      q: params.get('p7Q') ?? '',
      mappingStatus: params.get('p7MappingStatus') ?? '',
      updatedFrom: params.get('p7UpdatedFrom') ?? '',
      page: Number.isSafeInteger(requestedPage) && requestedPage > 0 && requestedPage <= 1000000 ? requestedPage : 1,
      status: (rawStatus === 'active' || rawStatus === 'nonactive' ? rawStatus : 'all') as 'active' | 'all' | 'nonactive',
    };
  });
  const [page, setPage] = useState<ReferenceDataPage<AdministrativeRegionDto>>({ data: [], page: 1, pageSize: 50, total: 0, totalPages: 0 });
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AdministrativeRegionDto | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [aliases, setAliases] = useState<ReferenceAliasInput[]>([]);
  const [history, setHistory] = useState<ReferenceVersionDto[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(0);
  const [impactTotal, setImpactTotal] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [listError, setListError] = useState('');
  const [historyError, setHistoryError] = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');
  const [acknowledgement, setAcknowledgement] = useState(false);
  const [toState, setToState] = useState(ReferenceLifecycleState.ARCHIVED);
  const [targetId, setTargetId] = useState<string | null>(null);
  const detailSequence = useRef(0);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (filters.mappingStatus) url.searchParams.set('p7MappingStatus',filters.mappingStatus); else url.searchParams.delete('p7MappingStatus');
    if (filters.updatedFrom) url.searchParams.set('p7UpdatedFrom',filters.updatedFrom); else url.searchParams.delete('p7UpdatedFrom');
    url.searchParams.set('p7Page', String(filters.page));
    url.searchParams.set('p7Status', filters.status);
    if (filters.country) url.searchParams.set('p7Country', filters.country);
    else url.searchParams.delete('p7Country');
    if (filters.q) url.searchParams.set('p7Q', filters.q);
    else url.searchParams.delete('p7Q');
    window.history.replaceState(window.history.state, '', url.toString());
  }, [filters]);

  useEffect(() => {
    let current = true;
    if (filters.country && !/^[A-Z]{2}$/.test(filters.country)) {
      setLoading(false); setListError('أدخل رمز الدولة من حرفين.');
      setPage({ data: [], page: filters.page, pageSize: 50, total: 0, totalPages: 0 });
      return;
    }
    setLoading(true); setListError('');
    getReferenceDataPage<AdministrativeRegionDto>('regions', {
      activeOnly: filters.status === 'active',
      nonActiveOnly: filters.status === 'nonactive',
      countryIso2Code: filters.country || undefined, q: filters.q || undefined, mappingStatus: (filters.mappingStatus || undefined) as 'MAPPED'|'UNMAPPED'|undefined, updatedFrom: filters.updatedFrom ? new Date(filters.updatedFrom).toISOString() : undefined, page: filters.page, pageSize: 50,
    }).then(result => { if (current) setPage(result); })
      .catch(err => { if (current) { setPage({ data: [], page: filters.page, pageSize: 50, total: 0, totalPages: 0 }); setListError(message(err)); } })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [filters, reload]);
  useEffect(() => () => { detailSequence.current++; }, []);

  useEffect(() => {
    if (!selected) return; const id=selected.id; let live=true;
    setHistoryLoading(true); setHistoryError('');
    referenceDataAdminApi.governanceHistoryPage('REGION',id,historyPage).then(result => { if (live) { setHistory(result.data); setHistoryTotalPages(result.totalPages); } })
      .catch(error => { if (live) setHistoryError(message(error)); }).finally(() => { if (live) setHistoryLoading(false); });
    referenceDataAdminApi.governanceImpact('REGION',id).then(result => { if (live) setImpactTotal(result.data.knownTotal); })
      .catch(() => { if (live) setImpactTotal(null); });
    return () => { live=false; };
  }, [selected,historyPage]);

  function reset() {
    detailSequence.current++;
    setSelected(null); setForm(emptyForm); setAliases([]); setHistory([]); setHistoryError(''); setHistoryLoading(false);
    setImpactTotal(null); setAcknowledgement(false); setReason(''); setTargetId(null); setError(''); setStatus('');
  }

  async function open(id: string) {
    const sequence = ++detailSequence.current;
    setBusy(true); setError(''); setStatus(''); setHistory([]); setHistoryError(''); setHistoryLoading(true);
    setSelected(null); setForm(emptyForm); setAliases([]);
    setHistoryPage(1); setImpactTotal(null);
    try {
      const record = await referenceDataAdminApi.getRegion(id);
      if (sequence !== detailSequence.current) return;
      setSelected(record);
      setForm({ countryIso2Code: record.countryIso2Code, countryId: record.countryReferenceId ?? '', regionCode: record.regionCode,
        name: record.name, nameAr: record.nameAr ?? '', localName: record.localName ?? '', regionType: record.regionType ?? '' });
      setAliases(record.aliases ?? []); setReason(''); setTargetId(null); setToState(ReferenceLifecycleState.ARCHIVED);
    } catch (err) { if (sequence === detailSequence.current) { setError(message(err)); setHistoryLoading(false); } }
    finally { if (sequence === detailSequence.current) setBusy(false); }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy || (selected && selected.lifecycleState !== ReferenceLifecycleState.ACTIVE)) return;
    setBusy(true); setError(''); setStatus('');
    try {
      const record = await referenceDataAdminApi.saveRegion({
        id: selected?.id, expectedVersion: selected?.versionNumber, countryIso2Code: form.countryIso2Code, regionCode: form.regionCode,
        name: form.name, nameAr: form.nameAr || null, localName: form.localName || null, regionType: form.regionType || null, aliases,
      });
      setReload(value => value + 1);
      await open(record.id);
      setStatus('تم حفظ المنطقة؛ تُقرأ خيارات الاختيار من السجل المحفوظ.');
    } catch (err) { setError(message(err)); }
    finally { setBusy(false); }
  }

  async function transition() {
    if (!selected || busy || reason.trim().length < 3) return;
    const state = selected.lifecycleState === ReferenceLifecycleState.ACTIVE ? ReferenceLifecycleState.DEPRECATED : toState;
    setBusy(true); setError(''); setStatus('');
    try {
      await referenceDataAdminApi.transitionRegion(selected.id, {
        expectedVersion: selected.versionNumber, toState: state, reason: reason.trim(), acknowledgeHistoricalReferences: acknowledgement,
        targetReferenceId: [ReferenceLifecycleState.MERGED, ReferenceLifecycleState.SUPERSEDED].includes(state) ? targetId ?? undefined : undefined,
      });
      setReload(value => value + 1);
      await open(selected.id);
      setStatus('تم تسجيل تغيير الحالة.');
    } catch (err) { setError(message(err)); }
    finally { setBusy(false); }
  }

  const editable = !selected || selected.lifecycleState === ReferenceLifecycleState.ACTIVE;
  const canTransition = selected && [ReferenceLifecycleState.ACTIVE, ReferenceLifecycleState.DEPRECATED].includes(selected.lifecycleState);
  const needsTarget = selected?.lifecycleState === ReferenceLifecycleState.DEPRECATED && [ReferenceLifecycleState.MERGED, ReferenceLifecycleState.SUPERSEDED].includes(toState);
  return <section dir="rtl" className="space-y-5" aria-label="إدارة المناطق">
    <h3 className="text-lg font-bold">المناطق الإدارية</h3>
    <div className="flex flex-wrap gap-3">
      <label>ربط المزوّد<select value={filters.mappingStatus} onChange={event => setFilters(value => ({...value,mappingStatus:event.target.value,page:1}))}><option value="">الكل</option><option value="MAPPED">مربوط</option><option value="UNMAPPED">غير مربوط</option></select></label>
      <label>تحديث منذ<input type="datetime-local" value={filters.updatedFrom} onChange={event => setFilters(value => ({...value,updatedFrom:event.target.value,page:1}))} /></label>
      <label>رمز الدولة للبحث<input aria-label="رمز الدولة للبحث" maxLength={2} value={filters.country} onChange={event => setFilters({ ...filters, country: event.target.value.toUpperCase(), page: 1 })} className="border rounded p-2" /></label>
      <label>البحث<input value={filters.q} onChange={event => setFilters({ ...filters, q: event.target.value, page: 1 })} className="border rounded p-2" /></label>
      <label>حالة المنطقة
        <select className="border rounded p-2" value={filters.status}
          onChange={event => setFilters({ ...filters, status: event.target.value as 'active' | 'all' | 'nonactive', page: 1 })}>
          <option value="active">النشطة فقط</option>
          <option value="all">جميع الحالات</option>
          <option value="nonactive">غير النشطة فقط</option>
        </select>
      </label>
      <button type="button" disabled={busy} onClick={reset}>منطقة جديدة</button>
      <button type="button" disabled={loading} onClick={() => setReload(value => value + 1)}>تحديث القائمة</button>
    </div>
    {listError ? <p role="alert">{listError}</p> : null}
    {loading ? <p role="status">جارٍ تحميل المناطق…</p> : <table className="w-full text-sm">
      <thead><tr><th>الدولة</th><th>الرمز</th><th>الاسم</th><th>الحالة</th><th>التفاصيل</th></tr></thead>
      <tbody>{page.data.map(record => <tr key={record.id}><td>{record.countryIso2Code}</td><td>{record.regionCode}</td><td>{record.nameAr ?? record.name}</td><td>{record.lifecycleState}</td><td><button type="button" disabled={busy} onClick={() => void open(record.id)}>فتح {record.regionCode}</button></td></tr>)}</tbody>
    </table>}
    {!loading && !listError && !page.data.length ? <p>لا توجد مناطق مطابقة.</p> : null}
    <div className="flex gap-3">
      <button type="button" disabled={loading || filters.page <= 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })}>السابق</button>
      <span>{page.total} منطقة · {filters.page} / {Math.max(1, page.totalPages)}</span>
      <button type="button" disabled={loading || filters.page >= page.totalPages} onClick={() => setFilters({ ...filters, page: filters.page + 1 })}>التالي</button>
    </div>
    {error ? <p role="alert" className="text-red-700">{error}</p> : null}
    {status ? <p role="status" className="text-green-700">{status}</p> : null}
    {selected ? <p>المعرف: {selected.id} · النسخة: {selected.versionNumber} · الحالة: {selected.lifecycleState}
      <button type="button" disabled={busy} onClick={() => void open(selected.id)}>إعادة تحميل التفاصيل</button>
    </p> : null}
    <form onSubmit={save} className="space-y-3 rounded border p-4">
      <fieldset disabled={busy || !editable} className="grid gap-3 md:grid-cols-2">
        <legend>{selected ? 'تعديل المنطقة' : 'إنشاء منطقة'}</legend>
        <CanonicalPicker paged label="الدولة" value={form.countryId} load={canonicalPickerApi.countries} disabled={Boolean(selected)}
          onChange={(id, option) => setForm({ ...form, countryId: id ?? '', countryIso2Code: option?.code ?? '' })} />
        <label>رمز المنطقة<input required pattern="[A-Z0-9][A-Z0-9-]{0,31}" maxLength={32} readOnly={Boolean(selected)} value={form.regionCode} onChange={event => setForm({ ...form, regionCode: event.target.value })} className="border rounded p-2 w-full" /></label>
        {(['name', 'nameAr', 'localName', 'regionType'] as const).map((key, index) => <label key={key}>
          {['الاسم', 'الاسم العربي', 'الاسم المحلي', 'نوع المنطقة'][index]}
          <input required={key === 'name'} maxLength={key === 'regionType' ? 100 : 300} value={form[key]} onChange={event => setForm({ ...form, [key]: event.target.value })} className="border rounded p-2 w-full" />
        </label>)}
      </fieldset>
      <fieldset disabled={busy || !editable} className="space-y-2">
        <legend>الأسماء البديلة</legend>
        {aliases.map((alias, index) => <div key={index} className="flex flex-wrap gap-2">
          <label>الاسم البديل {index + 1}<input required maxLength={300} value={alias.alias} onChange={event => setAliases(items => items.map((item, i) => i === index ? { ...item, alias: event.target.value } : item))} className="border rounded p-2" /></label>
          <label>اللغة<input maxLength={35} value={alias.locale ?? ''} onChange={event => setAliases(items => items.map((item, i) => i === index ? { ...item, locale: event.target.value || null } : item))} className="border rounded p-2" /></label>
          <label>النوع<select value={alias.aliasType ?? 'COMMON'} onChange={event => setAliases(items => items.map((item, i) => i === index ? { ...item, aliasType: event.target.value as ReferenceAliasInput['aliasType'] } : item))}>{aliasTypes.map(type => <option key={type}>{type}</option>)}</select></label>
          <button type="button" onClick={() => setAliases(items => items.filter((_, i) => i !== index))}>حذف الاسم {index + 1}</button>
        </div>)}
        <button type="button" disabled={aliases.length >= 100} onClick={() => setAliases(items => [...items, { alias: '', aliasType: 'COMMON' }])}>إضافة اسم بديل</button>
      </fieldset>
      <button type="submit" disabled={busy || !editable || !form.countryIso2Code}>حفظ المنطقة</button>
      {!editable ? <p>التعديل متاح للمناطق النشطة فقط؛ تبقى العلاقات السابقة محفوظة.</p> : null}
    </form>
    {canTransition ? <fieldset disabled={busy} className="space-y-3 rounded border p-4">
      <legend>تغيير الحالة</legend>
      <p>الإيقاف يمنع الاختيار الجديد. الأرشفة تُمنع عند وجود روابط مرصودة؛ الاستبدال والدمج يحفظان المعرّف والتاريخ دون نقل تلقائي.</p>
      {selected.lifecycleState === ReferenceLifecycleState.ACTIVE ? <p>الخطوة التالية: DEPRECATED</p> :
        <label>الحالة التالية<select value={toState} onChange={event => { setToState(event.target.value as ReferenceLifecycleState); setTargetId(null); }}>
          {[ReferenceLifecycleState.ARCHIVED, ReferenceLifecycleState.SUPERSEDED, ReferenceLifecycleState.MERGED].map(state => <option key={state}>{state}</option>)}
        </select></label>}
      {needsTarget ? <CanonicalPicker paged label="المنطقة البديلة من الدولة نفسها" value={targetId} reloadKey={selected.countryIso2Code + ':' + reload}
        load={async (query,page) => (await canonicalPickerApi.regions(selected.countryIso2Code,query,page)).filter(item => item.id !== selected.id)} onChange={setTargetId} /> : null}
      <label>سبب التغيير<textarea minLength={3} maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} className="border rounded p-2 w-full" /></label>
      <label><input type="checkbox" checked={acknowledgement} onChange={event => setAcknowledgement(event.target.checked)} />راجعت الأثر؛ تبقى العلاقات التاريخية محفوظة.</label>
      <button type="button" disabled={busy || impactTotal === null || selected.lifecycleState !== ReferenceLifecycleState.ACTIVE && toState === ReferenceLifecycleState.ARCHIVED && impactTotal > 0 || reason.trim().length < 3 || selected.lifecycleState !== ReferenceLifecycleState.ACTIVE && !acknowledgement || Boolean(needsTarget && !targetId)} onClick={() => void transition()}>تسجيل تغيير الحالة</button>
    </fieldset> : null}
    {selected ? <details><summary>سجل نسخ المنطقة</summary>
      {historyLoading ? <p role="status">جارٍ تحميل السجل…</p> : historyError ? <p role="alert">{historyError}</p> : <ul>{history.map(version => <li key={version.id}>#{version.versionNumber} · {version.lifecycleState} · {version.changeReason} · {version.actorId} · {String(version.createdAt)}</li>)}</ul>}
      <div className="flex gap-3"><button type="button" disabled={historyLoading || historyPage<=1} onClick={() => setHistoryPage(value=>value-1)}>السابق</button><span>{historyPage} / {Math.max(1,historyTotalPages)}</span><button type="button" disabled={historyLoading || historyPage>=historyTotalPages} onClick={() => setHistoryPage(value=>value+1)}>التالي</button></div>
    </details> : null}
  </section>;
}
