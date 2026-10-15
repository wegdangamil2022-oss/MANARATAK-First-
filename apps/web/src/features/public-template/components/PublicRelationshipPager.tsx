import { useEffect, useRef, useState } from 'react';
import { ApiClient } from '../../../api/client';
import { useTranslation } from '../../../i18n/I18nProvider';
import {
  graphCursorKeys,
  graphRowHref,
  type PublicRelationshipGraphPage,
} from '../PublicGraphPageContract';
const labels: Record<string, [string, string]> = {
  universities: ['الجامعات', 'Universities'],
  majors: ['التخصصات', 'Majors'],
  academicPrograms: ['البرامج الأكاديمية', 'Academic programs'],
  scholarships: ['المنح', 'Scholarships'],
  courses: ['الدورات', 'Courses'],
  preparationCourses: ['دورات التحضير', 'Preparation courses'],
  providerHeadquartersCourses: ['دورات حسب مقر المزود', 'Courses by provider headquarters'],
  internationalTests: ['الاختبارات', 'Tests'],
  services: ['الخدمات', 'Services'],
  careerJobs: ['الوظائف', 'Career opportunities'],
  editorialContent: ['المحتوى التحريري', 'Editorial content'],
  studentTools: ['الأدوات', 'Tools'],
};
export function PublicRelationshipPager({
  kind,
  identity,
}: {
  kind: 'majors' | 'universities' | 'scholarships' | 'countries' | 'tests';
  identity: string;
}) {
  const { language } = useTranslation(),
    locale = language === 'en' ? 'en' : 'ar',
    en = locale === 'en';
  const [open, setOpen] = useState(false),
    [page, setPage] = useState<PublicRelationshipGraphPage | null>(null),
    [error, setError] = useState(false),
    [busy, setBusy] = useState(false),
    [cursors, setCursors] = useState<Record<string, string>>({}),
    [refresh, setRefresh] = useState(0);
  const generation = useRef(0),
    subject = useRef<string | null>(null),
    key = `${kind}:${identity}:${locale}`,
    cursorKey = JSON.stringify(cursors);
  useEffect(() => {
    setPage(null);
    setCursors({});
    subject.current = null;
    setError(false);
  }, [key]);
  useEffect(() => {
    const request = ++generation.current,
      controller = new AbortController();
    if (!open) return;
    setBusy(true);
    setError(false);
    void ApiClient.getPublicGraphPage(
      kind,
      identity,
      locale,
      JSON.parse(cursorKey),
      controller.signal,
    )
      .then((value) => {
        if (request !== generation.current) return;
        if (subject.current && subject.current !== value.subject.ownerId)
          throw new Error('GRAPH_SUBJECT_CHANGED');
        subject.current = value.subject.ownerId;
        setPage(value);
      })
      .catch(() => {
        if (request === generation.current && !controller.signal.aborted) {
          setError(true);
          setPage(null);
        }
      })
      .finally(() => {
        if (request === generation.current) setBusy(false);
      });
    return () => {
      ++generation.current;
      controller.abort();
    };
  }, [open, key, cursorKey, refresh]);
  useEffect(() => {
    if (!open) return;
    const refresh = () => {
      if (document.visibilityState !== 'hidden') setRefresh((v) => v + 1);
    };
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, [open, key]);
  return (
    <section className="mx-4 my-3 rounded-xl border p-3">
      <button type="button" onClick={() => setOpen(!open)}>
        {en ? 'Browse all published relationships' : 'تصفح جميع العلاقات المنشورة'}
      </button>
      {open && (
        <div className="space-y-4 mt-3">
          {Object.keys(cursors).length > 0 && (
            <button type="button" disabled={busy} onClick={() => setCursors({})}>
              {en ? 'Reset relationship pages' : 'إعادة صفحات العلاقات إلى البداية'}
            </button>
          )}
          {busy && <p role="status">{en ? 'Loading relationships…' : 'جارٍ تحميل العلاقات…'}</p>}
          {error && (
            <p role="alert">
              {en
                ? 'Relationships could not be refreshed. The displayed page may be outdated.'
                : 'تعذر تحديث العلاقات؛ قد تكون الصفحة المعروضة قديمة.'}
              <button type="button" onClick={() => setRefresh((v) => v + 1)}>
                {en ? 'Retry' : 'إعادة المحاولة'}
              </button>
            </p>
          )}
          {page &&
            Object.entries(page.relationships).map(([edge, value]) => {
              const scope = page.readScope.collections[edge],
                rows = Array.isArray(value) ? value : value.data,
                cursor = graphCursorKeys[edge];
              return (
                <div key={edge}>
                  <h3>
                    {labels[edge]?.[en ? 1 : 0] ?? edge}
                    {scope.total != null ? ` (${scope.total})` : ''}
                  </h3>
                  {edge === 'providerHeadquartersCourses' && (
                    <p>
                      {en
                        ? 'Provider headquarters, not a study destination or eligibility claim.'
                        : 'حسب مقر المزود؛ لا يعني وجهة دراسة أو أهلية.'}
                    </p>
                  )}
                  {scope.state !== 'AVAILABLE' ? (
                    <p>{en ? 'This owner is unavailable.' : 'هذا المالك غير متاح.'}</p>
                  ) : (
                    <>
                      <ul>
                        {rows.map((row) => {
                          const href = graphRowHref(edge, row, locale),
                            label = row.displayName ?? row.title ?? row.sourceProgramName;
                          return (
                            <li key={row.ownerId ?? row.contentId ?? row.slug}>
                              {href ? <a href={href}>{label}</a> : <span>{label}</span>}
                              {row.universityDisplayName && (
                                <small> — {row.universityDisplayName}</small>
                              )}
                              {(row.localeFallback || row.universityLocaleFallback) && (
                                <small>
                                  {' '}
                                  {en ? 'Owner language fallback' : 'لغة المالك البديلة'}
                                </small>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                      {!rows.length && (
                        <p>
                          {en ? 'No relationships on this page.' : 'لا توجد علاقات في هذه الصفحة.'}
                        </p>
                      )}
                      <button
                        type="button"
                        disabled={busy || !cursors[cursor]}
                        onClick={() =>
                          setCursors((previous) => {
                            const next = { ...previous };
                            delete next[cursor];
                            return next;
                          })
                        }
                      >
                        {en ? 'First page' : 'الصفحة الأولى'}
                      </button>
                      <button
                        type="button"
                        disabled={busy || !scope.hasMore || !scope.nextCursor}
                        onClick={() =>
                          setCursors((previous) => ({ ...previous, [cursor]: scope.nextCursor! }))
                        }
                      >
                        {en ? 'Next page' : 'الصفحة التالية'}
                      </button>
                    </>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </section>
  );
}
