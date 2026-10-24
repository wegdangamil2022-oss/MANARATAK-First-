import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ClipboardCheck,
  RefreshCw,
  BarChart3,
  Activity,
  UserCheck,
  UserRoundPlus,
  Flag,
  Clock3,
  Search,
  Eye,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ArrowDownWideNarrow,
  AlertTriangle,
} from 'lucide-react';
import type {
  ReviewCommand,
  ReviewPage,
  ReviewQuery,
  ReviewOwner,
  ReviewRecord,
  ReviewSavedView,
} from '@manaratak/shared';
import { createAdminIdempotencyKey } from '../../api/client';
import { useTranslation } from '../../i18n/I18nProvider';
import { useAdminAuthorization } from '../../security/AdminAuthorizationContext';
import { WorkspaceFilters } from './WorkspaceFilters';
import { WorkspaceAnalytics } from './WorkspaceAnalytics';
import { WorkspaceSources } from './WorkspaceSources';
import { WorkspacePreview } from './WorkspacePreview';
import { workRequest, parseWorkspacePage, cleanWorkspaceFilters } from './WorkspaceData';
import { displayDate, labelFor, textFor, workspaceError } from './WorkspaceText';
import './review-workspace.css';

export function ReviewWorkspacePage() {
  const { language, dir } = useTranslation(),
    { permissions, hasPermission } = useAdminAuthorization(),
    [params, setParams] = useSearchParams();
  const tr = textFor(language),
    label = labelFor(language),
    permissionKey = [...permissions].sort().join('|');
  const [tab, setTab] = useState('records'),
    [query, setQuery] = useState<ReviewQuery>(() => ({
      domain: (params.get('domain') as ReviewOwner) || undefined,
      reason: params.get('reason') || undefined,
      view: params.get('view') || undefined,
      pageSize: 25,
    })),
    [search, setSearch] = useState(''),
    [debounced, setDebounced] = useState('');
  const [data, setData] = useState<ReviewPage | null>(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(''),
    [refresh, setRefresh] = useState(0),
    [syncing, setSyncing] = useState(false),
    [mutating, setMutating] = useState(false),
    [status, setStatus] = useState(''),
    [selectedKey, setSelectedKey] = useState<string | null>(null),
    [selectedKeys, setSelectedKeys] = useState<string[]>([]),
    [views, setViews] = useState<ReviewSavedView[]>([]),
    [reviewers, setReviewers] = useState<Array<{ id: string; label: string; kind: string }>>([]),
    [cursors, setCursors] = useState<Array<string | undefined>>([undefined]),
    [page, setPage] = useState(0),
    [bulkPriority, setBulkPriority] = useState(''),
    [bulkAssignee, setBulkAssignee] = useState(''),
    [bulkReason, setBulkReason] = useState(''),
    [bulkResults, setBulkResults] = useState<Array<{ key: string; ok: boolean; code?: string }>>(
      [],
    );
  const snapshot = useRef<string | undefined>(undefined),
    requestGeneration = useRef(0),
    pendingSelection = useRef<'first' | 'last' | null>(null),
    syncBusy = useRef(false);
  const canCoordinate = hasPermission('admin:platform:manage');
  useEffect(() => {
    const abort = new AbortController();
    setReviewers([]);
    void workRequest<typeof reviewers>(
      '/reviewers' + (query.domain ? '?domain=' + query.domain : ''),
      undefined,
      abort.signal,
    )
      .then((value) => {
        if (!abort.signal.aborted) setReviewers(value);
      })
      .catch(() => {});
    return () => abort.abort();
  }, [query.domain, permissionKey]);
  const canWork = (row: ReviewRecord) =>
    row.profileId !== 'import' &&
    canCoordinate &&
    hasPermission(
      row.domain === 'cms'
        ? 'admin:cms:review'
        : row.domain === 'study-destinations'
          ? 'admin:study-destinations:edit'
          : row.domain === 'tests'
            ? 'admin:international-tests:manage'
            : 'admin:' + row.domain + ':manage',
    );
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    setData(null);
    setSelectedKey(null);
    setSelectedKeys([]);
    setViews([]);
    snapshot.current = undefined;
  }, [permissionKey]);
  useEffect(() => {
    const abort = new AbortController();
    void workRequest<ReviewSavedView[]>('/views', undefined, abort.signal)
      .then(setViews)
      .catch(() => {});
    return () => abort.abort();
  }, [permissionKey]);
  useEffect(() => {
    const safe = new URLSearchParams();
    for (const key of ['domain', 'reason', 'view'] as const)
      if (query[key] && query[key] !== 'all') safe.set(key, String(query[key]));
    if (params.toString() !== safe.toString()) setParams(safe, { replace: true });
  }, [query, params, setParams]);
  const resetTraversal = useCallback(() => {
    snapshot.current = undefined;
    setPage(0);
    setCursors((prior) => (prior.length === 1 && prior[0] === undefined ? prior : [undefined]));
    setSelectedKeys([]);
  }, []);
  const change = useCallback(
    (key: keyof ReviewQuery, value: string) => {
      resetTraversal();
      setQuery((prior) =>
        cleanWorkspaceFilters({ ...prior, [key]: key === 'pageSize' ? Number(value) : value }),
      );
    },
    [resetTraversal],
  );
  const clear = useCallback(() => {
    resetTraversal();
    setSearch('');
    setDebounced('');
    setQuery({ pageSize: 25 });
  }, [resetTraversal]);
  useEffect(() => {
    resetTraversal();
  }, [debounced, resetTraversal]);
  useEffect(() => {
    const abort = new AbortController(),
      generation = ++requestGeneration.current;
    setLoading(true);
    setError('');
    setSelectedKeys([]);
    const input = cleanWorkspaceFilters({ ...query, search: debounced || undefined });
    if (page > 0) {
      input.cursor = cursors[page];
      input.snapshot = snapshot.current;
    }
    void workRequest<ReviewPage>('/query', input, abort.signal)
      .then(parseWorkspacePage)
      .then((value) => {
        if (abort.signal.aborted || generation !== requestGeneration.current) return;
        setData(value);
        snapshot.current = value.snapshot;
        if (pendingSelection.current) {
          setSelectedKey(
            (pendingSelection.current === 'first' ? value.records[0] : value.records.at(-1))?.key ??
              null,
          );
          pendingSelection.current = null;
        } else
          setSelectedKey((prior) =>
            value.records.some((row) => row.key === prior) ? prior : null,
          );
      })
      .catch((cause) => {
        if (!abort.signal.aborted && generation === requestGeneration.current) {
          setError(workspaceError(cause));
          setData(null);
          setSelectedKey(null);
        }
      })
      .finally(() => {
        if (!abort.signal.aborted && generation === requestGeneration.current) setLoading(false);
      });
    return () => abort.abort();
  }, [query, debounced, page, refresh, permissionKey, cursors]);
  const synchronize = useCallback(
    async (domain?: ReviewOwner) => {
      if (syncBusy.current) return;
      syncBusy.current = true;
      setSyncing(true);
      setError('');
      try {
        await workRequest('/synchronize', domain ? { domain } : {});
        resetTraversal();
        setRefresh((value) => value + 1);
      } catch (cause) {
        setError(workspaceError(cause));
        if (/\[(401|403)\]/.test(String(cause))) {
          setData(null);
          setSelectedKey(null);
          setSelectedKeys([]);
        }
      } finally {
        syncBusy.current = false;
        setSyncing(false);
      }
    },
    [resetTraversal],
  );
  const reload = () => {
    resetTraversal();
    setRefresh((value) => value + 1);
  };
  useEffect(() => {
    const focus = () => {
      resetTraversal();
      setRefresh((value) => value + 1);
    };
    window.addEventListener('focus', focus);
    return () => window.removeEventListener('focus', focus);
  }, [resetTraversal]);
  const runCommand = async (command: ReviewCommand) => {
    setMutating(true);
    setStatus('');
    try {
      await workRequest('/commands', command);
      setStatus(tr('حُفظ التغيير بنجاح.', 'Change saved.'));
      reload();
      return true;
    } catch (cause) {
      setError(workspaceError(cause));
      if (/\[(401|403)\]/.test(String(cause))) {
        setData(null);
        setSelectedKey(null);
        setSelectedKeys([]);
      }
      return false;
    } finally {
      setMutating(false);
    }
  };
  const saveView = async (name: string, shared: boolean) => {
    try {
      await workRequest('/views', {
        name,
        shared,
        filters: cleanWorkspaceFilters({ ...query, search: undefined }),
      });
      setViews(await workRequest('/views'));
      setStatus(tr('حُفظ العرض دون نص البحث.', 'View saved without search text.'));
    } catch (cause) {
      setError(workspaceError(cause));
    }
  };
  const goPage = (target: number) => {
    if (target < 0 || loading) return;
    if (target > page) {
      if (!data?.nextCursor) return;
      setCursors((prior) => [...prior.slice(0, page + 1), data.nextCursor!]);
    }
    setPage(target);
  };
  const records = data?.records ?? [],
    selected = records.find((row) => row.key === selectedKey),
    selectedIndex = records.findIndex((row) => row.key === selectedKey);
  const move = (delta: number) => {
    const target = selectedIndex + delta;
    if (target >= 0 && target < records.length) setSelectedKey(records[target].key);
    else if (target < 0 && page > 0) {
      pendingSelection.current = 'last';
      goPage(page - 1);
    } else if (target >= records.length && data?.nextCursor) {
      pendingSelection.current = 'first';
      goPage(page + 1);
    }
  };
  const closePreview = useCallback(() => setSelectedKey(null), []);
  const bulk = async (action: 'priority' | 'assign') => {
    if (!selectedKeys.length || bulkReason.trim().length < 5) return;
    setMutating(true);
    setBulkResults([]);
    try {
      const commands = records
        .filter((row) => selectedKeys.includes(row.key))
        .map((row) => ({
          key: row.key,
          version: row.version,
          ownerRevision: row.ownerRevision,
          idempotencyKey: createAdminIdempotencyKey(),
          action,
          reason: bulkReason,
          ...(action === 'priority'
            ? { priority: bulkPriority }
            : {
                assigneeId: bulkAssignee.startsWith('person:') ? bulkAssignee.slice(7) : null,
                teamId: bulkAssignee.startsWith('team:') ? bulkAssignee.slice(5) : null,
              }),
        }));
      const result = await workRequest<{ results: typeof bulkResults }>('/bulk', { commands });
      setBulkResults(result.results);
      reload();
    } catch (cause) {
      setError(workspaceError(cause));
    } finally {
      setMutating(false);
    }
  };
  const number = (value: number | null | undefined) =>
    value == null ? '—' : new Intl.NumberFormat(language).format(value);
  const metrics = [
    {
      key: 'all',
      title: tr('تحتاج مراجعة', 'Needs review'),
      value: data?.counters.open,
      Icon: ClipboardCheck,
    },
    {
      key: 'mine',
      title: tr('مسندة لي', 'Assigned to me'),
      value: data?.counters.mine,
      Icon: UserCheck,
    },
    {
      key: 'unassigned',
      title: label('unassigned'),
      value: data?.counters.unassigned,
      Icon: UserRoundPlus,
    },
    { key: 'urgent', title: label('urgent'), value: data?.counters.urgent, Icon: Flag },
    { key: 'overdue', title: label('overdue'), value: data?.counters.overdue, Icon: Clock3 },
  ];
  const pagination = (
    <nav className="rw-pagination" aria-label={tr('صفحات المراجعة', 'Review pages')}>
      <span>
        {data?.total !== null && data?.total !== undefined
          ? tr('إجمالي النتائج: ', 'Matching cases: ') + number(data.total)
          : tr('الإجمالي غير متاح للتغطية الحالية', 'Total unavailable for current coverage')}{' '}
        · {tr('الصفحة ', 'Page ')}
        {number(page + 1)}
      </span>
      <label>
        {tr('لكل صفحة', 'Per page')}
        <select
          value={query.pageSize ?? 25}
          onChange={(event) => change('pageSize', event.target.value)}
        >
          {[10, 25, 50].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      <button disabled={page === 0 || loading} onClick={() => goPage(page - 1)}>
        <ChevronRight aria-hidden="true" />
        {tr('السابق', 'Previous')}
      </button>
      <button disabled={!data?.nextCursor || loading} onClick={() => goPage(page + 1)}>
        {tr('التالي', 'Next')}
        <ChevronLeft aria-hidden="true" />
      </button>
    </nav>
  );
  return (
    <main className="review-workspace" dir={dir} aria-busy={loading || syncing}>
      <header className="rw-header">
        <div>
          <h1>
            <ClipboardCheck aria-hidden="true" />
            {tr('قائمة المراجعة', 'Review queue')}
          </h1>
          <p>
            {tr(
              'متابعة السجلات التي تحتاج قرارًا أو استكمالًا',
              'Follow records that need a decision or completion',
            )}
          </p>
        </div>
        <div>
          <span>
            {data
              ? displayDate(data.readAt, language)
              : tr('لم تُقرأ البيانات بعد', 'Not read yet')}
          </span>
          <button
            className="rw-primary"
            disabled={loading || syncing}
            onClick={() => void synchronize()}
          >
            <RefreshCw aria-hidden="true" className={syncing ? 'rw-spin' : ''} />
            {tr('تحديث وإعادة التحقق', 'Refresh and recheck')}
          </button>
        </div>
      </header>
      <div
        className="rw-tabs"
        role="tablist"
        aria-label={tr('مساحات المراجعة', 'Review workspaces')}
      >
        {[
          { key: 'records', title: tr('سجلات المراجعة', 'Review records'), Icon: ClipboardCheck },
          { key: 'analytics', title: tr('تحليلات المراجعة', 'Review analytics'), Icon: BarChart3 },
          { key: 'sources', title: tr('حالة المصادر', 'Source health'), Icon: Activity },
        ].map(({ key, title, Icon }, index) => (
          <button
            key={key}
            role="tab"
            id={'rw-tab-' + key}
            aria-controls={'rw-content-' + key}
            aria-selected={tab === key}
            tabIndex={tab === key ? 0 : -1}
            onKeyDown={(event) => {
              if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
                event.preventDefault();
                const keys = ['records', 'analytics', 'sources'];
                const next =
                  event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? 2
                      : (index + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
                setTab(keys[next]);
                document.getElementById('rw-tab-' + keys[next])?.focus();
              }
            }}
            onClick={() => setTab(key)}
          >
            <Icon aria-hidden="true" />
            {title}
          </button>
        ))}
      </div>
      {error ? (
        <div className="rw-alert" role="alert">
          <AlertTriangle aria-hidden="true" />
          <p>{label(error)}</p>
          <button onClick={reload}>
            <RefreshCw aria-hidden="true" />
            {tr('إعادة المحاولة', 'Retry')}
          </button>
        </div>
      ) : null}
      <p className="rw-live" role="status">
        {status}
      </p>
      {tab === 'records' ? (
        <section id="rw-content-records" role="tabpanel" aria-labelledby="rw-tab-records">
          <div className="rw-metrics">
            {metrics.map(({ key, title, value, Icon }) => (
              <button
                key={key}
                onClick={() => change('view', key)}
                aria-pressed={(query.view ?? 'all') === key}
              >
                <span>
                  <Icon aria-hidden="true" />
                  {title}
                </span>
                <strong>{number(value)}</strong>
                {key === 'overdue' && value == null ? (
                  <small>{tr('لا توجد مهلة مقاسة', 'No measured deadline')}</small>
                ) : null}
              </button>
            ))}
          </div>
          <WorkspaceFilters
            language={language}
            query={query}
            search={search}
            setSearch={setSearch}
            change={change}
            clear={clear}
            views={views}
            saveView={saveView}
            canCoordinate={canCoordinate}
            reviewers={reviewers}
          />
          {data?.coverage === 'partial' ? (
            <p className="rw-coverage">
              <AlertTriangle aria-hidden="true" />
              {tr(
                'التغطية جزئية أو تحتاج مزامنة. النتائج المعروضة ليست إجماليًا للمنصة.',
                'Coverage is partial or needs synchronization. Visible rows are not a platform total.',
              )}
              <button onClick={() => setTab('sources')}>
                {tr('عرض حالة المصادر', 'View source health')}
              </button>
            </p>
          ) : null}
          <section className="rw-panel rw-results">
            <div className="rw-region-heading">
              <h2>
                <ClipboardCheck aria-hidden="true" />
                {tr('سجلات المراجعة', 'Review records')}
              </h2>
              <label>
                <ArrowDownWideNarrow aria-hidden="true" />
                {tr('الترتيب', 'Sort')}
                <select
                  value={query.sort ?? 'priority'}
                  onChange={(event) => change('sort', event.target.value)}
                >
                  {['priority', 'deadline', 'oldest', 'newest', 'domain', 'assignee'].map(
                    (value) => (
                      <option key={value} value={value}>
                        {label(value)}
                      </option>
                    ),
                  )}
                </select>
              </label>
            </div>
            {selectedKeys.length ? (
              <div className="rw-bulk">
                <strong>
                  {number(selectedKeys.length)} {tr('محدد', 'selected')}
                </strong>
                <label>
                  {tr('سبب التغيير الجماعي', 'Bulk reason')}
                  <input
                    value={bulkReason}
                    minLength={5}
                    maxLength={500}
                    onChange={(event) => setBulkReason(event.target.value)}
                  />
                </label>
                <label>
                  {tr('الأولوية', 'Priority')}
                  <select
                    value={bulkPriority}
                    onChange={(event) => setBulkPriority(event.target.value)}
                  >
                    <option value="">{tr('اختر', 'Choose')}</option>
                    {['critical', 'high', 'medium', 'low'].map((value) => (
                      <option key={value} value={value}>
                        {label(value)}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  disabled={mutating || !bulkPriority || bulkReason.trim().length < 5}
                  onClick={() => void bulk('priority')}
                >
                  {tr('تطبيق الأولوية', 'Apply priority')}
                </button>
                <label>
                  {tr('إسناد إلى مراجع أو فريق', 'Assign to reviewer or team')}
                  <select
                    value={bulkAssignee}
                    onChange={(event) => setBulkAssignee(event.target.value)}
                  >
                    <option value="">{tr('غير مسندة', 'Unassigned')}</option>
                    {reviewers.map((person) => (
                      <option key={person.kind + person.id} value={person.kind + ':' + person.id}>
                        {person.label}
                        {person.kind === 'team' ? tr(' — فريق', ' — team') : ''}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  disabled={mutating || bulkReason.trim().length < 5}
                  onClick={() => void bulk('assign')}
                >
                  {tr('تطبيق الإسناد', 'Apply assignment')}
                </button>
              </div>
            ) : null}
            {bulkResults.length ? (
              <ul role="status">
                {bulkResults.map((result) => (
                  <li key={result.key}>
                    {records.find((row) => row.key === result.key)?.title ?? result.key}:{' '}
                    {result.ok ? tr('حُفظ', 'Saved') : label(result.code ?? 'REVIEW_UNAVAILABLE')}
                  </li>
                ))}
              </ul>
            ) : null}
            <table className="rw-table">
              <caption className="rw-sr-only">
                {tr(
                  'قضايا فريدة عبر البحث المصرح على الخادم',
                  'Unique cases from authorized server search',
                )}
              </caption>
              <thead>
                <tr>
                  {canCoordinate ? <th scope="col">{tr('اختيار', 'Select')}</th> : null}
                  {[
                    'السجل والقسم',
                    'سبب المراجعة',
                    'الأولوية',
                    'المسؤول',
                    'المهلة',
                    'الإجراءات',
                  ].map((title, index) => (
                    <th key={title} scope="col">
                      {tr(
                        title,
                        [
                          'Record and section',
                          'Review reason',
                          'Priority',
                          'Assignee',
                          'Deadline',
                          'Actions',
                        ][index],
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((row) => (
                  <tr key={row.key} aria-selected={row.key === selectedKey}>
                    {canCoordinate ? (
                      <td data-label={tr('اختيار', 'Select')}>
                        {canWork(row) && row.version > 0 ? (
                          <input
                            type="checkbox"
                          disabled={selectedKeys.length>=25&&!selectedKeys.includes(row.key)}
                            aria-label={tr('تحديد ', 'Select ') + row.title}
                            checked={selectedKeys.includes(row.key)}
                            onChange={(event) =>
                              setSelectedKeys((prior) =>
                                event.target.checked
                                  ? [...prior, row.key]
                                  : prior.filter((key) => key !== row.key),
                              )
                            }
                          />
                        ) : (
                          <span>—</span>
                        )}
                      </td>
                    ) : null}
                    <td data-label={tr('السجل', 'Record')}>
                      <strong title={row.title}>{row.title}</strong>
                      {row.titleEn && row.titleEn !== row.title ? (
                        <span className="rw-record-english" lang="en" dir="ltr">
                          {row.titleEn}
                        </span>
                      ) : null}
                      <span className="rw-owner-label">{label(row.domain)}</span>
                      <span className="rw-badge">{label(row.workState)}</span>
                    </td>
                    <td data-label={tr('السبب', 'Reason')}>
                      <div className="rw-reasons">
                        {row.reasons.slice(0, 2).map((reason) => (
                          <span key={reason}>{label(reason)}</span>
                        ))}
                        {row.reasons.length > 2 ? (
                          <span title={row.reasons.slice(2).map(label).join(' · ')}>
                            +{row.reasons.length - 2}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td data-label={label('priority')}>
                      <span className={'rw-badge rw-priority-' + row.priority}>
                        <Flag aria-hidden="true" />
                        {label(row.priority)}
                      </span>
                      <small>{label(row.priorityBasis)}</small>
                    </td>
                    <td data-label={label('assignee')}>
                      {row.assigneeLabel ?? label('unassigned')}
                      {!row.assigneeId && !row.teamId && canWork(row) && row.version > 0 ? (
                        <button disabled={mutating} onClick={() => setSelectedKey(row.key)}>
                          <UserCheck aria-hidden="true" />
                          {tr('استلام / إسناد', 'Claim / assign')}
                        </button>
                      ) : null}
                    </td>
                    <td data-label={tr('المهلة', 'Deadline')}>
                      {row.dueAt ? (
                        <>
                          <time>{displayDate(row.dueAt, language)}</time>
                          <span className={'rw-badge rw-sla-' + row.sla}>{label(row.sla)}</span>
                        </>
                      ) : (
                        <span>{tr('لم تُحدد مهلة', 'No deadline set')}</span>
                      )}
                    </td>
                    <td data-label={tr('الإجراءات', 'Actions')}>
                      <div className="rw-row-actions">
                        <button onClick={() => setSelectedKey(row.key)}>
                          <Eye aria-hidden="true" />
                          {tr('معاينة', 'Preview')}
                        </button>
                        <Link to={row.href}>
                          <ExternalLink aria-hidden="true" />
                          {tr('فتح السجل', 'Open record')}
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {loading ? (
              <p className="rw-empty" role="status">
                <RefreshCw aria-hidden="true" />
                {tr('جارٍ البحث في المصادر المصرح بها…', 'Searching authorized sources…')}
              </p>
            ) : !records.length ? (
              <div className="rw-empty">
                <Search aria-hidden="true" />
                <h3>
                  {data?.coverage === 'complete'
                    ? tr('لا توجد مراجعات تطابق هذه الفلاتر', 'No reviews match these filters')
                    : tr(
                        'لم تتوفر نتائج موثوقة لهذا النطاق',
                        'No reliable results available for this scope',
                      )}
                </h3>
                <button onClick={clear}>{tr('مسح الفلاتر', 'Clear filters')}</button>
              </div>
            ) : null}
            {pagination}
          </section>
        </section>
      ) : null}
      {tab === 'analytics' ? (
        <section id="rw-content-analytics" role="tabpanel" aria-labelledby="rw-tab-analytics">
          <WorkspaceAnalytics
            language={language}
            refresh={refresh}
            filter={(value) => {
              resetTraversal();
              setQuery({ pageSize: 25, ...value });
              setTab('records');
            }}
          />
        </section>
      ) : null}
      {tab === 'sources' ? (
        <section id="rw-content-sources" role="tabpanel" aria-labelledby="rw-tab-sources">
          <WorkspaceSources
            language={language}
            sources={data?.sources ?? []}
            synchronize={synchronize}
            busy={syncing}
            canCoordinate={canCoordinate}
          />
        </section>
      ) : null}
      {selected ? (
        <WorkspacePreview
          language={language}
          row={selected}
          close={closePreview}
          move={move}
          canPrevious={selectedIndex > 0 || page > 0}
          canNext={selectedIndex < records.length - 1 || !!data?.nextCursor}
          command={runCommand}
          canCoordinate={canWork(selected)}
          hasPermission={hasPermission}
          busy={mutating}
        />
      ) : null}
    </main>
  );
}
