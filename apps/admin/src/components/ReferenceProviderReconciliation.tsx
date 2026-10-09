import React, { useEffect, useRef, useState } from 'react';
import type { ReferenceDataCollection, ReferenceProviderMappingInput } from '@manaratak/domain';
import { getReferenceDataPage, referenceDataAdminApi } from '../api/referenceData';

type SupportedType = 'COUNTRY' | 'CURRENCY' | 'LANGUAGE' | 'CITY';
type Target = { id: string; name: string; iso2Code?: string; isoCode?: string; versionNumber: number; lifecycleState: string };
const collections: Record<SupportedType, ReferenceDataCollection> = {
  COUNTRY: 'countries', CURRENCY: 'currencies', LANGUAGE: 'languages', CITY: 'cities',
};

/** Explicit transfer is distinct from normal Save: exactly one provider key,
 * both optimistic versions, a declared target and replay-stable request ID.
 */
export function ReferenceProviderReconciliation({
  entityType, source, mappings, onChanged,
}: {
  entityType: SupportedType;
  source: { id: string; versionNumber: number; lifecycleState: string; countryIso2Code?: string };
  mappings: ReferenceProviderMappingInput[];
  onChanged: () => void;
}) {
  const [key, setKey] = useState('');
  const [search, setSearch] = useState('');
  const [targets, setTargets] = useState<Target[]>([]);
  const [target, setTarget] = useState<Target | null>(null);
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const receiptId = useRef<string | null>(null);

  const pairs = mappings.map(mapping => ({
    key: mapping.providerSystem + '\u0000' + mapping.providerId,
    mapping,
  }));
  const selectedMapping = pairs.find(pair => pair.key === key)?.mapping;
  const resetApproval = () => { receiptId.current = null; setConfirmed(false); setError(null); };

  useEffect(() => {
    if (search.trim().length < 2) { setTargets([]); setQueryError(null); return; }
    let active = true;
    const query = search.trim();
    const delay = window.setTimeout(() => {
      getReferenceDataPage<Target>(collections[entityType], {
        page: 1, pageSize: 25, activeOnly: true, q: query,
        ...(entityType === 'CITY' && source.countryIso2Code ? { countryIso2Code: source.countryIso2Code } : {}),
      }).then(result => {
        if (active) { setTargets(result.data.filter(row => row.id !== source.id && row.lifecycleState === 'ACTIVE')); setQueryError(null); }
      }).catch(err => {
        if (active) { setTargets([]); setQueryError(err instanceof Error ? err.message : 'تعذر البحث'); }
      });
    }, 280);
    return () => { active = false; clearTimeout(delay); };
  }, [search, entityType, source.id, source.countryIso2Code]);

  const submit = async () => {
    if (!selectedMapping || !target || !confirmed || reason.trim().length < 3 ||
        source.lifecycleState !== 'ACTIVE' || target.lifecycleState !== 'ACTIVE') return;
    if (!receiptId.current) receiptId.current = crypto.randomUUID();
    setLoading(true); setError(null);
    try {
      await referenceDataAdminApi.reassignProviderMapping({
        entityType,
        fromReferenceId: source.id,
        toReferenceId: target.id,
        fromExpectedVersion: source.versionNumber,
        toExpectedVersion: target.versionNumber,
        providerSystem: selectedMapping.providerSystem,
        providerId: selectedMapping.providerId,
        reason: reason.trim(),
        reconciliationId: receiptId.current,
      });
      onChanged();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'تعذرت المصالحة، تحقق من نسخ المصدر والوجهة.');
    } finally { setLoading(false); }
  };

  return <section className="border border-amber-200 bg-amber-50 rounded-xl p-4 space-y-3">
    <h5 className="font-bold text-sm">مصالحة نقل معرّف مزود إلى سجل آخر / Explicit ownership transfer</h5>
    <p className="text-xs">هذه العملية لا تضيف معرفًا جديدًا، بل تنقل ملكية معرف موجود. تحفظ تاريخ المصدر والهدف وتخضع لفحص نسختيهما. لا ينفذ النقل تلقائيًا.</p>
    <label className="block text-xs space-y-1">معرف المزود المراد نقله
      <select aria-label="معرف المزود المراد نقله" className="w-full border rounded-lg p-2 bg-white"
        disabled={loading} value={key} onChange={e => { setKey(e.target.value); resetApproval(); }}>
        <option value="">اختر معرّفًا موجودًا…</option>
        {pairs.map(pair => <option key={pair.key} value={pair.key}>
          {pair.mapping.providerSystem}: {pair.mapping.providerId}
        </option>)}
      </select>
    </label>
    <label className="block text-xs space-y-1">البحث عن السجل الهدف (أدخل حرفين على الأقل)
      <input value={search} className="w-full border rounded-lg p-2" placeholder="الاسم أو رمز الدولة/العملة/اللغة/المدينة"
        disabled={loading} onChange={e => { setSearch(e.target.value); setTarget(null); resetApproval(); }} />
    </label>
    {queryError && <p role="alert" className="text-red-700 text-xs">{queryError}</p>}
    <div role="listbox" aria-label="السجلات الهدف" className="max-h-36 overflow-y-auto space-y-1">
      {targets.map(row => <button type="button" key={row.id} role="option" aria-selected={target?.id === row.id}
        className={`block w-full text-right border rounded-lg p-2 text-xs ${target?.id === row.id ? 'bg-indigo-100 border-indigo-400' : 'bg-white'}`}
        disabled={loading} onClick={() => { setTarget(row); resetApproval(); }}>
        {row.name} · {row.iso2Code ?? row.isoCode ?? ''} · v{row.versionNumber} · {row.id}
      </button>)}
    </div>
    {target && <p className="text-xs font-bold">الهدف المحدد: {target.name} | Canonical ID {target.id} | expectedVersion {target.versionNumber}</p>}
    <label className="block text-xs space-y-1">سبب المصالحة (مطلوب)
      <textarea value={reason} className="w-full border rounded-lg p-2" minLength={3} maxLength={1000}
        disabled={loading} onChange={e => { setReason(e.target.value); resetApproval(); }} />
    </label>
    <label className="flex gap-2 text-xs items-start">
      <input type="checkbox" disabled={loading} checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
      أقر بأن معرف المزود يتبع السجل الهدف، وأن تغيير الملكية سيحفظ كسجل حوكمة قابل للتتبع.
    </label>
    {error && <p role="alert" className="text-xs text-red-800">{error} — إذا تغيّرت البيانات حدّث القائمة قبل إجراء طلب جديد.</p>}
    <button type="button" className="bg-amber-800 text-white rounded-lg px-4 py-2 disabled:opacity-50 text-xs"
      disabled={loading || !selectedMapping || !target || !confirmed || reason.trim().length < 3 ||
        source.lifecycleState !== 'ACTIVE'} onClick={() => void submit()}>
      {loading ? 'جارٍ تنفيذ المصالحة…' : 'اعتماد نقل هذا المعرّف فقط'}
    </button>
  </section>;
}
