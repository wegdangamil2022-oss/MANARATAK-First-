import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Building2, GraduationCap, FileText, ShieldCheck, ExternalLink, Pencil, RefreshCw } from 'lucide-react';
import type { CourseDto, ImportedCourseAdminDetail } from '@manaratak/domain';
import { adminApiClient } from '../../api/client';
import { CourseDialog } from './CourseDialog';
import { useCourseCopy, certificateLabels, studyLabels } from './useCourseCopy';
import { certificateFact, studyFact } from './catalogState';

export function ExternalCourseDrawer({ id, returnTo, onClose }: { id: string; returnTo: string; onClose: () => void }) {
  const { tr, ar, date, status } = useCourseCopy();
  const [course, setCourse] = useState<CourseDto>();
  const [source, setSource] = useState<ImportedCourseAdminDetail>();
  const [error, setError] = useState('');
  const [sourceError, setSourceError] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setCourse(undefined); setSource(undefined); setError(''); setSourceError(false);
    adminApiClient.request<CourseDto>(`/admin/courses/${encodeURIComponent(id)}`, { signal: controller.signal }).then(result => {
      if (controller.signal.aborted) return;
      if (result.originType !== 'EXTERNAL_LINKED_COURSE') throw new Error(tr('هذا السجل ليس دورة خارجية.', 'This is not an external course.'));
      setCourse(result);
    }).catch(error => { if (!controller.signal.aborted) setError(error.message); });
    adminApiClient.request<ImportedCourseAdminDetail>(`/admin/courses/imported/${encodeURIComponent(id)}`, { signal: controller.signal }).then(result => {
      if (!controller.signal.aborted) setSource(result);
    }).catch(() => { if (!controller.signal.aborted) setSourceError(true); });
    return () => controller.abort();
  }, [id, refresh, tr]);
  const absent = tr('غير متوفر', 'Unavailable');
  const value = (label: string, content: unknown) => <div className="course-detail-value"><dt>{label}</dt><dd dir="auto">{typeof content === 'string' && content.trim() ? content : typeof content === 'number' ? content : absent}</dd></div>;
  const safeUrl = (input?: string) => { try { return input && new URL(input).protocol === 'https:' ? input : undefined; } catch { return undefined; } };
  const directUrl = safeUrl(course?.directCourseUrl);
  const optional = course?.optionalFields;
  return <CourseDialog title={course?.displayName || tr('تفاصيل الدورة الخارجية', 'External course details')} onClose={onClose}>
    {error ? <div className="course-error" role="alert">{error}<button type="button" onClick={() => setRefresh(refresh + 1)}><RefreshCw size={16}/>{tr('إعادة المحاولة', 'Retry')}</button></div> : !course ? <p role="status">{tr('جارٍ تحميل تفاصيل الدورة…', 'Loading course details…')}</p> : <>
      <div className="course-drawer-toolbar"><span className="course-badge">{status(course.status)}</span>{directUrl && <a href={directUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={16}/>{tr('صفحة الدورة لدى المصدر', 'Official course page')}</a>}<Link to={`/courses/${encodeURIComponent(id)}?returnTo=${encodeURIComponent(returnTo)}`}><Pencil size={16}/>{tr('أدوات التحرير والمراجعة الحالية', 'Existing editing and review tools')}</Link></div>
      <div className="course-detail-groups">
        <section className="course-panel"><h3><Building2 size={18}/>{tr('بيانات الدورة الأساسية', 'Course identity')}</h3><dl>
          {value(tr('اسم العرض', 'Display title'), course.displayName)}{value(tr('العنوان الأصلي', 'Source title'), course.originalSourceTitle)}{value(tr('المزود المعتمد', 'Canonical provider'), source?.provider?.displayName)}{value(tr('اسم منصة المصدر', 'Source platform'), course.platformName)}
          {value(tr('رابط الدورة الأصلي', 'Original course URL'), course.directCourseUrl)}{value(tr('الرمز', 'Code'), course.publicId)}
        </dl></section>
        <section className="course-panel"><h3><GraduationCap size={18}/>{tr('التعلم والتصنيف', 'Learning and classification')}</h3><dl>
          {value(tr('لغة المصدر', 'Source language'), course.learningLanguageRaw)}{value(tr('لغة التدريس', 'Learning language'), course.learningLanguage)}{value(tr('المستوى الأصلي', 'Source level'), course.studyLevelRaw)}{value(tr('المستوى الموحد', 'Normalized level'), course.difficultyLevel)}{value(tr('المدة الأصلية', 'Source duration'), course.studyDurationRaw)}{value(tr('المدة المعتمدة', 'Reviewed duration'), course.studyDuration)}{value(tr('المجال', 'Field'), course.category)}{value(tr('الموضوعات من المصدر', 'Source topics'), course.shortCourseTopicsRaw)}
        </dl></section>
        <section className="course-panel"><h3><ShieldCheck size={18}/>{tr('الدراسة والشهادة', 'Study and certificate')}</h3><dl>
          {value(tr('إتاحة الدراسة', 'Study access'), studyLabels[studyFact(course)][ar ? 0 : 1])}{value(tr('حالة الشهادة', 'Certificate status'), certificateLabels[certificateFact(course)][ar ? 0 : 1])}{value(tr('نوع الشهادة', 'Certificate type'), course.certificateType)}
        </dl></section>
        <section className="course-panel"><h3><BookOpen size={18}/>{tr('الوصف والمحتوى الموثق', 'Documented description and content')}</h3><dl>{value(tr('الوصف', 'Description'), optional?.description)}{value(tr('المحتوى', 'Content'), optional?.courseContent)}{value(tr('مخرجات التعلم', 'Learning outcomes'), Array.isArray(optional?.learningOutcomes) ? optional.learningOutcomes.filter(item => typeof item === 'string').join('\n') : undefined)}</dl></section>
        <section className="course-panel course-source-group"><h3><FileText size={18}/>{tr('المصدر والمراجعة والنشر', 'Source, review and publication')}</h3>
          {sourceError && <p className="course-error" role="alert">{tr('تفاصيل المصدر لم تُقرأ؛ لا يعني ذلك غيابها.', 'Source details could not be read; this does not mean they are absent.')} <button type="button" onClick={() => setRefresh(refresh + 1)}>{tr('إعادة المحاولة', 'Retry')}</button></p>}
          <dl>{value(tr('آخر تعديل', 'Last updated'), date(String(course.updatedAt)))}{value(tr('آخر فحص رابط', 'Last link check'), source?.linkCheckedAt ? date(String(source.linkCheckedAt)) : undefined)}{value(tr('معرف سجل الاستيراد', 'Import record'), course.sourceImportRecordId)}{value(tr('إصدار السجل', 'Record version'), course.version)}{value(tr('الرابط الرسمي', 'Official source URL'), course.officialSourceUrl)}{value(tr('المفتاح الأصلي لدى المزود', 'Provider source key'), source?.sourceIdentity?.sourceNativeKey)}</dl>
          {source && <p className="course-hint">{tr('سجلات تتبع الحقول', 'Field provenance records')}: {source.provenance.length}. {tr('المعلومات الخام محفوظة ضمن سجل الاستيراد، ويخضع تغيير هوية الرابط لمسار الاستيراد المعتمد.', 'Raw data remains in its import record. URL identity changes use the controlled import workflow.')}</p>}
        </section>
      </div>
    </>}
  </CourseDialog>;
}
