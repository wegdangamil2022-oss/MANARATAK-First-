import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Database,
  Loader2,
  Play,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  SearchCheck,
  ShieldCheck,
  Waypoints,
  XCircle,
} from 'lucide-react';
import { useTranslation } from '../i18n/I18nProvider';
import {
  scholarshipImportCenterApi,
  type ScholarshipAcquisitionMode,
  type ScholarshipCanonicalResolutionInput,
  type ScholarshipCanonicalTarget,
  type ScholarshipImportCenterDiff,
  type ScholarshipImportCenterMergeProposal,
  type ScholarshipImportCenterOverview,
  type ScholarshipImportCenterRecordList,
  type ScholarshipImportCenterRecordView,
  type ScholarshipImportCenterScanResult,
  type ScholarshipImportCenterSources,
  type ScholarshipImportHistoryEvent,
  type ScholarshipImportNewResult,
  type ScholarshipImportOperationalClass,
  type ScholarshipImportReviewAction,
  type ScholarshipSourceCreateInput,
  type ScholarshipSourceRegistryItem,
  type ScholarshipSourceType,
} from '../api/scholarshipImportCenter';

type WorkspaceTab =
  | 'overview'
  | 'sources'
  | 'import-new'
  | 'incoming'
  | 'screening'
  | 'duplicates'
  | 'missing'
  | 'verification'
  | 'review'
  | 'ready'
  | 'history';

type Copy = {
  title: string;
  subtitle: string;
  back: string;
  refresh: string;
  operationalClass: string;
  loading: string;
  noRecords: string;
  inspect: string;
  exact: string;
  partial: string;
  scanned: string;
  sourceTotal: string;
  capabilities: string;
  sourceRegistry: string;
  runtimePending: string;
  authoritativeRegistry: string;
  registryUnavailable: string;
  observedStatistics: string;
  addSource: string;
  sourceId: string;
  sourceName: string;
  sourceType: string;
  acquisitionMode: string;
  baseUrl: string;
  status: string;
  allowedOrigins: string;
  pathPrefixes: string;
  allowSubdomains: string;
  rpm: string;
  burst: string;
  minDelay: string;
  create: string;
  activate: string;
  disable: string;
  importNew: string;
  selectSource: string;
  targetUrl: string;
  parser: string;
  structuredJson: string;
  runImport: string;
  networkImportNote: string;
  manualImportNote: string;
  importResult: string;
  record: string;
  source: string;
  screeningOrigin: string;
  completeness: string;
  dedupe: string;
  verification: string;
  canonical: string;
  reviewReasons: string;
  ready: string;
  transferred: string;
  rawPayload: string;
  diff: string;
  mergeProposal: string;
  reviewDecision: string;
  reason: string;
  transfer: string;
  verifyRecord: string;
  verificationReason: string;
  markVerified: string;
  markFailed: string;
  canonicalReview: string;
  canonicalId: string;
  resolve: string;
  reject: string;
  notApplicable: string;
  historyEvents: string;
  event: string;
  occurredAt: string;
  eventData: string;
  noCanonicalItems: string;
  reviewDisabled: string;
  transferDisabled: string;
  transferNotReady: string;
  saved: string;
  totalIncoming: string;
  newRecords: string;
  duplicates: string;
  updates: string;
  incomplete: string;
  conflicts: string;
  needsReview: string;
  readyToTransfer: string;
  failed: string;
  transferredCount: string;
  tabs: Record<WorkspaceTab, string>;
  reviewActions: Record<ScholarshipImportReviewAction, string>;
};

const copy: Record<'en' | 'ar', Copy> = {
  en: {
    title: 'Scholarship Import Center',
    subtitle: 'API-backed Phase 12 workspace. Source registry, acquisition, screening and review state come from WP12-7.',
    back: 'Back to Import Management',
    refresh: 'Refresh',
    operationalClass: 'Operational class',
    loading: 'Loading…',
    noRecords: 'No records returned by the backend for this view.',
    inspect: 'Inspect',
    exact: 'Counts are exact',
    partial: 'Scan limit reached; counts are partial',
    scanned: 'Scanned',
    sourceTotal: 'Source total',
    capabilities: 'Backend capabilities',
    sourceRegistry: 'Source registry',
    runtimePending: 'Live runtime proof remains deferred to Google Studio.',
    authoritativeRegistry: 'Authoritative Scholarship Source Registry',
    registryUnavailable: 'Scholarship Source Registry is not configured.',
    observedStatistics: 'Observed import statistics',
    addSource: 'Register source',
    sourceId: 'Source ID',
    sourceName: 'Source name',
    sourceType: 'Source type',
    acquisitionMode: 'Acquisition mode',
    baseUrl: 'Base URL',
    status: 'Status',
    allowedOrigins: 'Allowed origins (one per line)',
    pathPrefixes: 'Allowed path prefixes (one per line)',
    allowSubdomains: 'Allow subdomains',
    rpm: 'Requests / minute',
    burst: 'Burst limit',
    minDelay: 'Minimum delay (ms)',
    create: 'Create source',
    activate: 'Activate',
    disable: 'Disable',
    importNew: 'Import New',
    selectSource: 'Registered source',
    targetUrl: 'Target URL (optional; otherwise source base URL)',
    parser: 'Parser hint',
    structuredJson: 'Structured JSON payload',
    runImport: 'Run acquisition / staging',
    networkImportNote: 'Network sources go through the registered WP12-6 connector and URL scope. Unsupported HTML/feed/sitemap extraction remains acquisition-only.',
    manualImportNote: 'The current HTTP contract accepts structured manual JSON. Manual CSV/NDJSON file bytes are not fabricated by this UI.',
    importResult: 'Import result',
    record: 'Record',
    source: 'Source',
    screeningOrigin: 'Screening origin',
    completeness: 'Completeness',
    dedupe: 'Dedupe',
    verification: 'Verification',
    canonical: 'Canonical',
    reviewReasons: 'Review reasons',
    ready: 'Ready',
    transferred: 'Transferred',
    rawPayload: 'Raw payload',
    diff: 'Field diff',
    mergeProposal: 'Merge proposal',
    reviewDecision: 'Review decision',
    reason: 'Reason',
    transfer: 'Transfer to draft catalog',
    verifyRecord: 'Verification decision',
    verificationReason: 'Required verification reason',
    markVerified: 'Mark VERIFIED',
    markFailed: 'Mark FAILED',
    canonicalReview: 'Canonical resolution review',
    canonicalId: 'Existing canonical ID',
    resolve: 'Resolve',
    reject: 'Reject resolution',
    notApplicable: 'Not applicable',
    historyEvents: 'History events',
    event: 'Event',
    occurredAt: 'Occurred at',
    eventData: 'Data',
    noCanonicalItems: 'No staged canonical screening items are available in this record.',
    reviewDisabled: 'Backend review-decision persistence is not configured.',
    transferDisabled: 'Atomic transfer is not configured; the UI will not bypass the backend gate.',
    transferNotReady: 'This record is not ready to transfer.',
    saved: 'Saved.',
    totalIncoming: 'Incoming',
    newRecords: 'New',
    duplicates: 'Duplicates',
    updates: 'Updates',
    incomplete: 'Incomplete',
    conflicts: 'Conflicts',
    needsReview: 'Needs review',
    readyToTransfer: 'Ready to transfer',
    failed: 'Failed processing',
    transferredCount: 'Transferred',
    tabs: {
      overview: 'Overview',
      sources: 'Sources',
      'import-new': 'Import New',
      incoming: 'Incoming',
      screening: 'Screening',
      duplicates: 'Duplicates / Updates',
      missing: 'Missing Data',
      verification: 'Verification',
      review: 'Review Queue',
      ready: 'Ready to Transfer',
      history: 'History',
    },
    reviewActions: { MERGE: 'Merge', KEEP_CURRENT: 'Keep current', SPLIT: 'Split' },
  },
  ar: {
    title: 'مركز استيراد المنح',
    subtitle: 'مساحة عمل المرحلة 12 مرتبطة مباشرة بواجهات WP12-7؛ المصادر والاكتساب والفحص والمراجعة كلها من الـBackend.',
    back: 'العودة إلى إدارة الاستيراد',
    refresh: 'تحديث',
    operationalClass: 'الفئة التشغيلية',
    loading: 'جارٍ التحميل…',
    noRecords: 'لا توجد سجلات أعادها الـBackend لهذا العرض.',
    inspect: 'فحص',
    exact: 'الأعداد دقيقة',
    partial: 'تم بلوغ حد الفحص؛ الأعداد جزئية',
    scanned: 'تم فحص',
    sourceTotal: 'إجمالي المصدر',
    capabilities: 'قدرات الـBackend',
    sourceRegistry: 'سجل المصادر',
    runtimePending: 'إثبات التشغيل الحي مؤجل إلى Google Studio.',
    authoritativeRegistry: 'سجل مصادر المنح الرسمي',
    registryUnavailable: 'سجل مصادر المنح غير مهيأ.',
    observedStatistics: 'إحصاءات الاستيراد المرصودة',
    addSource: 'تسجيل مصدر',
    sourceId: 'معرّف المصدر',
    sourceName: 'اسم المصدر',
    sourceType: 'نوع المصدر',
    acquisitionMode: 'طريقة الاكتساب',
    baseUrl: 'الرابط الأساسي',
    status: 'الحالة',
    allowedOrigins: 'النطاقات المسموحة (كل نطاق في سطر)',
    pathPrefixes: 'بادئات المسارات المسموحة (كل مسار في سطر)',
    allowSubdomains: 'السماح بالنطاقات الفرعية',
    rpm: 'الطلبات / الدقيقة',
    burst: 'حد الدفعة',
    minDelay: 'أقل تأخير (ms)',
    create: 'إنشاء المصدر',
    activate: 'تفعيل',
    disable: 'تعطيل',
    importNew: 'استيراد جديد',
    selectSource: 'المصدر المسجل',
    targetUrl: 'الرابط المستهدف (اختياري؛ وإلا يستخدم الرابط الأساسي)',
    parser: 'نوع المحلل',
    structuredJson: 'بيانات JSON منظمة',
    runImport: 'بدء الاكتساب / التجهيز',
    networkImportNote: 'المصادر الشبكية تمر عبر موصل WP12-6 المسجل ونطاق الأمان. HTML/Feed/Sitemap بلا mapping معتمد تبقى اكتسابًا فقط.',
    manualImportNote: 'عقد HTTP الحالي يقبل JSON يدويًا منظمًا. الواجهة لا تدّعي رفع CSV/NDJSON يدويًا إذا لم يدعمه العقد.',
    importResult: 'نتيجة الاستيراد',
    record: 'السجل',
    source: 'المصدر',
    screeningOrigin: 'مصدر الفحص',
    completeness: 'الاكتمال',
    dedupe: 'التكرار',
    verification: 'التحقق',
    canonical: 'الربط المرجعي',
    reviewReasons: 'أسباب المراجعة',
    ready: 'جاهز',
    transferred: 'منقول',
    rawPayload: 'البيانات الخام',
    diff: 'فروقات الحقول',
    mergeProposal: 'اقتراح الدمج',
    reviewDecision: 'قرار المراجعة',
    reason: 'السبب',
    transfer: 'نقل إلى كتالوج المسودات',
    verifyRecord: 'قرار التحقق',
    verificationReason: 'سبب التحقق مطلوب',
    markVerified: 'اعتماد VERIFIED',
    markFailed: 'تسجيل FAILED',
    canonicalReview: 'مراجعة الربط المرجعي',
    canonicalId: 'معرّف Canonical موجود',
    resolve: 'اعتماد الربط',
    reject: 'رفض الربط',
    notApplicable: 'غير منطبق',
    historyEvents: 'الأحداث التاريخية',
    event: 'الحدث',
    occurredAt: 'وقت الحدث',
    eventData: 'البيانات',
    noCanonicalItems: 'لا توجد عناصر فحص مرجعي محفوظة في هذا السجل.',
    reviewDisabled: 'حفظ قرارات المراجعة غير مهيأ في الـBackend.',
    transferDisabled: 'النقل الذري غير مهيأ ولن تتجاوز الواجهة بوابة الـBackend.',
    transferNotReady: 'السجل غير جاهز للنقل.',
    saved: 'تم الحفظ.',
    totalIncoming: 'الوارد',
    newRecords: 'جديد',
    duplicates: 'مكرر',
    updates: 'تحديثات',
    incomplete: 'ناقص',
    conflicts: 'تعارضات',
    needsReview: 'يحتاج مراجعة',
    readyToTransfer: 'جاهز للنقل',
    failed: 'فشل المعالجة',
    transferredCount: 'منقول',
    tabs: {
      overview: 'نظرة عامة',
      sources: 'المصادر',
      'import-new': 'استيراد جديد',
      incoming: 'الوارد',
      screening: 'الفحص',
      duplicates: 'التكرار / التحديثات',
      missing: 'البيانات الناقصة',
      verification: 'التحقق',
      review: 'قائمة المراجعة',
      ready: 'جاهز للنقل',
      history: 'السجل التاريخي',
    },
    reviewActions: { MERGE: 'دمج', KEEP_CURRENT: 'الاحتفاظ بالحالي', SPLIT: 'فصل' },
  },
};

const tabs: WorkspaceTab[] = [
  'overview', 'sources', 'import-new', 'incoming', 'screening', 'duplicates',
  'missing', 'verification', 'review', 'ready', 'history',
];
const operationalClasses: ScholarshipImportOperationalClass[] = ['REAL', 'TEST', 'DEMO', 'ARCHIVED', 'UNCLASSIFIED'];
const sourceTypes: ScholarshipSourceType[] = [
  'SCHOLARSHIP_WEBSITE', 'GOVERNMENT_SCHOLARSHIP_PORTAL', 'FOUNDATION_DONOR_PORTAL', 'AGGREGATOR', 'MANUAL_FILE',
];
const acquisitionModes: ScholarshipAcquisitionMode[] = ['WEBSITE', 'SITEMAP', 'FEED', 'API', 'MANUAL_FILE'];
const networkSourceTypes: Exclude<ScholarshipSourceType, 'MANUAL_FILE'>[] = ['SCHOLARSHIP_WEBSITE', 'GOVERNMENT_SCHOLARSHIP_PORTAL', 'FOUNDATION_DONOR_PORTAL', 'AGGREGATOR'];
const networkAcquisitionModes: Exclude<ScholarshipAcquisitionMode, 'MANUAL_FILE'>[] = ['WEBSITE', 'SITEMAP', 'FEED', 'API'];

function sourceTypeChange(sourceType: ScholarshipSourceType, currentMode: ScholarshipAcquisitionMode) {
  return { sourceType, acquisitionMode: sourceType === 'MANUAL_FILE' ? 'MANUAL_FILE' as const : currentMode === 'MANUAL_FILE' ? 'WEBSITE' as const : currentMode };
}

function acquisitionModeChange(acquisitionMode: ScholarshipAcquisitionMode, currentType: ScholarshipSourceType) {
  return { acquisitionMode, sourceType: acquisitionMode === 'MANUAL_FILE' ? 'MANUAL_FILE' as const : currentType === 'MANUAL_FILE' ? 'SCHOLARSHIP_WEBSITE' as const : currentType };
}

function validSourceModePair(sourceType: ScholarshipSourceType, acquisitionMode: ScholarshipAcquisitionMode): boolean {
  return sourceType === 'MANUAL_FILE'
    ? acquisitionMode === 'MANUAL_FILE'
    : networkSourceTypes.includes(sourceType) && networkAcquisitionModes.includes(acquisitionMode as Exclude<ScholarshipAcquisitionMode, 'MANUAL_FILE'>);
}

function mutableSourceStatus(status: ScholarshipSourceRegistryItem['status']): 'ACTIVE' | 'DISABLED' | null {
  if (status === 'ACTIVE') return 'DISABLED';
  if (status === 'DISABLED') return 'ACTIVE';
  return null;
}

function cls(value: string): string {
  const normalized = value.toUpperCase();
  if (normalized.includes('FAILED') || normalized.includes('INCOMPLETE') || normalized.includes('CONFLICT') || normalized.includes('COLLISION') || normalized.includes('REJECTED')) {
    return 'border-red-200 bg-red-50 text-red-700';
  }
  if (normalized.includes('PENDING') || normalized.includes('REVIEW') || normalized.includes('NOT_') || normalized.includes('DEFERRED') || normalized.includes('AWAITING')) {
    return 'border-amber-200 bg-amber-50 text-amber-800';
  }
  if (normalized.includes('ACTIVE') || normalized.includes('COMPLETE') || normalized.includes('VERIFIED') || normalized.includes('CLEAR') || normalized.includes('STAGED') || normalized === 'NEW') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }
  return 'border-slate-200 bg-slate-50 text-slate-700';
}

function Badge({ value }: { value: string }) {
  return <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold ${cls(value)}`}>{value}</span>;
}

function Panel({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      <h2 className="mb-4 text-base font-bold text-slate-900">{title}</h2>
      {children}
    </section>
  );
}

function ScanNotice({ scan, text }: { scan: Pick<ScholarshipImportCenterScanResult, 'countsExact' | 'scanTruncated' | 'scannedRecords' | 'sourceTotal'>; text: Copy }) {
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${scan.countsExact ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
      <div className="flex flex-wrap items-center gap-3">
        <strong>{scan.countsExact ? text.exact : text.partial}</strong>
        <span>{text.scanned}: {scan.scannedRecords}</span>
        <span>{text.sourceTotal}: {scan.sourceTotal}</span>
        {scan.scanTruncated ? <AlertTriangle className="h-4 w-4" /> : null}
      </div>
    </div>
  );
}

function metricRows(overview: ScholarshipImportCenterOverview, text: Copy) {
  return [
    [text.totalIncoming, overview.totalIncoming], [text.newRecords, overview.newRecords],
    [text.duplicates, overview.duplicateRecords], [text.updates, overview.updateRecords],
    [text.incomplete, overview.incomplete], [text.conflicts, overview.conflicts],
    [text.needsReview, overview.needsReview], [text.readyToTransfer, overview.readyToTransfer],
    [text.failed, overview.failedProcessing], [text.transferredCount, overview.transferred],
  ] as const;
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}


function pretty(value: unknown): string {
  try { return JSON.stringify(value, null, 2); } catch { return String(value); }
}

function metadataOf(source: ScholarshipSourceRegistryItem) {
  return objectValue(source.metadata);
}

function sourceMode(source: ScholarshipSourceRegistryItem): ScholarshipAcquisitionMode | undefined {
  const mode = stringValue(metadataOf(source).acquisitionMode);
  return acquisitionModes.includes(mode as ScholarshipAcquisitionMode) ? mode as ScholarshipAcquisitionMode : undefined;
}

function canonicalItems(record: ScholarshipImportCenterRecordView): Array<{
  key: string;
  target: ScholarshipCanonicalTarget;
  rawValue: string;
  state: string;
}> {
  const raw = objectValue(record.rawPayload);
  const handoff = objectValue(raw._domainHandoff);
  const metadata = objectValue(raw.metadata);
  const candidate = Array.isArray(handoff.canonicalScreening)
    ? handoff.canonicalScreening
    : Array.isArray(metadata.canonicalScreening)
      ? metadata.canonicalScreening
      : Array.isArray(raw._canonicalScreening)
        ? raw._canonicalScreening
        : [];
  return candidate.map(objectValue).flatMap((entry) => {
    const key = stringValue(entry.requirementKey) ?? stringValue(entry.fieldOrRequirementKey) ?? stringValue(entry.target);
    const target = stringValue(entry.canonicalEntityType) ?? stringValue(entry.target);
    const rawValue = stringValue(entry.rawValue) ?? stringValue(entry.requestedCanonicalId) ?? stringValue(entry.canonicalId);
    const state = stringValue(entry.state) ?? 'NOT_EXECUTED';
    const allowedTargets: ScholarshipCanonicalTarget[] = ['PROVIDER_UNIVERSITY', 'UNIVERSITY', 'ACADEMIC_PROGRAM', 'COUNTRY', 'LANGUAGE', 'CURRENCY', 'DEGREE_LEVEL', 'MAJOR', 'INTERNATIONAL_TEST'];
    if (!key || !rawValue || !allowedTargets.includes(target as ScholarshipCanonicalTarget)) return [];
    return [{ key, target: target as ScholarshipCanonicalTarget, rawValue, state }];
  });
}

function SourceRegistryPanel({
  text,
  value,
  busy,
  onRefresh,
}: {
  text: Copy;
  value: ScholarshipImportCenterSources;
  busy: boolean;
  onRefresh: () => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    sourceId: '', sourceName: '', sourceType: 'SCHOLARSHIP_WEBSITE' as ScholarshipSourceType,
    acquisitionMode: 'WEBSITE' as ScholarshipAcquisitionMode, status: 'DISABLED' as 'ACTIVE' | 'DISABLED' | 'NOT_CONFIGURED',
    baseUrl: '', allowedOrigins: '', allowedPathPrefixes: '', allowSubdomains: false,
    requestsPerMinute: '30', burstLimit: '2', minimumDelayMs: '0',
  });

  const submit = async () => {
    setSaving(true); setFormError(null);
    try {
      if (!validSourceModePair(form.sourceType, form.acquisitionMode)) throw new Error('SOURCE_TYPE_ACQUISITION_MODE_MISMATCH');
      const network = form.acquisitionMode !== 'MANUAL_FILE';
      const origins = form.allowedOrigins.split(/\r?\n/u).map((item) => item.trim()).filter(Boolean);
      if (network && (!form.baseUrl.trim() || origins.length === 0)) throw new Error('NETWORK_SOURCE_REQUIRES_BASE_URL_AND_ALLOWED_ORIGIN');
      const payload: ScholarshipSourceCreateInput = {
        sourceId: form.sourceId.trim(),
        sourceName: form.sourceName.trim(),
        sourceType: form.sourceType,
        status: form.status,
        acquisitionMode: form.acquisitionMode,
        lastExecution: { state: 'NEVER_RUN' },
        ...(network ? {
          baseUrl: form.baseUrl.trim(),
          allowedUrlScope: {
            allowedOrigins: origins,
            allowedPathPrefixes: form.allowedPathPrefixes.split(/\r?\n/u).map((item) => item.trim()).filter(Boolean),
            allowSubdomains: form.allowSubdomains,
          },
          rateLimitPolicy: {
            requestsPerMinute: Number(form.requestsPerMinute),
            burstLimit: Number(form.burstLimit),
            minimumDelayMs: Number(form.minimumDelayMs),
          },
        } : {}),
      };
      if (!payload.sourceId || !payload.sourceName) throw new Error('SOURCE_ID_AND_NAME_REQUIRED');
      await scholarshipImportCenterApi.createSource(payload);
      setShowForm(false);
      setForm((current) => ({ ...current, sourceId: '', sourceName: '', baseUrl: '', allowedOrigins: '', allowedPathPrefixes: '' }));
      await onRefresh();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'SOURCE_CREATE_FAILED');
    } finally { setSaving(false); }
  };

  const changeStatus = async (source: ScholarshipSourceRegistryItem) => {
    setSaving(true); setFormError(null);
    try {
      const next = mutableSourceStatus(source.status);
      if (!next) throw new Error('SOURCE_STATUS_MUTATION_NOT_ALLOWED');
      await scholarshipImportCenterApi.setSourceStatus(source.sourceId, next);
      await onRefresh();
    } catch (error) { setFormError(error instanceof Error ? error.message : 'SOURCE_STATUS_FAILED'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2"><Badge value={value.registryState} /><Badge value={value.sourceRegistryRuntime} /></div>
          <p className="mt-2 text-sm text-slate-600">{value.completeRegistry ? text.authoritativeRegistry : text.registryUnavailable}</p>
        </div>
        <button type="button" onClick={() => setShowForm((current) => !current)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">
          <Plus className="h-4 w-4" /> {text.addSource}
        </button>
      </div>

      {formError ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</div> : null}

      {showForm ? (
        <Panel title={text.addSource}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <Field label={text.sourceId}><input value={form.sourceId} onChange={(event) => setForm({ ...form, sourceId: event.target.value })} className="w-full rounded-lg border px-3 py-2" /></Field>
            <Field label={text.sourceName}><input value={form.sourceName} onChange={(event) => setForm({ ...form, sourceName: event.target.value })} className="w-full rounded-lg border px-3 py-2" /></Field>
            <Field label={text.sourceType}><select value={form.sourceType} onChange={(event) => setForm({ ...form, ...sourceTypeChange(event.target.value as ScholarshipSourceType, form.acquisitionMode) })} className="w-full rounded-lg border px-3 py-2">{sourceTypes.map((item) => <option key={item}>{item}</option>)}</select></Field>
            <Field label={text.acquisitionMode}><select value={form.acquisitionMode} onChange={(event) => setForm({ ...form, ...acquisitionModeChange(event.target.value as ScholarshipAcquisitionMode, form.sourceType) })} className="w-full rounded-lg border px-3 py-2">{acquisitionModes.map((item) => <option key={item}>{item}</option>)}</select></Field>
            <Field label={text.status}><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as 'ACTIVE' | 'DISABLED' | 'NOT_CONFIGURED' })} className="w-full rounded-lg border px-3 py-2"><option>ACTIVE</option><option>DISABLED</option><option>NOT_CONFIGURED</option></select></Field>
            {form.acquisitionMode !== 'MANUAL_FILE' ? <Field label={text.baseUrl}><input value={form.baseUrl} onChange={(event) => setForm({ ...form, baseUrl: event.target.value })} placeholder="https://..." className="w-full rounded-lg border px-3 py-2" /></Field> : null}
          </div>
          {form.acquisitionMode !== 'MANUAL_FILE' ? (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <Field label={text.allowedOrigins}><textarea value={form.allowedOrigins} onChange={(event) => setForm({ ...form, allowedOrigins: event.target.value })} rows={3} className="w-full rounded-lg border px-3 py-2 font-mono text-xs" /></Field>
              <Field label={text.pathPrefixes}><textarea value={form.allowedPathPrefixes} onChange={(event) => setForm({ ...form, allowedPathPrefixes: event.target.value })} rows={3} className="w-full rounded-lg border px-3 py-2 font-mono text-xs" /></Field>
              <Field label={text.rpm}><input type="number" min="1" value={form.requestsPerMinute} onChange={(event) => setForm({ ...form, requestsPerMinute: event.target.value })} className="w-full rounded-lg border px-3 py-2" /></Field>
              <Field label={text.burst}><input type="number" min="1" value={form.burstLimit} onChange={(event) => setForm({ ...form, burstLimit: event.target.value })} className="w-full rounded-lg border px-3 py-2" /></Field>
              <Field label={text.minDelay}><input type="number" min="0" value={form.minimumDelayMs} onChange={(event) => setForm({ ...form, minimumDelayMs: event.target.value })} className="w-full rounded-lg border px-3 py-2" /></Field>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.allowSubdomains} onChange={(event) => setForm({ ...form, allowSubdomains: event.target.checked })} />{text.allowSubdomains}</label>
            </div>
          ) : null}
          <button type="button" disabled={saving} onClick={() => void submit()} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} {text.create}
          </button>
        </Panel>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">{text.sourceId}</th><th className="px-4 py-3">{text.sourceName}</th><th className="px-4 py-3">{text.acquisitionMode}</th><th className="px-4 py-3">Connector</th><th className="px-4 py-3">{text.status}</th><th className="px-4 py-3">{text.observedStatistics}</th><th className="px-4 py-3">Action</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {value.sources.map((source) => {
              const observed = value.observedStatistics.find((item) => item.sourceSystem === source.sourceId);
              const nextStatus = mutableSourceStatus(source.status);
              return <tr key={source.sourceId}><td className="px-4 py-3 font-mono text-xs">{source.sourceId}</td><td className="px-4 py-3 font-medium">{source.displayName}</td><td className="px-4 py-3"><Badge value={sourceMode(source) ?? source.category} /></td><td className="px-4 py-3 text-xs">{source.connectorId}@{source.connectorVersion}</td><td className="px-4 py-3"><Badge value={source.status} /></td><td className="px-4 py-3 text-xs">{observed ? `${observed.batches} batches · ${observed.totalRecords} records` : '—'}</td><td className="px-4 py-3">{nextStatus ? <button disabled={saving || busy} type="button" onClick={() => void changeStatus(source)} className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-50">{nextStatus === 'DISABLED' ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}{nextStatus === 'DISABLED' ? text.disable : text.activate}</button> : <span className="text-xs text-slate-500">{source.status === 'BLOCKED' ? 'Blocked' : 'Requires source review'}</span>}</td></tr>;
            })}
            {value.sources.length === 0 ? <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">{text.noRecords}</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ImportNewPanel({ text, sources, onCompleted }: { text: Copy; sources: ScholarshipImportCenterSources; onCompleted: () => void }) {
  const [sourceId, setSourceId] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [parserHint, setParserHint] = useState<'' | 'json' | 'ndjson' | 'csv'>('');
  const [structuredJson, setStructuredJson] = useState('{\n  "scholarshipName": ""\n}');
  const [result, setResult] = useState<ScholarshipImportNewResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = sources.sources.find((source) => source.sourceId === sourceId);
  const mode = selected ? sourceMode(selected) : undefined;
  const manual = mode === 'MANUAL_FILE';

  const submit = async () => {
    if (!selected) return;
    setBusy(true); setError(null); setResult(null);
    try {
      let structuredContent: unknown = undefined;
      if (manual) {
        if (parserHint && parserHint !== 'json') throw new Error('MANUAL_HTTP_CONTRACT_SUPPORTS_STRUCTURED_JSON_ONLY');
        structuredContent = JSON.parse(structuredJson) as unknown;
      }
      const response = await scholarshipImportCenterApi.importNew({
        sourceId: selected.sourceId,
        ...(targetUrl.trim() ? { targetUrl: targetUrl.trim() } : {}),
        ...(parserHint ? { parserHint } : {}),
        ...(manual ? { structuredContent, contentType: 'application/json' } : {}),
      });
      setResult(response);
      onCompleted();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'IMPORT_NEW_FAILED'); }
    finally { setBusy(false); }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
      <Panel title={text.importNew}>
        <div className="space-y-3">
          <Field label={text.selectSource}><select value={sourceId} onChange={(event) => { setSourceId(event.target.value); setResult(null); }} className="w-full rounded-lg border px-3 py-2"><option value="">—</option>{sources.sources.filter((source) => source.status === 'ACTIVE').map((source) => <option key={source.sourceId} value={source.sourceId}>{source.displayName} · {source.sourceId}</option>)}</select></Field>
          {selected ? <div className="flex flex-wrap gap-2"><Badge value={selected.status} /><Badge value={mode ?? selected.category} /><Badge value={`${selected.connectorId}@${selected.connectorVersion}`} /></div> : null}
          {selected && !manual ? <Field label={text.targetUrl}><input value={targetUrl} onChange={(event) => setTargetUrl(event.target.value)} placeholder={selected.baseUrl} className="w-full rounded-lg border px-3 py-2" /></Field> : null}
          <Field label={text.parser}><select value={parserHint} onChange={(event) => setParserHint(event.target.value as typeof parserHint)} className="w-full rounded-lg border px-3 py-2"><option value="">Auto / none</option><option value="json">JSON</option><option value="ndjson" disabled={manual}>NDJSON</option><option value="csv" disabled={manual}>CSV</option></select></Field>
          {manual ? <Field label={text.structuredJson}><textarea value={structuredJson} onChange={(event) => setStructuredJson(event.target.value)} rows={10} className="w-full rounded-lg border px-3 py-2 font-mono text-xs" /></Field> : null}
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">{manual ? text.manualImportNote : text.networkImportNote}</div>
          <button disabled={!selected || busy} type="button" onClick={() => void submit()} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 font-semibold text-white disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}{text.runImport}</button>
          {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
        </div>
      </Panel>
      <Panel title={text.importResult}>
        {result ? <div className="space-y-3"><Badge value={result.state} /><pre className="max-h-[520px] overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">{pretty(result)}</pre></div> : <p className="text-sm text-slate-500">—</p>}
      </Panel>
    </div>
  );
}

function RecordsTable({ records, text, onInspect }: { records: ScholarshipImportCenterRecordView[]; text: Copy; onInspect: (record: ScholarshipImportCenterRecordView) => void }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">{text.record}</th><th className="px-4 py-3">{text.source}</th><th className="px-4 py-3">{text.screeningOrigin}</th><th className="px-4 py-3">{text.completeness}</th><th className="px-4 py-3">{text.dedupe}</th><th className="px-4 py-3">{text.verification}</th><th className="px-4 py-3">{text.canonical}</th><th className="px-4 py-3">{text.ready}</th><th className="px-4 py-3"></th></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {records.map((record) => <tr key={record.id}><td className="px-4 py-3"><div className="max-w-[250px] truncate font-semibold">{record.cleanedScholarshipName ?? record.rawSourceTitle ?? record.id}</div><div className="font-mono text-[11px] text-slate-400">{record.id}</div></td><td className="px-4 py-3 text-xs">{record.sourceSystem}</td><td className="px-4 py-3"><Badge value={record.screeningOrigin} /></td><td className="px-4 py-3"><Badge value={record.completeness.state} /></td><td className="px-4 py-3"><Badge value={record.dedupe.state} /></td><td className="px-4 py-3"><Badge value={record.verification.state} /></td><td className="px-4 py-3"><Badge value={record.canonical.state} /></td><td className="px-4 py-3">{record.readyToTransfer ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <XCircle className="h-5 w-5 text-slate-300" />}</td><td className="px-4 py-3"><button type="button" onClick={() => onInspect(record)} className="rounded-lg border px-3 py-1.5 text-xs font-semibold">{text.inspect}</button></td></tr>)}
          {records.length === 0 ? <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-500">{text.noRecords}</td></tr> : null}
        </tbody>
      </table>
    </div>
  );
}

function CanonicalResolutionCard({ record, item, text, onSaved }: { record: ScholarshipImportCenterRecordView; item: ReturnType<typeof canonicalItems>[number]; text: Copy; onSaved: () => Promise<void> }) {
  const [canonicalId, setCanonicalId] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const providerNonUniversity = objectValue(record.rawPayload).providerIsUniversity === false;

  const submit = async (resolutionType: ScholarshipCanonicalResolutionInput['resolutionType']) => {
    setBusy(true); setError(null);
    try {
      if (resolutionType === 'RESOLVED' && !canonicalId.trim()) throw new Error('CANONICAL_ID_REQUIRED');
      await scholarshipImportCenterApi.recordCanonicalResolution(record.id, {
        fieldOrRequirementKey: item.key,
        canonicalEntityType: item.target,
        rawValue: item.rawValue,
        resolutionType,
        ...(canonicalId.trim() ? { canonicalId: canonicalId.trim() } : {}),
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      });
      await onSaved();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'CANONICAL_DECISION_FAILED'); }
    finally { setBusy(false); }
  };

  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="flex flex-wrap items-center gap-2"><Badge value={item.target} /><Badge value={item.state} /><code className="text-xs text-slate-500">{item.key}</code></div>
      <div className="mt-2 text-sm"><span className="font-semibold">Raw:</span> {item.rawValue}</div>
      <div className="mt-3 grid gap-2 md:grid-cols-2"><input value={canonicalId} onChange={(event) => setCanonicalId(event.target.value)} placeholder={text.canonicalId} className="rounded-lg border px-3 py-2 text-sm" /><input value={reason} onChange={(event) => setReason(event.target.value)} placeholder={text.reason} className="rounded-lg border px-3 py-2 text-sm" /></div>
      <div className="mt-3 flex flex-wrap gap-2"><button disabled={busy} type="button" onClick={() => void submit('RESOLVED')} className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">{text.resolve}</button><button disabled={busy} type="button" onClick={() => void submit('REJECTED')} className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-50">{text.reject}</button>{item.target === 'PROVIDER_UNIVERSITY' && providerNonUniversity ? <button disabled={busy} type="button" onClick={() => void submit('NOT_APPLICABLE')} className="rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-50">{text.notApplicable}</button> : null}</div>
      {error ? <div className="mt-2 text-xs text-red-600">{error}</div> : null}
    </div>
  );
}

function DetailPanel({
  record,
  diff,
  proposal,
  overview,
  text,
  busy,
  onClose,
  onReload,
  onReview,
  onTransfer,
}: {
  record: ScholarshipImportCenterRecordView;
  diff: ScholarshipImportCenterDiff | null;
  proposal: ScholarshipImportCenterMergeProposal | null;
  overview: ScholarshipImportCenterOverview | null;
  text: Copy;
  busy: boolean;
  onClose: () => void;
  onReload: () => Promise<void>;
  onReview: (action: ScholarshipImportReviewAction, reason?: string) => Promise<void>;
  onTransfer: () => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const [verificationReason, setVerificationReason] = useState('');
  const [verificationBusy, setVerificationBusy] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const canonical = useMemo(() => canonicalItems(record), [record]);
  const reviewConfigured = overview?.capabilities.reviewDecisionPersistence === 'CONFIGURED';
  const transferConfigured = overview?.capabilities.atomicTransfer === 'CONFIGURED';

  const verify = async (state: 'VERIFIED' | 'FAILED') => {
    if (!verificationReason.trim()) { setVerificationError('VERIFICATION_REASON_REQUIRED'); return; }
    setVerificationBusy(true); setVerificationError(null);
    try {
      await scholarshipImportCenterApi.recordVerification(record.id, { state, reason: verificationReason.trim() });
      setVerificationReason('');
      await onReload();
    } catch (caught) { setVerificationError(caught instanceof Error ? caught.message : 'VERIFICATION_FAILED'); }
    finally { setVerificationBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/40 p-3 md:p-6" onMouseDown={onClose}>
      <div className="ml-auto h-full w-full max-w-5xl overflow-y-auto rounded-2xl bg-slate-50 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-4"><div><h2 className="font-bold">{record.cleanedScholarshipName ?? record.rawSourceTitle ?? record.id}</h2><div className="font-mono text-xs text-slate-400">{record.id}</div></div><button type="button" onClick={onClose} className="rounded-lg border px-3 py-1.5">×</button></div>
        <div className="space-y-4 p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><StateCard label={text.screeningOrigin} value={record.screeningOrigin} /><StateCard label={text.completeness} value={record.completeness.state} /><StateCard label={text.dedupe} value={record.dedupe.state} /><StateCard label={text.verification} value={record.verification.state} /><StateCard label={text.canonical} value={record.canonical.state} /><StateCard label={text.ready} value={record.readyToTransfer ? 'READY' : 'NOT_READY'} /><StateCard label={text.transferred} value={record.transferred ? 'TRANSFERRED' : 'NOT_TRANSFERRED'} /><StateCard label="Parse" value={record.parseState} /></div>

          <Panel title={text.reviewReasons}>{record.reviewReasons.length ? <ul className="list-disc space-y-1 pl-5 text-sm text-amber-900">{record.reviewReasons.map((item) => <li key={item}>{item}</li>)}</ul> : <span className="text-sm text-slate-500">—</span>}</Panel>

          <div className="grid gap-4 xl:grid-cols-2">
            <Panel title={text.verifyRecord}>
              <div className="space-y-3"><input value={verificationReason} onChange={(event) => setVerificationReason(event.target.value)} placeholder={text.verificationReason} className="w-full rounded-lg border px-3 py-2 text-sm" /><div className="flex gap-2"><button disabled={verificationBusy} onClick={() => void verify('VERIFIED')} type="button" className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{text.markVerified}</button><button disabled={verificationBusy} onClick={() => void verify('FAILED')} type="button" className="rounded-lg bg-red-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{text.markFailed}</button></div>{verificationError ? <div className="text-xs text-red-600">{verificationError}</div> : null}</div>
            </Panel>
            <Panel title={text.reviewDecision}>
              {!reviewConfigured ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{text.reviewDisabled}</div> : <div className="space-y-3"><input value={reason} onChange={(event) => setReason(event.target.value)} placeholder={text.reason} className="w-full rounded-lg border px-3 py-2 text-sm" /><div className="flex flex-wrap gap-2">{(proposal?.suggestedActions ?? []).map((action) => <button key={action} disabled={busy} type="button" onClick={() => void onReview(action, reason.trim() || undefined)} className="rounded-lg border bg-white px-3 py-2 text-xs font-semibold disabled:opacity-50">{text.reviewActions[action]}</button>)}</div></div>}
            </Panel>
          </div>

          <Panel title={text.canonicalReview}>
            <div className="space-y-3">{canonical.map((item) => <CanonicalResolutionCard key={`${item.key}:${item.rawValue}`} record={record} item={item} text={text} onSaved={onReload} />)}{canonical.length === 0 ? <p className="text-sm text-slate-500">{text.noCanonicalItems}</p> : null}</div>
          </Panel>

          <Panel title={text.mergeProposal}>
            {proposal ? <div className="space-y-2 text-sm"><div className="flex flex-wrap gap-2"><Badge value={proposal.duplicateState} /><Badge value={proposal.requiresReview ? 'REVIEW_REQUIRED' : 'NO_REVIEW'} /><Badge value={proposal.automaticMergePerformed ? 'AUTO_MERGED' : 'NO_AUTOMATIC_MERGE'} /></div><pre className="overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100">{pretty({ duplicateKey: proposal.duplicateKey, suggestedActions: proposal.suggestedActions })}</pre></div> : <span className="text-sm text-slate-500">—</span>}
          </Panel>

          <Panel title={text.diff}>
            {diff ? <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="text-left text-xs text-slate-500"><th className="p-2">Field</th><th className="p-2">Current</th><th className="p-2">Incoming</th><th className="p-2">State</th></tr></thead><tbody className="divide-y">{diff.fields.map((field) => <tr key={field.field}><td className="p-2 font-mono text-xs">{field.field}</td><td className="p-2 text-xs">{pretty(field.currentValue)}</td><td className="p-2 text-xs">{pretty(field.incomingValue)}</td><td className="p-2"><Badge value={field.state} /></td></tr>)}</tbody></table></div> : <span className="text-sm text-slate-500">—</span>}
          </Panel>

          <Panel title={text.rawPayload}><pre className="max-h-[420px] overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">{pretty(record.rawPayload)}</pre></Panel>

          <Panel title={text.transfer}>
            {!transferConfigured ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{text.transferDisabled}</div> : !record.readyToTransfer ? <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">{text.transferNotReady}</div> : <button disabled={busy} type="button" onClick={() => void onTransfer()} className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{text.transfer}</button>}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function HistoryTable({ events, text }: { events: ScholarshipImportHistoryEvent[]; text: Copy }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">{text.occurredAt}</th><th className="px-4 py-3">{text.event}</th><th className="px-4 py-3">{text.record}</th><th className="px-4 py-3">{text.eventData}</th></tr></thead><tbody className="divide-y divide-slate-100">{events.map((event, index) => <tr key={`${event.recordId}:${event.eventType}:${event.occurredAt}:${index}`}><td className="whitespace-nowrap px-4 py-3 text-xs">{new Date(event.occurredAt).toLocaleString()}</td><td className="px-4 py-3"><Badge value={event.eventType} /></td><td className="px-4 py-3 font-mono text-xs">{event.recordId}</td><td className="px-4 py-3"><pre className="max-w-2xl whitespace-pre-wrap text-xs">{pretty(event.data)}</pre></td></tr>)}{events.length === 0 ? <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-500">{text.noRecords}</td></tr> : null}</tbody></table>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">{label}</span>{children}</label>;
}

function StateCard({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border bg-white p-3"><div className="mb-2 text-xs text-slate-500">{label}</div><Badge value={value} /></div>;
}

export function ScholarshipImportCenterPage() {
  const { language } = useTranslation();
  const text = copy[language === 'ar' ? 'ar' : 'en'];
  const [tab, setTab] = useState<WorkspaceTab>('overview');
  const [operationalClass, setOperationalClass] = useState<ScholarshipImportOperationalClass>('REAL');
  const [overview, setOverview] = useState<ScholarshipImportCenterOverview | null>(null);
  const [sources, setSources] = useState<ScholarshipImportCenterSources | null>(null);
  const [records, setRecords] = useState<ScholarshipImportCenterRecordView[]>([]);
  const [scan, setScan] = useState<ScholarshipImportCenterScanResult | null>(null);
  const [recordList, setRecordList] = useState<ScholarshipImportCenterRecordList | null>(null);
  const [historyEvents, setHistoryEvents] = useState<ScholarshipImportHistoryEvent[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<ScholarshipImportCenterRecordView | null>(null);
  const [diff, setDiff] = useState<ScholarshipImportCenterDiff | null>(null);
  const [proposal, setProposal] = useState<ScholarshipImportCenterMergeProposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [incomingPage, setIncomingPage] = useState(1);

  const refreshSources = useCallback(async () => {
    const response = await scholarshipImportCenterApi.sources();
    setSources(response);
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setError(null); setMessage(null);
    try {
      const currentOverview = await scholarshipImportCenterApi.overview(operationalClass);
      setOverview(currentOverview);
      setRecords([]); setScan(null); setRecordList(null); setHistoryEvents([]);
      if (tab === 'sources' || tab === 'import-new') {
        await refreshSources();
      } else if (tab === 'incoming') {
        const response = await scholarshipImportCenterApi.records({ operationalClass, page: incomingPage, pageSize: 50 });
        setRecordList(response); setRecords(response.data);
      } else if (tab !== 'overview') {
        const segment = tab === 'screening' ? 'screening' : tab === 'duplicates' ? 'duplicates' : tab === 'missing' ? 'missing-data' : tab === 'verification' ? 'verification' : tab === 'review' ? 'review-queue' : tab === 'ready' ? 'ready-to-transfer' : 'history';
        const response = await scholarshipImportCenterApi.scan(segment, operationalClass);
        setScan(response); setRecords(response.data); setHistoryEvents(response.events ?? []);
      }
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'SCHOLARSHIP_IMPORT_CENTER_LOAD_FAILED'); }
    finally { setLoading(false); }
  }, [incomingPage, operationalClass, refreshSources, tab]);

  useEffect(() => { void load(); }, [load, refreshToken]);
  useEffect(() => { setIncomingPage(1); }, [operationalClass]);

  const openRecord = async (record: ScholarshipImportCenterRecordView) => {
    setSelectedRecord(record); setDiff(null); setProposal(null); setError(null);
    try {
      const [detail, detailDiff, detailProposal] = await Promise.all([
        scholarshipImportCenterApi.record(record.id),
        scholarshipImportCenterApi.diff(record.id),
        scholarshipImportCenterApi.mergeProposal(record.id),
      ]);
      setSelectedRecord(detail); setDiff(detailDiff); setProposal(detailProposal);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'RECORD_DETAIL_FAILED'); }
  };

  const reloadSelected = async () => {
    if (!selectedRecord) return;
    const [detail, detailDiff, detailProposal] = await Promise.all([
      scholarshipImportCenterApi.record(selectedRecord.id),
      scholarshipImportCenterApi.diff(selectedRecord.id),
      scholarshipImportCenterApi.mergeProposal(selectedRecord.id),
    ]);
    setSelectedRecord(detail); setDiff(detailDiff); setProposal(detailProposal);
    setRefreshToken((current) => current + 1);
  };

  const recordReview = async (action: ScholarshipImportReviewAction, reason?: string) => {
    if (!selectedRecord) return;
    setActionBusy(true); setError(null);
    try { await scholarshipImportCenterApi.decision(selectedRecord.id, action, reason); setMessage(text.saved); await reloadSelected(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'REVIEW_DECISION_FAILED'); }
    finally { setActionBusy(false); }
  };

  const transfer = async () => {
    if (!selectedRecord) return;
    setActionBusy(true); setError(null);
    try { await scholarshipImportCenterApi.transfer(selectedRecord.id); setMessage(text.saved); await reloadSelected(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'TRANSFER_FAILED'); }
    finally { setActionBusy(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="mx-auto max-w-[1600px] space-y-5 p-4 md:p-6">
        <header className="rounded-2xl border border-emerald-900/10 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><a href="/imports" className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-emerald-800"><ArrowLeft className="h-4 w-4" />{text.back}</a><h1 className="text-2xl font-black text-slate-950">{text.title}</h1><p className="mt-1 max-w-4xl text-sm text-slate-600">{text.subtitle}</p></div><div className="flex flex-wrap items-center gap-2"><select value={operationalClass} onChange={(event) => setOperationalClass(event.target.value as ScholarshipImportOperationalClass)} className="rounded-xl border px-3 py-2 text-sm">{operationalClasses.map((item) => <option key={item}>{item}</option>)}</select><button type="button" onClick={() => setRefreshToken((current) => current + 1)} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold"><RefreshCw className="h-4 w-4" />{text.refresh}</button></div></div>
          {overview ? <div className="mt-4 flex flex-wrap gap-2"><Badge value={`REVIEW_${overview.capabilities.reviewDecisionPersistence}`} /><Badge value={`TRANSFER_${overview.capabilities.atomicTransfer}`} /><Badge value={overview.capabilities.sourceRegistryRuntime} /></div> : null}
        </header>

        <nav className="flex gap-2 overflow-x-auto rounded-2xl border bg-white p-2 shadow-sm">{tabs.map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={`whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold ${tab === item ? 'bg-emerald-800 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{text.tabs[item]}</button>)}</nav>

        {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
        {message ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div> : null}

        {loading ? <div className="flex min-h-[300px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-700" /></div> : null}

        {!loading && tab === 'overview' && overview ? (
          <div className="space-y-4"><ScanNotice scan={overview} text={text} /><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{metricRows(overview, text).map(([label, value]) => <div key={label} className="rounded-2xl border bg-white p-4 shadow-sm"><div className="text-xs font-semibold text-slate-500">{label}</div><div className="mt-2 text-3xl font-black text-slate-950">{value}</div></div>)}</div><div className="grid gap-4 lg:grid-cols-3"><Panel title={text.capabilities}><div className="space-y-2"><div className="flex items-center justify-between"><span className="text-sm">Review</span><Badge value={overview.capabilities.reviewDecisionPersistence} /></div><div className="flex items-center justify-between"><span className="text-sm">Transfer</span><Badge value={overview.capabilities.atomicTransfer} /></div></div></Panel><Panel title={text.sourceRegistry}><div className="flex items-start gap-3"><Database className="mt-0.5 h-5 w-5 text-emerald-700" /><div><Badge value={overview.capabilities.sourceRegistryRuntime} /><p className="mt-2 text-sm text-slate-600">{text.runtimePending}</p></div></div></Panel><Panel title="Safety"><div className="space-y-2 text-sm text-slate-700"><div className="flex gap-2"><ShieldCheck className="h-4 w-4 text-emerald-700" />API-backed only</div><div className="flex gap-2"><SearchCheck className="h-4 w-4 text-emerald-700" />No local record fixtures</div><div className="flex gap-2"><Waypoints className="h-4 w-4 text-emerald-700" />No automatic merge</div></div></Panel></div></div>
        ) : null}

        {!loading && tab === 'sources' && sources ? <SourceRegistryPanel text={text} value={sources} busy={loading} onRefresh={refreshSources} /> : null}
        {!loading && tab === 'import-new' && sources ? <ImportNewPanel text={text} sources={sources} onCompleted={() => setRefreshToken((current) => current + 1)} /> : null}

        {!loading && tab === 'incoming' ? <div className="space-y-4">{recordList ? <ScanNotice scan={recordList} text={text} /> : null}<RecordsTable records={records} text={text} onInspect={(record) => void openRecord(record)} />{recordList ? <div className="flex items-center justify-between rounded-xl border bg-white px-4 py-3 text-sm"><span>Page {recordList.page} · {recordList.filteredTotal} records</span><div className="flex gap-2"><button type="button" disabled={recordList.page <= 1} onClick={() => setIncomingPage((current) => Math.max(1, current - 1))} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Prev</button><button type="button" disabled={recordList.page * recordList.pageSize >= recordList.filteredTotal} onClick={() => setIncomingPage((current) => current + 1)} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Next</button></div></div> : null}</div> : null}

        {!loading && !['overview', 'sources', 'import-new', 'incoming', 'history'].includes(tab) ? <div className="space-y-4">{scan ? <ScanNotice scan={scan} text={text} /> : null}<RecordsTable records={records} text={text} onInspect={(record) => void openRecord(record)} /></div> : null}

        {!loading && tab === 'history' ? <div className="space-y-4">{scan ? <ScanNotice scan={scan} text={text} /> : null}<HistoryTable events={historyEvents} text={text} /></div> : null}
      </div>

      {selectedRecord ? <DetailPanel record={selectedRecord} diff={diff} proposal={proposal} overview={overview} text={text} busy={actionBusy} onClose={() => setSelectedRecord(null)} onReload={reloadSelected} onReview={recordReview} onTransfer={transfer} /> : null}
    </div>
  );
}
