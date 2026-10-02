import { useRef, useState, useEffect } from 'react';
import { adminApiClient } from '../api/client';
import { canonicalPickerApi } from '../api/canonicalPickers';
import { CanonicalPicker } from './CanonicalPicker';

type Kind = 'COUNTRY' | 'LANGUAGE' | 'TAXONOMY' | 'DEGREE';
const kinds: Kind[] = ['COUNTRY', 'LANGUAGE', 'TAXONOMY', 'DEGREE'];
const mappingTypes = ['PRIMARY', 'SECONDARY', 'RELATED', 'LEGACY'] as const;

export function ReviewedGraphEditor({ ownerId, ownerStatus, domain, profiles = [], onSaved, isRtl = true }: {
  ownerId: string; ownerStatus: string; domain: 'MAJOR' | 'TEST';
  profiles?: Array<{ id?: string; displayName?: string; level?: string }>;
  onSaved: () => void | Promise<void>; isRtl?: boolean;
}) {
  const [kind, setKind] = useState<Kind>('TAXONOMY');
  const [query, setQuery] = useState('');
  const [referenceId, setReferenceId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState('');
  const [relationshipType, setRelationshipType] = useState('PRIMARY');
  const [reason, setReason] = useState('');
  const [evidenceReference, setEvidenceReference] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const generation = useRef(0);
  useEffect(() => {
    generation.current += 1;
    setReferenceId(null); setProfileId(''); setReason(''); setEvidenceReference('');
    setMessage(''); setError(''); setSaving(false);
    return () => { generation.current += 1; };
  }, [ownerId]);
  const immutable = ['PUBLISHED', 'ARCHIVED', 'SUPERSEDED', 'REJECTED', 'MERGED'].includes(ownerStatus) || ownerId.startsWith('cat-');
  const loadOptions = async () => {
    const options = kind === 'COUNTRY' ? await canonicalPickerApi.countries(query)
      : kind === 'LANGUAGE' ? await canonicalPickerApi.languages(query)
      : kind === 'DEGREE' ? await canonicalPickerApi.degreeLevels()
      : await canonicalPickerApi.taxonomyNodes(undefined, query);
    return options.filter(option => option.lifecycle === 'ACTIVE');
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!referenceId || immutable || saving || !reason.trim() || !evidenceReference.trim()) return;
    const current = generation.current;
    setSaving(true); setError(''); setMessage('');
    try {
      const review = { relationshipType, reason: reason.trim(), evidenceReference: evidenceReference.trim() };
      await adminApiClient.request(domain === 'MAJOR'
        ? `/admin/majors/${encodeURIComponent(ownerId)}/classification-mappings`
        : `/admin/international-tests/${encodeURIComponent(ownerId)}/canonical-relationships`, {
        method: 'POST', body: JSON.stringify(domain === 'MAJOR'
          ? { taxonomyNodeId: referenceId, ...(profileId ? { profileId } : {}), ...review }
          : { kind, referenceId, ...review }),
      });
      if (current !== generation.current) return;
      setReferenceId(null);
      setMessage(isRtl ? 'حُفظ الرابط؛ لم تُغيّر حالة النشر.' : 'Relationship saved; publication status preserved.');
      await onSaved();
    } catch (failure) {
      if (current === generation.current) setError(failure instanceof Error ? failure.message : 'Unable to save relationship');
    } finally {
      if (current === generation.current) setSaving(false);
    }
  };
  return <form onSubmit={save} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
    <h3 className="font-bold">{isRtl ? 'إضافة رابط معياري بعد المراجعة' : 'Add reviewed canonical relationship'}</h3>
    {immutable ? <p className="text-sm text-amber-700">{isRtl ? 'هذا السجل للقراءة فقط في حالته الحالية.' : 'This record is read only in its current state.'}</p> : null}
    <fieldset disabled={saving || immutable} className="space-y-3">
      {domain === 'TEST' ? <label className="block text-sm">{isRtl ? 'نوع السجل' : 'Reference kind'}
        <select value={kind} onChange={event => { setKind(event.target.value as Kind); setReferenceId(null); setQuery(''); }} className="block w-full rounded border p-2">
          {kinds.map(value => <option key={value} value={value}>{value}</option>)}
        </select>
      </label> : <label className="block text-sm">{isRtl ? 'مالك الرابط' : 'Relationship owner'}
        <select value={profileId} onChange={event => setProfileId(event.target.value)} className="block w-full rounded border p-2">
          <option value="">{isRtl ? 'التخصص الرئيسي' : 'Major root'}</option>
          {profiles.filter(profile => profile.id).map(profile => <option key={profile.id} value={profile.id}>{profile.displayName || profile.level || profile.id}</option>)}
        </select>
      </label>}
      <label className="block text-sm">{isRtl ? 'بحث السجل المعياري' : 'Search canonical records'}
        <input value={query} maxLength={200} onChange={event => { setQuery(event.target.value); setReferenceId(null); }} className="block w-full rounded border p-2" />
      </label>
      <CanonicalPicker label={isRtl ? 'السجل المعياري النشط' : 'Active canonical record'} value={referenceId} onChange={setReferenceId} load={loadOptions} reloadKey={`${ownerId}:${kind}:${query}`} disabled={saving || immutable} />
      <label className="block text-sm">{isRtl ? 'نوع العلاقة' : 'Relationship type'}
        {domain === 'MAJOR' ? <select value={relationshipType} onChange={event => setRelationshipType(event.target.value)} className="block w-full rounded border p-2">
          {mappingTypes.map(value => <option key={value} value={value}>{value}</option>)}
        </select> : <input required value={relationshipType} maxLength={120} onChange={event => setRelationshipType(event.target.value)} className="block w-full rounded border p-2" />}
      </label>
      <label className="block text-sm">{isRtl ? 'سبب المراجعة' : 'Review reason'}<textarea required maxLength={2000} value={reason} onChange={event => setReason(event.target.value)} className="block w-full rounded border p-2" /></label>
      <label className="block text-sm">{isRtl ? 'مرجع الدليل' : 'Evidence reference'}<input required maxLength={500} value={evidenceReference} onChange={event => setEvidenceReference(event.target.value)} className="block w-full rounded border p-2" /></label>
      <button type="submit" disabled={!referenceId || !relationshipType.trim() || !reason.trim() || !evidenceReference.trim()} className="rounded bg-blue-900 px-4 py-2 text-white disabled:opacity-50">{isRtl ? 'حفظ الرابط' : 'Save relationship'}</button>
    </fieldset>
    {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
    {message ? <p role="status" className="text-sm text-emerald-700">{message}</p> : null}
  </form>;
}
