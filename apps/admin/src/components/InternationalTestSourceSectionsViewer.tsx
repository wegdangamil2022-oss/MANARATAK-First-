import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { AlertCircle, ChevronDown, Code2, FileText, Layers, Loader2, Search } from 'lucide-react';
import { adminApiClient } from '../api/client';
import { SafeMarkdownView } from './SafeMarkdownView';
import { useAdminAuthorization } from '../security/AdminAuthorizationContext';
import {
  sourceSections,
  sourceVariant,
  type TestSourceVersion,
} from '../features/international-tests/TestSourceSections';
import { TestSourceNameReview } from '../features/international-tests/TestSourceNameReview';
interface Props {
  testId: string;
  isRtl?: boolean;
  onNamesReviewed?: () => void | Promise<void>;
  canChangeVersion?: () => boolean;
  mode?: 'details' | 'sources';
}
export function InternationalTestSourceSectionsViewer({
  testId,
  isRtl = true,
  onNamesReviewed,
  canChangeVersion,
  mode = 'details',
}: Props) {
  const say = (ar: string, en: string) => (isRtl ? ar : en),
    { hasPermission } = useAdminAuthorization(),
    instance = useId().replaceAll(':', '');
  const [versions, setVersions] = useState<TestSourceVersion[]>([]),
    [selected, setSelected] = useState(''),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [query, setQuery] = useState(''),
    [expanded, setExpanded] = useState<Record<string, boolean>>({}),
    [rawOpen, setRawOpen] = useState(false),
    [page, setPage] = useState(1),
    [more, setMore] = useState(false);
  const sequence = useRef(0);
  const fetchPage = useCallback(
    async (page: number, signal?: AbortSignal) => {
      const request = ++sequence.current;
      setLoading(true);
      setError('');
      try {
        const rows = await adminApiClient.request<TestSourceVersion[]>(
          '/admin/international-tests/' +
            encodeURIComponent(testId) +
            '/import-versions?page=' +
            page,
          { signal },
        );
        if (signal?.aborted || sequence.current !== request) return;
        if (!Array.isArray(rows)) throw Error('Invalid source version response');
        setVersions((previous) =>
          page === 1
            ? rows
            : [
                ...previous,
                ...rows.filter((row) => !previous.some((prior) => prior.id === row.id)),
              ],
        );
        setPage(page);
        setMore(rows.length === 25);
        if (page === 1) {
          setSelected(rows[0]?.id ?? '');
          setQuery('');
          setRawOpen(false);
          setExpanded(
            Object.fromEntries(
              sourceSections(rows[0])
                .slice(0, 3)
                .map((row) => [row.key, true]),
            ),
          );
        }
      } catch (err) {
        if (!signal?.aborted && sequence.current === request)
          setError(err instanceof Error ? err.message : 'Unable to load source versions');
      } finally {
        if (!signal?.aborted && sequence.current === request) setLoading(false);
      }
    },
    [testId],
  );
  const invalidate = useCallback(() => {
    sequence.current++;
  }, []);
  useEffect(() => {
    setVersions([]);
    setSelected('');
    const controller = new AbortController();
    void fetchPage(1, controller.signal);
    return () => {
      controller.abort();
      invalidate();
    };
  }, [fetchPage, invalidate]);
  const [variant, setVariant] = useState('');
  const version = versions.find((row) => row.id === selected) ?? null,
    allSections = useMemo(() => sourceSections(version), [version]),
    variants = Array.from(
      new Map(
        allSections
          .map((row) => sourceVariant(row.block))
          .filter((value): value is { key: string; label: string } => Boolean(value))
          .map((value) => [value.key, value]),
      ).values(),
    ),
    selectedVariant =
      variant === '__unassigned__' || variants.some((value) => value.key === variant)
        ? variant
        : (variants[0]?.key ?? ''),
    sections = variants.length
      ? allSections.filter(
          (row) => (sourceVariant(row.block)?.key ?? '__unassigned__') === selectedVariant,
        )
      : allSections,
    filtered = sections.filter((row) =>
      [row.title, row.block.content, row.block.sourceSectionPath].some((value) =>
        value?.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
      ),
    );
  const raw = (version?.contentBlocks ?? []).filter(
    (block) => block.blockKey === 'source.raw' || block.blockType === 'RAW_SOURCE',
  );
  const choose = (id: string) => {
    if (canChangeVersion && !canChangeVersion()) return;
    setSelected(id);
    setVariant('');
    setQuery('');
    setRawOpen(false);
    setExpanded(
      Object.fromEntries(
        sourceSections(versions.find((row) => row.id === id))
          .slice(0, 3)
          .map((row) => [row.key, true]),
      ),
    );
  };
  const anchor = (key: string) =>
    'test-section-' + instance + '-' + sections.findIndex((row) => row.key === key);
  return (
    <section
      className="test-source-viewer space-y-4"
      dir={isRtl ? 'rtl' : 'ltr'}
      aria-busy={loading}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="test-region-title">
          <FileText size={18} />
          {mode === 'details'
            ? say('أقسام المصدر المستورد', 'Imported source sections')
            : say('نسخ المصدر وأدلته', 'Source versions and evidence')}
        </h2>
        {version && mode === 'details' && (
          <span className="test-source-badge">
            {sections.length} {say('قسمًا', 'sections')}
          </span>
        )}
      </div>
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-800"
        >
          <AlertCircle size={18} />
          <p>{error}</p>
          <button type="button" onClick={() => void fetchPage(page)}>
            {say('إعادة المحاولة', 'Retry')}
          </button>
        </div>
      )}
      {loading && (
        <p role="status" className="flex items-center gap-2 p-4 text-[13px]">
          <Loader2 size={18} className="animate-spin" />
          {say('جارٍ تحميل نسخ المصدر…', 'Loading source versions…')}
        </p>
      )}
      {!loading && !error && !versions.length && (
        <div className="rounded-xl border border-[#DDEFF2] bg-[#FAF7F0] p-5 text-[13px]">
          <Layers size={20} />
          <p className="mt-2">
            {say(
              'لا توجد نسخة مصدر مستوردة لهذا الاختبار. المعلومات الأساسية المتاحة معروضة للقراءة فقط.',
              'No imported source version exists for this test. Available canonical information is shown read-only.',
            )}
          </p>
        </div>
      )}
      {version && (
        <>
          {variants.length > 0 && mode === 'details' && (
            <label className="block text-[12px] font-bold">
              {say('نوع مثبت في المصدر', 'Variant documented in the source')}
              <select
                aria-label={say('نوع المصدر', 'Source variant')}
                value={selectedVariant}
                onChange={(event) => {
                  setVariant(event.target.value);
                  setQuery('');
                  setExpanded(Object.fromEntries(allSections.map((row) => [row.key, true])));
                }}
              >
                {variants.map((value) => (
                  <option value={value.key} key={value.key}>
                    {value.label}
                  </option>
                ))}
                {allSections.some((row) => !sourceVariant(row.block)) && (
                  <option value="__unassigned__">
                    {say('نوع غير محدد في المصدر', 'Variant unspecified in source')}
                  </option>
                )}
              </select>
            </label>
          )}
          <div className="flex flex-wrap items-end gap-3 rounded-xl border border-[#DDEFF2] bg-white p-4">
            <label className="min-w-0 flex-1 basis-56 text-[12px] font-bold">
              {say('نسخة المصدر المؤرخة', 'Dated source version')}
              <select
                aria-label={say('نسخة المصدر', 'Source version')}
                className="mt-2 w-full"
                value={selected}
                onChange={(e) => choose(e.target.value)}
              >
                {versions.map((row) => (
                  <option key={row.id} value={row.id}>
                    {say('نسخة', 'Version')} {row.versionNumber} · {row.status} ·{' '}
                    {row.sourceFileName ?? say('اسم الملف غير متوفر', 'Filename unavailable')}
                  </option>
                ))}
              </select>
            </label>
            {more && (
              <button
                type="button"
                disabled={loading || page >= 1000}
                onClick={() => void fetchPage(page + 1)}
              >
                {say('تحميل نسخ أقدم', 'Load older versions')}
              </button>
            )}
            <span className="text-[11px] text-slate-500">
              {version.importedAt && Number.isFinite(Date.parse(version.importedAt))
                ? new Date(version.importedAt).toLocaleString(isRtl ? 'ar' : 'en')
                : say('تاريخ الاستيراد غير متوفر', 'Import date unavailable')}
            </span>
          </div>
          {mode === 'sources' ? (
            <div className="space-y-4">
              <dl className="grid gap-3 rounded-xl border border-[#DDEFF2] p-4 text-[12px] sm:grid-cols-2">
                <div>
                  <dt>{say('ملف المصدر', 'Source file')}</dt>
                  <dd className="break-words">{version.sourceFileName ?? '—'}</dd>
                </div>
                <div>
                  <dt>{say('الحالة', 'Status')}</dt>
                  <dd>{version.status}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt>{say('بصمة المصدر', 'Source hash')}</dt>
                  <dd className="break-all" dir="ltr">
                    {version.sourceHash ?? '—'}
                  </dd>
                </div>
                {version.sourceUri && /^https?:\/\//i.test(version.sourceUri) && (
                  <div>
                    <dt>{say('المصدر الرسمي', 'Official source')}</dt>
                    <dd>
                      <a href={version.sourceUri} target="_blank" rel="noreferrer">
                        {say('فتح المصدر', 'Open source')}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
              {hasPermission('admin:international-tests:review') && (
                <TestSourceNameReview
                  key={version.id}
                  testId={testId}
                  version={version}
                  isRtl={isRtl}
                  onSaved={onNamesReviewed}
                />
              )}
              <button
                type="button"
                disabled={!raw.length}
                aria-expanded={rawOpen}
                onClick={() => setRawOpen((value) => !value)}
              >
                <Code2 size={16} />
                {say('معاينة المصدر الخام', 'Preview raw source')}
              </button>
              {rawOpen &&
                raw.map((block, index) => (
                  <pre
                    key={block.id ?? index}
                    className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-[#142B5F] p-4 text-[12px] text-white"
                    dir="auto"
                  >
                    {block.content}
                  </pre>
                ))}
              <p className="text-[12px]">
                {say(
                  'المصدر الخام محفوظ كدليل ولا يُحتسب قسمًا إضافيًا.',
                  'Raw source is retained as evidence and is not counted as an extra content section.',
                )}
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-end gap-3">
                <label className="min-w-0 flex-1 basis-56 text-[12px] font-bold">
                  <span className="flex items-center gap-2">
                    <Search size={16} />
                    {say('بحث داخل أقسام النسخة', 'Search this version’s sections')}
                  </span>
                  <input
                    type="search"
                    maxLength={200}
                    className="mt-2 w-full"
                    value={query}
                    onChange={(e) => {
                      const value = e.target.value;
                      setQuery(value);
                      setExpanded(
                        Object.fromEntries(
                          sections
                            .filter(
                              (row) =>
                                !value.trim() ||
                                [row.title, row.block.content].some((text) =>
                                  text
                                    .toLocaleLowerCase()
                                    .includes(value.trim().toLocaleLowerCase()),
                                ),
                            )
                            .map((row) => [row.key, true]),
                        ),
                      );
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setExpanded(Object.fromEntries(sections.map((row) => [row.key, true])))
                  }
                >
                  {say('توسيع الكل', 'Expand all')}
                </button>
                <button type="button" onClick={() => setExpanded({})}>
                  {say('طي الكل', 'Collapse all')}
                </button>
              </div>
              {sections.length > 10 && (
                <nav
                  aria-label={say('فهرس أقسام المصدر', 'Source section index')}
                  className="grid gap-2 rounded-xl border border-[#DDEFF2] bg-[#FAF7F0] p-3 sm:grid-cols-2 lg:grid-cols-3"
                >
                  {filtered.map((row) => (
                    <button
                      className="text-start text-[12px]"
                      key={row.key}
                      type="button"
                      onClick={() => {
                        setExpanded((old) => ({ ...old, [row.key]: true }));
                        requestAnimationFrame(() => {
                          const target = document.getElementById(anchor(row.key));
                          target?.scrollIntoView({ block: 'start', behavior: 'smooth' });
                          target?.querySelector('button')?.focus({ preventScroll: true });
                        });
                      }}
                    >
                      {row.number}. {row.title || say('قسم بلا عنوان', 'Untitled section')}
                    </button>
                  ))}
                </nav>
              )}
              {!filtered.length && (
                <p className="rounded-xl border border-[#DDEFF2] p-5 text-[13px]">
                  {sections.length
                    ? say('لا توجد أقسام تطابق البحث.', 'No sections match the search.')
                    : say(
                        'لا توجد أقسام محتوى مقروءة في هذه النسخة؛ يمكن مراجعة المصدر الخام في تبويب المصادر.',
                        'No readable content sections in this version; raw evidence is available in Sources.',
                      )}
                </p>
              )}
              {filtered.map((row) => (
                <article id={anchor(row.key)} className="test-source-section" key={row.key}>
                  <h3>
                    <button
                      type="button"
                      aria-expanded={Boolean(expanded[row.key])}
                      aria-controls={anchor(row.key) + '-body'}
                      onClick={() => setExpanded((old) => ({ ...old, [row.key]: !old[row.key] }))}
                    >
                      <span className="test-section-number">{row.number}</span>
                      <span className="min-w-0 flex-1 text-start">
                        {row.title || say('قسم بلا عنوان', 'Untitled section')}
                      </span>
                      {row.block.reviewStatus && (
                        <span className="test-review-badge">
                          {reviewLabel(row.block.reviewStatus, isRtl)}
                        </span>
                      )}
                      <ChevronDown size={18} className={expanded[row.key] ? 'rotate-180' : ''} />
                    </button>
                  </h3>
                  <div
                    id={anchor(row.key) + '-body'}
                    hidden={!expanded[row.key]}
                    className="test-source-content"
                    dir={
                      row.block.locale === 'en' ? 'ltr' : row.block.locale === 'ar' ? 'rtl' : 'auto'
                    }
                  >
                    <SafeMarkdownView content={row.block.content} />
                    <details className="mt-4 text-[11px] text-slate-500">
                      <summary>{say('مرجع القسم في المصدر', 'Section source reference')}</summary>
                      <p className="break-all">
                        {row.block.sourceSectionPath ?? row.block.blockKey}
                      </p>
                      <p>{row.block.locale ?? version.sourceLocale ?? '—'}</p>
                    </details>
                  </div>
                </article>
              ))}
            </>
          )}
        </>
      )}
    </section>
  );
}
function reviewLabel(status: string, ar: boolean) {
  return (
    (
      {
        APPROVED: ar ? 'مراجع ومعتمد' : 'Reviewed',
        NEEDS_REVIEW: ar ? 'بانتظار المراجعة' : 'Needs review',
        MAPPED: ar ? 'تمت المطابقة' : 'Mapped',
        IGNORED: ar ? 'مستبعد بالمراجعة' : 'Ignored',
      } as Record<string, string>
    )[status] ?? status
  );
}
