import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ExternalLink, RefreshCw } from 'lucide-react';
import { adminApiClient } from '../../api/client';
import type { CatalogResult } from '../courses/catalogState';
import { courseNames } from '../courses/coursePresentation';

export function MajorRelatedCourses({ majorId }: { majorId: string }) {
  const [data, setData] = useState<CatalogResult>(),
    [page, setPage] = useState(1),
    [search, setSearch] = useState('');
  const [error, setError] = useState(false),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setData(undefined);
    setError(false);
    const query = new URLSearchParams({
      majorId,
      originType: 'EXTERNAL_LINKED_COURSE',
      page: String(page),
      pageSize: '6',
      search,
    });
    const timer = setTimeout(() => {
      adminApiClient
        .request<CatalogResult>(`/admin/courses?${query}`, {
          signal: controller.signal,
        })
        .then((value) => {
          if (!controller.signal.aborted) setData(value);
        })
        .catch(() => {
          if (!controller.signal.aborted) setError(true);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [majorId, page, search, revision]);
  return (
    <section
      className="rounded-2xl border border-[#DDEFF2] bg-white p-4 text-xs space-y-3"
      aria-label="الدورات المرتبطة بالتخصص"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D7AE62]/40 pb-2">
        <h2 className="flex items-center gap-2 text-[13px] font-bold text-[#142B5F]">
          <BookOpen className="h-4 w-4 text-[#0E7C86]" />
          الدورات المرتبطة بهذا التخصص
        </h2>
        <Link
          className="flex items-center gap-1 rounded-lg bg-[#142B5F] px-3 py-2 text-[#E5BC70]"
          to={`/courses/external?majorId=${encodeURIComponent(majorId)}`}
        >
          <ExternalLink size={13} />
          جميع الدورات{data ? ` (${data.total.toLocaleString('ar')})` : ''}
        </Link>
      </div>
      <p className="text-slate-500">
        تُعرض الروابط المعتمدة هنا. الظهور للطلاب يتطلب نشر الدورة والتخصص.
      </p>
      <label className="block">
        <span className="sr-only">البحث في دورات التخصص</span>
        <input
          type="search"
          maxLength={200}
          className="w-full rounded-lg border border-[#DDEFF2] p-2 text-xs"
          value={search}
          placeholder="البحث في دورات هذا التخصص…"
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
      </label>
      {error ? (
        <div role="alert">
          تعذر تحميل الدورات المرتبطة.
          <button
            type="button"
            onClick={() => setRevision((value) => value + 1)}
            className="ms-2 text-[#0E7C86]"
          >
            <RefreshCw size={14} />
            إعادة المحاولة
          </button>
        </div>
      ) : !data ? (
        <p role="status" className="text-slate-500">
          جارٍ تحميل الدورات…
        </p>
      ) : data.data.length === 0 ? (
        <p className="text-slate-500">لا توجد دورات مرتبطة معتمدة تطابق البحث.</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {data.data.map((course) => {
            const names = courseNames(course);
            return (
              <Link
                key={course.id}
                to={`/courses/external?course=${encodeURIComponent(course.id)}`}
                className="rounded-xl border border-[#DDEFF2] border-t-[#D7AE62] bg-[#F7FAFB] p-3"
              >
                <strong className="block text-xs text-[#142B5F]" dir="auto">
                  {names.arabic || names.english}
                </strong>
                {names.arabic && names.english && (
                  <small className="mt-1 block text-[11px] text-slate-500" dir="ltr">
                    {names.english}
                  </small>
                )}
                <span className="mt-1 block text-[11px] text-[#0E7C86]">
                  {course.providerDisplayName ?? course.platformName}
                </span>
              </Link>
            );
          })}
        </div>
      )}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
            السابق
          </button>
          <span>
            {page.toLocaleString('ar')} / {data.totalPages.toLocaleString('ar')}
          </span>
          <button
            type="button"
            disabled={page >= data.totalPages}
            onClick={() => setPage((value) => value + 1)}
          >
            التالي
          </button>
        </div>
      )}
    </section>
  );
}
