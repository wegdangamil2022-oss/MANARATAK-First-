import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArchiveRestore,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CirclePlay,
  Clock3,
  Database,
  Download,
  ExternalLink,
  Eye,
  FileJson2,
  FileSpreadsheet,
  FileText,
  Filter,
  Globe2,
  GraduationCap,
  HardDriveUpload,
  Layers3,
  ListChecks,
  Loader2,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  RotateCcw,
  School,
  SearchCheck,
  ShieldCheck,
  ShieldX,
  Sparkles,
  Square,
  TestTube2,
  UploadCloud,
  Wrench,
  X,
} from 'lucide-react';
import { adminApiClient } from '../api/client';
import { useTranslation } from '../i18n/I18nProvider';

const BRAND = {
  primary: '#142B5F',
  secondary: '#0E7C86',
  digital: '#21A7B4',
  gold: '#D6A43B',
  highlight: '#F2CD78',
  fog: '#DDEFF2',
  ivory: '#FAF7F0',
  text: '#203442',
  white: '#FFFFFF',
} as const;

const INLINE_LIMIT_BYTES = 90 * 1024;
const RECORD_PAGE_SIZE = 25;

export type DomainKey = 'ALL' | 'SCHOLARSHIPS' | 'UNIVERSITIES' | 'MAJORS' | 'COURSES' | 'TESTS' | 'SERVICES' | 'CMS';
type LoadState = 'idle' | 'loading' | 'ready' | 'unavailable';
type SourceStatus = 'ACTIVE' | 'NEEDS_REVIEW' | 'DISABLED' | 'BLOCKED';
type InputMode = 'file' | 'paste';

type ImportBatch = {
  id: string;
  sourceSystem?: string;
  dataType?: string;
  batchStatus?: string;
  totalRecords?: number;
  processedRecords?: number;
  failedRecords?: number;
  attemptCount?: number;
  availableAt?: string;
  claimedBy?: string | null;
  claimUntil?: string | null;
  lastError?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type ImportRecord = {
  id: string;
  batchId: string;
  status?: string;
  rawPayload?: Record<string, unknown>;
  validationErrors?: unknown;
  processingNotes?: string | null;
  sourceDedupKey?: string | null;
  promotedEntityId?: string | null;
  sourceRowNumber?: number | null;
  recordOffset?: number | null;
  chunkIndex?: number | null;
  createdAt?: string;
  updatedAt?: string;
  batch?: ImportBatch | null;
};

type PaginatedRecords = {
  data: ImportRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages?: number;
};

type DomainOverview = {
  batches: number;
  records: number;
  activeBatches: number;
  needsReview: number;
  failedRecords: number;
  transferredRecords: number;
  recordStatusCounts?: Record<string, number>;
};

type ImportOverview = {
  totalBatches: number;
  totalRecords: number;
  activeBatches: number;
  needsReview: number;
  failedRecords: number;
  transferredRecords: number;
  recordStatusCounts: Record<string, number>;
  batchStatusCounts: Record<string, number>;
  byDomain: Record<string, DomainOverview>;
  latestBatch?: ImportBatch | null;
  generatedAt?: string;
};

type ImportSource = {
  sourceId: string;
  displayName: string;
  baseUrl: string;
  category: string;
  accessClassification: string;
  status: SourceStatus;
  rateLimitPerMinute?: number;
  robotsPolicyUrl?: string;
  connectorId: string;
  connectorVersion: string;
  metadata?: Record<string, unknown>;
};

type SourceResponse = { data: ImportSource[] };

type PreflightResult = {
  ownerDomain: string;
  sourceSystem: string;
  totalRows: number;
  newRows: number;
  invalidRows: number;
  duplicateRows: number;
  duplicatesInPayload: number;
  duplicatesAlreadyStaged: number;
  previewRows: Array<Record<string, unknown>>;
  warnings: string[];
};

type ImportResult = {
  batch?: ImportBatch;
  records?: ImportRecord[];
  summary?: {
    totalRows?: number;
    stagedRecords?: number;
    skippedDuplicates?: number;
    failedRecords?: number;
  };
};

type OperationalInsights = {
  stuckBatches: number;
  highFailureBatches: number;
  retryableBatches: number;
  pausedBatches: number;
  queuedBatches: number;
  dlqBatches: number;
  oldestActiveBatch?: ImportBatch | null;
  recentProblemBatches?: Array<ImportBatch & { stuck?: boolean; highFailureRate?: boolean; failureRate?: number }>;
  thresholds?: { stuckAfterMinutes?: number; highFailureRate?: number };
  generatedAt?: string;
};

type DomainCapability = {
  ownerDomain: string;
  stagingReady: boolean;
  handoffReady: boolean;
};

type DomainCapabilitiesResponse = { data: DomainCapability[]; generatedAt?: string };

type ImportActivity = {
  id: string;
  actorId: string;
  action: string;
  severity: string;
  targetId: string;
  timestamp: string;
  method?: string;
  path?: string;
  httpStatus?: number;
  result?: 'SUCCESS' | 'FAILURE';
};

type ImportActivityResponse = { data: ImportActivity[] };

type ErrorReport = {
  total: number;
  failed: number;
  dlq: number;
  rows: ImportRecord[];
  truncated?: boolean;
  generatedAt?: string;
};

type DomainConfig = {
  key: Exclude<DomainKey, 'ALL'>;
  ar: string;
  en: string;
  workspace: string;
  icon: typeof GraduationCap;
  template: string;
  advancedWorkspace?: string;
  importPath: string;
};

const DOMAIN_CONFIG: DomainConfig[] = [
  {
    key: 'SCHOLARSHIPS',
    ar: 'المنح الدراسية',
    en: 'Scholarships',
    workspace: '/scholarships',
    importPath: '/imports/scholarships',
    advancedWorkspace: '/imports/scholarships',
    icon: GraduationCap,
    template: 'scholarshipName,fundingCoverage,degreeLevel,applicationLink,officialSourceUrl,sponsorName,studyCountry,applicationDeadline,eligibleMajorsOrFields',
  },
  {
    key: 'UNIVERSITIES',
    ar: 'الجامعات',
    en: 'Universities',
    workspace: '/universities',
    importPath: '/imports/universities',
    icon: School,
    template: 'name,country,city,institutionType,officialWebsite,foundedYear',
  },
  {
    key: 'MAJORS',
    ar: 'التخصصات الأكاديمية',
    en: 'Academic Majors',
    workspace: '/majors',
    importPath: '/imports/majors',
    icon: Sparkles,
    template: 'name,facultyName,classificationCode',
  },
  {
    key: 'COURSES',
    ar: 'الدورات التدريبية',
    en: 'Courses & Training',
    workspace: '/courses',
    importPath: '/imports/courses',
    icon: BookOpen,
    template: 'name,directCourseUrl,providerName,learningLanguage,studyDuration,isStudyFree,isFreeCertificate,certificateType',
  },
  {
    key: 'TESTS',
    ar: 'الاختبارات الدولية',
    en: 'International Tests',
    workspace: '/international-tests',
    importPath: '/imports/international-tests',
    icon: TestTube2,
    template: 'testCode,name,nameAr,testCategory,providerName,officialSourceUrl,description,totalDurationMinutes,skillSections,scoringScale',
  },
  {
    key: 'SERVICES',
    ar: 'الخدمات',
    en: 'Services',
    workspace: '/services',
    importPath: '/imports/services',
    icon: Wrench,
    template: 'name,providerName,deliveryMode,officialSourceUrl',
  },
  {
    key: 'CMS',
    ar: 'المحتوى والمقالات CMS',
    en: 'CMS Content',
    workspace: '/cms',
    importPath: '/imports/cms',
    icon: FileText,
    template: 'title,slug,contentType,language,officialSourceUrl,summary',
  },
];

const RECORD_STATUS_OPTIONS = [
  '',
  'COMPLETE',
  'INCOMPLETE',
  'NEEDS_REVIEW',
  'READY_FOR_REVIEW',
  'PROMOTED',
  'FAILED',
  'DLQ',
] as const;

const ACTIVE_BATCH_STATUSES = new Set(['CREATED', 'QUEUED', 'RUNNING', 'PAUSED', 'RESUMING', 'CANCELLING', 'PROCESSING']);
const REPLAYABLE_BATCH_STATUSES = new Set(['PARTIALLY_COMPLETED', 'FAILED_RETRYABLE', 'FAILED_PERMANENT', 'DLQ', 'CANCELLED']);

export function ImportAdminPage({ fixedDomain }: { fixedDomain?: Exclude<DomainKey, 'ALL'> } = {}) {
  const { language } = useTranslation();
  const isArabic = language === 'ar';
  const txt = useCallback((ar: string, en: string) => (isArabic ? ar : en), [isArabic]);

  const [overview, setOverview] = useState<ImportOverview | null>(null);
  const [overviewState, setOverviewState] = useState<LoadState>('idle');
  const [sources, setSources] = useState<ImportSource[]>([]);
  const [sourcesState, setSourcesState] = useState<LoadState>('idle');
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [operations, setOperations] = useState<OperationalInsights | null>(null);
  const [operationsState, setOperationsState] = useState<LoadState>('idle');
  const [capabilities, setCapabilities] = useState<DomainCapability[]>([]);
  const [capabilitiesState, setCapabilitiesState] = useState<LoadState>('idle');
  const [activity, setActivity] = useState<ImportActivity[]>([]);
  const [activityState, setActivityState] = useState<LoadState>('idle');
  const [errorExportLoading, setErrorExportLoading] = useState(false);
  const [records, setRecords] = useState<PaginatedRecords>({ data: [], total: 0, page: 1, pageSize: RECORD_PAGE_SIZE });
  const [dataState, setDataState] = useState<LoadState>('idle');

  const [selectedDomain, setSelectedDomain] = useState<DomainKey>(fixedDomain ?? 'ALL');
  const [recordStatus, setRecordStatus] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [recordPage, setRecordPage] = useState(1);
  const [selectedRecord, setSelectedRecord] = useState<ImportRecord | null>(null);

  const [showImportModal, setShowImportModal] = useState(false);
  const [modalDomain, setModalDomain] = useState<Exclude<DomainKey, 'ALL'>>(fixedDomain ?? 'SCHOLARSHIPS');
  const [inputMode, setInputMode] = useState<InputMode>('file');
  const [sourceSystem, setSourceSystem] = useState('ADMIN_CONSOLE_MANUAL');
  const [importText, setImportText] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [preflight, setPreflight] = useState<PreflightResult | null>(null);
  const [preflightLoading, setPreflightLoading] = useState(false);
  const [importSubmitting, setImportSubmitting] = useState(false);

  const [actionLoading, setActionLoading] = useState('');
  const [sourceActionLoading, setSourceActionLoading] = useState('');
  const [notice, setNotice] = useState<{ tone: 'success' | 'error' | 'warning'; content: ReactNode } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!fixedDomain) return;
    setSelectedDomain(fixedDomain);
    setModalDomain(fixedDomain);
    setSelectedBatchId('');
    setRecordStatus('');
    setRecordPage(1);
    setSelectedRecord(null);
  }, [fixedDomain]);

  const apiDomain = useCallback((domain: DomainKey) => (domain === 'ALL' ? '' : domain), []);

  const loadControlPlane = useCallback(async () => {
    setOverviewState('loading');
    setSourcesState('loading');
    setCapabilitiesState('loading');
    setActivityState('loading');
    const [overviewResult, sourcesResult, capabilitiesResult, activityResult] = await Promise.allSettled([
      adminApiClient.request<ImportOverview>('/admin/imports/overview'),
      adminApiClient.request<SourceResponse>('/admin/imports/sources'),
      adminApiClient.request<DomainCapabilitiesResponse>('/admin/imports/capabilities'),
      adminApiClient.request<ImportActivityResponse>('/admin/imports/activity?limit=20'),
    ]);

    if (overviewResult.status === 'fulfilled') {
      setOverview(overviewResult.value);
      setOverviewState('ready');
    } else {
      setOverview(null);
      setOverviewState('unavailable');
    }

    if (sourcesResult.status === 'fulfilled') {
      setSources(Array.isArray(sourcesResult.value.data) ? sourcesResult.value.data : []);
      setSourcesState('ready');
    } else {
      setSources([]);
      setSourcesState('unavailable');
    }

    if (capabilitiesResult.status === 'fulfilled') {
      setCapabilities(Array.isArray(capabilitiesResult.value.data) ? capabilitiesResult.value.data : []);
      setCapabilitiesState('ready');
    } else {
      setCapabilities([]);
      setCapabilitiesState('unavailable');
    }

    if (activityResult.status === 'fulfilled') {
      setActivity(Array.isArray(activityResult.value.data) ? activityResult.value.data : []);
      setActivityState('ready');
    } else {
      setActivity([]);
      setActivityState('unavailable');
    }
  }, []);

  const loadDomainData = useCallback(async () => {
    setDataState('loading');
    setOperationsState('loading');
    const domain = apiDomain(selectedDomain);
    const batchParams = new URLSearchParams();
    if (domain) batchParams.set('dataType', domain);

    const recordParams = new URLSearchParams({
      page: String(recordPage),
      pageSize: String(RECORD_PAGE_SIZE),
    });
    if (domain) recordParams.set('dataType', domain);
    if (recordStatus) recordParams.set('status', recordStatus);
    if (selectedBatchId) recordParams.set('batchId', selectedBatchId);

    const operationsParams = new URLSearchParams();
    if (domain) operationsParams.set('dataType', domain);

    const [batchResult, recordResult, operationsResult] = await Promise.allSettled([
      adminApiClient.request<ImportBatch[]>(`/admin/imports/batches${batchParams.toString() ? `?${batchParams}` : ''}`),
      adminApiClient.request<PaginatedRecords>(`/admin/imports/records?${recordParams}`),
      adminApiClient.request<OperationalInsights>(`/admin/imports/operations${operationsParams.toString() ? `?${operationsParams}` : ''}`),
    ]);

    if (batchResult.status === 'fulfilled' && recordResult.status === 'fulfilled') {
      setBatches(Array.isArray(batchResult.value) ? batchResult.value : []);
      setRecords({
        data: Array.isArray(recordResult.value.data) ? recordResult.value.data : [],
        total: Number(recordResult.value.total ?? 0),
        page: Number(recordResult.value.page ?? recordPage),
        pageSize: Number(recordResult.value.pageSize ?? RECORD_PAGE_SIZE),
        totalPages: recordResult.value.totalPages,
      });
      setDataState('ready');
    } else {
      setBatches([]);
      setRecords({ data: [], total: 0, page: recordPage, pageSize: RECORD_PAGE_SIZE });
      setDataState('unavailable');
    }

    if (operationsResult.status === 'fulfilled') {
      setOperations(operationsResult.value);
      setOperationsState('ready');
    } else {
      setOperations(null);
      setOperationsState('unavailable');
    }

    if (batchResult.status === 'rejected' || recordResult.status === 'rejected') {
      const reason = batchResult.status === 'rejected' ? batchResult.reason : recordResult.status === 'rejected' ? recordResult.reason : null;
      setNotice({
        tone: 'error',
        content: reason instanceof Error ? reason.message : txt('تعذر تحميل بيانات الاستيراد.', 'Unable to load import data.'),
      });
    }
  }, [apiDomain, recordPage, recordStatus, selectedBatchId, selectedDomain, txt]);

  useEffect(() => {
    void loadControlPlane();
  }, [loadControlPlane]);

  useEffect(() => {
    void loadDomainData();
  }, [loadDomainData]);

  const refreshAll = useCallback(async () => {
    setNotice(null);
    await Promise.all([loadControlPlane(), loadDomainData()]);
  }, [loadControlPlane, loadDomainData]);

  const mergedDomainOverview = useCallback((domain: Exclude<DomainKey, 'ALL'>): DomainOverview => {
    const direct = overview?.byDomain?.[domain];
    if (domain !== 'TESTS') {
      return direct ?? { batches: 0, records: 0, activeBatches: 0, needsReview: 0, failedRecords: 0, transferredRecords: 0 };
    }
    const legacy = overview?.byDomain?.INTERNATIONAL_TESTS;
    if (!direct && !legacy) return { batches: 0, records: 0, activeBatches: 0, needsReview: 0, failedRecords: 0, transferredRecords: 0 };
    return {
      batches: (direct?.batches ?? 0) + (legacy?.batches ?? 0),
      records: (direct?.records ?? 0) + (legacy?.records ?? 0),
      activeBatches: (direct?.activeBatches ?? 0) + (legacy?.activeBatches ?? 0),
      needsReview: (direct?.needsReview ?? 0) + (legacy?.needsReview ?? 0),
      failedRecords: (direct?.failedRecords ?? 0) + (legacy?.failedRecords ?? 0),
      transferredRecords: (direct?.transferredRecords ?? 0) + (legacy?.transferredRecords ?? 0),
    };
  }, [overview]);

  const scopedMetrics = useMemo(() => {
    if (!overview) return null;
    if (selectedDomain === 'ALL') {
      return {
        batches: overview.totalBatches,
        records: overview.totalRecords,
        active: overview.activeBatches,
        review: overview.needsReview,
        failed: overview.failedRecords,
        transferred: overview.transferredRecords,
      };
    }
    const domain = mergedDomainOverview(selectedDomain);
    return {
      batches: domain.batches,
      records: domain.records,
      active: domain.activeBatches,
      review: domain.needsReview,
      failed: domain.failedRecords,
      transferred: domain.transferredRecords,
    };
  }, [mergedDomainOverview, overview, selectedDomain]);

  const otherDomainEntries = useMemo(() => {
    const primary = new Set<string>([...DOMAIN_CONFIG.map((item) => item.key), 'INTERNATIONAL_TESTS']);
    return (Object.entries(overview?.byDomain ?? {}) as Array<[string, DomainOverview]>)
      .filter(([key, value]) => !primary.has(key) && Number(value?.batches ?? 0) + Number(value?.records ?? 0) > 0)
      .sort((a, b) => Number(b[1]?.records ?? 0) - Number(a[1]?.records ?? 0));
  }, [overview]);

  const sourceOwnerDomain = useCallback((source: ImportSource) => String(source.metadata?.ownerDomain ?? source.metadata?.domain ?? '').toUpperCase(), []);
  const visibleSources = useMemo(() => {
    if (selectedDomain === 'ALL') return sources;
    return sources.filter((source) => {
      const owner = sourceOwnerDomain(source);
      return !owner || owner === selectedDomain || (selectedDomain === 'TESTS' && owner === 'INTERNATIONAL_TESTS');
    });
  }, [selectedDomain, sourceOwnerDomain, sources]);

  const capabilityFor = useCallback((domain: Exclude<DomainKey, 'ALL'>) => {
    const normalized = domain === 'TESTS' ? 'TESTS' : domain;
    return capabilities.find((item) => normalizeDomain(item.ownerDomain) === normalized);
  }, [capabilities]);

  const fixedDomainConfig = fixedDomain ? DOMAIN_CONFIG.find((item) => item.key === fixedDomain) : undefined;

  const activeSources = sources.filter((source) => source.status === 'ACTIVE').length;
  const sourcesNeedReview = sources.filter((source) => source.status === 'NEEDS_REVIEW').length;
  const dlqRecords = overview?.recordStatusCounts?.DLQ ?? 0;
  const failedJobs = (overview?.batchStatusCounts?.FAILED_RETRYABLE ?? 0)
    + (overview?.batchStatusCounts?.FAILED_PERMANENT ?? 0)
    + (overview?.batchStatusCounts?.DLQ ?? 0);

  const totalRecordPages = Math.max(1, Math.ceil(records.total / Math.max(1, records.pageSize)));

  const selectDomain = (domain: DomainKey) => {
    if (fixedDomain && domain !== fixedDomain) return;
    setSelectedDomain(domain);
    setSelectedBatchId('');
    setRecordStatus('');
    setRecordPage(1);
  };

  const openImport = (domain?: Exclude<DomainKey, 'ALL'>) => {
    const target = fixedDomain ?? domain ?? (selectedDomain === 'ALL' ? 'SCHOLARSHIPS' : selectedDomain);
    setModalDomain(target);
    setSourceSystem('ADMIN_CONSOLE_MANUAL');
    setInputMode('file');
    setImportText('');
    setSelectedFileName('');
    setPreflight(null);
    setNotice(null);
    setShowImportModal(true);
  };

  const readFile = async (file: File) => {
    if (file.size > INLINE_LIMIT_BYTES) {
      setNotice({
        tone: 'error',
        content: txt('الملف أكبر من 90KB. استخدم مسار Artifact/المجال للملفات الكبيرة بدل الاستيراد النصي المباشر.', 'The file exceeds 90KB. Use the domain/artifact import path for large files instead of inline import.'),
      });
      return;
    }
    const allowed = /\.(csv|json|ndjson|txt)$/i.test(file.name);
    if (!allowed) {
      setNotice({ tone: 'error', content: txt('الأنواع المدعومة هنا: CSV وJSON وNDJSON وTXT.', 'Supported inline formats are CSV, JSON, NDJSON, and TXT.') });
      return;
    }
    const text = await file.text();
    setSelectedFileName(file.name);
    setImportText(text);
    setPreflight(null);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) void readFile(file);
  };

  const runPreflight = async () => {
    if (!importText.trim()) return;
    setPreflightLoading(true);
    setNotice(null);
    try {
      const result = await adminApiClient.request<PreflightResult>('/admin/imports/preflight', {
        method: 'POST',
        body: JSON.stringify({
          dataText: importText,
          sourceSystem: sourceSystem.trim() || 'ADMIN_CONSOLE_MANUAL',
          dataType: modalDomain,
        }),
      });
      setPreflight(result);
    } catch (error) {
      setPreflight(null);
      setNotice({ tone: 'error', content: error instanceof Error ? error.message : txt('فشل فحص ما قبل الاستيراد.', 'Import preflight failed.') });
    } finally {
      setPreflightLoading(false);
    }
  };

  const stageImport = async () => {
    if (!preflight || !importText.trim()) return;
    setImportSubmitting(true);
    setNotice(null);
    try {
      const result = await adminApiClient.request<ImportResult>('/admin/imports', {
        method: 'POST',
        body: JSON.stringify({
          dataText: importText,
          sourceSystem: sourceSystem.trim() || 'ADMIN_CONSOLE_MANUAL',
          dataType: modalDomain,
        }),
      });
      const staged = result.summary?.stagedRecords ?? result.records?.length ?? preflight.newRows;
      const skipped = result.summary?.skippedDuplicates ?? preflight.duplicateRows;
      setShowImportModal(false);
      setImportText('');
      setPreflight(null);
      const handoffReady = capabilityFor(modalDomain)?.handoffReady === true;
      setNotice({
        tone: handoffReady ? 'success' : 'warning',
        content: handoffReady
          ? txt(
              `تم إنشاء دفعة الاستيراد وتخزين ${staged} سجلًا في منطقة التجهيز${skipped ? `، وتجاوز ${skipped} سجلًا مكررًا` : ''}. تسليم المجال متصل، ولا يوجد نشر تلقائي.`,
              `Import batch created with ${staged} staged record(s)${skipped ? ` and ${skipped} duplicate row(s) skipped` : ''}. Owning-domain handoff is connected; nothing is auto-published.`,
            )
          : txt(
              `تم تجهيز ${staged} سجلًا${skipped ? ` وتجاوز ${skipped} مكررًا` : ''}. تسليم المجال غير مربوط بعد؛ ستبقى السجلات NEEDS_REVIEW / AWAITING_DOMAIN_INTEGRATION ولن يدّعي النظام أنها سُلّمت للمجال.`,
              `${staged} record(s) staged${skipped ? ` with ${skipped} duplicate(s) skipped` : ''}. Owning-domain handoff is not connected yet; records remain NEEDS_REVIEW / AWAITING_DOMAIN_INTEGRATION and are not falsely marked as dispatched.`,
            ),
      });
      await refreshAll();
    } catch (error) {
      setNotice({ tone: 'error', content: error instanceof Error ? error.message : txt('فشلت عملية التجهيز.', 'Staging failed.') });
    } finally {
      setImportSubmitting(false);
    }
  };

  const queueAction = async (batch: ImportBatch, action: 'pause' | 'resume' | 'cancel' | 'replay') => {
    const key = `${batch.id}:${action}`;
    let reason: string | undefined;
    if (action === 'cancel') {
      if (!window.confirm(txt('إلغاء الدفعة يوقف معالجتها مع الاحتفاظ بسجل التدقيق. هل تريد المتابعة؟', 'Cancelling stops the batch while preserving its audit trail. Continue?'))) return;
      reason = window.prompt(txt('سبب الإلغاء (اختياري):', 'Cancellation reason (optional):')) ?? undefined;
    }
    if (action === 'pause') {
      reason = window.prompt(txt('سبب الإيقاف المؤقت (اختياري):', 'Pause reason (optional):')) ?? undefined;
    }
    if (action === 'replay' && !window.confirm(txt('ستُعاد جدولة هذه الدفعة للمعالجة. هل تريد المتابعة؟', 'This batch will be queued for replay. Continue?'))) return;

    setActionLoading(key);
    setNotice(null);
    try {
      await adminApiClient.request(`/admin/imports/queue/jobs/${batch.id}/${action}`, {
        method: 'POST',
        body: JSON.stringify(reason ? { reason } : action === 'replay' ? { fromCheckpoint: true } : {}),
      });
      setNotice({ tone: 'success', content: txt('تم تنفيذ الإجراء على الدفعة بنجاح.', 'Batch action completed successfully.') });
      await refreshAll();
    } catch (error) {
      setNotice({ tone: 'error', content: error instanceof Error ? error.message : txt('تعذر تنفيذ الإجراء.', 'Unable to execute batch action.') });
    } finally {
      setActionLoading('');
    }
  };

  const changeSourceStatus = async (source: ImportSource, nextStatus: SourceStatus) => {
    if (source.status === nextStatus) return;
    const risky = nextStatus === 'DISABLED' || nextStatus === 'BLOCKED';
    if (risky && !window.confirm(txt(`سيتم تغيير حالة المصدر «${source.displayName}» إلى ${sourceStatusLabel(nextStatus, isArabic)}. هل تريد المتابعة؟`, `Change “${source.displayName}” to ${sourceStatusLabel(nextStatus, isArabic)}?`))) return;
    const reason = risky ? window.prompt(txt('سبب تغيير الحالة (اختياري):', 'Reason (optional):')) ?? undefined : undefined;
    setSourceActionLoading(source.sourceId);
    try {
      await adminApiClient.request(`/admin/imports/sources/${encodeURIComponent(source.sourceId)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus, reason }),
      });
      setNotice({ tone: 'success', content: txt('تم تحديث حالة المصدر.', 'Source status updated.') });
      await loadControlPlane();
    } catch (error) {
      setNotice({ tone: 'error', content: error instanceof Error ? error.message : txt('تعذر تحديث المصدر.', 'Unable to update source.') });
    } finally {
      setSourceActionLoading('');
    }
  };

  const exportErrorReport = async () => {
    setErrorExportLoading(true);
    try {
      const params = new URLSearchParams({ limit: '1000' });
      if (selectedDomain !== 'ALL') params.set('dataType', selectedDomain);
      if (selectedBatchId) params.set('batchId', selectedBatchId);
      const report = await adminApiClient.request<ErrorReport>(`/admin/imports/error-report?${params}`);
      if (!Array.isArray(report.rows) || report.rows.length === 0) {
        setNotice({ tone: 'warning', content: txt('لا توجد سجلات FAILED أو DLQ ضمن العرض الحالي.', 'There are no FAILED or DLQ records in the current scope.') });
        return;
      }
      const headers = ['recordId', 'batchId', 'domain', 'sourceSystem', 'status', 'sourceRow', 'validationErrors', 'processingNotes', 'createdAt'];
      const rows = report.rows.map((record) => {
        const batch = record.batch;
        return [
          record.id,
          record.batchId,
          normalizeDomain(batch?.dataType),
          batch?.sourceSystem ?? '',
          record.status ?? '',
          record.sourceRowNumber ?? '',
          normalizeErrors(record.validationErrors).join(' | '),
          record.processingNotes ?? '',
          record.createdAt ?? '',
        ];
      });
      const csv = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
      const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
      const href = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href;
      link.download = `manaratak-import-errors-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(href);
      if (report.truncated) {
        setNotice({ tone: 'warning', content: txt('تم تصدير أول 1000 سجل خطأ فقط. استخدم تصفية المجال أو الدفعة لتضييق التقرير.', 'Only the first 1000 error rows were exported. Filter by domain or batch to narrow the report.') });
      }
    } catch (error) {
      setNotice({ tone: 'error', content: error instanceof Error ? error.message : txt('تعذر تصدير تقرير الأخطاء.', 'Unable to export the error report.') });
    } finally {
      setErrorExportLoading(false);
    }
  };

  const selectedDomainConfig = DOMAIN_CONFIG.find((item) => item.key === modalDomain)!;

  return (
    <main
      dir={isArabic ? 'rtl' : 'ltr'}
      className="mx-auto min-h-screen max-w-7xl space-y-6 rounded-3xl p-1 sm:p-2"

    >
      <section className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-[#142B5F] via-[#0E7C86] to-[#21A7B4] p-6 text-white shadow-xl sm:p-8">
        <div className="absolute -top-20 end-0 h-52 w-52 rounded-full bg-[#F2CD78] opacity-20" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-2 flex items-center gap-2 text-xs font-black tracking-wide text-[#F2CD78]">
              <HardDriveUpload className="h-4 w-4" />
              {txt('منصة الاستيراد — Control Plane', 'Import Platform — Control Plane')}
            </div>
            <h1 className="text-3xl font-black sm:text-4xl">{fixedDomainConfig ? txt(`مركز استيراد ${fixedDomainConfig.ar}`, `${fixedDomainConfig.en} Import Center`) : txt('مركز الاستيراد الموحد', 'Unified Import Control Center')}</h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-white/80">
              {fixedDomainConfig
                ? txt('مساحة تشغيل مخصصة لهذا المجال: فحص مسبق، تجهيز، طوابير، أخطاء وتتبع. قرار القبول والدمج والنشر يبقى داخل المجال المالك.', 'Domain-specific operations workspace: preflight, staging, queues, errors and traceability. Acceptance, merge and publication remain owned by the domain.')
                : txt('راقب المصادر والدفعات والسجلات على مستوى المنصة، ثم ادخل إلى مركز كل مجال لتنفيذ الاستيراد. الاستيراد لا يعني النشر.', 'Monitor platform-wide import operations, then open each domain center to execute imports. Import never means publish.')}
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-black">
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5">{txt('لا نشر تلقائي', 'No auto-publish')}</span>
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5">{txt('لا كتابة فوقية صامتة', 'No silent overwrite')}</span>
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5">{txt('المجال يملك قرار الدمج', 'Domain owns merge decisions')}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {fixedDomainConfig ? (
              <>
                <Link to="/imports" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-black text-white transition hover:bg-white/15">
                  {isArabic ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}{txt('مركز الاستيراد العام', 'Import Overview')}
                </Link>
                <button
                  type="button"
                  onClick={() => openImport(fixedDomain)}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#D6A43B] px-4 py-2.5 text-sm font-black text-[#142B5F] shadow-lg transition hover:-translate-y-0.5"
                >
                  <UploadCloud className="h-4 w-4" />
                  {txt('استيراد جديد', 'New Import')}
                </button>
              </>
            ) : null}
            <button
              type="button"
              onClick={() => void refreshAll()}
              disabled={overviewState === 'loading' || dataState === 'loading'}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-black text-white transition hover:bg-white/15 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${overviewState === 'loading' || dataState === 'loading' ? 'animate-spin' : ''}`} />
              {txt('تحديث', 'Refresh')}
            </button>
          </div>
        </div>
      </section>

      {notice && <Notice tone={notice.tone}>{notice.content}</Notice>}

      <section className="grid gap-3 rounded-2xl border border-[#DDEFF2] bg-white p-4 shadow-sm lg:grid-cols-[1.2fr_1fr]">
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#0E7C86]" />
          <div>
            <h2 className="text-sm font-black">{txt('حدود الاستيراد واضحة', 'Import boundary is explicit')}</h2>
            <p className="mt-1 text-xs font-semibold leading-6 text-slate-600">
              {txt('المركز يدير الاكتساب المصرح، التحليل، التجهيز، التكرار التقني، الطوابير والتتبع. قواعد اكتمال المنحة أو الجامعة أو الدورة والدمج والنشر تبقى داخل المجال نفسه.', 'This center owns authorized ingestion, parsing, staging, technical deduplication, queue operations and traceability. Domain completeness, merge and publication rules stay in the owning domain.')}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-black">
          {[
            [txt('المصدر', 'Source'), '1'],
            [txt('فحص مسبق', 'Preflight'), '2'],
            [txt('تجهيز', 'Staging'), '3'],
            [txt('مراجعة المجال', 'Domain Review'), '4'],
          ].map(([label, number]) => (
            <div key={number} className="rounded-xl border border-[#DDEFF2] bg-[#DDEFF2]/30 px-2 py-3">
              <div className="mx-auto mb-1 grid h-6 w-6 place-items-center rounded-full bg-[#142B5F] text-white">{number}</div>
              {label}
            </div>
          ))}
        </div>
      </section>

      {((operations?.stuckBatches ?? 0) > 0 || (operations?.highFailureBatches ?? 0) > 0 || failedJobs > 0 || dlqRecords > 0 || sourcesNeedReview > 0) && (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {(operations?.stuckBatches ?? 0) > 0 && <AttentionCard icon={Clock3} value={operations?.stuckBatches ?? 0} title={txt('دفعات عالقة', 'Stuck batches')} detail={txt('RUNNING/PROCESSING بلا تقدم لأكثر من 15 دقيقة.', 'RUNNING/PROCESSING with no progress for more than 15 minutes.')} />}
          {(operations?.highFailureBatches ?? 0) > 0 && <AttentionCard icon={AlertTriangle} value={operations?.highFailureBatches ?? 0} title={txt('معدل فشل مرتفع', 'High failure rate')} detail={txt('أكثر من 10% من سجلات الدفعة فشلت.', 'More than 10% of batch records failed.')} />}
          {failedJobs > 0 && <AttentionCard icon={AlertTriangle} value={failedJobs} title={txt('دفعات فاشلة / DLQ', 'Failed / DLQ batches')} detail={txt('تحتاج فحص الخطأ أو إعادة التشغيل.', 'Inspect the error or replay safely.')} />}
          {dlqRecords > 0 && <AttentionCard icon={ArchiveRestore} value={dlqRecords} title={txt('سجلات Dead Letter', 'Dead-letter records')} detail={txt('لم تنجح بعد سياسة إعادة المحاولة.', 'Retry policy was exhausted.')} />}
          {sourcesNeedReview > 0 && <AttentionCard icon={SearchCheck} value={sourcesNeedReview} title={txt('مصادر تحتاج مراجعة', 'Sources need review')} detail={txt('تحقق من الوصول والسياسة والموصل.', 'Verify access policy and connector state.')} />}
        </section>
      )}

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-black">{txt('ملخص العمليات', 'Operations Summary')}</h2>
            <p className="text-xs font-semibold text-slate-500">
              {selectedDomain === 'ALL' ? txt('إجمالي مركز الاستيراد — أرقام محسوبة من الخادم.', 'Whole import center — server-derived counters.') : txt(`عرض ${domainLabel(selectedDomain, isArabic)} فقط.`, `${domainLabel(selectedDomain, isArabic)} only.`)}
            </p>
          </div>
          {!fixedDomain && (
            <div className="flex flex-wrap gap-1.5 rounded-xl bg-[#DDEFF2]/45 p-1">
              <button onClick={() => selectDomain('ALL')} className={domainPillClass(selectedDomain === 'ALL')}>{txt('الكل', 'All')}</button>
              {DOMAIN_CONFIG.map((domain) => (
                <button key={domain.key} onClick={() => selectDomain(domain.key)} className={domainPillClass(selectedDomain === domain.key)}>{isArabic ? domain.ar : domain.en}</button>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <MetricCard icon={Layers3} label={txt('إجمالي الدفعات', 'Total Batches')} value={metricValue(scopedMetrics?.batches, overviewState)} accent={BRAND.primary} />
          <MetricCard icon={FileSpreadsheet} label={txt('السجلات المستوردة', 'Imported Records')} value={metricValue(scopedMetrics?.records, overviewState)} accent={BRAND.secondary} />
          <MetricCard icon={PlayCircle} label={txt('دفعات نشطة', 'Active Batches')} value={metricValue(scopedMetrics?.active, overviewState)} accent={BRAND.digital} />
          <MetricCard icon={Clock3} label={txt('بحاجة لمراجعة', 'Needs Review')} value={metricValue(scopedMetrics?.review, overviewState)} accent={BRAND.gold} />
          <MetricCard icon={AlertTriangle} label={txt('فشل / أخطاء', 'Failed / Errors')} value={metricValue(scopedMetrics?.failed, overviewState)} accent="#B94A48" />
          <MetricCard icon={CheckCircle2} label={txt('رُحّلت للمجالات', 'Transferred')} value={metricValue(scopedMetrics?.transferred, overviewState)} accent="#2E7D5A" />
        </div>
      </section>

      <section className="rounded-2xl border border-[#DDEFF2] bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2"><ListChecks className="h-5 w-5 text-[#0E7C86]" /><h2 className="text-lg font-black">{txt('تشخيص العمليات والطوابير', 'Operations & Queue Diagnostics')}</h2></div>
            <p className="mt-1 text-xs font-semibold text-slate-500">{txt('كشف الدفعات العالقة، معدلات الفشل المرتفعة، Retry وDLQ من بيانات التشغيل الفعلية.', 'Real operational diagnostics for stuck batches, high failure rates, retries and DLQ.')}</p>
          </div>
          <button type="button" onClick={() => void exportErrorReport()} disabled={errorExportLoading} className="inline-flex items-center gap-2 rounded-xl border border-[#DDEFF2] px-3 py-2 text-[11px] font-black text-[#142B5F] disabled:opacity-40">
            {errorExportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}{txt('تصدير تقرير الأخطاء', 'Export Error Report')}
          </button>
        </div>
        {operationsState === 'loading' ? <LoadingBlock label={txt('تحميل تشخيص العمليات...', 'Loading operational diagnostics...')} /> : operationsState === 'unavailable' ? <EmptyBlock icon={AlertTriangle} title={txt('تشخيص العمليات غير متاح', 'Operational diagnostics unavailable')} detail={txt('لن نعرض قياسات تقديرية. افحص API أو التخزين الدائم.', 'No estimated metrics are substituted. Check API or durable storage.')} /> : (
          <>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
              <MiniStat label={txt('عالقة >15د', 'Stuck >15m')} value={operations?.stuckBatches ?? 0} />
              <MiniStat label={txt('فشل >10%', 'Failure >10%')} value={operations?.highFailureBatches ?? 0} />
              <MiniStat label={txt('قابلة لإعادة المحاولة', 'Retryable')} value={operations?.retryableBatches ?? 0} />
              <MiniStat label={txt('متوقفة مؤقتًا', 'Paused')} value={operations?.pausedBatches ?? 0} />
              <MiniStat label={txt('في الانتظار', 'Queued')} value={operations?.queuedBatches ?? 0} />
              <MiniStat label={txt('DLQ', 'DLQ')} value={operations?.dlqBatches ?? 0} />
            </div>
            {(operations?.recentProblemBatches?.length ?? 0) > 0 && (
              <div className="mt-4 overflow-x-auto rounded-xl border border-[#DDEFF2]">
                <table className="w-full min-w-[850px] text-xs">
                  <thead className="bg-[#DDEFF2]/40"><tr className="font-black text-slate-500"><th className="p-3">{txt('الدفعة', 'Batch')}</th><th className="p-3">{txt('المجال', 'Domain')}</th><th className="p-3">{txt('الحالة', 'Status')}</th><th className="p-3">{txt('الفشل', 'Failure')}</th><th className="p-3">{txt('آخر تحديث', 'Updated')}</th><th className="p-3 text-end">{txt('فتح', 'Open')}</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {operations?.recentProblemBatches?.map((batch) => (
                      <tr key={batch.id}>
                        <td className="p-3 font-mono text-[10px] font-black">{shortHash(batch.id)}</td>
                        <td className="p-3 font-black">{domainLabel(normalizeDomain(batch.dataType), isArabic)}</td>
                        <td className="p-3"><StatusBadge value={String(batch.batchStatus ?? 'UNKNOWN')} isArabic={isArabic} /></td>
                        <td className="p-3 font-black">{Math.round(Number(batch.failureRate ?? 0) * 100)}%{batch.stuck ? ` · ${txt('عالقة', 'stuck')}` : ''}</td>
                        <td className="p-3 font-bold text-slate-500">{formatDate(batch.updatedAt, isArabic)}</td>
                        <td className="p-3 text-end"><button onClick={() => { setSelectedBatchId(batch.id); setRecordPage(1); }} className="rounded-lg border border-[#DDEFF2] px-2.5 py-1.5 text-[10px] font-black text-[#0E7C86]">{txt('سجلات الدفعة', 'Batch records')}</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>

      {!fixedDomain && (
      <section className="rounded-2xl border border-[#DDEFF2] bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black">{txt('مجالات الاستيراد', 'Import Domains')}</h2>
            <p className="text-xs font-semibold text-slate-500">{txt('سبعة مجالات تشغيلية. كل مجال يملك قواعده وقراراته بعد التجهيز.', 'Seven operational domains. Each owns its rules and decisions after staging.')}</p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {DOMAIN_CONFIG.map((domain) => {
            const stat = mergedDomainOverview(domain.key);
            const capability = capabilityFor(domain.key);
            const Icon = domain.icon;
            return (
              <article key={domain.key} className={`rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-md ${selectedDomain === domain.key ? 'border-[#21A7B4] bg-[#DDEFF2]/30' : 'border-[#DDEFF2] bg-white'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#142B5F] text-white"><Icon className="h-5 w-5" /></div>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-black">{isArabic ? domain.ar : domain.en}</h3>
                      <p className="mt-0.5 text-[10px] font-bold text-slate-400">CSV · JSON · NDJSON</p>
                      <div className="mt-1">
                        {capabilitiesState === 'ready' ? (
                          <span className={`rounded-full px-2 py-0.5 text-[8px] font-black ${capability?.handoffReady ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                            {capability?.handoffReady ? txt('Handoff متصل', 'Handoff connected') : txt('Staging فقط', 'Staging only')}
                          </span>
                        ) : <span className="text-[8px] font-bold text-slate-400">{txt('حالة الربط غير متاحة', 'Handoff status unavailable')}</span>}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => selectDomain(domain.key)} className="rounded-lg border border-[#DDEFF2] px-2 py-1 text-[10px] font-black text-[#0E7C86]">{txt('تصفية', 'Filter')}</button>
                </div>
                <div className="mt-4 grid grid-cols-4 gap-1.5 text-center">
                  <MiniStat label={txt('سجل', 'Records')} value={stat.records} />
                  <MiniStat label={txt('مراجعة', 'Review')} value={stat.needsReview} />
                  <MiniStat label={txt('فشل', 'Failed')} value={stat.failedRecords} />
                  <MiniStat label={txt('رُحّل', 'Moved')} value={stat.transferredRecords} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link to={domain.importPath} className="inline-flex items-center gap-1.5 rounded-lg bg-[#0E7C86] px-3 py-2 text-[11px] font-black text-white"><UploadCloud className="h-3.5 w-3.5" />{txt('فتح مركز المجال', 'Open Domain Center')}</Link>
                  <Link to={domain.workspace} className="inline-flex items-center gap-1.5 rounded-lg border border-[#DDEFF2] px-3 py-2 text-[11px] font-black text-[#142B5F]">{txt('مساحة المجال', 'Domain Workspace')}{isArabic ? <ArrowLeft className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}</Link>
                  {domain.advancedWorkspace && <Link to={domain.advancedWorkspace} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-black text-[#D6A43B]">{txt('مركز المنح المتقدم', 'Advanced scholarship center')}</Link>}
                </div>
              </article>
            );
          })}
        </div>
        {otherDomainEntries.length > 0 && (
          <div className="mt-4 rounded-xl border border-[#D6A43B]/35 bg-[#F2CD78]/10 p-3">
            <div className="text-[11px] font-black">{txt('بيانات داخلية/قديمة خارج المجالات السبعة', 'Internal / legacy staging outside the seven primary domains')}</div>
            <p className="mt-1 text-[10px] font-semibold text-slate-500">{txt('لا نخفي هذه البيانات ولا نتيح استيرادًا عامًا جديدًا إليها من هذه الصفحة؛ تظهر هنا للتتبع فقط حتى تُعالج في المسار المالك.', 'These records are not hidden and new generic imports are not opened for them here; they remain visible for traceability until handled by their owning flow.')}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {otherDomainEntries.map(([key, value]) => <span key={key} className="rounded-lg border border-[#DDEFF2] bg-white px-3 py-2 text-[10px] font-black">{key}: {Number(value.records ?? 0).toLocaleString()} {txt('سجل', 'records')} · {Number(value.batches ?? 0).toLocaleString()} {txt('دفعة', 'batches')}</span>)}
            </div>
          </div>
        )}
      </section>
      )}

      <section className="rounded-2xl border border-[#DDEFF2] bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2"><Globe2 className="h-5 w-5 text-[#0E7C86]" /><h2 className="text-lg font-black">{txt('سجل المصادر والموصلات', 'Source & Connector Registry')}</h2></div>
            <p className="mt-1 text-xs font-semibold text-slate-500">{txt('مصادر مسجلة فعليًا في Import Source Registry. لا نعرض موصلات تجريبية أو مصادر مخترعة.', 'Only sources actually registered in the Import Source Registry are shown. No demo connectors or invented feeds.')}</p>
          </div>
          <div className="flex gap-2 text-[11px] font-black">
            <span className="rounded-full bg-[#0E7C86]/10 px-3 py-1.5 text-[#0E7C86]">{txt('نشط', 'Active')}: {sourcesState === 'ready' ? activeSources : '—'}</span>
            <span className="rounded-full bg-[#D6A43B]/10 px-3 py-1.5 text-[#8A671C]">{txt('يحتاج مراجعة', 'Needs review')}: {sourcesState === 'ready' ? sourcesNeedReview : '—'}</span>
          </div>
        </div>

        {sourcesState === 'loading' ? <LoadingBlock label={txt('تحميل سجل المصادر...', 'Loading source registry...')} /> : sourcesState === 'unavailable' ? (
          <EmptyBlock icon={ShieldX} title={txt('سجل المصادر غير متاح', 'Source registry unavailable')} detail={txt('لن نعرض مصادر تجريبية كبديل. افحص اتصال API أو التخزين الدائم.', 'No demo sources are substituted. Check API or durable registry availability.')} />
        ) : visibleSources.length === 0 ? (
          <EmptyBlock icon={Globe2} title={txt('لا توجد مصادر مسجلة لهذا العرض', 'No registered sources for this view')} detail={txt('هذا يعني أن Source Registry لا يحتوي مصادر مطابقة حاليًا، وليس أن النظام اخترع قائمة بديلة.', 'The Source Registry currently has no matching entries; the UI does not fabricate a fallback list.')} />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#DDEFF2]">
            <table className="w-full min-w-[950px] text-xs">
              <thead className="bg-[#DDEFF2]/40">
                <tr className="text-start font-black text-slate-500">
                  <th className="p-3">{txt('المصدر', 'Source')}</th>
                  <th className="p-3">{txt('النوع', 'Category')}</th>
                  <th className="p-3">{txt('الوصول', 'Access')}</th>
                  <th className="p-3">{txt('الموصل', 'Connector')}</th>
                  <th className="p-3">{txt('المجال', 'Domain')}</th>
                  <th className="p-3">{txt('حوكمة الجلب', 'Acquisition Governance')}</th>
                  <th className="p-3">{txt('الحالة', 'Status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleSources.map((source) => (
                  <tr key={source.sourceId} className="hover:bg-slate-50/70">
                    <td className="p-3">
                      <div className="font-black">{source.displayName}</div>
                      <a href={source.baseUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex max-w-[280px] items-center gap-1 truncate text-[10px] font-bold text-[#0E7C86]"><ExternalLink className="h-3 w-3 shrink-0" />{source.baseUrl}</a>
                    </td>
                    <td className="p-3"><TagBadge>{sourceCategoryLabel(source.category, isArabic)}</TagBadge></td>
                    <td className="p-3"><TagBadge>{sourceAccessLabel(source.accessClassification, isArabic)}</TagBadge></td>
                    <td className="p-3"><div className="font-mono text-[10px] font-bold">{source.connectorId}</div><div className="text-[10px] text-slate-400">v{source.connectorVersion}</div></td>
                    <td className="p-3 font-bold">{sourceOwnerDomain(source) ? domainLabel(sourceOwnerDomain(source), isArabic) : txt('عام', 'Generic')}</td>
                    <td className="p-3">
                      <div className="text-[10px] font-black text-slate-600">{txt('الحد', 'Rate')}: {source.rateLimitPerMinute ?? '—'} {source.rateLimitPerMinute ? txt('طلب/دقيقة', 'req/min') : ''}</div>
                      {source.robotsPolicyUrl ? <a href={source.robotsPolicyUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[9px] font-black text-[#0E7C86]"><ExternalLink className="h-3 w-3" />robots</a> : <div className="mt-1 text-[9px] font-bold text-slate-400">{txt('لا يوجد رابط سياسة مسجل', 'No policy URL registered')}</div>}
                    </td>
                    <td className="p-3">
                      <select
                        value={source.status}
                        disabled={sourceActionLoading === source.sourceId}
                        onChange={(event) => void changeSourceStatus(source, event.target.value as SourceStatus)}
                        className={`min-h-9 rounded-lg border border-[#DDEFF2] bg-white px-2 text-[10px] font-black outline-none disabled:opacity-50 ${sourceStatusClass(source.status)}`}
                      >
                        {(['ACTIVE', 'NEEDS_REVIEW', 'DISABLED', 'BLOCKED'] as SourceStatus[]).map((status) => <option key={status} value={status} disabled={source.accessClassification === 'BLOCKED' && status === 'ACTIVE'}>{sourceStatusLabel(status, isArabic)}</option>)}
                      </select>
                      {typeof source.metadata?.lastRegistryStatusChange === 'object' && source.metadata.lastRegistryStatusChange && (
                        <div className="mt-1 max-w-[210px] text-[9px] font-semibold text-slate-400">
                          {txt('آخر تغيير مسجل في الحوكمة', 'Last governed status change')}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-[#DDEFF2] bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2"><Layers3 className="h-5 w-5 text-[#142B5F]" /><h2 className="text-lg font-black">{txt('دفعات الاستيراد والطابور', 'Import Batches & Queue')}</h2></div>
            <p className="mt-1 text-xs font-semibold text-slate-500">{txt('تعرض أحدث الدفعات من قاعدة الاستيراد. الأزرار تظهر فقط عندما تسمح حالة الوظيفة بالفعل.', 'Shows the latest persisted batches. Queue actions appear only when valid for the current state.')}</p>
          </div>
          {selectedBatchId && <button onClick={() => { setSelectedBatchId(''); setRecordPage(1); }} className="inline-flex items-center gap-1.5 rounded-lg border border-[#DDEFF2] px-3 py-2 text-[11px] font-black text-[#0E7C86]"><X className="h-3.5 w-3.5" />{txt('إلغاء تصفية الدفعة', 'Clear batch filter')}</button>}
        </div>

        {dataState === 'loading' ? <LoadingBlock label={txt('تحميل الدفعات...', 'Loading batches...')} /> : dataState === 'unavailable' ? <EmptyBlock icon={AlertTriangle} title={txt('تعذر تحميل الدفعات', 'Unable to load batches')} detail={txt('تحقق من اتصال API ثم أعد المحاولة.', 'Check API connectivity and retry.')} /> : batches.length === 0 ? <EmptyBlock icon={Layers3} title={txt('لا توجد دفعات', 'No import batches')} detail={txt('ابدأ استيرادًا جديدًا لإنشاء أول دفعة.', 'Start a new import to create the first batch.')} /> : (
          <div className="overflow-x-auto rounded-xl border border-[#DDEFF2]">
            <table className="w-full min-w-[1100px] text-xs">
              <thead className="bg-[#DDEFF2]/40">
                <tr className="font-black text-slate-500">
                  <th className="p-3">{txt('الدفعة / المصدر', 'Batch / Source')}</th>
                  <th className="p-3">{txt('المجال', 'Domain')}</th>
                  <th className="p-3">{txt('الحالة', 'Status')}</th>
                  <th className="p-3">{txt('التقدم', 'Progress')}</th>
                  <th className="p-3">{txt('المحاولات', 'Attempts')}</th>
                  <th className="p-3">{txt('آخر تحديث', 'Updated')}</th>
                  <th className="p-3 text-end">{txt('إجراءات آمنة', 'Safe Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batches.map((batch) => {
                  const status = String(batch.batchStatus ?? 'UNKNOWN').toUpperCase();
                  const total = Number(batch.totalRecords ?? 0);
                  const done = Number(batch.processedRecords ?? 0) + Number(batch.failedRecords ?? 0);
                  const progress = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
                  return (
                    <tr key={batch.id} className={`${selectedBatchId === batch.id ? 'bg-cyan-50/60' : 'hover:bg-slate-50/70'} cursor-pointer`} onClick={() => { setSelectedBatchId(batch.id); setRecordPage(1); }}>
                      <td className="p-3">
                        <div className="font-mono text-[10px] font-black">{batch.id}</div>
                        <div className="mt-1 text-[10px] font-bold text-slate-500">{batch.sourceSystem ?? '—'}</div>
                        {batch.lastError && <div className="mt-1 max-w-[300px] truncate text-[10px] font-bold text-red-600" title={batch.lastError}>{batch.lastError}</div>}
                      </td>
                      <td className="p-3 font-black">{domainLabel(normalizeDomain(batch.dataType), isArabic)}</td>
                      <td className="p-3"><StatusBadge value={status} isArabic={isArabic} /></td>
                      <td className="p-3">
                        <div className="min-w-[170px]">
                          <div className="mb-1 flex justify-between text-[10px] font-black"><span>{done}/{total}</span><span>{progress}%</span></div>
                          <progress className={`admin-progress ${Number(batch.failedRecords ?? 0) > 0 ? 'admin-progress-warning' : 'admin-progress-ok'}`} value={progress} max={100} aria-label={txt('تقدم الدفعة', 'Batch progress')} />
                          <div className="mt-1 text-[9px] font-bold text-slate-400">{txt('فشل', 'Failed')}: {batch.failedRecords ?? 0}</div>
                        </div>
                      </td>
                      <td className="p-3 font-black">{batch.attemptCount ?? 0}</td>
                      <td className="p-3 text-[10px] font-bold text-slate-500">{formatDate(batch.updatedAt ?? batch.createdAt, isArabic)}</td>
                      <td className="p-3" onClick={(event) => event.stopPropagation()}>
                        <div className="flex justify-end gap-1.5">
                          {['QUEUED', 'RUNNING'].includes(status) && <ActionButton icon={PauseCircle} label={txt('إيقاف', 'Pause')} loading={actionLoading === `${batch.id}:pause`} onClick={() => void queueAction(batch, 'pause')} />}
                          {['PAUSED', 'RESUMING'].includes(status) && <ActionButton icon={CirclePlay} label={txt('استئناف', 'Resume')} loading={actionLoading === `${batch.id}:resume`} onClick={() => void queueAction(batch, 'resume')} />}
                          {['CREATED', 'QUEUED', 'RUNNING', 'PAUSED', 'RESUMING', 'CANCELLING'].includes(status) && <ActionButton icon={Square} label={txt('إلغاء', 'Cancel')} loading={actionLoading === `${batch.id}:cancel`} onClick={() => void queueAction(batch, 'cancel')} danger />}
                          {REPLAYABLE_BATCH_STATUSES.has(status) && <ActionButton icon={RotateCcw} label={txt('إعادة تشغيل', 'Replay')} loading={actionLoading === `${batch.id}:replay`} onClick={() => void queueAction(batch, 'replay')} />}
                          {!ACTIVE_BATCH_STATUSES.has(status) && !REPLAYABLE_BATCH_STATUSES.has(status) && <span className="text-[10px] font-bold text-slate-400">{txt('لا إجراء متاح', 'No queue action')}</span>}
                          {status === 'PROCESSING' && <span className="text-[10px] font-bold text-slate-400">{txt('معالجة متزامنة قديمة', 'Legacy synchronous processing')}</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-[#DDEFF2] bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2"><Database className="h-5 w-5 text-[#0E7C86]" /><h2 className="text-lg font-black">{txt('السجلات المجهزة', 'Staged Records')}</h2></div>
            <p className="mt-1 text-xs font-semibold text-slate-500">{txt('هذه بيانات في منطقة الاستيراد وليست محتوى منشورًا. افتح المجال المالك لإتمام المراجعة.', 'These are import-stage records, not published content. Open the owning domain to complete review.')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Filter className="pointer-events-none absolute start-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <select value={recordStatus} onChange={(event) => { setRecordStatus(event.target.value); setRecordPage(1); }} className="min-h-9 rounded-lg border border-[#DDEFF2] bg-white py-1.5 pe-7 ps-8 text-[11px] font-black outline-none">
                {RECORD_STATUS_OPTIONS.map((status) => <option key={status || 'ALL'} value={status}>{status ? recordStatusLabel(status, isArabic) : txt('كل حالات السجلات', 'All record statuses')}</option>)}
              </select>
            </div>
            <span className="rounded-lg bg-[#DDEFF2]/45 px-3 py-2 text-[11px] font-black">{txt('الإجمالي', 'Total')}: {records.total}</span>
          </div>
        </div>

        {dataState === 'loading' ? <LoadingBlock label={txt('تحميل السجلات...', 'Loading records...')} /> : dataState === 'unavailable' ? <EmptyBlock icon={AlertTriangle} title={txt('تعذر تحميل السجلات', 'Unable to load records')} detail={txt('تحقق من اتصال API.', 'Check API connectivity.')} /> : records.data.length === 0 ? <EmptyBlock icon={Database} title={txt('لا توجد سجلات مطابقة', 'No matching staged records')} detail={txt('غيّر الفلاتر أو ابدأ دفعة جديدة.', 'Adjust filters or start a new batch.')} /> : (
          <>
            <div className="overflow-x-auto rounded-xl border border-[#DDEFF2]">
              <table className="w-full min-w-[1080px] text-xs">
                <thead className="bg-[#DDEFF2]/40">
                  <tr className="font-black text-slate-500">
                    <th className="p-3">#</th>
                    <th className="p-3">{txt('السجل', 'Record')}</th>
                    <th className="p-3">{txt('المجال / المصدر', 'Domain / Source')}</th>
                    <th className="p-3">{txt('الحالة', 'Status')}</th>
                    <th className="p-3">{txt('التحقق', 'Validation')}</th>
                    <th className="p-3">{txt('التتبع', 'Trace')}</th>
                    <th className="p-3 text-end">{txt('الإجراء', 'Action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.data.map((record) => {
                    const payload = record.rawPayload ?? {};
                    const batch = record.batch;
                    const domain = normalizeDomain(batch?.dataType);
                    const config = DOMAIN_CONFIG.find((item) => item.key === domain);
                    const validationErrors = normalizeErrors(record.validationErrors);
                    return (
                      <tr key={record.id} className="hover:bg-slate-50/70">
                        <td className="p-3 font-mono text-[10px] font-black text-slate-400">{String(record.sourceRowNumber ?? payload._sourceRowNumber ?? '—')}</td>
                        <td className="p-3">
                          <div className="max-w-[300px] truncate font-black">{recordTitle(payload)}</div>
                          <div className="mt-1 font-mono text-[9px] font-bold text-slate-400">{record.id}</div>
                        </td>
                        <td className="p-3"><div className="font-black">{domainLabel(domain, isArabic)}</div><div className="mt-1 text-[10px] font-bold text-slate-400">{batch?.sourceSystem ?? '—'}</div></td>
                        <td className="p-3"><StatusBadge value={String(record.status ?? 'UNKNOWN')} isArabic={isArabic} /></td>
                        <td className="p-3">
                          {validationErrors.length ? <div className="flex max-w-[260px] flex-wrap gap-1">{validationErrors.slice(0, 3).map((error, index) => <span key={`${record.id}:${index}`} className="rounded-md bg-red-50 px-1.5 py-1 text-[9px] font-bold text-red-700">{error}</span>)}{validationErrors.length > 3 && <span className="text-[9px] font-black text-slate-400">+{validationErrors.length - 3}</span>}</div> : <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />{txt('لا أخطاء عامة', 'No generic errors')}</span>}
                        </td>
                        <td className="p-3"><div className="font-mono text-[9px] font-bold text-slate-500">{record.sourceDedupKey ? shortHash(record.sourceDedupKey) : '—'}</div>{record.promotedEntityId && <div className="mt-1 text-[9px] font-black text-emerald-700">{txt('كيان', 'Entity')}: {record.promotedEntityId}</div>}</td>
                        <td className="p-3">
                          <div className="flex justify-end gap-1.5">
                            <button onClick={() => setSelectedRecord(record)} className="inline-flex items-center gap-1 rounded-lg border border-[#DDEFF2] px-2.5 py-1.5 text-[10px] font-black text-[#0E7C86]"><Eye className="h-3.5 w-3.5" />{txt('تفاصيل', 'Details')}</button>
                            {config && <Link to={config.workspace} className="inline-flex items-center gap-1 rounded-lg bg-[#142B5F] px-2.5 py-1.5 text-[10px] font-black text-white">{txt('فتح المجال', 'Open Domain')}{isArabic ? <ArrowLeft className="h-3 w-3" /> : <ArrowRight className="h-3 w-3" />}</Link>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-slate-500">
              <span>{txt('صفحة', 'Page')} {records.page} / {totalRecordPages} · {records.total} {txt('سجل', 'records')}</span>
              <div className="flex gap-1.5">
                <button disabled={recordPage <= 1} onClick={() => setRecordPage((value) => Math.max(1, value - 1))} className="grid h-9 w-9 place-items-center rounded-lg border border-[#DDEFF2] bg-white disabled:opacity-30">{isArabic ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}</button>
                <button disabled={recordPage >= totalRecordPages} onClick={() => setRecordPage((value) => Math.min(totalRecordPages, value + 1))} className="grid h-9 w-9 place-items-center rounded-lg border border-[#DDEFF2] bg-white disabled:opacity-30">{isArabic ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</button>
              </div>
            </div>
          </>
        )}
      </section>

      <section className="rounded-2xl border border-[#DDEFF2] bg-white p-5 shadow-sm">
        <div className="mb-4">
          <div className="flex items-center gap-2"><ListChecks className="h-5 w-5 text-[#0E7C86]" /><h2 className="text-lg font-black">{txt('سجل عمليات مركز الاستيراد', 'Import Operations Audit Log')}</h2></div>
          <p className="mt-1 text-xs font-semibold text-slate-500">{txt('آخر عمليات التغيير الفعلية على مسارات الاستيراد. هذا سجل تدقيق للقراءة فقط وليس قائمة نشاط تجريبية.', 'Recent real mutations on import routes. This is a read-only audit trail, not demo activity.')}</p>
        </div>
        {activityState === 'loading' ? <LoadingBlock label={txt('تحميل سجل التدقيق...', 'Loading audit activity...')} /> : activityState === 'unavailable' ? <EmptyBlock icon={ShieldX} title={txt('سجل عمليات الاستيراد غير متاح', 'Import audit activity unavailable')} detail={txt('لا يتم إنشاء نشاط بديل. تحقق من Audit persistence والتوصيل.', 'No fallback activity is fabricated. Check audit persistence and wiring.')} /> : activity.length === 0 ? <EmptyBlock icon={ListChecks} title={txt('لا توجد عمليات مسجلة بعد', 'No import mutations recorded yet')} detail={txt('سيظهر هنا Pause/Resume/Cancel/Replay وتغييرات المصادر وعمليات الاستيراد عندما يسجلها Audit middleware.', 'Pause/resume/cancel/replay, source changes and import mutations will appear here when recorded by the audit middleware.')} /> : (
          <div className="overflow-x-auto rounded-xl border border-[#DDEFF2]">
            <table className="w-full min-w-[900px] text-xs">
              <thead className="bg-[#DDEFF2]/40"><tr className="font-black text-slate-500"><th className="p-3">{txt('الوقت', 'Time')}</th><th className="p-3">{txt('المشرف', 'Actor')}</th><th className="p-3">{txt('العملية', 'Operation')}</th><th className="p-3">{txt('المسار', 'Path')}</th><th className="p-3">{txt('النتيجة', 'Result')}</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {activity.map((item) => (
                  <tr key={item.id}>
                    <td className="p-3 font-bold text-slate-500">{formatDate(item.timestamp, isArabic)}</td>
                    <td className="p-3 font-mono text-[10px] font-black">{item.actorId || 'SYSTEM'}</td>
                    <td className="p-3 font-black">{item.method ? `${item.method} · ` : ''}{item.action}</td>
                    <td className="p-3 font-mono text-[9px] font-bold text-slate-500">{item.path ?? item.targetId ?? '—'}</td>
                    <td className="p-3"><span className={`rounded-full px-2 py-1 text-[9px] font-black ${item.result === 'FAILURE' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{item.result ?? 'SUCCESS'}{item.httpStatus ? ` · ${item.httpStatus}` : ''}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-[#D6A43B]/35 bg-[#F2CD78]/15 p-4">
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#8A671C]" />
          <div className="text-xs font-semibold leading-6 text-slate-700">
            <span className="font-black">{txt('قواعد الحوكمة:', 'Governance rules:')}</span>{' '}
            {txt('كل وظيفة ظاهرة مدعومة بمسار backend فعلي أو حالة فارغة صريحة. الجلب غير المصرح، النشر المباشر، الدمج الصامت، والأوامر الجماعية الخطرة لا تنفذ من مركز الاستيراد العام.', 'Every visible operation is backed by a real backend path or an explicit empty state. Unauthorized acquisition, direct publication, silent merge, and unsafe bulk commands are not executed from the generic import center.')}
          </div>
        </div>
      </section>

      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1730]/70 p-3 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowImportModal(false); }}>
          <section className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-[#DDEFF2] bg-white shadow-2xl" dir={isArabic ? 'rtl' : 'ltr'}>
            <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[#DDEFF2] bg-white/95 px-5 py-4 backdrop-blur">
              <div>
                <div className="flex items-center gap-2"><UploadCloud className="h-5 w-5 text-[#0E7C86]" /><h2 className="text-lg font-black">{txt('إنشاء دفعة استيراد', 'Create Import Batch')}</h2></div>
                <p className="mt-1 text-[11px] font-semibold text-slate-500">{txt('إدخال → فحص مسبق → تجهيز. لا يوجد نشر في هذه النافذة.', 'Input → preflight → staging. No publication occurs here.')}</p>
              </div>
              <button onClick={() => setShowImportModal(false)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </header>

            <div className="space-y-5 p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1.5 text-xs font-black">
                  <span>{txt('المجال المستهدف', 'Target Domain')}</span>
                  <select value={modalDomain} disabled={Boolean(fixedDomain)} onChange={(event) => { setModalDomain(event.target.value as Exclude<DomainKey, 'ALL'>); setImportText(''); setSelectedFileName(''); setPreflight(null); }} className="w-full rounded-xl border border-[#DDEFF2] bg-white px-3 py-2.5 text-xs font-bold outline-none disabled:bg-slate-50 disabled:text-slate-500">
                    {DOMAIN_CONFIG.map((domain) => <option key={domain.key} value={domain.key}>{isArabic ? domain.ar : domain.en}</option>)}
                  </select>
                </label>
                <label className="space-y-1.5 text-xs font-black">
                  <span>{txt('مرجع المصدر / Source System', 'Source Reference / System')}</span>
                  <input value={sourceSystem} onChange={(event) => { setSourceSystem(event.target.value); setPreflight(null); }} className="w-full rounded-xl border border-[#DDEFF2] px-3 py-2.5 text-xs font-bold outline-none" placeholder="ADMIN_CONSOLE_MANUAL" />
                </label>
              </div>

              {capabilitiesState === 'ready' && (
                <div className={`rounded-xl border p-3 text-[10px] font-semibold leading-6 ${capabilityFor(modalDomain)?.handoffReady ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
                  <span className="font-black">{capabilityFor(modalDomain)?.handoffReady ? txt('تسليم المجال متصل:', 'Domain handoff connected:') : txt('تنبيه تكاملي:', 'Integration notice:')}</span>{' '}
                  {capabilityFor(modalDomain)?.handoffReady
                    ? txt('السجلات الصالحة يمكن تسليمها عبر Consumer مسجل للمجال، مع بقاء النشر قرارًا بشريًا داخل المجال.', 'Valid staged records can be handed off through a registered domain consumer; publication still requires the owning-domain workflow.')
                    : txt('لا يوجد Handoff Consumer مسجل لهذا المجال حاليًا. سيتم حفظ السجلات في Staging بحالة NEEDS_REVIEW وAWAITING_DOMAIN_INTEGRATION، ولن تُعلّم كأنها سُلّمت للمجال.', 'No owning-domain handoff consumer is registered yet. Records remain in staging as NEEDS_REVIEW / AWAITING_DOMAIN_INTEGRATION and are not marked as dispatched.')}
                </div>
              )}

              {sources.length > 0 && (
                <div className="rounded-xl border border-[#DDEFF2] bg-[#DDEFF2]/20 p-3">
                  <label className="flex flex-col gap-2 text-xs font-black sm:flex-row sm:items-center sm:justify-between">
                    <span>{txt('أو اربط الدفعة بمصدر مسجل', 'Or attribute this batch to a registered source')}</span>
                    <select value={sources.some((source) => source.sourceId === sourceSystem) ? sourceSystem : ''} onChange={(event) => { if (event.target.value) setSourceSystem(event.target.value); setPreflight(null); }} className="min-h-9 rounded-lg border border-[#DDEFF2] bg-white px-3 text-[11px] font-bold">
                      <option value="">{txt('اختر مصدرًا مسجلًا (اختياري)', 'Choose registered source (optional)')}</option>
                      {visibleSources.filter((source) => source.status === 'ACTIVE').map((source) => <option key={source.sourceId} value={source.sourceId}>{source.displayName} · {sourceStatusLabel(source.status, isArabic)}</option>)}
                    </select>
                  </label>
                  <p className="mt-2 text-[10px] font-semibold text-slate-500">{txt('هذا يحدد مصدر البيانات للتتبع فقط؛ لا ينفذ جلبًا آليًا غير موجود في الـbackend.', 'This attributes provenance only; it does not pretend to run an automated acquisition flow that is not exposed by the backend.')}</p>
                </div>
              )}

              <div className="flex w-fit gap-1 rounded-xl bg-[#DDEFF2]/45 p-1">
                <button onClick={() => { setInputMode('file'); setPreflight(null); }} className={`rounded-lg px-4 py-2 text-[11px] font-black ${inputMode === 'file' ? 'bg-[#142B5F] text-white' : 'text-slate-600'}`}><span className="inline-flex items-center gap-1.5"><FileSpreadsheet className="h-3.5 w-3.5" />{txt('رفع ملف صغير', 'Upload Small File')}</span></button>
                <button onClick={() => { setInputMode('paste'); setPreflight(null); }} className={`rounded-lg px-4 py-2 text-[11px] font-black ${inputMode === 'paste' ? 'bg-[#142B5F] text-white' : 'text-slate-600'}`}><span className="inline-flex items-center gap-1.5"><FileJson2 className="h-3.5 w-3.5" />{txt('لصق CSV/JSON', 'Paste CSV/JSON')}</span></button>
              </div>

              {inputMode === 'file' ? (
                <div
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer rounded-2xl border-2 border-dashed border-[#21A7B4] p-8 text-center transition hover:bg-slate-50"
                >
                  <input ref={fileInputRef} type="file" accept=".csv,.json,.ndjson,.txt" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void readFile(file); event.currentTarget.value = ''; }} />
                  <HardDriveUpload className="mx-auto h-9 w-9 text-[#0E7C86]" />
                  <div className="mt-3 text-sm font-black">{selectedFileName || txt('اسحب الملف هنا أو اضغط للاختيار', 'Drop a file here or click to choose')}</div>
                  <p className="mt-2 text-[10px] font-semibold text-slate-500">CSV / JSON / NDJSON / TXT · ≤ 90KB</p>
                </div>
              ) : (
                <textarea rows={10} value={importText} onChange={(event) => { setImportText(event.target.value); setPreflight(null); setSelectedFileName(''); }} className="w-full rounded-2xl border border-[#DDEFF2] bg-slate-50/40 p-4 font-mono text-[11px] leading-6 outline-none focus:ring-2" placeholder={txt('الصق البيانات هنا...', 'Paste data here...')} />
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#DDEFF2] p-3">
                <div className="text-[10px] font-semibold text-slate-500">
                  {txt('قالب الحقول ليس بيانات تجريبية؛ يضيف صف العناوين فقط لتعرف الشكل المتوقع.', 'The field template is not demo data; it inserts headers only to show the expected shape.')}
                </div>
                <button onClick={() => { setInputMode('paste'); setImportText(selectedDomainConfig.template); setSelectedFileName(''); setPreflight(null); }} className="rounded-lg border border-[#D6A43B] px-3 py-2 text-[10px] font-black text-[#8A671C]">{txt('إدراج قالب الحقول فقط', 'Insert headers-only template')}</button>
              </div>

              {importText.trim() && (
                <div className="rounded-xl border border-[#DDEFF2] p-3 text-[10px] font-bold text-slate-500">
                  {txt('الحجم الحالي', 'Current size')}: {new Blob([importText]).size.toLocaleString()} bytes · {txt('الحد', 'limit')}: {INLINE_LIMIT_BYTES.toLocaleString()} bytes
                </div>
              )}

              {preflight && (
                <section className="rounded-2xl border border-[#21A7B4] bg-[#DDEFF2]/20 p-4">
                  <div className="flex items-center gap-2"><SearchCheck className="h-5 w-5 text-[#0E7C86]" /><h3 className="text-sm font-black">{txt('نتيجة الفحص المسبق', 'Preflight Result')}</h3></div>
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <MiniStat label={txt('الصفوف', 'Rows')} value={preflight.totalRows} />
                    <MiniStat label={txt('جديدة', 'New')} value={preflight.newRows} />
                    <MiniStat label={txt('مكررة', 'Duplicates')} value={preflight.duplicateRows} />
                    <MiniStat label={txt('غير صالحة بنيويًا', 'Invalid')} value={preflight.invalidRows} />
                  </div>
                  <div className="mt-3 space-y-1.5">
                    {preflight.warnings.map((warning, index) => <div key={index} className="flex gap-2 text-[10px] font-semibold text-slate-600"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D6A43B]" />{warning}</div>)}
                  </div>
                  {preflight.previewRows.length > 0 && (
                    <details className="mt-3 rounded-xl border border-[#DDEFF2] bg-white p-3">
                      <summary className="cursor-pointer text-[10px] font-black">{txt('معاينة أول 5 صفوف محللة', 'Preview first 5 parsed rows')}</summary>
                      <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-slate-950 p-3 text-left text-[9px] leading-5 text-slate-100" dir="ltr">{JSON.stringify(preflight.previewRows, null, 2)}</pre>
                    </details>
                  )}
                </section>
              )}

              <div className="rounded-xl border border-[#D6A43B]/35 bg-[#F2CD78]/15 p-3 text-[10px] font-semibold leading-6">
                <span className="font-black">{txt('قاعدة الأمان:', 'Safety rule:')}</span>{' '}
                {txt('الفحص العام هنا يختبر التحليل والتكرار التقني فقط. التحقق الدلالي، الاكتمال، المطابقة والدمج مسؤولية المجال المالك. لا يتم نشر أي سجل من هذه النافذة.', 'Generic preflight checks parsing and technical source identity only. Semantic validation, completeness, matching and merge are owned by the target domain. Nothing is published from this dialog.')}
              </div>

              <div className="flex flex-wrap justify-end gap-2 border-t border-[#DDEFF2] pt-4">
                <button onClick={() => setShowImportModal(false)} className="rounded-xl px-4 py-2.5 text-xs font-black text-slate-500 hover:bg-slate-100">{txt('إلغاء', 'Cancel')}</button>
                <button disabled={!importText.trim() || preflightLoading || importSubmitting || new Blob([importText]).size > INLINE_LIMIT_BYTES} onClick={() => void runPreflight()} className="inline-flex items-center gap-2 rounded-xl border border-[#0E7C86] px-4 py-2.5 text-xs font-black text-[#0E7C86] disabled:opacity-40">{preflightLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SearchCheck className="h-4 w-4" />}{txt('فحص قبل الاستيراد', 'Run Preflight')}</button>
                <button disabled={!preflight || importSubmitting || preflight.newRows <= 0} onClick={() => void stageImport()} className="inline-flex items-center gap-2 rounded-xl bg-[#0E7C86] px-5 py-2.5 text-xs font-black text-white shadow-sm disabled:opacity-40">{importSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}{txt('تجهيز الدفعة', 'Stage Batch')}</button>
              </div>
            </div>
          </section>
        </div>
      )}

      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-[#0B1730]/55" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedRecord(null); }}>
          <aside className="h-full w-full max-w-2xl overflow-y-auto bg-[#FAF7F0] font-sans shadow-2xl" dir={isArabic ? 'rtl' : 'ltr'}>
            <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[#DDEFF2] bg-white/95 px-5 py-4 backdrop-blur">
              <div><h2 className="text-lg font-black">{txt('تفاصيل سجل الاستيراد', 'Import Record Details')}</h2><p className="font-mono text-[9px] font-bold text-slate-400">{selectedRecord.id}</p></div>
              <button onClick={() => setSelectedRecord(null)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </header>
            <div className="space-y-4 p-5">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <DetailStat label={txt('الحالة', 'Status')} value={recordStatusLabel(String(selectedRecord.status ?? 'UNKNOWN'), isArabic)} />
                <DetailStat label={txt('المجال', 'Domain')} value={domainLabel(normalizeDomain(selectedRecord.batch?.dataType), isArabic)} />
                <DetailStat label={txt('الصف', 'Row')} value={String(selectedRecord.sourceRowNumber ?? selectedRecord.rawPayload?._sourceRowNumber ?? '—')} />
                <DetailStat label={txt('تاريخ التجهيز', 'Staged At')} value={formatDate(selectedRecord.createdAt, isArabic)} />
              </div>

              <DetailSection title={txt('المصدر والتتبع', 'Provenance & Trace')}>
                <KeyValue label={txt('Batch ID', 'Batch ID')} value={selectedRecord.batchId} mono />
                <KeyValue label={txt('Source System', 'Source System')} value={selectedRecord.batch?.sourceSystem ?? '—'} />
                <KeyValue label={txt('Dedup Key', 'Dedup Key')} value={selectedRecord.sourceDedupKey ?? '—'} mono />
                <KeyValue label={txt('Promoted Entity', 'Transferred Entity')} value={selectedRecord.promotedEntityId ?? '—'} mono />
                <KeyValue label={txt('Chunk / Offset', 'Chunk / Offset')} value={`${selectedRecord.chunkIndex ?? '—'} / ${selectedRecord.recordOffset ?? '—'}`} />
                <KeyValue label={txt('Handoff State', 'Handoff State')} value={String(selectedRecord.rawPayload?._phase6HandoffState ?? '—')} mono />
              </DetailSection>

              {selectedRecord.rawPayload?._phase6HandoffState === 'AWAITING_DOMAIN_INTEGRATION' && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[10px] font-semibold leading-6 text-amber-800">
                  <span className="font-black">{txt('بانتظار تكامل المجال:', 'Awaiting domain integration:')}</span>{' '}
                  {txt('تم حفظ السجل بأمان في منطقة التجهيز، لكن لم يُسلّم إلى نموذج المجال لأن Consumer حقيقي غير مسجل بعد. Envelope محفوظ لإعادة المعالجة لاحقًا.', 'The record is safely staged but has not been handed to the owning domain because no real consumer is registered yet. The envelope is retained for later replay.')}
                </div>
              )}

              <DetailSection title={txt('التحقق والملاحظات', 'Validation & Processing Notes')}>
                {normalizeErrors(selectedRecord.validationErrors).length ? <div className="space-y-1.5">{normalizeErrors(selectedRecord.validationErrors).map((error, index) => <div key={index} className="rounded-lg bg-red-50 px-3 py-2 text-[10px] font-bold text-red-700">{error}</div>)}</div> : <div className="text-[11px] font-bold text-emerald-700">{txt('لا توجد أخطاء تحقق عامة مسجلة.', 'No generic validation errors recorded.')}</div>}
                {selectedRecord.processingNotes && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-[10px] font-semibold leading-6 text-slate-600">{selectedRecord.processingNotes}</p>}
              </DetailSection>

              <DetailSection title={txt('الحمولة الخام المخزنة', 'Stored Raw Payload')}>
                <pre className="max-h-[440px] overflow-auto whitespace-pre-wrap break-all rounded-xl bg-slate-950 p-4 text-left text-[9px] leading-5 text-slate-100" dir="ltr">{JSON.stringify(selectedRecord.rawPayload ?? {}, null, 2)}</pre>
              </DetailSection>

              {(() => {
                const config = DOMAIN_CONFIG.find((item) => item.key === normalizeDomain(selectedRecord.batch?.dataType));
                return config ? <Link to={config.workspace} className="inline-flex items-center gap-2 rounded-xl bg-[#142B5F] px-4 py-2.5 text-xs font-black text-white">{txt('فتح مساحة المجال للمراجعة', 'Open owning domain for review')}{isArabic ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}</Link> : null;
              })()}
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}

function MetricCard({ icon: Icon, label, value, accent }: { icon: typeof Database; label: string; value: string; accent: string }) {
  const tone = metricAccentClasses(accent);
  return <div className="rounded-2xl border border-[#DDEFF2] bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><div className={`grid h-9 w-9 place-items-center rounded-xl ${tone.icon}`}><Icon className="h-4.5 w-4.5" /></div><div className={`text-2xl font-black ${tone.text}`}>{value}</div></div><div className="mt-3 text-[11px] font-black text-slate-600">{label}</div></div>;
}

function metricAccentClasses(accent: string) {
  if (accent === BRAND.primary) return { icon: 'bg-[#142B5F]/10 text-[#142B5F]', text: 'text-[#142B5F]' };
  if (accent === BRAND.secondary) return { icon: 'bg-[#0E7C86]/10 text-[#0E7C86]', text: 'text-[#0E7C86]' };
  if (accent === BRAND.digital) return { icon: 'bg-[#21A7B4]/10 text-[#21A7B4]', text: 'text-[#21A7B4]' };
  if (accent === BRAND.gold) return { icon: 'bg-[#D6A43B]/10 text-[#D6A43B]', text: 'text-[#D6A43B]' };
  if (accent === '#B94A48') return { icon: 'bg-[#B94A48]/10 text-[#B94A48]', text: 'text-[#B94A48]' };
  return { icon: 'bg-[#2E7D5A]/10 text-[#2E7D5A]', text: 'text-[#2E7D5A]' };
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg bg-slate-50 px-1.5 py-2"><div className="text-sm font-black text-[#142B5F]">{value.toLocaleString()}</div><div className="mt-0.5 text-[8px] font-black text-slate-400">{label}</div></div>;
}

function AttentionCard({ icon: Icon, value, title, detail }: { icon: typeof AlertTriangle; value: number; title: string; detail: string }) {
  return <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700"><Icon className="h-5 w-5" /></div><div><div className="text-lg font-black text-amber-800">{value}</div><div className="text-xs font-black text-slate-700">{title}</div><div className="mt-1 text-[10px] font-semibold text-slate-500">{detail}</div></div></div>;
}

function Notice({ tone, children }: { tone: 'success' | 'error' | 'warning'; children: ReactNode }) {
  const style = tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : tone === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-amber-200 bg-amber-50 text-amber-800';
  const Icon = tone === 'success' ? CheckCircle2 : AlertTriangle;
  return <div className={`flex gap-2.5 rounded-2xl border p-4 text-xs font-bold leading-6 ${style}`}><Icon className="mt-0.5 h-4 w-4 shrink-0" /><div>{children}</div></div>;
}

function LoadingBlock({ label }: { label: string }) {
  return <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-400"><div className="text-center"><Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-[#0E7C86]" />{label}</div></div>;
}

function EmptyBlock({ icon: Icon, title, detail }: { icon: typeof Database; title: string; detail: string }) {
  return <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center"><div><Icon className="mx-auto h-7 w-7 text-slate-300" /><div className="mt-2 text-sm font-black text-slate-600">{title}</div><div className="mx-auto mt-1 max-w-lg text-[10px] font-semibold leading-5 text-slate-400">{detail}</div></div></div>;
}

function TagBadge({ children }: { children: ReactNode }) {
  return <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-[9px] font-black text-slate-600">{children}</span>;
}

function StatusBadge({ value, isArabic }: { value: string; isArabic: boolean }) {
  const normalized = value.toUpperCase();
  const good = ['COMPLETED', 'COMPLETE', 'PROMOTED', 'VALID'].includes(normalized);
  const bad = ['FAILED', 'FAILED_PERMANENT', 'DLQ', 'BLOCKED'].includes(normalized);
  const warn = ['INCOMPLETE', 'NEEDS_REVIEW', 'READY_FOR_REVIEW', 'PAUSED', 'FAILED_RETRYABLE', 'PARTIALLY_COMPLETED'].includes(normalized);
  const className = good ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : bad ? 'bg-red-50 text-red-700 border-red-200' : warn ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-cyan-50 text-cyan-800 border-cyan-200';
  return <span className={`inline-flex rounded-full border px-2 py-1 text-[9px] font-black ${className}`}>{recordStatusLabel(normalized, isArabic)}</span>;
}

function ActionButton({ icon: Icon, label, loading, onClick, danger = false }: { icon: typeof PauseCircle; label: string; loading: boolean; onClick: () => void; danger?: boolean }) {
  return <button disabled={loading} onClick={onClick} className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[9px] font-black disabled:opacity-40 ${danger ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>{loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Icon className="h-3 w-3" />}{label}</button>;
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-[#DDEFF2] bg-white p-3"><div className="text-[9px] font-black text-slate-400">{label}</div><div className="mt-1 break-words text-[11px] font-black text-[#203442]">{value}</div></div>;
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-2xl border border-[#DDEFF2] bg-white p-4"><h3 className="mb-3 text-sm font-black text-[#142B5F]">{title}</h3>{children}</section>;
}

function KeyValue({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="grid gap-1 border-b border-slate-100 py-2 last:border-0 sm:grid-cols-[150px_1fr]"><span className="text-[10px] font-black text-slate-400">{label}</span><span className={`break-all text-[10px] font-bold text-slate-600 ${mono ? 'font-mono' : ''}`}>{value}</span></div>;
}

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function domainPillClass(active: boolean) {
  return `rounded-lg px-3 py-2 text-[10px] font-black transition ${active ? 'bg-[#142B5F] text-white shadow-sm' : 'text-slate-500 hover:bg-white/70'}`;
}

function metricValue(value: number | undefined | null, state: LoadState) {
  return state === 'ready' && typeof value === 'number' ? value.toLocaleString() : '—';
}

function normalizeDomain(value?: string | null): string {
  const domain = String(value ?? '').trim().toUpperCase();
  if (domain === 'INTERNATIONAL_TESTS') return 'TESTS';
  return domain || 'UNKNOWN';
}

function domainLabel(domain: DomainKey | string, isArabic: boolean) {
  if (domain === 'ALL') return isArabic ? 'جميع المجالات' : 'All Domains';
  const normalized = domain === 'INTERNATIONAL_TESTS' ? 'TESTS' : domain;
  const config = DOMAIN_CONFIG.find((item) => item.key === normalized);
  return config ? (isArabic ? config.ar : config.en) : String(domain || (isArabic ? 'غير معروف' : 'Unknown'));
}

function sourceStatusLabel(status: SourceStatus, isArabic: boolean) {
  const labels: Record<SourceStatus, [string, string]> = {
    ACTIVE: ['نشط', 'Active'],
    NEEDS_REVIEW: ['يحتاج مراجعة', 'Needs Review'],
    DISABLED: ['معطل', 'Disabled'],
    BLOCKED: ['محظور', 'Blocked'],
  };
  return labels[status]?.[isArabic ? 0 : 1] ?? status;
}

function sourceStatusClass(status: SourceStatus) {
  return status === 'ACTIVE' ? 'text-emerald-700' : status === 'NEEDS_REVIEW' ? 'text-amber-700' : status === 'BLOCKED' ? 'text-red-700' : 'text-slate-500';
}


function sourceCategoryLabel(value: string, isArabic: boolean) {
  const map: Record<string, [string, string]> = {
    OFFICIAL_API: ['واجهة رسمية API', 'Official API'],
    OFFICIAL_FEED: ['تغذية رسمية', 'Official Feed'],
    SITEMAP: ['خريطة موقع', 'Sitemap'],
    JSON_LD: ['JSON-LD', 'JSON-LD'],
    STATIC_HTML: ['صفحة ثابتة', 'Static HTML'],
    DOCUMENT: ['مستند', 'Document'],
    BROWSER_ASSISTED: ['متصفح مساعد', 'Browser-assisted'],
    MANUAL_UPLOAD: ['رفع يدوي', 'Manual Upload'],
  };
  return map[value]?.[isArabic ? 0 : 1] ?? value;
}

function sourceAccessLabel(value: string, isArabic: boolean) {
  const map: Record<string, [string, string]> = {
    PUBLIC_ALLOWED: ['عام ومسموح', 'Public Allowed'],
    PUBLIC_ROBOTS_RESTRICTED: ['مقيد بسياسة robots', 'Robots Restricted'],
    AUTHORIZED_ACCOUNT: ['حساب مصرح', 'Authorized Account'],
    DATA_AGREEMENT: ['اتفاقية بيانات', 'Data Agreement'],
    MANUAL_ONLY: ['يدوي فقط', 'Manual Only'],
    BLOCKED: ['محظور', 'Blocked'],
  };
  return map[value]?.[isArabic ? 0 : 1] ?? value;
}

function recordStatusLabel(value: string, isArabic: boolean) {
  const normalized = value.replace(/_/g, ' ').toUpperCase();
  const map: Record<string, [string, string]> = {
    COMPLETE: ['مجهز / مكتمل بنيويًا', 'Staged / Structurally Complete'],
    VALID: ['صالح بنيويًا', 'Structurally Valid'],
    INCOMPLETE: ['غير مكتمل', 'Incomplete'],
    NEEDS_REVIEW: ['يحتاج مراجعة', 'Needs Review'],
    READY_FOR_REVIEW: ['جاهز لمراجعة المجال', 'Ready for Domain Review'],
    PROMOTED: ['رُحّل إلى المجال', 'Transferred to Domain'],
    FAILED: ['فشل', 'Failed'],
    DLQ: ['Dead Letter', 'Dead Letter'],
    CREATED: ['أُنشئت', 'Created'],
    QUEUED: ['في الطابور', 'Queued'],
    RUNNING: ['قيد المعالجة', 'Running'],
    PAUSED: ['متوقفة مؤقتًا', 'Paused'],
    RESUMING: ['قيد الاستئناف', 'Resuming'],
    CANCELLING: ['قيد الإلغاء', 'Cancelling'],
    CANCELLED: ['ملغاة', 'Cancelled'],
    COMPLETED: ['مكتملة', 'Completed'],
    PARTIALLY_COMPLETED: ['مكتملة جزئيًا', 'Partially Completed'],
    FAILED_RETRYABLE: ['فشل قابل للمحاولة', 'Retryable Failure'],
    FAILED_PERMANENT: ['فشل نهائي', 'Permanent Failure'],
    PROCESSING: ['معالجة متزامنة', 'Synchronous Processing'],
  };
  const key = normalized.replace(/ /g, '_');
  return map[key]?.[isArabic ? 0 : 1] ?? value.replace(/_/g, ' ');
}

function recordTitle(payload: Record<string, unknown>) {
  const candidates = ['displayName', 'scholarshipName', 'canonicalName', 'name', 'title', 'testCode', 'slug'];
  for (const key of candidates) {
    const value = payload[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return 'Untitled staged record';
}

function normalizeErrors(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => typeof item === 'string' ? item : JSON.stringify(item)).filter(Boolean);
  if (typeof value === 'string') return [value];
  if (typeof value === 'object') return Object.entries(value as Record<string, unknown>).map(([key, item]) => `${key}: ${typeof item === 'string' ? item : JSON.stringify(item)}`);
  return [String(value)];
}

function shortHash(value: string) {
  if (value.length <= 24) return value;
  return `${value.slice(0, 10)}…${value.slice(-8)}`;
}

function formatDate(value: string | undefined | null, isArabic: boolean) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(isArabic ? 'ar-YE' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}
