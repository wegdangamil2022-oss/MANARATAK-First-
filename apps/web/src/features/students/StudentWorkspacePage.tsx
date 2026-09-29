import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Award, Bell, BookOpen, Bookmark, CheckCircle2, ClipboardList, Compass, Folder, Heart, Home, LockKeyhole, RefreshCw, Route, Settings2, Star, X, User, ListChecks, GraduationCap, CalendarClock, Sparkles, Clock3, Languages, Moon, Sun, LogIn, ShieldCheck, ChevronLeft, History as HistoryIcon, Archive, Trash2, ExternalLink, ChevronDown, ChevronUp, FileText, Check, AlertTriangle, CreditCard, Receipt, Info, LogOut, Shield, RotateCcw, Save, Eye } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  ApiClient,
  HydratedStudentSavedItemDto,
  MoneyAmountDto,
  StudentDashboardSummaryDto,
  StudentFinanceInvoiceDto,
  StudentFinancePaymentDto,
  StudentWorkspaceSnapshotDto,
  StudentApplicationTrackerDto,
  StudentServiceRequestDto,
} from '../../api/client';

export type CanonicalWorkspaceTab = 'SUMMARY' | 'OPPORTUNITIES' | 'LEARNING' | 'VAULT' | 'SERVICES' | 'PROFILE';
export type LegacyWorkspaceTab = 'HOME' | 'JOURNEY' | 'SETTINGS';
export type WorkspaceTab = CanonicalWorkspaceTab | LegacyWorkspaceTab;

function normalizeTab(t?: WorkspaceTab | null): CanonicalWorkspaceTab {
  if (!t) return 'SUMMARY';
  if (t === 'HOME') return 'SUMMARY';
  if (t === 'JOURNEY') return 'OPPORTUNITIES';
  if (t === 'SETTINGS') return 'PROFILE';
  return t;
}

const tabs: Array<{ id: Exclude<CanonicalWorkspaceTab, 'PROFILE'>; label: string; icon: LucideIcon }> = [
  { id: 'SUMMARY', label: 'ملخصي', icon: Home },
  { id: 'OPPORTUNITIES', label: 'فرصي', icon: Route },
  { id: 'LEARNING', label: 'تعلمي', icon: BookOpen },
  { id: 'VAULT', label: 'محفوظاتي', icon: Heart },
  { id: 'SERVICES', label: 'طلباتي', icon: ClipboardList },
];

function resolveTabFromQuery(queryTab: string | null): CanonicalWorkspaceTab | null {
  if (!queryTab) return null;
  const normalized = queryTab.toLowerCase();
  if (normalized === 'summary' || normalized === 'home') return 'SUMMARY';
  if (normalized === 'opportunities' || normalized === 'journey') return 'OPPORTUNITIES';
  if (normalized === 'learning' || normalized === 'courses') return 'LEARNING';
  if (normalized === 'vault' || normalized === 'saved') return 'VAULT';
  if (normalized === 'services' || normalized === 'requests') return 'SERVICES';
  if (normalized === 'profile' || normalized === 'settings') return 'PROFILE';
  return null;
}

export function StudentWorkspacePage({ initialTab = 'SUMMARY' }: { initialTab?: WorkspaceTab } = {}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [studentReferenceId, setStudentReferenceId] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<StudentDashboardSummaryDto | null>(null);
  const [invoices, setInvoices] = useState<StudentFinanceInvoiceDto[]>([]);
  const [paymentsByInvoice, setPaymentsByInvoice] = useState<
    Record<string, StudentFinancePaymentDto[]>
  >({});
  const queryTab = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('tab') : null;
  const hash = typeof window !== 'undefined' ? window.location.hash : '';
  const resolvedInitialTab: CanonicalWorkspaceTab = (queryTab === 'vault' && hash === '#certificates')
    ? 'LEARNING'
    : (resolveTabFromQuery(queryTab) || normalizeTab(initialTab));
  const [tab, setTab] = useState<CanonicalWorkspaceTab>(resolvedInitialTab);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [snapshots, setSnapshots] = useState<StudentWorkspaceSnapshotDto[]>([]);
  const [hydratedSavedItems, setHydratedSavedItems] = useState<HydratedStudentSavedItemDto[]>([]);
  const [applicationTrackers, setApplicationTrackers] = useState<StudentApplicationTrackerDto[]>([]);
  const [serviceRequests, setServiceRequests] = useState<StudentServiceRequestDto[]>([]);
  const [selectedServiceRequest, setSelectedServiceRequest] = useState<StudentServiceRequestDto | null>(null);
  const [requestedServiceNotFound, setRequestedServiceNotFound] = useState(false);
  const [requestedNotFoundId, setRequestedNotFoundId] = useState<string | null>(null);
  const [identity, setIdentity] = useState<{ principalId: string; displayName: string; primaryEmail?: string; roles?: string[]; roleNames?: string[] } | null>(null);

  // Synchronize Tab with URL query param and browser history (back/forward & refresh support)
  const handleTabChange = (nextTab: CanonicalWorkspaceTab, push = true) => {
    setTab(nextTab);
    const searchParams = new URLSearchParams(location.search);
    const tabParam = nextTab.toLowerCase();
    if (searchParams.get('tab') !== tabParam) {
      searchParams.set('tab', tabParam);
      const newSearch = searchParams.toString() ? `?${searchParams.toString()}` : '';
      const newUrl = `${location.pathname}${newSearch}${location.hash}`;
      if (push) {
        navigate(newUrl);
      } else {
        navigate(newUrl, { replace: true });
      }
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const requested = params.get('tab');
    if (requested === 'vault' && location.hash === '#certificates') {
      setTab('LEARNING');
      window.setTimeout(() => document.getElementById('certificates')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      return;
    }
    const next = resolveTabFromQuery(requested);
    if (next) {
      setTab((prev) => (prev !== next ? next : prev));
    }
    if ((next === 'LEARNING' || next === 'VAULT') && location.hash === '#certificates') {
      window.setTimeout(() => document.getElementById('certificates')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }, [location.search, location.hash]);

  // Synchronize requested requestId from URL search params (supporting both id and publicId)
  useEffect(() => {
    const requestedId = new URLSearchParams(location.search).get('requestId');
    if (!requestedId) {
      setRequestedServiceNotFound(false);
      setRequestedNotFoundId(null);
      return;
    }
    if (loading) return;

    const matched = serviceRequests.find((item) => item.id === requestedId || item.publicId === requestedId);
    if (matched) {
      setSelectedServiceRequest(matched);
      setRequestedServiceNotFound(false);
      setRequestedNotFoundId(null);
    } else {
      let active = true;
      ApiClient.getMyStudentServiceRequest(requestedId)
        .then((req) => {
          if (active) {
            setSelectedServiceRequest(req);
            setRequestedServiceNotFound(false);
            setRequestedNotFoundId(null);
          }
        })
        .catch(() => {
          if (active) {
            setSelectedServiceRequest(null);
            setRequestedServiceNotFound(true);
            setRequestedNotFoundId(requestedId);
          }
        });
      return () => {
        active = false;
      };
    }
  }, [location.search, serviceRequests, loading]);

  useEffect(() => {
    let active = true;
    async function loadWorkspace() {
      setLoading(true);
      setError(null);
      try {
        const identity = await ApiClient.getCurrentStudentIdentity();
        if (!active) return;
        setIdentity(identity);
        setStudentReferenceId(identity.principalId);
        const [dashboardResult, invoiceResult, snapshotResult, hydratedSavedResult, trackerResult, serviceRequestResult] = await Promise.allSettled([
          ApiClient.getMyStudentDashboard(),
          ApiClient.getStudentInvoices(identity.principalId),
          ApiClient.listMyStudentWorkspaceSnapshots(),
          ApiClient.listMyHydratedStudentSavedItems(),
          ApiClient.listMyStudentApplicationTrackers(),
          ApiClient.listMyStudentServiceRequests(),
        ]);
        if (!active) return;
        if (dashboardResult.status === 'rejected') throw dashboardResult.reason;
        setDashboard(dashboardResult.value);
        setInvoices(invoiceResult.status === 'fulfilled' ? invoiceResult.value.data : []);
        setSnapshots(snapshotResult.status === 'fulfilled' ? snapshotResult.value : []);
        setHydratedSavedItems(hydratedSavedResult.status === 'fulfilled' ? hydratedSavedResult.value : []);
        setApplicationTrackers(trackerResult.status === 'fulfilled' ? trackerResult.value : []);
        const loadedRequests = serviceRequestResult.status === 'fulfilled' ? serviceRequestResult.value.data : [];
        setServiceRequests(loadedRequests);

        const currentRequestedId = new URLSearchParams(window.location.search).get('requestId');
        if (currentRequestedId) {
          const request = loadedRequests.find((item) => item.id === currentRequestedId || item.publicId === currentRequestedId);
          if (request) {
            setSelectedServiceRequest(request);
            setRequestedServiceNotFound(false);
            setRequestedNotFoundId(null);
          } else {
            try {
              const fetched = await ApiClient.getMyStudentServiceRequest(currentRequestedId);
              setSelectedServiceRequest(fetched);
              setRequestedServiceNotFound(false);
              setRequestedNotFoundId(null);
            } catch {
              setSelectedServiceRequest(null);
              setRequestedServiceNotFound(true);
              setRequestedNotFoundId(currentRequestedId);
            }
          }
        }
      } catch (cause) {
        if (active) {
          const msg = cause instanceof Error ? cause.message : 'تعذر تحميل مساحة الطالب';
          setError(msg);
          if (msg.includes('PROVISIONING_PENDING') || msg.includes('INITIALIZING') || msg.includes('423')) {
            // Auto retry in background while outbox event is being processed
            window.setTimeout(() => {
              if (active) setRetryKey((v) => v + 1);
            }, 2500);
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadWorkspace();
    return () => {
      active = false;
    };
  }, [retryKey]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    return hour < 12 ? 'صباح الخير' : hour < 18 ? 'مرحبًا بك' : 'مساء الخير';
  }, []);

  async function toggleInvoicePayments(invoiceId: string) {
    if (!studentReferenceId) return;
    if (paymentsByInvoice[invoiceId]) {
      setPaymentsByInvoice((current) => {
        const next = { ...current };
        delete next[invoiceId];
        return next;
      });
      return;
    }
    try {
      const payments = await ApiClient.getStudentInvoicePayments(studentReferenceId, invoiceId);
      setPaymentsByInvoice((current) => ({ ...current, [invoiceId]: payments }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تحميل الدفعات');
    }
  }

  async function updateApplicationStage(tracker: StudentApplicationTrackerDto, stage: string) {
    setSaving(true); setError(null);
    try {
      const updated = await ApiClient.updateMyStudentApplicationTracker(tracker.id, { expectedVersion: tracker.version, stage });
      setApplicationTrackers((items) => items.map((item) => item.id === tracker.id ? { ...updated, owner: item.owner } : item));
      setNotice('تم تحديث مرحلة التقديم وحفظها في مساحة الطالب.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر تحديث مرحلة التقديم'); }
    finally { setSaving(false); }
  }

  async function toggleApplicationChecklist(tracker: StudentApplicationTrackerDto, itemId: string, completed: boolean) {
    setSaving(true); setError(null);
    try {
      const updated = await ApiClient.updateMyStudentApplicationChecklistItem(tracker.id, itemId, completed, tracker.version);
      setApplicationTrackers((items) => items.map((item) => item.id === tracker.id ? { ...updated, owner: item.owner } : item));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر تحديث قائمة التقديم'); }
    finally { setSaving(false); }
  }

  async function archiveApplicationTracker(tracker: StudentApplicationTrackerDto) {
    setSaving(true); setError(null);
    try {
      const updated = await ApiClient.archiveMyStudentApplicationTracker(tracker.id, tracker.version);
      setApplicationTrackers((items) => items.map((item) => item.id === tracker.id ? { ...updated, owner: item.owner } : item));
      setNotice('تمت أرشفة ملف التقديم وإلغاء التذكير المرتبط به.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر أرشفة ملف التقديم'); }
    finally { setSaving(false); }
  }

  async function updateApplicationNotes(tracker: StudentApplicationTrackerDto, notes: string) {
    setSaving(true); setError(null);
    try {
      const updated = await ApiClient.updateMyStudentApplicationTracker(tracker.id, { expectedVersion: tracker.version, notes });
      setApplicationTrackers((items) => items.map((item) => item.id === tracker.id ? { ...updated, owner: item.owner } : item));
      setNotice('تم حفظ ملاحظات ملف التقديم.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر حفظ ملاحظات ملف التقديم'); }
    finally { setSaving(false); }
  }

  async function removeApplicationTracker(tracker: StudentApplicationTrackerDto) {
    if (!window.confirm('إزالة ملف التقديم من مساحة الطالب؟')) return;
    setSaving(true); setError(null);
    try { await ApiClient.removeMyStudentApplicationTracker(tracker.id); setApplicationTrackers((items) => items.filter((item) => item.id !== tracker.id)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر إزالة ملف التقديم'); }
    finally { setSaving(false); }
  }

  async function openServiceRequest(requestId: string) {
    setSaving(true);
    setError(null);
    try {
      const match = serviceRequests.find((r) => r.id === requestId || r.publicId === requestId);
      if (match) {
        setSelectedServiceRequest(match);
        setRequestedServiceNotFound(false);
        setRequestedNotFoundId(null);
      } else {
        const request = await ApiClient.getMyStudentServiceRequest(requestId);
        setSelectedServiceRequest(request);
        setRequestedServiceNotFound(false);
        setRequestedNotFoundId(null);
      }
      const searchParams = new URLSearchParams(location.search);
      searchParams.set('tab', 'services');
      searchParams.set('requestId', requestId);
      navigate(`${location.pathname}?${searchParams.toString()}${location.hash}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تحميل طلب الخدمة');
      setSelectedServiceRequest(null);
      setRequestedServiceNotFound(true);
      setRequestedNotFoundId(requestId);
    } finally {
      setSaving(false);
    }
  }

  async function savePreferences(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dashboard || !studentReferenceId) return;
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setNotice(null);
    setError(null);
    try {
      const workspace = await ApiClient.updateMyStudentWorkspace({
        expectedVersion: dashboard.workspace.version,
        displayName: String(form.get('displayName') || '').trim() || null,
        preferredLanguage: String(form.get('preferredLanguage') || 'ar'),
        timezone: String(form.get('timezone') || 'Asia/Aden'),
        theme: String(form.get('theme') || 'SYSTEM'),
        avatarAssetId: String(form.get('avatarAssetId') || '').trim() || null,
        notificationMatrix: {
          inApp: form.get('notifyInApp') === 'on',
          email: form.get('notifyEmail') === 'on',
          push: form.get('notifyPush') === 'on',
          learning: form.get('notifyLearning') === 'on',
          certificates: form.get('notifyCertificates') === 'on',
          scholarships: form.get('notifyScholarships') === 'on',
          payments: form.get('notifyPayments') === 'on',
        },
        accessibilityPreferences: {
          textScale: String(form.get('textScale') || 'DEFAULT'),
          reduceMotion: form.get('reduceMotion') === 'on',
          highContrast: form.get('highContrast') === 'on',
        },
      });
      await ApiClient.updateMyStudentPrivacyConsent({
        expectedVersion: workspace.version,
        purpose: 'تحديث تفضيلات الخصوصية من مساحة الطالب',
        privacyPreferences: {
          retainSearchHistory: form.get('retainSearchHistory') === 'on',
          allowPersonalization: form.get('allowPersonalization') === 'on',
          allowProductAnalytics: form.get('allowProductAnalytics') === 'on',
          publicProfileEnabled: false,
        },
      });
      setDashboard(await ApiClient.getMyStudentDashboard());
      setNotice('حُفظت تفضيلاتك بأمان على جميع أجهزتك.');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'تعذر حفظ الإعدادات';
      setNotice(null);
      setError(message.includes('VERSION_CONFLICT')
        ? 'تغيّرت الإعدادات في جلسة أخرى. تم تحديث البيانات؛ راجع اختياراتك ثم احفظ مجددًا.'
        : message);
      if (message.includes('VERSION_CONFLICT')) {
        try { setDashboard(await ApiClient.getMyStudentDashboard()); } catch { setRetryKey((value) => value + 1); }
      }
    } finally {
      setSaving(false);
    }
  }

  async function createCollection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!studentReferenceId) return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get('collectionName') || '').trim();
    if (!name) return;
    setSaving(true);
    try {
      await ApiClient.createMyStudentCollection({
        name,
        description: String(form.get('collectionDescription') || '').trim() || undefined,
        color: '#0E7C86',
      });
      const refreshed = await ApiClient.getMyStudentDashboard();
      setDashboard(refreshed);
      event.currentTarget.reset();
      setNotice('أُنشئت المجموعة الجديدة.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر إنشاء المجموعة');
    } finally {
      setSaving(false);
    }
  }

  async function renameCollection(collectionId: string, currentName: string) {
    const name = window.prompt('الاسم الجديد للمجموعة', currentName)?.trim();
    if (!name || name === currentName) return;
    setSaving(true);
    try {
      await ApiClient.updateMyStudentCollection(collectionId, { name });
      setDashboard(await ApiClient.getMyStudentDashboard());
      setNotice('تم تحديث اسم المجموعة.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر تعديل المجموعة'); }
    finally { setSaving(false); }
  }

  async function deleteCollection(collectionId: string, name: string) {
    if (!window.confirm(`حذف مجموعة «${name}»؟ ستنتقل العناصر إلى المفضلة.`)) return;
    setSaving(true);
    try {
      await ApiClient.deleteMyStudentCollection(collectionId);
      setDashboard(await ApiClient.getMyStudentDashboard());
      setNotice('حُذفت المجموعة ونُقلت عناصرها بأمان إلى المفضلة.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر حذف المجموعة'); }
    finally { setSaving(false); }
  }

  async function moveSavedItem(itemId: string, collectionId: string | null) {
    setSaving(true);
    try {
      await ApiClient.moveMyStudentSavedItem(itemId, collectionId);
      const [refreshedDashboard, refreshedHydration] = await Promise.all([
        ApiClient.getMyStudentDashboard(),
        ApiClient.listMyHydratedStudentSavedItems(),
      ]);
      setDashboard(refreshedDashboard);
      setHydratedSavedItems(refreshedHydration);
      setNotice('تم نقل العنصر إلى المجموعة المختارة.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر نقل العنصر'); }
    finally { setSaving(false); }
  }

  async function removeSavedItem(item: StudentSavedItemDto) {
    const itemName = item.displayName || 'هذا العنصر';
    if (!window.confirm(`هل أنت متأكد من إزالة «${itemName}» من المحفوظات؟`)) return;
    setSaving(true);
    setError(null);
    try {
      await ApiClient.removeMyStudentSavedItem(item.entityType, item.entityId);
      const [refreshedDashboard, refreshedHydration] = await Promise.all([
        ApiClient.getMyStudentDashboard(),
        ApiClient.listMyHydratedStudentSavedItems(),
      ]);
      setDashboard(refreshedDashboard);
      setHydratedSavedItems(refreshedHydration);
      setNotice('تمت إزالة العنصر من المحفوظات بنجاح.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر إزالة العنصر من المحفوظات');
    } finally {
      setSaving(false);
    }
  }

  async function createSnapshot() {
    if (!studentReferenceId) return;
    setSaving(true);
    try {
      await ApiClient.createMyStudentWorkspaceSnapshot('نسخة إعداداتي');
      setSnapshots(await ApiClient.listMyStudentWorkspaceSnapshots());
      setNotice('حُفظت نسخة آمنة من إعدادات مساحة العمل.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر حفظ النسخة');
    } finally {
      setSaving(false);
    }
  }

  async function restoreSnapshot(snapshotId: string) {
    if (!dashboard) return;
    setSaving(true);
    try {
      const workspace = await ApiClient.restoreMyStudentWorkspaceSnapshot(snapshotId, dashboard.workspace.version);
      setDashboard((current) => current ? { ...current, workspace } : current);
      setNotice('تمت استعادة نسخة الإعدادات مع التحقق من تعارض الإصدارات.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر استعادة النسخة'); }
    finally { setSaving(false); }
  }

  async function resetLayout() {
    if (!dashboard) return;
    setSaving(true);
    try {
      const workspace = await ApiClient.resetMyStudentDashboardLayout(dashboard.workspace.version);
      setDashboard((current) => current ? { ...current, workspace } : current);
      setNotice('أُعيد تخطيط اللوحة إلى الإعدادات الآمنة.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر إعادة التخطيط'); }
    finally { setSaving(false); }
  }

  async function clearSearchHistory() {
    if (!studentReferenceId) return;
    setSaving(true);
    try {
      await ApiClient.clearMyStudentSearchHistory();
      setNotice('مُسح سجل البحث الشخصي.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر مسح سجل البحث');
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    setSaving(true);
    setError(null);
    try {
      await ApiClient.logoutStudent();
      window.location.assign('/');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تسجيل الخروج');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <WorkspaceSkeleton />;

  if (error && !dashboard) {
    const isProvisioning = error.includes('PROVISIONING_PENDING') || error.includes('INITIALIZING') || error.includes('423');
    if (isProvisioning) {
      return (
        <main dir="rtl" className="mn-page-shell py-24 text-center">
          <div className="mn-public-container mx-auto max-w-xl">
            <div className="mn-card rounded-[2rem] p-8 sm:p-10">
              <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-[var(--mn-surface-elevated)] text-[var(--mn-primary)]">
                <RefreshCw className="h-7 w-7 animate-spin" />
              </div>
              <h1 className="text-2xl font-bold text-[var(--mn-heading)]">جارٍ إعداد مساحة الطالب الخاصة بك</h1>
              <p className="mt-3 leading-7 text-[var(--mn-text-muted)]">
                يتم الآن تجهيز لوحة التحكم وسجلاتك التعليمية لأول مرة تلقائياً. ستكون مساحتك جاهزة خلال لحظات قليلة.
              </p>
              <div className="mt-7 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setRetryKey((value) => value + 1)}
                  className="rounded-xl bg-[var(--mn-primary)] px-6 py-3 font-semibold text-white hover:bg-[var(--mn-primary-hover)] mn-inverse"
                >
                  تحديث الآن
                </button>
              </div>
            </div>
          </div>
        </main>
      );
    }

    return (
      <main dir="rtl" className="mn-page-shell py-24 text-center"><div className="mn-public-container mx-auto max-w-xl">
        <div className="mn-card rounded-[2rem] p-8 sm:p-10">
          <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-[var(--mn-surface-muted)] text-[var(--mn-primary)]">
            <LockKeyhole className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--mn-heading)]">مساحة الطالب محمية</h1>
          <p className="mt-3 leading-7 text-[var(--mn-text-muted)]">{error}</p>
          <div className="mt-7 flex justify-center gap-3">
            <Link
              to="/login"
              className="rounded-xl bg-[var(--mn-primary)] px-6 py-3 font-semibold text-white hover:bg-[var(--mn-primary-hover)] mn-inverse"
            >
              تسجيل الدخول
            </Link>
            <button
              type="button"
              onClick={() => setRetryKey((value) => value + 1)}
              className="rounded-xl border border-[var(--mn-border)] px-6 py-3 font-semibold text-[var(--mn-text)] hover:bg-[var(--mn-surface-muted)]"
            >
              إعادة المحاولة
            </button>
          </div>
        </div>
      </div></main>
    );
  }

  if (!dashboard) return null;
  const { workspace, statistics } = dashboard;
  const notifications = (workspace.notificationMatrix || {}) as Record<string, boolean>;
  const privacy = (workspace.privacyPreferences || {}) as Record<string, boolean>;
  const accessibility = (workspace.accessibilityPreferences || {}) as Record<string, unknown>;

  return (
    <main dir="rtl" className="w-full max-w-4xl mx-auto px-3 sm:px-6 pb-28 sm:pb-16 text-right font-['Cairo',sans-serif] min-h-screen text-[var(--mn-text)]">
      {/* Main Hero Card with Golden Top Bar & Royal Gradient */}
      <div className="relative overflow-hidden rounded-[26px] border border-[#142B5F] dark:border-[#B38018]/50 bg-gradient-to-br from-[#142B5F] via-[#112450] to-[#0c1a3b] text-white shadow-md mx-auto w-full mt-4">
        {/* Top Golden Accent Line */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#B38018] via-[#DDAA35] to-[#B38018] shadow-2xs" />

        {/* Decorative Glow Elements */}
        <div className="absolute -left-12 -top-12 w-44 h-44 rounded-full bg-[#B38018]/15 blur-2xl pointer-events-none" />
        <div className="absolute -right-12 -bottom-12 w-48 h-48 rounded-full bg-white/5 blur-2xl pointer-events-none" />

        <div className="p-3.5 sm:p-5">
          {/* User Info Header Section */}
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => handleTabChange('PROFILE')}
              className="flex items-center gap-3 min-w-0 text-right group/profile cursor-pointer focus:outline-none flex-1"
              title="عرض وتعديل ملفي"
            >
              <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl p-0.5 bg-gradient-to-tr from-[#B38018] via-[#DDAA35] to-[#B38018] shrink-0 flex items-center justify-center shadow-sm group-hover/profile:scale-105 transition-transform">
                <div className="w-full h-full rounded-[14px] bg-[#142B5F] border border-white/20 flex items-center justify-center text-white shadow-inner">
                  <User className="w-5 h-5 sm:w-6 sm:h-6 text-[#E0B244]" />
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-bold text-white leading-tight truncate group-hover/profile:text-[#E0B244] transition-colors">
                    {workspace.displayName || identity?.displayName || 'حساب الطالب'}
                  </h1>
                  <span className="text-[10px] bg-white/15 px-2 py-0.5 rounded-full text-white/90 shrink-0 font-medium">
                    ملفي
                  </span>
                </div>
                {identity?.primaryEmail && (
                  <p className="text-[10.5px] sm:text-[11.5px] text-white/70 font-mono mt-0.5 truncate">
                    {identity.primaryEmail}
                  </p>
                )}
              </div>
            </button>

            {/* Quick Status and Logout in Header */}
            <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/10">
              {statistics.activeCourses > 0 || statistics.certificates > 0 ? (
                <div className="flex items-center gap-2 text-xs bg-black/25 px-3 py-1.5 rounded-xl border border-white/10">
                  <span className="text-white/80 text-[11px]">التقدم:</span>
                  <span className="font-bold text-[#E0B244] text-[11px]">{statistics.averageCourseProgress}%</span>
                  <span className="text-white/30">|</span>
                  <span className="text-white/80 text-[11px]">{statistics.activeCourses} دورة</span>
                </div>
              ) : (
                <span className="text-[11px] text-white/80 bg-white/10 px-2.5 py-1 rounded-xl font-medium">
                  {identity?.roles?.includes('student') ? 'طالب معتمد' : 'حساب نشط'}
                </span>
              )}
              <button
                type="button"
                disabled={saving}
                onClick={() => void logout()}
                className="rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white/90 hover:bg-white/20 hover:text-white disabled:opacity-60 transition-colors shrink-0 cursor-pointer"
                title="تسجيل الخروج من الحساب"
              >
                خروج
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar - 5 main tabs: ملخصي | فرصي | تعلمي | محفوظاتي | طلباتي */}
      <div className="w-full max-w-4xl mx-auto mt-3.5 p-1 sm:p-1.5 rounded-2xl bg-[var(--mn-surface)] dark:bg-[var(--mn-surface)] border border-[var(--mn-border)] dark:border-white/10 shadow-sm grid grid-cols-5 gap-1 sm:gap-1.5 mn-panel">
        {tabs.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={`min-w-0 rounded-xl px-1 sm:px-1.5 py-2 flex flex-col items-center gap-1 transition-all cursor-pointer ${
                active
                  ? 'bg-[var(--mn-primary)] text-white shadow-xs font-bold'
                  : 'text-[var(--mn-text-muted)] hover:bg-[var(--mn-page)] dark:hover:bg-[var(--mn-surface-elevated)] font-medium'
              }`}
            >
              <Icon className={`w-4 h-4 ${active ? 'text-[#E5B54F]' : ''}`} />
              <span className="text-[9.5px] sm:text-[11px] truncate w-full text-center">{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="w-full max-w-4xl mx-auto mt-5 space-y-5">
        {error && <Alert tone="error" message={error} onClose={() => setError(null)} />}
        {notice && <Alert tone="success" message={notice} onClose={() => setNotice(null)} />}
        {dashboard.partialFailures.length > 0 && (
          <Alert
            tone="warning"
            message="بعض البطاقات غير متاحة مؤقتًا، لكن بقية مساحة العمل تعمل بصورة طبيعية."
          />
        )}

        {tab === 'SUMMARY' && (
          <SummaryView
            dashboard={dashboard}
            invoices={invoices}
            paymentsByInvoice={paymentsByInvoice}
            onTogglePayments={toggleInvoicePayments}
            setTab={handleTabChange}
            identity={identity}
            applicationTrackers={applicationTrackers}
          />
        )}
        {tab === 'OPPORTUNITIES' && (
          <OpportunitiesView
            dashboard={dashboard}
            trackers={applicationTrackers}
            saving={saving}
            onStageChange={updateApplicationStage}
            onChecklistToggle={toggleApplicationChecklist}
            onNotesUpdate={updateApplicationNotes}
            onArchive={archiveApplicationTracker}
            onRemove={removeApplicationTracker}
          />
        )}
        {tab === 'LEARNING' && (
          <LearningView
            dashboard={dashboard}
          />
        )}
        {tab === 'VAULT' && (
          <VaultView
            dashboard={dashboard}
            hydratedSavedItems={hydratedSavedItems}
            saving={saving}
            onCreateCollection={createCollection}
            onRenameCollection={renameCollection}
            onDeleteCollection={deleteCollection}
            onMoveSavedItem={moveSavedItem}
            onRemoveSavedItem={removeSavedItem}
          />
        )}
        {tab === 'SERVICES' && (
          <ServiceRequestsView
            requests={serviceRequests}
            selected={selectedServiceRequest}
            requestedNotFoundId={requestedNotFoundId}
            saving={saving}
            onOpen={openServiceRequest}
            invoices={invoices}
            paymentsByInvoice={paymentsByInvoice}
            onTogglePayments={toggleInvoicePayments}
          />
        )}
        {tab === 'PROFILE' && (
          <ProfileView
            dashboard={dashboard}
            identity={identity}
            onLogout={() => void logout()}
            notifications={notifications}
            privacy={privacy}
            accessibility={accessibility}
            saving={saving}
            onSave={savePreferences}
            onSnapshot={createSnapshot}
            snapshots={snapshots}
            onRestoreSnapshot={restoreSnapshot}
            onResetLayout={resetLayout}
            onClearSearch={clearSearchHistory}
            onBack={() => handleTabChange('SUMMARY')}
          />
        )}
      </div>
    </main>
  );
}

function SummaryView({
  dashboard,
  invoices,
  paymentsByInvoice,
  onTogglePayments,
  setTab,
  identity,
  applicationTrackers,
}: {
  dashboard: StudentDashboardSummaryDto;
  invoices: StudentFinanceInvoiceDto[];
  paymentsByInvoice: Record<string, StudentFinancePaymentDto[]>;
  onTogglePayments: (invoiceId: string) => void;
  setTab: (tab: CanonicalWorkspaceTab) => void;
  identity: { principalId: string; displayName: string; primaryEmail?: string; roles?: string[]; roleNames?: string[] } | null;
  applicationTrackers: StudentApplicationTrackerDto[];
}) {
  const activeMilestones = useMemo(
    () => applicationTrackers.filter((item) => item.status === 'ACTIVE'),
    [applicationTrackers],
  );

  const activeCourse = useMemo(
    () => dashboard.courseEnrollments.find((item) => item.status !== 'COMPLETED') || dashboard.courseEnrollments[0] || null,
    [dashboard.courseEnrollments],
  );

  const urgentAlerts = useMemo(() => {
    const unread = dashboard.notifications.filter((n) => !n.read);
    const pendingInvoices = invoices.filter((inv) => inv.status !== 'PAID');
    const upcomingDeadlines = activeMilestones.filter((m) => m.deadlineAt);
    return {
      unread,
      pendingInvoices,
      upcomingDeadlines,
      hasUrgent: unread.length > 0 || pendingInvoices.length > 0,
    };
  }, [dashboard.notifications, invoices, activeMilestones]);

  const isNewStudent = (
    dashboard.statistics.savedItems === 0 &&
    dashboard.statistics.activeCourses === 0 &&
    dashboard.statistics.certificates === 0 &&
    applicationTrackers.length === 0
  );

  return (
    <div className="mt-3.5 space-y-4">
      {/* 1. What Needs Attention (if real data proves it) */}
      {urgentAlerts.hasUrgent && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 dark:bg-amber-500/15 p-4 text-[var(--mn-heading)]">
          <div className="flex items-center gap-2.5 font-bold text-sm text-amber-700 dark:text-amber-400">
            <Bell className="w-4 h-4" />
            <span>يحتاج انتباهك</span>
          </div>
          <div className="mt-2.5 space-y-2">
            {urgentAlerts.unread.slice(0, 2).map((n) => (
              <div key={n.id} className="text-xs flex items-start justify-between gap-3 bg-[var(--mn-surface)] p-2.5 rounded-xl border border-[var(--mn-border)]">
                <div>
                  <div className="font-bold">{n.title}</div>
                  <div className="text-[var(--mn-text-muted)] mt-0.5">{n.message}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setTab('PROFILE')}
                  className="shrink-0 text-[10px] font-bold text-[var(--mn-primary)] hover:underline cursor-pointer"
                >
                  عرض
                </button>
              </div>
            ))}
            {urgentAlerts.pendingInvoices.slice(0, 1).map((inv) => (
              <div key={inv.id} className="text-xs flex items-center justify-between gap-3 bg-[var(--mn-surface)] p-2.5 rounded-xl border border-[var(--mn-border)]">
                <div>
                  <span className="font-bold">فاتورة مستحقة: </span>
                  <span>{inv.invoiceNumber} ({formatMoney(inv.amountDue)})</span>
                </div>
                <button
                  type="button"
                  onClick={() => onTogglePayments(inv.id)}
                  className="shrink-0 text-[10px] font-bold text-[var(--mn-primary)] hover:underline cursor-pointer"
                >
                  تفاصيل الفاتورة
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Quick Stat Counters (Only meaningful numbers, clickable to respective tabs) */}
      {!isNewStudent && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
          <button
            type="button"
            onClick={() => setTab('OPPORTUNITIES')}
            className="rounded-2xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] p-3 text-center shadow-2xs hover:shadow-xs transition-all mn-panel cursor-pointer group"
          >
            <Route className="w-4 h-4 mx-auto text-[#142B5F] dark:text-[#E5B54F] mb-1 group-hover:scale-110 transition-transform" />
            <div className="text-base font-bold text-[var(--mn-heading)]">{activeMilestones.length}</div>
            <div className="text-[10px] font-semibold text-[var(--mn-text-muted)] mt-0.5">تقديمات نشطة</div>
          </button>
          <button
            type="button"
            onClick={() => setTab('LEARNING')}
            className="rounded-2xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] p-3 text-center shadow-2xs hover:shadow-xs transition-all mn-panel cursor-pointer group"
          >
            <BookOpen className="w-4 h-4 mx-auto text-[#142B5F] dark:text-[#E5B54F] mb-1 group-hover:scale-110 transition-transform" />
            <div className="text-base font-bold text-[var(--mn-heading)]">{dashboard.statistics.activeCourses}</div>
            <div className="text-[10px] font-semibold text-[var(--mn-text-muted)] mt-0.5">دورات جارية</div>
          </button>
          <button
            type="button"
            onClick={() => setTab('VAULT')}
            className="rounded-2xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] p-3 text-center shadow-2xs hover:shadow-xs transition-all mn-panel cursor-pointer group"
          >
            <Heart className="w-4 h-4 mx-auto text-[#142B5F] dark:text-[#E5B54F] mb-1 group-hover:scale-110 transition-transform" />
            <div className="text-base font-bold text-[var(--mn-heading)]">{dashboard.statistics.savedItems}</div>
            <div className="text-[10px] font-semibold text-[var(--mn-text-muted)] mt-0.5">عناصر محفوظة</div>
          </button>
          <button
            type="button"
            onClick={() => setTab('LEARNING')}
            className="rounded-2xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] p-3 text-center shadow-2xs hover:shadow-xs transition-all mn-panel cursor-pointer group"
          >
            <Award className="w-4 h-4 mx-auto text-[#142B5F] dark:text-[#E5B54F] mb-1 group-hover:scale-110 transition-transform" />
            <div className="text-base font-bold text-[var(--mn-heading)]">{dashboard.statistics.certificates}</div>
            <div className="text-[10px] font-semibold text-[var(--mn-text-muted)] mt-0.5">شهادات صادرة</div>
          </button>
        </div>
      )}

      {/* 3. New Student Welcome / Starting State (Clean consolidated starter card) */}
      {isNewStudent && (
        <div className="rounded-2xl border border-[#D6A43B]/40 bg-gradient-to-br from-[#142B5F]/10 via-[#D6A43B]/5 to-transparent p-4 sm:p-5 text-right mn-panel">
          <div className="flex items-start gap-3 sm:gap-3.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#142B5F] dark:bg-[#0c1a3b] border border-[#D6A43B]/40 flex items-center justify-center text-[#E5B54F] shrink-0 shadow-xs">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-[#E5B54F]" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm sm:text-base font-bold text-[var(--mn-heading)]">مرحبًا بك في مساحتك في منارتك</h2>
              <p className="text-[11px] sm:text-xs text-[var(--mn-text-muted)] mt-1 leading-relaxed">
                مساحتك جاهزة لتتبع طلبات المنح، التسجيل في الدورات، واستكشاف الجامعات والتخصصات وحفظ ما يهمك.
              </p>
              <div className="mt-3.5 flex flex-wrap items-center gap-2">
                <Link
                  to="/scholarships"
                  className="rounded-xl bg-[var(--mn-primary)] px-3 py-1.5 text-xs font-bold text-white hover:bg-[var(--mn-primary-hover)] transition-colors inline-flex items-center gap-1.5 shadow-2xs"
                >
                  <Route className="w-3.5 h-3.5 text-[#E5B54F]" />
                  <span>المنح الدراسية</span>
                </Link>
                <Link
                  to="/courses"
                  className="rounded-xl border border-[var(--mn-border)] bg-[var(--mn-surface)] px-3 py-1.5 text-xs font-bold text-[var(--mn-heading)] hover:border-[#D6A43B] transition-colors inline-flex items-center gap-1.5 shadow-2xs"
                >
                  <BookOpen className="w-3.5 h-3.5 text-[var(--mn-primary)] dark:text-[#E5B54F]" />
                  <span>الدورات التدريبية</span>
                </Link>
                <Link
                  to="/universities"
                  className="rounded-xl border border-[var(--mn-border)] bg-[var(--mn-surface)] px-3 py-1.5 text-xs font-bold text-[var(--mn-heading)] hover:border-[#D6A43B] transition-colors inline-flex items-center gap-1.5 shadow-2xs"
                >
                  <Compass className="w-3.5 h-3.5 text-[var(--mn-primary)] dark:text-[#E5B54F]" />
                  <span>دليل الجامعات</span>
                </Link>
                <Link
                  to="/majors"
                  className="rounded-xl border border-[var(--mn-border)] bg-[var(--mn-surface)] px-3 py-1.5 text-xs font-bold text-[var(--mn-heading)] hover:border-[#D6A43B] transition-colors inline-flex items-center gap-1.5 shadow-2xs"
                >
                  <GraduationCap className="w-3.5 h-3.5 text-[var(--mn-primary)] dark:text-[#E5B54F]" />
                  <span>التخصصات</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setTab('PROFILE')}
                  className="rounded-xl border border-[var(--mn-border)] bg-[var(--mn-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--mn-text-muted)] hover:text-[var(--mn-heading)] transition-colors inline-flex items-center gap-1.5"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>إعداد الملف</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Active In-Progress Course (If any exists) */}
      {activeCourse && (
        <div className="rounded-2xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] p-4 shadow-2xs mn-panel">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-[#142B5F] dark:bg-[#0c1a3b] border border-[#D6A43B]/30 flex items-center justify-center text-[#E5B54F]">
                <BookOpen className="w-3.5 h-3.5 text-[#E5B54F]" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-[var(--mn-heading)]">متابعة التعلم</h2>
                <p className="text-[10px] text-[var(--mn-text-muted)]">آخر دورة تدريبية جارية</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setTab('LEARNING')}
              className="text-[11px] font-semibold text-[#142B5F] dark:text-[#E5B54F] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>جميع الدورات</span>
              <ChevronLeft className="w-3 h-3" />
            </button>
          </div>

          <div className="rounded-xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[10px] font-semibold text-[var(--mn-secondary)]">
                  {activeCourse.status === 'COMPLETED' ? 'مكتملة' : 'قيد التقدم'}
                </span>
                <h3 className="text-xs sm:text-sm font-bold text-[var(--mn-heading)] mt-0.5 truncate">{activeCourse.courseName}</h3>
              </div>
              <span className="text-xs font-bold text-[var(--mn-heading)] shrink-0">{activeCourse.progressPercentage}%</span>
            </div>
            <progress
              className="mn-native-progress mn-native-progress-secondary mt-2.5 h-2 w-full"
              value={Math.min(100, Math.max(0, activeCourse.progressPercentage))}
              max={100}
              aria-label="نسبة تقدم الدورة"
            />
            <div className="mt-3 flex items-center justify-between text-[10.5px] text-[var(--mn-text-muted)]">
              <span>{activeCourse.lastAccessedAt ? `آخر وصول: ${formatDate(activeCourse.lastAccessedAt)}` : 'دورة نشطة'}</span>
              <Link
                to={`../student/courses/${encodeURIComponent(activeCourse.courseId)}`}
                className="inline-flex items-center gap-1 font-bold text-[var(--mn-primary)] dark:text-[#E5B54F] hover:underline"
              >
                <span>متابعة الدرس</span>
                <ArrowLeft className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 5. Active Application Trackers (If any exist) */}
      {activeMilestones.length > 0 && (
        <div className="rounded-2xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] p-4 shadow-2xs mn-panel">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-[#142B5F] dark:bg-[#0c1a3b] border border-[#D6A43B]/30 flex items-center justify-center text-[#E5B54F]">
                <Route className="w-3.5 h-3.5 text-[#E5B54F]" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-[var(--mn-heading)]">ملفات التقديم النشطة</h2>
                <p className="text-[10px] text-[var(--mn-text-muted)]">متابعة مراحل التقديم والمواعيد</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setTab('OPPORTUNITIES')}
              className="text-[11px] font-semibold text-[#142B5F] dark:text-[#E5B54F] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>عرض الكل</span>
              <ChevronLeft className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2">
            {activeMilestones.slice(0, 2).map((item) => {
              const completed = item.checklist.filter((c) => c.completed).length;
              const progress = item.checklist.length ? Math.round((completed / item.checklist.length) * 100) : 0;
              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-[var(--mn-surface)] px-2 py-0.5 rounded-md border border-[var(--mn-border)] text-[#142B5F] dark:text-[#E5B54F] font-bold">
                        {item.stage} (حسب تحديثك)
                      </span>
                      {item.deadlineAt && (
                        <span className="text-[10px] text-[var(--mn-text-muted)] flex items-center gap-1">
                          <CalendarClock className="w-3 h-3" />
                          <span>الموعد: {formatDate(item.deadlineAt)}</span>
                        </span>
                      )}
                    </div>
                    <h3 className="text-xs sm:text-sm font-bold text-[var(--mn-heading)] mt-1 truncate">
                      {item.owner?.displayName || item.scholarshipSlug || item.scholarshipId}
                    </h3>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <span className="text-xs font-bold text-[var(--mn-text-muted)]">{progress}% مكتمل</span>
                    <button
                      type="button"
                      onClick={() => setTab('OPPORTUNITIES')}
                      className="rounded-lg bg-[var(--mn-surface)] border border-[var(--mn-border)] px-2.5 py-1 text-xs font-semibold text-[var(--mn-heading)] hover:border-[#D6A43B] transition-colors cursor-pointer"
                    >
                      متابعة المهام
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. Recent Activity Timeline (If items exist) */}
      {dashboard.timeline.length > 0 && (
        <div className="rounded-2xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] p-4 shadow-2xs mn-panel">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-[#142B5F] dark:bg-[#0c1a3b] border border-[#D6A43B]/30 flex items-center justify-center text-[#E5B54F]">
                <HistoryIcon className="w-3.5 h-3.5 text-[#E5B54F]" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-[var(--mn-heading)]">آخر الأنشطة والخطوات</h2>
                <p className="text-[10px] text-[var(--mn-text-muted)]">سجل زمني لتقدمك وتحديثاتك</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {dashboard.timeline.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] p-2.5 text-right"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-bold text-[var(--mn-heading)] line-clamp-1">{item.title}</h3>
                  <time className="text-[10px] text-[var(--mn-text-muted)] shrink-0 font-mono">{formatDate(item.occurredAt)}</time>
                </div>
                {item.description && (
                  <p className="text-[10.5px] text-[var(--mn-text-muted)] mt-1 line-clamp-2 leading-relaxed">{item.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. Explore Platform Directory (Scholarships, Courses, Majors, Universities) - only for active students to avoid duplicate CTA for new students */}
      {!isNewStudent && (
        <div className="rounded-2xl border border-[#D6A43B]/30 bg-gradient-to-r from-[#D6A43B]/10 via-[#F3CE74]/5 to-transparent p-4">
          <div className="text-center max-w-xl mx-auto">
            <div className="inline-flex items-center justify-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#142B5F] dark:bg-[#0c1a3b] border border-[#D6A43B]/30 flex items-center justify-center text-[#E5B54F] shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-[#E5B54F]" />
              </div>
              <h2 className="text-[13.5px] sm:text-sm font-bold text-[var(--mn-heading)]">استكشف الفرص في منارتك</h2>
            </div>
            <div className="h-[2px] w-14 mx-auto bg-gradient-to-r from-transparent via-[#D6A43B] to-transparent rounded-full my-1.5" />
            <p className="text-[11px] leading-relaxed text-[var(--mn-text-muted)] font-medium mt-1">
              ابحث في دليل المنح الدراسية، الدورات التخصصية، والجامعات المعتمدة عبر الفلاتر الذكية.
            </p>
            <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2">
              <Link
                to="/scholarships"
                className="px-3 py-1.5 rounded-xl bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] border border-[var(--mn-border)] hover:border-[#D6A43B]/60 text-xs font-semibold text-[var(--mn-heading)] dark:text-[#E5B54F] transition-all shadow-2xs"
              >
                المنح الدراسية
              </Link>
              <Link
                to="/courses"
                className="px-3 py-1.5 rounded-xl bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] border border-[var(--mn-border)] hover:border-[#D6A43B]/60 text-xs font-semibold text-[var(--mn-heading)] dark:text-[#E5B54F] transition-all shadow-2xs"
              >
                الدورات التدريبية
              </Link>
              <Link
                to="/universities"
                className="px-3 py-1.5 rounded-xl bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] border border-[var(--mn-border)] hover:border-[#D6A43B]/60 text-xs font-semibold text-[var(--mn-heading)] dark:text-[#E5B54F] transition-all shadow-2xs"
              >
                دليل الجامعات
              </Link>
              <Link
                to="/majors"
                className="px-3 py-1.5 rounded-xl bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] border border-[var(--mn-border)] hover:border-[#D6A43B]/60 text-xs font-semibold text-[var(--mn-heading)] dark:text-[#E5B54F] transition-all shadow-2xs"
              >
                التخصصات
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 8. Invoices (If any exist) */}
      {invoices.length > 0 && (
        <InvoicePanel
          invoices={invoices}
          paymentsByInvoice={paymentsByInvoice}
          onToggle={onTogglePayments}
        />
      )}
    </div>
  );
}

function OpportunitiesView({
  dashboard,
  trackers,
  saving,
  onStageChange,
  onChecklistToggle,
  onNotesUpdate,
  onArchive,
  onRemove,
}: {
  dashboard: StudentDashboardSummaryDto;
  trackers: StudentApplicationTrackerDto[];
  saving: boolean;
  onStageChange: (tracker: StudentApplicationTrackerDto, stage: string) => void;
  onChecklistToggle: (tracker: StudentApplicationTrackerDto, itemId: string, completed: boolean) => void;
  onNotesUpdate: (tracker: StudentApplicationTrackerDto, notes: string) => void;
  onArchive: (tracker: StudentApplicationTrackerDto) => void;
  onRemove: (tracker: StudentApplicationTrackerDto) => void;
}) {
  const [filter, setFilter] = useState<'ACTIVE' | 'ARCHIVED' | 'ALL'>('ACTIVE');

  const activeTrackers = useMemo(() => trackers.filter((item) => item.status === 'ACTIVE'), [trackers]);
  const archivedTrackers = useMemo(() => trackers.filter((item) => item.status === 'ARCHIVED'), [trackers]);

  const displayedTrackers = useMemo(() => {
    if (filter === 'ACTIVE') return activeTrackers;
    if (filter === 'ARCHIVED') return archivedTrackers;
    return trackers;
  }, [filter, activeTrackers, archivedTrackers, trackers]);

  const totalTasks = trackers.reduce((total, item) => total + item.checklist.length, 0);
  const completedTasks = trackers.reduce(
    (total, item) => total + item.checklist.filter((task) => task.completed).length,
    0,
  );
  const journeyProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const upcomingDeadlines = useMemo(() => {
    return activeTrackers
      .filter((t) => t.deadlineAt || t.owner?.deadlineAt)
      .sort((a, b) => {
        const dateA = new Date(a.deadlineAt || a.owner?.deadlineAt || '').getTime();
        const dateB = new Date(b.deadlineAt || b.owner?.deadlineAt || '').getTime();
        return dateA - dateB;
      });
  }, [activeTrackers]);

  const hasTrackers = trackers.length > 0;

  return (
    <div className="space-y-5">
      {/* 1. Header Banner & Quick Stats */}
      <div className="rounded-2xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] p-4 sm:p-5 shadow-2xs mn-panel">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2">
              <span className="text-[10px] font-bold text-[#142B5F] dark:text-[#E5B54F]">المتابعة والتقديم</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#D6A43B]/10 text-[#D6A43B] font-semibold">مساحة الطالب</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-[var(--mn-heading)] mt-0.5">فرصي وملفات التقديم</h2>
            <p className="text-[11px] leading-relaxed text-[var(--mn-text-muted)] font-medium mt-1">
              إدارة منظمة لملفات التقديم على المنح الدراسية، متابعة المواعيد النهائية، وإنجاز قوائم المتطلبات خطوة بخطوة.
            </p>
          </div>
          <Link
            to="/scholarships"
            className="self-start sm:self-center shrink-0 px-3.5 py-1.5 rounded-xl bg-[var(--mn-primary)] text-white text-xs font-bold hover:bg-[var(--mn-primary-hover)] transition-all shadow-2xs flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#E5B54F]" />
            <span>استكشف المنح</span>
          </Link>
        </div>

        {/* 3 Metric Counters - Only shown when trackers exist */}
        {hasTrackers && (
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] p-2.5 sm:p-3 text-center mn-panel">
              <div className="text-base sm:text-lg font-bold text-[var(--mn-heading)]">{activeTrackers.length}</div>
              <div className="text-[9.5px] sm:text-[10px] font-semibold text-[var(--mn-text-muted)] mt-0.5">تقديم نشط</div>
            </div>
            <div className="rounded-xl bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] p-2.5 sm:p-3 text-center mn-panel">
              <div className="text-base sm:text-lg font-bold text-[var(--mn-heading)]">{journeyProgress}%</div>
              <div className="text-[9.5px] sm:text-[10px] font-semibold text-[var(--mn-text-muted)] mt-0.5">إنجاز المهام ({completedTasks}/{totalTasks})</div>
            </div>
            <div className="rounded-xl bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] p-2.5 sm:p-3 text-center mn-panel">
              <div className="text-base sm:text-lg font-bold text-[var(--mn-heading)]">{archivedTrackers.length}</div>
              <div className="text-[9.5px] sm:text-[10px] font-semibold text-[var(--mn-text-muted)] mt-0.5">ملفات مؤرشفة</div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Filter Tabs (Active / Archived / All) - Only shown when trackers exist */}
      {hasTrackers && (
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] dark:border-white/10 w-fit text-xs font-medium">
          <button
            type="button"
            onClick={() => setFilter('ACTIVE')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
              filter === 'ACTIVE'
                ? 'bg-[var(--mn-primary)] text-white shadow-2xs'
                : 'text-[var(--mn-text-muted)] hover:bg-[var(--mn-page)]'
            }`}
          >
            النشطة حاليًا ({activeTrackers.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('ARCHIVED')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
              filter === 'ARCHIVED'
                ? 'bg-[var(--mn-primary)] text-white shadow-2xs'
                : 'text-[var(--mn-text-muted)] hover:bg-[var(--mn-page)]'
            }`}
          >
            المؤرشفة ({archivedTrackers.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
              filter === 'ALL'
                ? 'bg-[var(--mn-primary)] text-white shadow-2xs'
                : 'text-[var(--mn-text-muted)] hover:bg-[var(--mn-page)]'
            }`}
          >
            الكل ({trackers.length})
          </button>
        </div>
      )}

      {/* 3. Main Trackers or Single Clean Starter State */}
      {!hasTrackers ? (
        <div className="rounded-2xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] p-6 sm:p-8 text-center mn-panel shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-[#142B5F] dark:bg-[#0c1a3b] border border-[#D6A43B]/40 flex items-center justify-center text-[#E5B54F] mx-auto mb-3.5 shadow-xs">
            <Route className="w-6 h-6 text-[#E5B54F]" />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-[var(--mn-heading)]">ابدأ متابعة تقديماتك خطوة بخطوة</h3>
          <p className="text-xs text-[var(--mn-text-muted)] mt-2 leading-relaxed max-w-lg mx-auto">
            <strong>ما الفرق؟</strong> حفظ المنحة في <span className="font-semibold text-[var(--mn-heading)]">«محفوظاتي»</span> يتيح لك الرجوع إليها في أي وقت، بينما فتح <span className="font-semibold text-[var(--mn-heading)]">«ملف تقديم»</span> هنا يمكّنك من إدارة المواعيد النهائية، إنجاز المتطلبات وقوائم المهام خطوة بخطوة حتى القبول.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/scholarships"
              className="px-4 py-2 rounded-xl bg-[var(--mn-primary)] text-white text-xs font-bold hover:bg-[var(--mn-primary-hover)] transition-all shadow-2xs inline-flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#E5B54F]" />
              <span>استكشف دليل المنح الدراسية</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.45fr_1fr]">
          <div className="space-y-4">
            <ApplicationTrackersPanel
              trackers={displayedTrackers}
              filter={filter}
              saving={saving}
              onStageChange={onStageChange}
              onChecklistToggle={onChecklistToggle}
              onNotesUpdate={onNotesUpdate}
              onArchive={onArchive}
              onRemove={onRemove}
            />
          </div>

          <div className="space-y-5">
            {/* Upcoming Deadlines Panel */}
            {upcomingDeadlines.length > 0 && (
              <div className="rounded-2xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] p-4 shadow-2xs mn-panel">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-xl bg-[#142B5F] dark:bg-[#0c1a3b] border border-[#D6A43B]/30 flex items-center justify-center text-[#E5B54F]">
                    <CalendarClock className="w-3.5 h-3.5 text-[#E5B54F]" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-[var(--mn-heading)]">المواعيد النهائية القريبة</h3>
                    <p className="text-[10px] text-[var(--mn-text-muted)]">مواعيد إغلاق تقديمات المنح المتابعة</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {upcomingDeadlines.slice(0, 4).map((tracker) => {
                    const deadlineStr = tracker.deadlineAt || tracker.owner?.deadlineAt;
                    const title = tracker.owner?.displayName || tracker.scholarshipSlug || tracker.scholarshipId;
                    return (
                      <div
                        key={tracker.id}
                        className="p-2.5 rounded-xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-bold truncate text-[var(--mn-heading)]">{title}</div>
                          <div className="text-[10.5px] text-[var(--mn-text-muted)] mt-0.5">{tracker.stage}</div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="inline-flex items-center gap-1 font-mono font-bold text-[#D6A43B] text-[11px]">
                            <span>{formatDate(deadlineStr)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Application Progress Summary */}
            <Panel title="حصيلة التقديم">
              <div className="space-y-4">
                <ProgressRow label="إنجاز مهام التقديم" value={journeyProgress} />
                <ProgressRow
                  label="نسبة الملفات المؤرشفة"
                  value={trackers.length ? Math.round((archivedTrackers.length / trackers.length) * 100) : 0}
                />
              </div>
              <div className="mt-4 p-3 rounded-xl bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] border border-[var(--mn-border)] dark:border-white/10 text-[11px] leading-relaxed text-[var(--mn-text-muted)]">
                💡 <strong>تنبيه دقة البيانات:</strong> حفظ المنحة في «محفوظاتي» يتيح الرجوع إليها لاحقًا، بينما فتح «ملف تقديم» هنا يمكّنك من متابعة المهام ومراحل التقديم خطوة بخطوة.
              </div>
            </Panel>

            {/* Timeline of activity */}
            {dashboard.timeline.length > 0 && (
              <Panel title="سجل الأنشطة والمواعيد">
                <ActivityList items={dashboard.timeline} />
              </Panel>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const APPLICATION_STAGES = [
  'تجهيز المستندات',
  'كتابة خطاب الدافع',
  'خطابات التوصية',
  'تم إرسال الطلب',
  'المقابلة الشخصية',
  'تم القبول بنجاح',
];

function ApplicationTrackersPanel({
  trackers,
  filter,
  saving,
  onStageChange,
  onChecklistToggle,
  onNotesUpdate,
  onArchive,
  onRemove,
}: {
  trackers: StudentApplicationTrackerDto[];
  filter: 'ACTIVE' | 'ARCHIVED' | 'ALL';
  saving: boolean;
  onStageChange: (tracker: StudentApplicationTrackerDto, stage: string) => void;
  onChecklistToggle: (tracker: StudentApplicationTrackerDto, itemId: string, completed: boolean) => void;
  onNotesUpdate: (tracker: StudentApplicationTrackerDto, notes: string) => void;
  onArchive: (tracker: StudentApplicationTrackerDto) => void;
  onRemove: (tracker: StudentApplicationTrackerDto) => void;
}) {
  if (!trackers.length) {
    if (filter === 'ARCHIVED') {
      return (
        <div className="rounded-2xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] p-6 text-center mn-panel">
          <Archive className="w-8 h-8 mx-auto text-[var(--mn-text-muted)] mb-2" />
          <h3 className="font-bold text-sm text-[var(--mn-heading)]">لا توجد ملفات تقديم مؤرشفة</h3>
          <p className="text-xs text-[var(--mn-text-muted)] mt-1 max-w-sm mx-auto">
            عند إتمام تقديماتك أو أرشفتها ستظهر هنا للاحتفاظ بسجلك الأكاديمي.
          </p>
        </div>
      );
    }
    return (
      <EmptyState
        icon={<Route className="h-8 w-8 text-[#E5B54F]" />}
        title="لا توجد ملفات تقديم نشطة بعد"
        text="تصفح دليل المنح الدراسية واختر «متابعة التقديم» على المنحة التي ترغب بالتقديم عليها لتوليد ملف تتبع مخصص خطوة بخطوة."
        href="/scholarships"
        action="استكشف دليل المنح الآن"
      />
    );
  }

  return (
    <div className="space-y-4">
      {trackers.map((tracker) => (
        <ApplicationTrackerCard
          key={tracker.id}
          tracker={tracker}
          saving={saving}
          onStageChange={onStageChange}
          onChecklistToggle={onChecklistToggle}
          onNotesUpdate={onNotesUpdate}
          onArchive={onArchive}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}

function ApplicationTrackerCard({
  tracker,
  saving,
  onStageChange,
  onChecklistToggle,
  onNotesUpdate,
  onArchive,
  onRemove,
}: {
  tracker: StudentApplicationTrackerDto;
  saving: boolean;
  onStageChange: (tracker: StudentApplicationTrackerDto, stage: string) => void;
  onChecklistToggle: (tracker: StudentApplicationTrackerDto, itemId: string, completed: boolean) => void;
  onNotesUpdate: (tracker: StudentApplicationTrackerDto, notes: string) => void;
  onArchive: (tracker: StudentApplicationTrackerDto) => void;
  onRemove: (tracker: StudentApplicationTrackerDto) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState(tracker.notes || '');

  const completed = tracker.checklist.filter((item) => item.completed).length;
  const total = tracker.checklist.length;
  const progress = total ? Math.round((completed / total) * 100) : 0;
  const displayName = tracker.owner?.displayName || tracker.scholarshipSlug || tracker.scholarshipId;
  const slug = tracker.owner?.slug || tracker.scholarshipSlug;
  const isArchived = tracker.status === 'ARCHIVED';
  const deadlineStr = tracker.deadlineAt || tracker.owner?.deadlineAt;

  function handleSaveNotes() {
    onNotesUpdate(tracker, notesDraft);
    setEditingNotes(false);
  }

  return (
    <article className="rounded-2xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] p-4 sm:p-5 shadow-2xs mn-panel transition-all hover:border-[#D6A43B]/40">
      {/* Top Header Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#142B5F] dark:bg-[#0c1a3b] border border-[#D6A43B]/30 flex items-center justify-center text-[#E5B54F] shrink-0 mt-0.5">
            <GraduationCap className="w-5 h-5 text-[#E5B54F]" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              {isArchived ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-500 border border-slate-500/20">
                  مؤرشف تنظيمياً
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  تقديم نشط
                </span>
              )}
              {tracker.owner?.country && (
                <span className="text-[10px] font-medium text-[var(--mn-text-muted)] bg-[var(--mn-page)] px-2 py-0.5 rounded-md border border-[var(--mn-border)]">
                  {tracker.owner.country}
                </span>
              )}
              <span className="text-[10px] font-semibold text-[#142B5F] dark:text-[#E5B54F] bg-[#142B5F]/10 dark:bg-[#E5B54F]/15 px-2 py-0.5 rounded-md border border-[#D6A43B]/20">
                المرحلة (حسب تحديثك): {tracker.stage}
              </span>
            </div>

            <h3 className="text-sm sm:text-base font-bold text-[var(--mn-heading)] mt-1.5 line-clamp-1">
              {displayName}
            </h3>

            {/* Meta tags: Deadline & Checklist */}
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--mn-text-muted)]">
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="w-3.5 h-3.5 text-[#D6A43B]" />
                <span>الموعد: <strong>{formatDate(deadlineStr)}</strong></span>
              </span>
              <span className="inline-flex items-center gap-1">
                <ListChecks className="w-3.5 h-3.5 text-[#142B5F] dark:text-[#E5B54F]" />
                <span>المهام: <strong>{completed} من {total}</strong> ({progress}%)</span>
              </span>
              <span className="text-[10.5px] text-[var(--mn-text-muted)]">
                آخر تحديث: {formatDate(tracker.updatedAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Progress % Badge */}
        <div className="text-right shrink-0">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] border border-[var(--mn-border)] text-xs font-bold text-[var(--mn-heading)]">
            {progress}%
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-3.5">
        <progress
          className="mn-native-progress mn-native-progress-secondary h-2 w-full"
          value={Math.min(100, Math.max(0, progress))}
          max={100}
          aria-label="نسبة إنجاز ملف التقديم"
        />
      </div>

      {/* Source Unavailability Notice */}
      {tracker.owner && !tracker.owner.available && (
        <div className="mt-3 rounded-xl bg-[var(--mn-warning-soft)] p-2.5 text-xs font-medium text-[var(--mn-warning-text)] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>غير معروضة حاليًا لدى المصدر؛ وسجلك محفوظ بحسابك.</span>
        </div>
      )}

      {/* Expand / Collapse Action Button */}
      <div className="mt-3.5 pt-3 border-t border-[var(--mn-border)] dark:border-white/10 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--mn-primary)] hover:text-[var(--mn-secondary)] transition-colors cursor-pointer"
        >
          <span>{expanded ? 'إخفاء تفاصيل ومهام الملف' : 'فتح تفاصيل الملف والمهام'}</span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        <div className="flex items-center gap-2">
          {slug && (
            <Link
              to={`/scholarships/${encodeURIComponent(slug)}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--mn-text-muted)] hover:text-[#D6A43B] transition-colors"
              title="صفحة المنحة"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">صفحة المنحة</span>
            </Link>
          )}
          <button
            type="button"
            disabled={saving}
            onClick={() => onArchive(tracker)}
            className="rounded-lg border border-[var(--mn-border)] px-2.5 py-1 text-xs font-semibold text-[var(--mn-text-muted)] hover:border-[#D6A43B] transition-colors cursor-pointer"
          >
            {isArchived ? 'إلغاء الأرشفة' : 'أرشفة'}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => onRemove(tracker)}
            className="rounded-lg border border-[var(--mn-danger-border)] bg-[var(--mn-danger-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--mn-danger-text)] hover:brightness-95 transition-colors cursor-pointer"
          >
            إزالة
          </button>
        </div>
      </div>

      {/* Expanded Details: Stage selector, Checklist, Notes */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-[var(--mn-border)] dark:border-white/10 space-y-4 animate-in fade-in duration-200">
          {/* Stage Selector */}
          <div>
            <label className="block text-xs font-bold text-[var(--mn-heading)] mb-1.5">
              تحديث مرحلة التقديم الحالية:
            </label>
            <select
              disabled={saving}
              value={tracker.stage}
              onChange={(event) => onStageChange(tracker, event.target.value)}
              className="w-full rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] px-3 py-2 text-xs font-semibold text-[var(--mn-heading)] outline-none focus:border-[#D6A43B]"
            >
              {APPLICATION_STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
          </div>

          {/* Checklist Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[var(--mn-heading)]">قائمة المهام والمتطلبات</span>
              <span className="text-[11px] text-[var(--mn-text-muted)] font-medium">
                {completed} من {total} مكتمل
              </span>
            </div>
            <div className="space-y-1.5">
              {tracker.checklist.map((item) => (
                <label
                  key={item.id}
                  className={`flex items-center gap-2.5 rounded-xl p-2.5 text-xs transition-colors cursor-pointer border ${
                    item.completed
                      ? 'bg-emerald-500/5 border-emerald-500/20 text-[var(--mn-text-muted)] line-through'
                      : 'bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] border-[var(--mn-border)] text-[var(--mn-heading)] font-medium'
                  }`}
                >
                  <input
                    disabled={saving}
                    type="checkbox"
                    checked={item.completed}
                    onChange={(event) => onChecklistToggle(tracker, item.id, event.target.checked)}
                    className="w-4 h-4 rounded accent-[#142B5F] dark:accent-[#E5B54F]"
                  />
                  <span className="flex-1">{item.label}</span>
                  {item.completedAt && (
                    <span className="text-[10px] text-[var(--mn-text-muted)] font-mono shrink-0">
                      {formatDate(item.completedAt)}
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Notes Section */}
          <div className="rounded-xl bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] p-3 border border-[var(--mn-border)]">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#D6A43B]" />
                <span className="text-xs font-bold text-[var(--mn-heading)]">ملاحظاتي على ملف التقديم</span>
              </div>
              {!editingNotes && (
                <button
                  type="button"
                  onClick={() => setEditingNotes(true)}
                  className="text-[11px] font-semibold text-[var(--mn-primary)] hover:underline cursor-pointer"
                >
                  {tracker.notes ? 'تعديل الملاحظة' : 'إضافة ملاحظة'}
                </button>
              )}
            </div>

            {editingNotes ? (
              <div className="space-y-2 mt-2">
                <textarea
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  placeholder="سجّل أي تفاصيل مهمة (مثل اسم المشرف، تاريخ المقابلة، الملاحظات المطلوبة)..."
                  rows={3}
                  maxLength={500}
                  className="w-full rounded-lg border border-[var(--mn-border)] bg-[var(--mn-surface)] p-2 text-xs text-[var(--mn-heading)] outline-none focus:border-[#D6A43B]"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNotesDraft(tracker.notes || '');
                      setEditingNotes(false);
                    }}
                    className="px-2.5 py-1 rounded-md border text-xs font-semibold text-[var(--mn-text-muted)] hover:bg-[var(--mn-surface)]"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleSaveNotes}
                    className="px-3 py-1 rounded-md bg-[var(--mn-primary)] text-white text-xs font-bold hover:bg-[var(--mn-primary-hover)] disabled:opacity-50"
                  >
                    حفظ الملاحظة
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-[var(--mn-text-muted)] leading-relaxed mt-1">
                {tracker.notes || 'لا توجد ملاحظات مسجلة لهذا الملف حتى الآن.'}
              </p>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

function LearningView({ dashboard }: { dashboard: StudentDashboardSummaryDto }) {
  const [filter, setFilter] = useState<'ALL' | 'IN_PROGRESS' | 'COMPLETED' | 'CERTIFICATES'>('ALL');

  const inProgressCourses = useMemo(
    () => dashboard.courseEnrollments.filter((c) => c.status !== 'COMPLETED'),
    [dashboard.courseEnrollments],
  );

  const completedCourses = useMemo(
    () => dashboard.courseEnrollments.filter((c) => c.status === 'COMPLETED'),
    [dashboard.courseEnrollments],
  );

  const certificates = useMemo(() => dashboard.certificates || [], [dashboard.certificates]);

  const hasAnyLearningData = dashboard.courseEnrollments.length > 0 || certificates.length > 0;

  return (
    <div className="space-y-5">
      {/* 1. Header Banner & Quick Learning Stats */}
      <div className="rounded-2xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] p-4 sm:p-5 shadow-2xs mn-panel">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2">
              <span className="text-[10px] font-bold text-[#142B5F] dark:text-[#E5B54F]">المسار الأكاديمي</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#D6A43B]/10 text-[#D6A43B] font-semibold">مساحة الطالب</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-[var(--mn-heading)] mt-0.5">تعلمي وإنجازاتي</h2>
            <p className="text-[11px] leading-relaxed text-[var(--mn-text-muted)] font-medium mt-1">
              متابعة الدورات التدريبية المسجل بها، سجل التقدم الفعلي، والشهادات الصادرة والمعتمدة بحسابك.
            </p>
          </div>
          <Link
            to="/courses"
            className="self-start sm:self-center shrink-0 px-3.5 py-1.5 rounded-xl bg-[var(--mn-primary)] text-white text-xs font-bold hover:bg-[var(--mn-primary-hover)] transition-all shadow-2xs flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#E5B54F]" />
            <span>استكشف الدورات</span>
          </Link>
        </div>

        {/* Metric Counters - Only shown when learning data exists */}
        {hasAnyLearningData && (
          <div className="mt-4 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setFilter('IN_PROGRESS')}
              className="rounded-xl bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] p-2.5 sm:p-3 text-center mn-panel cursor-pointer hover:border-[#D6A43B]/40 transition-colors"
            >
              <div className="text-base sm:text-lg font-bold text-[var(--mn-heading)]">{inProgressCourses.length}</div>
              <div className="text-[9.5px] sm:text-[10px] font-semibold text-[var(--mn-text-muted)] mt-0.5">قيد التعلم</div>
            </button>
            <button
              type="button"
              onClick={() => setFilter('COMPLETED')}
              className="rounded-xl bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] p-2.5 sm:p-3 text-center mn-panel cursor-pointer hover:border-[#D6A43B]/40 transition-colors"
            >
              <div className="text-base sm:text-lg font-bold text-[var(--mn-heading)]">{completedCourses.length}</div>
              <div className="text-[9.5px] sm:text-[10px] font-semibold text-[var(--mn-text-muted)] mt-0.5">دورات مكتملة</div>
            </button>
            <button
              type="button"
              onClick={() => setFilter('CERTIFICATES')}
              className="rounded-xl bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] p-2.5 sm:p-3 text-center mn-panel cursor-pointer hover:border-[#D6A43B]/40 transition-colors"
            >
              <div className="text-base sm:text-lg font-bold text-[var(--mn-heading)]">{certificates.length}</div>
              <div className="text-[9.5px] sm:text-[10px] font-semibold text-[var(--mn-text-muted)] mt-0.5">شهادات صادرة</div>
            </button>
          </div>
        )}
      </div>

      {/* 2. Filter Navigation Pills - Only shown when learning data exists */}
      {hasAnyLearningData && (
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] dark:border-white/10 w-fit text-xs font-medium">
          <button
            type="button"
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
              filter === 'ALL'
                ? 'bg-[var(--mn-primary)] text-white shadow-2xs'
                : 'text-[var(--mn-text-muted)] hover:bg-[var(--mn-page)]'
            }`}
          >
            الكل ({dashboard.courseEnrollments.length + certificates.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('IN_PROGRESS')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
              filter === 'IN_PROGRESS'
                ? 'bg-[var(--mn-primary)] text-white shadow-2xs'
                : 'text-[var(--mn-text-muted)] hover:bg-[var(--mn-page)]'
            }`}
          >
            قيد التعلم ({inProgressCourses.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('COMPLETED')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
              filter === 'COMPLETED'
                ? 'bg-[var(--mn-primary)] text-white shadow-2xs'
                : 'text-[var(--mn-text-muted)] hover:bg-[var(--mn-page)]'
            }`}
          >
            المكتملة ({completedCourses.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('CERTIFICATES')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
              filter === 'CERTIFICATES'
                ? 'bg-[var(--mn-primary)] text-white shadow-2xs'
                : 'text-[var(--mn-text-muted)] hover:bg-[var(--mn-page)]'
            }`}
          >
            الشهادات ({certificates.length})
          </button>
        </div>
      )}

      {!hasAnyLearningData ? (
        <div className="rounded-2xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] p-6 sm:p-8 text-center mn-panel shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-[#142B5F] dark:bg-[#0c1a3b] border border-[#D6A43B]/40 flex items-center justify-center text-[#E5B54F] mx-auto mb-3.5 shadow-xs">
            <BookOpen className="w-6 h-6 text-[#E5B54F]" />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-[var(--mn-heading)]">ابدأ مسارك التعليمي المخصص</h3>
          <p className="text-xs text-[var(--mn-text-muted)] mt-2 leading-relaxed max-w-lg mx-auto">
            تصفح دليل الدورات التدريبية المتاحة وسجّل في البرامج التي تدعم مسارك الأكاديمي والمهني لتتبع تقدم الدروس خطوة بخطوة والحصول على شهادات إتمام معتمدة تصدر مباشرة في حسابك.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/courses"
              className="px-4 py-2 rounded-xl bg-[var(--mn-primary)] text-white text-xs font-bold hover:bg-[var(--mn-primary-hover)] transition-all shadow-2xs inline-flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#E5B54F]" />
              <span>استكشف دليل الدورات التدريبية</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Section 1: In-Progress Courses */}
          {(filter === 'ALL' || filter === 'IN_PROGRESS') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[#142B5F] dark:bg-[#0c1a3b] border border-[#D6A43B]/30 flex items-center justify-center text-[#E5B54F]">
                    <Clock3 className="w-3.5 h-3.5 text-[#E5B54F]" />
                  </div>
                  <h3 className="text-sm font-bold text-[var(--mn-heading)]">دورات قيد التعلم</h3>
                </div>
                <span className="text-xs font-semibold text-[var(--mn-text-muted)]">
                  {inProgressCourses.length} دورة
                </span>
              </div>

              {inProgressCourses.length === 0 ? (
                <div className="rounded-2xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] p-5 text-center text-xs text-[var(--mn-text-muted)] mn-panel">
                  لا توجد دورات قيد التعلم حاليًا.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {inProgressCourses.map((course) => (
                    <div
                      key={course.enrollmentId || course.courseId}
                      className="rounded-2xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] p-4 shadow-2xs mn-panel flex flex-col justify-between hover:border-[#D6A43B]/40 transition-all"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            قيد التعلم
                          </span>
                          <span className="text-xs font-bold text-[var(--mn-heading)]">
                            {course.progressPercentage}%
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-[var(--mn-heading)] mt-2 line-clamp-2">
                          {course.courseName}
                        </h4>

                        <div className="mt-3">
                          <progress
                            className="mn-native-progress mn-native-progress-secondary h-2 w-full"
                            value={Math.min(100, Math.max(0, course.progressPercentage))}
                            max={100}
                            aria-label="نسبة تقدم الدورة"
                          />
                        </div>

                        <div className="mt-2 text-[10.5px] text-[var(--mn-text-muted)]">
                          {course.lastAccessedAt ? (
                            <span>آخر وصول: <strong>{formatDate(course.lastAccessedAt)}</strong></span>
                          ) : (
                            <span>تاريخ التسجيل: <strong>{formatDate(course.enrolledAt)}</strong></span>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-[var(--mn-border)] dark:border-white/10 flex items-center justify-between">
                        <span className="text-[10px] text-[var(--mn-text-muted)]">منارة للتعليم</span>
                        <Link
                          to={`../student/courses/${encodeURIComponent(course.courseId)}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--mn-primary)] text-white text-xs font-bold hover:bg-[var(--mn-primary-hover)] transition-all shadow-2xs"
                        >
                          <span>متابعة التعلم</span>
                          <ArrowLeft className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section 2: Completed Courses */}
          {(filter === 'ALL' || filter === 'COMPLETED') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[#142B5F] dark:bg-[#0c1a3b] border border-[#D6A43B]/30 flex items-center justify-center text-[#E5B54F]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#E5B54F]" />
                  </div>
                  <h3 className="text-sm font-bold text-[var(--mn-heading)]">الدورات المكتملة</h3>
                </div>
                <span className="text-xs font-semibold text-[var(--mn-text-muted)]">
                  {completedCourses.length} دورة
                </span>
              </div>

              {completedCourses.length === 0 ? (
                <div className="rounded-2xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] p-5 text-center text-xs text-[var(--mn-text-muted)] mn-panel">
                  لا توجد دورات مكتملة حتى الآن.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {completedCourses.map((course) => (
                    <div
                      key={course.enrollmentId || course.courseId}
                      className="rounded-2xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] p-4 shadow-2xs mn-panel flex flex-col justify-between hover:border-[#D6A43B]/40 transition-all"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            مكتملة بنجاح
                          </span>
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            100%
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-[var(--mn-heading)] mt-2 line-clamp-2">
                          {course.courseName}
                        </h4>

                        <div className="mt-3 text-[10.5px] text-[var(--mn-text-muted)] flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span>تاريخ الإتمام: {formatDate(course.completedAt || course.lastAccessedAt)}</span>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-[var(--mn-border)] dark:border-white/10 flex items-center justify-between">
                        <span className="text-[10px] text-[var(--mn-text-muted)]">سجل التدريب</span>
                        <Link
                          to={`../student/courses/${encodeURIComponent(course.courseId)}`}
                          className="inline-flex items-center gap-1 text-xs font-bold text-[var(--mn-primary)] hover:underline"
                        >
                          <span>مراجعة المواد</span>
                          <ArrowLeft className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section 3: Certificates & Achievements */}
          {(filter === 'ALL' || filter === 'CERTIFICATES') && (
            <div id="certificates" className="space-y-3 scroll-mt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[#142B5F] dark:bg-[#0c1a3b] border border-[#D6A43B]/30 flex items-center justify-center text-[#E5B54F]">
                    <Award className="w-3.5 h-3.5 text-[#E5B54F]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--mn-heading)]">إنجازاتي وشهاداتي</h3>
                  </div>
                </div>
                <span className="text-xs font-semibold text-[var(--mn-text-muted)]">
                  {certificates.length} شهادة
                </span>
              </div>

              {certificates.length === 0 ? (
                <div className="rounded-2xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] p-6 text-center mn-panel">
                  <Award className="w-8 h-8 mx-auto text-[var(--mn-text-muted)] mb-2" />
                  <h4 className="font-bold text-sm text-[var(--mn-heading)]">لا توجد شهادات صادرة بعد</h4>
                  <p className="text-xs text-[var(--mn-text-muted)] mt-1 max-w-sm mx-auto">
                    تُصدر الشهادات المعتمدة تلقائيًا فور إتمام جميع متطلبات واختبارات الدورة التدريبية.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {certificates.map((cert) => {
                    const verifyCode = cert.verificationCode || cert.serialNumber || cert.publicId;
                    return (
                      <div
                        key={cert.id || cert.publicId}
                        className="rounded-2xl border border-[#D6A43B]/40 bg-gradient-to-br from-[var(--mn-surface)] to-[var(--mn-page)] p-4 shadow-2xs mn-panel flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-xl bg-[#142B5F] dark:bg-[#0c1a3b] border border-[#D6A43B]/40 flex items-center justify-center text-[#E5B54F]">
                                <Award className="w-4 h-4 text-[#E5B54F]" />
                              </div>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#D6A43B]/15 text-[#B38018] dark:text-[#E5B54F] border border-[#D6A43B]/30">
                                {cert.status === 'ACTIVE' ? 'شهادة معتمدة' : arabicStatus(cert.status)}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-[var(--mn-text-muted)]">
                              #{cert.serialNumber || cert.verificationCode}
                            </span>
                          </div>

                          <h4 className="text-sm font-bold text-[var(--mn-heading)] mt-2.5 line-clamp-2">
                            {cert.courseDisplayName}
                          </h4>

                          <div className="mt-2.5 text-[11px] text-[var(--mn-text-muted)] space-y-1">
                            <div>تاريخ الإصدار: <strong>{formatDate(cert.issuedAt)}</strong></div>
                            {cert.expiresAt && <div>تاريخ الانتهاء: <strong>{formatDate(cert.expiresAt)}</strong></div>}
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-[var(--mn-border)] dark:border-white/10 flex items-center justify-between">
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>موثقة رقمياً</span>
                          </span>
                          {verifyCode && (
                            <Link
                              to={`/certificates/verify?code=${encodeURIComponent(verifyCode)}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#142B5F] dark:bg-[#0c1a3b] border border-[#D6A43B]/40 text-[#E5B54F] text-xs font-bold hover:bg-[#112450] transition-all shadow-2xs"
                            >
                              <span>التحقق من الشهادة</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatParameterKey(key: string): string {
  const dictionary: Record<string, string> = {
    serviceCategory: 'تصنيف الخدمة',
    targetCountry: 'الدولة المستهدفة',
    academicLevel: 'المستوى الأكاديمي',
    notes: 'ملاحظات الطلب',
    details: 'تفاصيل واستفسارات',
    urgency: 'أولوية التنفيذ',
    preferredLanguage: 'لغة التواصل المفضلة',
    documentType: 'نوع الوثيقة',
    fullName: 'الاسم الكامل',
    phone: 'رقم الهاتف',
    email: 'البريد الإلكتروني',
    major: 'التخصص المطلوب',
    university: 'الجامعة المستهدفة',
    degreeLevel: 'المرحلة الدراسية',
    deadline: 'الموعد المرغوب',
    requirements: 'متطلبات إضافية',
    studyLanguage: 'لغة الدراسة',
    actionInstructions: 'تعليمات الإجراء المطلوب',
    instructions: 'التعليمات',
  };
  if (dictionary[key]) return dictionary[key];
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
}

function formatParameterValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'نعم' : 'لا';
  if (typeof value === 'object') {
    if (Array.isArray(value)) return value.map(formatParameterValue).join('، ');
    return JSON.stringify(value);
  }
  return String(value);
}

function getServiceRequestStatusBadge(status: string) {
  const normalized = status.toUpperCase();
  switch (normalized) {
    case 'COMPLETED':
    case 'FULFILLED':
    case 'RESOLVED':
      return {
        label: 'مكتمل بنجاح',
        className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      };
    case 'IN_PROGRESS':
    case 'PROCESSING':
    case 'IN_REVIEW':
      return {
        label: 'قيد المراجعة والتنفيذ',
        className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      };
    case 'ACTION_REQUIRED':
    case 'NEEDS_INPUT':
      return {
        label: 'يتطلب إجراء من الطالب',
        className: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
      };
    case 'PENDING':
    case 'SUBMITTED':
      return {
        label: 'تم الاستلام وجارٍ التحقق',
        className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      };
    case 'CANCELLED':
      return {
        label: 'ملغي',
        className: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
      };
    case 'REJECTED':
      return {
        label: 'مرفوض',
        className: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
      };
    default:
      return {
        label: status,
        className: 'bg-[var(--mn-page)] text-[var(--mn-heading)] border-[var(--mn-border)]',
      };
  }
}

function getInvoiceStatusBadge(status: string) {
  const normalized = status.toUpperCase();
  switch (normalized) {
    case 'PAID':
      return {
        label: 'مدفوعة بالكامل',
        className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      };
    case 'PENDING':
    case 'ISSUED':
    case 'UNPAID':
      return {
        label: 'بانتظار السداد',
        className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      };
    case 'PROCESSING':
      return {
        label: 'قيد المعالجة',
        className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      };
    case 'OVERDUE':
      return {
        label: 'متأخرة السداد',
        className: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
      };
    case 'VOIDED':
    case 'CANCELLED':
      return {
        label: 'ملغاة',
        className: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
      };
    case 'REFUNDED':
      return {
        label: 'مسترجعة',
        className: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
      };
    case 'DRAFT':
      return {
        label: 'مسودة',
        className: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
      };
    case 'FAILED':
      return {
        label: 'فشل السداد',
        className: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
      };
    default:
      return {
        label: status,
        className: 'bg-[var(--mn-page)] text-[var(--mn-text-muted)] border-[var(--mn-border)]',
      };
  }
}

const TECHNICAL_REQUEST_KEYS = new Set([
  'financeInvoiceId',
  'financeInvoicePublicId',
  'serviceId',
  'requestId',
  'providerReferenceId',
  'studentReferenceId',
  'actionInstructions',
  'instructions',
]);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function ServiceRequestsView({
  requests,
  selected,
  requestedNotFoundId,
  saving,
  onOpen,
  invoices,
  paymentsByInvoice,
  onTogglePayments,
}: {
  requests: StudentServiceRequestDto[];
  selected: StudentServiceRequestDto | null;
  requestedNotFoundId?: string | null;
  saving: boolean;
  onOpen: (id: string) => void;
  invoices: StudentFinanceInvoiceDto[];
  paymentsByInvoice: Record<string, StudentFinancePaymentDto[]>;
  onTogglePayments: (invoiceId: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<'REQUESTS' | 'INVOICES'>('REQUESTS');

  const pendingCount = useMemo(
    () => requests.filter((r) => r.status === 'PENDING' || r.status === 'SUBMITTED' || r.status === 'IN_PROGRESS' || r.status === 'PROCESSING').length,
    [requests],
  );

  const matchedInvoice = useMemo(() => {
    if (!selected) return undefined;
    return invoices.find(
      (inv) =>
        (selected.financeInvoiceId && inv.id === selected.financeInvoiceId) ||
        (selected.financeInvoicePublicId && inv.publicId === selected.financeInvoicePublicId),
    );
  }, [selected, invoices]);

  const hasAnyRequestsOrInvoices = requests.length > 0 || invoices.length > 0;

  return (
    <div className="space-y-5">
      {/* 1. Header Banner & Stats */}
      <div className="rounded-2xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] p-4 sm:p-5 shadow-2xs mn-panel">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2">
              <span className="text-[10px] font-bold text-[#142B5F] dark:text-[#E5B54F]">خدمات واستشارات</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#D6A43B]/10 text-[#D6A43B] font-semibold">مساحة الطالب</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-[var(--mn-heading)] mt-0.5">طلباتي ومدفوعاتي</h2>
            <p className="text-[11px] leading-relaxed text-[var(--mn-text-muted)] font-medium mt-1">
              متابعة حالة طلبات الخدمات الأكاديمية والاستشارية، تفاصيل المعايير، والفواتير والمدفوعات المرتبطة بحسابك.
            </p>
          </div>
          <Link
            to="/services"
            className="self-start sm:self-center shrink-0 px-3.5 py-1.5 rounded-xl bg-[var(--mn-primary)] text-white text-xs font-bold hover:bg-[var(--mn-primary-hover)] transition-all shadow-2xs flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#E5B54F]" />
            <span>استكشف الخدمات</span>
          </Link>
        </div>

        {/* 3 Metric Counters - Only shown when requests or invoices exist */}
        {hasAnyRequestsOrInvoices && (
          <div className="mt-4 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('REQUESTS')}
              className="rounded-xl bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] p-2.5 sm:p-3 text-center mn-panel cursor-pointer hover:border-[#D6A43B]/40 transition-colors"
            >
              <div className="text-base sm:text-lg font-bold text-[var(--mn-heading)]">{requests.length}</div>
              <div className="text-[9.5px] sm:text-[10px] font-semibold text-[var(--mn-text-muted)] mt-0.5">إجمالي الطلبات</div>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('REQUESTS')}
              className="rounded-xl bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] p-2.5 sm:p-3 text-center mn-panel cursor-pointer hover:border-[#D6A43B]/40 transition-colors"
            >
              <div className="text-base sm:text-lg font-bold text-[var(--mn-heading)]">{pendingCount}</div>
              <div className="text-[9.5px] sm:text-[10px] font-semibold text-[var(--mn-text-muted)] mt-0.5">قيد المراجعة والمعالجة</div>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('INVOICES')}
              className="rounded-xl bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] p-2.5 sm:p-3 text-center mn-panel cursor-pointer hover:border-[#D6A43B]/40 transition-colors"
            >
              <div className="text-base sm:text-lg font-bold text-[var(--mn-heading)]">{invoices.length}</div>
              <div className="text-[9.5px] sm:text-[10px] font-semibold text-[var(--mn-text-muted)] mt-0.5">الفواتير والمدفوعات</div>
            </button>
          </div>
        )}
      </div>

      {/* 2. Top Switcher (Requests vs Invoices) - Only shown when requests or invoices exist */}
      {hasAnyRequestsOrInvoices && (
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] dark:border-white/10 w-fit text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('REQUESTS')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
              activeTab === 'REQUESTS'
                ? 'bg-[var(--mn-primary)] text-white shadow-2xs'
                : 'text-[var(--mn-text-muted)] hover:bg-[var(--mn-page)]'
            }`}
          >
            طلبات الخدمات ({requests.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('INVOICES')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
              activeTab === 'INVOICES'
                ? 'bg-[var(--mn-primary)] text-white shadow-2xs'
                : 'text-[var(--mn-text-muted)] hover:bg-[var(--mn-page)]'
            }`}
          >
            الفواتير والمدفوعات ({invoices.length})
          </button>
        </div>
      )}

      {/* 3. Main Content View */}
      {!hasAnyRequestsOrInvoices ? (
        <div className="rounded-2xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] p-6 sm:p-8 text-center mn-panel shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-[#142B5F] dark:bg-[#0c1a3b] border border-[#D6A43B]/40 flex items-center justify-center text-[#E5B54F] mx-auto mb-3.5 shadow-xs">
            <ClipboardList className="w-6 h-6 text-[#E5B54F]" />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-[var(--mn-heading)]">لا توجد طلبات خدمات أو استشارات سابقة</h3>
          <p className="text-xs text-[var(--mn-text-muted)] mt-2 leading-relaxed max-w-lg mx-auto">
            تصفح دليل الخدمات الأكاديمية والاستشارية المتاحة. عند تقديم أي طلب، ستتمكن من متابعة مراحل التنفيذ، مراجعة التحديثات، والاطلاع على الفواتير وإيصالات السداد المرتبطة بالطلب هنا مباشرة.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/services"
              className="px-4 py-2 rounded-xl bg-[var(--mn-primary)] text-white text-xs font-bold hover:bg-[var(--mn-primary-hover)] transition-all shadow-2xs inline-flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#E5B54F]" />
              <span>استكشف دليل الخدمات والاستشارات</span>
            </Link>
          </div>
        </div>
      ) : activeTab === 'REQUESTS' ? (
        requests.length === 0 ? (
          <div className="rounded-2xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] p-6 text-center mn-panel">
            <ClipboardList className="w-8 h-8 mx-auto text-[var(--mn-text-muted)] mb-2" />
            <h3 className="font-bold text-sm text-[var(--mn-heading)]">لا توجد طلبات خدمات نشطة</h3>
            <p className="text-xs text-[var(--mn-text-muted)] mt-1 max-w-sm mx-auto">
              يمكنك الاطلاع على تبويب الفواتير والمدفوعات بالأعلى أو تقديم طلب جديد عبر دليل الخدمات.
            </p>
            <Link
              to="/services"
              className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[var(--mn-primary)] text-white text-xs font-bold hover:bg-[var(--mn-primary-hover)] transition-all"
            >
              <span>دليل الخدمات</span>
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_1.35fr]">
            {/* Left Column: Requests List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-bold text-[var(--mn-heading)]">سجل الطلبات المقدمة</h3>
                <span className="text-[11px] text-[var(--mn-text-muted)]">{requests.length} طلب</span>
              </div>

              <div className="space-y-2.5">
                {requests.map((request) => {
                  const statusInfo = getServiceRequestStatusBadge(request.status);
                  const isSelected = selected?.id === request.id || selected?.publicId === request.publicId;
                  const hasDirectInvoice = !!(
                    (request.financeInvoiceId && invoices.some((i) => i.id === request.financeInvoiceId)) ||
                    (request.financeInvoicePublicId && invoices.some((i) => i.publicId === request.financeInvoicePublicId))
                  );

                  return (
                    <button
                      key={request.id}
                      type="button"
                      disabled={saving}
                      onClick={() => onOpen(request.publicId || request.id)}
                      className={`w-full text-right rounded-2xl border p-3.5 transition-all cursor-pointer mn-panel ${
                        isSelected
                          ? 'border-[#D6A43B] bg-[var(--mn-surface)] ring-1 ring-[#D6A43B]/40 shadow-xs'
                          : 'border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] hover:border-[#D6A43B]/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-[#142B5F] dark:bg-[#0c1a3b] border border-[#D6A43B]/30 flex items-center justify-center text-[#E5B54F] shrink-0">
                            <ClipboardList className="w-4 h-4 text-[#E5B54F]" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-xs sm:text-sm text-[var(--mn-heading)] truncate">
                              طلب خدمة رقم #{request.publicId}
                            </div>
                            <div className="text-[10px] text-[var(--mn-text-muted)] mt-0.5">
                              تاريخ التقديم: {formatDate(request.createdAt)}
                            </div>
                          </div>
                        </div>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${statusInfo.className}`}>
                          {statusInfo.label}
                        </span>
                      </div>

                      {hasDirectInvoice && (
                        <div className="mt-2.5 pt-2 border-t border-[var(--mn-border)] dark:border-white/10 flex items-center justify-end text-[10px] text-[#B38018] dark:text-[#E5B54F] font-semibold">
                          <span className="inline-flex items-center gap-1">
                            <Receipt className="w-3 h-3" />
                            <span>مرتبط بفاتورة معتمدة</span>
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Selected Request Details */}
            <div>
              {selected ? (
                <div className="rounded-2xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] p-4 sm:p-5 shadow-2xs mn-panel space-y-5">
                  {/* Top Details Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--mn-border)] dark:border-white/10">
                    <div>
                      <span className="text-[10px] font-bold text-[#142B5F] dark:text-[#E5B54F]">تفاصيل الطلب المحدد</span>
                      <h3 className="text-base font-bold text-[var(--mn-heading)] mt-0.5">
                        طلب خدمة رقم <span className="font-mono text-[#D6A43B]">#{selected.publicId}</span>
                      </h3>
                      <div className="text-[11px] text-[var(--mn-text-muted)] mt-1">
                        تاريخ الإنشاء: {formatDate(selected.createdAt)} · آخر تحديث: {formatDate(selected.updatedAt)}
                      </div>
                    </div>

                    <span className={`self-start sm:self-center text-xs font-bold px-3 py-1 rounded-full border ${getServiceRequestStatusBadge(selected.status).className}`}>
                      {getServiceRequestStatusBadge(selected.status).label}
                    </span>
                  </div>

                  {/* Action Required Banner if applicable */}
                  {(selected.status.toUpperCase() === 'ACTION_REQUIRED' || selected.status.toUpperCase() === 'NEEDS_INPUT') && (
                    <div className="rounded-xl bg-[var(--mn-warning-soft)] border border-[var(--mn-warning-border)] p-3.5 text-xs text-[var(--mn-warning-text)] flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold">يتطلب هذا الطلب إجراءً منك</div>
                        {selected.fulfillmentMetadata && (selected.fulfillmentMetadata.instructions || selected.fulfillmentMetadata.actionInstructions) ? (
                          <div className="mt-1 leading-relaxed text-[11px]">
                            {String(selected.fulfillmentMetadata.instructions || selected.fulfillmentMetadata.actionInstructions)}
                          </div>
                        ) : (
                          <div className="mt-0.5 leading-relaxed text-[11px]">
                            يرجى مراجعة تفاصيل وملاحظات الطلب لاستكمال المعالجة أو التواصل مع الدعم الأكاديمي.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Structured Request Parameters (Human-friendly, No raw JSON, No technical UUIDs) */}
                  <div>
                    <h4 className="text-xs font-bold text-[var(--mn-heading)] mb-2.5 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-[#D6A43B]" />
                      <span>بيانات ومعايير الطلب المسجلة</span>
                    </h4>

                    {selected.requestParameters && Object.keys(selected.requestParameters).length > 0 ? (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {Object.entries(selected.requestParameters)
                          .filter(([key, value]) => !TECHNICAL_REQUEST_KEYS.has(key) && !UUID_PATTERN.test(String(value)))
                          .map(([key, value]) => (
                            <div
                              key={key}
                              className="rounded-xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] p-2.5 text-xs"
                            >
                              <div className="text-[10.5px] font-semibold text-[var(--mn-text-muted)]">
                                {formatParameterKey(key)}
                              </div>
                              <div className="font-bold text-[var(--mn-heading)] mt-0.5 break-words">
                                {formatParameterValue(value)}
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] p-3 text-xs text-[var(--mn-text-muted)]">
                        لا توجد معايير إضافية مدخلة لهذا الطلب.
                      </div>
                    )}
                  </div>

                  {/* Actual Real Timestamps Timeline */}
                  <div>
                    <h4 className="text-xs font-bold text-[var(--mn-heading)] mb-2.5 flex items-center gap-1.5">
                      <CalendarClock className="w-3.5 h-3.5 text-[#D6A43B]" />
                      <span>سجل المواعيد والتوثيق</span>
                    </h4>

                    <div className="space-y-2 text-xs">
                      <div className="p-2.5 rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] flex items-center justify-between">
                        <span className="text-[var(--mn-text-muted)]">تاريخ تقديم الطلب:</span>
                        <span className="font-bold text-[var(--mn-heading)]">{formatDate(selected.createdAt)}</span>
                      </div>
                      <div className="p-2.5 rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] flex items-center justify-between">
                        <span className="text-[var(--mn-text-muted)]">آخر تحديث من النظام:</span>
                        <span className="font-bold text-[var(--mn-heading)]">{formatDate(selected.updatedAt)}</span>
                      </div>
                      {selected.completedAt && (
                        <div className="p-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between">
                          <span className="text-emerald-700 dark:text-emerald-300 font-semibold">تاريخ إتمام الخدمة:</span>
                          <span className="font-bold text-emerald-700 dark:text-emerald-300">{formatDate(selected.completedAt)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Linked Invoice if directly and strictly verified */}
                  {matchedInvoice && (
                    <div className="rounded-xl border border-[#D6A43B]/40 bg-gradient-to-br from-[var(--mn-surface)] to-[var(--mn-page)] p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-[#142B5F] dark:bg-[#0c1a3b] border border-[#D6A43B]/30 flex items-center justify-center text-[#E5B54F]">
                            <Receipt className="w-3.5 h-3.5 text-[#E5B54F]" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-[var(--mn-heading)]">
                              فاتورة مرتبطة #{matchedInvoice.invoiceNumber || matchedInvoice.publicId}
                            </div>
                            <div className="text-[10px] text-[var(--mn-text-muted)]">
                              تاريخ الإصدار: {formatDate(matchedInvoice.issuedAt || matchedInvoice.updatedAt)}
                            </div>
                          </div>
                        </div>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getInvoiceStatusBadge(matchedInvoice.status).className}`}>
                          {getInvoiceStatusBadge(matchedInvoice.status).label}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--mn-border)]">
                        <div className="p-2 rounded-lg bg-[var(--mn-surface)] border border-[var(--mn-border)]">
                          <div className="text-[10px] text-[var(--mn-text-muted)]">إجمالي المبلغ:</div>
                          <div className="text-xs font-bold text-[var(--mn-heading)] mt-0.5">
                            {formatMoney(matchedInvoice.totalAmount)}
                          </div>
                        </div>
                        <div className="p-2 rounded-lg bg-[var(--mn-surface)] border border-[var(--mn-border)]">
                          <div className="text-[10px] text-[var(--mn-text-muted)]">المبلغ المستحق:</div>
                          <div className="text-xs font-bold text-[#D6A43B] mt-0.5">
                            {formatMoney(matchedInvoice.amountDue)}
                          </div>
                        </div>
                      </div>

                      {matchedInvoice.dueDate && (
                        <div className="text-[10.5px] text-[var(--mn-text-muted)] flex items-center gap-1">
                          <span>تاريخ الاستحقاق:</span>
                          <strong>{formatDate(matchedInvoice.dueDate)}</strong>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => onTogglePayments(matchedInvoice.id)}
                        className="w-full text-center py-1.5 rounded-lg border border-[var(--mn-border)] text-xs font-bold text-[var(--mn-primary)] hover:bg-[var(--mn-page)] transition-colors cursor-pointer"
                      >
                        {paymentsByInvoice[matchedInvoice.id] ? 'إخفاء سجل الدفعات' : 'عرض سجل الدفعات'}
                      </button>

                      {paymentsByInvoice[matchedInvoice.id] && (
                        <div className="space-y-1.5 pt-2 border-t border-[var(--mn-border)]">
                          {paymentsByInvoice[matchedInvoice.id].length === 0 ? (
                            <div className="text-xs text-[var(--mn-text-muted)] text-center py-1">
                              لا توجد عمليات دفع مسجلة حتى الآن.
                            </div>
                          ) : (
                            paymentsByInvoice[matchedInvoice.id].map((payment) => (
                              <div
                                key={payment.id}
                                className="p-2 rounded-lg bg-[var(--mn-surface)] border border-[var(--mn-border)] flex items-center justify-between text-xs"
                              >
                                <div>
                                  <div className="font-bold text-[var(--mn-heading)]">{formatMoney(payment.amount)}</div>
                                  <div className="text-[10px] text-[var(--mn-text-muted)]">{formatDate(payment.createdAt)} · {payment.paymentMethod}</div>
                                </div>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                  {payment.status === 'CAPTURED' || payment.status === 'SUCCESS' ? 'ناجحة' : payment.status}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : requestedNotFoundId ? (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-8 text-center mn-panel">
                  <AlertTriangle className="w-8 h-8 mx-auto text-amber-600 dark:text-amber-400 mb-2" />
                  <h3 className="font-bold text-sm text-[var(--mn-heading)]">الطلب المطلوب غير موجود أو غير مصرّح بعرضه</h3>
                  <p className="text-xs text-[var(--mn-text-muted)] mt-1.5 max-w-xs mx-auto leading-relaxed">
                    المعرّف المُدخل <span className="font-mono font-bold">#{requestedNotFoundId}</span> لا يطابق أي طلب في سجلك المصرح به. يمكنك اختيار أحد طلباتك من القائمة المقابلة.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] p-8 text-center mn-panel">
                  <ClipboardList className="w-8 h-8 mx-auto text-[var(--mn-text-muted)] mb-2" />
                  <h3 className="font-bold text-sm text-[var(--mn-heading)]">اختر طلبًا لعرض تفاصيله</h3>
                  <p className="text-xs text-[var(--mn-text-muted)] mt-1 max-w-xs mx-auto">
                    اضغط على أي طلب من القائمة المقابلة للاطلاع على تفاصيل المعايير والمواعيد والفاتورة المرتبطة.
                  </p>
                </div>
              )}
            </div>
          </div>
        )
      ) : (
        /* Invoices Full Section */
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-bold text-[var(--mn-heading)]">سجل الفواتير والمدفوعات</h3>
            <span className="text-[11px] text-[var(--mn-text-muted)]">{invoices.length} فاتورة</span>
          </div>

          {invoices.length === 0 ? (
            <div className="rounded-2xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] p-6 text-center mn-panel">
              <CreditCard className="w-8 h-8 mx-auto text-[var(--mn-text-muted)] mb-2" />
              <h4 className="font-bold text-sm text-[var(--mn-heading)]">لا توجد فواتير أو مدفوعات مسجلة بحسابك</h4>
              <p className="text-xs text-[var(--mn-text-muted)] mt-1 max-w-sm mx-auto">
                عند طلب خدمات مدفوعة أو استشارات خاصة ستظهر فواتيرك وإيصالات السداد هنا.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {invoices.map((invoice) => {
                const statusInfo = getInvoiceStatusBadge(invoice.status);
                const hasPayments = !!paymentsByInvoice[invoice.id];

                return (
                  <div
                    key={invoice.id}
                    className="rounded-2xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] p-4 shadow-2xs mn-panel flex flex-col justify-between hover:border-[#D6A43B]/40 transition-all"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-[#142B5F] dark:bg-[#0c1a3b] border border-[#D6A43B]/30 flex items-center justify-center text-[#E5B54F]">
                            <Receipt className="w-4 h-4 text-[#E5B54F]" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-[var(--mn-heading)]">
                              فاتورة #{invoice.invoiceNumber || invoice.publicId}
                            </div>
                            <div className="text-[10px] text-[var(--mn-text-muted)]">
                              تاريخ الإصدار: {formatDate(invoice.issuedAt || invoice.updatedAt)}
                            </div>
                          </div>
                        </div>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusInfo.className}`}>
                          {statusInfo.label}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-[var(--mn-border)]">
                        <div className="p-2 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)]">
                          <div className="text-[10px] text-[var(--mn-text-muted)]">إجمالي الفاتورة:</div>
                          <div className="text-xs font-bold text-[var(--mn-heading)] mt-0.5">
                            {formatMoney(invoice.totalAmount)}
                          </div>
                        </div>
                        <div className="p-2 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)]">
                          <div className="text-[10px] text-[var(--mn-text-muted)]">المتبقي للدفع:</div>
                          <div className="text-xs font-bold text-[#D6A43B] mt-0.5">
                            {formatMoney(invoice.amountDue)}
                          </div>
                        </div>
                      </div>

                      {invoice.dueDate && (
                        <div className="mt-2 text-[10.5px] text-[var(--mn-text-muted)]">
                          تاريخ الاستحقاق: <strong>{formatDate(invoice.dueDate)}</strong>
                        </div>
                      )}

                      {invoice.lineItems && invoice.lineItems.length > 0 && (
                        <div className="mt-2.5 space-y-1">
                          <div className="text-[10px] font-bold text-[var(--mn-heading)]">بنود الفاتورة:</div>
                          {invoice.lineItems.map((item, idx) => (
                            <div key={idx} className="text-[10.5px] text-[var(--mn-text-muted)] flex justify-between">
                              <span>{item.description}</span>
                              <span className="font-mono font-semibold">{formatMoney(item.totalPrice)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-[var(--mn-border)]">
                      <button
                        type="button"
                        onClick={() => onTogglePayments(invoice.id)}
                        className="w-full text-center py-1.5 rounded-xl border border-[var(--mn-border)] text-xs font-bold text-[var(--mn-primary)] hover:bg-[var(--mn-page)] transition-colors cursor-pointer"
                      >
                        {hasPayments ? 'إخفاء سجل المعاملات' : 'عرض سجل عمليات الدفع'}
                      </button>

                      {hasPayments && (
                        <div className="space-y-1.5 mt-2 pt-2 border-t border-[var(--mn-border)]">
                          {paymentsByInvoice[invoice.id].length === 0 ? (
                            <div className="text-xs text-[var(--mn-text-muted)] text-center py-1">
                              لا توجد عمليات دفع مسجلة لهذه الفاتورة.
                            </div>
                          ) : (
                            paymentsByInvoice[invoice.id].map((payment) => (
                              <div
                                key={payment.id}
                                className="p-2 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] flex items-center justify-between text-xs"
                              >
                                <div>
                                  <div className="font-bold text-[var(--mn-heading)]">{formatMoney(payment.amount)}</div>
                                  <div className="text-[10px] text-[var(--mn-text-muted)]">{formatDate(payment.createdAt)} · {payment.paymentMethod}</div>
                                </div>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                  {payment.status === 'CAPTURED' || payment.status === 'SUCCESS' ? 'ناجحة' : payment.status}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function VaultView({
  dashboard,
  hydratedSavedItems,
  saving,
  onCreateCollection,
  onRenameCollection,
  onDeleteCollection,
  onMoveSavedItem,
  onRemoveSavedItem,
}: {
  dashboard: StudentDashboardSummaryDto;
  hydratedSavedItems: HydratedStudentSavedItemDto[];
  saving: boolean;
  onCreateCollection: (event: FormEvent<HTMLFormElement>) => void;
  onRenameCollection: (collectionId: string, currentName: string) => void;
  onDeleteCollection: (collectionId: string, name: string) => void;
  onMoveSavedItem: (itemId: string, collectionId: string | null) => void;
  onRemoveSavedItem: (item: StudentSavedItemDto) => void;
}) {
  const [typeFilter, setTypeFilter] = useState<'ALL' | string>('ALL');
  const [collectionFilter, setCollectionFilter] = useState<'ALL' | 'UNCOLLECTED' | string>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const hydratedBySavedItemId = useMemo(() => {
    return new Map(hydratedSavedItems.map((item) => [item.savedItem.id, item.owner]));
  }, [hydratedSavedItems]);

  const savedItems = dashboard.savedItems;
  const collections = dashboard.collections;

  const filteredItems = useMemo(() => {
    return savedItems.filter((item) => {
      if (typeFilter !== 'ALL' && item.entityType !== typeFilter) return false;
      if (collectionFilter === 'UNCOLLECTED') {
        if (item.collectionId) return false;
      } else if (collectionFilter !== 'ALL') {
        if (item.collectionId !== collectionFilter) return false;
      }
      return true;
    });
  }, [savedItems, typeFilter, collectionFilter]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: savedItems.length,
      SCHOLARSHIP: 0,
      UNIVERSITY: 0,
      MAJOR: 0,
      COURSE: 0,
      STUDENT_TOOL: 0,
    };
    for (const item of savedItems) {
      if (counts[item.entityType] !== undefined) {
        counts[item.entityType]++;
      } else {
        counts[item.entityType] = (counts[item.entityType] || 0) + 1;
      }
    }
    return counts;
  }, [savedItems]);

  const supportedTypes = [
    { id: 'ALL', label: 'الكل' },
    { id: 'SCHOLARSHIP', label: 'المنح' },
    { id: 'UNIVERSITY', label: 'الجامعات' },
    { id: 'MAJOR', label: 'التخصصات' },
    { id: 'COURSE', label: 'الدورات' },
  ];

  function getEntityIcon(type: string) {
    switch (type) {
      case 'SCHOLARSHIP':
        return <GraduationCap className="w-4 h-4 text-[#E5B54F]" />;
      case 'UNIVERSITY':
        return <Compass className="w-4 h-4 text-[#E5B54F]" />;
      case 'MAJOR':
        return <BookOpen className="w-4 h-4 text-[#E5B54F]" />;
      case 'COURSE':
        return <Clock3 className="w-4 h-4 text-[#E5B54F]" />;
      case 'STUDENT_TOOL':
        return <Sparkles className="w-4 h-4 text-[#E5B54F]" />;
      default:
        return <Star className="w-4 h-4 text-[#E5B54F]" />;
    }
  }

  function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    onCreateCollection(event);
    setShowCreateModal(false);
  }

  return (
    <div className="space-y-5">
      {/* 1. Header Banner & Quick Counters */}
      <div className="rounded-2xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] p-4 sm:p-5 shadow-2xs mn-panel">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2">
              <span className="text-[10px] font-bold text-[#142B5F] dark:text-[#E5B54F]">خزنة المحفوظات</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#D6A43B]/10 text-[#D6A43B] font-semibold">مساحة الطالب</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-[var(--mn-heading)] mt-0.5">محفوظاتي ومجموعاتي</h2>
            <p className="text-[11px] leading-relaxed text-[var(--mn-text-muted)] font-medium mt-1">
              مساحة موحدة لكل ما تحفظه من منح، جامعات، تخصصات ودورات للرجوع إليها في أي وقت وتنظيمها في مجموعات.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCreateModal((v) => !v)}
              className="px-3.5 py-1.5 rounded-xl border border-[#D6A43B]/40 bg-[var(--mn-page)] text-xs font-bold text-[var(--mn-heading)] hover:border-[#D6A43B] transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Folder className="w-3.5 h-3.5 text-[#D6A43B]" />
              <span>{showCreateModal ? 'إغلاق النموذج' : 'مجموعة جديدة'}</span>
            </button>
            <Link
              to="/scholarships"
              className="px-3.5 py-1.5 rounded-xl bg-[var(--mn-primary)] text-white text-xs font-bold hover:bg-[var(--mn-primary-hover)] transition-all shadow-2xs flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#E5B54F]" />
              <span>استكشف المزيد</span>
            </Link>
          </div>
        </div>

        {/* Quick Stats Row - Only shown when saved items exist */}
        {savedItems.length > 0 && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-xl bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] p-2.5 sm:p-3 text-center mn-panel">
              <div className="text-base sm:text-lg font-bold text-[var(--mn-heading)]">{savedItems.length}</div>
              <div className="text-[9.5px] sm:text-[10px] font-semibold text-[var(--mn-text-muted)] mt-0.5">إجمالي المحفوظات</div>
            </div>
            <div className="rounded-xl bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] p-2.5 sm:p-3 text-center mn-panel">
              <div className="text-base sm:text-lg font-bold text-[var(--mn-heading)]">{collections.length}</div>
              <div className="text-[9.5px] sm:text-[10px] font-semibold text-[var(--mn-text-muted)] mt-0.5">مجموعات شخصية</div>
            </div>
            <div className="rounded-xl bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] p-2.5 sm:p-3 text-center mn-panel">
              <div className="text-base sm:text-lg font-bold text-[var(--mn-heading)]">{typeCounts.SCHOLARSHIP || 0}</div>
              <div className="text-[9.5px] sm:text-[10px] font-semibold text-[var(--mn-text-muted)] mt-0.5">منح محفوظة</div>
            </div>
            <div className="rounded-xl bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] p-2.5 sm:p-3 text-center mn-panel">
              <div className="text-base sm:text-lg font-bold text-[var(--mn-heading)]">
                {(typeCounts.UNIVERSITY || 0) + (typeCounts.MAJOR || 0) + (typeCounts.COURSE || 0)}
              </div>
              <div className="text-[9.5px] sm:text-[10px] font-semibold text-[var(--mn-text-muted)] mt-0.5">جامعات وبرامج</div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Create Collection Inline Card */}
      {showCreateModal && (
        <form
          onSubmit={handleCreateSubmit}
          className="rounded-2xl border border-[#D6A43B]/40 bg-[var(--mn-surface)] p-4 sm:p-5 shadow-2xs mn-panel animate-in fade-in duration-200"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-xl bg-[#142B5F] dark:bg-[#0c1a3b] border border-[#D6A43B]/30 flex items-center justify-center text-[#E5B54F]">
              <Folder className="w-3.5 h-3.5 text-[#E5B54F]" />
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-[var(--mn-heading)]">إنشاء مجموعة مخصصة جديدة</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-[var(--mn-text-muted)] mb-1" htmlFor="newCollectionName">
                اسم المجموعة *
              </label>
              <input
                id="newCollectionName"
                name="collectionName"
                required
                maxLength={80}
                placeholder="مثال: منح أوروبا 2026"
                className="w-full rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] px-3 py-2 text-xs font-semibold text-[var(--mn-heading)] outline-none focus:border-[#D6A43B]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--mn-text-muted)] mb-1" htmlFor="newCollectionDesc">
                الوصف (اختياري)
              </label>
              <input
                id="newCollectionDesc"
                name="collectionDescription"
                maxLength={240}
                placeholder="ملاحظة حول أهداف المجموعة..."
                className="w-full rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] px-3 py-2 text-xs text-[var(--mn-heading)] outline-none focus:border-[#D6A43B]"
              />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-3 py-1.5 rounded-xl border text-xs font-semibold text-[var(--mn-text-muted)] hover:bg-[var(--mn-page)] cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 rounded-xl bg-[var(--mn-primary)] text-white text-xs font-bold hover:bg-[var(--mn-primary-hover)] disabled:opacity-50 cursor-pointer shadow-2xs"
            >
              حفظ المجموعة
            </button>
          </div>
        </form>
      )}

      {/* 3. Collections Badges / Filter Bar */}
      {collections.length > 0 && (
        <div className="rounded-2xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] p-3 sm:p-4 shadow-2xs mn-panel">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <span className="text-xs font-bold text-[var(--mn-heading)]">مجموعاتي الشخصية ({collections.length})</span>
            <span className="text-[10px] text-[var(--mn-text-muted)]">اضغط لتصفية العناصر حسب المجموعة</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCollectionFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                collectionFilter === 'ALL'
                  ? 'bg-[#142B5F] text-[#E5B54F] border-[#D6A43B]/40 shadow-2xs'
                  : 'bg-[var(--mn-page)] text-[var(--mn-text-muted)] border-[var(--mn-border)] hover:border-[#D6A43B]/30'
              }`}
            >
              جميع المجموعات ({savedItems.length})
            </button>
            {collections.map((coll) => (
              <div key={coll.id} className="inline-flex items-center rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setCollectionFilter(coll.id)}
                  className={`px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    collectionFilter === coll.id
                      ? 'bg-[#142B5F] text-[#E5B54F]'
                      : 'text-[var(--mn-heading)] hover:text-[#D6A43B]'
                  }`}
                >
                  {coll.name} ({coll.itemCount})
                </button>
                {coll.type === 'PERSONAL' && (
                  <div className="flex items-center px-1 bg-[var(--mn-surface)] border-r border-[var(--mn-border)] gap-1">
                    <button
                      type="button"
                      disabled={saving}
                      title="تعديل اسم المجموعة"
                      onClick={() => onRenameCollection(coll.id, coll.name)}
                      className="p-1 text-[10px] text-[var(--mn-text-muted)] hover:text-[#D6A43B] cursor-pointer"
                    >
                      تعديل
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      title="حذف المجموعة"
                      onClick={() => onDeleteCollection(coll.id, coll.name)}
                      className="p-1 text-[10px] text-[var(--mn-danger-text)] hover:brightness-75 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setCollectionFilter('UNCOLLECTED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                collectionFilter === 'UNCOLLECTED'
                  ? 'bg-[#142B5F] text-[#E5B54F] border-[#D6A43B]/40 shadow-2xs'
                  : 'bg-[var(--mn-page)] text-[var(--mn-text-muted)] border-[var(--mn-border)] hover:border-[#D6A43B]/30'
              }`}
            >
              دون مجموعة
            </button>
          </div>
        </div>
      )}

      {/* 4. Entity Type Filter Pills - Only shown when saved items exist */}
      {savedItems.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] dark:border-white/10 w-fit text-xs font-medium">
          {supportedTypes.map((type) => {
            const count = typeCounts[type.id] || 0;
            return (
              <button
                key={type.id}
                type="button"
                onClick={() => setTypeFilter(type.id)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
                  typeFilter === type.id
                    ? 'bg-[var(--mn-primary)] text-white shadow-2xs'
                    : 'text-[var(--mn-text-muted)] hover:bg-[var(--mn-page)]'
                }`}
              >
                {type.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* 5. Main Saved Items List or Useful Empty State */}
      {savedItems.length === 0 ? (
        collections.length > 0 ? (
          <div className="rounded-2xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] p-6 sm:p-8 text-center mn-panel shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-[#142B5F] dark:bg-[#0c1a3b] border border-[#D6A43B]/40 flex items-center justify-center text-[#E5B54F] mx-auto mb-3.5 shadow-xs">
              <Folder className="w-6 h-6 text-[#E5B54F]" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-[var(--mn-heading)]">مجموعتك جاهزة لاستقبال المحفوظات</h3>
            <p className="text-xs text-[var(--mn-text-muted)] mt-2 leading-relaxed max-w-md mx-auto">
              لديك <strong className="text-[var(--mn-heading)]">{collections.length === 1 ? `مجموعة «${collections[0].name}»` : `${collections.length} مجموعات شخصية`}</strong> منشأة وجاهزة، ولكنها فارغة حاليًا. يمكنك تصفح المنح والجامعات والدورات والضغط على رمز القلب في صفحات الموقع لحفظها وإضافتها مباشرة إليها.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
              <Link
                to="/scholarships"
                className="px-4 py-2 rounded-xl bg-[var(--mn-primary)] text-white text-xs font-bold hover:bg-[var(--mn-primary-hover)] transition-all shadow-2xs inline-flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#E5B54F]" />
                <span>استكشف المنح والفرص لحفظها</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] p-6 sm:p-8 text-center mn-panel shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-[#142B5F] dark:bg-[#0c1a3b] border border-[#D6A43B]/40 flex items-center justify-center text-[#E5B54F] mx-auto mb-3.5 shadow-xs">
              <Heart className="w-6 h-6 text-[#E5B54F]" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-[var(--mn-heading)]">خزنة محفوظاتك فارغة حاليًا</h3>
            <p className="text-xs text-[var(--mn-text-muted)] mt-2 leading-relaxed max-w-md mx-auto">
              استكشف دليل المنح والجامعات والتخصصات والدورات، واضغط على علامة القلب لحفظ ما يهمك هنا وتنظيمه في مجموعات مخصصة.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
              <Link
                to="/scholarships"
                className="px-4 py-2 rounded-xl bg-[var(--mn-primary)] text-white text-xs font-bold hover:bg-[var(--mn-primary-hover)] transition-all shadow-2xs inline-flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#E5B54F]" />
                <span>استكشف المنح والفرص</span>
              </Link>
            </div>
          </div>
        )
      ) : filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] p-8 text-center mn-panel">
          <Heart className="w-8 h-8 mx-auto text-[var(--mn-text-muted)] mb-2" />
          <h3 className="font-bold text-sm text-[var(--mn-heading)]">لا توجد عناصر مطابقة للتصفية المختارة</h3>
          <p className="text-xs text-[var(--mn-text-muted)] mt-1 max-w-sm mx-auto">
            جرّب تغيير نوع العنصر أو اختيار «جميع المجموعات» لعرض باقي المحفوظات.
          </p>
          <button
            type="button"
            onClick={() => {
              setTypeFilter('ALL');
              setCollectionFilter('ALL');
            }}
            className="mt-3 px-3.5 py-1.5 rounded-xl bg-[var(--mn-primary)] text-white text-xs font-bold hover:bg-[var(--mn-primary-hover)] transition-all cursor-pointer"
          >
            إعادة ضبط التصفية
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredItems.map((item) => {
            const owner = hydratedBySavedItemId.get(item.id);
            const displayName = owner?.displayName || item.displayName || item.entityId;
            const slug = owner?.slug || item.entitySlug || undefined;
            const available = owner ? owner.available : true;
            const country = owner?.country;
            const targetUrl = slug
              ? buildEntityLink(item.entityType, slug)
              : item.entityType === 'STUDENT_TOOL'
                ? '/tools'
                : null;

            return (
              <div
                key={item.id}
                className="rounded-2xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] p-4 shadow-2xs mn-panel flex flex-col justify-between hover:border-[#D6A43B]/40 transition-all"
              >
                <div>
                  {/* Top Badges Row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-[#142B5F] dark:bg-[#0c1a3b] border border-[#D6A43B]/30 flex items-center justify-center text-[#E5B54F] shrink-0">
                        {getEntityIcon(item.entityType)}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[var(--mn-page)] text-[var(--mn-heading)] border border-[var(--mn-border)]">
                          {arabicEntityType(item.entityType)}
                        </span>
                        {country && (
                          <span className="text-[10px] font-medium text-[var(--mn-text-muted)] bg-[var(--mn-page)] px-2 py-0.5 rounded-md border border-[var(--mn-border)]">
                            {country}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => onRemoveSavedItem(item)}
                      title="إزالة من المحفوظات"
                      className="text-[var(--mn-text-muted)] hover:text-red-500 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Title & Date */}
                  <h3 className="text-sm font-bold text-[var(--mn-heading)] mt-2.5 line-clamp-2">
                    {displayName}
                  </h3>

                  {/* Unavailability Notice */}
                  {!available && (
                    <div className="mt-2 rounded-lg bg-[var(--mn-warning-soft)] p-2 text-[10.5px] font-medium text-[var(--mn-warning-text)] flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>غير معروض حاليًا لدى المصدر؛ وسجلك محفوظ.</span>
                    </div>
                  )}

                  {/* Saved Date */}
                  <div className="mt-2 text-[10.5px] text-[var(--mn-text-muted)]">
                    حُفظ في: <strong>{formatDate(item.createdAt)}</strong>
                  </div>
                </div>

                {/* Bottom Actions: Move to collection + Direct Link */}
                <div className="mt-4 pt-3 border-t border-[var(--mn-border)] dark:border-white/10 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <label className="sr-only" htmlFor={`move-${item.id}`}>نقل إلى مجموعة</label>
                    <select
                      id={`move-${item.id}`}
                      aria-label="نقل العنصر إلى مجموعة"
                      value={item.collectionId ?? ''}
                      disabled={saving}
                      onChange={(event) => onMoveSavedItem(item.id, event.target.value || null)}
                      className="w-full rounded-lg border border-[var(--mn-border)] bg-[var(--mn-page)] px-2 py-1 text-[11px] font-medium text-[var(--mn-heading)] outline-none focus:border-[#D6A43B]"
                    >
                      <option value="">دون مجموعة</option>
                      {collections.map((coll) => (
                        <option key={coll.id} value={coll.id}>
                          📁 {coll.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {targetUrl && (
                    <Link
                      to={targetUrl}
                      className="shrink-0 inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[var(--mn-primary)] text-white text-xs font-bold hover:bg-[var(--mn-primary-hover)] transition-all shadow-2xs"
                    >
                      <span>فتح</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StudentAvatarAssetPicker({ currentAssetId }: { currentAssetId: string | null }) {
  const [assets, setAssets] = useState<Array<{ id: string; reference: string; metadata?: { originalFilename?: string; mimeType?: string } }>>([]);
  const [selected, setSelected] = useState(currentAssetId ?? '');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    ApiClient.listMyActiveStudentAssets('image/')
      .then((page) => {
        if (active) setAssets(page.items);
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : 'تعذر تحميل صور الملف');
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    let cleanupUrl: string | null = null;

    if (!selected) {
      setPreviewUrl(null);
      return;
    }

    async function loadPreview() {
      setLoadingPreview(true);
      setError(null);
      try {
        const grant = await ApiClient.getMyStudentAssetDeliveryGrant(selected);
        if (!active) return;
        if (grant.headers && Object.keys(grant.headers).length) {
          const res = await fetch(grant.url, { headers: grant.headers });
          if (!res.ok) throw new Error('تعذر تحميل معاينة الصورة');
          const blob = await res.blob();
          if (!active) return;
          const objectUrl = URL.createObjectURL(blob);
          cleanupUrl = objectUrl;
          setPreviewUrl(objectUrl);
        } else {
          setPreviewUrl(grant.url);
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'تعذر تحميل معاينة الصورة');
      } finally {
        if (active) setLoadingPreview(false);
      }
    }

    void loadPreview();

    return () => {
      active = false;
      if (cleanupUrl) URL.revokeObjectURL(cleanupUrl);
    };
  }, [selected]);

  return (
    <div className="space-y-3">
      <label className="block text-xs font-bold text-[var(--mn-heading)]">
        الصورة الشخصية (من الأصول الآمنة)
      </label>
      <div className="flex items-center gap-3">
        <div className="relative w-14 h-14 rounded-2xl bg-[#142B5F] border-2 border-[#B38018]/50 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
          {previewUrl ? (
            <img src={previewUrl} alt="معاينة الصورة" className="w-full h-full object-cover" />
          ) : (
            <User className="w-7 h-7 text-[#E0B244]" />
          )}
          {loadingPreview && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-white animate-spin" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <select
            name="avatarAssetId"
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
            className="w-full rounded-xl border border-[var(--mn-border)] bg-[var(--mn-surface)] px-3 py-2 text-xs sm:text-sm font-medium text-[var(--mn-text)] outline-none focus:border-[#B38018] focus:ring-2 focus:ring-[#B38018]/20 transition-all"
          >
            <option value="">بدون صورة رمزية (الأيقونة الافتراضية)</option>
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.metadata?.originalFilename || asset.reference || `صورة (${asset.id.slice(0, 8)})`}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-[var(--mn-text-muted)]">
            تُجلب الصور المعتمدة حصرياً من أصول ملفك الآمنة في المنصة.
          </p>
        </div>
      </div>
      {error && <span className="block text-xs text-rose-500">{error}</span>}
    </div>
  );
}

function ProfileView({
  dashboard,
  identity,
  onLogout,
  notifications,
  privacy,
  accessibility,
  saving,
  onSave,
  onSnapshot,
  snapshots,
  onRestoreSnapshot,
  onResetLayout,
  onClearSearch,
  onBack,
}: {
  dashboard: StudentDashboardSummaryDto;
  identity: { principalId: string; displayName: string; primaryEmail?: string; roles?: string[]; roleNames?: string[] } | null;
  onLogout: () => void;
  notifications: Record<string, boolean>;
  privacy: Record<string, boolean>;
  accessibility: Record<string, unknown>;
  saving: boolean;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  onSnapshot: () => void;
  snapshots: StudentWorkspaceSnapshotDto[];
  onRestoreSnapshot: (snapshotId: string) => void;
  onResetLayout: () => void;
  onClearSearch: () => void;
  onBack?: () => void;
}) {
  const [searchClearConfirm, setSearchClearConfirm] = useState(false);

  function handleClearSearch() {
    if (window.confirm('هل أنت متأكد من مسح كامل سجل البحث الشخصي؟ لا يمكن التراجع عن هذا الإجراء.')) {
      onClearSearch();
      setSearchClearConfirm(false);
    }
  }

  return (
    <form onSubmit={onSave} className="space-y-6">
      {/* Top Banner with Nile & Gold Identity */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#142B5F] via-[#1A387A] to-[#142B5F] p-4 sm:p-6 text-white shadow-md border border-[#B38018]/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white shrink-0 transition-colors cursor-pointer"
                title="العودة إلى ملخصي"
              >
                <ArrowLeft className="w-5 h-5 text-[#E5B54F]" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-[#E5B54F]" />
                <h1 className="text-lg sm:text-xl font-bold">ملفي وإعدادات الحساب</h1>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-white/80 leading-relaxed">
                إدارة هويتك، تفضيلات العرض والتجربة، الإشعارات، والأمان والتزامن السحابي
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              type="button"
              disabled={saving}
              onClick={onLogout}
              className="flex items-center gap-1.5 rounded-xl border border-rose-400/40 bg-rose-500/20 px-3.5 py-2 text-xs font-bold text-rose-100 hover:bg-rose-500/30 transition-colors cursor-pointer"
              title="تسجيل الخروج من الحساب"
            >
              <LogOut className="w-4 h-4 text-rose-300" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Section 1: بيانات الحساب والهوية */}
        <div className="rounded-2xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] p-5 sm:p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[var(--mn-border)] dark:border-white/10">
            <div className="w-8 h-8 rounded-lg bg-[#142B5F]/10 dark:bg-white/10 flex items-center justify-center text-[#142B5F] dark:text-[#E0B244]">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--mn-heading)]">بياناتي والهوية</h2>
              <p className="text-xs text-[var(--mn-text-muted)]">معلومات الحساب المعتمدة في منصة منارتك</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Avatar Asset Picker */}
            <StudentAvatarAssetPicker currentAssetId={dashboard.workspace.avatarAssetId ?? null} />

            {/* Display Name - Editable */}
            <div>
              <label className="block text-xs font-bold text-[var(--mn-heading)] mb-1.5">
                الاسم الظاهر
              </label>
              <input
                name="displayName"
                defaultValue={dashboard.workspace.displayName || ''}
                maxLength={120}
                placeholder="أدخل اسمك الظاهر"
                className="w-full rounded-xl border border-[var(--mn-border)] bg-[var(--mn-surface-elevated)] px-3.5 py-2.5 text-sm text-[var(--mn-text)] outline-none focus:border-[#B38018] focus:ring-2 focus:ring-[#B38018]/20 transition-all font-medium"
              />
              <p className="mt-1 text-[11px] text-[var(--mn-text-muted)]">
                الاسم الذي يظهر في شهاداتك ومشاركاتك وملفات التقديم.
              </p>
            </div>

            {/* Email Address - Read only */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-[var(--mn-heading)]">
                  البريد الإلكتروني الأساسي
                </label>
                <span className="text-[10px] font-semibold text-[var(--mn-text-muted)] bg-[var(--mn-surface-muted)] px-2 py-0.5 rounded-md flex items-center gap-1">
                  <LockKeyhole className="w-3 h-3 text-[var(--mn-text-muted)]" /> للقراءة فقط
                </span>
              </div>
              <input
                type="text"
                readOnly
                disabled
                value={identity?.primaryEmail || 'غير مسجل'}
                className="w-full rounded-xl border border-[var(--mn-border)] bg-[var(--mn-surface-muted)] px-3.5 py-2.5 text-sm text-[var(--mn-text-muted)] font-mono cursor-not-allowed"
              />
            </div>

            {/* Role Status */}
            <div className="pt-2">
              <div className="p-3 rounded-xl border border-[var(--mn-border)] bg-[var(--mn-surface-muted)]/50 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-[var(--mn-text-muted)] block">حالة الحساب الأكاديمي</span>
                  <span className="text-xs font-bold text-[#142B5F] dark:text-[#E0B244] mt-0.5 inline-flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    {identity?.roles?.includes('student') ? 'طالب معتمد' : 'حساب نشط'}
                  </span>
                </div>
                <span className="text-[10px] text-[var(--mn-text-muted)] bg-[var(--mn-page)] px-2 py-0.5 rounded-md border border-[var(--mn-border)]">
                  موثّق
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: تفضيلات التجربة والعرض */}
        <div className="rounded-2xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] p-5 sm:p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[var(--mn-border)] dark:border-white/10">
            <div className="w-8 h-8 rounded-lg bg-[#142B5F]/10 dark:bg-white/10 flex items-center justify-center text-[#142B5F] dark:text-[#E0B244]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--mn-heading)]">تفضيلات التجربة والعرض</h2>
              <p className="text-xs text-[var(--mn-text-muted)]">تخصيص اللغة والمظهر والوصول</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-[var(--mn-heading)] mb-1.5 flex items-center gap-1.5">
                <Languages className="w-3.5 h-3.5 text-[#B38018]" />
                اللغة المفضلة
              </label>
              <select
                name="preferredLanguage"
                defaultValue={dashboard.workspace.preferredLanguage || 'ar'}
                className="w-full rounded-xl border border-[var(--mn-border)] bg-[var(--mn-surface-elevated)] px-3 py-2.5 text-xs sm:text-sm text-[var(--mn-text)] font-medium outline-none focus:border-[#B38018] focus:ring-2 focus:ring-[#B38018]/20"
              >
                <option value="ar">العربية (الافتراضية)</option>
                <option value="en">English (الإنجليزية)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--mn-heading)] mb-1.5 flex items-center gap-1.5">
                <Clock3 className="w-3.5 h-3.5 text-[#B38018]" />
                المنطقة الزمنية
              </label>
              <select
                name="timezone"
                defaultValue={dashboard.workspace.timezone || 'Asia/Aden'}
                className="w-full rounded-xl border border-[var(--mn-border)] bg-[var(--mn-surface-elevated)] px-3 py-2.5 text-xs sm:text-sm text-[var(--mn-text)] font-medium outline-none focus:border-[#B38018] focus:ring-2 focus:ring-[#B38018]/20"
              >
                <option value="Asia/Aden">عدن (GMT+3)</option>
                <option value="Asia/Riyadh">الرياض (GMT+3)</option>
                <option value="Asia/Dubai">دبي (GMT+4)</option>
                <option value="Africa/Cairo">القاهرة (GMT+2)</option>
                <option value="UTC">التوقيت العالمي الموحد (UTC)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--mn-heading)] mb-1.5 flex items-center gap-1.5">
                <Moon className="w-3.5 h-3.5 text-[#B38018]" />
                المظهر العام
              </label>
              <select
                name="theme"
                defaultValue={dashboard.workspace.theme || 'SYSTEM'}
                className="w-full rounded-xl border border-[var(--mn-border)] bg-[var(--mn-surface-elevated)] px-3 py-2.5 text-xs sm:text-sm text-[var(--mn-text)] font-medium outline-none focus:border-[#B38018] focus:ring-2 focus:ring-[#B38018]/20"
              >
                <option value="SYSTEM">تلقائي (حسب نظام الجهاز)</option>
                <option value="LIGHT">المظهر الفاتح</option>
                <option value="DARK">المظهر الداكن</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--mn-heading)] mb-1.5 flex items-center gap-1.5">
                <Settings2 className="w-3.5 h-3.5 text-[#B38018]" />
                حجم خط الواجهة
              </label>
              <select
                name="textScale"
                defaultValue={String(accessibility.textScale || 'DEFAULT')}
                className="w-full rounded-xl border border-[var(--mn-border)] bg-[var(--mn-surface-elevated)] px-3 py-2.5 text-xs sm:text-sm text-[var(--mn-text)] font-medium outline-none focus:border-[#B38018] focus:ring-2 focus:ring-[#B38018]/20"
              >
                <option value="SMALL">خط صغير (Compact)</option>
                <option value="DEFAULT">الافتراضي (Standard)</option>
                <option value="LARGE">خط كبير (Large)</option>
              </select>
            </div>
          </div>

          {/* Accessibility Toggles */}
          <div className="pt-2 border-t border-[var(--mn-border)] dark:border-white/10 space-y-2.5">
            <span className="text-xs font-bold text-[var(--mn-heading)] block mb-2">إمكانية الوصول والراحة</span>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <Toggle
                name="reduceMotion"
                label="تقليل الحركة والتأثيرات"
                defaultChecked={Boolean(accessibility.reduceMotion)}
              />
              <Toggle
                name="highContrast"
                label="وضع التباين المرتفع"
                defaultChecked={Boolean(accessibility.highContrast)}
              />
            </div>
          </div>

          <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-[11.5px] text-amber-900 dark:text-amber-200 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <span>تُحفظ جميع التفضيلات سحابياً في حسابك وتُطبّق على الفور عبر جميع أجهزتك المتصلة.</span>
          </div>
        </div>

        {/* Section 3: إعدادات الإشعارات */}
        <div className="rounded-2xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] p-5 sm:p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[var(--mn-border)] dark:border-white/10">
            <div className="w-8 h-8 rounded-lg bg-[#142B5F]/10 dark:bg-white/10 flex items-center justify-center text-[#142B5F] dark:text-[#E0B244]">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--mn-heading)]">إعدادات الإشعارات</h2>
              <p className="text-xs text-[var(--mn-text-muted)]">اختر القنوات والفئات التي تهمك</p>
            </div>
          </div>

          <div>
            <span className="text-xs font-bold text-[var(--mn-heading)] block mb-2.5">قنوات الاستقبال</span>
            <div className="grid gap-2 sm:grid-cols-3">
              <Toggle
                name="notifyInApp"
                label="داخل المنصة"
                defaultChecked={notifications.inApp ?? true}
              />
              <Toggle
                name="notifyEmail"
                label="البريد الإلكتروني"
                defaultChecked={notifications.email ?? true}
              />
              <Toggle
                name="notifyPush"
                label="الإشعارات الفورية"
                defaultChecked={notifications.push ?? false}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-[var(--mn-border)] dark:border-white/10">
            <span className="text-xs font-bold text-[var(--mn-heading)] block mb-2.5">فئات التنبيهات</span>
            <div className="grid gap-2 sm:grid-cols-2">
              <Toggle
                name="notifyLearning"
                label="تحديثات التعلم والدورات"
                defaultChecked={notifications.learning ?? true}
              />
              <Toggle
                name="notifyCertificates"
                label="إصدار الشهادات والاعتمادات"
                defaultChecked={notifications.certificates ?? true}
              />
              <Toggle
                name="notifyScholarships"
                label="المنح ومواعيد التقديم"
                defaultChecked={notifications.scholarships ?? true}
              />
              <Toggle
                name="notifyPayments"
                label="الفواتير وسجلات الدفع والطلبات"
                defaultChecked={notifications.payments ?? true}
              />
            </div>
          </div>
        </div>

        {/* Section 4: مركز الخصوصية والبيانات */}
        <div className="rounded-2xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] p-5 sm:p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[var(--mn-border)] dark:border-white/10">
            <div className="w-8 h-8 rounded-lg bg-[#142B5F]/10 dark:bg-white/10 flex items-center justify-center text-[#142B5F] dark:text-[#E0B244]">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--mn-heading)]">الخصوصية وسجل البحث</h2>
              <p className="text-xs text-[var(--mn-text-muted)]">إدارة خصوصية البحث والتوصيات ومسح البيانات المحفوظة</p>
            </div>
          </div>

          <div className="space-y-2.5">
            <span className="text-xs font-bold text-[var(--mn-heading)] block">خيارات الخصوصية والبيانات</span>
            <Toggle
              name="retainSearchHistory"
              label="الاحتفاظ بسجل البحث الشخصي"
              defaultChecked={privacy.retainSearchHistory ?? false}
            />
            <Toggle
              name="allowPersonalization"
              label="السماح بتخصيص التوصيات الذكية"
              defaultChecked={privacy.allowPersonalization ?? false}
            />
            <Toggle
              name="allowProductAnalytics"
              label="المساهمة في تحليلات تحسين أداء المنصة"
              defaultChecked={privacy.allowProductAnalytics ?? false}
            />
          </div>

          <div className="pt-2 border-t border-[var(--mn-border)] dark:border-white/10 flex items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-[var(--mn-heading)] block">مسح سجل البحث</span>
              <span className="text-[11px] text-[var(--mn-text-muted)]">حذف عمليات البحث المحفوظة من حسابك فوراً.</span>
            </div>
            <button
              type="button"
              onClick={handleClearSearch}
              disabled={saving}
              className="rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 px-3.5 py-2 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
            >
              مسح السجل الآن
            </button>
          </div>
        </div>

        {/* Section 5: إعدادات متقدمة ومعلومات النظام */}
        <div className="rounded-2xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] p-5 sm:p-6 shadow-sm space-y-5 lg:col-span-2">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[var(--mn-border)] dark:border-white/10">
            <div className="w-8 h-8 rounded-lg bg-[#142B5F]/10 dark:bg-white/10 flex items-center justify-center text-[#142B5F] dark:text-[#E0B244]">
              <Settings2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--mn-heading)]">إعدادات متقدمة ومعلومات النظام</h2>
              <p className="text-xs text-[var(--mn-text-muted)]">معرّفات تقنية داخلية، تفاصيل التزامن السحابي، وإدارة نسخ مساحة العمل</p>
            </div>
          </div>

          {/* Internal Identifiers & Technical Sync Details */}
          <div className="grid gap-3 sm:grid-cols-2 text-xs">
            <div className="p-3 rounded-xl border border-[var(--mn-border)] bg-[var(--mn-surface-muted)]/50">
              <span className="text-[10.5px] font-semibold text-[var(--mn-text-muted)] block">معرّف النظام الداخلي (Principal ID)</span>
              <span className="text-[11px] font-mono text-[var(--mn-heading)] mt-1 block truncate select-all" title={identity?.principalId}>
                {identity?.principalId || '—'}
              </span>
              <span className="text-[10px] text-[var(--mn-text-muted)] mt-0.5 block">معرّف تقني فريد يُستخدم في ربط الخدمات وإدارتها</span>
            </div>

            <div className="p-3 rounded-xl border border-[var(--mn-border)] bg-[var(--mn-surface-muted)]/50">
              <span className="text-[10.5px] font-semibold text-[var(--mn-text-muted)] block">إصدار تكوين مساحة العمل</span>
              <span className="text-xs font-bold text-[var(--mn-heading)] mt-1 inline-flex items-center gap-1.5 font-mono">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                الإصدار #{dashboard.workspace.version}
              </span>
              <span className="text-[10px] text-[var(--mn-text-muted)] mt-0.5 block">
                آخر مزامنة سحابية: {formatDate(dashboard.workspace.updatedAt)}
              </span>
            </div>
          </div>

          {/* Workspace Snapshot & Layout Management */}
          <div className="pt-2 border-t border-[var(--mn-border)] dark:border-white/10 space-y-3">
            <span className="text-xs font-bold text-[var(--mn-heading)] block">النسخ الاحتياطية وإعادة التعيين</span>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={onSnapshot}
                disabled={saving}
                className="rounded-xl border border-[#B38018]/40 bg-[#B38018]/10 hover:bg-[#B38018]/20 px-3 py-2 text-xs font-bold text-[#8C600B] dark:text-[#E0B244] transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>حفظ نسخة إعدادات</span>
              </button>

              <button
                type="button"
                onClick={onResetLayout}
                disabled={saving}
                className="rounded-xl border border-[var(--mn-border)] bg-[var(--mn-surface-elevated)] hover:bg-[var(--mn-surface-muted)] px-3 py-2 text-xs font-semibold text-[var(--mn-text)] transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>استعادة التخطيط</span>
              </button>
            </div>

            {/* Snapshots List */}
            {snapshots.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold text-[var(--mn-text-muted)] block">النسخ الاحتياطية المسجلة:</span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {snapshots.slice(0, 4).map((snapshot) => (
                    <div
                      key={snapshot.id}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--mn-border)] bg-[var(--mn-surface-muted)] text-xs"
                    >
                      <div className="min-w-0 pr-1">
                        <span className="font-semibold text-[var(--mn-heading)] block truncate">
                          {snapshot.label || 'نسخة إعدادات مساحة العمل'}
                        </span>
                        <span className="text-[10px] text-[var(--mn-text-muted)]">
                          {formatDate(snapshot.createdAt)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRestoreSnapshot(snapshot.id)}
                        disabled={saving}
                        className="rounded-lg bg-[var(--mn-surface)] hover:bg-[#B38018] hover:text-white border border-[var(--mn-border)] px-2.5 py-1 text-[11px] font-bold text-[var(--mn-primary)] transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                      >
                        استعادة
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Prominent Floating/Bottom Save Bar */}
      <div className="sticky bottom-4 z-20 rounded-2xl bg-[#142B5F] text-white p-4 shadow-xl border-2 border-[#B38018]/60 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 text-center sm:text-right">
          <ShieldCheck className="w-5 h-5 text-[#E5B54F] shrink-0 hidden sm:block" />
          <div>
            <p className="text-xs sm:text-sm font-bold text-white">هل أجريت تغييرات على ملفك وإعداداتك؟</p>
            <p className="text-[11px] text-white/70">اضغط على الزر لحفظ وتطبيق كافة التفضيلات سحابياً فوراً.</p>
          </div>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-[#B38018] via-[#DDAA35] to-[#B38018] px-8 py-3 font-bold text-[#142B5F] shadow-md hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer text-sm"
        >
          {saving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-[#142B5F]" />
              <span>جارٍ حفظ التفضيلات…</span>
            </>
          ) : (
            <>
              <Check className="w-4 h-4 text-[#142B5F]" />
              <span>حفظ جميع التعديلات</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-20 rounded-xl px-3 py-2 text-center">
      <strong className="block text-xl">{value}</strong>
      <span className="text-xs text-[var(--mn-on-dark-muted)]">{label}</span>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: 'success' | 'info' | 'warning' | 'accent';
}) {
  const styles: Record<typeof tone, string> = {
    success: 'border border-[var(--mn-success-border)] bg-[var(--mn-success-soft)] text-[var(--mn-success-text)]',
    info: 'border border-[var(--mn-info-border)] bg-[var(--mn-info-soft)] text-[var(--mn-info-text)]',
    warning: 'border border-[var(--mn-warning-border)] bg-[var(--mn-warning-soft)] text-[var(--mn-warning-text)]',
    accent: 'border border-[var(--mn-border-gold)] bg-[var(--mn-gold-surface)] text-[var(--mn-accent-text)]',
  };
  return (
    <div className="mn-card rounded-3xl p-5">
      <div
        className={`mb-4 grid h-11 w-11 place-items-center rounded-2xl text-xl ${styles[tone]}`}
      >
        {icon}
      </div>
      <strong className="text-3xl font-bold text-[var(--mn-heading)]">{value}</strong>
      <p className="mt-1 text-sm text-[var(--mn-text-muted)]">{label}</p>
    </div>
  );
}

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mn-card rounded-3xl p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="text-lg font-bold text-[var(--mn-heading)]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function CourseCard({
  course,
  wide = false,
}: {
  course: StudentDashboardSummaryDto['courseEnrollments'][number];
  wide?: boolean;
}) {
  return (
    <Link
      to={`../student/courses/${encodeURIComponent(course.courseId)}`}
      className={`group block rounded-2xl border border-[var(--mn-border)] bg-[var(--mn-surface)] p-4 hover:border-[var(--mn-border-gold)] hover:shadow-sm ${wide ? 'sm:p-5' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-xs font-semibold text-[var(--mn-secondary)]">
            {course.status === 'COMPLETED' ? 'مكتملة' : 'قيد التعلم'}
          </span>
          <h3 className="mt-1 truncate font-bold">{course.courseName}</h3>
        </div>
        <span className="text-sm font-bold text-[var(--mn-success-text)]">{course.progressPercentage}%</span>
      </div>
      <progress className="mn-native-progress mn-native-progress-secondary mt-4 h-2 w-full" value={Math.min(100, Math.max(0, course.progressPercentage))} max={100} aria-label="تقدم الدورة" />
      <div className="mt-3 flex justify-between text-xs text-[var(--mn-text-muted)]">
        <span>
          {course.lastAccessedAt
            ? `آخر وصول ${formatDate(course.lastAccessedAt)}`
            : `التسجيل ${formatDate(course.enrolledAt)}`}
        </span>
        <span className="inline-flex items-center gap-1 font-semibold text-[var(--mn-secondary)] transition group-hover:-translate-x-1">
          متابعة
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}

function ActivityList({ items }: { items: StudentDashboardSummaryDto['timeline'] }) {
  return items.length ? (
    <ol className="space-y-1">
      {items.map((item) => (
        <li key={item.id} className="relative flex gap-4 pb-5 last:pb-0">
          <span className="mt-1 h-3 w-3 shrink-0 rounded-full bg-[var(--mn-secondary)] ring-4 ring-[var(--mn-gold-surface)]" />
          <div>
            <h3 className="text-sm font-bold">{item.title}</h3>
            {item.description && <p className="mt-1 text-sm text-[var(--mn-text-muted)]">{item.description}</p>}
            <time className="mt-1 block text-xs text-[var(--mn-text-muted)]">{formatDate(item.occurredAt)}</time>
          </div>
        </li>
      ))}
    </ol>
  ) : (
    <p className="rounded-2xl bg-[var(--mn-surface-muted)] p-5 text-center text-sm text-[var(--mn-text-muted)]">
      سيظهر هنا سجل إنجازاتك ونشاطك المهم.
    </p>
  );
}

function ProgressRow({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-sm">
        <span className="font-bold">{label}</span>
        <span className="text-[var(--mn-text-muted)]">{value}%</span>
      </div>
      <progress className="mn-native-progress mn-native-progress-secondary h-2.5 w-full" value={Math.min(100, Math.max(0, value))} max={100} aria-label={label} />
    </div>
  );
}

function InvoicePanel({
  invoices,
  paymentsByInvoice,
  onToggle,
}: {
  invoices: StudentFinanceInvoiceDto[];
  paymentsByInvoice: Record<string, StudentFinancePaymentDto[]>;
  onToggle: (id: string) => void;
}) {
  return (
    <Panel title="الفواتير والدفعات">
      {invoices.length ? (
        <div className="space-y-3">
          {invoices.map((invoice) => (
            <div key={invoice.id} className="rounded-2xl border border-[var(--mn-border)] bg-[var(--mn-surface)] p-4">
              <div className="flex justify-between gap-3">
                <div>
                  <h3 className="font-bold">{invoice.invoiceNumber}</h3>
                  <p className="mt-1 text-sm text-[var(--mn-text-muted)]">
                    المستحق {formatMoney(invoice.amountDue)}
                  </p>
                </div>
                <span
                  className={`h-fit rounded-full px-3 py-1 text-xs font-bold ${invoice.status === 'PAID' ? 'border border-[var(--mn-success-border)] bg-[var(--mn-success-soft)] text-[var(--mn-success-text)]' : 'border border-[var(--mn-warning-border)] bg-[var(--mn-warning-soft)] text-[var(--mn-warning-text)]'}`}
                >
                  {arabicStatus(invoice.status)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onToggle(invoice.id)}
                className="mt-3 text-xs font-semibold text-[var(--mn-secondary)]"
              >
                {paymentsByInvoice[invoice.id] ? 'إخفاء الدفعات' : 'عرض الدفعات'}
              </button>
              {paymentsByInvoice[invoice.id] && (
                <div className="mt-3 space-y-2 border-t pt-3">
                  {paymentsByInvoice[invoice.id].length ? (
                    paymentsByInvoice[invoice.id].map((payment) => (
                      <p key={payment.id} className="rounded-lg bg-[var(--mn-surface-muted)] p-2 text-xs">
                        {formatMoney(payment.amount)} — {arabicStatus(payment.status)}
                      </p>
                    ))
                  ) : (
                    <p className="text-xs text-[var(--mn-text-muted)]">لا توجد دفعات مسجلة.</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-2xl bg-[var(--mn-surface-muted)] p-5 text-center text-sm text-[var(--mn-text-muted)]">
          لا توجد فواتير حالية.
        </p>
      )}
    </Panel>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const singleControl = React.isValidElement<{ className?: string }>(children) && React.Children.count(children) === 1;
  if (singleControl) {
    return (
      <label className="block text-sm font-semibold text-[var(--mn-text)]">
        {label}
        {React.cloneElement(children, {
          className: `${children.props.className || ''} mt-2 w-full rounded-xl border border-[var(--mn-border)] bg-[var(--mn-surface)] px-3 py-2.5 font-normal outline-none focus:border-[var(--mn-focus)] focus:ring-2 focus:ring-[var(--mn-gold-surface)]`,
        })}
      </label>
    );
  }
  return (
    <div className="block text-sm font-semibold text-[var(--mn-text)]">
      <span>{label}</span>
      <div className="mt-2 space-y-2">{children}</div>
    </div>
  );
}

function Toggle({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-[var(--mn-border)] bg-[var(--mn-surface)] p-4 hover:bg-[var(--mn-surface-muted)]">
      <span className="text-sm font-bold">{label}</span>
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-5 w-5 accent-[var(--mn-secondary)]"
      />
    </label>
  );
}

function EmptyState({
  icon,
  title,
  text,
  href,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--mn-border)] bg-[var(--mn-surface-muted)] p-8 text-center">
      <div className="text-3xl">{icon}</div>
      <h3 className="mt-3 font-bold">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--mn-text-muted)]">{text}</p>
      {href && action && (
        <Link
          to={href}
          className="mt-4 inline-block rounded-xl bg-[var(--mn-primary)] px-5 py-2.5 text-sm font-bold text-white"
        >
          {action}
        </Link>
      )}
    </div>
  );
}

function Alert({
  tone,
  message,
  onClose,
}: {
  tone: 'error' | 'success' | 'warning';
  message: string;
  onClose?: () => void;
}) {
  const styles = {
    error: 'border-[var(--mn-danger-border)] bg-[var(--mn-danger-soft)] text-[var(--mn-danger-text)]',
    success: 'border-[var(--mn-success-border)] bg-[var(--mn-success-soft)] text-[var(--mn-success-text)]',
    warning: 'border-[var(--mn-warning-border)] bg-[var(--mn-warning-soft)] text-[var(--mn-warning-text)]',
  };
  return (
    <div
      role="status"
      className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-bold ${styles[tone]}`}
    >
      <span>{message}</span>
      {onClose && (
        <button
          type="button"
          aria-label="إغلاق الرسالة"
          onClick={onClose}
          className="grid min-h-10 min-w-10 place-items-center rounded-xl hover:bg-black/5 dark:hover:bg-white/10"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

function WorkspaceSkeleton() {
  return (
    <div dir="rtl" className="mn-page-shell min-h-screen">
      <div className="h-64 animate-pulse bg-[var(--mn-primary)]" />
      <div className="mx-auto grid max-w-7xl gap-5 px-[9px] py-8 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="h-40 animate-pulse rounded-3xl bg-[var(--mn-surface)] border border-[var(--mn-border)]" />
        ))}
      </div>
    </div>
  );
}

function formatMoney(amount: MoneyAmountDto): string {
  const value = Number(BigInt(amount.amountMinorUnits)) / Math.pow(10, amount.scale);
  return `${value.toLocaleString('ar', { minimumFractionDigits: amount.scale, maximumFractionDigits: amount.scale })} ${amount.currencyCode}`;
}
function formatDate(value?: string | null): string {
  return value
    ? new Date(value).toLocaleDateString('ar', { year: 'numeric', month: 'short', day: 'numeric' })
    : '—';
}
function arabicStatus(value: string): string {
  return (
    (
      {
        PAID: 'مدفوعة',
        VOIDED: 'ملغاة',
        PENDING: 'معلقة',
        ACTIVE: 'نشطة',
        COMPLETED: 'مكتملة',
        REVOKED: 'ملغاة',
      } as Record<string, string>
    )[value] || value
  );
}
function arabicEntityType(value: string): string {
  return (
    (
      {
        COURSE: 'دورة',
        SCHOLARSHIP: 'منحة',
        UNIVERSITY: 'جامعة',
        MAJOR: 'تخصص',
        CERTIFICATE: 'شهادة',
        STUDENT_TOOL: 'أداة طالب',
      } as Record<string, string>
    )[value] || value
  );
}
function buildEntityLink(type: string, slug: string): string {
  const base = (
    {
      SCHOLARSHIP: 'scholarships',
      UNIVERSITY: 'universities',
      MAJOR: 'majors',
      COURSE: 'courses',
      STUDENT_TOOL: 'tools',
    } as Record<string, string>
  )[type];
  return base
    ? (slug ? `/${base}/${slug}` : `/${base}`)
    : type === 'CERTIFICATE'
      ? `/certificates/verify?code=${encodeURIComponent(slug)}`
      : '/';
}
