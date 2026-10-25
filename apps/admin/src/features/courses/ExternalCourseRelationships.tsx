import { useEffect, useState } from 'react';
import { Check, X, GitBranch, Languages, RefreshCw } from 'lucide-react';
import type { CourseRelationshipReviewReadModel } from '@manaratak/domain';
import { adminApiClient } from '../../api/client';
import { canonicalPickerApi, canonicalOptionIsSelectable } from '../../api/canonicalPickers';
import { useAdminAuthorization } from '../../security/AdminAuthorizationContext';
import { CourseLookup } from './CourseLookup';
import { useCourseCopy } from './useCourseCopy';

export function ExternalCourseRelationships({ id, editable, busy, command }: { id: string; editable: boolean; busy: boolean; command: (action: string, body?: object) => Promise<void> }) {
  const { tr, ar } = useCourseCopy(); const { hasPermission } = useAdminAuthorization();
  const [data, setData] = useState<CourseRelationshipReviewReadModel>(), [error, setError] = useState(false), [reload, setReload] = useState(0);
  const [language, setLanguage] = useState(''), [taxonomy, setTaxonomy] = useState(''), [major, setMajor] = useState('');
  useEffect(() => {
    const controller = new AbortController(); setError(false);
    adminApiClient.request<CourseRelationshipReviewReadModel>(`/admin/courses/${encodeURIComponent(id)}/relationships`, { signal: controller.signal }).then(value => { if (!controller.signal.aborted) setData(value); }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [id, reload]);
  const label = (state: string) => ({ APPROVED: tr('معتمد', 'Approved'), PROPOSED: tr('مقترح', 'Proposed'), REJECTED: tr('مرفوض', 'Rejected'), REVIEW_REQUIRED: tr('تحتاج مراجعة', 'Needs review') }[state] ?? tr('غير محسوم', 'Unresolved'));
  const run = async (action: string, body?: object) => { await command('relationships/' + action, body); setReload(value => value + 1); };
  const review = (kind: 'taxonomy' | 'majors', key: string, state: string) => editable && <div className="course-drawer-toolbar"><button type="button" disabled={busy || state === 'APPROVED'} onClick={() => void run(`${kind}/${encodeURIComponent(key)}/approve`)}><Check size={15}/>{tr('اعتماد', 'Approve')}</button><button type="button" disabled={busy || state === 'REJECTED'} onClick={() => void run(`${kind}/${encodeURIComponent(key)}/reject`)}><X size={15}/>{tr('رفض الربط', 'Reject link')}</button></div>;
  return <div className="course-relations"><h4><GitBranch size={17}/>{tr('العلاقات الأكاديمية المعتمدة', 'Canonical academic relationships')}</h4>{error ? <p className="course-error" role="alert">{tr('تعذرت قراءة العلاقات؛ ليست قائمة فارغة.', 'Relationships could not be read; they are not assumed empty.')}<button type="button" onClick={() => setReload(value => value + 1)}><RefreshCw size={15}/>{tr('إعادة المحاولة', 'Retry')}</button></p> : !data ? <p role="status">{tr('جارٍ قراءة العلاقات…', 'Loading relationships…')}</p> : <>
    <p className="course-hint">{data.closure.reviewRequired ? tr('العلاقات تحتاج مراجعة قبل النشر. النص الحر لا يثبت تخصصًا معتمدًا.', 'Relationships need review before publication. Free text does not establish an approved major.') : tr('أُغلقت مراجعة العلاقات الحالية.', 'Current relationship review is closed.')}</p>
    <p><Languages size={16}/>{tr('لغة المصدر', 'Source language')}: {data.source.learningLanguageRaw || tr('غير متوفرة', 'Unavailable')} · {data.closure.languageCanonical ? tr('مرتبطة بمرجع معتمد', 'Approved canonical reference') : tr('تحتاج اعتماد مرجع', 'Canonical approval required')}</p>
    {editable && <><div className="course-drawer-toolbar"><button type="button" disabled={busy} onClick={() => void run('analyze')}><GitBranch size={16}/>{tr('تحليل موضوعات المصدر', 'Analyze source topics')}</button><button type="button" disabled={busy || !data.closure.approvedTaxonomyLinks} onClick={() => void run('majors/project')}>{tr('اقتراح التخصصات المرتبطة', 'Propose related majors')}</button></div>
      <fieldset disabled={busy} className="course-filter-grid"><div><CourseLookup label={tr('مرجع لغة التدريس', 'Learning language reference')} value={language} onChange={setLanguage} load={async (q, page) => { const values = await canonicalPickerApi.languages(q, page); return { data: values.filter(canonicalOptionIsSelectable), hasMore: values.length === 50 }; }}/><button type="button" disabled={!language} onClick={() => void run('language', { languageReferenceId: language })}>{tr('اعتماد اللغة المحددة', 'Approve selected language')}</button></div>
      {hasPermission('admin:academic-taxonomy:manage') && <div><CourseLookup label={tr('تصنيف أكاديمي معتمد', 'Canonical academic classification')} value={taxonomy} onChange={setTaxonomy} load={async (q, page) => { const values = await canonicalPickerApi.taxonomyNodes(undefined, q, page); return { data: values.filter(canonicalOptionIsSelectable), hasMore: values.length === 50 }; }}/><button type="button" disabled={!taxonomy} onClick={() => void run('taxonomy', { taxonomyNodeId: taxonomy, relationshipType: 'RELATED' })}>{tr('إضافة اقتراح تصنيف', 'Propose classification')}</button></div>}
      {hasPermission('admin:majors:manage') && <div><CourseLookup label={tr('تخصص مرتبط', 'Related major')} value={major} onChange={setMajor} load={async (q, page) => { const values = await canonicalPickerApi.majors(q, page); return { data: values.filter(canonicalOptionIsSelectable), hasMore: values.length === 50 }; }}/><button type="button" disabled={!major} onClick={() => void run('majors', { majorId: major, relationshipType: 'RELATED' })}>{tr('إضافة اقتراح تخصص', 'Propose related major')}</button></div>}</fieldset>
    </>}
    <div className="course-relation-list">{data.taxonomyLinks.map(link => <article key={link.id}><div><strong dir="auto">{link.taxonomyNode?.canonicalName || link.sourceTerm}</strong><span>{label(link.reviewState)}</span></div>{review('taxonomy', link.id, link.reviewState)}</article>)}{data.majorProjections.map(link => <article key={link.id}><div><strong dir="auto">{link.major?.displayName || tr('تخصص محفوظ — الاسم غير متاح', 'Saved major — name unavailable')}</strong><span>{label(link.projectionState)}</span></div>{review('majors', link.id, link.projectionState)}</article>)}</div>
    {!data.taxonomyLinks.length && !data.majorProjections.length && <p className="course-hint">{tr('لا توجد روابط أكاديمية مسجلة لهذه الدورة.', 'No academic relationships are recorded for this course.')}</p>}
    {data.internationalTestRelationships.length > 0 && <p>{tr('اختبارات مرتبطة', 'Related tests')}: {data.internationalTestRelationships.map(link => `${link.internationalTest?.displayName || (ar ? 'اختبار محفوظ' : 'Saved test')} (${label(link.reviewState)})`).join(' · ')}</p>}
  </>}</div>;
}
