import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
import { adminApiClient } from '../api/client';
import { canonicalPickerApi } from '../api/canonicalPickers';
import { CanonicalPicker } from '../components/CanonicalPicker';

type JsonObject = Record<string, unknown>;
interface BenefitRow { benefitKey: string; benefitTypeCode: string; coverageTypeCode?: string | null; amount?: string | number | null; currencyReferenceId?: string | null; valueText?: string | null; durationText?: string | null; frequencyCode?: string | null; isCovered?: boolean; isOptional?: boolean; displayOrder?: number; notes?: string | null; metadata?: JsonObject | null; }
interface DegreeRow { targetKey: string; sourceLabel?: string | null; degreeLevelId?: string | null; metadata?: JsonObject | null; }
interface MajorRow { targetKey: string; sourceLabel?: string | null; majorId?: string | null; metadata?: JsonObject | null; }
interface EligibilityRow { itemKey: string; itemTypeCode: string; operatorCode?: string | null; valueText?: string | null; minimumValue?: string | number | null; maximumValue?: string | number | null; countryReferenceId?: string | null; degreeLevelId?: string | null; majorId?: string | null; internationalTestId?: string | null; isRequired?: boolean; priorityOrder?: number; metadata?: JsonObject | null; }
interface DocumentRow { documentKey: string; documentTypeCode?: string | null; displayName: string; description?: string | null; internationalTestId?: string | null; sourceLabel?: string | null; isRequired?: boolean; displayOrder?: number; metadata?: JsonObject | null; }
interface UniversityLinkRow { linkKey: string; universityId?: string | null; academicProgramId?: string | null; sourceLabel?: string | null; relationshipTypeCode?: string; metadata?: JsonObject | null; }
interface ScholarshipDetail {
  id: string; displayName: string; status: string; publicationStatus?: string;
  countryReferenceId?: string | null; studyLanguageReferenceId?: string | null;
  benefits?: BenefitRow[]; degreeTargets?: DegreeRow[]; majorTargets?: MajorRow[];
  eligibilityItems?: EligibilityRow[]; requiredDocumentItems?: DocumentRow[]; universityLinks?: UniversityLinkRow[];
}
const key = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

export function ScholarshipRelationshipEditorPage() {
  const { id = '' } = useParams();
  const [scholarship, setScholarship] = useState<ScholarshipDetail | null>(null);
  const [countryReferenceId, setCountryReferenceId] = useState<string | null>(null);
  const [studyLanguageReferenceId, setStudyLanguageReferenceId] = useState<string | null>(null);
  const [benefits, setBenefits] = useState<BenefitRow[]>([]);
  const [degreeTargets, setDegreeTargets] = useState<DegreeRow[]>([]);
  const [majorTargets, setMajorTargets] = useState<MajorRow[]>([]);
  const [eligibilityItems, setEligibilityItems] = useState<EligibilityRow[]>([]);
  const [requiredDocumentItems, setRequiredDocumentItems] = useState<DocumentRow[]>([]);
  const [universityLinks, setUniversityLinks] = useState<UniversityLinkRow[]>([]);
  const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const [message, setMessage] = useState('');

  const hydrate = (detail: ScholarshipDetail) => {
    setScholarship(detail); setCountryReferenceId(detail.countryReferenceId ?? null); setStudyLanguageReferenceId(detail.studyLanguageReferenceId ?? null);
    setBenefits(detail.benefits ?? []); setDegreeTargets(detail.degreeTargets ?? []); setMajorTargets(detail.majorTargets ?? []); setEligibilityItems(detail.eligibilityItems ?? []); setRequiredDocumentItems(detail.requiredDocumentItems ?? []); setUniversityLinks(detail.universityLinks ?? []);
  };
  const load = async () => hydrate(await adminApiClient.request<ScholarshipDetail>(`/admin/scholarships/${encodeURIComponent(id)}`));
  useEffect(() => { load().catch((err) => setError(err instanceof Error ? err.message : 'Unable to load scholarship relationships.')); }, [id]);

  const save = async () => {
    setSaving(true); setError(''); setMessage('');
    try {
      const saved = await adminApiClient.request<ScholarshipDetail>(`/admin/scholarships/${encodeURIComponent(id)}/canonical-relationships`, {
        method: 'PUT', body: JSON.stringify({ countryReferenceId, studyLanguageReferenceId, benefits, degreeTargets, majorTargets, eligibilityItems, requiredDocumentItems, universityLinks }),
      });
      hydrate(saved); setMessage('Canonical scholarship relationships saved through the Scholarship owner API.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save scholarship relationships.'); }
    finally { setSaving(false); }
  };

  if (!scholarship) return <div className="p-6 text-sm text-slate-600">{error || 'Loading scholarship relationships…'}</div>;
  const immutable = scholarship.publicationStatus === 'PUBLISHED';

  return <div className="mx-auto max-w-6xl space-y-6 font-['Cairo',sans-serif] text-[#203442]">
    <div className="flex items-center justify-between gap-4"><div><Link to={`/scholarships/${id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-[#0E7C86]"><ArrowLeft className="h-4 w-4" /> Scholarship</Link><h2 className="mt-2 text-2xl font-bold">{scholarship.displayName}</h2><p className="text-sm text-[#203442]/65">Canonical relationship authoring · P12 owner API</p></div><span className="rounded-full bg-[#DDEFF2]/60 text-[#142B5F] px-3 py-1 text-xs font-semibold">{scholarship.status}</span></div>
    {immutable ? <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Published scholarship structure is immutable. Unpublish before changing relationships.</div> : null}
    {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}{message ? <div className="rounded-lg border border-[#21A7B4]/30 bg-[#DDEFF2]/45 p-3 text-sm text-[#0E7C86]">{message}</div> : null}

    <section className="grid gap-4 rounded-2xl border border-[#DDEFF2] bg-white p-5 md:grid-cols-2"><CanonicalPicker label="Study country" value={countryReferenceId} onChange={(next) => setCountryReferenceId(next)} load={() => canonicalPickerApi.countries()} reloadKey="scholarship-countries" optional /><CanonicalPicker label="Study language" value={studyLanguageReferenceId} onChange={(next) => setStudyLanguageReferenceId(next)} load={() => canonicalPickerApi.languages()} reloadKey="scholarship-languages" optional /></section>

    <EditorSection title="Degree targets" onAdd={() => setDegreeTargets((rows) => [...rows, { targetKey: key('degree'), sourceLabel: '', degreeLevelId: null }])}>{degreeTargets.map((row, index) => <Row key={row.targetKey} onDelete={() => setDegreeTargets((rows) => rows.filter((_, i) => i !== index))}><CanonicalPicker label="Canonical degree" value={row.degreeLevelId} onChange={(next, option) => setDegreeTargets((rows) => rows.map((item, i) => i === index ? { ...item, degreeLevelId: next, sourceLabel: option?.label ?? item.sourceLabel } : item))} load={() => canonicalPickerApi.degreeLevels()} reloadKey="scholarship-degrees" optional /><SourceLabel value={row.sourceLabel ?? ''} onChange={(value) => setDegreeTargets((rows) => rows.map((item, i) => i === index ? { ...item, sourceLabel: value } : item))} /></Row>)}</EditorSection>

    <EditorSection title="Major targets" onAdd={() => setMajorTargets((rows) => [...rows, { targetKey: key('major'), sourceLabel: '', majorId: null }])}>{majorTargets.map((row, index) => <Row key={row.targetKey} onDelete={() => setMajorTargets((rows) => rows.filter((_, i) => i !== index))}><CanonicalPicker label="Canonical major" value={row.majorId} onChange={(next, option) => setMajorTargets((rows) => rows.map((item, i) => i === index ? { ...item, majorId: next, sourceLabel: option?.label ?? item.sourceLabel } : item))} load={() => canonicalPickerApi.majors()} reloadKey="scholarship-majors" optional /><SourceLabel value={row.sourceLabel ?? ''} onChange={(value) => setMajorTargets((rows) => rows.map((item, i) => i === index ? { ...item, sourceLabel: value } : item))} /></Row>)}</EditorSection>

    <EditorSection title="Benefits → currency" onAdd={() => setBenefits((rows) => [...rows, { benefitKey: key('benefit'), benefitTypeCode: 'OTHER', isCovered: true, currencyReferenceId: null }])}>{benefits.map((row, index) => <Row key={row.benefitKey} onDelete={() => setBenefits((rows) => rows.filter((_, i) => i !== index))}><label className="text-xs font-medium">Benefit type<input className="mt-1 w-full rounded-lg border border-[#DDEFF2] bg-white px-3 py-2 text-sm outline-none focus:border-[#21A7B4] focus:ring-2 focus:ring-[#21A7B4]/15" value={row.benefitTypeCode} onChange={(event) => setBenefits((rows) => rows.map((item, i) => i === index ? { ...item, benefitTypeCode: event.target.value } : item))} /></label><CanonicalPicker label="Canonical currency" value={row.currencyReferenceId} onChange={(next) => setBenefits((rows) => rows.map((item, i) => i === index ? { ...item, currencyReferenceId: next } : item))} load={() => canonicalPickerApi.currencies()} reloadKey="scholarship-currencies" optional /></Row>)}</EditorSection>

    <EditorSection title="Eligibility canonical relationships" onAdd={() => setEligibilityItems((rows) => [...rows, { itemKey: key('eligibility'), itemTypeCode: 'OTHER', isRequired: true }])}>{eligibilityItems.map((row, index) => <Row key={row.itemKey} onDelete={() => setEligibilityItems((rows) => rows.filter((_, i) => i !== index))} wide><label className="text-xs font-medium">Eligibility type<input className="mt-1 w-full rounded-lg border border-[#DDEFF2] bg-white px-3 py-2 text-sm outline-none focus:border-[#21A7B4] focus:ring-2 focus:ring-[#21A7B4]/15" value={row.itemTypeCode} onChange={(event) => setEligibilityItems((rows) => rows.map((item, i) => i === index ? { ...item, itemTypeCode: event.target.value } : item))} /></label><CanonicalPicker label="Country" value={row.countryReferenceId} onChange={(next) => setEligibilityItems((rows) => rows.map((item, i) => i === index ? { ...item, countryReferenceId: next } : item))} load={() => canonicalPickerApi.countries()} reloadKey="eligibility-countries" optional /><CanonicalPicker label="Degree" value={row.degreeLevelId} onChange={(next) => setEligibilityItems((rows) => rows.map((item, i) => i === index ? { ...item, degreeLevelId: next } : item))} load={() => canonicalPickerApi.degreeLevels()} reloadKey="eligibility-degrees" optional /><CanonicalPicker label="Major" value={row.majorId} onChange={(next) => setEligibilityItems((rows) => rows.map((item, i) => i === index ? { ...item, majorId: next } : item))} load={() => canonicalPickerApi.majors()} reloadKey="eligibility-majors" optional /><CanonicalPicker label="International test" value={row.internationalTestId} onChange={(next) => setEligibilityItems((rows) => rows.map((item, i) => i === index ? { ...item, internationalTestId: next } : item))} load={() => canonicalPickerApi.tests()} reloadKey="eligibility-tests" optional /></Row>)}</EditorSection>

    <EditorSection title="Required documents → international test" onAdd={() => setRequiredDocumentItems((rows) => [...rows, { documentKey: key('document'), displayName: 'Required document', isRequired: true }])}>{requiredDocumentItems.map((row, index) => <Row key={row.documentKey} onDelete={() => setRequiredDocumentItems((rows) => rows.filter((_, i) => i !== index))}><label className="text-xs font-medium">Document<input className="mt-1 w-full rounded-lg border border-[#DDEFF2] bg-white px-3 py-2 text-sm outline-none focus:border-[#21A7B4] focus:ring-2 focus:ring-[#21A7B4]/15" value={row.displayName} onChange={(event) => setRequiredDocumentItems((rows) => rows.map((item, i) => i === index ? { ...item, displayName: event.target.value } : item))} /></label><CanonicalPicker label="International test" value={row.internationalTestId} onChange={(next, option) => setRequiredDocumentItems((rows) => rows.map((item, i) => i === index ? { ...item, internationalTestId: next, sourceLabel: option?.label ?? item.sourceLabel } : item))} load={() => canonicalPickerApi.tests()} reloadKey="document-tests" optional /></Row>)}</EditorSection>

    <EditorSection title="University / academic-program links" onAdd={() => setUniversityLinks((rows) => [...rows, { linkKey: key('university'), universityId: null, academicProgramId: null, relationshipTypeCode: 'ELIGIBLE' }])}>{universityLinks.map((row, index) => <Row key={row.linkKey} onDelete={() => setUniversityLinks((rows) => rows.filter((_, i) => i !== index))}><CanonicalPicker label="University" value={row.universityId} onChange={(next, option) => setUniversityLinks((rows) => rows.map((item, i) => i === index ? { ...item, universityId: next, academicProgramId: null, sourceLabel: option?.label ?? item.sourceLabel } : item))} load={() => canonicalPickerApi.universities()} reloadKey="scholarship-universities" optional /><CanonicalPicker label="Academic program" value={row.academicProgramId} onChange={(next) => setUniversityLinks((rows) => rows.map((item, i) => i === index ? { ...item, academicProgramId: next } : item))} load={() => canonicalPickerApi.programs(row.universityId ?? '')} reloadKey={`scholarship-programs:${row.universityId ?? ''}`} optional disabled={!row.universityId} /></Row>)}</EditorSection>

    <div className="sticky bottom-4 flex justify-end"><button onClick={save} disabled={saving || immutable} className="inline-flex items-center gap-2 rounded-xl bg-[#0E7C86] px-5 py-3 text-sm font-bold text-white shadow-lg transition-colors hover:bg-[#142B5F] disabled:opacity-50"><Save className="h-4 w-4" /> Save all canonical relationships</button></div>
  </div>;
}

function EditorSection({ title, onAdd, children }: { title: string; onAdd: () => void; children: React.ReactNode }) { return <section className="space-y-3 rounded-2xl border border-[#DDEFF2] bg-white p-5"><div className="flex items-center justify-between"><h3 className="font-bold">{title}</h3><button type="button" onClick={onAdd} className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs"><Plus className="h-3.5 w-3.5" /> Add</button></div>{children}</section>; }
function Row({ onDelete, children, wide = false }: { onDelete: () => void; children: React.ReactNode; wide?: boolean }) { return <div className={`grid items-end gap-3 rounded-xl border border-[#DDEFF2] bg-[#FAF7F0]/35 p-3 ${wide ? 'md:grid-cols-5' : 'md:grid-cols-[1fr_1fr_auto]'}`}>{children}<button type="button" onClick={onDelete} className="rounded-lg border border-red-200 p-2 text-red-600" title="Delete relationship"><Trash2 className="h-4 w-4" /></button></div>; }
function SourceLabel({ value, onChange }: { value: string; onChange: (value: string) => void }) { return <label className="text-xs font-medium">Source label<input className="mt-1 w-full rounded-lg border border-[#DDEFF2] bg-white px-3 py-2 text-sm outline-none focus:border-[#21A7B4] focus:ring-2 focus:ring-[#21A7B4]/15" value={value} onChange={(event) => onChange(event.target.value)} /></label>; }
