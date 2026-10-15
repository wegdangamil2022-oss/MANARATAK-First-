import { useEffect, useRef, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { adminApiClient } from '../../api/client';
import { useTranslation } from '../../i18n/I18nProvider';
import { useAdminAuthorization } from '../../security/AdminAuthorizationContext';
export type ProgramExplorerFilters = {
  countryReferenceId: string;
  locale: 'ar' | 'en';
  visibility: 'PUBLIC' | 'ADMIN_ALL';
  degreeLevelId?: string;
  majorId?: string;
  internationalTestId?: string;
  languageReferenceId?: string;
  academicProgramId?: string;
};
type ScholarshipPage = {
  state: 'AVAILABLE' | 'UNAVAILABLE';
  data: Array<{ ownerId: string; slug: string; displayName: string }>;
  total: number | null;
  hasMore: boolean;
  nextCursor: string | null;
};
type Row = {
  id: string;
  sourceProgramName: string;
  status: string;
  parentStatus?: string;
  universityName: string;
  universitySlug: string;
  degreeLevelName?: string;
  majorName?: string;
  majorStatus?: string;
  tests: Array<{ id: string; displayName: string; status: string; requirementStatus: string }>;
  study?: {
    languages: Array<{ id: string; name: string; nameAr?: string }>;
    verificationStatus: string;
  } | null;
  scholarships: ScholarshipPage;
};
type Page = {
  items: Row[];
  total: number;
  hasMore: boolean;
  nextCursor: string | null;
  visibility: 'PUBLIC' | 'ADMIN_ALL';
  scope: ProgramExplorerFilters;
};
export function parseProgramExplorerPage(raw: unknown, scope: ProgramExplorerFilters): Page {
  const page = (raw as { data?: Page })?.data;
  if (
    !page ||
    page.visibility !== scope.visibility ||
    !page.scope ||
    Object.entries(scope).some(([k, v]) => page.scope[k as keyof ProgramExplorerFilters] !== v) ||
    !Array.isArray(page.items) ||
    page.items.length > 50 ||
    !Number.isSafeInteger(page.total) ||
    page.total < page.items.length ||
    typeof page.hasMore !== 'boolean' ||
    (page.hasMore
      ? typeof page.nextCursor !== 'string' || !page.nextCursor
      : page.nextCursor !== null)
  )
    throw new Error('EXPLORER_RESPONSE_INVALID');
  if (
    page.items.some(
      (row) =>
        !row ||
        typeof row.id !== 'string' ||
        !row.id ||
        typeof row.sourceProgramName !== 'string' ||
        typeof row.universityName !== 'string' ||
        !Array.isArray(row.tests) ||
        !row.scholarships ||
        !Array.isArray(row.scholarships.data) ||
        !['AVAILABLE', 'UNAVAILABLE'].includes(row.scholarships.state) ||
        (scope.visibility === 'PUBLIC' &&
          (row.status !== 'ACTIVE' ||
            row.majorStatus !== 'PUBLISHED' ||
            row.parentStatus !== undefined)),
    )
  )
    throw new Error('EXPLORER_RESPONSE_INVALID');
  return page;
}
function params(scope: ProgramExplorerFilters) {
  const result = new URLSearchParams();
  for (const [key, value] of Object.entries(scope)) if (value) result.set(key, value);
  return result;
}
export function AcademicProgramExplorerPanel({
  countryReferenceId,
}: {
  countryReferenceId: string;
}) {
  const { language } = useTranslation(),
    { hasPermission } = useAdminAuthorization(),
    en = language === 'en';
  const allowed = [
    'admin:universities:manage',
    'admin:majors:manage',
    'admin:international-tests:manage',
  ].every((p) => hasPermission(p));
  const [selected, setSelected] = useState<
      Omit<ProgramExplorerFilters, 'countryReferenceId' | 'locale' | 'visibility'>
    >({}),
    [visibility, setVisibility] = useState<'PUBLIC' | 'ADMIN_ALL'>('PUBLIC'),
    [after, setAfter] = useState<string | undefined>(),
    [page, setPage] = useState<Page | null>(null),
    [error, setError] = useState(false),
    [loading, setLoading] = useState(false),
    [refresh, setRefresh] = useState(0);
  const generation = useRef(0);
  const scope = useMemo<ProgramExplorerFilters>(
      () => ({ countryReferenceId, locale: en ? 'en' : 'ar', visibility, ...selected }),
      [countryReferenceId, en, visibility, selected],
    ),
    scopeKey = JSON.stringify(scope);
  useEffect(() => {
    const current = ++generation.current,
      controller = new AbortController();
    setPage(null);
    setError(false);
    setLoading(false);
    if (!allowed) return;
    setLoading(true);
    const activeScope = JSON.parse(scopeKey) as ProgramExplorerFilters,
      q = params(activeScope);
    q.set('limit', '25');
    if (after) q.set('cursor', after);
    void adminApiClient
      .request<unknown>(`/admin/academic-program-explorer?${q}`, {
        signal: controller.signal,
        cache: 'no-store',
      })
      .then((raw) => {
        const result = parseProgramExplorerPage(raw, activeScope);
        if (current === generation.current) setPage(result);
      })
      .catch(() => {
        if (current === generation.current && !controller.signal.aborted) setError(true);
      })
      .finally(() => {
        if (current === generation.current) setLoading(false);
      });
    return () => {
      ++generation.current;
      controller.abort();
    };
  }, [scopeKey, after, allowed, refresh]);
  const choose = (kind: 'DEGREE' | 'MAJOR' | 'TEST' | 'LANGUAGE', value: string) => {
    setAfter(undefined);
    setSelected((previous) =>
      kind === 'DEGREE'
        ? { degreeLevelId: value || undefined, languageReferenceId: previous.languageReferenceId }
        : kind === 'MAJOR'
          ? {
              degreeLevelId: previous.degreeLevelId,
              majorId: value || undefined,
              languageReferenceId: previous.languageReferenceId,
            }
          : kind === 'TEST'
            ? {
                degreeLevelId: previous.degreeLevelId,
                majorId: previous.majorId,
                internationalTestId: value || undefined,
                languageReferenceId: previous.languageReferenceId,
              }
            : {
                ...previous,
                languageReferenceId: value || undefined,
                academicProgramId: undefined,
              },
    );
  };
  if (!allowed)
    return (
      <p>
        {en
          ? 'Academic exploration requires University, Major and Test owner permissions.'
          : 'يتطلب الاستكشاف الأكاديمي صلاحيات ملاك الجامعات والتخصصات والاختبارات.'}
      </p>
    );
  return (
    <section className="my-5 border rounded-xl p-4 space-y-4">
      <h3>{en ? 'Explore matching academic programs' : 'استكشاف البرامج الأكاديمية المطابقة'}</h3>
      <p>
        {en
          ? 'Every filter must match the same program. Scholarships below are linked to that exact program.'
          : 'تُطبق جميع المرشحات على البرنامج نفسه، وتظهر تحته المنح المرتبطة بذلك البرنامج تحديدًا.'}
      </p>
      <label>
        {en ? 'Visibility' : 'نطاق العرض'}
        <select
          value={visibility}
          onChange={(e) => {
            setSelected({});
            setAfter(undefined);
            setVisibility(e.target.value as typeof visibility);
          }}
        >
          <option value="PUBLIC">{en ? 'Published only' : 'المنشور فقط'}</option>
          <option value="ADMIN_ALL">
            {en ? 'Admin: include drafts and archives' : 'إداري: يشمل المسودات والأرشيف'}
          </option>
        </select>
      </label>
      {visibility === 'ADMIN_ALL' && (
        <p>
          {en
            ? 'Administrative records include unpublished states and do not represent the public catalog.'
            : 'يشمل العرض الإداري حالات غير منشورة ولا يمثل الكتالوج العام.'}
        </p>
      )}
      <div className="grid gap-3 md:grid-cols-4">
        {(['DEGREE', 'MAJOR', 'TEST', 'LANGUAGE'] as const).map((kind) => (
          <Facet
            key={`${scopeKey}:${kind}`}
            kind={kind}
            scope={scope}
            value={
              kind === 'DEGREE'
                ? selected.degreeLevelId
                : kind === 'MAJOR'
                  ? selected.majorId
                  : kind === 'TEST'
                    ? selected.internationalTestId
                    : selected.languageReferenceId
            }
            onChange={(value) => choose(kind, value)}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={() => {
          setSelected({});
          setAfter(undefined);
        }}
      >
        {en ? 'Reset filters' : 'مسح المرشحات'}
      </button>
      <button type="button" disabled={loading} onClick={() => setRefresh((v) => v + 1)}>
        {en ? 'Refresh' : 'تحديث'}
      </button>
      {loading && <p role="status">{en ? 'Loading…' : 'جارٍ القراءة…'}</p>}
      {error && (
        <p role="alert">{en ? 'The owner query is unavailable.' : 'استعلام المالك غير متاح.'}</p>
      )}
      {page && (
        <>
          <p>
            {en ? 'Matching programs' : 'عدد البرامج المطابقة'}: {page.total}
          </p>
          {!page.items.length && (
            <p>
              {en
                ? 'No program matches all selected filters.'
                : 'لا يوجد برنامج يطابق جميع المرشحات المختارة.'}
            </p>
          )}
          {page.items.map((row) => (
            <article key={row.id} className="rounded-lg border p-3 space-y-2">
              <h4>{row.sourceProgramName}</h4>
              <p>
                {row.universityName} · {row.degreeLevelName ?? '—'} · {row.majorName ?? '—'}
              </p>
              {visibility === 'ADMIN_ALL' && (
                <p>
                  {en ? 'Program / university / major state' : 'حالة البرنامج / الجامعة / التخصص'}:{' '}
                  {row.status} / {row.parentStatus} / {row.majorStatus}
                </p>
              )}
              <p>
                {(row.study?.languages ?? [])
                  .map((l) => (en ? l.name : (l.nameAr ?? l.name)))
                  .join(' · ') || (en ? 'Teaching language unverified' : 'لغة التدريس غير متحققة')}
              </p>
              <p>
                {row.tests
                  .filter(
                    (t) => !selected.internationalTestId || t.id === selected.internationalTestId,
                  )
                  .map(
                    (t) =>
                      `${t.displayName}${visibility === 'ADMIN_ALL' ? ` (${t.status} / ${t.requirementStatus})` : ''}`,
                  )
                  .join(' · ')}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelected((previous) => ({ ...previous, academicProgramId: row.id }));
                  setAfter(undefined);
                }}
              >
                {en ? 'Focus this program' : 'حصر هذا البرنامج'}
              </button>
              <ProgramScholarships
                key={`${scopeKey}:${row.id}`}
                programId={row.id}
                scope={scope}
                initial={row.scholarships}
              />
            </article>
          ))}
          <button type="button" disabled={!after || loading} onClick={() => setAfter(undefined)}>
            {en ? 'First page' : 'الأولى'}
          </button>
          <button
            type="button"
            disabled={!page.hasMore || !page.nextCursor || loading}
            onClick={() => setAfter(page.nextCursor ?? undefined)}
          >
            {en ? 'Next programs' : 'البرامج التالية'}
          </button>
        </>
      )}
    </section>
  );
}
function Facet({
  kind,
  scope,
  value,
  onChange,
}: {
  kind: 'DEGREE' | 'MAJOR' | 'TEST' | 'LANGUAGE';
  scope: ProgramExplorerFilters;
  value?: string;
  onChange: (value: string) => void;
}) {
  const en = scope.locale === 'en',
    [items, setItems] = useState<
      Array<{ id: string; label: string; status: string; programCount: number }>
    >([]),
    [after, setAfter] = useState<string | undefined>(),
    [next, setNext] = useState<string | null>(null),
    [search, setSearch] = useState(''),
    [error, setError] = useState(false),
    [loading, setLoading] = useState(false);
  useEffect(() => {
    let active = true;
    const controller = new AbortController(),
      q = params(scope);
    q.set('facet', kind);
    q.set('limit', '25');
    if (after) q.set('facetCursor', after);
    if (search) q.set('facetSearch', search);
    setItems([]);
    setNext(null);
    setError(false);
    setLoading(true);
    const timer = setTimeout(() => {
      void adminApiClient
        .request<{ data: { items: typeof items; nextCursor: string | null } }>(
          `/admin/academic-program-explorer?${q}`,
          { signal: controller.signal, cache: 'no-store' },
        )
        .then((result) => {
          if (active) {
            if (!Array.isArray(result.data?.items)) throw new Error('FACET_INVALID');
            setItems(result.data.items);
            setNext(result.data.nextCursor);
          }
        })
        .catch(() => {
          if (active && !controller.signal.aborted) setError(true);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [scope, kind, after, search]);
  const label =
    kind === 'DEGREE'
      ? en
        ? 'Degree'
        : 'الدرجة'
      : kind === 'MAJOR'
        ? en
          ? 'Major'
          : 'التخصص'
        : kind === 'TEST'
          ? en
            ? 'Test'
            : 'الاختبار'
          : en
            ? 'Teaching language'
            : 'لغة التدريس';
  return (
    <div className="space-y-1">
      <label>
        {label}
        <input
          type="search"
          aria-label={label}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setAfter(undefined);
          }}
        />
        <select
          value={value ?? ''}
          disabled={loading || error}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">{en ? 'All' : 'الكل'}</option>
          {value && !items.some((i) => i.id === value) && (
            <option value={value} disabled>
              {en ? 'Selected outside current page' : 'المختار خارج الصفحة الحالية'}
            </option>
          )}
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label} ({item.programCount})
              {scope.visibility === 'ADMIN_ALL' ? ` · ${item.status}` : ''}
            </option>
          ))}
        </select>
      </label>
      {error && <p role="alert">{en ? 'Choices unavailable' : 'الخيارات غير متاحة'}</p>}
      <button type="button" disabled={!after || loading} onClick={() => setAfter(undefined)}>
        {en ? 'First' : 'الأولى'}
      </button>
      <button type="button" disabled={!next || loading} onClick={() => setAfter(next ?? undefined)}>
        {en ? 'More choices' : 'خيارات إضافية'}
      </button>
    </div>
  );
}
function ProgramScholarships({
  programId,
  scope,
  initial,
}: {
  programId: string;
  scope: ProgramExplorerFilters;
  initial: ScholarshipPage;
}) {
  const en = scope.locale === 'en',
    [page, setPage] = useState(initial),
    [busy, setBusy] = useState(false);
  const generation = useRef(0);
  useEffect(() => {
    ++generation.current;
    setPage(initial);
    setBusy(false);
  }, [initial]);
  useEffect(
    () => () => {
      ++generation.current;
    },
    [],
  );
  return (
    <div>
      <h5>{en ? 'Published scholarships for this program' : 'المنح المنشورة لهذا البرنامج'}</h5>
      {page.state === 'UNAVAILABLE' ? (
        <p role="alert">{en ? 'Scholarship owner unavailable' : 'مالك المنح غير متاح'}</p>
      ) : (
        <>
          <p>{page.total}</p>
          <ul>
            {page.data.map((s) => (
              <li key={s.ownerId}>
                <Link to={`/scholarships/${encodeURIComponent(s.slug)}`}>{s.displayName}</Link>
              </li>
            ))}
          </ul>
        </>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          ++generation.current;
          setPage(initial);
        }}
      >
        {en ? 'First scholarships' : 'المنح الأولى'}
      </button>
      {page.hasMore && (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            const current = ++generation.current;
            setBusy(true);
            const q = params(scope);
            q.set('scholarshipProgramId', programId);
            if (page.nextCursor) q.set('scholarshipCursor', page.nextCursor);
            void adminApiClient
              .request<{ data: ScholarshipPage }>(`/admin/academic-program-explorer?${q}`, {
                cache: 'no-store',
              })
              .then((result) => {
                if (current === generation.current) setPage(result.data);
              })
              .catch(() => {
                if (current === generation.current)
                  setPage({
                    state: 'UNAVAILABLE',
                    data: [],
                    total: null,
                    hasMore: false,
                    nextCursor: null,
                  });
              })
              .finally(() => {
                if (current === generation.current) setBusy(false);
              });
          }}
        >
          {en ? 'Next scholarships' : 'المنح التالية'}
        </button>
      )}
    </div>
  );
}
