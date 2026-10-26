import { useEffect, useState, type ReactNode } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { BookOpen, RefreshCw } from 'lucide-react';
import { adminApiClient } from '../../api/client';
import { useAdminAuthorization } from '../../security/AdminAuthorizationContext';
import { firstAllowedAdminPath } from '@manaratak/shared';
import { useCourseCopy } from './useCourseCopy';
import './courses.css';
export function RequireCourseWorkspace({ children }: { children: ReactNode }) {
  const { hasPermission, permissions } = useAdminAuthorization();
  return hasPermission('admin:courses:manage') || hasPermission('admin:courses:workspace') ? (
    <>{children}</>
  ) : (
    <Navigate to={firstAllowedAdminPath(permissions) || '/'} />
  );
}
export function AssignedCoursesPage() {
  const { tr, ar, status } = useCourseCopy();
  const [offset, setOffset] = useState(0),
    [refresh, setRefresh] = useState(0),
    [data, setData] = useState<{
      data: { id: string; displayName: string; status: string }[];
      nextOffset: number | null;
    }>(),
    [error, setError] = useState('');
  useEffect(() => {
    const abort = new AbortController();
    setData(undefined);
    setError('');
    void adminApiClient
      .request<typeof data>('/admin/courses/assigned?offset=' + offset, { signal: abort.signal })
      .then(setData)
      .catch((error) => {
        if (!abort.signal.aborted) setError(error.message);
      });
    return () => abort.abort();
  }, [offset, refresh]);
  return (
    <main className="courses-workspace" dir={ar ? 'rtl' : 'ltr'}>
      <header className="course-hero">
        <h1>
          <BookOpen size={22} />
          {tr('الدورات المسندة إليّ', 'My assigned courses')}
        </h1>
        <p>
          {tr(
            'أدوات كل دورة تظهر وفق دورك ونطاقك الفعلي في إدارة الصلاحيات.',
            'Course tools follow your actual IAM capability and resource scope.',
          )}
        </p>
      </header>
      <button type="button" onClick={() => setRefresh((value) => value + 1)}>
        <RefreshCw size={18} />
        {tr('تحديث', 'Refresh')}
      </button>
      {error ? (
        <p role="alert">{error}</p>
      ) : !data ? (
        <p role="status">{tr('جارٍ التحميل…', 'Loading…')}</p>
      ) : (
        <>
          <section className="course-card-grid">
            {data.data.map((row) => (
              <article className="course-panel" key={row.id}>
                <h2>{row.displayName}</h2>
                <p>{status(row.status)}</p>
                <Link
                  to={`/courses/${row.id}/editor?returnTo=${encodeURIComponent('/courses/assigned')}`}
                >
                  {tr('فتح مساحة الدورة', 'Open course workspace')}
                </Link>
              </article>
            ))}
          </section>
          {!data.data.length && (
            <p>
              {tr(
                'لا توجد دورات متاحة ضمن هذه الصفحة من الإسناد.',
                'No accessible assignments on this page.',
              )}
            </p>
          )}
          <nav>
            <button
              disabled={!offset}
              onClick={() => setOffset((value) => Math.max(0, value - 20))}
            >
              {tr('السابق', 'Previous')}
            </button>
            <button disabled={data.nextOffset === null} onClick={() => setOffset(data.nextOffset!)}>
              {tr('التالي', 'Next')}
            </button>
          </nav>
        </>
      )}
    </main>
  );
}
