import { useState } from 'react';
import { adminApiClient } from '../api/client';
import { useAdminAuthorization } from '../security/AdminAuthorizationContext';
type Row = { id: string; title: string; position: number; status: string };
export function orderedDraftPositions(
  rows: Row[],
  id: string,
  offset: number,
): Array<{ id: string; position: number }> {
  const next = [...rows].sort((a, b) => a.position - b.position);
  const index = next.findIndex((row) => row.id === id);
  const target = index + offset;
  if (index < 0 || target < 0 || target >= next.length)
    throw new Error('COURSE_REORDER_TARGET_INVALID');
  [next[index], next[target]] = [next[target], next[index]];
  return next.map((row, index) => ({ id: row.id, position: index + 1 }));
}
export function CourseDraftStructurePanel({
  courseId,
  version,
  status,
  snapshot,
  onSaved,
}: {
  courseId: string;
  version: number;
  status: string;
  snapshot: { modules: Row[]; lessons: Array<Row & { moduleId: string }>; quizzes: Row[] };
  onSaved: () => Promise<void>;
}) {
  const { hasPermission } = useAdminAuthorization();
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (!hasPermission('admin:courses:manage')) return null;
  const disabled = busy || ['PUBLISHED', 'ARCHIVED', 'REJECTED'].includes(status);
  const command = async (path: string, method: string, body?: unknown) => {
    if (disabled || !reason.trim()) return;
    setBusy(true);
    setError('');
    try {
      await adminApiClient.request(`/admin/courses/${courseId}/${path}`, {
        method,
        headers: { 'If-Match': String(version), 'X-Review-Reason': reason.trim() },
        body: body ? JSON.stringify(body) : undefined,
      });
      await onSaved();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'تعذر حفظ الترتيب');
    } finally {
      setBusy(false);
    }
  };
  const controls = (kind: 'modules' | 'lessons', rows: Row[], row: Row, moduleId?: string) => {
    const sorted = [...rows].sort((a, b) => a.position - b.position);
    const index = sorted.findIndex((item) => item.id === row.id);
    const path = kind === 'modules' ? 'modules/reorder' : `modules/${moduleId}/lessons/reorder`;
    return (
      <span>
        <button
          disabled={index === 0 || !reason.trim()}
          onClick={() =>
            void command(path, 'PUT', { positions: orderedDraftPositions(rows, row.id, -1) })
          }
        >
          لأعلى
        </button>
        <button
          disabled={index === rows.length - 1 || !reason.trim()}
          onClick={() =>
            void command(path, 'PUT', { positions: orderedDraftPositions(rows, row.id, 1) })
          }
        >
          لأسفل
        </button>
        <button
          disabled={row.status === 'ARCHIVED' || !reason.trim()}
          onClick={() => void command(`${kind}/${row.id}`, 'DELETE')}
        >
          {kind === 'modules' ? 'أرشفة الوحدة وعناصرها' : 'أرشفة الدرس واختباراته'}
        </button>
      </span>
    );
  };
  return (
    <section className="rounded border bg-white p-4">
      <h3>ترتيب عناصر المسودة وأرشفتها</h3>
      <p>
        الأرشفة تحفظ المعرفات والنسخ المنشورة وتقدم الطلاب. الترتيب يرسل جميع المعرفات الحالية؛
        المحرر المتقادم يُرفض.
      </p>
      {error && <p role="alert">{error}</p>}
      <label>
        سبب التعديل
        <input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={2000}
        />
      </label>
      <fieldset disabled={disabled}>
        {[...snapshot.modules]
          .sort((a, b) => a.position - b.position)
          .map((module) => (
            <div key={module.id} className="rounded border p-3">
              <strong>
                {module.position}. {module.title} · {module.status}
              </strong>
              {controls('modules', snapshot.modules, module)}
              {snapshot.lessons
                .filter((row) => row.moduleId === module.id)
                .sort((a, b) => a.position - b.position)
                .map((lesson) => (
                  <div key={lesson.id}>
                    {lesson.position}. {lesson.title} · {lesson.status}
                    {controls(
                      'lessons',
                      snapshot.lessons.filter((row) => row.moduleId === module.id),
                      lesson,
                      module.id,
                    )}
                  </div>
                ))}
            </div>
          ))}
        {snapshot.quizzes.map((quiz) => (
          <div key={quiz.id}>
            {quiz.title} · {quiz.status}
            <button
              disabled={quiz.status === 'ARCHIVED' || !reason.trim()}
              onClick={() => void command(`quizzes/${quiz.id}`, 'DELETE')}
            >
              أرشفة الاختبار
            </button>
          </div>
        ))}
      </fieldset>
    </section>
  );
}
