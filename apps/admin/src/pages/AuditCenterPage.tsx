import { FormEvent, useEffect, useRef, useState } from 'react';
import { adminApiClient } from '../api/client';
import { useTranslation } from '../i18n/I18nProvider';
import { useAdminAuthorization } from '../security/AdminAuthorizationContext';
import { AUDIT_QUERY_CATALOG } from '@manaratak/shared';
import { Link } from 'react-router-dom';
import {
  auditFilterParams,
  auditTargetLink,
  auditFormat,
  auditCsvCell as csvCell,
  type AuditTimeZone,
} from './audit/AuditViewModel';
import { ShieldCheck, Download, Filter, RefreshCw, X, FileSearch, Copy } from 'lucide-react';
interface AuditRecordDto {
  id: string;
  reference: string;
  action: string;
  category: string;
  severity: string;
  result?: 'SUCCESS' | 'FAILURE' | 'INTENT' | 'UNKNOWN';
  evidenceLevel?: string;
  actor: {
    actorId: string;
    actorType: string;
  };
  target: {
    targetId: string;
    targetType: string;
  };
  source: string;
  timestamp: string;
  correlationReference?: string;
  traceReference?: string;
  contextMetadata: unknown;
  lifecycleState?: string;
  chainReference?: string;
  complianceMetadata?: string[];
  retentionMetadata?: {
    retentionPeriodInDays: number;
    expiresAt: string;
  };
}
interface AuditPage {
  items: AuditRecordDto[];
  hasMore: boolean;
  nextCursor: string | null;
}
interface IntegrityReport {
  status: 'PASS' | 'FAIL';
  checkedRecords: number;
  brokenChainReferences: string[];
  futureTimestamps: string[];
  scope: 'REFERENCE_LINKAGE_AND_TIMESTAMPS';
  cryptographicVerification: false;
  checkedAt: string;
  maxRecords: number;
  hasMore: boolean;
  nextCursor: string | null;
  range: {
    from: string | null;
    until: string | null;
  };
}
type Filters = {
  reference: string;
  traceId: string;
  actorType: string;
  targetType: string;
  source: string;
  lifecycleState: string;
  result: string;
  complianceTag: string;
  method: string;
  path: string;

  actorId: string;
  targetId: string;
  action: string;
  category: string;
  severity: string;
  correlationId: string;
  from: string;
  until: string;
};
const EMPTY_FILTERS: Filters = {
  reference: '',
  traceId: '',
  actorType: '',
  targetType: '',
  source: '',
  lifecycleState: '',
  result: '',
  complianceTag: '',
  method: '',
  path: '',

  actorId: '',
  targetId: '',
  action: '',
  category: '',
  severity: '',
  correlationId: '',
  from: '',
  until: '',
};
const inputClass =
  'mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs outline-none focus:border-[#21A7B4]';
export function AuditCenterPage() {
  const { t, dir, language } = useTranslation();
  const { hasPermission } = useAdminAuthorization();
  const [timeZone, setTimeZone] = useState<AuditTimeZone>(() => {
    try {
      return localStorage.getItem('manaratak_audit_timezone') === 'LOCAL' ? 'LOCAL' : 'UTC';
    } catch {
      return 'UTC';
    }
  });
  const [appliedZone, setAppliedZone] = useState<AuditTimeZone>(timeZone);
  const zoneLabel = timeZone === 'UTC' ? 'UTC' : Intl.DateTimeFormat().resolvedOptions().timeZone;
  const dateLabel = (value: string) => {
    const date = new Date(value);
    return Number.isFinite(date.getTime())
      ? date.toLocaleString(language, { timeZone: timeZone === 'UTC' ? 'UTC' : undefined })
      : '—';
  };
  const message = (cause: unknown) => {
    if (cause instanceof Error && cause.message === 'AUDIT_DATE_INVALID')
      return t('audit_text_074');
    if (cause instanceof Error && cause.message === 'AUDIT_DATE_RANGE_INVALID')
      return t('audit_text_075');
    const known = [t('audit_text_006'), t('audit_text_007'), t('audit_text_008')];
    return cause instanceof Error && known.includes(cause.message) ? cause.message : t('audit_text_076');
  };
  const fieldLabels: Array<[keyof Filters, string]> = [
    ['actorId', t('audit_text_001')],
    ['targetId', t('audit_text_002')],
    ['action', t('audit_text_003')],
    ['category', t('audit_text_004')],
    ['correlationId', t('audit_text_005')],
    ['reference', t('audit_reference')],
    ['traceId', t('audit_text_069')],
    ['actorType', t('audit_actor_type')],
    ['targetType', t('audit_target_type')],
    ['source', t('audit_text_067')],
    ['complianceTag', t('audit_compliance_tag')],
    ['path', t('audit_request_path')],
  ];
  const [initialFilters] = useState<Filters>(() => {
    const params = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search);
    return {
      ...EMPTY_FILTERS,
      ...Object.fromEntries(
        Object.keys(EMPTY_FILTERS).map((key) => [
          key,
          params.get(key)?.slice(0, key === 'path' ? 2048 : 240) || '',
        ]),
      ),
    };
  });
  const [items, setItems] = useState<AuditRecordDto[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AuditRecordDto | null>(null);
  const [filters, setFilters] = useState<Filters>({ ...initialFilters });
  const [applied, setApplied] = useState<Filters>({ ...initialFilters });
  const [integrity, setIntegrity] = useState<IntegrityReport | null>(null);
  const [integrityLoading, setIntegrityLoading] = useState(false);
  const [integrityError, setIntegrityError] = useState('');
  const [integrityCheckedAt, setIntegrityCheckedAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [exporting, setExporting] = useState(false);
  const exportBusy = useRef(false);
  const [exportCursor, setExportCursor] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const listGeneration = useRef(0);
  const detailGeneration = useRef(0);
  const integrityGeneration = useRef(0);
  const listBusy = useRef(false);
  const integrityBusy = useRef(false);
  const detailPanel = useRef<HTMLDivElement>(null);
  const pendingFilters =
    JSON.stringify(filters) !== JSON.stringify(applied) || timeZone !== appliedZone;
  const load = async (
    reset = true,
    requested: Filters = applied,
    requestedZone: AuditTimeZone = timeZone,
  ) => {
    if (listBusy.current || (!reset && (!cursor || !hasMore))) return;
    let params: URLSearchParams;
    try {
      params = auditFilterParams(requested, reset ? requestedZone : appliedZone);
    } catch (cause) {
      setError(message(cause));
      return;
    }
    listBusy.current = true;
    const request = ++listGeneration.current;
    setLoading(true);
    setError(null);
    setNotice('');
    if (reset) {
      setApplied({ ...requested });
      setAppliedZone(requestedZone);
      setExportCursor(null);
      setItems([]);
      setCursor(null);
      setHasMore(false);
      setSelected(null);
      detailGeneration.current += 1;
      setDetailError('');
      setDetailLoading(false);
    } else if (cursor) params.set('cursor', cursor);
    params.set('limit', '50');
    try {
      const result = await adminApiClient.request<AuditPage>(`/admin/audit/records?${params}`, {
        cache: 'no-store',
      });
      if (request !== listGeneration.current) return;
      if (
        !result ||
        !Array.isArray(result.items) ||
        typeof result.hasMore !== 'boolean' ||
        (result.hasMore && (!result.nextCursor || (!reset && result.nextCursor === cursor)))
      )
        throw new Error(t('audit_text_006'));
      setItems((previous) => [
        ...new Map(
          [...(reset ? [] : previous), ...result.items].map((item) => [item.id, item]),
        ).values(),
      ]);
      setCursor(result.nextCursor);
      setHasMore(result.hasMore);
    } catch (cause) {
      if (request === listGeneration.current) setError(message(cause));
    } finally {
      if (request === listGeneration.current) {
        listBusy.current = false;
        setLoading(false);
      }
    }
  };
  useEffect(() => {
    void load(true, initialFilters);
    return () => {
      listGeneration.current += 1;
      detailGeneration.current += 1;
      integrityGeneration.current += 1;
      listBusy.current = false;
      integrityBusy.current = false;
    };
  }, []);
  useEffect(() => {
    if (selected) {
      detailPanel.current?.focus();
      detailPanel.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selected?.id]);
  const checkIntegrity = async (nextCursor?: string) => {
    if (integrityBusy.current) return;
    integrityBusy.current = true;
    const request = ++integrityGeneration.current;
    setIntegrityLoading(true);
    setIntegrityError('');
    setIntegrity(null);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (nextCursor) params.set('cursor', nextCursor);
      const report = await adminApiClient.request<IntegrityReport>(
        `/admin/audit/integrity?${params}`,
        {
          cache: 'no-store',
        },
      );
      if (
        !report ||
        !['PASS', 'FAIL'].includes(report.status) ||
        !Number.isSafeInteger(report.checkedRecords) ||
        !Array.isArray(report.brokenChainReferences) ||
        !Array.isArray(report.futureTimestamps) ||
        report.scope !== 'REFERENCE_LINKAGE_AND_TIMESTAMPS' ||
        report.cryptographicVerification !== false ||
        !Number.isSafeInteger(report.maxRecords) || report.maxRecords < 1 || report.maxRecords > 100 ||
        report.checkedRecords < 0 || report.checkedRecords > report.maxRecords ||
        !Number.isFinite(Date.parse(report.checkedAt)) || !report.range ||
        typeof report.hasMore !== 'boolean' ||
        (report.hasMore && (typeof report.nextCursor !== 'string' || !report.nextCursor || report.nextCursor === nextCursor))
      )
        throw new Error(t('audit_text_007'));
      if (request === integrityGeneration.current) {
        setIntegrity(report);
        setIntegrityCheckedAt(report.checkedAt);
      }
    } catch (cause) {
      if (request === integrityGeneration.current) setIntegrityError(message(cause));
    } finally {
      if (request === integrityGeneration.current) {
        setIntegrityLoading(false);
        integrityBusy.current = false;
      }
    }
  };
  const showDetail = async (item: AuditRecordDto) => {
    const request = ++detailGeneration.current;
    setSelected(item);
    setDetailLoading(true);
    setDetailError('');
    setNotice('');
    try {
      const record = await adminApiClient.request<AuditRecordDto>(
        `/admin/audit/records/${encodeURIComponent(item.id)}`,
        { cache: 'no-store' },
      );
      if (!record || record.id !== item.id) throw new Error(t('audit_text_008'));
      if (request === detailGeneration.current) setSelected(record);
    } catch (cause) {
      if (request === detailGeneration.current) setDetailError(message(cause));
    } finally {
      if (request === detailGeneration.current) setDetailLoading(false);
    }
  };
  const closeDetail = () => {
    detailGeneration.current += 1;
    setSelected(null);
    setDetailLoading(false);
    setDetailError('');
  };
  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(t('audit_text_009'));
    } catch {
      setNotice(t('audit_text_010'));
    }
  };
  const exportLoaded = () => {
    if (!items.length || loading) return;
    const rows = [
      [
        'timestamp',
        'reference',
        'actorId',
        'actorType',
        'action',
        'category',
        'severity',
        'targetType',
        'targetId',
        'source',
        'correlationReference',
        'traceReference',
      ],
      ...items.map((item) => [
        item.timestamp,
        item.reference,
        item.actor.actorId,
        item.actor.actorType,
        item.action,
        item.category,
        item.severity,
        item.target.targetType,
        item.target.targetId,
        item.source,
        item.correlationReference ?? '',
        item.traceReference ?? '',
      ]),
    ];
    const blob = new Blob(['\ufeff' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `manaratak-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(auditFormat(t('audit_export_loaded_notice'), items.length));
  };
  const exportFiltered = async (nextCursor?: string) => {
    if (exportBusy.current || loading || pendingFilters) return;
    exportBusy.current = true;
    setExporting(true);
    setNotice('');
    const generation = listGeneration.current;
    try {
      const params = auditFilterParams(applied, appliedZone);
      params.set('limit', '100');
      params.set('format', 'json');
      if (nextCursor) params.set('cursor', nextCursor);
      const result = await adminApiClient.request<
        AuditPage & { bounded: boolean; exportedAt: string }
      >(`/admin/audit/export?${params}`, { cache: 'no-store' });
      if (generation !== listGeneration.current) return;
      if (
        !result?.bounded ||
        !Array.isArray(result.items) ||
        result.items.length > 100 ||
        typeof result.hasMore !== 'boolean' ||
        (result.hasMore && (!result.nextCursor || result.nextCursor === nextCursor))
      )
        throw new Error(t('audit_result_invalid'));
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `manaratak-audit-filtered-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExportCursor(result.hasMore ? result.nextCursor : null);
      setNotice(
        auditFormat(
          t('audit_export_scope'),
          result.items.length,
          result.hasMore ? t('audit_export_remaining') : t('audit_export_complete'),
        ),
      );
    } catch {
      if (generation === listGeneration.current) setError(t('audit_export_failed'));
    } finally {
      exportBusy.current = false;
      setExporting(false);
    }
  };
  const friendly = (code: string) => {
    const labels: Record<string, Parameters<typeof t>[0]> = {
      MUTATION_INTENT_RECORDED: 'audit_evidence_intent',
      MUTATION_OUTCOME_RECORDED: 'audit_evidence_http',
      ROLE_ASSIGNED: 'audit_role_assigned',
      ROLE_ASSIGNMENT_REVOKED: 'audit_role_revoked',
      STUDENT_SUPPORT_RESET_LAYOUT: 'audit_support_reset',
      AUTHORIZATION_MUTATION: 'audit_preset_authorization',
      AUTHORIZATION: 'audit_preset_authorization',
      CRITICAL_MUTATION: 'audit_critical_requests',
      STANDARD_MUTATION: 'audit_standard_requests',
      IDENTITY: 'audit_identity_events',
      IDENTITY_MUTATION: 'audit_identity_events',
      STUDENT_SUPPORT: 'audit_student_support',
      FINANCE_MUTATION: 'audit_preset_finance',
      SCHOLARSHIPS_MUTATION: 'audit_scholarship_events',
    };
    return labels[code] ? t(labels[code]) : code;
  };
  const evidence = (code?: string) =>
    t(
      code === 'INTENT_OBSERVED'
        ? 'audit_evidence_intent'
        : code === 'HTTP_OUTCOME_OBSERVED'
          ? 'audit_evidence_http'
          : code === 'ATOMIC_BUSINESS_AUDIT_RECORDED'
            ? 'audit_evidence_atomic'
            : 'audit_evidence_event',
    );
  const optionsFor = (key: keyof Filters): string[] => {
    const values = items.map((item) =>
      key === 'action'
        ? item.action
        : key === 'category'
          ? item.category
          : key === 'actorType'
            ? item.actor.actorType
            : key === 'targetType'
              ? item.target.targetType
              : key === 'source'
                ? item.source
                : '',
    );
    const known =
      key === 'action'
        ? AUDIT_QUERY_CATALOG.actions
        : key === 'category'
          ? AUDIT_QUERY_CATALOG.categories
          : [];
    return [...new Set([...known, ...values].filter(Boolean))].slice(0, 100);
  };
  const preset = (type: 'critical' | 'authorization' | 'finance' | 'emergency') => {
    const next = { ...EMPTY_FILTERS };
    if (type === 'critical') {
      next.category = 'CRITICAL_MUTATION';
      next.result = 'FAILURE';
      next.from = new Date(Date.now() - 86_400_000).toISOString().slice(0, 16);
      next.until = new Date().toISOString().slice(0, 16);
    } else if (type === 'authorization') next.category = 'AUTHORIZATION_MUTATION';
    else if (type === 'finance') next.category = 'FINANCE_MUTATION';
    else next.action = 'EMERGENCY_ACCESS_GRANTED';
    setTimeZone('UTC');
    setFilters(next);
    void load(true, next, 'UTC');
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void load(true, filters);
  };
  const related = (correlationId: string) => {
    const next = { ...EMPTY_FILTERS, correlationId };
    setFilters(next);
    void load(true, next);
  };
  return (
    <div dir={dir} className="mx-auto max-w-7xl space-y-6">
      <section className="rounded-[28px] border border-[#21A7B4]/30 bg-gradient-to-l from-[#0E7C86] via-[#103E6A] to-[#142B5F] p-6 text-white shadow-lg sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-bold text-cyan-200">
              <ShieldCheck className="h-4 w-4" />
              {t('audit_text_011')}
            </div>
            <h1 className="text-3xl font-black">{t('audit_text_012')}</h1>
            <p className="mt-3 text-sm leading-7 text-cyan-50">{t('audit_text_013')}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void exportFiltered()}
              disabled={loading || exporting || pendingFilters}
              className="min-h-11 rounded-xl border border-white/20 px-4 text-xs font-bold disabled:opacity-50"
            >
              {t('audit_export_filtered')}
            </button>
            {exportCursor && (
              <button
                type="button"
                onClick={() => void exportFiltered(exportCursor)}
                disabled={loading || exporting || pendingFilters}
                className="min-h-11 rounded-xl border border-white/20 px-4 text-xs font-bold disabled:opacity-50"
              >
                {t('audit_export_next')}
              </button>
            )}
            <button
              type="button"
              onClick={exportLoaded}
              disabled={loading || exporting || !items.length}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-xs font-bold disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {t('audit_text_014')}
              {items.length})
            </button>
            <button
              type="button"
              onClick={() => void load(true, applied, appliedZone)}
              disabled={loading || exporting}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#21A7B4] px-4 text-xs font-bold disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {t('audit_text_015')}
            </button>
          </div>
        </div>
      </section>
      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {t('audit_text_016')}
          {error}
        </div>
      )}
      {notice && (
        <p role="status" className="rounded-xl bg-teal-50 p-3 text-sm text-teal-800">
          {notice}
        </p>
      )}
      <section className="rounded-3xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-black text-[#142B5F]">{t('audit_text_017')}</h2>
            <p className="mt-1 text-xs text-slate-500">{t('audit_text_018')}</p>
          </div>
          <button
            type="button"
            onClick={() => void checkIntegrity()}
            disabled={integrityLoading}
            className="min-h-11 rounded-xl bg-[#142B5F] px-4 text-xs font-bold text-white disabled:opacity-50"
          >
            {integrityLoading ? t('audit_text_019') : t('audit_text_020')}
          </button>
        </div>
        <p
          role="status"
          className={`mt-3 text-sm font-bold ${integrity?.status === 'FAIL' ? 'text-rose-700' : 'text-[#0E7C86]'}`}
        >
          {integrityLoading
            ? t('audit_text_021')
            : integrity
              ? auditFormat(
                  t('audit_integrity_summary'),
                  integrity.status === 'PASS' ? t('audit_text_022') : t('audit_text_023'),
                  integrity.checkedRecords,
                  integrity.brokenChainReferences.length,
                  integrity.futureTimestamps.length,
                  dateLabel(integrityCheckedAt),
                  integrity.hasMore ? t('audit_text_024') : t('audit_text_025'),
                )
              : integrityError
                ? t('audit_text_026')
                : t('audit_text_027')}
        </p>
        {integrity && (
          <p className="mt-2 text-xs text-slate-500">
            {t('audit_text_028')}
            {integrity.range.from ? dateLabel(integrity.range.from) : '—'} —{' '}
            {integrity.range.until ? dateLabel(integrity.range.until) : '—'}
          </p>
        )}
        {integrity?.hasMore && integrity.nextCursor && (
          <button
            type="button"
            disabled={integrityLoading}
            onClick={() => void checkIntegrity(integrity.nextCursor!)}
            className="mt-3 min-h-11 rounded-xl border border-slate-200 px-4 text-xs font-bold disabled:opacity-50"
          >
            {t('audit_text_029')}
          </button>
        )}
        {integrityError && (
          <p role="alert" className="mt-2 text-xs text-amber-700">
            {integrityError}
          </p>
        )}
        {integrity?.status === 'FAIL' && (
          <details className="mt-3 text-xs">
            <summary className="cursor-pointer font-bold">{t('audit_text_030')}</summary>
            <pre dir="ltr" className="mt-2 max-h-60 overflow-auto rounded-xl bg-slate-50 p-3">
              {JSON.stringify(
                {
                  brokenChainReferences: integrity.brokenChainReferences,
                  futureTimestamps: integrity.futureTimestamps,
                },
                null,
                2,
              )}
            </pre>
          </details>
        )}
      </section>
      <form onSubmit={submit} className="rounded-3xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex flex-wrap gap-2">
          {(['critical', 'authorization', 'finance', 'emergency'] as const).map((type) => (
            <button
              key={type}
              type="button"
              disabled={loading || exporting}
              onClick={() => preset(type)}
              className="min-h-10 rounded-lg border px-3 text-xs disabled:opacity-50"
            >
              {t(
                type === 'critical'
                  ? 'audit_preset_critical_failures'
                  : type === 'authorization'
                    ? 'audit_preset_authorization'
                    : type === 'finance'
                      ? 'audit_preset_finance'
                      : 'audit_preset_breakglass',
              )}
            </button>
          ))}
        </div>
        <fieldset
          disabled={loading || exporting}
          className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <label className="text-xs font-bold text-[#142B5F]">
            {t('audit_timezone')} — {zoneLabel}
            <select
              className={inputClass}
              value={timeZone}
              onChange={(event) => {
                const zone = event.target.value as AuditTimeZone;
                setTimeZone(zone);
                try {
                  localStorage.setItem('manaratak_audit_timezone', zone);
                } catch {
                  /* preference storage is optional */
                }
              }}
            >
              <option value="UTC">UTC</option>
              <option value="LOCAL">{t('audit_local_timezone')}</option>
            </select>
          </label>
          {fieldLabels.map(([key, label]) => (
            <label key={key} className="text-xs font-bold text-[#142B5F]">
              {label}
              <input
                value={filters[key]}
                maxLength={key === 'path' ? 2048 : 240}
                list={`audit-options-${key}`}
                onChange={(event) =>
                  setFilters((previous) => ({ ...previous, [key]: event.target.value }))
                }
                className={inputClass}
              />
              <datalist id={`audit-options-${key}`}>
                {optionsFor(key).map((code) => (
                  <option key={code} value={code}>
                    {friendly(code)} · {code}
                  </option>
                ))}
              </datalist>
            </label>
          ))}
          {(['result', 'lifecycleState', 'method'] as const).map((key) => (
            <label key={key} className="text-xs font-bold text-[#142B5F]">
              {t(
                key === 'result'
                  ? 'audit_text_063'
                  : key === 'lifecycleState'
                    ? 'audit_text_068'
                    : 'audit_http_method',
              )}
              <select
                value={filters[key]}
                className={inputClass}
                onChange={(event) =>
                  setFilters((previous) => ({ ...previous, [key]: event.target.value }))
                }
              >
                <option value="">{t('audit_all')}</option>
                {(key === 'result'
                  ? ['SUCCESS', 'FAILURE', 'INTENT', 'UNKNOWN']
                  : key === 'lifecycleState'
                    ? ['RECORDED', 'ARCHIVED']
                    : ['POST', 'PUT', 'PATCH', 'DELETE']
                ).map((value) => (
                  <option key={value} value={value}>
                    {key === 'result'
                      ? t(
                          value === 'SUCCESS'
                            ? 'audit_text_051'
                            : value === 'FAILURE'
                              ? 'audit_text_052'
                              : value === 'INTENT'
                                ? 'audit_text_050'
                                : 'audit_text_053',
                        )
                      : value}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <label className="text-xs font-bold text-[#142B5F]">
            {t('audit_text_031')}
            <select
              value={filters.severity}
              onChange={(event) =>
                setFilters((previous) => ({ ...previous, severity: event.target.value }))
              }
              className={inputClass}
            >
              <option value="">{t('audit_text_032')}</option>
              {['INFO', 'WARNING', 'ERROR', 'CRITICAL'].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold text-[#142B5F]">
            {t('audit_text_033')}
            <input
              type="datetime-local"
              value={filters.from}
              onChange={(event) =>
                setFilters((previous) => ({ ...previous, from: event.target.value }))
              }
              className={inputClass}
            />
          </label>
          <label className="text-xs font-bold text-[#142B5F]">
            {t('audit_text_034')}
            <input
              type="datetime-local"
              value={filters.until}
              onChange={(event) =>
                setFilters((previous) => ({ ...previous, until: event.target.value }))
              }
              className={inputClass}
            />
          </label>
          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#142B5F] px-4 text-xs font-bold text-white disabled:opacity-50"
          >
            <Filter className="h-4 w-4" />
            {t('audit_text_035')}
          </button>
          <button
            type="button"
            onClick={() => {
              setFilters({ ...EMPTY_FILTERS });
              void load(true, EMPTY_FILTERS);
            }}
            className="min-h-11 rounded-xl border border-slate-200 px-4 text-xs font-bold text-[#142B5F]"
          >
            {t('audit_text_036')}
          </button>
        </fieldset>
        <p className="mt-3 text-xs text-slate-500">{t('audit_suggestions')}</p>
        <div aria-label={t('audit_active_filters')} className="mt-3 flex flex-wrap gap-2">
          {Object.entries(applied)
            .filter(([, value]) => Boolean(value))
            .map(([key, value]) => (
              <code key={key} className="rounded-lg bg-slate-100 p-2 text-xs">
                {key}: {value}
              </code>
            ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          {pendingFilters ? t('audit_text_037') : t('audit_text_038')}
        </p>
      </form>
      {applied.correlationId && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="font-bold">
            {t('audit_timeline')} — <code>{applied.correlationId}</code>
          </h2>
          <p className="mt-2 text-xs text-slate-500">{t('audit_timeline_scope')}</p>
          <ol className="mt-3 space-y-3">
            {[...items]
              .sort(
                (a, b) =>
                  Date.parse(a.timestamp) - Date.parse(b.timestamp) || a.id.localeCompare(b.id),
              )
              .map((item) => (
                <li key={item.id} className="border-s-2 border-teal-500 ps-3 text-xs">
                  <time>{dateLabel(item.timestamp)}</time> · {friendly(item.action)} ·{' '}
                  {evidence(item.evidenceLevel)}
                  <code className="block text-slate-500">
                    {item.action} — {item.reference}
                  </code>
                </li>
              ))}
          </ol>
        </section>
      )}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
          <h2 className="font-black text-[#142B5F]">
            {t('audit_text_039')}
            {items.length})
          </h2>
          <p className="mt-1 text-xs text-slate-500">{t('audit_text_040')}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                {[
                  t('audit_text_041'),
                  t('audit_text_042'),
                  t('audit_text_043'),
                  t('audit_text_044'),
                  t('audit_text_045'),
                  t('audit_text_046'),
                ].map((label) => (
                  <th key={label} className="p-3.5 text-start">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!items.length && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    {loading
                      ? t('audit_text_047')
                      : error
                        ? t('audit_text_048')
                        : t('audit_text_049')}
                  </td>
                </tr>
              )}
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-teal-50/40">
                  <td className="whitespace-nowrap p-3.5">{dateLabel(item.timestamp)}</td>
                  <td className="p-3.5">
                    {auditTargetLink(item.actor.actorType, item.actor.actorId, hasPermission) ? (
                      <Link
                        className="underline"
                        to={auditTargetLink(
                          item.actor.actorType,
                          item.actor.actorId,
                          hasPermission,
                        )!}
                      >
                        {item.actor.actorId}
                      </Link>
                    ) : (
                      <code>{item.actor.actorId}</code>
                    )}
                    <div className="mt-1 text-slate-400">{item.actor.actorType}</div>
                  </td>
                  <td className="p-3.5 font-bold text-[#142B5F]">
                    {friendly(item.action)}
                    <code className="block text-slate-400">{item.action}</code>
                    <span className="mt-1 block text-xs text-slate-500">
                      {item.result === 'INTENT'
                        ? t('audit_text_050')
                        : item.result === 'SUCCESS'
                          ? t('audit_text_051')
                          : item.result === 'FAILURE'
                            ? t('audit_text_052')
                            : t('audit_text_053')}
                    </span>
                  </td>
                  <td className="p-3.5 font-bold text-[#0E7C86]">
                    {friendly(item.category)}
                    <code className="block text-slate-400">{item.category}</code>
                    <span className="mt-1 block text-xs text-slate-500">{item.severity}</span>
                  </td>
                  <td className="p-3.5">
                    {auditTargetLink(
                      item.target.targetType,
                      item.target.targetId,
                      hasPermission,
                    ) ? (
                      <Link
                        className="underline"
                        to={auditTargetLink(
                          item.target.targetType,
                          item.target.targetId,
                          hasPermission,
                        )!}
                      >
                        {item.target.targetType}:{item.target.targetId}
                      </Link>
                    ) : (
                      <code>
                        {item.target.targetType}:{item.target.targetId}
                      </code>
                    )}
                  </td>
                  <td className="p-3.5">
                    <button
                      type="button"
                      onClick={() => void showDetail(item)}
                      className="inline-flex min-h-10 items-center gap-1 rounded-lg border px-3 text-[#142B5F]"
                      aria-label={auditFormat(t('audit_record_details_label'), item.reference)}
                    >
                      <FileSearch className="h-4 w-4" />
                      {t('audit_text_054')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {hasMore && (
        <div className="text-center">
          <button
            type="button"
            disabled={loading || pendingFilters}
            onClick={() => void load(false, applied)}
            className="min-h-11 rounded-2xl border border-slate-200 bg-white px-6 text-xs font-bold text-[#142B5F] disabled:opacity-50"
          >
            {loading ? t('audit_text_055') : t('audit_text_056')}
          </button>
        </div>
      )}
      {selected && (
        <div
          ref={detailPanel}
          tabIndex={-1}
          aria-labelledby="audit-detail-title"
          className="rounded-3xl border border-[#21A7B4]/30 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <h3 id="audit-detail-title" className="font-black text-[#142B5F]">
              {t('audit_text_057')}
              {selected.reference}
            </h3>
            <button
              type="button"
              onClick={closeDetail}
              aria-label={t('audit_text_058')}
              className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {detailLoading && (
            <p role="status" className="mt-3 text-xs text-slate-500">
              {t('audit_text_059')}
            </p>
          )}
          {detailError && (
            <p role="alert" className="mt-3 text-xs text-amber-700">
              {t('audit_text_060')}
              {detailError}
            </p>
          )}
          <dl className="mt-4 grid gap-4 text-xs sm:grid-cols-2 lg:grid-cols-3">
            {[
              [t('audit_text_061'), selected.id],
              [t('audit_text_042'), `${selected.actor.actorType}: ${selected.actor.actorId}`],
              [t('audit_text_045'), `${selected.target.targetType}: ${selected.target.targetId}`],
              [t('audit_text_062'), dateLabel(selected.timestamp)],
              [t('audit_text_043'), selected.action],
              [t('audit_text_063'), selected.result || 'UNKNOWN'],
              [t('audit_text_064'), evidence(selected.evidenceLevel)],
              [t('audit_text_065'), selected.category],
              [t('audit_text_066'), selected.severity],
              [t('audit_text_067'), selected.source],
              [t('audit_text_068'), selected.lifecycleState || '—'],
              [t('audit_text_005'), selected.correlationReference || '—'],
              [t('audit_text_069'), selected.traceReference || '—'],
              [t('audit_text_070'), selected.chainReference || '—'],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="font-bold text-[#0E7C86]">{label}</dt>
                <dd className="mt-1 break-all leading-6 text-slate-700">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void copy(selected.id)}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-xs"
            >
              <Copy className="h-4 w-4" />
              {t('audit_text_071')}
            </button>
            {selected.correlationReference && (
              <button
                type="button"
                disabled={loading || exporting}
                onClick={() => related(selected.correlationReference!)}
                className="min-h-10 rounded-lg bg-teal-50 px-3 text-xs font-bold text-[#0E7C86]"
              >
                {t('audit_text_072')}
              </button>
            )}
          </div>
          <details className="mt-4" open>
            <summary className="cursor-pointer text-sm font-bold text-[#142B5F]">
              {t('audit_text_073')}
            </summary>
            <pre
              className="mt-3 max-h-96 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-cyan-200"
              dir="ltr"
            >
              {JSON.stringify(selected, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
