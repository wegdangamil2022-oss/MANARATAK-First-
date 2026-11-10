import { useEffect, useRef, useState, type FormEvent } from 'react';

import { BookOpen, ShieldCheck, ExternalLink, Pencil, RefreshCw, Save, X, CheckCircle2, Send, Archive, Undo2, XCircle } from 'lucide-react';
import { reviewReasonHeaders } from '@manaratak/shared';
import type { CourseDto, ImportedCourseAdminDetail } from '@manaratak/domain';
import { adminApiClient } from '../../api/client';
import { courseProviderRegistryApi } from '../../api/courseProviders';
import { useAdminAuthorization } from '../../security/AdminAuthorizationContext';
import { useOwnerOperationScope } from '../../security/useOwnerOperationScope';
import { CourseDialog } from './CourseDialog';
import { CourseLookup } from './CourseLookup';
import { CourseAcademicLinks } from './CourseAcademicLinks';
import { courseNames, courseProviderNames, arabicCourseValue } from './coursePresentation';
import { useCourseCopy } from './useCourseCopy';

import { externalFields, externalForm, externalDetailsPayload, manualExternalPayload, externalIssue } from './externalCourseFields';

type Readiness = { version: number; eligible: boolean; blockers: string[] };

export function ExternalCourseDrawer({ id, onClose, onSaved }: { id?: string; returnTo: string; onClose: () => void; onSaved?: (id: string) => void }) {
  const { tr, ar, status } = useCourseCopy();
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
  const [edit, setEdit] = useState<'details' | null>(null);
  const [form, setForm] = useState<Record<string, string>>(() => externalForm());
  const [initial, setInitial] = useState(() => JSON.stringify(externalForm()));
  const [expectedVersion, setExpectedVersion] = useState<number>();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [readiness, setReadiness] = useState<Readiness>();
  const [actions, setActions] = useState(false);
  const dirty = !busy && (creating || edit !== null) && (JSON.stringify(form) !== initial || Boolean(reason));
  const editable = !unverifiedId && hasPermission('admin:courses:manage') && course && !['PUBLISHED', 'ARCHIVED', 'REJECTED'].includes(course.status);
  useEffect(()=>{mutation.current=false;setBusy(false);setEdit(null);setError('');setNotice('');setReason('');setUnverifiedId('');},[scope]);
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
  const set = (key: string, value: string) => setForm(previous => ({ ...previous, [key]: value }));
  const startEdit = () => {
    if (edit && dirty && !window.confirm(tr('تجاهل التعديلات غير المحفوظة؟', 'Discard unsaved changes?'))) return;
    const values = externalForm(course); setForm(values); setInitial(JSON.stringify(values)); setExpectedVersion(course?.version); setReason(''); setError(''); setEdit('details');
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
        body: JSON.stringify(creating ? manualExternalPayload(form) : externalDetailsPayload(form)),
      });
      acceptedId=result.id;
      if(!scope.isCurrent())return;
      const checked=await adminApiClient.request<CourseDto>(`/admin/courses/${encodeURIComponent(result.id)}`,{cache:'no-store'});
      if(!scope.isCurrent())return;
      if(checked.id!==result.id||(!creating&&checked.id!==id)||checked.originType!=='EXTERNAL_LINKED_COURSE'||!Number.isSafeInteger(checked.version)||checked.version<=(creating?0:expectedVersion??0))throw Error('COURSE_SAVE_READBACK_MISMATCH');
      if(!creating&&edit){const expected=externalDetailsPayload(form),actual=externalDetailsPayload(externalForm(checked));if(JSON.stringify(expected)!==JSON.stringify(actual))throw Error('COURSE_SAVE_READBACK_MISMATCH');}
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
  const names = courseNames(course ?? {});
  const provider = courseProviderNames({ ...course, providerDisplayName: source?.provider?.canonicalName ?? course?.providerDisplayName });
  const directUrl = (() => { try { const url = new URL(course?.directCourseUrl ?? ''); return url.protocol === 'https:' && !url.username && !url.password ? url.href : undefined; } catch { return undefined; } })();
  const reasonField = <label className="course-field course-reason-field"><span>{tr('سبب التعديل أو الإجراء', 'Operation reason')}</span><textarea aria-label={tr('سبب التعديل أو الإجراء', 'Operation reason')} required minLength={3} maxLength={2000} disabled={busy} value={reason} onChange={event => setReason(event.target.value)}/></label>;
  const fields = [...externalFields.identity, ...externalFields.certificate, ...externalFields.learning];
  const inputs = <div className="course-master-fields">{fields.map(field => {
    const label = ar ? field.ar : field.en;
    return <label className={`course-field ${field.kind === 'textarea' ? 'course-wide-field' : ''}`} key={field.key}><span>{label}</span>
      {field.kind === 'boolean' ? <select aria-label={label} value={form[field.key]} disabled={busy} onChange={event => set(field.key, event.target.value)}><option value="">{tr('غير مذكور', 'Not stated')}</option><option value="true">{tr('نعم', 'Yes')}</option><option value="false">{tr('لا', 'No')}</option></select>
        : field.kind === 'textarea' ? <textarea aria-label={label} maxLength={20000} value={form[field.key]} disabled={busy} onChange={event => set(field.key, event.target.value)}/>
          : <input aria-label={label} dir={['originalSourceTitle', 'platformName', 'directCourseUrl'].includes(field.key) ? 'ltr' : 'auto'} type={field.key === 'directCourseUrl' ? 'url' : 'text'} required={field.required} maxLength={field.key === 'directCourseUrl' ? 4000 : 500} readOnly={!creating && field.immutable} disabled={busy || (creating && field.key === 'providerName')} value={form[field.key]} onChange={event => set(field.key, event.target.value)}/>}
      {!creating && field.immutable && <small>{tr('محفوظ من الملف؛ تصحيحه من خلال مراجعة الاستيراد.', 'Preserved source value; corrections use import review.')}</small>}
    </label>;
  })}</div>;
  const displayed: Record<string, string> = {
    displayName: names.arabic || tr('لم يُضف الاسم العربي', 'Arabic name not added'),
    originalSourceTitle: names.english || tr('غير مذكور', 'Not stated'),
    providerName: provider.arabic || tr('لم يُضف الاسم العربي للجهة', 'Arabic provider name not added'),
    platformName: provider.english || tr('غير مذكور', 'Not stated'),
    directCourseUrl: course?.directCourseUrl ?? '',
  };
  const readValue = (key: string) => {
    if (key in displayed) return displayed[key];
    const content = course?.[key as keyof CourseDto];
    if (typeof content === 'boolean') return content ? tr('نعم', 'Yes') : tr('لا', 'No');
    return ar ? arabicCourseValue(typeof content === 'string' ? content : undefined) : typeof content === 'string' && content.trim() ? content : 'Not stated in the file';
  };
  return <CourseDialog title={creating ? tr('إضافة دورة خارجية', 'Add external course') : names.arabic || tr('تفاصيل الدورة', 'Course details')} onClose={() => { if (!busy) onClose(); }} dirty={dirty}>
    {loadError ? <div className="course-error" role="alert">{externalIssue(loadError, tr)}<button type="button" onClick={() => setRefresh(value => value + 1)}><RefreshCw size={16}/>{tr('إعادة المحاولة', 'Retry')}</button></div> : !creating && !course ? <p role="status">{tr('جارٍ تحميل تفاصيل الدورة…', 'Loading course details…')}</p> : <>
      {notice && <p className="course-success" role="status"><CheckCircle2 size={17}/>{notice}</p>}
      {error && <p className="course-error" role="alert">{error === 'COURSE_REVIEW_REASON_REQUIRED' ? tr('اكتب سببًا من ثلاثة أحرف على الأقل.', 'Enter a reason of at least three characters.') : externalIssue(error, tr)}</p>}
      {unverifiedId && <div role="alert" className="course-error">{tr('قُبل الطلب وتعذر التحقق من آخر نسخة. أعد القراءة قبل أي إجراء آخر.', 'The request was accepted but its latest version could not be verified. Reload before another operation.')}<button type="button" disabled={busy} onClick={() => { if (creating) onSaved?.(unverifiedId); else setRefresh(value => value + 1); }}>{tr('إعادة قراءة السجل المحفوظ', 'Reload saved record')}</button></div>}
      {!creating && <div className="course-drawer-toolbar course-details-toolbar"><span className="course-badge">{status(course!.status)}</span>{editable && !edit && <button className="course-primary" type="button" disabled={busy} onClick={startEdit}><Pencil size={15}/>{tr('تعديل بيانات الدورة', 'Edit course details')}</button>}<button type="button" onClick={() => setActions(!actions)} aria-expanded={actions}><ShieldCheck size={15}/>{tr('إجراءات المراجعة والنشر', 'Source and review operations')}</button></div>}
      <section className="course-panel course-source-details" aria-label={tr('بيانات الدورة من الملف', 'Course source fields')}>
        <h3><BookOpen size={17}/>{tr('بيانات الدورة', 'Course details')}</h3>
        {creating || edit ? <form onSubmit={save} className="course-section-form">{inputs}
          {creating && <><CourseLookup label={tr('الجهة المقدمة للدورة', 'Course provider')} value={form.externalProviderId} onChange={value => set('externalProviderId', value)} load={async (q, page) => { const result = await courseProviderRegistryApi.list({ q, page, pageSize: 25 }); return { data: result.data.filter(item => item.status === 'APPROVED').map(item => ({ id: item.id, label: item.displayName })), hasMore: page < result.totalPages }; }}/><details className="course-extra-filters"><summary>{tr('توثيق المصدر للإضافة اليدوية', 'Manual source evidence')}</summary><div className="course-master-fields"><label className="course-field"><span>{tr('رابط دليل المصدر', 'Evidence URL')}</span><input type="url" required value={form.evidenceUrl} onChange={event => set('evidenceUrl', event.target.value)}/></label><label className="course-field"><span>{tr('تاريخ مشاهدة الدليل', 'Evidence observed at')}</span><input type="datetime-local" required value={form.evidenceObservedAt} onChange={event => set('evidenceObservedAt', event.target.value)}/></label><label className="course-field course-wide-field"><span>{tr('ملاحظات الدليل', 'Evidence notes')}</span><textarea value={form.evidenceNote} onChange={event => set('evidenceNote', event.target.value)}/></label></div></details></>}
          {reasonField}<div className="course-drawer-toolbar"><button type="submit" className="course-primary" disabled={busy || reason.trim().length < 3 || (creating && !form.externalProviderId)}><Save size={16}/>{tr('حفظ بيانات الدورة', 'Save course details')}</button>{!creating && <button type="button" disabled={busy} onClick={cancel}><X size={16}/>{tr('إلغاء', 'Cancel')}</button>}</div>
        </form> : <dl className="course-master-fields"><div className="course-detail-value"><dt>{tr('الرقم في الملف', 'Source number')}</dt><dd>{String(source?.originalSourceRow?.sourceOrder ?? course?.optionalFields?.sourceOrder ?? '—')}</dd></div>{fields.map(field => <div className={`course-detail-value ${field.kind === 'textarea' || field.key === 'directCourseUrl' ? 'course-wide-field' : ''}`} key={field.key}><dt>{ar ? field.ar : field.en}</dt><dd dir={['originalSourceTitle', 'platformName', 'directCourseUrl'].includes(field.key) ? 'ltr' : 'auto'}>{field.key === 'directCourseUrl' && directUrl ? <a href={directUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={14}/>{directUrl}</a> : readValue(field.key)}</dd></div>)}</dl>}
      </section>
      {!creating && course && <CourseAcademicLinks id={course.id} editable={Boolean(editable && !edit)} busy={busy} reviewReason={!actions ? reasonField : undefined} command={(action, body) => command(action, '', body)}/>}
      {!creating && actions && <section className="course-panel course-operations"><h3><ShieldCheck size={17}/>{tr('المراجعة والنشر', 'Review and publication')}</h3>{!edit && reasonField}<div className="course-drawer-toolbar">
        <button type="button" disabled={busy || !editable} onClick={() => void command('verify-source')}><ShieldCheck size={15}/>{tr('تحقق من المصدر', 'Verify source')}</button><button type="button" disabled={busy || !editable} onClick={() => void command('check-link')}><ExternalLink size={15}/>{tr('فحص الرابط', 'Check link')}</button><button type="button" disabled={busy} onClick={() => void checkReadiness()}><CheckCircle2 size={15}/>{tr('فحص جاهزية النشر', 'Check publication readiness')}</button>
        {course!.status === 'DRAFT' && <button type="button" disabled={busy} onClick={() => void command('mark-ready', '')}>{tr('إرسال للمراجعة', 'Submit for review')}</button>}
        {course!.status === 'READY_TO_REVIEW' && <button type="button" disabled={busy} onClick={() => void command('mark-ready')}>{tr('اعتماد الجاهزية', 'Approve readiness')}</button>}
        {course!.status === 'READY_TO_PUBLISH' && <button type="button" className="course-primary" disabled={busy || !readiness?.eligible || readiness.version !== course!.version} onClick={() => void command('publish')}><Send size={15}/>{tr('نشر الدورة', 'Publish course')}</button>}
        {course!.status === 'PUBLISHED' && <button type="button" disabled={busy} onClick={() => void command('unpublish')}><Undo2 size={15}/>{tr('إلغاء النشر', 'Unpublish')}</button>}
        {editable && <><button type="button" disabled={busy} onClick={() => void command('reject')}><XCircle size={15}/>{tr('رفض الدورة', 'Reject course')}</button><button type="button" disabled={busy} onClick={() => void command('archive')}><Archive size={15}/>{tr('أرشفة', 'Archive')}</button></>}
      </div>{sourceError && <p className="course-hint">{tr('تعذرت قراءة بيانات التحقق من المصدر.', 'Source verification details unavailable.')}</p>}{readiness && <div role="status" className={readiness.eligible ? 'course-success' : 'course-hint'}>{readiness.eligible ? tr('اجتازت الدورة سياسة الجاهزية الحالية.', 'The course passed the current readiness policy.') : <ul>{readiness.blockers.map(blocker => <li key={blocker}>{externalIssue(blocker, tr)}</li>)}</ul>}</div>}</section>}
    </>}
  </CourseDialog>;
}
