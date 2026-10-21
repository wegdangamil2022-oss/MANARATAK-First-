import {TestDiscoveryEditor} from '../features/integration/TestDiscoveryEditor';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { adminApiClient } from '../api/client';
import { useAdminAuthorization } from '../security/AdminAuthorizationContext';
import { useTranslation } from '../i18n/I18nProvider';

const statusLabels = {
  PLANNED: 'tools19_value_PLANNED',
  IN_DEVELOPMENT: 'tools19_value_IN_DEVELOPMENT',
  IMPLEMENTED: 'tools19_value_IMPLEMENTED',
  RUNTIME_BLOCKED: 'tools19_value_RUNTIME_BLOCKED',
  DRAFT: 'tools19_value_DRAFT',
  TESTING: 'tools19_value_TESTING',
  ACTIVE: 'tools19_value_ACTIVE',
  DEPRECATED: 'tools19_value_DEPRECATED',
  RETIRED: 'tools19_value_RETIRED',
  RUNNING: 'tools19_value_RUNNING',
  COMPLETED: 'tools19_value_COMPLETED',
  FAILED: 'tools19_value_FAILED',
  BLOCKED: 'tools19_value_BLOCKED',
  UNKNOWN_OUTCOME: 'tools19_value_UNKNOWN_OUTCOME',
  ANONYMOUS: 'tools19_value_ANONYMOUS',
  AUTHENTICATED_STUDENT: 'tools19_value_AUTHENTICATED_STUDENT',
  PENDING: 'tools19_value_PENDING',
  APPROVED: 'tools19_value_APPROVED',
  REJECTED: 'tools19_value_REJECTED',
  CONSUMED: 'tools19_value_CONSUMED',
  HEALTHY: 'tools19_value_HEALTHY',
  NOT_CONFIGURED: 'tools19_value_NOT_CONFIGURED',
  DEGRADED: 'tools19_value_DEGRADED',
  MAINTENANCE: 'tools19_value_MAINTENANCE',
  OFFLINE: 'tools19_value_OFFLINE',
  LAUNCH_ORDER: 'tools19_value_LAUNCH_ORDER',
  UPDATED_DESC: 'tools19_value_UPDATED_DESC',
} as const;
function useToolStatusLabel() { const { t } = useTranslation(); return (value: string) => value in statusLabels ? t(statusLabels[value as keyof typeof statusLabels]) : value; }

type Tool = {
  toolKey: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  estimatedMinutes: number;
  tags: string[];
  iconAssetId: string | null;
  implementationPriority: string;
  desiredLaunchVisibility: string;
  category: string;
  implementationStatus: string;
  lifecycle: string;
  revision: number;
  currentVersion: { semanticVersion: string };
  releaseApproval?: { status: string; author: string; reviewer?: string; expiresAt: string };
  availability: {
    publicEnabled: boolean;
    anonymousEnabled: boolean;
    authenticatedEnabled: boolean;
    adminOnly: boolean;
    allowedLocales: string[];
    allowedRegions: string[];
    maintenanceMode: boolean;
  };
  featureFlags: {
    globallyEnabled: boolean;
    anonymousEnabled: boolean;
    authenticatedEnabled: boolean;
    maintenanceMode: boolean;
  };
  dependencies: Array<{ phase: string; required: boolean; description: string }>;
  inputSchema: unknown;
  outputSchema: unknown;
};
type Detail = {
  tool: Tool;
  readiness: { ready: boolean; blockers: string[] };
  health: string;
  dependencies: unknown;
  telemetry: Record<string, unknown>;
};
type Page<T> = { data: T[]; total: number; page: number; pageSize: number };
const nextVersion = (version: string) => {
  const parts = version.split('.').map(Number);
  parts[2] += 1;
  return parts.join('.');
};
const inputClass = 'rounded border border-[#0E7C86]/30 p-2 bg-transparent w-full focus:border-[#0E7C86]';

export function StudentToolsAdminPage() {
  const { toolKey } = useParams();
  const { t, dir } = useTranslation();
  return (
    <main dir={dir} className="mx-auto max-w-6xl space-y-5 p-5 text-[#142B5F]">
      <h1 className="text-2xl font-bold">{t('tools19_title')}</h1>
      {toolKey ? <ToolDetail key={toolKey} toolKey={toolKey} /> : <ToolCatalog />}
    </main>
  );
}
function ToolCatalog() {
  const statusLabel = useToolStatusLabel();
  const { t, language } = useTranslation();
  const [query, setQuery] = useSearchParams();
  const [result, setResult] = useState<Page<Tool>>({ data: [], total: 0, page: 1, pageSize: 25 });
  const [overview, setOverview] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const load = useCallback(async () => {
    const id = ++generation.current;
    setLoading(true);
    setError('');
    setResult({ data: [], total: 0, page: Number(query.get('page')) || 1, pageSize: 25 });
    setOverview(null);
    try {
      const [page, summary] = await Promise.allSettled([
        adminApiClient.request<Page<Tool>>(`/admin/student-tools?${query}`),
        adminApiClient.request<{ data: Record<string, unknown> }>('/admin/student-tools/overview'),
      ]);
      if (id !== generation.current) return;
      if (page.status === 'rejected') throw page.reason;
      setResult(page.value);
      setOverview(summary.status === 'fulfilled' ? summary.value.data : null);
      if (summary.status === 'rejected') setError('tools19_summary_failed');
    } catch {
      if (id === generation.current) setError('tools19_load_failed');
    } finally {
      if (id === generation.current) setLoading(false);
    }
  }, [query]);
  useEffect(() => {
    void load();
    return () => {
      ++generation.current;
    };
  }, [load]);
  const filter = (key: string, value: string) => {
    const next = new URLSearchParams(query);
    value ? next.set(key, value) : next.delete(key);
    next.set('page', '1');
    setQuery(next);
  };
  return (
    <>
      {error && <p role="alert">{t(error as 'tools19_load_failed')}</p>}
      <details>
        <summary>{t('tools19_overview')}</summary>
        <pre>{JSON.stringify(overview, null, 2)}</pre>
      </details>
      <div className="grid gap-3 sm:grid-cols-4">
      <label>{t('tools19_sort')}<select className={inputClass} value={query.get('sort') ?? 'LAUNCH_ORDER'} onChange={event => filter('sort', event.target.value)}>{['LAUNCH_ORDER','UPDATED_DESC'].map(value => <option key={value} value={value}>{statusLabel(value)}</option>)}</select></label>
        <label>
          {t('tools19_search')}
          <input
            className={inputClass}
            value={query.get('search') ?? ''}
            onChange={(e) => filter('search', e.target.value)}
          />
        </label>
        <label>
          {t('tools19_category')}
          <input
            className={inputClass}
            value={query.get('category') ?? ''}
            onChange={(e) => filter('category', e.target.value)}
          />
        </label>
        <label>
          {t('tools19_status')}
          <select
            className={inputClass}
            value={query.get('implementationStatus') ?? ''}
            onChange={(e) => filter('implementationStatus', e.target.value)}
          >
            <option value="">{t('tools19_all')}</option>
            {['PLANNED', 'IN_DEVELOPMENT', 'IMPLEMENTED', 'RUNTIME_BLOCKED'].map((value) => (
              <option key={value} value={value}>{statusLabel(value)}</option>
            ))}
          </select>
        </label>
        <label>
          {t('tools19_lifecycle')}
          <select
            className={inputClass}
            value={query.get('lifecycle') ?? ''}
            onChange={(e) => filter('lifecycle', e.target.value)}
          >
            <option value="">{t('tools19_all')}</option>
            {['DRAFT', 'TESTING', 'ACTIVE', 'DEPRECATED', 'RETIRED'].map((value) => (
              <option key={value} value={value}>{statusLabel(value)}</option>
            ))}
          </select>
        </label>
      </div>
      <button type="button" onClick={() => setQuery({})}>
        {t('tools19_reset')}
      </button>
      {loading ? (
        <p role="status">{t('tools19_loading')}</p>
      ) : !result.data.length ? (
        <p>{t('tools19_empty')}</p>
      ) : (
        <table className="w-full">
          <thead>
            <tr>
              <th>{t('tools19_name')}</th>
              <th>{t('tools19_status')}</th>
              <th>{t('tools19_version')}</th>
              <th>{t('tools19_lifecycle')}</th>
            </tr>
          </thead>
          <tbody>
            {result.data.map((tool) => (
              <tr key={tool.toolKey}>
                <td>
                  <Link to={`/student-tools/${encodeURIComponent(tool.toolKey)}`}>
                    {language === 'en' ? tool.nameEn : tool.nameAr}
                  </Link>
                </td>
                <td>{statusLabel(tool.implementationStatus)}</td>
                <td>{tool.currentVersion.semanticVersion}</td>
                <td>{statusLabel(tool.lifecycle)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="flex gap-4">
        <button
          type="button"
          disabled={loading || result.page <= 1}
          onClick={() => {
            const next = new URLSearchParams(query);
            next.set('page', String(result.page - 1));
            setQuery(next);
          }}
        >
          {t('tools19_previous')}
        </button>
        <span>
          {result.page} / {Math.max(1, Math.ceil(result.total / result.pageSize))} · {result.total}
        </span>
        <button
          type="button"
          disabled={loading || result.page * result.pageSize >= result.total}
          onClick={() => {
            const next = new URLSearchParams(query);
            next.set('page', String(result.page + 1));
            setQuery(next);
          }}
        >
          {t('tools19_next')}
        </button>
      </div>
    </>
  );
}
function ToolDetail({ toolKey }: { toolKey: string }) {
  const statusLabel = useToolStatusLabel();
  const { t, language } = useTranslation();
  const { hasPermission } = useAdminAuthorization();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const fence = useRef(false);
  const generation = useRef(0);
  const testIntent = useRef<{ fingerprint: string; key: string } | null>(null);
  const [testCostApproved, setTestCostApproved] = useState(false);
  const [reason, setReason] = useState('');
  const [testInput, setTestInput] = useState('{}');
  const [testResult, setTestResult] = useState<unknown>(null);
  const [eligibility, setEligibility] = useState<unknown>(null);
  const eligibilityGeneration = useRef(0);
  const [consumerType, setConsumerType] = useState<'ANONYMOUS' | 'AUTHENTICATED_STUDENT'>(
    'ANONYMOUS',
  );
  useEffect(() => {
    ++eligibilityGeneration.current;
    setEligibility(null);
    return () => { ++eligibilityGeneration.current; };
  }, [consumerType, language]);
  const [traceFilter, setTraceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [testFilter, setTestFilter] = useState('');
  const executionQuery = new URLSearchParams({
    ...(traceFilter ? { correlationId: traceFilter } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(testFilter ? { isTest: testFilter } : {}),
  }).toString();
  const [executionPage, setExecutionPage] = useState(1);
  const [auditPage, setAuditPage] = useState(1);
  const [executions, setExecutions] = useState<Page<Record<string, unknown>>>({
    data: [],
    total: 0,
    page: 1,
    pageSize: 25,
  });
  const [audit, setAudit] = useState<Page<Record<string, unknown>>>({
    data: [],
    total: 0,
    page: 1,
    pageSize: 25,
  });
  const base = `/admin/student-tools/${encodeURIComponent(toolKey)}`;
  const can = (action: string) => hasPermission(`admin:student-tools:${action}`);
  const canReadExecutions = hasPermission('admin:student-tools:view-executions');
  const load = useCallback(async () => {
    const id = ++generation.current;
    const fresh = await adminApiClient.request<{ data: Detail }>(base);
    if (id === generation.current) setDetail(fresh.data);
  }, [base]);
  useEffect(() => {
    void load().catch(() => setError('tools19_load_failed'));
    return () => {
      ++generation.current;
    };
  }, [load]);
  useEffect(() => {
    if (!canReadExecutions) return;
    let active = true;
    setExecutions({ data: [], total: 0, page: executionPage, pageSize: 25 });
    setAudit({ data: [], total: 0, page: auditPage, pageSize: 25 });
    void Promise.all([
      adminApiClient.request<Page<Record<string, unknown>>>(
        `${base}/executions?page=${executionPage}&pageSize=25&${executionQuery}`,
      ),
      adminApiClient.request<Page<Record<string, unknown>>>(
        `${base}/audit?page=${auditPage}&pageSize=25${traceFilter ? `&correlationId=${encodeURIComponent(traceFilter)}` : ''}`,
      ),
    ])
      .then(([records, events]) => {
        if (active) {
          setExecutions(records);
          setAudit(events);
        }
      })
      .catch(() => {
        if (active) setError('tools19_load_failed');
      });
    return () => {
      active = false;
    };
  }, [base, executionPage, auditPage, canReadExecutions, executionQuery, traceFilter]);
  const mutate = async (path: string, method: string, body: Record<string, unknown>) => {
    if (!detail || fence.current) return;
    fence.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    let committed = false;
    try {
      await adminApiClient.request(`${base}${path}`, {
        method,
        body: JSON.stringify({ expectedRevision: detail.tool.revision, ...body }),
      });
      committed = true;
      await load();
      setNotice('tools19_saved');
    } catch (value) {
      const code = value instanceof Error ? value.message : '';
      setError(
        committed
          ? 'tools19_refresh_failed'
          : code.includes('CONFLICT') || code.includes('STALE')
            ? 'tools19_conflict'
            : 'tools19_action_failed',
      );
    } finally {
      fence.current = false;
      setBusy(false);
    }
  };
  const runTest = async (event: FormEvent) => {
    event.preventDefault();
    if (fence.current) return;
    fence.current = true;
    setBusy(true);
    setError('');
    try {
      const input: unknown = JSON.parse(testInput);
      const body = JSON.stringify({
        input,
        locale: language,
        costApproved: testCostApproved,
        privacyConsent: testCostApproved,
        fixturePolicy: 'SYNTHETIC_ONLY',
      });
      const fingerprint = Array.from(
        new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body))),
      )
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
      if (testIntent.current?.fingerprint !== fingerprint)
        testIntent.current = { fingerprint, key: crypto.randomUUID() };
      const value = await adminApiClient.request<{ data: unknown }>(`${base}/test`, {
        method: 'POST',
        headers: { 'Idempotency-Key': testIntent.current.key },
        body,
      });
      if (['COMPLETED', 'BLOCKED'].includes(String((value.data as { status?: string })?.status)))
        testIntent.current = null;
      setTestResult(value.data);
    } catch {
      setError('tools19_action_failed');
    } finally {
      fence.current = false;
      setBusy(false);
    }
  };
  if (!detail)
    return (
      <p role={error ? 'alert' : 'status'}>
        {t(error ? 'tools19_load_failed' : 'tools19_loading')}
      </p>
    );
  const tool = detail.tool;
  const edit = (patch: Partial<Tool>) => setDetail({ ...detail, tool: { ...tool, ...patch } });
  return (
    <>
      <Link to="/student-tools">{t('tools19_back')}</Link>
      <h2>{language === 'en' ? tool.nameEn : tool.nameAr}</h2>
      <TestDiscoveryEditor key={`${toolKey}:${tool.revision}`} ownerType="STUDENT_TOOLS" ownerKey={toolKey}/>
      {error && <p role="alert">{t(error as 'tools19_action_failed')}</p>}
      {notice && <p role="status">{t('tools19_saved')}</p>}
      <button
        type="button"
        disabled={busy}
        onClick={() => void load().catch(() => setError('tools19_load_failed'))}
      >
        {t('tools19_refresh')}
      </button>
      <p>
        {t('tools19_version')}: {tool.currentVersion.semanticVersion} · {t('tools19_revision')}:{' '}
        {tool.revision} · {statusLabel(tool.lifecycle)} · {statusLabel(detail.health)}
      </p>
      <form
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          void mutate('/metadata', 'PATCH', {
            nameAr: tool.nameAr,
            nameEn: tool.nameEn,
            descriptionAr: tool.descriptionAr,
            descriptionEn: tool.descriptionEn,
            category: tool.category,
            reason,
            tags: tool.tags,
            estimatedMinutes: tool.estimatedMinutes,
            iconAssetId: tool.iconAssetId,
            implementationPriority: tool.implementationPriority,
            desiredLaunchVisibility: tool.desiredLaunchVisibility,
          });
        }}
      >
        <fieldset disabled={busy || !can('edit-metadata')} className="space-y-3 border p-4">
          <legend>{t('tools19_metadata')}</legend>
          {(
            [
              'nameAr',
              'nameEn',
              'descriptionAr',
              'descriptionEn',
              'category',
              'implementationPriority',
              'desiredLaunchVisibility',
            ] as const
          ).map((key) => (
            <label key={key} className="block">
              {t(`tools19_field_${key}`)}
              <input
                className={inputClass}
                value={tool[key]}
                onChange={(event) => edit({ [key]: event.target.value })}
              />
            </label>
          ))}
          <label className="block">
            {t('tools19_field_tags')}
            <input
              className={inputClass}
              value={(tool.tags ?? []).join(',')}
              onChange={(event) =>
                edit({
                  tags: event.target.value
                    .split(',')
                    .map((value) => value.trim())
                    .filter(Boolean),
                })
              }
            />
          </label>
          <label className="block">
            {t('tools19_field_estimatedMinutes')}
            <input
              type="number"
              min={0}
              max={100000}
              className={inputClass}
              value={tool.estimatedMinutes ?? 0}
              onChange={(event) => edit({ estimatedMinutes: Number(event.target.value) })}
            />
          </label>
          <label className="block">
            {t('tools19_field_iconAssetId')}
            <input
              className={inputClass}
              value={tool.iconAssetId ?? ''}
              onChange={(event) => edit({ iconAssetId: event.target.value || null })}
            />
          </label>
          <button type="submit" disabled={reason.trim().length < 3}>
            {t('tools19_save')}
          </button>
        </fieldset>
      </form>
      <label className="block">
        {t('tools19_reason')}
        <textarea
          className={inputClass}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={2000}
        />
      </label>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void mutate('/availability', 'PATCH', {
            ...tool.availability,
            allowedRegions: [],
            semanticVersion: nextVersion(tool.currentVersion.semanticVersion),
            changeNote: reason,
          });
        }}
      >
        <fieldset disabled={busy || !can('manage-availability')} className="space-y-3 border p-4">
          <legend>{t('tools19_availability')}</legend>
          {(
            [
              'publicEnabled',
              'anonymousEnabled',
              'authenticatedEnabled',
              'adminOnly',
              'maintenanceMode',
            ] as const
          ).map((key) => (
            <label key={key} className="block">
              <input
                type="checkbox"
                checked={tool.availability[key]}
                onChange={(event) =>
                  edit({ availability: { ...tool.availability, [key]: event.target.checked } })
                }
              />{' '}
              {t(`tools19_field_${key}`)}
            </label>
          ))}
          <label>
            {t('tools19_locales')}
            <input
              className={inputClass}
              value={tool.availability.allowedLocales.join(',')}
              onChange={(e) =>
                edit({
                  availability: {
                    ...tool.availability,
                    allowedLocales: e.target.value
                      .split(',')
                      .map((v) => v.trim())
                      .filter(Boolean),
                  },
                })
              }
            />
          </label>
          <p>{t('tools19_region_notice')}</p>
          <button type="submit" disabled={reason.trim().length < 3}>
            {t('tools19_save_version')}
          </button>
        </fieldset>
      </form>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void mutate('/flags', 'PATCH', {
            ...tool.featureFlags,
            semanticVersion: nextVersion(tool.currentVersion.semanticVersion),
            changeNote: reason,
          });
        }}
      >
        <fieldset disabled={busy || !can('manage-availability')} className="border p-4">
          <legend>{t('tools19_flags')}</legend>
          {(
            [
              'globallyEnabled',
              'anonymousEnabled',
              'authenticatedEnabled',
              'maintenanceMode',
            ] as const
          ).map((key) => (
            <label key={key} className="block">
              <input
                type="checkbox"
                checked={tool.featureFlags[key]}
                onChange={(e) =>
                  edit({ featureFlags: { ...tool.featureFlags, [key]: e.target.checked } })
                }
              />
              {t(`tools19_field_${key}`)}
            </label>
          ))}
          <button type="submit" disabled={reason.trim().length < 3}>
            {t('tools19_save_version')}
          </button>
        </fieldset>
      </form>
      <section className="border p-4 space-y-3">
        <h3>{t('tools19_release')}</h3>
        <p>{tool.releaseApproval ? statusLabel(tool.releaseApproval.status) : t('tools19_no_approval')}</p>
        {detail.readiness.blockers.map((blocker) => (
          <p key={blocker}>{blocker}</p>
        ))}
        <div className="flex gap-3">
          {(['PROPOSE', 'APPROVE', 'REJECT', 'ACTIVATE'] as const).map((action) => (
            <button
              key={action}
              type="button"
              disabled={
                busy ||
                reason.trim().length < 3 ||
                !can(action === 'PROPOSE' ? 'manage-availability' : 'approve-release') ||
                (action === 'ACTIVATE' &&
                  (!detail.readiness.ready || tool.releaseApproval?.status !== 'APPROVED'))
              }
              onClick={() => void mutate(`/release/${action}`, 'POST', { reason })}
            >
              {t(`tools19_${action}`)}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          {(['testing', 'deprecate', 'retire'] as const).map((action) => (
            <button
              key={action}
              type="button"
              disabled={busy || reason.trim().length < 3 || !can('manage-availability')}
              onClick={() => {
                if (window.confirm(t('tools19_confirm')))
                  void mutate(`/lifecycle/${action}`, 'POST', { reason });
              }}
            >
              {t(`tools19_${action}`)}
            </button>
          ))}
        </div>
      </section>
      <section className="border p-4">
        <h3>{t('tools19_eligibility')}</h3>
        <label>
          {t('tools19_consumer')}
          <select
            value={consumerType}
            onChange={(e) => setConsumerType(e.target.value as typeof consumerType)}
          >
            <option value="ANONYMOUS">{statusLabel('ANONYMOUS')}</option>
            <option value="AUTHENTICATED_STUDENT">{statusLabel('AUTHENTICATED_STUDENT')}</option>
          </select>
        </label>
        <button
          type="button"
          disabled={busy || !can('manage-availability')}
          onClick={() => {
            if (fence.current) return;
            const id = ++eligibilityGeneration.current;
            fence.current = true;
            setBusy(true);
            setError('');
            setEligibility(null);
            void adminApiClient
              .request<{ data: unknown }>(`${base}/eligibility`, {
                method: 'POST',
                body: JSON.stringify({ consumerType, locale: language }),
              })
              .then((value) => {
                if (id === eligibilityGeneration.current) setEligibility(value.data);
              })
              .catch(() => {
                if (id === eligibilityGeneration.current) setError('tools19_action_failed');
              })
              .finally(() => {
                fence.current = false;
                setBusy(false);
              });
          }}
        >
          {t('tools19_evaluate')}
        </button>
        <pre>{JSON.stringify(eligibility, null, 2)}</pre>
      </section>
      <form onSubmit={runTest}>
        <fieldset disabled={busy || !can('run-test')} className="border p-4">
          <legend>{t('tools19_test')}</legend>
          <p>{t('tools19_test_notice')}</p>
          <label>
            <input
              type="checkbox"
              checked={testCostApproved}
              onChange={(e) => setTestCostApproved(e.target.checked)}
            />
            {t('tools19_test_approval')}
          </label>
          <label>
            {t('tools19_test_input')}
            <textarea
              dir="ltr"
              className={inputClass}
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
            />
          </label>
          <button type="submit">{t('tools19_run')}</button>
          <pre dir="ltr">{JSON.stringify(testResult, null, 2)}</pre>
        </fieldset>
      </form>
      <details>
        <summary>{t('tools19_contracts')}</summary>
        <pre dir="ltr">
          {JSON.stringify(
            {
              input: tool.inputSchema,
              output: tool.outputSchema,
              dependencies: detail.dependencies,
            },
            null,
            2,
          )}
        </pre>
      </details>
      <details>
        <summary>{t('tools19_telemetry')}</summary>
        <p>{t('tools19_denominator')}</p>
        <pre>{JSON.stringify(detail.telemetry, null, 2)}</pre>
      </details>
      {can('view-executions') && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <label>
              {t('tools19_trace_filter')}
              <input
                maxLength={200}
                className={inputClass}
                value={traceFilter}
                onChange={(event) => {
                  setExecutions({ data: [], total: 0, page: 1, pageSize: 25 });
                  setAudit({ data: [], total: 0, page: 1, pageSize: 25 });
                  setTraceFilter(event.target.value);
                  setExecutionPage(1);
                  setAuditPage(1);
                }}
              />
            </label>
            <label>
              {t('tools19_status')}
              <select
                className={inputClass}
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setExecutionPage(1);
                }}
              >
                <option value="">{t('tools19_all')}</option>
                {['RUNNING', 'COMPLETED', 'FAILED', 'BLOCKED', 'UNKNOWN_OUTCOME'].map((value) => (
                  <option key={value} value={value}>{statusLabel(value)}</option>
                ))}
              </select>
            </label>
            <label>
              {t('tools19_traffic')}
              <select
                className={inputClass}
                value={testFilter}
                onChange={(event) => {
                  setTestFilter(event.target.value);
                  setExecutionPage(1);
                }}
              >
                <option value="">{t('tools19_all')}</option>
                <option value="true">{t('tools19_test')}</option>
                <option value="false">{t('tools19_student')}</option>
              </select>
            </label>
          </div>
          {(
            [
              [executions, executionPage, setExecutionPage, 'tools19_executions'],
              [audit, auditPage, setAuditPage, 'tools19_audit'],
            ] as const
          ).map(([records, page, setPage, label]) => (
            <section key={label}>
              <h3>{t(label)}</h3>
              <pre dir="ltr" className="overflow-auto">
                {JSON.stringify(records.data, null, 2)}
              </pre>
              <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                {t('tools19_previous')}
              </button>
              <span>
                {page} · {records.total}
              </span>
              <button
                type="button"
                disabled={page * 25 >= records.total}
                onClick={() => setPage(page + 1)}
              >
                {t('tools19_next')}
              </button>
            </section>
          ))}
        </>
      )}
    </>
  );
}
