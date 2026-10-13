import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { adminApiClient } from '../api/client';
import { useTranslation } from '../i18n/I18nProvider';

type PathCourse = {
  courseId: string;
  position: number;
  required: boolean;
  prerequisiteCourseIds: string[];
};
type LearningPath = {
  id: string;
  title: string;
  description?: string | null;
  version: number;
  status: string;
  isStrictlyOrdered: boolean;
  completionLogic: 'ALL' | 'ALL_REQUIRED';
  courses: PathCourse[];
};
type CourseChoice = { id: string; displayName: string; status: string; originType: string };
export function LearningPathsAdminPage() {
  const { pathId } = useParams();
  const { language } = useTranslation();
  const ar = language === 'ar';
  const tr = (a: string, b: string) => (ar ? a : b);
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [path, setPath] = useState<LearningPath | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [courses, setCourses] = useState<PathCourse[]>([]);
  const [choices, setChoices] = useState<CourseChoice[]>([]);
  const [search, setSearch] = useState('');
  const [strict, setStrict] = useState(false);
  const [logic, setLogic] = useState<'ALL' | 'ALL_REQUIRED'>('ALL_REQUIRED');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [notice, setNotice] = useState('');
  const generation = useRef(0);
  const writing = useRef(false);
  const draft = { title, description, isStrictlyOrdered: strict, completionLogic: logic, courses };
  const dirty = saved !== JSON.stringify(draft);
  const immutable = !!path && path.status !== 'DRAFT';
  const populate = (record: LearningPath) => {
    setPath(record);
    setTitle(record.title);
    setDescription(record.description ?? '');
    setCourses(record.courses);
    setStrict(record.isStrictlyOrdered);
    setLogic(record.completionLogic);
    setSaved(
      JSON.stringify({
        title: record.title,
        description: record.description ?? '',
        isStrictlyOrdered: record.isStrictlyOrdered,
        completionLogic: record.completionLogic,
        courses: record.courses,
      }),
    );
  };
  useEffect(() => {
    const run = ++generation.current;
    setError('');
    setPath(null);
    void (
      pathId
        ? adminApiClient.request<LearningPath>(
            `/admin/courses/learning-paths/${encodeURIComponent(pathId)}`,
          )
        : adminApiClient.request<{ data: LearningPath[] }>('/admin/courses/learning-paths')
    )
      .then((result) => {
        if (run !== generation.current) return;
        if ('data' in result) setPaths(result.data);
        else populate(result);
      })
      .catch((cause) => {
        if (run === generation.current) setError(String(cause));
      });
    return () => {
      ++generation.current;
    };
  }, [pathId]);
  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      void adminApiClient
        .request<{ data: CourseChoice[] }>(
          `/admin/courses?originType=NATIVE_MANARATAK_COURSE&page=1&pageSize=30&search=${encodeURIComponent(search)}`,
        )
        .then((result) => {
          if (active)
            setChoices(
              result.data.filter((course) => course.originType === 'NATIVE_MANARATAK_COURSE'),
            );
        })
        .catch((cause) => {
          if (active) {
            setChoices([]);
            setError(String(cause));
          }
        });
    }, 300);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [search]);
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (dirty && title) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty, title]);
  const move = (index: number, delta: number) => {
    const rows = [...courses];
    const target = index + delta;
    if (target < 0 || target >= rows.length) return;
    [rows[index], rows[target]] = [rows[target], rows[index]];
    setCourses(rows.map((row, i) => ({ ...row, position: i + 1 })));
  };
  const act = async (command?: 'mark-publishable' | 'publish' | 'archive') => {
    if (writing.current) return;
    if (reason.trim().length < 3) {
      setError(tr('اكتب سبب التعديل أو القرار.', 'Enter a review reason.'));
      return;
    }
    if (command && dirty) {
      setError(tr('احفظ التعديلات قبل القرار.', 'Save changes before this action.'));
      return;
    }
    if (command && !window.confirm(tr('تأكيد إجراء المسار؟', 'Confirm path action?'))) return;
    writing.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    const run = generation.current;
    let committed = false;
    try {
      const endpoint = path
        ? `/admin/courses/learning-paths/${encodeURIComponent(path.id)}${command ? `/${command}` : ''}`
        : '/admin/courses/learning-paths';
      const result = await adminApiClient.request<LearningPath>(endpoint, {
        method: command || !path ? 'POST' : 'PATCH',
        headers: {
          'X-Review-Reason': reason,
          ...(path ? { 'If-Match': `"${path.version}"` } : {}),
        },
        body: JSON.stringify(command ? {} : draft),
      });
      committed = true;
      if (run !== generation.current) return;
      populate(result);
      setNotice(
        tr(
          'تم الحفظ؛ النسخة المعروضة من استجابة المالك.',
          'Saved; the displayed version is the owner response.',
        ),
      );
      if (!pathId)
        setPaths(
          await adminApiClient
            .request<{ data: LearningPath[] }>('/admin/courses/learning-paths')
            .then((value) => value.data),
        );
    } catch (cause) {
      if (run === generation.current)
        setError(
          (committed
            ? tr(
                'تم الحفظ لكن تعذر تحديث القائمة؛ أعد التحميل. ',
                'Saved but list refresh failed; reload. ',
              )
            : '') + String(cause),
        );
    } finally {
      writing.current = false;
      if (run === generation.current) setBusy(false);
    }
  };
  return (
    <main className="mx-auto max-w-5xl space-y-4 p-5" dir={ar ? 'rtl' : 'ltr'}>
      <h1 className="text-xl font-bold">{tr('إدارة مسارات التعلم', 'Learning paths')}</h1>
      <Link to="/courses">{tr('الدورات', 'Courses')}</Link> ·{' '}
      <Link to="/courses/learning-paths">{tr('المسارات', 'Paths')}</Link>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {!pathId && (
        <ul>
          {paths.map((row) => (
            <li key={row.id}>
              <Link to={`/courses/learning-paths/${row.id}`}>{row.title}</Link> — {row.status} · v
              {row.version}
            </li>
          ))}
        </ul>
      )}
      {pathId && !path ? (
        <p>{tr('تحميل المسار…', 'Loading path…')}</p>
      ) : (
        <>
          <p>
            {path ? `${path.status} · v${path.version}` : tr('مسار جديد', 'New path')}
            {dirty && title ? tr(' · تعديلات غير محفوظة', ' · Unsaved changes') : ''}
          </p>
          <fieldset disabled={busy || immutable} className="space-y-3 rounded border p-4">
            <label className="block">
              {tr('العنوان', 'Title')}
              <input
                className="mx-2 rounded border p-2"
                maxLength={240}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            <label className="block">
              {tr('الوصف', 'Description')}
              <textarea
                className="mx-2 rounded border p-2"
                maxLength={6000}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={strict}
                onChange={(event) => setStrict(event.target.checked)}
              />
              {tr('تسلسل إلزامي', 'Strict course ordering')}
            </label>
            <label>
              {tr('شرط الإتمام', 'Completion rule')}
              <select
                value={logic}
                onChange={(event) => setLogic(event.target.value as 'ALL' | 'ALL_REQUIRED')}
              >
                <option value="ALL_REQUIRED">{tr('كل المقررات المطلوبة', 'All required')}</option>
                <option value="ALL">{tr('كل المقررات', 'All courses')}</option>
              </select>
            </label>
            <label className="block">
              {tr('بحث مقررات المالك — أول 30 نتيجة', 'Search owner courses — first 30 results')}
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="mx-2 rounded border p-2"
              />
            </label>
            <select
              aria-label={tr('إضافة مقرر', 'Add course')}
              value=""
              onChange={(event) => {
                if (!event.target.value) return;
                setCourses([
                  ...courses,
                  {
                    courseId: event.target.value,
                    position: courses.length + 1,
                    required: true,
                    prerequisiteCourseIds: [],
                  },
                ]);
              }}
            >
              <option value="">{tr('اختر مقررًا أصليًا', 'Select native course')}</option>
              {choices
                .filter((choice) => !courses.some((row) => row.courseId === choice.id))
                .map((choice) => (
                  <option key={choice.id} value={choice.id}>
                    {choice.displayName} — {choice.status}
                  </option>
                ))}
            </select>
            <ol>
              {courses.map((row, index) => (
                <li key={row.courseId} className="space-x-2 rounded border p-3">
                  <Link to={`/courses/${row.courseId}`}>
                    {choices.find((choice) => choice.id === row.courseId)?.displayName ??
                      tr('مقرر محفوظ — فتح التفاصيل', 'Saved course — open details')}
                  </Link>
                  <button
                    type="button"
                    aria-label={tr('نقل لأعلى', 'Move up')}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label={tr('نقل لأسفل', 'Move down')}
                    disabled={index === courses.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    ↓
                  </button>
                  <label>
                    <input
                      type="checkbox"
                      checked={row.required}
                      onChange={(event) =>
                        setCourses(
                          courses.map((item) =>
                            item.courseId === row.courseId
                              ? { ...item, required: event.target.checked }
                              : item,
                          ),
                        )
                      }
                    />
                    {tr('مطلوب', 'Required')}
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setCourses(
                        courses
                          .filter((item) => item.courseId !== row.courseId)
                          .map((item, i) => ({
                            ...item,
                            position: i + 1,
                            prerequisiteCourseIds: item.prerequisiteCourseIds.filter(
                              (id) => id !== row.courseId,
                            ),
                          })),
                      )
                    }
                  >
                    {tr('إزالة', 'Remove')}
                  </button>
                  <label>
                    {tr('متطلبات سابقة داخل المسار', 'Prerequisites in path')}
                    <select
                      multiple
                      value={row.prerequisiteCourseIds}
                      onChange={(event) =>
                        setCourses(
                          courses.map((item) =>
                            item.courseId === row.courseId
                              ? {
                                  ...item,
                                  prerequisiteCourseIds: Array.from(
                                    event.target.selectedOptions,
                                    (option) => option.value,
                                  ),
                                }
                              : item,
                          ),
                        )
                      }
                    >
                      {courses
                        .filter((item) => item.courseId !== row.courseId)
                        .map((item) => (
                          <option key={item.courseId} value={item.courseId}>
                            {choices.find((choice) => choice.id === item.courseId)?.displayName ??
                              `#${item.position}`}
                          </option>
                        ))}
                    </select>
                  </label>
                </li>
              ))}
            </ol>
          </fieldset>
          <label>
            {tr('سبب المراجعة', 'Review reason')}
            <input
              maxLength={2000}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="mx-2 rounded border p-2"
            />
          </label>
          <div className="flex gap-3">
            <button disabled={busy || immutable || !title.trim()} onClick={() => void act()}>
              {tr('حفظ المسار', 'Save path')}
            </button>
            {path?.status === 'DRAFT' && (
              <button disabled={busy || dirty} onClick={() => void act('mark-publishable')}>
                {tr('فحص الجاهزية واعتماد النشر', 'Check readiness and mark publishable')}
              </button>
            )}
            {path?.status === 'READY_TO_PUBLISH' && (
              <button disabled={busy || dirty} onClick={() => void act('publish')}>
                {tr('نشر', 'Publish')}
              </button>
            )}
            {path && path.status !== 'ARCHIVED' && (
              <button disabled={busy || dirty} onClick={() => void act('archive')}>
                {tr('أرشفة', 'Archive')}
              </button>
            )}
          </div>
          <p className="text-xs">
            {tr(
              'النسخ المنشورة لا تُعدّل. التسجيل والإتمام يتبعان نسخة المسار المحفوظة لدى المالك.',
              'Published versions cannot be edited. Enrollment/completion use the owner version.',
            )}
          </p>
        </>
      )}
    </main>
  );
}
