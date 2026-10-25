import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type {
  CourseDto,
  CourseCurriculumSnapshotDto,
  CourseEnrollmentPolicyDto,
} from '@manaratak/domain';
import { reviewReasonHeaders } from '@manaratak/shared';
import {
  BookOpen,
  Layers,
  Users,
  ClipboardCheck,
  Award,
  Save,
  ArrowLeft,
  RefreshCw,
  Eye,
  ShieldCheck,
  FileQuestion,
} from 'lucide-react';
import { adminApiClient } from '../../api/client';
import { CourseQuestionBanksPanel } from '../../components/CourseQuestionBanksPanel';
import { AssessmentReviewPanel } from '../../components/AssessmentReviewPanel';
import { OwnerDescriptionTranslationPanel } from '../../components/OwnerDescriptionTranslationPanel';
import { AssetPicker } from '../../components/AssetPicker';
import {
  NativeCourseCurriculumPanel,
  type NativeCourseCommand,
} from './NativeCourseCurriculumPanel';
import { NativeCourseStudentsPanel } from './NativeCourseStudentsPanel';
import { NativeCourseReportsPanel } from './NativeCourseReportsPanel';
import { ExternalCourseRelationships } from './ExternalCourseRelationships';
import { useCourseCopy } from './useCourseCopy';
import './courses.css';
type Readiness = {
  ready: boolean;
  percentage: number;
  checks: Array<{ key: string; label: string; state: string; message?: string }>;
};
type EditorData = {
  course: CourseDto;
  curriculum: CourseCurriculumSnapshotDto;
  policy: CourseEnrollmentPolicyDto | null;
  readiness: Readiness;
};
export function NativeCourseEditorPage() {
  const { id = '' } = useParams(),
    [params, setParams] = useSearchParams(),
    navigate = useNavigate();
  const { tr, ar, status: statusLabel, number } = useCourseCopy();
  const [data, setData] = useState<EditorData>(),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [dirty, setDirty] = useState(false);
  const [reason, setReason] = useState(''),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const loadGeneration = useRef(0);
  const tab = params.get('tab') ?? 'basics';
  const returnTo =
    params.get('returnTo')?.startsWith('/courses') && !params.get('returnTo')?.startsWith('//')
      ? params.get('returnTo')!
      : '/courses/native';
  const load = useCallback(async () => {
    const generation = ++loadGeneration.current;
    setLoading(true);
    setError('');
    try {
      const [course, curriculum, policy, readiness] = await Promise.all([
        adminApiClient.request<CourseDto>(`/admin/courses/${id}`),
        adminApiClient.request<CourseCurriculumSnapshotDto>(`/admin/courses/${id}/curriculum`),
        adminApiClient.request<CourseEnrollmentPolicyDto | null>(
          `/admin/courses/${id}/enrollment-policy`,
        ),
        adminApiClient.request<Readiness>(`/admin/courses/${id}/readiness`),
      ]);
      if (generation !== loadGeneration.current) return;
      if (course.originType !== 'NATIVE_MANARATAK_COURSE') throw Error('NATIVE_COURSE_REQUIRED');
      setData({ course, curriculum, policy, readiness });
      setDirty(false);
    } catch (error) {
      if (generation === loadGeneration.current)
        setError(error instanceof Error ? error.message : 'COURSE_READ_FAILED');
      throw error;
    } finally {
      if (generation === loadGeneration.current) setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    const requests = loadGeneration;
    setData(undefined);
    void load().catch(() => undefined);
    return () => {
      ++requests.current;
    };
  }, [load]);
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    const links = (event: MouseEvent) => {
      const link = (event.target as Element).closest?.('a[href]');
      if (
        link &&
        !window.confirm(tr('تجاهل التعديلات غير المحفوظة؟', 'Discard unsaved changes?'))
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    const navigation = (window as unknown as { navigation?: EventTarget }).navigation;
    const traverse = (event: Event) => {
      if (
        (event as Event & { navigationType?: string }).navigationType === 'traverse' &&
        event.cancelable &&
        !window.confirm(tr('تجاهل التعديلات غير المحفوظة؟', 'Discard unsaved changes?'))
      )
        event.preventDefault();
    };
    window.addEventListener('beforeunload', unload);
    document.addEventListener('click', links, true);
    navigation?.addEventListener('navigate', traverse);
    return () => {
      window.removeEventListener('beforeunload', unload);
      document.removeEventListener('click', links, true);
      navigation?.removeEventListener('navigate', traverse);
    };
  }, [dirty, tr]);
  const changeDirty = (value: boolean) => {
    setDirty(value);
    if (value) setNotice('');
  };
  const confirmDiscard = () =>
    !dirty || window.confirm(tr('تجاهل التعديلات غير المحفوظة؟', 'Discard unsaved changes?'));
  const command: NativeCourseCommand = async (path, body, method = 'POST') => {
    if (!data || data.course.id !== id || busy || loading) throw Error('COURSE_COMMAND_BUSY');
    if (reason.trim().length < 3) {
      setError(tr('اكتب مبرر الإجراء قبل الحفظ.', 'Enter a reason before saving.'));
      throw Error('COURSE_REASON_REQUIRED');
    }
    setBusy(true);
    setError('');
    setNotice('');
    let committed = false;
    try {
      await adminApiClient.request(`/admin/courses/${id}${path ? '/' + path : ''}`, {
        method,
        headers: { ...reviewReasonHeaders(reason.trim()), 'If-Match': String(data.course.version) },
        body: JSON.stringify(body ?? {}),
      });
      committed = true;
      await load();
      setNotice(tr('حُفظت التغييرات في نسخة جديدة.', 'Changes saved in a new version.'));
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      setError(
        committed
          ? tr(
              'تم الحفظ، لكن تعذرت قراءة النسخة الجديدة. أعد القراءة قبل أي إجراء آخر.',
              'Saved, but reloading failed. Reload before another action.',
            )
          : /VERSION|409|CONFLICT/.test(message)
            ? tr(
                'تغيرت نسخة الدورة. تعديلاتك باقية؛ راجع النسخة الأحدث قبل إعادة الحفظ.',
                'The course version changed. Your draft is retained; review the current version before saving again.',
              )
            : message,
      );
      throw error;
    } finally {
      setBusy(false);
    }
  };
  const tabs = [
    ['basics', tr('المعلومات الأساسية', 'Basics'), BookOpen],
    ['enrollment', tr('التسجيل والإتاحة', 'Enrollment and access'), ShieldCheck],
    ['curriculum', tr('المنهج والمحاضرات', 'Curriculum and lectures'), Layers],
    ['assessments', tr('التقييمات', 'Assessments'), FileQuestion],
    ['completion', tr('الإكمال والشهادة', 'Completion and certificate'), Award],
    ['publication', tr('المعاينة والنشر', 'Preview and publication'), Eye],
    ['students', tr('الطلاب والتقدم', 'Learners and progress'), Users],
    ['reports', tr('التقارير', 'Reports'), ClipboardCheck],
  ] as const;
  const readonly = !data || ['PUBLISHED', 'ARCHIVED', 'REJECTED'].includes(data.course.status);
  return (
    <main className="courses-workspace native-editor" dir={ar ? 'rtl' : 'ltr'}>
      <section className="course-hero">
        <span>
          <BookOpen size={18} />
          {tr('محرر دورات منارتك', 'Manaratak course editor')}
        </span>
        <h1>{data?.course.displayName ?? tr('الدورة', 'Course')}</h1>
        <div className="course-drawer-toolbar">
          <span>{data ? statusLabel(data.course.status) : '—'}</span>
          <span>
            {tr('النسخة', 'Version')}: {data ? number(data.course.version) : '—'}
          </span>
          <span>{dirty ? tr('تعديلات غير محفوظة', 'Unsaved changes') : tr('محفوظ', 'Saved')}</span>
        </div>
      </section>
      <div className="course-toolbar">
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (confirmDiscard()) navigate(returnTo);
          }}
        >
          <ArrowLeft size={16} />
          {tr('العودة للدورات', 'Back to courses')}
        </button>
        <button
          type="button"
          disabled={busy || loading}
          onClick={() => {
            if (confirmDiscard()) void load().catch(() => undefined);
          }}
        >
          <RefreshCw size={16} />
          {tr('قراءة النسخة الأحدث', 'Reload current version')}
        </button>
        <Link to={`/courses/${id}?returnTo=${encodeURIComponent(returnTo)}`}>
          {tr('أدوات الإدارة المتقدمة الحالية', 'Existing advanced administration')}
        </Link>
      </div>
      <label className="course-field course-reason-field">
        <span>{tr('مبرر الإجراء', 'Action reason')}</span>
        <input
          value={reason}
          maxLength={2000}
          onChange={(event) => setReason(event.target.value)}
          placeholder={tr('سبب واضح للحفظ أو المراجعة', 'Reason for editing or reviewing')}
        />
      </label>
      {error && (
        <p role="alert" className="course-error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="course-success">
          {notice}
        </p>
      )}
      <nav
        className="native-editor-tabs"
        aria-label={tr('أقسام محرر الدورة', 'Course editor sections')}
      >
        {tabs.map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            aria-current={tab === key ? 'page' : undefined}
            disabled={busy}
            onClick={() => {
              if (!confirmDiscard()) return;
              if (dirty) void load().catch(() => undefined);
              setDirty(false);
              setParams((previous) => {
                const next = new URLSearchParams(previous);
                next.set('tab', key);
                return next;
              });
            }}
          >
            <Icon size={17} />
            {label}
          </button>
        ))}
      </nav>
      {loading && !data ? (
        <p role="status">{tr('جارٍ قراءة الدورة…', 'Loading course…')}</p>
      ) : (
        data && (
          <fieldset
            className="native-editor-content"
            key={data.course.version}
            disabled={busy || loading}
          >
            {readonly && (
              <p className="course-hint">
                {tr(
                  'المحتوى المنشور محفوظ للطلاب. ألغِ النشر قبل تحرير نسخة لاحقة؛ النسخ التاريخية والتقدم محفوظان.',
                  'Published learning content is preserved. Unpublish before editing a later version; historical versions and progress remain.',
                )}
              </p>
            )}
            {tab === 'basics' && (
              <>
                <NativeBasics
                  course={data.course}
                  busy={busy}
                  readonly={readonly}
                  onDirty={changeDirty}
                  command={command}
                />
                <OwnerDescriptionTranslationPanel
                  domain="COURSE"
                  ownerId={id}
                  endpoint="/admin/courses"
                  optionalFields={data.course.optionalFields}
                  status={data.course.status}
                  onSaved={load}
                />
                <ExternalCourseRelationships
                  id={id}
                  editable={!readonly}
                  busy={busy}
                  command={(path, body) => command(path, body).catch(() => undefined)}
                />
              </>
            )}
            {tab === 'enrollment' && (
              <NativeEnrollment
                policy={data.policy}
                course={data.course}
                busy={busy}
                readonly={readonly}
                onDirty={changeDirty}
                command={command}
              />
            )}
            {tab === 'curriculum' && (
              <NativeCourseCurriculumPanel
                id={id}
                version={data.course.version}
                status={data.course.status}
                snapshot={data.curriculum}
                busy={busy}
                dirty={dirty}
                onDirty={changeDirty}
                command={command}
                reload={load}
              />
            )}
            {tab === 'assessments' && (
              <>
                <NativeAssessments
                  snapshot={data.curriculum}
                  busy={busy}
                  readonly={readonly}
                  command={command}
                  onDirty={changeDirty}
                />
                <CourseQuestionBanksPanel
                  courseId={id}
                  version={data.course.version}
                  status={data.course.status}
                  snapshot={data.curriculum}
                  onSaved={load}
                />
                <AssessmentReviewPanel courseId={id} />
              </>
            )}
            {tab === 'completion' && (
              <NativeCompletion
                course={data.course}
                readonly={readonly}
                busy={busy}
                onDirty={changeDirty}
                command={command}
              />
            )}
            {tab === 'publication' && (
              <section className="course-panel native-publication">
                <h2>
                  <Eye size={18} />
                  {tr('المعاينة والجاهزية', 'Preview and readiness')}
                </h2>
                <p>
                  {tr(
                    'المعاينة إدارية وليست رابطًا عامًا لمسودة.',
                    'This is an administrative preview, not a public draft URL.',
                  )}
                </p>
                <div className="native-preview-grid">
                  {data.curriculum.modules
                    .filter((module) => module.status !== 'ARCHIVED')
                    .map((module) => (
                      <section key={module.id}>
                        <h3>{module.title}</h3>
                        {data.curriculum.lessons
                          .filter(
                            (lesson) =>
                              lesson.moduleId === module.id && lesson.status !== 'ARCHIVED',
                          )
                          .map((lesson) => (
                            <article key={lesson.id}>
                              <h4>{lesson.title}</h4>
                              {lesson.contentText && (
                                <p className="native-preserved-text">{lesson.contentText}</p>
                              )}
                              {(data.curriculum.contentBlocks ?? [])
                                .filter((block) => block.lessonId === lesson.id)
                                .sort((a, b) => a.position - b.position)
                                .map((block) => (
                                  <div className="native-preview-block" key={block.id}>
                                    <small>{block.type}</small>
                                    {block.type === 'TABLE' ? (
                                      <pre>
                                        {(block.payload.rows as string[][])
                                          .map((row) => row.join(' | '))
                                          .join('\n')}
                                      </pre>
                                    ) : (
                                      <p className="native-preserved-text">
                                        {String(
                                          block.payload.text ??
                                            block.payload.title ??
                                            block.payload.alt ??
                                            '',
                                        )}
                                      </p>
                                    )}
                                    {block.assetReferenceId && (
                                      <p>
                                        {data.curriculum.assets.find(
                                          (asset) => asset.id === block.assetReferenceId,
                                        )?.title ?? tr('ملف محمي', 'Protected attachment')}
                                      </p>
                                    )}
                                  </div>
                                ))}
                            </article>
                          ))}
                      </section>
                    ))}
                </div>
                <h3>
                  {tr('فحص النشر', 'Publication checks')} — {number(data.readiness.percentage)}%
                </h3>
                <ul className="native-readiness-list">
                  {data.readiness.checks.map((check) => (
                    <li key={check.key} data-state={check.state}>
                      <strong>{check.label}</strong>
                      <span>{check.message ?? check.state}</span>
                    </li>
                  ))}
                </ul>
                <div className="course-drawer-toolbar">
                  {data.course.status !== 'PUBLISHED' && data.course.status !== 'ARCHIVED' && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void command('mark-ready', {}).catch(() => undefined)}
                    >
                      {tr('إرسال للمراجعة', 'Submit for review')}
                    </button>
                  )}
                  {data.course.status === 'READY_TO_REVIEW' && (
                    <button
                      type="button"
                      disabled={busy || !data.readiness.ready}
                      onClick={() => void command('mark-publishable', {}).catch(() => undefined)}
                    >
                      {tr('اعتماد الجاهزية', 'Approve readiness')}
                    </button>
                  )}
                  {data.course.status === 'READY_TO_PUBLISH' && (
                    <button
                      type="button"
                      className="course-primary"
                      disabled={busy || !data.readiness.ready}
                      onClick={() => void command('publish', {}).catch(() => undefined)}
                    >
                      {tr('نشر الدورة', 'Publish course')}
                    </button>
                  )}
                  {data.course.status === 'PUBLISHED' && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        if (
                          window.confirm(
                            tr(
                              'إلغاء النشر؟ تبقى النسخ التاريخية والتقدم.',
                              'Unpublish? Historical versions and progress remain.',
                            ),
                          )
                        )
                          void command('unpublish', {}).catch(() => undefined);
                      }}
                    >
                      {tr('إلغاء النشر', 'Unpublish')}
                    </button>
                  )}
                  {!['ARCHIVED', 'REJECTED'].includes(data.course.status) && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        if (
                          window.confirm(
                            tr(
                              'أرشفة الدورة؟ لن تقبل تسجيلات جديدة.',
                              'Archive this course? New enrollments will be closed.',
                            ),
                          )
                        )
                          void command('archive', {}).catch(() => undefined);
                      }}
                    >
                      {tr('أرشفة', 'Archive')}
                    </button>
                  )}
                </div>
              </section>
            )}
            {tab === 'students' && <NativeCourseStudentsPanel id={id} />}
            {tab === 'reports' && <NativeCourseReportsPanel id={id} />}
          </fieldset>
        )
      )}
    </main>
  );
}

function NativeBasics({
  course,
  busy,
  readonly,
  onDirty,
  command,
}: {
  course: CourseDto;
  busy: boolean;
  readonly: boolean;
  onDirty: (value: boolean) => void;
  command: NativeCourseCommand;
}) {
  const { tr } = useCourseCopy(),
    extras = course.optionalFields ?? {};
  const [form, setForm] = useState<Record<string, string>>(() =>
      Object.fromEntries(
        [
          'displayName',
          'description',
          'instructor',
          'learningLanguage',
          'category',
          'difficultyLevel',
          'studyDuration',
          'prerequisites',
          'targetAudience',
          'learningOutcomes',
          'acquiredSkills',
        ].map((key) => {
          const value =
            key in course ? (course as unknown as Record<string, unknown>)[key] : extras[key];
          return [
            key,
            Array.isArray(value) ? value.join('\n') : typeof value === 'string' ? value : '',
          ];
        }),
      ),
    ),
    [cover, setCover] = useState(course.thumbnailAssetId ?? '');
  const lists = ['prerequisites', 'targetAudience', 'learningOutcomes', 'acquiredSkills'];
  const fields = [
    ['displayName', tr('اسم الدورة', 'Course name')],
    ['description', tr('الوصف', 'Description')],
    ['instructor', tr('المدرب أو الفريق', 'Instructor or team')],
    ['learningLanguage', tr('لغة التدريس', 'Learning language')],
    ['category', tr('المجال', 'Field')],
    ['difficultyLevel', tr('المستوى', 'Level')],
    ['studyDuration', tr('المدة التقديرية', 'Estimated duration')],
    ['prerequisites', tr('المتطلبات — عنصر لكل سطر', 'Prerequisites — one per line')],
    ['targetAudience', tr('الفئة المستهدفة — عنصر لكل سطر', 'Audience — one per line')],
    ['learningOutcomes', tr('مخرجات التعلم — عنصر لكل سطر', 'Outcomes — one per line')],
    ['acquiredSkills', tr('المهارات — عنصر لكل سطر', 'Skills — one per line')],
  ];
  return (
    <form
      className="course-panel course-section-form native-basics"
      onSubmit={(event) => {
        event.preventDefault();
        void command(
          '',
          {
            ...form,
            ...Object.fromEntries(
              lists.map((key) => [
                key,
                form[key]
                  .split('\n')
                  .map((value) => value.trim())
                  .filter(Boolean),
              ]),
            ),
            thumbnailAssetId: cover || null,
          },
          'PATCH',
        ).catch(() => undefined);
      }}
    >
      <h2>
        <BookOpen size={18} />
        {tr('المعلومات الأساسية', 'Basic information')}
      </h2>
      <fieldset disabled={busy || readonly}>
        <div className="course-filter-grid">
          {fields.map(([key, label]) => (
            <label className="course-field" key={key}>
              <span>{label}</span>
              {key === 'description' || lists.includes(key) ? (
                <textarea
                  value={form[key]}
                  maxLength={50000}
                  onChange={(event) => {
                    setForm({ ...form, [key]: event.target.value });
                    onDirty(true);
                  }}
                />
              ) : (
                <input
                  required={key === 'displayName'}
                  maxLength={500}
                  value={form[key]}
                  onChange={(event) => {
                    setForm({ ...form, [key]: event.target.value });
                    onDirty(true);
                  }}
                />
              )}
            </label>
          ))}
        </div>
        <AssetPicker
          purpose="COURSE_THUMBNAIL"
          value={cover}
          onChange={(value) => {
            setCover(value);
            onDirty(true);
          }}
          mimeTypePrefix="image/"
        />
        <button className="course-primary" type="submit">
          <Save size={16} />
          {tr('حفظ المعلومات', 'Save information')}
        </button>
      </fieldset>
    </form>
  );
}

function NativeEnrollment({
  course,
  policy,
  busy,
  readonly,
  command,
  onDirty,
}: {
  course: CourseDto;
  policy: CourseEnrollmentPolicyDto | null;
  busy: boolean;
  readonly: boolean;
  command: NativeCourseCommand;
  onDirty: (value: boolean) => void;
}) {
  const { tr } = useCourseCopy();
  const [limited, setLimited] = useState(policy?.isCapacityLimited ?? false),
    [seats, setSeats] = useState(String(policy?.maximumSeats ?? '')),
    [waitlist, setWaitlist] = useState(policy?.waitlistEnabled ?? false);
  return (
    <form
      className="course-panel course-section-form"
      onSubmit={(event) => {
        event.preventDefault();
        void command(
          'enrollment-policy',
          {
            isCapacityLimited: limited,
            maximumSeats: limited ? Number(seats) : null,
            waitlistEnabled: waitlist,
            requiresApproval: policy?.requiresApproval ?? false,
            eligibilityRules: policy?.eligibilityRules ?? null,
            prerequisiteCourseIds: policy?.prerequisiteCourseIds ?? [],
            requiresFinancialClearance:
              policy?.requiresFinancialClearance ?? course.accessType === 'PAID',
          },
          'PUT',
        ).catch(() => undefined);
      }}
    >
      <h2>
        <ShieldCheck size={18} />
        {tr('سياسة التسجيل والإتاحة', 'Enrollment and access policy')}
      </h2>
      <p>
        {tr(
          'بوابات الاستحقاق المالي الحالية محفوظة. الأسعار والخصومات والتحصيل مؤجلة إلى نطاق المالية؛ لا تمنح هذه الشاشة وصولًا مدفوعًا.',
          'Existing financial clearance gates remain. Pricing, discounts and collections are deferred to Finance; this screen does not grant paid access.',
        )}
      </p>
      <fieldset disabled={busy || readonly}>
        <label>
          <input
            type="checkbox"
            checked={limited}
            onChange={(event) => {
              setLimited(event.target.checked);
              onDirty(true);
            }}
          />
          {tr('تحديد عدد المقاعد', 'Limit seats')}
        </label>
        {limited && (
          <label className="course-field">
            <span>{tr('المقاعد', 'Seats')}</span>
            <input
              type="number"
              min={1}
              required
              value={seats}
              onChange={(event) => {
                setSeats(event.target.value);
                onDirty(true);
              }}
            />
          </label>
        )}
        <label>
          <input
            type="checkbox"
            checked={waitlist}
            onChange={(event) => {
              setWaitlist(event.target.checked);
              onDirty(true);
            }}
          />
          {tr('قائمة انتظار عند امتلاء المقاعد', 'Waitlist when seats are full')}
        </label>
        <p className="course-hint">
          {tr(
            'الموافقة اليدوية وشروط الأهلية المتقدمة لا تُفعّل من هذه الشاشة لعدم اكتمال سير القبول. أي سياسة قائمة تبقى محفوظة وتطبقها البوابة الحالية.',
            'Manual approval and advanced eligibility cannot be enabled here until acceptance workflows are complete. Existing policies remain intact and are enforced.',
          )}
        </p>
        <button type="submit" className="course-primary">
          <Save size={16} />
          {tr('حفظ سياسة التسجيل', 'Save enrollment policy')}
        </button>
      </fieldset>
    </form>
  );
}

function NativeCompletion({
  course,
  busy,
  readonly,
  command,
  onDirty,
}: {
  course: CourseDto;
  busy: boolean;
  readonly: boolean;
  command: NativeCourseCommand;
  onDirty: (value: boolean) => void;
}) {
  const { tr } = useCourseCopy(),
    criteria = (course.optionalFields?.completionCriteria ?? {}) as Record<string, unknown>;
  const [assessment, setAssessment] = useState(criteria.assessmentRequired === true),
    [certificate, setCertificate] = useState(course.certificateAvailable === true);
  return (
    <form
      className="course-panel course-section-form"
      onSubmit={(event) => {
        event.preventDefault();
        void command(
          '',
          {
            certificateAvailable: certificate,
            completionCriteria: { ...criteria, assessmentRequired: assessment },
          },
          'PATCH',
        ).catch(() => undefined);
      }}
    >
      <h2>
        <Award size={18} />
        {tr('الإكمال وأهلية الشهادة', 'Completion and certificate eligibility')}
      </h2>
      <p>
        {tr(
          'الإكمال يتطلب 100% من التقدم المحفوظ. الشهادات يصدرها نطاق الشهادات بعد حدث إكمال معتمد؛ هذا النموذج لا يصدر شهادة ولا يحدد رسومًا.',
          'Completion requires 100% saved progress. Certificates owns issuance after a verified completion event; this form neither issues certificates nor sets fees.',
        )}
      </p>
      <fieldset disabled={readonly || busy}>
        <label>
          <input
            type="checkbox"
            checked={assessment}
            onChange={(event) => {
              setAssessment(event.target.checked);
              onDirty(true);
            }}
          />
          {tr('اشتراط اجتياز التقييمات', 'Require passing assessments')}
        </label>
        <label>
          <input
            type="checkbox"
            checked={certificate}
            onChange={(event) => {
              setCertificate(event.target.checked);
              onDirty(true);
            }}
          />
          {tr('إتاحة شهادة عند الاستحقاق', 'Certificate eligibility enabled')}
        </label>
        <button type="submit" className="course-primary">
          <Save size={16} />
          {tr('حفظ سياسة الإكمال', 'Save completion policy')}
        </button>
      </fieldset>
    </form>
  );
}

function NativeAssessments({
  snapshot,
  busy,
  readonly,
  command,
  onDirty,
}: {
  snapshot: CourseCurriculumSnapshotDto;
  busy: boolean;
  readonly: boolean;
  command: NativeCourseCommand;
  onDirty: (value: boolean) => void;
}) {
  const { tr } = useCourseCopy();
  const [title, setTitle] = useState(''),
    [lessonId, setLessonId] = useState(''),
    [quizId, setQuizId] = useState(snapshot.quizzes[0]?.id ?? ''),
    [prompt, setPrompt] = useState(''),
    [choices, setChoices] = useState(''),
    [answer, setAnswer] = useState(''),
    [passingScore, setPassingScore] = useState('70'),
    [attempts, setAttempts] = useState('3'),
    [points, setPoints] = useState('1');
  return (
    <section className="course-panel native-assessments">
      <h2>
        <FileQuestion size={18} />
        {tr('بناء التقييمات', 'Assessment authoring')}
      </h2>
      <fieldset disabled={readonly || busy}>
        <form
          className="course-section-form"
          onSubmit={(event) => {
            event.preventDefault();
            const lesson = snapshot.lessons.find((lesson) => lesson.id === lessonId);
            void command('quizzes', {
              title,
              ...(lesson ? { lessonId, moduleId: lesson.moduleId } : {}),
              passingScore: Number(passingScore),
              maxAttempts: attempts ? Number(attempts) : null,
              position: Math.max(0, ...snapshot.quizzes.map((quiz) => quiz.position)) + 1,
            }).catch(() => undefined);
          }}
        >
          <label className="course-field">
            <span>{tr('عنوان الاختبار', 'Assessment title')}</span>
            <input
              required
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                onDirty(true);
              }}
            />
          </label>
          <label className="course-field">
            <span>{tr('موضع الاختبار', 'Assessment location')}</span>
            <select
              aria-label={tr('موضع الاختبار', 'Assessment location')}
              value={lessonId}
              onChange={(event) => {
                setLessonId(event.target.value);
                onDirty(true);
              }}
            >
              <option value="">{tr('ختامي للدورة', 'Course final')}</option>
              {snapshot.lessons
                .filter((lesson) => lesson.status !== 'ARCHIVED')
                .map((lesson) => (
                  <option key={lesson.id} value={lesson.id}>
                    {lesson.title}
                  </option>
                ))}
            </select>
          </label>
          <label className="course-field">
            <span>{tr('درجة النجاح %', 'Passing score %')}</span>
            <input
              type="number"
              min={0}
              max={100}
              required
              value={passingScore}
              onChange={(event) => {
                setPassingScore(event.target.value);
                onDirty(true);
              }}
            />
          </label>
          <label className="course-field">
            <span>{tr('حد المحاولات — فارغ دون حد', 'Attempt limit — blank for unlimited')}</span>
            <input
              type="number"
              min={1}
              value={attempts}
              onChange={(event) => {
                setAttempts(event.target.value);
                onDirty(true);
              }}
            />
          </label>
          <button type="submit">{tr('إضافة الاختبار', 'Add assessment')}</button>
        </form>
        <form
          className="course-section-form"
          onSubmit={(event) => {
            event.preventDefault();
            const options = choices
              .split('\n')
              .map((value) => value.trim())
              .filter(Boolean);
            if (!options.includes(answer)) return;
            void command('questions', {
              quizId,
              questionType: 'MULTIPLE_CHOICE',
              prompt,
              choices: options,
              correctAnswer: answer,
              points: Number(points),
              position:
                Math.max(
                  0,
                  ...snapshot.questions
                    .filter((question) => question.quizId === quizId)
                    .map((question) => question.position),
                ) + 1,
            }).catch(() => undefined);
          }}
        >
          <h3>{tr('سؤال متعدد الخيارات', 'Multiple-choice question')}</h3>
          <label className="course-field">
            <span>{tr('الاختبار', 'Assessment')}</span>
            <select
              aria-label={tr('الاختبار', 'Assessment')}
              required
              value={quizId}
              onChange={(event) => {
                setQuizId(event.target.value);
                onDirty(true);
              }}
            >
              <option value="">{tr('اختر اختبارًا', 'Choose assessment')}</option>
              {snapshot.quizzes
                .filter((quiz) => quiz.status !== 'ARCHIVED')
                .map((quiz) => (
                  <option value={quiz.id} key={quiz.id}>
                    {quiz.title}
                  </option>
                ))}
            </select>
          </label>
          <label className="course-field">
            <span>{tr('السؤال', 'Question')}</span>
            <textarea
              required
              value={prompt}
              onChange={(event) => {
                setPrompt(event.target.value);
                onDirty(true);
              }}
            />
          </label>
          <label className="course-field">
            <span>{tr('الخيارات — خيار لكل سطر', 'Choices — one per line')}</span>
            <textarea
              required
              value={choices}
              onChange={(event) => {
                setChoices(event.target.value);
                setAnswer('');
                onDirty(true);
              }}
            />
          </label>
          <label className="course-field">
            <span>{tr('الإجابة الصحيحة', 'Correct answer')}</span>
            <select
              aria-label={tr('الإجابة الصحيحة', 'Correct answer')}
              required
              value={answer}
              onChange={(event) => {
                setAnswer(event.target.value);
                onDirty(true);
              }}
            >
              <option value="">{tr('اختر الإجابة', 'Choose answer')}</option>
              {choices
                .split('\n')
                .map((value) => value.trim())
                .filter(Boolean)
                .map((value, index) => (
                  <option value={value} key={index}>
                    {value}
                  </option>
                ))}
            </select>
          </label>
          <label className="course-field">
            <span>{tr('درجة السؤال', 'Question points')}</span>
            <input
              type="number"
              min={1}
              required
              value={points}
              onChange={(event) => {
                setPoints(event.target.value);
                onDirty(true);
              }}
            />
          </label>
          <button
            type="submit"
            disabled={choices.split('\n').filter((value) => value.trim()).length < 2}
          >
            {tr('حفظ السؤال', 'Save question')}
          </button>
        </form>
      </fieldset>
    </section>
  );
}
