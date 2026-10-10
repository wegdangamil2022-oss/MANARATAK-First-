import { useEffect, useState } from 'react';
import type { AcademicLifecycleDecision, CanonicalAcademicUsageSummary } from '@manaratak/domain';
import { adminApiClient } from '../../api/client';

const labels: Record<string, [string, string]> = {
  majorAcademicFieldLinks: ['حقول التخصصات', 'Major fields'], majorDisciplineLinks: ['تصنيفات التخصصات', 'Major disciplines'],
  majorProfileAcademicFieldLinks: ['حقول ملفات التخصص', 'Profile fields'], majorProfileDisciplineLinks: ['تصنيفات ملفات التخصص', 'Profile disciplines'],
  majorClassificationMappings: ['خرائط تصنيف التخصصات', 'Major classifications'], internationalTestRelationships: ['الاختبارات', 'Tests'],
  courseTaxonomyResolutions: ['مطابقة المقررات', 'Course resolutions'], courseTaxonomyLinks: ['روابط المقررات', 'Course links'],
  courseMajorProjections: ['إسقاطات المقررات', 'Course projections'], parentEdges: ['روابط الأبناء', 'Child links'], childEdges: ['روابط الآباء', 'Parent links'],
  sourceMappings: ['خرائط صادرة', 'Outgoing mappings'], targetMappings: ['خرائط واردة', 'Incoming mappings'],
  majorProfiles: ['ملفات التخصصات', 'Major profiles'], internationalTestDegreeRelationships: ['روابط درجات الاختبارات', 'Test degrees'],
  universityPrograms: ['البرامج الجامعية', 'University programs'], scholarshipTargets: ['استهداف المنح', 'Scholarship targets'],
  scholarshipEligibility: ['أهلية المنح', 'Scholarship eligibility'], legacyTestDegreeCodes: ['روابط اختبارات تاريخية بالرمز', 'Historic test code links'],
  legacyMajorProfileCodes: ['ملفات تاريخية بالرمز', 'Historic profile code links'],
};
interface Props {
  endpoint: string;
  isAr: boolean;
  requiresDecision: boolean;
  decision: AcademicLifecycleDecision;
  onDecision: (decision: AcademicLifecycleDecision) => void;
  onReady: (ready: boolean) => void;
}
export function CanonicalAcademicGovernancePanel({ endpoint, isAr, requiresDecision, decision, onDecision, onReady }: Props) {
  const [report, setReport] = useState<CanonicalAcademicUsageSummary | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const abort = new AbortController();
    setReport(null); setFailed(false); onReady(false);
    adminApiClient.request<CanonicalAcademicUsageSummary>(endpoint, { signal: abort.signal })
      .then(value => { if (!abort.signal.aborted) { setReport(value); onReady(true); } })
      .catch(() => { if (!abort.signal.aborted) setFailed(true); });
    return () => abort.abort();
  }, [endpoint, onReady]);
  return <section className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2 text-xs">
    <h3 className="font-bold">{isAr ? 'أثر التغيير والارتباطات' : 'Change impact and references'}</h3>
    {failed ? <p role="alert">{isAr ? 'تعذر قراءة الأثر؛ تغيير الحالة متوقف حتى إعادة فتح النموذج.' : 'Impact unavailable; reopen this form before changing status.'}</p>
      : !report ? <p role="status">{isAr ? 'جار تحميل الارتباطات…' : 'Loading references…'}</p>
      : <><p>{isAr ? 'عدد الروابط (قد يتكرر المستهلك): ' : 'Relationship count (consumers may repeat): '}{report.totalReferences}</p>
        <dl className="grid grid-cols-2 gap-1">{Object.entries(report.counts).map(([key, count]) => <div key={key}><dt className="inline">{labels[key]?.[isAr ? 0 : 1] ?? key}: </dt><dd className="inline font-bold">{count}</dd></div>)}</dl></>}
    <p>{isAr ? 'الأرشفة توقف الظهور العام؛ تبقى المعرّفات والروابط التاريخية دون حذف أو تحويل تلقائي.' : 'Archive hides public discovery; IDs and historic links remain, without deletion or automatic reassignment.'}</p>
    {requiresDecision && <>
      <label className="block">{isAr ? 'سبب تغيير الحالة' : 'Reason for status change'}
        <textarea required maxLength={1000} rows={2} className="block w-full border rounded p-2" value={decision.reason} onChange={event => onDecision({ ...decision, reason: event.target.value })} />
      </label>
      <label className="flex gap-2 items-start"><input type="checkbox" required checked={decision.acknowledgeHistoricalReferences} onChange={event => onDecision({ ...decision, acknowledgeHistoricalReferences: event.target.checked })} />
        {isAr ? 'راجعت الأثر وأقر ببقاء الروابط التاريخية ومسؤولية متابعة المستهلكين.' : 'I reviewed the impact and acknowledge preserved historic links and consumer follow-up.'}</label>
    </>}
  </section>;
}
