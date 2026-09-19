import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Award, Bell, BookOpen, Bookmark, CheckCircle2, ClipboardList, Compass, Folder, Heart, Home, LockKeyhole, Route, Settings2, Star, X } from 'lucide-react';
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

type WorkspaceTab = 'HOME' | 'JOURNEY' | 'VAULT' | 'SERVICES' | 'SETTINGS';

const tabs: Array<{ id: WorkspaceTab; label: string; icon: LucideIcon }> = [
  { id: 'HOME', label: 'الرئيسية', icon: Home },
  { id: 'JOURNEY', label: 'رحلتي', icon: Route },
  { id: 'VAULT', label: 'خزنتي', icon: Heart },
  { id: 'SERVICES', label: 'طلباتي', icon: ClipboardList },
  { id: 'SETTINGS', label: 'التحكم والخصوصية', icon: Settings2 },
];

export function StudentWorkspacePage({ initialTab = 'HOME' }: { initialTab?: WorkspaceTab } = {}) {
  const location = useLocation();
  const [studentReferenceId, setStudentReferenceId] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<StudentDashboardSummaryDto | null>(null);
  const [invoices, setInvoices] = useState<StudentFinanceInvoiceDto[]>([]);
  const [paymentsByInvoice, setPaymentsByInvoice] = useState<
    Record<string, StudentFinancePaymentDto[]>
  >({});
  const queryTab = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('tab') : null;
  const resolvedInitialTab: WorkspaceTab = queryTab === 'journey' ? 'JOURNEY' : queryTab === 'vault' ? 'VAULT' : queryTab === 'services' ? 'SERVICES' : queryTab === 'settings' ? 'SETTINGS' : initialTab;
  const [tab, setTab] = useState<WorkspaceTab>(resolvedInitialTab);
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
  useEffect(() => {
    const requested = new URLSearchParams(location.search).get('tab');
    const next: WorkspaceTab | null = requested === 'journey' ? 'JOURNEY' : requested === 'vault' ? 'VAULT' : requested === 'services' ? 'SERVICES' : requested === 'settings' ? 'SETTINGS' : null;
    if (next) setTab(next);
    if (next === 'VAULT' && location.hash === '#certificates') window.setTimeout(() => document.getElementById('certificates')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  }, [location.search, location.hash]);


  useEffect(() => {
    let active = true;
    async function loadWorkspace() {
      setLoading(true);
      setError(null);
      try {
        const identity = await ApiClient.getCurrentStudentIdentity();
        if (!active) return;
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
        setServiceRequests(serviceRequestResult.status === 'fulfilled' ? serviceRequestResult.value.data : []);
        const requestedServiceId = new URLSearchParams(window.location.search).get('requestId');
        if (requestedServiceId) {
          const request = serviceRequestResult.status === 'fulfilled' ? serviceRequestResult.value.data.find((item) => item.id === requestedServiceId) : undefined;
          if (request) setSelectedServiceRequest(request);
          else { try { setSelectedServiceRequest(await ApiClient.getMyStudentServiceRequest(requestedServiceId)); } catch { /* request may be unavailable */ } }
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'تعذر تحميل مساحة الطالب');
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

  async function removeApplicationTracker(tracker: StudentApplicationTrackerDto) {
    if (!window.confirm('إزالة ملف التقديم من مساحة الطالب؟')) return;
    setSaving(true); setError(null);
    try { await ApiClient.removeMyStudentApplicationTracker(tracker.id); setApplicationTrackers((items) => items.filter((item) => item.id !== tracker.id)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر إزالة ملف التقديم'); }
    finally { setSaving(false); }
  }

  async function openServiceRequest(requestId: string) {
    setSaving(true); setError(null);
    try { const request = await ApiClient.getMyStudentServiceRequest(requestId); setSelectedServiceRequest(request); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر تحميل طلب الخدمة'); }
    finally { setSaving(false); }
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
    <main dir="rtl" className="mn-page-shell min-h-screen pb-16 text-[var(--mn-text)]">
      <section className="mn-inverse relative overflow-hidden bg-gradient-to-br from-[var(--mn-primary)] via-[var(--mn-secondary)] to-[var(--mn-primary)] text-white">
        <div className="mn-student-hero-pattern absolute inset-0 opacity-20" />
        <div className="relative mx-auto max-w-7xl px-[9px] py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div className="flex items-center gap-5">
              <div className="grid h-20 w-20 shrink-0 place-items-center rounded-3xl border border-white/20 bg-white/10 text-3xl font-bold text-[var(--mn-heading)] shadow-inner">
                {(workspace.displayName || 'ط').trim().charAt(0)}
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold text-[var(--mn-accent-soft)]">{greeting}</p>
                <h1 className="text-3xl font-bold text-[var(--mn-heading)] sm:text-4xl">
                  {workspace.displayName || 'طالب مناراتك'}
                </h1>
                <p className="mt-2 max-w-2xl text-[var(--mn-on-dark-muted)]">
                  مساحتك الخاصة لتنظيم التعلم والفرص والشهادات والقرارات المهمة.
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/15 bg-black/10 p-2 backdrop-blur">
                <HeroMetric label="التقدم" value={`${statistics.averageCourseProgress}%`} />
                <HeroMetric label="الدورات" value={String(statistics.activeCourses)} />
                <HeroMetric label="الشهادات" value={String(statistics.certificates)} />
              </div>
              <button type="button" disabled={saving} onClick={() => void logout()} className="w-full rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/15 disabled:opacity-60">تسجيل الخروج</button>
            </div>
          </div>
        </div>
      </section>

      <div className="sticky top-0 z-20 border-b border-[var(--mn-border)] bg-[var(--mn-surface)]/95 shadow-sm backdrop-blur">
        <nav
          aria-label="أقسام مساحة الطالب"
          className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-[9px] py-3 sm:px-6 lg:px-8"
        >
          {tabs.map((item) => {
            const TabIcon = item.icon;
            return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              aria-current={tab === item.id ? 'page' : undefined}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${tab === item.id ? 'bg-[var(--mn-primary)] text-white shadow mn-inverse' : 'text-[var(--mn-text-muted)] hover:bg-[var(--mn-surface-muted)] hover:text-[var(--mn-primary)]'}`}
            >
              <TabIcon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </button>
            );
          })}
        </nav>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-[9px] py-8 sm:px-6 lg:px-8">
        {error && <Alert tone="error" message={error} onClose={() => setError(null)} />}
        {notice && <Alert tone="success" message={notice} onClose={() => setNotice(null)} />}
        {dashboard.partialFailures.length > 0 && (
          <Alert
            tone="warning"
            message="بعض البطاقات غير متاحة مؤقتًا، لكن بقية مساحة العمل تعمل بصورة طبيعية."
          />
        )}

        {tab === 'HOME' && (
          <HomeView
            dashboard={dashboard}
            invoices={invoices}
            paymentsByInvoice={paymentsByInvoice}
            onTogglePayments={toggleInvoicePayments}
          />
        )}
        {tab === 'JOURNEY' && <JourneyView dashboard={dashboard} trackers={applicationTrackers} saving={saving} onStageChange={updateApplicationStage} onChecklistToggle={toggleApplicationChecklist} onArchive={archiveApplicationTracker} onRemove={removeApplicationTracker} />}
        {tab === 'VAULT' && (
          <VaultView dashboard={dashboard} hydratedSavedItems={hydratedSavedItems} saving={saving} onCreateCollection={createCollection} onRenameCollection={renameCollection} onDeleteCollection={deleteCollection} onMoveSavedItem={moveSavedItem} />
        )}
        {tab === 'SERVICES' && <ServiceRequestsView requests={serviceRequests} selected={selectedServiceRequest} saving={saving} onOpen={openServiceRequest} />}
        {tab === 'SETTINGS' && (
          <SettingsView
            dashboard={dashboard}
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
          />
        )}
      </div>
    </main>
  );
}

function HomeView({
  dashboard,
  invoices,
  paymentsByInvoice,
  onTogglePayments,
}: {
  dashboard: StudentDashboardSummaryDto;
  invoices: StudentFinanceInvoiceDto[];
  paymentsByInvoice: Record<string, StudentFinancePaymentDto[]>;
  onTogglePayments: (invoiceId: string) => void;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      <div className="space-y-6">
        <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4" aria-label="ملخص الإنجاز">
          <StatCard
            icon={<BookOpen className="h-5 w-5" />}
            label="دورات نشطة"
            value={dashboard.statistics.activeCourses}
            tone="success"
          />
          <StatCard
            icon={<CheckCircle2 className="h-5 w-5" />}
            label="دورات مكتملة"
            value={dashboard.statistics.completedCourses}
            tone="info"
          />
          <StatCard
            icon={<Bookmark className="h-5 w-5" />}
            label="عناصر محفوظة"
            value={dashboard.statistics.savedItems}
            tone="warning"
          />
          <StatCard
            icon={<Bell className="h-5 w-5" />}
            label="إشعارات جديدة"
            value={dashboard.statistics.unreadNotifications}
            tone="accent"
          />
        </section>

        <Panel
          title="تابع من حيث توقفت"
          action={
            <Link to="/courses" className="text-sm font-semibold text-[var(--mn-secondary)]">
              كل الدورات
            </Link>
          }
        >
          {dashboard.courseEnrollments.length ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {dashboard.courseEnrollments.slice(0, 4).map((course) => (
                <CourseCard key={course.enrollmentId} course={course} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<BookOpen className="h-7 w-7" />}
              title="لم تبدأ دورة بعد"
              text="استكشف الدورات وابنِ أول خطوة في مسارك."
              href="/courses"
              action="استكشف الدورات"
            />
          )}
        </Panel>

        <Panel title="آخر ما حدث في رحلتك">
          <ActivityList items={[...dashboard.recentActivity, ...dashboard.timeline].slice(0, 6)} />
        </Panel>
      </div>

      <aside className="space-y-6">
        <Panel title="خطواتك التالية">
          <div className="space-y-3">
            {dashboard.quickActions.map((action, index) => (
              <Link
                key={action.id}
                to={action.href}
                className="group flex items-center gap-3 rounded-2xl border border-[var(--mn-border)] bg-[var(--mn-surface)] p-4 hover:border-[var(--mn-border-gold)] hover:bg-[var(--mn-surface-muted)]"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--mn-gold-surface)] font-bold text-[var(--mn-accent-text)]">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block text-sm">{action.label}</strong>
                  <span className="mt-1 block text-xs text-[var(--mn-text-muted)]">{action.description}</span>
                </span>
                <ArrowLeft
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-[var(--mn-secondary)] transition group-hover:-translate-x-1"
                />
              </Link>
            ))}
          </div>
        </Panel>
        <Panel title="إشعاراتك">
          {dashboard.notifications.length ? (
            <div className="space-y-2">
              {dashboard.notifications.slice(0, 5).map((item) => (
                <div key={item.id} className="rounded-xl bg-[var(--mn-surface-muted)] p-3">
                  <p className="text-sm font-semibold text-[var(--mn-heading)]">{item.title}</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--mn-text-muted)]">{item.message}</p>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-[var(--mn-text-muted)]">لا توجد إشعارات جديدة.</p>}
        </Panel>
        <Panel title="شاهدته مؤخرًا">
          {dashboard.recentlyViewed.length ? <div className="space-y-2">{dashboard.recentlyViewed.slice(0, 5).map((item) => (
            <Link key={item.id} to={item.entitySlug ? buildEntityLink(item.entityType, item.entitySlug) : '#'} className="block rounded-xl bg-[var(--mn-surface-muted)] p-3 text-sm font-bold hover:bg-[var(--mn-gold-surface)]">
              {arabicEntityType(item.entityType)} · {item.entitySlug || item.entityId}
            </Link>
          ))}</div> : <p className="text-sm text-[var(--mn-text-muted)]">ستظهر هنا العناصر التي تفتحها بعد موافقتك على التحليلات.</p>}
        </Panel>
        <InvoicePanel
          invoices={invoices}
          paymentsByInvoice={paymentsByInvoice}
          onToggle={onTogglePayments}
        />
      </aside>
    </div>
  );
}

function JourneyView({ dashboard, trackers, saving, onStageChange, onChecklistToggle, onArchive, onRemove }: { dashboard: StudentDashboardSummaryDto; trackers: StudentApplicationTrackerDto[]; saving: boolean; onStageChange: (tracker: StudentApplicationTrackerDto, stage: string) => void; onChecklistToggle: (tracker: StudentApplicationTrackerDto, itemId: string, completed: boolean) => void; onArchive: (tracker: StudentApplicationTrackerDto) => void; onRemove: (tracker: StudentApplicationTrackerDto) => void }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <Panel title="مساري التعليمي">
        {dashboard.courseEnrollments.length ? (
          <div className="space-y-4">
            {dashboard.courseEnrollments.map((course) => (
              <CourseCard key={course.enrollmentId} course={course} wide />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Compass className="h-7 w-7" />}
            title="مسارك ينتظر البداية"
            text="عند التسجيل في دورة ستظهر هنا نسبة التقدم وآخر وصول."
            href="/courses"
            action="ابدأ التعلم"
          />
        )}
      </Panel>
      <div className="space-y-6">
        <ApplicationTrackersPanel trackers={trackers} saving={saving} onStageChange={onStageChange} onChecklistToggle={onChecklistToggle} onArchive={onArchive} onRemove={onRemove} />
        <Panel title="حصيلة الرحلة">
          <div className="space-y-4">
            <ProgressRow label="متوسط التقدم" value={dashboard.statistics.averageCourseProgress} />
            <ProgressRow
              label="الدورات المكتملة"
              value={dashboard.statistics.completedCourses ? 100 : 0}
            />
          </div>
        </Panel>
        <Panel title="السجل الشخصي">
          <ActivityList items={dashboard.timeline} />
        </Panel>
      </div>
    </div>
  );
}

const APPLICATION_STAGES = ['تجهيز المستندات', 'كتابة خطاب الدافع', 'خطابات التوصية', 'تم إرسال الطلب', 'المقابلة الشخصية', 'تم القبول بنجاح'];

function ApplicationTrackersPanel({ trackers, saving, onStageChange, onChecklistToggle, onArchive, onRemove }: { trackers: StudentApplicationTrackerDto[]; saving: boolean; onStageChange: (tracker: StudentApplicationTrackerDto, stage: string) => void; onChecklistToggle: (tracker: StudentApplicationTrackerDto, itemId: string, completed: boolean) => void; onArchive: (tracker: StudentApplicationTrackerDto) => void; onRemove: (tracker: StudentApplicationTrackerDto) => void }) {
  const active = trackers.filter((tracker) => tracker.status === 'ACTIVE');
  return <Panel title="ملفات التقديم للمنح">
    {active.length ? <div className="space-y-4">{active.map((tracker) => {
      const completed = tracker.checklist.filter((item) => item.completed).length;
      const progress = tracker.checklist.length ? Math.round((completed / tracker.checklist.length) * 100) : 0;
      return <article key={tracker.id} className="rounded-2xl border border-[var(--mn-border)] p-4">
        <div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{tracker.owner?.displayName || tracker.scholarshipSlug || tracker.scholarshipId}</h3><p className="mt-1 text-xs text-[var(--mn-text-muted)]">{tracker.owner?.country || 'منحة دراسية'} · {tracker.deadlineAt ? `الموعد ${formatDate(tracker.deadlineAt)}` : 'الموعد غير محدد'}</p></div><span className="rounded-full bg-[var(--mn-surface-muted)] px-2 py-1 text-xs font-bold">{progress}%</span></div>
        {tracker.owner && !tracker.owner.available && <p className="mt-3 rounded-xl bg-[var(--mn-warning-soft)] px-3 py-2 text-xs font-bold text-[var(--mn-warning-text)]">المنحة لم تعد متاحة لدى المصدر المالك؛ يبقى سجل التقديم محفوظًا للطالب.</p>}
        <label className="mt-3 block text-xs font-bold">مرحلة التقديم<select disabled={saving} value={tracker.stage} onChange={(event) => onStageChange(tracker, event.target.value)} className="mt-1 w-full rounded-xl border bg-[var(--mn-surface)] px-3 py-2">{APPLICATION_STAGES.map((stage) => <option key={stage}>{stage}</option>)}</select></label>
        <div className="mt-3 space-y-2">{tracker.checklist.map((item) => <label key={item.id} className="flex items-center gap-2 rounded-xl bg-[var(--mn-surface-muted)] px-3 py-2 text-sm"><input disabled={saving} type="checkbox" checked={item.completed} onChange={(event) => onChecklistToggle(tracker, item.id, event.target.checked)} /><span className={item.completed ? 'line-through text-[var(--mn-text-muted)]' : ''}>{item.label}</span></label>)}</div>
        <div className="mt-3 flex gap-2"><button type="button" disabled={saving} onClick={() => onArchive(tracker)} className="rounded-lg border px-3 py-1.5 text-xs font-bold">أرشفة</button><button type="button" disabled={saving} onClick={() => onRemove(tracker)} className="rounded-lg border border-[var(--mn-danger-border)] px-3 py-1.5 text-xs font-bold text-[var(--mn-danger-text)]">إزالة</button></div>
      </article>;
    })}</div> : <EmptyState icon={<ClipboardList className="h-7 w-7" />} title="لا توجد ملفات تقديم نشطة" text="أضف منحة إلى المتابعة من صفحة المنحة، وسيُحفظ تقدمك هنا عبر جميع أجهزتك." href="/scholarships" action="استكشف المنح" />}
  </Panel>;
}

function ServiceRequestsView({ requests, selected, saving, onOpen }: { requests: StudentServiceRequestDto[]; selected: StudentServiceRequestDto | null; saving: boolean; onOpen: (id: string) => void }) {
  return <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
    <Panel title="طلبات الخدمات">
      {requests.length ? <div className="space-y-2">{requests.map((request) => <button key={request.id} type="button" disabled={saving} onClick={() => onOpen(request.id)} className="w-full rounded-xl border border-[var(--mn-border)] p-3 text-right hover:border-[var(--mn-border-gold)]"><div className="font-bold">{request.publicId}</div><div className="mt-1 text-xs text-[var(--mn-text-muted)]">{request.status} · {formatDate(request.createdAt)}</div></button>)}</div> : <EmptyState icon={<ClipboardList className="h-7 w-7" />} title="لا توجد طلبات خدمات" text="يمكنك إنشاء طلب من صفحة أي خدمة منشورة." href="/services" action="استكشف الخدمات" />}
    </Panel>
    <Panel title="تفاصيل الطلب">
      {selected ? <div className="space-y-3"><div><span className="text-xs text-[var(--mn-text-muted)]">رقم الطلب</span><div className="font-mono font-bold">{selected.publicId}</div></div><div><span className="text-xs text-[var(--mn-text-muted)]">الحالة</span><div className="font-bold">{selected.status}</div></div><div><span className="text-xs text-[var(--mn-text-muted)]">الخدمة</span><div className="font-mono text-sm">{selected.serviceId}</div></div><pre className="overflow-x-auto rounded-xl bg-[var(--mn-surface-muted)] p-3 text-xs">{JSON.stringify(selected.requestParameters, null, 2)}</pre></div> : <p className="text-sm text-[var(--mn-text-muted)]">اختر طلبًا لعرض تفاصيله.</p>}
    </Panel>
  </div>;
}

function VaultView({
  dashboard,
  hydratedSavedItems,
  saving,
  onCreateCollection,
  onRenameCollection,
  onDeleteCollection,
  onMoveSavedItem,
}: {
  dashboard: StudentDashboardSummaryDto;
  hydratedSavedItems: HydratedStudentSavedItemDto[];
  saving: boolean;
  onCreateCollection: (event: FormEvent<HTMLFormElement>) => void;
  onRenameCollection: (collectionId: string, currentName: string) => void;
  onDeleteCollection: (collectionId: string, name: string) => void;
  onMoveSavedItem: (itemId: string, collectionId: string | null) => void;
}) {
  const hydratedBySavedItemId = new Map(hydratedSavedItems.map((item) => [item.savedItem.id, item.owner]));
  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {dashboard.collections.map((collection) => (
          <div
            key={collection.id}
            className="mn-card rounded-3xl p-5"
          >
            <div className="mb-5 flex items-start justify-between">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--mn-gold-surface)] text-[var(--mn-accent-text)]">
                <Folder className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="rounded-full bg-[var(--mn-surface-muted)] px-3 py-1 text-xs font-semibold text-[var(--mn-text-muted)]">
                {collection.itemCount} عنصر
              </span>
            </div>
            <h3 className="font-bold">{collection.name}</h3>
            <p className="mt-1 text-sm text-[var(--mn-text-muted)]">
              {collection.description || 'مجموعة شخصية لتنظيم اختياراتك'}
            </p>
            {collection.type === 'PERSONAL' && <div className="mt-4 flex gap-2">
              <button type="button" disabled={saving} onClick={() => onRenameCollection(collection.id, collection.name)} className="rounded-lg border px-3 py-1.5 text-xs font-bold text-[var(--mn-secondary)]">تعديل الاسم</button>
              <button type="button" disabled={saving} onClick={() => onDeleteCollection(collection.id, collection.name)} className="rounded-lg border border-[var(--mn-danger-border)] bg-[var(--mn-danger-soft)] px-3 py-1.5 text-xs font-bold text-[var(--mn-danger-text)]">حذف</button>
            </div>}
          </div>
        ))}
        <form
          onSubmit={onCreateCollection}
          className="rounded-3xl border border-dashed border-[var(--mn-border-gold)] bg-[var(--mn-gold-surface)] p-5"
        >
          <h3 className="font-bold text-[var(--mn-heading)]">مجموعة جديدة</h3>
          <label className="mt-4 block text-xs font-semibold text-[var(--mn-text-muted)]" htmlFor="collectionName">
            اسم المجموعة
          </label>
          <input
            id="collectionName"
            name="collectionName"
            required
            maxLength={80}
            className="mt-2 w-full rounded-xl border border-[var(--mn-border)] bg-[var(--mn-surface)] px-3 py-2.5 outline-none focus:ring-2 focus:ring-[var(--mn-focus)]"
            placeholder="مثال: منح أريد التقديم عليها"
          />
          <input
            name="collectionDescription"
            maxLength={240}
            className="mt-2 w-full rounded-xl border border-[var(--mn-border)] bg-[var(--mn-surface)] px-3 py-2.5 outline-none focus:ring-2 focus:ring-[var(--mn-focus)]"
            placeholder="وصف اختياري"
          />
          <button
            disabled={saving}
            className="mt-3 w-full rounded-xl bg-[var(--mn-primary)] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            إنشاء المجموعة
          </button>
        </form>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel
          title="محفوظاتي"
          action={
            <Link to="/scholarships" className="text-sm font-semibold text-[var(--mn-secondary)]">
              اكتشف فرصًا
            </Link>
          }
        >
          {dashboard.savedItems.length ? (
            <div className="divide-y divide-[var(--mn-border)]">
              {dashboard.savedItems.map((item) => {
                const owner = hydratedBySavedItemId.get(item.id);
                const displayName = owner?.displayName || item.displayName || item.entityId;
                const slug = owner?.slug || item.entitySlug || undefined;
                const available = owner ? owner.available : false;
                return (
                <div key={item.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                  <span className="grid h-11 w-11 place-items-center rounded-xl border border-[var(--mn-border-gold)] bg-[var(--mn-gold-surface)] text-[var(--mn-accent-text)]">
                    <Star className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-semibold text-[var(--mn-secondary)]">
                      {arabicEntityType(item.entityType)}
                    </span>
                    <h3 className="truncate font-bold">{displayName}</h3>
                    {!available && <p className="mt-1 text-xs font-bold text-[var(--mn-warning-text)]">المرجع غير متاح حاليًا لدى المصدر المالك.</p>}
                    {item.notes && <p className="mt-1 text-sm text-[var(--mn-text-muted)]">{item.notes}</p>}
                  </div>
                  {available && slug && (
                    <Link
                      to={buildEntityLink(item.entityType, slug)}
                      className="rounded-lg border px-3 py-2 text-sm font-semibold text-[var(--mn-text-muted)] hover:border-[var(--mn-border-gold)]"
                    >
                      فتح
                    </Link>
                  )}
                  <label className="sr-only" htmlFor={`move-${item.id}`}>نقل العنصر إلى مجموعة</label>
                  <select id={`move-${item.id}`} aria-label="نقل العنصر إلى مجموعة" value={item.collectionId ?? ''} disabled={saving} onChange={(event) => onMoveSavedItem(item.id, event.target.value || null)} className="rounded-lg border px-2 py-2 text-xs">
                    <option value="">دون مجموعة</option>
                    {dashboard.collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}
                  </select>
                </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={<Star className="h-7 w-7" />}
              title="خزنتك فارغة"
              text="احفظ الدورات والمنح والجامعات والتخصصات للرجوع إليها."
              href="/scholarships"
              action="ابدأ الاستكشاف"
            />
          )}
        </Panel>
        <div id="certificates"><Panel title="شهاداتي">
          {dashboard.certificates.length ? (
            <div className="space-y-3">
              {dashboard.certificates.map((certificate) => (
                <div
                  key={certificate.id}
                  className="rounded-2xl border border-[var(--mn-border-gold)] bg-[var(--mn-surface)] p-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--mn-border-gold)] bg-[var(--mn-gold-surface)] text-[var(--mn-accent-text)]"><Award className="h-5 w-5" /></span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold">{certificate.courseDisplayName}</h3>
                      <p className="mt-1 text-xs text-[var(--mn-text-muted)]">
                        صدرت في {formatDate(certificate.issuedAt)}
                      </p>
                      <p className="mt-1 truncate font-mono text-xs text-[var(--mn-secondary)]">
                        {certificate.serialNumber}
                      </p>
                    </div>
                  </div>
                  <Link
                    to={`/certificates/verify?code=${encodeURIComponent(certificate.verificationCode)}`}
                    className="mt-3 block rounded-xl bg-[var(--mn-primary)] px-3 py-2 text-center text-sm font-bold text-white"
                  >
                    عرض والتحقق
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Award className="h-7 w-7" />}
              title="لا توجد شهادات بعد"
              text="ستصل شهادات الدورات المكتملة إلى خزنتك تلقائيًا."
            />
          )}
        </Panel></div>
      </div>
    </div>
  );
}

function StudentAvatarAssetPicker({ currentAssetId }: { currentAssetId: string | null }) {
  const [assets, setAssets] = useState<Array<{ id: string; reference: string; metadata?: { originalFilename?: string; mimeType?: string } }>>([]);
  const [selected, setSelected] = useState(currentAssetId ?? '');
  const [error, setError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  useEffect(() => {
    let active = true;
    ApiClient.listMyActiveStudentAssets('image/').then((page) => { if (active) setAssets(page.items); }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'تعذر تحميل الصور'); });
    return () => { active = false; };
  }, []);
  async function preview() {
    if (!selected) return;
    setPreviewing(true); setError(null);
    try {
      const grant = await ApiClient.getMyStudentAssetDeliveryGrant(selected);
      if (grant.headers && Object.keys(grant.headers).length) {
        const response = await fetch(grant.url, { headers: grant.headers });
        if (!response.ok) throw new Error('تعذر تحميل المعاينة الآمنة');
        const objectUrl = URL.createObjectURL(await response.blob());
        window.open(objectUrl, '_blank', 'noopener,noreferrer');
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      } else window.open(grant.url, '_blank', 'noopener,noreferrer');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر إنشاء المعاينة'); }
    finally { setPreviewing(false); }
  }
  return <Field label="الصورة الشخصية من أصولك الآمنة">
    <select name="avatarAssetId" value={selected} onChange={(event) => setSelected(event.target.value)} className="field">
      <option value="">بدون صورة</option>
      {assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.metadata?.originalFilename || asset.reference}</option>)}
    </select>
    {selected ? <button type="button" onClick={() => void preview()} disabled={previewing} className="mt-2 rounded-lg border px-3 py-1.5 text-xs font-bold disabled:opacity-50">{previewing ? 'جاري التحميل…' : 'معاينة مؤقتة'}</button> : null}
    {error ? <span className="mt-1 block text-xs text-red-600">{error}</span> : null}
  </Field>;
}

function SettingsView({
  dashboard,
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
}: {
  dashboard: StudentDashboardSummaryDto;
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
}) {
  return (
    <form onSubmit={onSave} className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
      <div className="space-y-6">
        <Panel title="الملف وتجربة العرض">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="الاسم الظاهر">
              <input
                name="displayName"
                defaultValue={dashboard.workspace.displayName || ''}
                maxLength={120}
                className="field"
              />
            </Field>
            <StudentAvatarAssetPicker currentAssetId={dashboard.workspace.avatarAssetId ?? null} />
            <Field label="اللغة">
              <select
                name="preferredLanguage"
                defaultValue={dashboard.workspace.preferredLanguage || 'ar'}
                className="field"
              >
                <option value="ar">العربية</option>
                <option value="en">English</option>
              </select>
            </Field>
            <Field label="المنطقة الزمنية">
              <select
                name="timezone"
                defaultValue={dashboard.workspace.timezone || 'Asia/Aden'}
                className="field"
              >
                <option value="Asia/Aden">عدن</option>
                <option value="Asia/Riyadh">الرياض</option>
                <option value="Asia/Dubai">دبي</option>
                <option value="UTC">التوقيت العالمي</option>
              </select>
            </Field>
            <Field label="المظهر">
              <select
                name="theme"
                defaultValue={dashboard.workspace.theme || 'SYSTEM'}
                className="field"
              >
                <option value="SYSTEM">حسب الجهاز</option>
                <option value="LIGHT">فاتح</option>
                <option value="DARK">داكن</option>
              </select>
            </Field>
            <Field label="حجم النص">
              <select
                name="textScale"
                defaultValue={String(accessibility.textScale || 'DEFAULT')}
                className="field"
              >
                <option value="SMALL">صغير</option>
                <option value="DEFAULT">افتراضي</option>
                <option value="LARGE">كبير</option>
              </select>
            </Field>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Toggle
              name="reduceMotion"
              label="تقليل الحركة"
              defaultChecked={Boolean(accessibility.reduceMotion)}
            />
            <Toggle
              name="highContrast"
              label="تباين مرتفع"
              defaultChecked={Boolean(accessibility.highContrast)}
            />
          </div>
        </Panel>
        <Panel title="الإشعارات">
          <div className="grid gap-3 sm:grid-cols-2">
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
            <Toggle
              name="notifyLearning"
              label="تحديثات التعلم"
              defaultChecked={notifications.learning ?? true}
            />
            <Toggle
              name="notifyCertificates"
              label="الشهادات"
              defaultChecked={notifications.certificates ?? true}
            />
            <Toggle
              name="notifyScholarships"
              label="المنح والمواعيد"
              defaultChecked={notifications.scholarships ?? true}
            />
            <Toggle
              name="notifyPayments"
              label="الفواتير والدفعات"
              defaultChecked={notifications.payments ?? true}
            />
          </div>
        </Panel>
      </div>
      <aside className="space-y-6">
        <Panel title="مركز الخصوصية">
          <p className="mb-4 text-sm leading-6 text-[var(--mn-text-muted)]">
            بياناتك الشخصية خاصة افتراضيًا. أنت من يقرر ما يُحتفظ به لتحسين تجربتك.
          </p>
          <div className="space-y-3">
            <Toggle
              name="retainSearchHistory"
              label="الاحتفاظ بسجل البحث"
              defaultChecked={privacy.retainSearchHistory ?? false}
            />
            <Toggle
              name="allowPersonalization"
              label="السماح بالتخصيص"
              defaultChecked={privacy.allowPersonalization ?? false}
            />
            <Toggle
              name="allowProductAnalytics"
              label="تحليلات تحسين المنتج"
              defaultChecked={privacy.allowProductAnalytics ?? false}
            />
          </div>
          <button
            type="button"
            onClick={onClearSearch}
            disabled={saving}
            className="mt-5 w-full rounded-xl border border-[var(--mn-danger-border)] bg-[var(--mn-danger-soft)] px-4 py-2.5 text-sm font-bold text-[var(--mn-danger-text)] hover:brightness-95"
          >
            مسح سجل البحث الآن
          </button>
        </Panel>
        <Panel title="الأمان والتزامن">
          <div className="rounded-2xl border border-[var(--mn-success-border)] bg-[var(--mn-success-soft)] p-4 text-sm leading-6 text-[var(--mn-success-text)]">
            إصدار الإعدادات الحالي: <strong>{dashboard.workspace.version}</strong>
            <br />
            آخر مزامنة: {formatDate(dashboard.workspace.updatedAt)}
          </div>
          <button
            type="button"
            onClick={onSnapshot}
            disabled={saving}
            className="mt-4 w-full rounded-xl border border-[var(--mn-success-border)] bg-[var(--mn-surface)] px-4 py-2.5 text-sm font-bold text-[var(--mn-success-text)] hover:bg-[var(--mn-success-soft)]"
          >
            حفظ نسخة من الإعدادات
          </button>
          <button type="button" onClick={onResetLayout} disabled={saving} className="mt-2 w-full rounded-xl border border-[var(--mn-border)] px-4 py-2.5 text-sm font-semibold text-[var(--mn-text)] hover:bg-[var(--mn-surface-muted)]">
            إعادة التخطيط الافتراضي
          </button>
          <div className="mt-4 space-y-2" aria-label="نسخ الإعدادات المحفوظة">
            {snapshots.length === 0 ? <p className="text-xs text-[var(--mn-text-muted)]">لا توجد نسخ محفوظة بعد.</p> : snapshots.slice(0, 5).map((snapshot) => (
              <button key={snapshot.id} type="button" onClick={() => onRestoreSnapshot(snapshot.id)} disabled={saving} className="flex w-full items-center justify-between rounded-xl border border-[var(--mn-border)] bg-[var(--mn-surface-muted)] p-3 text-right text-xs hover:border-[var(--mn-border-gold)] hover:bg-[var(--mn-gold-surface)]">
                <span>{snapshot.label || 'نسخة إعدادات'}</span><span>استعادة</span>
              </button>
            ))}
          </div>
        </Panel>
        <button
          disabled={saving}
          className="w-full rounded-2xl bg-[var(--mn-primary)] px-6 py-4 font-bold text-white shadow-lg hover:bg-[var(--mn-primary-hover)] disabled:opacity-50"
        >
          {saving ? 'جارٍ الحفظ…' : 'حفظ جميع التفضيلات'}
        </button>
      </aside>
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
    } as Record<string, string>
  )[type];
  return base
    ? `/${base}/${slug}`
    : type === 'CERTIFICATE'
      ? `/certificates/verify?code=${encodeURIComponent(slug)}`
      : '/';
}
