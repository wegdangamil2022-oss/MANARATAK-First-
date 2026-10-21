import { useEffect, useState } from 'react';
import type { LearningPathDto, LearningPathCourseDto } from '@manaratak/domain';
import { adminApiClient } from '../api/client';
import { CanonicalPicker } from './CanonicalPicker';
import { useAdminAuthorization } from '../security/AdminAuthorizationContext';

export function movePathCourse(
  rows: LearningPathCourseDto[],
  index: number,
  offset: number,
): LearningPathCourseDto[] {
  const next = [...rows];
  const target = index + offset;
  if (target < 0 || target >= rows.length) return rows;
  [next[index], next[target]] = [next[target], next[index]];
  return next.map((row, i) => ({ ...row, position: i + 1 }));
}
export function CourseLearningPathsWorkspace() {
  const { hasPermission } = useAdminAuthorization();
  const allowed = hasPermission('admin:courses:manage');
  const [paths, setPaths] = useState<LearningPathDto[]>([]);
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [current, setCurrent] = useState<LearningPathDto>();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [strict, setStrict] = useState(false);
  const [certificateEligible, setCertificateEligible] = useState(false);
  const [logic, setLogic] = useState<'ALL' | 'ALL_REQUIRED'>('ALL_REQUIRED');
  const [courses, setCourses] = useState<LearningPathCourseDto[]>([]);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [choice, setChoice] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!allowed) return;
    const controller = new AbortController();
    adminApiClient
      .request<{ data: LearningPathDto[] }>(
        `/admin/courses/learning-paths?page=${page}&pageSize=20`,
        { signal: controller.signal },
      )
      .then((result) => {
        if (!controller.signal.aborted) setPaths(result.data);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(error.message);
      });
    return () => controller.abort();
  }, [page, refresh, allowed]);
  if (!allowed) return null;
  const select = (path?: LearningPathDto) => {
    setCurrent(path);
    setTitle(path?.title ?? '');
    setDescription(path?.description ?? '');
    setStrict(path?.isStrictlyOrdered ?? false);
    setCertificateEligible(path?.certificateEligible === true);
    setLogic(path?.completionLogic ?? 'ALL_REQUIRED');
    setCourses(path?.courses ?? []);
    setError('');
  };
  const loadCourses: Parameters<typeof CanonicalPicker>[0]['load'] = async (query, page = 1) => {
    const params = new URLSearchParams({
      originType: 'NATIVE_MANARATAK_COURSE',
      page: String(page),
      pageSize: '50',
    });
    if (query) params.set('search', query);
    const response = await adminApiClient.request<{
      data: Array<{ id: string; displayName: string; status: string }>;
    }>(`/admin/courses?${params}`);
    return response.data.map((row) => ({
      id: row.id,
      label: row.displayName,
      lifecycle: row.status,
    }));
  };
  const mutate = async (action?: 'mark-publishable' | 'publish' | 'archive') => {
    if (busy || !reason.trim()) return;
    setBusy(true);
    setError('');
    try {
      const path = current
        ? `/admin/courses/learning-paths/${current.id}${action ? '/' + action : ''}`
        : '/admin/courses/learning-paths';
      const result = await adminApiClient.request<LearningPathDto>(path, {
        method: action || !current ? 'POST' : 'PATCH',
        headers: {
          'X-Review-Reason': reason.trim(),
          ...(current ? { 'If-Match': String(current.version) } : {}),
        },
        body: JSON.stringify(
          action
            ? {}
            : { title, description, isStrictlyOrdered: strict, completionLogic: logic, courses, certificateEligible },
        ),
      });
      select(result);
      setRefresh((value) => value + 1);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'تعذر الحفظ');
    } finally {
      setBusy(false);
    }
  };
  const editable = !current || current.status === 'DRAFT';
  return (
    <details className="rounded-2xl border bg-white p-4">
      <summary>تأليف مسارات التعلم</summary>
      <p>حفظ المسودة لا ينشرها. تحفظ النسخ السابقة وتقدم الملتحقين عند إنشاء نسخة جديدة.</p>
      {error && <p role="alert">{error}</p>}
      <div>
        {paths.map((path) => (
          <button key={path.id} disabled={busy} onClick={() => select(path)}>
            {path.title} · {path.status} · v{path.version}
          </button>
        ))}
      </div>
      <button disabled={busy || page === 1} onClick={() => setPage((value) => value - 1)}>
        السابق
      </button>
      <span> صفحة {page} </span>
      <button disabled={busy || paths.length < 20} onClick={() => setPage((value) => value + 1)}>
        التالي
      </button>
      <button disabled={busy} onClick={() => select()}>
        مسار جديد
      </button>
      <label>
        سبب القرار
        <textarea
          maxLength={2000}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </label>
      <fieldset disabled={busy || !editable} className="grid gap-3">
        <label>
          <input type="checkbox" checked={certificateEligible} onChange={(event) => setCertificateEligible(event.target.checked)} />
          إتاحة شهادة عند إتمام هذا الإصدار بعد اعتماده ونشره
        </label>
        <label>
          عنوان المسار
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label>
          الوصف
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>
        <label>
          <input
            type="checkbox"
            checked={strict}
            onChange={(event) => setStrict(event.target.checked)}
          />
          ترتيب تعلم إلزامي
        </label>
        <label>
          منطق الإكمال
          <select
            value={logic}
            onChange={(event) => setLogic(event.target.value as 'ALL' | 'ALL_REQUIRED')}
          >
            <option value="ALL_REQUIRED">كل الدورات المطلوبة</option>
            <option value="ALL">كل الدورات</option>
          </select>
        </label>
        <CanonicalPicker
          label="إضافة دورة داخلية"
          value={choice}
          onChange={(id, option) => {
            setChoice(id ?? '');
            if (id && option) setLabels((values) => ({ ...values, [id]: option.label }));
          }}
          load={loadCourses}
          paged
          reloadKey="learning-path-course"
        />
        <button
          disabled={
            !choice || courses.some((row) => row.courseId === choice) || courses.length >= 100
          }
          onClick={() => {
            setCourses((rows) => [
              ...rows,
              {
                courseId: choice,
                position: rows.length + 1,
                required: true,
                prerequisiteCourseIds: [],
              },
            ]);
            setChoice('');
          }}
        >
          إضافة الدورة
        </button>
        {courses.map((row, index) => (
          <div key={row.courseId} className="rounded border p-3">
            <strong>
              {row.position}. {labels[row.courseId] ?? row.courseId}
            </strong>
            <label>
              <input
                type="checkbox"
                checked={row.required}
                onChange={(event) =>
                  setCourses((rows) =>
                    rows.map((item) =>
                      item.courseId === row.courseId
                        ? { ...item, required: event.target.checked }
                        : item,
                    ),
                  )
                }
              />
              مطلوبة
            </label>
            <button
              disabled={index === 0}
              onClick={() => setCourses((rows) => movePathCourse(rows, index, -1))}
            >
              لأعلى
            </button>
            <button
              disabled={index === courses.length - 1}
              onClick={() => setCourses((rows) => movePathCourse(rows, index, 1))}
            >
              لأسفل
            </button>
            <button
              onClick={() =>
                setCourses((rows) =>
                  rows
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
              إزالة من المسودة وفك متطلباتها
            </button>
            <fieldset>
              <legend>المتطلبات السابقة</legend>
              {courses
                .filter((item) => item.courseId !== row.courseId)
                .map((prerequisite) => (
                  <label key={prerequisite.courseId}>
                    <input
                      type="checkbox"
                      checked={row.prerequisiteCourseIds.includes(prerequisite.courseId)}
                      onChange={(event) =>
                        setCourses((rows) =>
                          rows.map((item) =>
                            item.courseId === row.courseId
                              ? {
                                  ...item,
                                  prerequisiteCourseIds: event.target.checked
                                    ? [...item.prerequisiteCourseIds, prerequisite.courseId]
                                    : item.prerequisiteCourseIds.filter(
                                        (id) => id !== prerequisite.courseId,
                                      ),
                                }
                              : item,
                          ),
                        )
                      }
                    />
                    {labels[prerequisite.courseId] ?? prerequisite.courseId}
                  </label>
                ))}
            </fieldset>
          </div>
        ))}
        <button disabled={!title.trim() || !reason.trim()} onClick={() => void mutate()}>
          حفظ مسودة المسار
        </button>
      </fieldset>
      {current && (
        <div>
          <button
            disabled={busy || !reason.trim() || current.status !== 'DRAFT'}
            onClick={() => void mutate('mark-publishable')}
          >
            تثبيت الجاهزية للنشر
          </button>
          <button
            disabled={busy || !reason.trim() || current.status !== 'READY_TO_PUBLISH'}
            onClick={() => void mutate('publish')}
          >
            نشر المسار الجاهز
          </button>
          <button
            disabled={busy || !reason.trim() || current.status === 'ARCHIVED'}
            onClick={() => void mutate('archive')}
          >
            أرشفة المسار وحفظ نسخ الملتحقين
          </button>
        </div>
      )}
    </details>
  );
}
