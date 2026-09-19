import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Globe2, Plus, Save, ShieldCheck, Trash2, Undo2 } from 'lucide-react';
import { adminApiClient } from '../api/client';
import { canonicalPickerApi } from '../api/canonicalPickers';
import { CanonicalPicker } from '../components/CanonicalPicker';

interface CampusRow { id: string; sourceReferenceId?: string | null; name: string; }
interface OrganizationRow { id: string; sourceReferenceId?: string | null; name: string; }
interface RequirementRow {
  id?: string;
  internationalTestId: string;
  testVariantId?: string | null;
  testVersionId?: string | null;
  minimumScore?: number | null;
  status: string;
}
interface ProgramRow {
  id?: string;
  organizationUnitId?: string | null;
  sourceReferenceId?: string | null;
  sourceProgramName: string;
  degreeLevelId?: string | null;
  majorId?: string | null;
  majorMappingState: string;
  status: string;
  campusIds: string[];
  admissionRequirements: RequirementRow[];
  metadata?: Record<string, unknown> | null;
}

interface PublicationReadinessIssue { code: string; message: string; field?: string; }
interface PublicationReadiness {
  ready: boolean;
  blockingIssues: PublicationReadinessIssue[];
  warnings: PublicationReadinessIssue[];
}

interface UniversityDetail {
  id: string;
  displayName: string;
  countryReferenceId?: string | null;
  regionReferenceId?: string | null;
  cityReferenceId?: string | null;
  status: string;
  completenessStatus?: string;
  campuses?: CampusRow[];
  organizationUnits?: OrganizationRow[];
  academicPrograms?: ProgramRow[];
}

const blankProgram = (): ProgramRow => ({
  sourceReferenceId: `admin-program-${crypto.randomUUID()}`,
  sourceProgramName: '',
  degreeLevelId: null,
  majorId: null,
  majorMappingState: 'UNMAPPED',
  status: 'DRAFT',
  campusIds: [],
  admissionRequirements: [],
});

export function UniversityRelationshipEditorPage() {
  const { id = '' } = useParams();
  const [university, setUniversity] = useState<UniversityDetail | null>(null);
  const [countryReferenceId, setCountryReferenceId] = useState<string | null>(null);
  const [regionReferenceId, setRegionReferenceId] = useState<string | null>(null);
  const [cityReferenceId, setCityReferenceId] = useState<string | null>(null);
  const [countryIso2, setCountryIso2] = useState('');
  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [readiness, setReadiness] = useState<PublicationReadiness | null>(null);

  const load = async () => {
    const detail = await adminApiClient.request<UniversityDetail>(`/admin/universities/${encodeURIComponent(id)}`);
    setUniversity(detail);
    const readinessResult = await adminApiClient.request<PublicationReadiness>(`/admin/universities/${encodeURIComponent(id)}/publication-readiness`).catch(() => null);
    setReadiness(readinessResult);
    setCountryReferenceId(detail.countryReferenceId ?? null);
    setRegionReferenceId(detail.regionReferenceId ?? null);
    setCityReferenceId(detail.cityReferenceId ?? null);
    setPrograms((detail.academicPrograms ?? []).filter((program) => program.status !== 'ARCHIVED').map((program) => ({ ...program, campusIds: program.campusIds ?? [], admissionRequirements: program.admissionRequirements ?? [] })));
    if (detail.countryReferenceId) {
      const countries = await canonicalPickerApi.countries();
      setCountryIso2(countries.find((item) => item.id === detail.countryReferenceId)?.code ?? '');
    }
  };

  useEffect(() => { load().catch((err) => setError(err instanceof Error ? err.message : 'Unable to load university.')); }, [id]);


  const saveLocation = async (event: FormEvent) => {
    event.preventDefault();
    if (!countryReferenceId) return setError('Country canonical relationship is required.');
    setSaving(true); setError(''); setMessage('');
    try {
      const saved = await adminApiClient.request<UniversityDetail>(`/admin/universities/${encodeURIComponent(id)}`, {
        method: 'PATCH', body: JSON.stringify({ countryReferenceId, regionReferenceId, cityReferenceId }),
      });
      setUniversity(saved); setMessage('Canonical university location saved through the University owner API.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save location.'); }
    finally { setSaving(false); }
  };

  const saveProgram = async (index: number) => {
    const program = programs[index];
    if (!program || !program.sourceProgramName.trim() || !program.degreeLevelId) {
      setError('Every academic program needs a name and canonical Degree Level before saving.');
      return;
    }
    if (program.admissionRequirements.some((requirement) => !requirement.internationalTestId)) {
      setError('Every admission test requirement needs a canonical International Test.');
      return;
    }
    setSaving(true); setError(''); setMessage('');
    try {
      const payload = {
        sourceReferenceId: program.sourceReferenceId || null,
        organizationUnitId: program.organizationUnitId || null,
        sourceProgramName: program.sourceProgramName.trim(),
        degreeLevelId: program.degreeLevelId,
        majorId: program.majorId || null,
        majorMappingState: program.majorId ? 'CANONICALLY_MAPPED' : 'UNMAPPED',
        status: program.status || 'DRAFT',
        campusIds: program.campusIds,
        metadata: program.metadata || null,
        admissionRequirements: program.admissionRequirements.map((requirement) => ({
          internationalTestId: requirement.internationalTestId,
          testVariantId: requirement.testVariantId || null,
          testVersionId: requirement.testVersionId || null,
          minimumScore: requirement.minimumScore ?? null,
          status: requirement.status || 'REVIEW_REQUIRED',
        })),
      };
      const endpoint = program.id
        ? `/admin/universities/${encodeURIComponent(id)}/academic-programs/${encodeURIComponent(program.id)}`
        : `/admin/universities/${encodeURIComponent(id)}/academic-programs`;
      const saved = await adminApiClient.request<UniversityDetail>(endpoint, {
        method: program.id ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });
      setUniversity(saved);
      setPrograms((saved.academicPrograms ?? []).filter((item) => item.status !== 'ARCHIVED').map((item) => ({ ...item, campusIds: item.campusIds ?? [], admissionRequirements: item.admissionRequirements ?? [] })));
      setMessage(program.id ? 'Academic program relationships updated without changing the canonical Program ID.' : 'Academic program created through the University owner API.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save academic program.'); }
    finally { setSaving(false); }
  };

  const archiveProgram = async (index: number) => {
    const program = programs[index];
    if (!program) return;
    if (!program.id) {
      setPrograms((current) => current.filter((_, idx) => idx !== index));
      return;
    }
    setSaving(true); setError(''); setMessage('');
    try {
      const saved = await adminApiClient.request<UniversityDetail>(
        `/admin/universities/${encodeURIComponent(id)}/academic-programs/${encodeURIComponent(program.id)}`,
        { method: 'DELETE' },
      );
      setUniversity(saved);
      setPrograms((saved.academicPrograms ?? []).filter((item) => item.status !== 'ARCHIVED').map((item) => ({ ...item, campusIds: item.campusIds ?? [], admissionRequirements: item.admissionRequirements ?? [] })));
      setMessage('Academic program archived; its canonical ID was preserved for existing relationships.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to archive academic program.'); }
    finally { setSaving(false); }
  };

  const runLifecycleAction = async (action: 'mark-ready' | 'mark-publishable' | 'publish' | 'unpublish') => {
    setSaving(true); setError(''); setMessage('');
    try {
      await adminApiClient.request(`/admin/universities/${encodeURIComponent(id)}/${action}`, { method: 'POST' });
      await load();
      const labels: Record<string, string> = {
        'mark-ready': 'University moved to READY_TO_REVIEW.',
        'mark-publishable': 'University passed the publication gate and is READY_TO_PUBLISH.',
        publish: 'University published. Public country, major and scholarship relationships now read only this published record.',
        unpublish: 'University unpublished and removed from public university/relationship reads.',
      };
      setMessage(labels[action]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to change university publication state.');
    } finally {
      setSaving(false);
    }
  };

  const updateProgram = (index: number, patch: Partial<ProgramRow>) => setPrograms((current) => current.map((program, idx) => idx === index ? { ...program, ...patch } : program));

  if (!university) return <div className="p-6 text-sm text-slate-600">{error || 'Loading university relationships…'}</div>;
  const immutable = university.status === 'PUBLISHED';

  return <div className="mx-auto max-w-6xl space-y-6 font-['Cairo',sans-serif]">
    <div className="flex items-center justify-between gap-3">
      <div><Link to="/universities" className="inline-flex items-center gap-1 text-sm font-bold text-[#0E7C86]"><ArrowLeft className="h-4 w-4" /> Universities</Link><h2 className="mt-2 text-2xl font-black text-[#142B5F]">{university.displayName}</h2><p className="text-sm text-slate-500">Canonical relationship authoring · owner APIs only</p></div>
      <span className="rounded-full bg-[#DDEFF2] px-3 py-1 text-xs font-black text-[#142B5F]">{university.status}</span>
    </div>

    <div className="rounded-2xl border border-[#DDEFF2] bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-black text-[#142B5F]"><ShieldCheck className="h-4 w-4 text-[#0E7C86]" /> Publication lifecycle</div>
          <p className="mt-1 text-xs leading-6 text-[#203442]/65">Publishing is allowed only after completeness and canonical relationship checks pass. Import handoff never auto-publishes.</p>
          {readiness ? <div className="mt-3 text-xs">
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-black ${readiness.ready ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{readiness.ready ? <CheckCircle2 className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}{readiness.ready ? 'Publication gate ready' : `${readiness.blockingIssues.length} blocking issue(s)`}</span>
            {readiness.blockingIssues.length ? <ul className="mt-2 space-y-1 text-amber-800">{readiness.blockingIssues.map((issue) => <li key={`${issue.code}:${issue.field ?? ''}`}>• {issue.code}{issue.field ? ` · ${issue.field}` : ''}</li>)}</ul> : null}
            {readiness.warnings.length ? <ul className="mt-2 space-y-1 text-[#203442]/65">{readiness.warnings.map((issue) => <li key={`${issue.code}:${issue.field ?? ''}`}>• {issue.message}</li>)}</ul> : null}
          </div> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {university.status === 'IMPORTED' && <button type="button" disabled={saving || university.completenessStatus === 'INCOMPLETE'} onClick={() => void runLifecycleAction('mark-ready')} className="inline-flex items-center gap-2 rounded-xl border border-[#21A7B4]/35 bg-[#DDEFF2]/45 px-3 py-2 text-xs font-black text-[#142B5F] disabled:opacity-40"><ShieldCheck className="h-4 w-4" /> Ready to review</button>}
          {university.status === 'READY_TO_REVIEW' && <button type="button" disabled={saving || university.completenessStatus !== 'COMPLETE' || readiness?.ready === false} onClick={() => void runLifecycleAction('mark-publishable')} className="inline-flex items-center gap-2 rounded-xl bg-[#0E7C86] px-3 py-2 text-xs font-black text-white disabled:opacity-40"><CheckCircle2 className="h-4 w-4" /> Ready to publish</button>}
          {university.status === 'READY_TO_PUBLISH' && <button type="button" disabled={saving || readiness?.ready === false} onClick={() => void runLifecycleAction('publish')} className="inline-flex items-center gap-2 rounded-xl bg-[#142B5F] px-3 py-2 text-xs font-black text-white disabled:opacity-40"><Globe2 className="h-4 w-4" /> Publish</button>}
          {university.status === 'PUBLISHED' && <button type="button" disabled={saving} onClick={() => void runLifecycleAction('unpublish')} className="inline-flex items-center gap-2 rounded-xl border border-[#D6A43B]/50 bg-[#FAF7F0] px-3 py-2 text-xs font-black text-[#142B5F] disabled:opacity-40"><Undo2 className="h-4 w-4" /> Unpublish</button>}
        </div>
      </div>
    </div>

    {immutable ? <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Published university structure is immutable. Unpublish before changing canonical relationships.</div> : null}
    {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
    {message ? <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{message}</div> : null}

    <form onSubmit={saveLocation} className="grid gap-4 rounded-2xl border border-[#DDEFF2] bg-white p-5 md:grid-cols-3">
      <CanonicalPicker label="Country" value={countryReferenceId} onChange={(next, option) => { setCountryReferenceId(next); setCountryIso2(option?.code ?? ''); setRegionReferenceId(null); setCityReferenceId(null); }} load={() => canonicalPickerApi.countries()} reloadKey="university-country" />
      <CanonicalPicker label="Region" value={regionReferenceId} onChange={(next) => { setRegionReferenceId(next); setCityReferenceId(null); }} load={() => canonicalPickerApi.regions(countryIso2 || undefined)} reloadKey={`university-regions:${countryIso2}`} optional disabled={!countryReferenceId} />
      <CanonicalPicker label="City" value={cityReferenceId} onChange={(next) => setCityReferenceId(next)} load={() => canonicalPickerApi.cities(countryIso2 || undefined)} reloadKey={`university-cities:${countryIso2}`} optional disabled={!countryReferenceId} />
      <div className="md:col-span-3"><button disabled={saving || immutable || !countryReferenceId} className="inline-flex items-center gap-2 rounded-lg bg-[#0E7C86] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Save className="h-4 w-4" /> Save canonical location</button></div>
    </form>

    <section className="space-y-4 rounded-2xl border border-[#DDEFF2] bg-white p-5">
      <div className="flex items-center justify-between"><div><h3 className="font-bold">Academic programs</h3><p className="text-xs text-slate-500">Program → Degree Level / Major / International Test. Each program is saved independently to preserve its canonical Program ID; remove archives the program instead of hard-deleting it.</p></div><button type="button" disabled={immutable} onClick={() => setPrograms((current) => [...current, blankProgram()])} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm"><Plus className="h-4 w-4" /> Program</button></div>
      {programs.map((program, index) => <div key={program.id ?? program.sourceReferenceId ?? index} className="space-y-4 rounded-xl border border-[#DDEFF2] p-4">
        <div className="flex gap-3"><label className="flex-1 text-xs font-medium">Program name<input value={program.sourceProgramName} onChange={(event) => updateProgram(index, { sourceProgramName: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" /></label><button type="button" title="Save program" disabled={saving || immutable} onClick={() => saveProgram(index)} className="self-end rounded-lg border border-[#21A7B4]/35 p-2 text-[#0E7C86] disabled:opacity-50"><Save className="h-4 w-4" /></button><button type="button" title={program.id ? 'Archive program' : 'Remove unsaved program'} disabled={saving || immutable} onClick={() => archiveProgram(index)} className="self-end rounded-lg border border-red-200 p-2 text-red-600 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button></div>
        <div className="grid gap-3 md:grid-cols-2"><CanonicalPicker label="Degree Level" value={program.degreeLevelId} onChange={(next) => updateProgram(index, { degreeLevelId: next })} load={() => canonicalPickerApi.degreeLevels()} reloadKey="university-degree-levels" /><CanonicalPicker label="Major" value={program.majorId} onChange={(next) => updateProgram(index, { majorId: next, majorMappingState: next ? 'CANONICALLY_MAPPED' : 'UNMAPPED' })} load={() => canonicalPickerApi.majors()} reloadKey="university-majors" optional /></div>
        {(university.campuses ?? []).length ? <fieldset className="rounded-lg border p-3"><legend className="px-1 text-xs font-semibold">Campuses</legend><div className="flex flex-wrap gap-3">{(university.campuses ?? []).map((campus) => <label key={campus.id} className="text-xs"><input type="checkbox" className="mr-1" checked={program.campusIds.includes(campus.id)} onChange={(event) => updateProgram(index, { campusIds: event.target.checked ? [...program.campusIds, campus.id] : program.campusIds.filter((value) => value !== campus.id) })} />{campus.name}</label>)}</div></fieldset> : null}
        <div className="space-y-3"><div className="flex items-center justify-between"><h4 className="text-sm font-semibold">Admission test requirements</h4><button type="button" onClick={() => updateProgram(index, { admissionRequirements: [...program.admissionRequirements, { internationalTestId: '', minimumScore: null, status: 'REVIEW_REQUIRED' }] })} className="text-xs font-bold text-[#0E7C86]">+ Test requirement</button></div>{program.admissionRequirements.map((requirement, requirementIndex) => <div key={requirement.id ?? requirementIndex} className="grid items-end gap-3 rounded-lg bg-slate-50 p-3 md:grid-cols-[1fr_160px_auto]"><CanonicalPicker label="International Test" value={requirement.internationalTestId} onChange={(next) => updateProgram(index, { admissionRequirements: program.admissionRequirements.map((item, idx) => idx === requirementIndex ? { ...item, internationalTestId: next ?? '' } : item) })} load={() => canonicalPickerApi.tests()} reloadKey="university-tests" /><label className="text-xs font-medium">Minimum score<input type="number" step="0.01" value={requirement.minimumScore ?? ''} onChange={(event) => updateProgram(index, { admissionRequirements: program.admissionRequirements.map((item, idx) => idx === requirementIndex ? { ...item, minimumScore: event.target.value === '' ? null : Number(event.target.value) } : item) })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" /></label><button type="button" onClick={() => updateProgram(index, { admissionRequirements: program.admissionRequirements.filter((_, idx) => idx !== requirementIndex) })} className="rounded-lg border border-red-200 p-2 text-red-600"><Trash2 className="h-4 w-4" /></button></div>)}</div>
      </div>)}
    </section>
  </div>;
}
