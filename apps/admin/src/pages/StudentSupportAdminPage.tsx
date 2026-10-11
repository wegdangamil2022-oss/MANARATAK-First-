import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { adminApiClient } from '../api/client';
import { useTranslation } from '../i18n/I18nProvider';
import { useAdminAuthorization } from '../security/AdminAuthorizationContext';
import {
  Users,
  RefreshCw,
  Search,
  Eye,
  RotateCcw,
  X,
  BookOpen,
  Award,
  Bookmark,
  Activity,
  Loader2,
  ExternalLink,
} from 'lucide-react';

interface StudentSupportItem {
  studentReferenceId: string;
  status: string;
  version: number;
  displayName?: string | null;
  preferredLanguage?: string | null;
  timezone?: string | null;
  lastActiveAt?: string | null;
  updatedAt: string;
}
interface Enrollment {
  enrollmentId: string;
  courseId: string;
  courseSlug: string;
  courseName: string;
  status: string;
  progressPercentage: number;
  enrolledAt: string;
  completedAt?: string | null;
  lastAccessedAt?: string | null;
}
interface Certificate {
  id: string;
  publicId: string;
  serialNumber: string;
  verificationCode?: string | null;
  status: string;
  courseDisplayName: string;
  issuedAt: string;
  expiresAt?: string | null;
}
interface StudentSupportDetail extends StudentSupportItem {
  provisioningHealth: {
    state: 'HEALTHY' | 'PENDING' | 'FAILED';
    pendingEventCount: number;
    failedEventCount: number;
    lastEventAt?: string | null;
    lastFailureCode?: string | null;
  };
  consentAudit: { hasDecision: boolean; lastDecidedAt?: string | null };
  linkedSummaries: {
    activeCourseCount: number | null;
    certificateCount: number | null;
    unreadNotificationCount: number;
  };
  savedSummary?: Array<{ entityType: string; count: number }>;
  activeApplicationCount?: number;
  serviceRequestCount?: number | null;
  recentServiceRequests?: Array<{
    id: string;
    publicId: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  }>;
  ownerReadStatus?: {
    learning: 'AVAILABLE' | 'DEGRADED' | 'RESTRICTED' | 'TRUNCATED';
    certificates: 'AVAILABLE' | 'DEGRADED' | 'RESTRICTED' | 'TRUNCATED';
    services: 'AVAILABLE' | 'DEGRADED' | 'RESTRICTED';
  };
  ownerReadProvenance?: {
    learning: {source:'P13';queriedAt:string;returned:number;limit:number;complete:boolean}|null;
    certificates: {source:'P14';queriedAt:string;returned:number;limit:number;complete:boolean}|null;
    services: {source:'P20';queriedAt:string;returned:number;limit:number;complete:boolean}|null;
  };
  learning?: Enrollment[];
  certificates?: Certificate[];
}
type OwnerDomain = 'learning' | 'certificates' | 'services';
type OwnerReadState = 'AVAILABLE' | 'DEGRADED' | 'RESTRICTED' | 'TRUNCATED';
interface OwnerTabResponse {
  domain: OwnerDomain;
  status: OwnerReadState;
  provenance: {source:'P13'|'P14'|'P20';queriedAt:string;returned:number;limit:number;complete:boolean}|null;
  learning?: Enrollment[]|null;
  certificates?: Certificate[]|null;
  activeCourseCount?: number|null;
  certificateCount?: number|null;
  serviceRequestCount?: number|null;
  recentServiceRequests?: StudentSupportDetail['recentServiceRequests']|null;
}
interface TrackerHistory {
  items:Array<{eventType:string;occurredAt:string;version:number;status:string}>;
  hasMore:boolean;
  nextCursor:string|null;
}
interface SupportApplicationPage {
  items: Array<{id:string;scholarshipId:string;stage:string;status:string;deadlineAt:string|null;updatedAt:string}>;
  total: number;
  hasMore: boolean;
  nextCursor: string|null;
}
type TriageKind='SYNC_FAILED'|'SYNC_PENDING'|'APPLICATION_OVERDUE';
interface TriagePage {
  items: Array<{studentReferenceId:string;status:string;version:number;updatedAt:string;triageKind:TriageKind}>;
  total:number;
  hasMore:boolean;
  nextCursor:string|null;
}
interface StudentPage {
  items: StudentSupportItem[];
  total?: number;
  nextCursor: string | null;
  hasMore: boolean;
}
type Tab = 'OVERVIEW' | 'LEARNING' | 'CERTIFICATES' | 'SAVED' | 'OPERATIONS';
const PUBLIC_WEB_BASE = (import.meta.env.VITE_PUBLIC_WEB_URL || '').replace(/\/$/, '');
const tabs = [
  { id: 'OVERVIEW', titleKey: 'stu_support_tab_overview', icon: Users },
  { id: 'LEARNING', titleKey: 'stu_support_tab_learning', icon: BookOpen },
  { id: 'CERTIFICATES', titleKey: 'stu_support_tab_certificates', icon: Award },
  { id: 'SAVED', titleKey: 'stu_support_tab_saved', icon: Bookmark },
  { id: 'OPERATIONS', titleKey: 'stu_support_tab_operations', icon: Activity },
] as const;
const labels: Record<string, string> = {
  ACTIVE: 'نشط',
  SUSPENDED: 'معلق',
  ARCHIVED: 'مؤرشف',
  INITIALIZING: 'قيد التهيئة',
  PENDING: 'قيد الانتظار',
  WAITLISTED: 'في قائمة الانتظار',
  COMPLETED: 'مكتمل',
  CANCELLED: 'ملغى',
  REVOKED: 'ملغاة',
  EXPIRED: 'منتهية الصلاحية',
  HEALTHY: 'تعمل بصورة طبيعية',
  FAILED: 'تحتاج معالجة',
  RESTRICTED: 'غير مصرح بعرض بيانات هذا المجال',
  COURSE: 'الدورات',
  UNIVERSITY: 'الجامعات',
  SCHOLARSHIP: 'المنح',
  MAJOR: 'التخصصات',
  CERTIFICATE: 'الشهادات',
  STUDENT_TOOL: 'أدوات الطالب',
  CMS_CONTENT: 'المقالات والمحتوى',
  SERVICE: 'الخدمات',
  REQUESTED: 'طلب جديد',
  ACCEPTED: 'مقبول',
  IN_PROGRESS: 'قيد التنفيذ',
  AWAITING_PAYMENT: 'بانتظار الدفع',
  INTERNATIONAL_TEST: 'الاختبارات الدولية',
};
function date(value?: string | null) {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleString('ar');
}
const labelsEn:Record<string,string>={
  ACTIVE:'Active',SUSPENDED:'Suspended',ARCHIVED:'Archived',INITIALIZING:'Initializing',
  PENDING:'Pending',WAITLISTED:'Waitlisted',COMPLETED:'Completed',CANCELLED:'Cancelled',
  REVOKED:'Revoked',EXPIRED:'Expired',HEALTHY:'Healthy',FAILED:'Needs attention',
  RESTRICTED:'Restricted',COURSE:'Courses',UNIVERSITY:'Universities',SCHOLARSHIP:'Scholarships',
  MAJOR:'Majors',CERTIFICATE:'Certificates',STUDENT_TOOL:'Student tools',
  CMS_CONTENT:'Content',SERVICE:'Services',REQUESTED:'Requested',ACCEPTED:'Accepted',
  IN_PROGRESS:'In progress',AWAITING_PAYMENT:'Awaiting payment',
  INTERNATIONAL_TEST:'International tests',TRUNCATED:'Partial results',
};
function statusLabel(value:string,locale='ar'){
  return (locale==='en'?labelsEn:labels)[value]??value;
}
function Badge({ value }: { value: string }) {
  const {language}=useTranslation();
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${value === 'ACTIVE' || value === 'COMPLETED' || value === 'HEALTHY' ? 'bg-emerald-50 text-emerald-800' : value === 'FAILED' || value === 'REVOKED' ? 'bg-red-50 text-red-800' : 'bg-slate-100 text-slate-700'}`}
    >
      {statusLabel(value,language)}
    </span>
  );
}
function Count({ title, value }: { title: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs text-slate-600">{title}</p>
      <p className="mt-2 text-xl font-black text-[#142B5F]">{value}</p>
    </div>
  );
}

export function StudentSupportAdminPage() {
  const {hasPermission}=useAdminAuthorization();
  const {t,dir,language}=useTranslation();
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('student');
  const [items, setItems] = useState<StudentSupportItem[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [status, setStatus] = useState('');
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [detail, setDetail] = useState<StudentSupportDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [ownerLoading, setOwnerLoading] = useState<OwnerDomain|null>(null);
  const [ownerError, setOwnerError] = useState<string|null>(null);
  const [tab, setTab] = useState<Tab>('OVERVIEW');
  const [resetTarget, setResetTarget] = useState<StudentSupportItem | null>(null);
  const [triageKind,setTriageKind]=useState<TriageKind>('SYNC_FAILED');
  const [triagePage,setTriagePage]=useState<TriagePage|null>(null);
  const [triageLoading,setTriageLoading]=useState(false);
  const [triageError,setTriageError]=useState<string|null>(null);
  const [trackerPurpose, setTrackerPurpose] = useState('CASE_REVIEW');
  const [trackerPage, setTrackerPage] = useState<SupportApplicationPage | null>(null);
  const [trackerError, setTrackerError] = useState<string | null>(null);
  const [trackerLoading, setTrackerLoading] = useState(false);
  const [trackerHistory,setTrackerHistory]=useState<{trackerId:string;page:TrackerHistory}|null>(null);
  const [trackerHistoryLoading,setTrackerHistoryLoading]=useState(false);
  const [trackerHistoryError,setTrackerHistoryError]=useState<string|null>(null);
  const [reason, setReason] = useState('');
  const [resetting, setResetting] = useState(false);
  const listRequest = useRef(0);
  const detailRequest = useRef(0);
  const ownerRequest = useRef(0);
  const loadedOwnerTabs = useRef(new Set<string>());
  const trackerRequest = useRef(0);
  const historyRequest = useRef(0);
  const triageRequest = useRef(0);
  const detailAnchor = useRef<HTMLDivElement>(null);

  const load = useCallback(
    async (nextCursor?: string | null) => {
      const request = ++listRequest.current;
      setLoading(true);
      setError(null);
      if (!nextCursor) {
        setItems([]);
        setCursor(null);
        setHasMore(false);
        setTotal(null);
      }
      try {
        const search = new URLSearchParams({ limit: '50' });
        if (appliedQuery) search.set('query', appliedQuery);
        if (status) search.set('status', status);
        if (nextCursor) search.set('cursor', nextCursor);
        const result = await adminApiClient.request<StudentPage>(
          `/admin/students/support?${search}`,
        );
        if (request !== listRequest.current) return;
        setItems((previous) =>
          nextCursor
            ? [
                ...new Map(
                  [...previous, ...result.items].map((item) => [item.studentReferenceId, item]),
                ).values(),
              ]
            : result.items,
        );
        setTotal(result.total ?? null);
        setCursor(result.nextCursor);
        setHasMore(result.hasMore);
      } catch (cause) {
        if (request === listRequest.current)
          setError(cause instanceof Error ? cause.message : 'تعذر تحميل الطلاب.');
      } finally {
        if (request === listRequest.current) setLoading(false);
      }
    },
    [appliedQuery, status],
  );
  useEffect(() => {
    void load();
    return () => {
      ++listRequest.current;
    };
  }, [load]);
  const inspect = useCallback(async (id: string) => {
    ++ownerRequest.current;
    loadedOwnerTabs.current.clear();
    setOwnerLoading(null);
    setOwnerError(null);
    const request = ++detailRequest.current;
    setDetailLoading(true);
    setDetail(null);
    setDetailError(null);
    try {
      const result = await adminApiClient.request<StudentSupportDetail>(
        `/admin/students/support/${encodeURIComponent(id)}`,
      );
      if (request === detailRequest.current) setDetail(result);
    } catch (cause) {
      if (request === detailRequest.current)
        setDetailError(cause instanceof Error ? cause.message : 'تعذر تحميل تفاصيل الطالب.');
    } finally {
      if (request === detailRequest.current) setDetailLoading(false);
    }
  }, []);
  useEffect(() => {
    ++trackerRequest.current;
    ++historyRequest.current;
    setTrackerHistory(null);
    setTrackerHistoryLoading(false);
    setTrackerHistoryError(null);
    setTrackerPage(null);
    setTrackerError(null);
    setTrackerLoading(false);
    setTab('OVERVIEW');
    if (selectedId) void inspect(selectedId);
    else {
      ++detailRequest.current;
      setDetail(null);
      setDetailError(null);
      setDetailLoading(false);
    }
    return () => {
      ++detailRequest.current;
    };
  }, [selectedId, inspect]);
  const ownerPermission=tab==='LEARNING'?'admin:courses:manage':
    tab==='CERTIFICATES'?'admin:certificates:view':
    tab==='SAVED'?'admin:services:manage':null;
  // A boolean dependency is stable even if the Authorization Context recreates its callback.
  const ownerPermitted=ownerPermission?hasPermission(ownerPermission):false;

  // Each P13/P14/P20 support view is fetched ONLY after its tab is opened.
  // The server independently checks the owner permission and writes required audit.
  useEffect(() => {
    const domain:OwnerDomain|null=tab==='LEARNING'?'learning':
      tab==='CERTIFICATES'?'certificates':tab==='SAVED'?'services':null;
    if (!domain || !selectedId || detail?.studentReferenceId!==selectedId) return;
    if (!ownerPermitted || loadedOwnerTabs.current.has(`${selectedId}:${domain}`)) return;
    const request=++ownerRequest.current;
    setOwnerLoading(domain);
    setOwnerError(null);
    void (async()=>{
      try {
        const result=await adminApiClient.request<OwnerTabResponse>(
          `/admin/students/support/${encodeURIComponent(selectedId)}/owner/${domain}`,
        );
        if(request!==ownerRequest.current) return;
        loadedOwnerTabs.current.add(`${selectedId}:${domain}`);
        setDetail(previous=>{
          if(!previous || previous.studentReferenceId!==selectedId) return previous;
          const provenance=previous.ownerReadProvenance;
          return {
            ...previous,
            ownerReadStatus:{
              learning:domain==='learning'?result.status:previous.ownerReadStatus?.learning??'RESTRICTED',
              certificates:domain==='certificates'?result.status:previous.ownerReadStatus?.certificates??'RESTRICTED',
              services:domain==='services' && result.status!=='TRUNCATED'
                ?result.status:previous.ownerReadStatus?.services??'RESTRICTED',
            },
            ownerReadProvenance:{
              learning:domain==='learning'?result.provenance as NonNullable<StudentSupportDetail['ownerReadProvenance']>['learning']:provenance?.learning??null,
              certificates:domain==='certificates'?result.provenance as NonNullable<StudentSupportDetail['ownerReadProvenance']>['certificates']:provenance?.certificates??null,
              services:domain==='services'?result.provenance as NonNullable<StudentSupportDetail['ownerReadProvenance']>['services']:provenance?.services??null,
            },
            linkedSummaries:{
              ...previous.linkedSummaries,
              ...(domain==='learning'?{activeCourseCount:result.activeCourseCount??null}:{}),
              ...(domain==='certificates'?{certificateCount:result.certificateCount??null}:{}),
            },
            learning:domain==='learning'?result.learning??undefined:previous.learning,
            certificates:domain==='certificates'?result.certificates??undefined:previous.certificates,
            serviceRequestCount:domain==='services'?result.serviceRequestCount??null:previous.serviceRequestCount,
            recentServiceRequests:domain==='services'?result.recentServiceRequests??undefined:previous.recentServiceRequests,
          };
        });
      }catch(error) {
        if(request===ownerRequest.current)
          setOwnerError(error instanceof Error?error.message:'تعذرت قراءة المجال المحدد.');
      }finally{
        if(request===ownerRequest.current)setOwnerLoading(null);
      }
    })();
    return ()=>{++ownerRequest.current;};
  },[tab,selectedId,detail?.studentReferenceId,ownerPermitted]);

  useEffect(() => {
    if (detail) detailAnchor.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [detail?.studentReferenceId]);
  async function loadTriage(nextCursor?:string){
    if(triageLoading)return;
    const request=++triageRequest.current;
    setTriageLoading(true);
    setTriageError(null);
    try{
      const query=new URLSearchParams({kind:triageKind,limit:'20'});
      if(nextCursor)query.set('cursor',nextCursor);
      const page=await adminApiClient.request<TriagePage>(`/admin/students/support/triage?${query}`);
      if(request!==triageRequest.current)return;
      setTriagePage(previous=>nextCursor&&previous?{
        ...page,items:[...previous.items,...page.items],
      }:page);
    }catch(error){
      if(request===triageRequest.current)
        setTriageError(error instanceof Error?error.message:'تعذر تحميل قائمة التشخيص.');
    }finally{
      if(request===triageRequest.current)setTriageLoading(false);
    }
  }
  async function openTrackerHistory(trackerId:string,nextCursor?:string) {
    if(!selectedId||trackerHistoryLoading)return;
    const request=++historyRequest.current;
    setTrackerHistoryLoading(true);
    setTrackerHistoryError(null);
    try {
      const query=new URLSearchParams({purpose:trackerPurpose,limit:'20'});
      if(nextCursor)query.set('cursor',nextCursor);
      const page=await adminApiClient.request<TrackerHistory>(
        `/admin/students/support/${encodeURIComponent(selectedId)}/application-trackers/${encodeURIComponent(trackerId)}/history?${query}`,
      );
      if(request===historyRequest.current)setTrackerHistory(previous=>nextCursor&&previous?.trackerId===trackerId?{trackerId,page:{...page,items:[...previous.page.items,...page.items]}}:{trackerId,page});
    }catch(error){
      if(request===historyRequest.current)setTrackerHistoryError(
        error instanceof Error?error.message:'تعذر تحميل سجل المتابعة.',
      );
    }finally{if(request===historyRequest.current)setTrackerHistoryLoading(false);}
  }

  async function openSupportTrackerPage(nextCursor?:string) {
    if (!selectedId || trackerLoading) return;
    const request = ++trackerRequest.current;
    setTrackerLoading(true);
    setTrackerError(null);
    try {
      const query = new URLSearchParams({purpose:trackerPurpose,limit:'20'});
      if (nextCursor) query.set('cursor',nextCursor);
      const result = await adminApiClient.request<SupportApplicationPage>(
        `/admin/students/support/${encodeURIComponent(selectedId)}/application-trackers?${query}`,
      );
      if (request === trackerRequest.current) setTrackerPage((prev) => nextCursor && prev
        ? {...result, items:[...prev.items,...result.items]}
        : result);
    } catch (cause) {
      if (request === trackerRequest.current)
        setTrackerError(cause instanceof Error ? cause.message : 'تعذر استعراض متابعات الطالب.');
    } finally {if (request === trackerRequest.current) setTrackerLoading(false);}
  }
  function chooseStudent(id: string | null) {
    ++historyRequest.current;
    setTrackerHistory(null);
    setTrackerHistoryError(null);
    setTrackerHistoryLoading(false);
    ++trackerRequest.current;
    setTrackerPage(null);
    setTrackerError(null);
    const next = new URLSearchParams(params);
    if (id) next.set('student', id);
    else next.delete('student');
    setParams(next);
  }
  function search(event: FormEvent) {
    event.preventDefault();
    const next = query.trim();
    if (next === appliedQuery) void load();
    else {
      chooseStudent(null);
      setAppliedQuery(next);
    }
  }
  async function resetLayout(event: FormEvent) {
    event.preventDefault();
    if (!resetTarget || reason.trim().length < 6 || resetting) return;
    setResetting(true);
    setError(null);
    setNotice(null);
    try {
      await adminApiClient.request(
        `/admin/students/support/${encodeURIComponent(resetTarget.studentReferenceId)}/reset-layout`,
        {
          method: 'POST',
          body: JSON.stringify({ expectedVersion: resetTarget.version, reason: reason.trim() }),
        },
      );
      setResetTarget(null);
      setReason('');
      setNotice('تمت إعادة ترتيب واجهة حساب الطالب إلى الترتيب الافتراضي.');
      await load();
      if (selectedId === resetTarget.studentReferenceId) await inspect(selectedId);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'تعذرت إعادة ضبط الواجهة.';
      if (message.includes('STUDENT_WORKSPACE_VERSION_CONFLICT') || message.includes('تغيرت بيانات الطالب')) {
        try {
          const current = await adminApiClient.request<StudentSupportDetail>(
            `/admin/students/support/${encodeURIComponent(resetTarget.studentReferenceId)}`,
          );
          setDetail(current);
          setResetTarget(current);
          setError('تغيرت نسخة مساحة الطالب. راجع البيانات المحدثة وأكّد إعادة الضبط مرة أخرى.');
        } catch {
          setResetTarget(null);
          setError('حدث تعارض وتعذر تحديث حالة الطالب. أعد تحميل الملف قبل المحاولة.');
        }
      } else {
        setError(message);
      }
    } finally {
      setResetting(false);
    }
  }
  const learningComplete = detail?.ownerReadStatus?.learning === 'AVAILABLE';
  const certificatesComplete = detail?.ownerReadStatus?.certificates === 'AVAILABLE';
  const learningAvailable = learningComplete || detail?.ownerReadStatus?.learning === 'TRUNCATED';
  const certificatesAvailable = certificatesComplete || detail?.ownerReadStatus?.certificates === 'TRUNCATED';
  const savedCount = detail?.savedSummary?.reduce((sum, item) => sum + item.count, 0);

  return (
    <div dir={dir} className="mx-auto max-w-7xl space-y-6">
      <header className="rounded-3xl bg-gradient-to-l from-[#0E7C86] to-[#142B5F] p-6 text-white sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs text-cyan-100">{t('stu_support_intro_label')}</p>
            <h1 className="mt-2 text-3xl font-black">{t('stu_support_heading')}</h1>
            <p className="mt-3 text-sm text-white/85">
              {t('stu_support_intro')}
            </p>
          </div>
          <button
            disabled={loading}
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-3 font-bold disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {t('stu_support_refresh_list')}
          </button>
        </div>
      </header>
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
          {notice}
        </p>
      )}
      <form
        onSubmit={search}
        className="grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-[2fr_1fr_auto_auto]"
      >
        <label className="text-xs font-bold text-slate-600">
          {t('stu_support_name_or_id')}
          <input
            maxLength={120}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('stu_support_search_placeholder')}
            className="mt-2 w-full rounded-xl border p-3 text-sm"
          />
        </label>
        <label className="text-xs font-bold text-slate-600">
          {t('stu_support_account_status')}
          <select
            value={status}
            onChange={(e) => {
              if (e.target.value !== status) chooseStudent(null);
              setStatus(e.target.value);
            }}
            className="mt-2 w-full rounded-xl border p-3 text-sm"
          >
            <option value="">{t('stu_support_all_statuses')}</option>
            {['ACTIVE', 'INITIALIZING', 'SUSPENDED', 'ARCHIVED'].map((value) => (
              <option key={value} value={value}>
                {statusLabel(value,language)}
              </option>
            ))}
          </select>
        </label>
        <button
          disabled={loading}
          className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#142B5F] p-3 text-sm font-bold text-white disabled:opacity-50"
        >
          <Search className="h-4 w-4" />
          {t('stu_support_search')}
        </button>
        <button
          type="button"
          onClick={() => {
            setQuery('');
            if (appliedQuery || status) {
              chooseStudent(null);
              setAppliedQuery('');
              setStatus('');
            } else void load();
          }}
          className="mt-auto rounded-xl border p-3 text-sm"
        >
          {t('stu_support_reset_filters')}
        </button>
      </form>
      <section className="space-y-3 rounded-2xl border bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-black text-[#142B5F]">{t('stu_support_triage_heading')}</h2>
          <span className="text-xs text-slate-500">{t('stu_support_triage_scope')}</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="flex-1 text-xs font-semibold text-slate-600">
            {t('stu_support_triage_reason')}
            <select value={triageKind} onChange={event=>{
              ++triageRequest.current;
              setTriageKind(event.target.value as TriageKind);
              setTriagePage(null);setTriageLoading(false);setTriageError(null);
            }} className="mt-2 block w-full rounded-lg border p-2 text-sm">
              <option value="SYNC_FAILED">{t('stu_support_triage_failed')}</option>
              <option value="SYNC_PENDING">{t('stu_support_triage_pending')}</option>
              <option value="APPLICATION_OVERDUE">{t('stu_support_triage_overdue')}</option>
            </select>
          </label>
          <button type="button" disabled={triageLoading} onClick={()=>void loadTriage()}
            className="mt-auto rounded-xl border px-4 py-2 text-sm font-bold disabled:opacity-50">
            {triageLoading?t('stu_support_triage_loading'):t('stu_support_triage_show')}
          </button>
        </div>
        {triageError&&<p role="alert" className="text-sm text-red-700">{triageError}</p>}
        {triagePage&&<div className="space-y-2">
          <p className="text-xs text-slate-500">{t('stu_support_triage_matches')} {triagePage.total}</p>
          {triagePage.items.length===0&&<p className="text-sm text-slate-500">{t('stu_support_triage_no_matches')}</p>}
          {triagePage.items.map(item=><div key={item.studentReferenceId}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 p-3">
            <div>
              <code dir="ltr" className="text-sm">{item.studentReferenceId}</code>
              <p className="mt-1 text-xs text-slate-600">
                {statusLabel(item.status,language)} · آخر تحديث: {date(item.updatedAt)}
              </p>
            </div>
            <button type="button" className="rounded-lg border px-3 py-2 text-xs font-bold"
              onClick={()=>chooseStudent(item.studentReferenceId)}>{t('stu_support_triage_open')}</button>
          </div>)}
          {triagePage.hasMore&&triagePage.nextCursor&&<button type="button" disabled={triageLoading}
            className="rounded-lg border px-4 py-2 text-sm font-bold disabled:opacity-50"
            onClick={()=>void loadTriage(triagePage.nextCursor!)}>{t('stu_support_triage_more')}</button>}
        </div>}
      </section>
      <section className="overflow-hidden rounded-2xl border bg-white">
        <div className="flex justify-between gap-3 border-b bg-slate-50 p-4">
          <h2 className="font-black text-[#142B5F]">{t('stu_support_accounts')}</h2>
          <span className="text-xs text-slate-600">
            {loading && items.length === 0
              ? 'جارٍ التحميل…'
              : total === null
                ? `${items.length} حساب معروض`
                : `عرض ${items.length} من ${total} نتيجة`}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-start text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600">
              <tr>
                {[t('stu_support_col_student'),t('stu_support_account_status'),t('stu_support_col_language_timezone'),t('stu_support_col_last_activity'),t('stu_support_col_actions')].map(
                  (title) => (
                    <th key={title} className="p-4 text-start">
                      {title}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    {loading
                      ? 'جارٍ تحميل الطلاب…'
                      : error
                        ? 'تعذر تحميل القائمة. حدّث البيانات للمحاولة مجدداً.'
                        : 'لا توجد حسابات مطابقة للفلاتر الحالية.'}
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={item.studentReferenceId}
                    className={
                      selectedId === item.studentReferenceId ? 'bg-cyan-50' : 'hover:bg-slate-50'
                    }
                  >
                    <td className="p-4">
                      <button
                        onClick={() => chooseStudent(item.studentReferenceId)}
                        className="font-bold text-[#142B5F]"
                      >
                        {item.displayName?.trim() || t('stu_support_no_name')}
                      </button>
                      <code dir="ltr" className="mt-1 block text-[10px] text-slate-500">
                        {item.studentReferenceId}
                      </code>
                    </td>
                    <td className="p-4">
                      <Badge value={item.status} />
                    </td>
                    <td className="p-4 text-xs">
                      {item.preferredLanguage || t('stu_support_unspecified')}
                      <p className="mt-1 text-slate-500">{item.timezone || t('stu_support_unspecified')}</p>
                    </td>
                    <td className="p-4 text-xs">{date(item.lastActiveAt)}</td>
                    <td className="p-4">
                      <button
                        onClick={() => chooseStudent(item.studentReferenceId)}
                        className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 font-bold text-[#0E7C86]"
                      >
                        <Eye className="h-4 w-4" />
                        عرض الطالب
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {hasMore && (
          <div className="border-t p-4 text-center">
            <button
              disabled={loading || !cursor}
              onClick={() => void load(cursor)}
              className="rounded-xl border px-5 py-3 text-sm font-bold text-[#142B5F] disabled:opacity-50"
            >
              {loading ? 'جارٍ التحميل…' : t('stu_support_more_students')}
            </button>
          </div>
        )}
      </section>
      {selectedId && (
        <div
          ref={detailAnchor}
          className="scroll-mt-5 rounded-3xl border border-cyan-200 bg-white p-5 sm:p-6"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-black text-[#142B5F]">
              {detail?.displayName?.trim() || t('stu_support_student_details')}
            </h2>
            <div className="flex gap-2">
              <button
                disabled={detailLoading}
                title={t('stu_support_refresh_details')}
                aria-label={t('stu_support_refresh_details')}
                onClick={() => void inspect(selectedId)}
                className="rounded-xl border p-2"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              <button
                aria-label={t('stu_support_close_details')}
                onClick={() => chooseStudent(null)}
                className="rounded-xl border p-2"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          {detailLoading ? (
            <div className="flex items-center gap-2 py-8 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              جارٍ تحميل بيانات الطالب…
            </div>
          ) : detailError ? (
            <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-red-800">
              {detailError}
            </p>
          ) : (
            detail && (
              <>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <Badge value={detail.status} />
                  <code dir="ltr">{detail.studentReferenceId}</code>
                  <span>آخر تحديث: {date(detail.updatedAt)}</span>
                </div>
                <nav
                  aria-label={t('stu_support_tabs_aria')}
                  className="mt-5 flex gap-2 overflow-x-auto border-b pb-3"
                >
                  {tabs.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={tab === item.id}
                      onClick={() => setTab(item.id)}
                      className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold ${tab === item.id ? 'bg-[#142B5F] text-white' : 'bg-slate-50 text-slate-600'}`}
                    >
                      <item.icon className="h-4 w-4" />
                      {t(item.titleKey)}
                    </button>
                  ))}
                </nav>
                {ownerLoading && (
                  <p role="status" className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                    تحميل بيانات {ownerLoading==='learning'?'الدورات':ownerLoading==='certificates'?'الشهادات':'الخدمات'} من المجال المالك…
                  </p>
                )}
                {ownerError && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{ownerError}</p>}
                {Object.values(detail.ownerReadStatus ?? {}).includes('RESTRICTED') && (
                  <p role="status" className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                    {t('stu_support_owner_restricted')}
                  </p>
                )}
                {Object.values(detail.ownerReadStatus ?? {}).includes('DEGRADED') && (
                  <p
                    role="status"
                    className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800"
                  >
                    تعذرت قراءة بعض البيانات المرتبطة. تظهر المصادر غير المتاحة بعلامة —؛ حدّث
                    التفاصيل للمحاولة مجدداً.
                  </p>
                )}
                {Object.values(detail.ownerReadStatus ?? {}).includes('TRUNCATED') && (
                  <p role="status" className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                    بعض بيانات المجالات المالكة معروضة بشكل جزئي (حتى 12 سجلًا لكل مجال). الأعداد الإجمالية غير معروفة، فلا تعتمد عليها بوصفها صفرًا أو إجماليًا.
                  </p>
                )}
                {detail.ownerReadProvenance && (
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                    {Object.entries(detail.ownerReadProvenance).map(([name,source])=>source && (
                      <span key={name}>{source.source} · وقت الاستعلام: {date(source.queriedAt)} · عرض {source.returned} من حد {source.limit}{!source.complete?' · جزئي':''}</span>
                    ))}
                  </div>
                )}
                {tab === 'OVERVIEW' && (
                  <div className="mt-5 space-y-5">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <Count
                        title={t('stu_support_active_courses')}
                        value={learningComplete ? detail.linkedSummaries.activeCourseCount : '—'}
                      />
                      <Count
                        title={t('stu_support_completed_courses')}
                        value={
                          learningComplete
                            ? (detail.learning ?? []).filter((item) => item.status === 'COMPLETED')
                                .length
                            : '—'
                        }
                      />
                      <Count
                        title={t('stu_support_recorded_certificates')}
                        value={
                          certificatesComplete ? detail.linkedSummaries.certificateCount : '—'
                        }
                      />
                      <Count title={t('stu_support_saved_items')} value={savedCount ?? '—'} />
                    </div>
                    <dl className="grid gap-4 rounded-2xl bg-slate-50 p-5 text-sm sm:grid-cols-3">
                      <div>
                        <dt className="text-slate-500">{t('stu_support_account_language')}</dt>
                        <dd className="mt-1 font-bold">
                          {detail.preferredLanguage || t('stu_support_unspecified')}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">{t('stu_support_time_zone')}</dt>
                        <dd className="mt-1 font-bold">{detail.timezone || t('stu_support_unspecified')}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">{t('stu_support_last_recorded_activity')}</dt>
                        <dd className="mt-1 font-bold">{date(detail.lastActiveAt)}</dd>
                      </div>
                    </dl>
                    <p className="text-xs text-slate-500">
                      تعرض هذه الصفحة بيانات المتابعة اللازمة للدعم. تعديل بيانات الحساب والموافقات
                      الشخصية يتم من المسارات المخصصة لصاحب الحساب.
                    </p>
                  </div>
                )}
                {tab === 'LEARNING' && (
                  <div className="mt-5 space-y-3">
                    {!learningAvailable ? (
                      <p className="rounded-xl bg-amber-50 p-4">{t('stu_support_learning_unavailable')}</p>
                    ) : !detail.learning?.length ? (
                      <p className="p-5 text-slate-500">{t('stu_support_no_enrollments')}</p>
                    ) : (
                      detail.learning.map((item) => {
                        const progress = Number.isFinite(item.progressPercentage)
                          ? Math.min(100, Math.max(0, item.progressPercentage))
                          : 0;
                        return (
                          <article key={item.enrollmentId} className="rounded-2xl border p-4">
                            <div className="flex flex-wrap justify-between gap-3">
                              <h3 className="font-bold text-[#142B5F]">{item.courseName}</h3>
                              <Badge value={item.status} />
                            </div>
                            <div className="mt-3 flex justify-between text-xs">
                              <span>{t('stu_support_progress')}</span>
                              <span>{progress}%</span>
                            </div>
                            <progress
                              aria-label={`التقدم في ${item.courseName}`}
                              max={100}
                              value={progress}
                              className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100 [&::-webkit-progress-bar]:bg-slate-100 [&::-webkit-progress-value]:bg-[#0E7C86] [&::-moz-progress-bar]:bg-[#0E7C86]"
                            />
                            <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                              <span>التسجيل: {date(item.enrolledAt)}</span>
                              <span>آخر وصول: {date(item.lastAccessedAt)}</span>
                              {item.completedAt && <span>الإتمام: {date(item.completedAt)}</span>}
                            </div>
                            {hasPermission('admin:courses:manage') && (
                              <Link
                                to={`/courses/${encodeURIComponent(item.courseId)}`}
                                className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#0E7C86]"
                              >
                                {t('stu_support_open_course')}
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                            )}
                          </article>
                        );
                      })
                    )}
                  </div>
                )}
                {tab === 'CERTIFICATES' && (
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {!certificatesAvailable ? (
                      <p className="rounded-xl bg-amber-50 p-4">{t('stu_support_certificate_unavailable')}</p>
                    ) : !detail.certificates?.length ? (
                      <p className="p-5 text-slate-500">{t('stu_support_no_certificates')}</p>
                    ) : (
                      detail.certificates.map((item) => (
                        <article key={item.id} className="rounded-2xl border p-4">
                          <h3 className="font-bold text-[#142B5F]">{item.courseDisplayName}</h3>
                          <div className="mt-3">
                            <Badge
                              value={
                                item.status === 'ACTIVE' &&
                                item.expiresAt &&
                                new Date(item.expiresAt).getTime() <= Date.now()
                                  ? 'EXPIRED'
                                  : item.status
                              }
                            />
                          </div>
                          <p className="mt-3 text-xs">
                            الرقم التسلسلي: <span dir="ltr">{item.serialNumber}</span>
                          </p>
                          <p className="mt-2 text-xs text-slate-500">
                            الإصدار: {date(item.issuedAt)}
                          </p>
                          {item.expiresAt && (
                            <p className="mt-2 text-xs text-slate-500">
                              انتهاء الصلاحية: {date(item.expiresAt)}
                            </p>
                          )}
                          {hasPermission('admin:certificates:view') && (
                            <Link
                              to={`/certificates/${encodeURIComponent(item.id)}`}
                              className="mt-3 block text-xs font-bold text-[#0E7C86]"
                            >
                              {t('stu_support_open_certificate')}
                            </Link>
                          )}
                          {item.verificationCode && (
                            <a
                              href={`${PUBLIC_WEB_BASE}/certificates/verify?code=${encodeURIComponent(item.verificationCode)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#0E7C86]"
                            >
                              {t('stu_support_public_verify')}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </article>
                      ))
                    )}
                  </div>
                )}
                {tab === 'SAVED' && (
                  <div className="mt-5 space-y-5">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Count title={t('stu_support_saved_items')} value={savedCount ?? '—'} />
                      <Count
                        title={t('stu_support_active_applications')}
                        value={detail.activeApplicationCount ?? '—'}
                      />
                      <Count
                        title={t('stu_support_service_request_count')}
                        value={detail.serviceRequestCount ?? '—'}
                      />
                    </div>
                    <div className="space-y-3 rounded-xl border p-4">
                      <h3 className="font-bold text-[#142B5F]">{t('stu_support_tracker_heading')}</h3>
                      <p className="text-xs text-slate-600">{t('stu_support_tracker_notice')}</p>
                      <label className="block text-sm font-semibold">
                        {t('stu_support_reason')}
                        <select value={trackerPurpose} onChange={(e)=>{
                          ++trackerRequest.current;++historyRequest.current;
                          setTrackerHistory(null);setTrackerHistoryError(null);setTrackerHistoryLoading(false);
                          setTrackerPurpose(e.target.value);setTrackerPage(null);setTrackerLoading(false);
                        }} className="mt-2 block w-full rounded-lg border p-2">
                          <option value="CASE_REVIEW">{t('stu_support_case_review')}</option>
                          <option value="APPLICATION_STATUS_INQUIRY">{t('stu_support_app_inquiry')}</option>
                          <option value="SYNC_DIAGNOSTIC">{t('stu_support_sync_diagnostic')}</option>
                        </select>
                      </label>
                      <button type="button" disabled={trackerLoading} onClick={()=>void openSupportTrackerPage()}
                        className="rounded-lg border px-4 py-2 text-sm font-bold disabled:opacity-50">{t('stu_support_tracker_open')}</button>
                      {trackerError && <p role="alert" className="text-sm text-red-700">{trackerError}</p>}
                      {trackerHistoryError&&<p role="alert" className="text-sm text-red-700">{trackerHistoryError}</p>}
                      {trackerPage && <div className="space-y-2">
                        <p className="text-xs text-slate-500">عرض {trackerPage.items.length} من {trackerPage.total} متابعة</p>
                        {trackerPage.items.length === 0 && <p className="text-sm text-slate-500">{t('stu_support_no_trackers')}</p>}
                        {trackerPage.items.map((item)=><article key={item.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                          <span className="font-bold">{item.scholarshipId}</span> · {statusLabel(item.status,language)}
                          <p className="mt-1">المرحلة: {item.stage}</p>
                          <p className="text-xs text-slate-500">الموعد: {date(item.deadlineAt)} · التحديث: {date(item.updatedAt)}</p>
                          <button type="button" disabled={trackerHistoryLoading}
                            className="mt-2 rounded-lg border px-3 py-1 text-xs font-bold disabled:opacity-50"
                            onClick={()=>void openTrackerHistory(item.id)}>{t('stu_support_tracker_history')}</button>
                          {trackerHistory?.trackerId===item.id&&<div className="mt-3 space-y-1 border-t pt-2">
                            {trackerHistory.page.items.length===0&&<p className="text-xs text-slate-500">{t('stu_support_tracker_history_empty')}</p>}
                            {trackerHistory.page.items.map((event,index)=><p key={index} className="text-xs text-slate-600">
                              {event.eventType} · {statusLabel(event.status,language)} · النسخة {event.version} · {date(event.occurredAt)}
                            </p>)}
                            {trackerHistory.page.hasMore&&trackerHistory.page.nextCursor&&<button type="button" disabled={trackerHistoryLoading} className="mt-2 rounded-lg border px-3 py-1 text-xs font-bold disabled:opacity-50" onClick={()=>void openTrackerHistory(item.id,trackerHistory.page.nextCursor!)}>المزيد من الأحداث</button>}
                          </div>}
                        </article>)}
                        {trackerPage.hasMore && trackerPage.nextCursor && <button type="button"
                          disabled={trackerLoading} onClick={()=>void openSupportTrackerPage(trackerPage.nextCursor!)}
                          className="rounded-lg border px-4 py-2 text-sm font-bold disabled:opacity-50">{t('stu_support_more_trackers')}</button>}
                      </div>}
                    </div>
                    <h3 className="font-bold text-[#142B5F]">{t('stu_support_saved_distribution')}</h3>
                    {detail.savedSummary?.length ? (
                      <div className="grid gap-3 sm:grid-cols-3">
                        {detail.savedSummary.map((item) => (
                          <Count
                            key={item.entityType}
                            title={statusLabel(item.entityType,language)}
                            value={item.count}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">
                        {detail.savedSummary ? 'لا توجد عناصر محفوظة.' : 'ملخص المحفوظات غير متاح.'}
                      </p>
                    )}
                    <div className="space-y-3">
                      <h3 className="font-bold text-[#142B5F]">{t('stu_support_recent_services')}</h3>
                      {detail.ownerReadStatus?.services !== 'AVAILABLE' ? (
                        <p className="text-sm text-amber-800">{t('stu_support_service_unavailable')}</p>
                      ) : detail.recentServiceRequests?.length ? (
                        <>
                          <p className="text-xs text-slate-500">
                            آخر {detail.recentServiceRequests.length} طلب من{' '}
                            {detail.serviceRequestCount} طلب مسجل.
                          </p>
                          {detail.recentServiceRequests.map((request) => (
                            <article key={request.id} className="rounded-xl border p-4">
                              <div className="flex flex-wrap justify-between gap-3">
                                <code dir="ltr" className="text-xs text-[#142B5F]">
                                  {request.publicId}
                                </code>
                                <Badge value={request.status} />
                              </div>
                              <p className="mt-2 text-xs text-slate-500">
                                الإنشاء: {date(request.createdAt)} · آخر تحديث:{' '}
                                {date(request.updatedAt)}
                              </p>
                              {hasPermission('admin:services:manage') && (
                                <Link
                                  to={`/services?request=${encodeURIComponent(request.publicId)}`}
                                  className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#0E7C86]"
                                >
                                  {t('stu_support_open_service')}
                                  <ExternalLink className="h-3 w-3" />
                                </Link>
                              )}
                            </article>
                          ))}
                        </>
                      ) : (
                        <p className="text-sm text-slate-500">{t('stu_support_no_services')}</p>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      يظهر ملخص الأعداد دون عرض ملاحظات الطالب الشخصية أو تفاصيل طلباته الخاصة.
                    </p>
                  </div>
                )}
                {tab === 'OPERATIONS' && (
                  <div className="mt-5 space-y-5">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Count
                        title={t('stu_support_pending_sync')}
                        value={detail.provisioningHealth.pendingEventCount}
                      />
                      <Count
                        title={t('stu_support_failed_sync')}
                        value={detail.provisioningHealth.failedEventCount}
                      />
                      <Count
                        title={t('stu_support_unread_notifications')}
                        value={detail.linkedSummaries.unreadNotificationCount}
                      />
                    </div>
                    <div className="rounded-2xl border p-4">
                      <h3 className="mb-3 font-bold text-[#142B5F]">{t('stu_support_provision_state')}</h3>
                      <Badge value={detail.provisioningHealth.state} />
                      <p className="mt-3 text-xs text-slate-500">
                        آخر حدث: {date(detail.provisioningHealth.lastEventAt)}
                      </p>
                      {detail.provisioningHealth.lastFailureCode && (
                        <code className="mt-3 block break-all text-xs text-red-700" dir="ltr">
                          {detail.provisioningHealth.lastFailureCode}
                        </code>
                      )}
                    </div>
                    <div className="rounded-2xl border p-4">
                      <h3 className="font-bold text-[#142B5F]">{t('stu_support_consent_log')}</h3>
                      <p className="mt-2 text-sm">
                        {detail.consentAudit.hasDecision ? 'يوجد قرار مسجل' : 'لا يوجد قرار مسجل'}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        تاريخ القرار: {date(detail.consentAudit.lastDecidedAt)}
                      </p>
                    </div>
                    {hasPermission('admin:students:support:mutate') && (
                      <button
                        disabled={detail.status !== 'ACTIVE'}
                        title={
                          detail.status === 'ACTIVE'
                            ? 'إعادة الترتيب الافتراضي'
                            : 'يتطلب الإجراء حساباً نشطاً'
                        }
                        onClick={() => {
                          setResetTarget(detail);
                          setReason('');
                        }}
                        className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-bold text-amber-800"
                      >
                        <RotateCcw className="h-4 w-4" />
                        إعادة ترتيب واجهة الطالب
                      </button>
                    )}
                  </div>
                )}
              </>
            )
          )}
        </div>
      )}
      {resetTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="student-reset-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <form
            onSubmit={resetLayout}
            className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6"
          >
            <h2 id="student-reset-title" className="text-xl font-black text-[#142B5F]">
              إعادة ترتيب واجهة الطالب
            </h2>
            <p className="text-sm text-slate-600">
              يعيد ترتيب أقسام حساب {resetTarget.displayName || 'الطالب'} إلى التخطيط الافتراضي.
              يسجل سبب الإجراء في سجل التدقيق.
            </p>
            <label className="block text-sm font-bold">
              سبب الإجراء
              <textarea
                required
                minLength={6}
                maxLength={1000}
                disabled={resetting}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="mt-2 w-full rounded-xl border p-3"
              />
            </label>
            {error && (
              <p role="alert" className="text-sm text-red-800">
                {error}
              </p>
            )}
            <div className="flex gap-3">
              <button
                disabled={resetting || reason.trim().length < 6}
                className="rounded-xl bg-[#142B5F] px-4 py-3 font-bold text-white disabled:opacity-50"
              >
                {resetting ? 'جارٍ الحفظ…' : t('stu_support_confirm_reset')}
              </button>
              <button
                type="button"
                disabled={resetting}
                onClick={() => setResetTarget(null)}
                className="rounded-xl border px-4 py-3"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
