
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type {
  GovernedReferenceEntityType,
  ReferenceAliasInput,
  ReferenceProviderMappingInput,
  ReferenceGovernanceDetails,
  ReferenceVersionDto,
  ReferenceRelationshipDto,
  ReferenceDependencyImpact,
} from '@manaratak/domain';
import { referenceDataAdminApi } from '../api/referenceData';

type GovernedRow = {
  id: string;
  versionNumber: number;
  lifecycleState: string;
  name?: string;
  [key: string]: any;
};

const ALIAS_TYPES = ['COMMON', 'HISTORIC', 'PROVIDER', 'TRANSLITERATION', 'OTHER'] as const;

/** Inspector is loaded on demand: no unbounded alias/mapping fetch for every table row. */
export function ReferenceGovernanceButton({
  entityType, record, onChanged,
}: {
  entityType: GovernedReferenceEntityType;
  record: GovernedRow;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="text-teal-700 underline text-xs ms-3"
        onClick={() => setOpen(true)}>الحوكمة / Governance</button>
      {open && createPortal(
        <GovernanceDialog entityType={entityType} record={record}
          onChanged={() => { onChanged(); setOpen(false); }} onClose={() => setOpen(false)} />,
        document.body,
      )}
    </>
  );
}

function GovernanceDialog({ entityType, record, onClose, onChanged }: {
  entityType: GovernedReferenceEntityType;
  record: GovernedRow;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<ReferenceGovernanceDetails | null>(null);
  const [history, setHistory] = useState<ReferenceVersionDto[]>([]);
  const [relationships, setRelationships] = useState<ReferenceRelationshipDto[]>([]);
  const [impact, setImpact] = useState<ReferenceDependencyImpact | null>(null);
  const [aliases, setAliases] = useState<ReferenceAliasInput[]>([]);
  const [mappings, setMappings] = useState<ReferenceProviderMappingInput[]>([]);
  const [reason, setReason] = useState('');

  useEffect(() => {
    let live = true;
    Promise.all([
      referenceDataAdminApi.governanceDetails(entityType, record.id),
      referenceDataAdminApi.governanceHistory(entityType, record.id),
      referenceDataAdminApi.governanceRelationships(entityType, record.id),
      referenceDataAdminApi.governanceImpact(entityType, record.id),
    ]).then(([d, h, r, i]) => {
      if (!live) return;
      setDetails(d.data);
      setAliases(d.data.aliases.map(alias => ({ ...alias })));
      setMappings(d.data.providerMappings.map(mapping => ({ ...mapping })));
      setHistory(h.data);
      setRelationships(r.data);
      setImpact(i.data);
    }).catch((err: unknown) => {
      if (live) setError(err instanceof Error ? err.message : 'تعذر تحميل سجل الحوكمة');
    }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [entityType, record.id]);

  const save = async () => {
    if (!details || !Number.isInteger(record.versionNumber)) return;
    const cleanAliases = aliases.map(a => ({
      alias: a.alias.trim(), locale: a.locale?.trim() || null,
      aliasType: a.aliasType || 'COMMON' as const,
    }));
    const cleanMappings = mappings.map(m => ({
      providerSystem: m.providerSystem.trim(), providerId: m.providerId.trim(),
    }));
    if (cleanAliases.some(a => !a.alias) ||
        cleanMappings.some(m => !m.providerSystem || !m.providerId)) {
      setError('الأسماء البديلة أو ربط المزود لا يمكن أن تكون فارغة.');
      return;
    }
    if (new Set(cleanAliases.map(a => [a.alias.normalize('NFKC').toLowerCase(), a.locale || ''].join('|'))).size !== cleanAliases.length ||
        new Set(cleanMappings.map(m => [m.providerSystem.toLowerCase(), m.providerId.toLowerCase()].join('|'))).size !== cleanMappings.length) {
      setError('هناك أسماء بديلة أو معرفات مزود مكررة داخل السجل.');
      return;
    }
    setError(null); setSaving(true);
    try {
      const common = { id: record.id, expectedVersion: record.versionNumber,
        name: record.name, nameAr: record.nameAr ?? null, aliases: cleanAliases,
        metadata: record.metadata };
      switch (entityType) {
        case 'COUNTRY':
          await referenceDataAdminApi.saveCountry({ ...common,
            iso2Code: record.iso2Code, iso3Code: record.iso3Code,
            officialName: record.officialName ?? null, region: record.region ?? null,
            subregion: record.subregion ?? null,
            defaultCurrencyCode: record.defaultCurrencyCode ?? null,
            defaultLanguageCode: record.defaultLanguageCode ?? null,
            callingCode: record.callingCode ?? null, flagAssetId: record.flagAssetId ?? null,
            providerMappings: cleanMappings,
          });
          break;
        case 'CURRENCY':
          await referenceDataAdminApi.saveCurrency({ ...common,
            isoCode: record.isoCode, numericCode: record.numericCode ?? null,
            symbol: record.symbol ?? null, minorUnit: record.minorUnit ?? null,
            providerMappings: cleanMappings,
          });
          break;
        case 'LANGUAGE':
          await referenceDataAdminApi.saveLanguage({ ...common,
            isoCode: record.isoCode, nativeName: record.nativeName ?? null,
            direction: record.direction, providerMappings: cleanMappings,
          });
          break;
        case 'CITY':
          await referenceDataAdminApi.saveCity({ ...common,
            countryIso2Code: record.countryIso2Code,
            region: record.region ?? null, timezone: record.timezone ?? null,
            latitude: record.latitude ?? null, longitude: record.longitude ?? null,
            administrativeRegionId: record.administrativeRegionId ?? null,
            providerMappings: cleanMappings,
          });
          break;
        case 'REGION':
          await referenceDataAdminApi.saveRegion({
            id: record.id, expectedVersion: record.versionNumber,
            countryIso2Code: record.countryIso2Code, regionCode: record.regionCode,
            name: record.name, nameAr: record.nameAr ?? null,
            localName: record.localName ?? null, regionType: record.regionType ?? null,
            aliases: cleanAliases,
          });
          break;
      }
      onChanged();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'تعذر حفظ الحوكمة، حدث السجل ثم أعد المحاولة.');
    } finally { setSaving(false); }
  };

  const deprecate = async () => {
    if (reason.trim().length < 3) { setError('أدخل سببًا واضحًا، ثلاثة أحرف على الأقل.'); return; }
    setSaving(true); setError(null);
    try {
      await referenceDataAdminApi.transitionReference(entityType, record.id, {
        expectedVersion: record.versionNumber, toState: 'DEPRECATED' as any, reason: reason.trim(),
      });
      onChanged();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'تعذر تغيير دورة الحياة');
    } finally { setSaving(false); }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Reference governance" dir="rtl"
      className="fixed inset-0 z-[100] bg-black/50 flex items-start justify-center overflow-y-auto p-4 md:p-8">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl p-6 space-y-5">
        <div className="flex justify-between gap-3 items-start">
          <div><h3 className="font-black text-lg">حوكمة {entityType}: {record.name || record.id}</h3>
            <p className="text-xs font-mono" dir="ltr">{record.id} · v{record.versionNumber} · {record.lifecycleState}</p>
          </div>
          <button type="button" className="border rounded-lg px-3 py-2" onClick={onClose}>إغلاق ×</button>
        </div>
        {loading && <p role="status">جارٍ جلب الأسماء البديلة والربط والسجل التاريخي…</p>}
        {error && <p role="alert" className="border border-red-200 bg-red-50 text-red-800 p-3 rounded-lg">{error}</p>}
        {details && !loading && <>
          <section className="space-y-3">
            <div className="flex justify-between"><h4 className="font-bold">الأسماء البديلة</h4>
              <button type="button" disabled={saving || record.lifecycleState !== 'ACTIVE' || aliases.length >= 100}
                className="text-indigo-700 underline" onClick={() => setAliases([...aliases, { alias: '', aliasType: 'COMMON', locale: null }])}>+ إضافة</button></div>
            {aliases.map((a, i) => <div key={i} className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_auto] gap-2">
              <input className="border rounded-lg p-2" aria-label="اسم بديل" value={a.alias}
                disabled={saving} onChange={e => setAliases(aliases.map((v, j) => j === i ? { ...v, alias: e.target.value } : v))} />
              <input className="border rounded-lg p-2" aria-label="Locale (optional)" value={a.locale ?? ''}
                disabled={saving} placeholder="ar, en…" onChange={e => setAliases(aliases.map((v, j) => j === i ? { ...v, locale: e.target.value } : v))} />
              <select className="border rounded-lg p-2" value={a.aliasType || 'COMMON'} disabled={saving}
                onChange={e => setAliases(aliases.map((v, j) => j === i ? { ...v, aliasType: e.target.value as ReferenceAliasInput['aliasType'] } : v))}>
                {ALIAS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <button type="button" disabled={saving} className="text-red-700 px-2" onClick={() => setAliases(aliases.filter((_, j) => i !== j))}>حذف</button>
            </div>)}
            {details.ambiguousAliases.length > 0 && <div role="alert" className="bg-amber-50 border border-amber-200 text-amber-900 p-3 text-sm">
              {details.ambiguousAliases.length} اسمًا بديلًا متطابقًا مع سجلات أخرى. القرار يحتاج مراجعة؛ لا توجد مطابقة تلقائية.
            </div>}
          </section>
          {entityType !== 'REGION' && <section className="space-y-3">
            <div className="flex justify-between"><h4 className="font-bold">ربط معرفات المزود / Provider mappings</h4>
              <button type="button" disabled={saving || record.lifecycleState !== 'ACTIVE' || mappings.length >= 100}
                className="text-indigo-700 underline" onClick={() => setMappings([...mappings, { providerSystem: '', providerId: '' }])}>+ إضافة</button></div>
            {mappings.map((m, i) => <div key={i} className="flex flex-wrap gap-2">
              <input className="border rounded-lg p-2 flex-1" aria-label="المزود" value={m.providerSystem}
                disabled={saving} onChange={e => setMappings(mappings.map((v, j) => i === j ? { ...v, providerSystem: e.target.value } : v))} />
              <input className="border rounded-lg p-2 flex-1" aria-label="معرّف المزود" value={m.providerId}
                disabled={saving} onChange={e => setMappings(mappings.map((v, j) => i === j ? { ...v, providerId: e.target.value } : v))} />
              <button type="button" disabled={saving} className="text-red-700" onClick={() => setMappings(mappings.filter((_, j) => i !== j))}>حذف</button>
            </div>)}
            <p className="text-xs text-amber-800">نقل المعرّف من سجل Canonical آخر محظور؛ يتطلب مسار مصالحة معتمد.</p>
          </section>}
          <button type="button" onClick={() => void save()} disabled={saving || record.lifecycleState !== 'ACTIVE'}
            className="bg-indigo-700 text-white rounded-lg px-4 py-2 disabled:opacity-50">حفظ الأسماء والربط (مع سجل تدقيق)</button>
          <section className="border-t pt-4 space-y-2">
            <h4 className="font-bold">الإصدارات السابقة / History ({history.length})</h4>
            <div className="max-h-40 overflow-auto">
              {history.map(h => <p key={h.id} className="text-xs border-b py-1">
                v{h.versionNumber} · {h.lifecycleState} · {String(h.effectiveFrom)} → {h.effectiveTo ? String(h.effectiveTo) : 'current'}
                {' · '}{h.changeReason ?? '-'} · actor {h.actorId ?? 'unknown'}
              </p>)}
            </div>
            <h4 className="font-bold">علاقات الاستبدال / Relationships ({relationships.length})</h4>
            {relationships.map(r => <p key={r.id} className="text-xs border-b py-1 font-mono" dir="ltr">
              {r.relationshipType}: {r.sourceReferenceId} → {r.targetReferenceId}
            </p>)}
          </section>
          <section className="border-t pt-4 space-y-2">
            <h4 className="font-bold">دورة حياة السجل</h4>
            {impact && <div className="border border-slate-200 rounded-xl p-3 text-xs space-y-2">
              <p className="font-bold">الروابط الموثقة من قاعدة البيانات: {impact.knownTotal} (تغطية جزئية فقط)</p>
              <div className="flex gap-2 flex-wrap">{Object.entries(impact.knownRelationCounts).map(([relation, count]) =>
                <span className="border rounded-lg px-2 py-1" key={relation}>{relation}: {count}</span>)}</div>
            </div>}
            <p className="text-xs text-amber-800">الاعتماديات غير المباشرة أو غير المربوطة بـFK: unknown.
              الأرشفة والدمج والاستبدال محظورة من هذه الشاشة حتى استكمال تغطية الاستهلاك وموافقات الحوكمة.</p>
            {record.lifecycleState === 'ACTIVE' && <div className="flex gap-2 items-center flex-wrap">
              <input value={reason} onChange={e => setReason(e.target.value)}
                className="border rounded-lg p-2 flex-1" placeholder="سبب إيقاف الاختيار الجديد (مطلوب)" />
              <button type="button" className="border border-amber-500 text-amber-800 p-2 rounded-lg"
                disabled={saving || reason.trim().length < 3} onClick={() => void deprecate()}>DEPRECATED — منع الاختيار الجديد</button>
            </div>}
          </section>
        </>}
      </div>
    </div>
  );
}

export function CityCountryQuality({ countryIso2Code }: { countryIso2Code: string }) {
  const [status, setStatus] = useState<'loading' | 'ok' | 'error' | 'idle'>('idle');
  const [data, setData] = useState<Awaited<ReturnType<typeof referenceDataAdminApi.cityQuality>>['data'] | null>(null);
  useEffect(() => {
    if (!/^[A-Z]{2}$/.test(countryIso2Code)) { setStatus('idle'); setData(null); return; }
    let live = true;
    setStatus('loading'); setData(null);
    referenceDataAdminApi.cityQuality(countryIso2Code).then(r => {
      if (live) { setData(r.data); setStatus('ok'); }
    }).catch(() => { if (live) setStatus('error'); });
    return () => { live = false; };
  }, [countryIso2Code]);
  if (status === 'idle') return <p className="text-xs text-gray-500">أدخل رمز الدولة (ISO2) لعرض مؤشرات جودة المدن بحسب الدولة.</p>;
  if (status === 'loading') return <p role="status">جارٍ حساب مؤشرات الدولة…</p>;
  if (status === 'error' || !data) return <p role="alert" className="text-red-700">مؤشرات هذه الدولة غير متاحة (unknown).</p>;
  return <div className="p-3 bg-slate-50 rounded-lg text-sm flex flex-wrap gap-4" aria-label="City quality by country">
    <span>المدن: {data.total} (نشطة: {data.active})</span>
    <span>بلا منطقة إدارية معتمدة: {data.withoutAdministrativeRegion}</span>
    <span>بلا منطقة زمنية: {data.withoutTimezone}</span>
    <span>بلا معرّف هوية قياسي: {data.withoutCanonicalIdentity}</span>
  </div>;
}
