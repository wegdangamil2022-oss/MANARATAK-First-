import { Fragment, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Building2, GraduationCap, FileText, ShieldCheck, ExternalLink, Pencil, RefreshCw, Save, X, CheckCircle2, Send, Archive, Undo2, XCircle, History } from 'lucide-react';
import { reviewReasonHeaders } from '@manaratak/shared';
import type { CourseDto, ImportedCourseAdminDetail, ExternalCourseHistoryPage } from '@manaratak/domain';
import { adminApiClient } from '../../api/client';
import { courseProviderRegistryApi } from '../../api/courseProviders';
import { useAdminAuthorization } from '../../security/AdminAuthorizationContext';
import { useOwnerOperationScope } from '../../security/useOwnerOperationScope';
import { CourseDialog } from './CourseDialog';
import { CourseLookup } from './CourseLookup';
import { ExternalCourseRelationships } from './ExternalCourseRelationships';
import { useCourseCopy, certificateLabels, studyLabels } from './useCourseCopy';
import { certificateFact, studyFact } from './catalogState';
import { externalFields, externalSections, externalForm, externalSectionPayload, manualExternalPayload, externalIssue, type ExternalSection } from './externalCourseFields';

type Readiness = { version: number; eligible: boolean; blockers: string[] };
const icons = { identity: Building2, learning: GraduationCap, certificate: ShieldCheck, content: BookOpen, source: FileText };
export function ExternalCourseDrawer({ id, returnTo, onClose, onSaved }: { id?: string; returnTo: string; onClose: () => void; onSaved?: (id: string) => void }) {
  const { tr, ar, date, status } = useCourseCopy();
  const { hasPermission } = useAdminAuthorization();
  const scope=useOwnerOperationScope(`${id??'create'}:${hasPermission('admin:courses:manage')}`);
  const mutation=useRef(false);
  const [unverifiedId,setUnverifiedId]=useState('');
  const creating = !id;
  const [course, setCourse] = useState<CourseDto>();
  const [source, setSource] = useState<ImportedCourseAdminDetail>();
  const [loadError, setLoadError] = useState('');
  const [sourceError, setSourceError] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [edit, setEdit] = useState<Exclude<ExternalSection, 'source'> | null>(null);
  const [form, setForm] = useState<Record<string, string>>(() => externalForm());
  const [initial, setInitial] = useState(() => JSON.stringify(externalForm()));
  const [expectedVersion, setExpectedVersion] = useState<number>();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [readiness, setReadiness] = useState<Readiness>();
  const [actions, setActions] = useState(false);
  const [history, setHistory] = useState<ExternalCourseHistoryPage>();
  const [historyPage, setHistoryPage] = useState(1), [historyError, setHistoryError] = useState(false);
  const dirty = !busy && (creating || edit !== null) && (JSON.stringify(form) !== initial || Boolean(reason));
  const editable = !unverifiedId && hasPermission('admin:courses:manage') && course && !['PUBLISHED', 'ARCHIVED', 'REJECTED'].includes(course.status);
  useEffect(()=>{mutation.current=false;setBusy(false);setEdit(null);setError('');setNotice('');setReason('');setUnverifiedId('');setHistoryPage(1);},[scope]);
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController(); setLoadError(''); setSourceError(false); setCourse(undefined); setSource(undefined); setReadiness(undefined);
    adminApiClient.request<CourseDto>(`/admin/courses/${encodeURIComponent(id)}`, { signal: controller.signal }).then(result => {
      if (controller.signal.aborted) return;
      if (result.id!==id || result.originType !== 'EXTERNAL_LINKED_COURSE') throw new Error('EXTERNAL_COURSE_REQUIRED');
      setCourse(result);setUnverifiedId('');
    }).catch(error => { if (!controller.signal.aborted) setLoadError(error.message); });
    adminApiClient.request<ImportedCourseAdminDetail>(`/admin/courses/imported/${encodeURIComponent(id)}`, { signal: controller.signal }).then(result => {
      if (!controller.signal.aborted) setSource(result);
    }).catch(() => { if (!controller.signal.aborted) setSourceError(true); });
    return () => controller.abort();
  }, [id, refresh, scope]);
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController(); setHistoryError(false); setHistory(undefined);
    adminApiClient.request<ExternalCourseHistoryPage>(`/admin/courses/imported/${encodeURIComponent(id)}/history?page=${historyPage}`, { signal: controller.signal }).then(value => { if (!controller.signal.aborted) setHistory(value); }).catch(() => { if (!controller.signal.aborted) setHistoryError(true); });
    return () => controller.abort();
  }, [id, refresh, historyPage]);
  const set = (key: string, value: string) => setForm(previous => ({ ...previous, [key]: value }));
  const startEdit = (section: Exclude<ExternalSection, 'source'>) => {
    if (edit && dirty && !window.confirm(tr('تجاهل التعديلات غير المحفوظة؟', 'Discard unsaved changes?'))) return;
    const values = externalForm(course); setForm(values); setInitial(JSON.stringify(values)); setExpectedVersion(course?.version); setReason(''); setError(''); setEdit(section);
  };
  const cancel = () => { if (!dirty || window.confirm(tr('تجاهل التعديلات غير المحفوظة؟', 'Discard unsaved changes?'))) { setEdit(null); setError(''); setRefresh(value => value + 1); } };
  const afterChange = () => { setReadiness(undefined); setRefresh(value => value + 1); if (id) onSaved?.(id); };
  const save = async (event: FormEvent) => {
    event.preventDefault(); if (busy || mutation.current || unverifiedId || !scope.isCurrent() || !hasPermission('admin:courses:manage') || reason.trim().length < 3) return;
    mutation.current=true;
    setBusy(true); setError(''); setNotice('');
    let acceptedId='';
    try {
      const result = await adminApiClient.request<CourseDto | ImportedCourseAdminDetail>(creating ? '/admin/courses/imported' : `/admin/courses/imported/${encodeURIComponent(id!)}`, {
        method: creating ? 'POST' : 'PATCH', headers: { ...reviewReasonHeaders(reason.trim()), ...(!creating ? { 'If-Match': String(expectedVersion) } : {}) },
        body: JSON.stringify(creating ? manualExternalPayload(form) : externalSectionPayload(form, edit!)),
      });
      acceptedId=result.id;
      if(!scope.isCurrent())return;
      const checked=await adminApiClient.request<CourseDto>(`/admin/courses/${encodeURIComponent(result.id)}`,{cache:'no-store'});
      if(!scope.isCurrent())return;
      if(checked.id!==result.id||(!creating&&checked.id!==id)||checked.originType!=='EXTERNAL_LINKED_COURSE'||!Number.isSafeInteger(checked.version)||checked.version<=(creating?0:expectedVersion??0))throw Error('COURSE_SAVE_READBACK_MISMATCH');
      if(!creating&&edit){const expected=externalSectionPayload(form,edit),actual=externalSectionPayload(externalForm(checked),edit);if(JSON.stringify(expected)!==JSON.stringify(actual))throw Error('COURSE_SAVE_READBACK_MISMATCH');}
      setEdit(null); setInitial(JSON.stringify(form)); setReason(''); setNotice(tr('حُفظت البيانات. لم تُنشر الدورة تلقائيًا.', 'Saved. The course was not automatically published.'));
      if (creating) onSaved?.(result.id); else afterChange();
    } catch (error) { if(scope.isCurrent()){if(acceptedId)setUnverifiedId(acceptedId);setError(error instanceof Error ? error.message : 'COURSE_SAVE_FAILED');} }
    finally { if(scope.isCurrent()){mutation.current=false;setBusy(false);} }
  };
  const command = async (action: string, base = 'imported/', body?: object) => {
    if (!id || !course || busy || mutation.current || unverifiedId || !scope.isCurrent()) return;
    if (edit) { setError('COURSE_FINISH_EDIT_FIRST'); return; }
    if (reason.trim().length < 3) { setError('COURSE_REVIEW_REASON_REQUIRED'); return; }
    if (['publish', 'unpublish', 'archive', 'reject'].includes(action) && !window.confirm(tr('تأكيد تنفيذ الإجراء على هذه الدورة فقط؟', 'Confirm this operation on this course only?'))) return;
    setBusy(true); setError(''); setNotice('');
    mutation.current=true;let accepted=false;
    try {
      await adminApiClient.request(`/admin/courses/${base}${encodeURIComponent(id)}/${action}`, { method: 'POST', headers: { ...reviewReasonHeaders(reason.trim()), 'If-Match': String(course.version) }, ...(body ? { body: JSON.stringify(body) } : {}) });
      accepted=true;if(!scope.isCurrent())return;
      const checked=await adminApiClient.request<CourseDto>(`/admin/courses/${encodeURIComponent(id)}`,{cache:'no-store'});
      if(!scope.isCurrent())return;
      const expected:Record<string,string>={publish:'PUBLISHED',unpublish:'READY_TO_REVIEW',archive:'ARCHIVED',reject:'REJECTED','mark-ready':base===''?'READY_TO_REVIEW':'READY_TO_PUBLISH'};
      if(checked.id!==id||checked.version<=course.version||(expected[action]&&checked.status!==expected[action]))throw Error('COURSE_COMMAND_READBACK_MISMATCH');
      setNotice(tr('نُفذ الإجراء وسُجل في سجل التغييرات.', 'Operation completed and recorded in the change history.')); afterChange();
    } catch (error) { if(scope.isCurrent()){if(accepted)setUnverifiedId(id);setError(error instanceof Error ? error.message : 'COURSE_COMMAND_FAILED');} }
    finally { if(scope.isCurrent()){mutation.current=false;setBusy(false);} }
  };
  const checkReadiness = async () => {
    if (!id || busy) return; setBusy(true); setError('');
    try { const next=await adminApiClient.request<Readiness>(`/admin/courses/imported/${encodeURIComponent(id)}/readiness`);if(scope.isCurrent()){if(next.version!==course?.version)throw Error('COURSE_READINESS_VERSION_MISMATCH');setReadiness(next);} }
    catch (error) { if(scope.isCurrent())setError(error instanceof Error ? error.message : 'READINESS_FAILED'); }
    finally { if(scope.isCurrent())setBusy(false); }
  };
  const absent = tr('غير متوفر', 'Unavailable');
  const value = (label: string, content: unknown) => <div className="course-detail-value"><dt>{label}</dt><dd dir="auto">{typeof content === 'string' && content.trim() ? content : typeof content === 'number' ? content : absent}</dd></div>;
  const optional = course?.optionalFields ?? {};
  const safeUrl = (input?: string) => { try { const url = new URL(input ?? ''); return url.protocol === 'https:' && !url.username && !url.password ? url.href : undefined; } catch { return undefined; } };
  const directUrl = safeUrl(course?.directCourseUrl);
  const reasonField = <label className="course-field course-reason-field"><span>{tr('مبرر الإجراء', 'Operation reason')}</span><textarea aria-label={tr('مبرر الإجراء', 'Operation reason')} required minLength={3} maxLength={2000} disabled={busy} value={reason} onChange={event => setReason(event.target.value)}/></label>;
  const inputs = (section: Exclude<ExternalSection, 'source'>) => <div className="course-filter-grid">{externalFields[section].map(field => {
    const label = ar ? field.ar : field.en;
    return <label className={`course-field ${field.kind === 'textarea' || field.kind === 'list' ? 'course-wide-field' : ''}`} key={field.key}><span>{label}</span>
      {field.kind === 'boolean' ? <select aria-label={label} value={form[field.key]} disabled={busy} onChange={event => set(field.key, event.target.value)}><option value="">{tr('غير معلوم', 'Unknown')}</option><option value="true">{tr('نعم', 'Yes')}</option><option value="false">{tr('لا', 'No')}</option></select>
        : field.kind === 'textarea' || field.kind === 'list' ? <textarea aria-label={label} maxLength={field.key === 'description' ? 100000 : 20000} value={form[field.key]} disabled={busy} onChange={event => set(field.key, event.target.value)}/>
          : <input aria-label={label} type={field.key === 'directCourseUrl' ? 'url' : 'text'} required={field.required} maxLength={field.key === 'directCourseUrl' ? 4000 : 500} readOnly={!creating && field.immutable} disabled={busy} value={form[field.key]} onChange={event => set(field.key, event.target.value)}/>}
      {!creating && field.immutable && <small>{tr('هوية مصدر محمية؛ التصحيح عبر مراجعة الاستيراد.', 'Protected source identity; corrections use import review.')}</small>}
    </label>;
  })}</div>;
  const sourceValues = () => <>
    {sourceError && <p role="alert" className="course-error">{tr('تعذرت قراءة المصدر؛ لا يعني ذلك غيابه.', 'Source details could not be read; this does not mean they are absent.')}<button type="button" onClick={() => setRefresh(value => value + 1)}>{tr('إعادة المحاولة', 'Retry')}</button></p>}
    <dl>
      {value(tr('اكتمال البيانات', 'Data completeness'), course?.completenessStatus === 'COMPLETE' ? tr('مكتملة', 'Complete') : tr('تحتاج مراجعة / استكمال', 'Needs review / completion'))}
      {value(tr('آخر تعديل', 'Last updated'), date(String(course?.updatedAt)))}
      {value(tr('آخر فحص للرابط', 'Last link check'), source?.linkCheckedAt ? date(String(source.linkCheckedAt)) : undefined)}
      {value(tr('حالة فحص الرابط', 'Link verification'), source?.linkHealth === 'VERIFIED_DIRECT' || source?.linkHealth === 'REDIRECTED_VALID' ? tr('رابط متحقق منه', 'Verified link') : source?.linkHealth === 'BROKEN' ? tr('رابط معطل', 'Broken link') : tr('يحتاج تحققًا', 'Verification needed'))}
      {value(tr('ملف المصدر', 'Source file'), optional.sourceFilename)}{value(tr('ورقة المصدر', 'Source sheet'), optional.sourceSheetName)}
      {value(tr('رقم صف المصدر', 'Source row'), optional.sourceRowNumber)}{value(tr('بصمة ملف المصدر SHA-256', 'Source SHA-256'), optional.sourceArtifactHash)}
      {value(tr('الرقم المرجعي في المصدر No.', 'Source reference No.'), source?.originalSourceRow?.sourceOrder ?? optional.sourceOrder)}
      {value(tr('سجل الاستيراد', 'Import record'), course?.sourceImportRecordId)}{value(tr('إصدار السجل', 'Record version'), course?.version)}
      {value(tr('دفعة الاستيراد الأصلية', 'Original import batch'), source?.sourceBatchId)}
      {value(tr('مفتاح المصدر', 'Provider source key'), source?.sourceIdentity?.sourceNativeKey)}
      {value(tr('منشأ الإنشاء', 'Creation origin'), optional.creationOrigin === 'MANUAL' ? tr('إدخال يدوي موثق', 'Documented manual entry') : course?.sourceImportRecordId ? tr('استيراد', 'Import') : undefined)}
      {value(tr('المصدر الرسمي', 'Official source'), course?.officialSourceUrl)}
      {value(tr('المزود المعتمد', 'Canonical provider'), source?.provider?.displayName)}
      {optional.creationOrigin === 'MANUAL' && <>{value(tr('رابط الدليل اليدوي', 'Manual evidence URL'), (optional.manualEvidence as Record<string, unknown>)?.url)}{value(tr('تاريخ مشاهدة الدليل', 'Evidence observed at'), typeof (optional.manualEvidence as Record<string, unknown>)?.observedAt === 'string' ? date(String((optional.manualEvidence as Record<string, unknown>).observedAt)) : undefined)}{value(tr('ملاحظات الدليل', 'Evidence notes'), (optional.manualEvidence as Record<string, unknown>)?.note)}</>}
    </dl>
    {source?.originalSourceRow && <><h4><FileText size={17}/>{tr('القيم الأصلية المحفوظة من الاستيراد — للقراءة فقط', 'Original imported values — read only')}</h4><dl>{Object.entries({ providerLabel: tr('جهة المصدر', 'Source provider'), courseName: tr('اسم الدورة الأصلي', 'Original course name'), directCourseUrl: tr('الرابط الأصلي من الملف', 'Original file URL'), studyFreeRaw: tr('مجانية الدراسة في المصدر', 'Source free study'), freeCertificateRaw: tr('مجانية الشهادة في المصدر', 'Source free certificate'), certificateTypeRaw: tr('نوع الشهادة في المصدر', 'Source certificate type'), languageRaw: tr('اللغة في المصدر', 'Source language'), studyLevelRaw: tr('المستوى في المصدر', 'Source level'), courseDurationRaw: tr('المدة في المصدر', 'Source duration'), shortCourseTopicsRaw: tr('الموضوعات في المصدر', 'Source topics') }).map(([key, label]) => <Fragment key={key}>{value(label, source.originalSourceRow![key])}</Fragment>)}</dl></>}
    <h4><History size={17}/>{tr('التغييرات والمراجعات', 'Changes and reviews')}</h4>
    {historyError ? <p className="course-error" role="alert">{tr('تعذرت قراءة سجل التغييرات.', 'Could not read change history.')}<button type="button" onClick={() => setRefresh(value => value + 1)}>{tr('إعادة المحاولة', 'Retry')}</button></p> : history ? <><div className="course-history-list">{history.data.map(item => <article key={item.id}><strong dir="auto">{item.reason || tr('إجراء إداري موثق', 'Recorded administrative operation')}</strong><span>{date(item.occurredAt)}</span><small dir="ltr">{item.action}</small></article>)}</div>{!history.data.length && <p className="course-hint">{tr('لا توجد أحداث تدقيق في هذه الصفحة.', 'No audit events on this page.')}</p>}<div className="course-drawer-toolbar">{history.versions.map(item => <span className="course-badge" key={item.version} title={`${item.reason} · ${date(item.createdAt)}`}>{tr('نسخة', 'Version')} {item.version}</span>)}</div><div className="course-pagination"><button type="button" disabled={history.page <= 1} onClick={() => setHistoryPage(value => value - 1)}>{tr('السابق', 'Previous')}</button><span>{history.page} / {history.totalPages}</span><button type="button" disabled={history.page >= history.totalPages} onClick={() => setHistoryPage(value => value + 1)}>{tr('التالي', 'Next')}</button></div></> : <p role="status">{tr('جارٍ قراءة السجل…', 'Loading history…')}</p>}
  </>;
  const readFields = (section: Exclude<ExternalSection, 'source'>) => {
    const values = { ...optional, ...course } as Record<string, unknown>;
    return <dl>{externalFields[section].map(field => <Fragment key={field.key}>{value(ar ? field.ar : field.en, field.kind === 'boolean' ? values[field.key] === true ? tr('نعم', 'Yes') : values[field.key] === false ? tr('لا', 'No') : tr('غير معلوم', 'Unknown') : Array.isArray(values[field.key]) ? (values[field.key] as unknown[]).filter(item => typeof item === 'string').join('\n') : values[field.key])}</Fragment>)}
      {section === 'identity' && value(tr('المزود المعتمد', 'Canonical provider'), source?.provider?.displayName)}
      {section === 'certificate' && <>{value(tr('إتاحة الدراسة', 'Study access'), studyLabels[studyFact(course ?? {})][ar ? 0 : 1])}{value(tr('حالة الشهادة', 'Certificate status'), certificateLabels[certificateFact(course ?? {})][ar ? 0 : 1])}</>}
    </dl>;
  };
  const groups = <div className="course-detail-groups">{externalSections.map(section => {
    const Icon = icons[section.id];
    return <section key={section.id} className={`course-panel ${section.id === 'source' ? 'course-source-group' : ''}`} data-external-section={section.id}>
      <header className="course-section-heading"><h3><Icon size={18}/>{ar ? section.ar : section.en}</h3>{!creating && section.id !== 'source' && editable && <button type="button" disabled={busy} onClick={() => startEdit(section.id as Exclude<ExternalSection, 'source'>)}><Pencil size={15}/>{tr('تعديل القسم', 'Edit section')}</button>}</header>
      {creating ? section.id === 'source' ? <div className="course-filter-grid"><label className="course-field"><span>{tr('رابط دليل المصدر', 'Evidence URL')}</span><input type="url" aria-label={tr('رابط دليل المصدر', 'Evidence URL')} required value={form.evidenceUrl} onChange={event => set('evidenceUrl', event.target.value)}/></label><label className="course-field"><span>{tr('تاريخ مشاهدة الدليل', 'Evidence observed at')}</span><input type="datetime-local" aria-label={tr('تاريخ مشاهدة الدليل', 'Evidence observed at')} required value={form.evidenceObservedAt} onChange={event => set('evidenceObservedAt', event.target.value)}/></label><label className="course-field course-wide-field"><span>{tr('ملاحظات الدليل', 'Evidence notes')}</span><textarea maxLength={2000} value={form.evidenceNote} onChange={event => set('evidenceNote', event.target.value)}/></label><p className="course-hint">{tr('تُحفظ كمسودة تحتاج مراجعة. لا يمثل دليل المصدر فحصًا ناجحًا للرابط ولا موافقة نشر.', 'Saved as a draft needing review. Source evidence is not a passed link check or publication approval.')}</p></div> : <>{inputs(section.id)}{section.id === 'identity' && <CourseLookup label={tr('المزود المعتمد', 'Canonical provider')} value={form.externalProviderId} onChange={value => set('externalProviderId', value)} load={async (q, page) => { const result = await courseProviderRegistryApi.list({ q, page, pageSize: 25 }); return { data: result.data.filter(provider => provider.status === 'APPROVED').map(provider => ({ id: provider.id, label: provider.displayName })), hasMore: page < result.totalPages }; }}/>}</>
        : section.id === 'source' ? sourceValues() : edit === section.id ? <form onSubmit={save} className="course-section-form">{inputs(section.id)}{reasonField}<div className="course-drawer-toolbar"><button type="submit" disabled={busy || reason.trim().length < 3} className="course-primary"><Save size={16}/>{tr('حفظ القسم', 'Save section')}</button><button type="button" disabled={busy} onClick={cancel}><X size={16}/>{tr('إلغاء التحرير', 'Cancel editing')}</button></div></form> : readFields(section.id)}
      {!creating && section.id === 'learning' && <ExternalCourseRelationships id={id!} editable={Boolean(editable) && !edit} busy={busy} command={(action, body) => command(action, '', body)}/>}
    </section>;
  })}</div>;
  return <CourseDialog title={creating ? tr('إضافة دورة خارجية — مسودة', 'Add an external course — draft') : course?.displayName || tr('تفاصيل الدورة الخارجية', 'External course details')} onClose={() => { if (!busy) onClose(); }} dirty={dirty}>
    {loadError ? <div className="course-error" role="alert">{externalIssue(loadError, tr)}<button type="button" onClick={() => setRefresh(value => value + 1)}><RefreshCw size={16}/>{tr('إعادة المحاولة', 'Retry')}</button></div> : !creating && !course ? <p role="status">{tr('جارٍ تحميل تفاصيل الدورة…', 'Loading course details…')}</p> : <>
      {notice && <p className="course-success" role="status"><CheckCircle2 size={17}/>{notice}</p>}
      {error && <p className="course-error" role="alert" title={error}>{error === 'COURSE_REVIEW_REASON_REQUIRED' ? tr('اكتب مبررًا من ثلاثة أحرف على الأقل.', 'Enter a reason of at least three characters.') : externalIssue(error, tr)}</p>}
      {unverifiedId&&<div role="alert" className="course-error">{tr('قُبل الطلب وتعذر التحقق من آخر نسخة. أعد القراءة قبل أي إجراء آخر.','The request was accepted but its latest version could not be verified. Reload before another operation.')}<button type="button" disabled={busy} onClick={()=>{if(creating)onSaved?.(unverifiedId);else setRefresh(value=>value+1);}}>{tr('إعادة قراءة السجل المحفوظ','Reload saved record')}</button></div>}
      {creating ? <form className="course-create-form" onSubmit={save}>{groups}{reasonField}<button className="course-primary" type="submit" disabled={busy || !form.externalProviderId || reason.trim().length < 3}><Save size={16}/>{busy ? tr('جارٍ الحفظ…', 'Saving…') : tr('حفظ مسودة خارجية', 'Save external draft')}</button></form> : <>
        <div className="course-drawer-toolbar"><span className="course-badge">{status(course!.status)}</span>{directUrl && <a href={directUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={16}/>{tr('صفحة الدورة لدى المصدر', 'Official course page')}</a>}<Link to={`/courses/${encodeURIComponent(id!)}?returnTo=${encodeURIComponent(returnTo)}`}><Pencil size={16}/>{tr('أدوات العلاقات والنسخ', 'Relationship and version tools')}</Link><button type="button" onClick={() => setActions(!actions)} aria-expanded={actions}><ShieldCheck size={16}/>{tr('إجراءات المصدر والمراجعة', 'Source and review operations')}</button></div>
        {!edit && reasonField}{actions && <section className="course-panel course-operations"><h3><ShieldCheck size={18}/>{tr('التحقق والجاهزية والنشر', 'Verification, readiness and publication')}</h3><div className="course-drawer-toolbar">
          <button type="button" disabled={busy || !editable} onClick={() => void command('verify-source')}><ShieldCheck size={16}/>{tr('تحقق من المصدر', 'Verify source')}</button><button type="button" disabled={busy || !editable} onClick={() => void command('check-link')}><ExternalLink size={16}/>{tr('فحص الرابط', 'Check link')}</button><button type="button" disabled={busy} onClick={() => void checkReadiness()}><CheckCircle2 size={16}/>{tr('فحص جاهزية النشر', 'Check publication readiness')}</button>
          {course!.status === 'DRAFT' && <button type="button" disabled={busy} onClick={() => void command('mark-ready', '')}>{tr('إرسال للمراجعة', 'Submit for review')}</button>}
          {course!.status === 'READY_TO_REVIEW' && <button type="button" disabled={busy} onClick={() => void command('mark-ready')}>{tr('اعتماد الجاهزية', 'Approve readiness')}</button>}
          {course!.status === 'READY_TO_PUBLISH' && <button type="button" className="course-primary" disabled={busy || !readiness?.eligible || readiness.version !== course!.version} onClick={() => void command('publish')}><Send size={16}/>{tr('نشر الدورة', 'Publish course')}</button>}
          {course!.status === 'PUBLISHED' && <button type="button" disabled={busy} onClick={() => void command('unpublish')}><Undo2 size={16}/>{tr('إلغاء النشر', 'Unpublish')}</button>}
          {editable && <button type="button" disabled={busy} onClick={() => void command('reject')}><XCircle size={16}/>{tr('رفض الدورة', 'Reject course')}</button>}          {editable && <button type="button" disabled={busy} onClick={() => void command('archive')}><Archive size={16}/>{tr('أرشفة', 'Archive')}</button>}
        </div>{readiness && <div role="status" className={readiness.eligible ? 'course-success' : 'course-hint'}>{readiness.eligible ? tr('اجتازت الدورة سياسة الجاهزية الحالية.', 'The course passed the current readiness policy.') : <ul>{readiness.blockers.map(blocker => <li key={blocker} title={blocker}>{externalIssue(blocker, tr)}</li>)}</ul>}</div>}</section>}
        {groups}
      </>}
    </>}
  </CourseDialog>;
}
