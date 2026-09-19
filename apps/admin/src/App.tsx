import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { FormEvent, useEffect, useState } from 'react';
import { adminApiClient } from './api/client';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { ScholarshipListPage } from './pages/ScholarshipListPage';
import { ScholarshipDetailPage } from './pages/ScholarshipCatalogDetailPage';
import { ScholarshipRelationshipEditorPage } from './pages/ScholarshipRelationshipEditorPage';
import { CourseListPage } from './pages/CourseListPage';
import { CourseDetailPage } from './pages/CourseDetailPage';
import { CertificateAdminPage } from './pages/CertificateAdminPage';
import { CertificateDetailPage } from './pages/CertificateDetailPage';
import { CmsAdminPage } from './pages/CmsAdminPage';
import { StudentToolsAdminPage } from './pages/StudentToolsAdminPage';
import { ServicesAdminPage } from './pages/ServicesAdminPage';
import { FinanceAdminPage } from './pages/FinanceAdminPage';
import { FinanceInvoiceDetailPage } from './pages/FinanceInvoiceDetailPage';
import { CareerAdminPage } from './pages/CareerAdminPage';
import { InternationalTestsAdminPage } from './pages/InternationalTestsAdminPage';
import { InternationalTestDetailPage } from './pages/InternationalTestDetailPage';
import { AIGovernancePage } from './pages/AIGovernancePage';
import { AdminReviewQueuePage } from './pages/AdminReviewQueuePage';
import { AdminHealthReadinessPage } from './pages/AdminHealthReadinessPage';
import { NotificationOperationsPage } from './pages/NotificationOperationsPage';
import { ImportAdminPage } from './pages/ImportAdminPage';
import { ScholarshipImportCenterPage } from './pages/ScholarshipImportCenterPage';
import { DomainImportCenterPage } from './pages/DomainImportCenterPage';
import { UniversityAdminPage } from './pages/UniversityAdminPage';
import { UniversityRelationshipEditorPage } from './pages/UniversityRelationshipEditorPage';
import { MajorAdminPage } from './pages/MajorAdminPage';
import { MajorDetailPage } from './pages/MajorDetailPage';
import { SettingsAdminPage } from './pages/SettingsAdminPage';
import { StudyDestinationsAdminPage } from './pages/StudyDestinationsAdminPage';
import { StudyDestinationDetailPage } from './pages/StudyDestinationDetailPage';
import { ReferenceDataAdminPage } from './pages/ReferenceDataAdminPage';
import { AcademicTaxonomyAdminPage } from './pages/AcademicTaxonomyAdminPage';
import { AcademicTaxonomyDetailPage } from './pages/AcademicTaxonomyDetailPage';
import { AdminTranslationWorkspacePage } from './pages/AdminTranslationWorkspacePage';
import { AuthorizationAdminPage } from './pages/AuthorizationAdminPage';
import { AuditCenterPage } from './pages/AuditCenterPage';
import { AssetAdminPage } from './pages/AssetAdminPage';
import { StudentSupportAdminPage } from './pages/StudentSupportAdminPage';
import { AdminAuthorizationProvider, RequireAdminPermission } from './security/AdminAuthorizationContext';
import { I18nProvider, useTranslation } from './i18n/I18nProvider';
import { AdminNavigation } from './components/AdminNavigation';
import { Languages, LockKeyhole } from 'lucide-react';

function AdminLayout() {
  const localReadOnly = import.meta.env.VITE_LOCAL_ADMIN_READ_ONLY === 'true';
  const [adminAccess, setAdminAccess] = useState<'loading' | 'authorized' | 'unauthorized'>(
    localReadOnly ? 'authorized' : 'loading',
  );
  const [adminPermissions, setAdminPermissions] = useState<string[]>(localReadOnly ? ['*'] : []);
  const { t, language, setLanguage } = useTranslation();

  useEffect(() => {
    if (localReadOnly) return;
    let active = true;
    verifyAdminSession().then((permissions) => {
      if (!active) return;
      setAdminPermissions(permissions ?? []);
      setAdminAccess(permissions ? 'authorized' : 'unauthorized');
    });
    return () => {
      active = false;
    };
  }, [localReadOnly]);

  const lockAdmin = async () => {
    try {
      await adminApiClient.request('/auth/logout', { method: 'POST' });
    } finally {
      adminApiClient.clearSecuritySession();
      clearAdminSession();
      setAdminPermissions([]);
      setAdminAccess('unauthorized');
    }
  };

  return (
    <BrowserRouter basename="/admin">
      <div className="min-h-screen bg-[#FAF7F0] text-[#203442] flex flex-col font-sans">
        <header className="sticky top-0 z-40 flex min-h-[73px] items-center justify-between border-b border-[#DDEFF2] bg-white/95 px-4 py-3 shadow-sm backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#142B5F] text-white shadow-sm">
              <span className="text-sm font-black">M</span>
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight text-[#142B5F] sm:text-lg">{t('admin_title')}</h1>
              <p className="text-[10px] font-bold text-[#0E7C86]">{t('admin_control_plane')}</p>
            </div>
          </div>
          {adminAccess === 'authorized' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#DDEFF2] bg-[#FAF7F0]/70 px-3 text-xs font-black text-[#0E7C86] transition hover:border-[#21A7B4]/55 hover:bg-[#DDEFF2]/45"
              >
                <Languages className="h-4 w-4" />
                {t('admin_lang_switch')}
              </button>
              {!localReadOnly && (
                <button
                  type="button"
                  onClick={() => void lockAdmin()}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 text-xs font-black text-rose-700 transition hover:bg-rose-100"
                >
                  <LockKeyhole className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('lock')}</span>
                </button>
              )}
            </div>
          )}
        </header>
        {localReadOnly && (
          <div className="border-b border-[#D6A43B]/35 bg-[#F4D999]/18 px-6 py-3 text-center text-xs font-extrabold text-[#7A5A14]">
            {t('admin_local_readonly_notice')}
          </div>
        )}

        {adminAccess === 'authorized' ? (
          <AdminAuthorizationProvider permissions={adminPermissions}>
          <div className="flex flex-1 flex-col lg:flex-row">
            <AdminNavigation />
            <main className="min-w-0 flex-1 p-4 sm:p-6">
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<AdminDashboardPage />} />
                <Route path="/review-queue" element={<RequireAdminPermission permission="admin:platform:manage"><AdminReviewQueuePage /></RequireAdminPermission>} />
                <Route path="/imports" element={<RequireAdminPermission permission="admin:imports:manage"><ImportAdminPage /></RequireAdminPermission>} />
                <Route path="/imports/scholarships" element={<RequireAdminPermission permission="admin:imports:manage"><ScholarshipImportCenterPage /></RequireAdminPermission>} />
                <Route path="/imports/:domainKey" element={<RequireAdminPermission permission="admin:imports:manage"><DomainImportCenterPage /></RequireAdminPermission>} />
                <Route path="/health-readiness" element={<RequireAdminPermission permission="admin:platform:manage"><AdminHealthReadinessPage /></RequireAdminPermission>} />
                <Route path="/notifications" element={<RequireAdminPermission permission="admin:platform:manage"><NotificationOperationsPage /></RequireAdminPermission>} />
                <Route path="/scholarships" element={<RequireAdminPermission permission="admin:scholarships:manage"><ScholarshipListPage /></RequireAdminPermission>} />
                <Route path="/scholarships/:id" element={<RequireAdminPermission permission="admin:scholarships:manage"><ScholarshipDetailPage /></RequireAdminPermission>} />
                <Route path="/scholarships/:id/relationships" element={<RequireAdminPermission permission="admin:scholarships:manage"><ScholarshipRelationshipEditorPage /></RequireAdminPermission>} />
                <Route path="/admin/scholarships" element={<RequireAdminPermission permission="admin:scholarships:manage"><ScholarshipListPage /></RequireAdminPermission>} />
                <Route path="/admin/scholarships/:id" element={<RequireAdminPermission permission="admin:scholarships:manage"><ScholarshipDetailPage /></RequireAdminPermission>} />
                <Route path="/admin/scholarships/:id/relationships" element={<RequireAdminPermission permission="admin:scholarships:manage"><ScholarshipRelationshipEditorPage /></RequireAdminPermission>} />
                <Route path="/universities" element={<RequireAdminPermission permission="admin:universities:manage"><UniversityAdminPage /></RequireAdminPermission>} />
                <Route path="/universities/:id" element={<RequireAdminPermission permission="admin:universities:manage"><UniversityRelationshipEditorPage /></RequireAdminPermission>} />
                <Route path="/majors" element={<RequireAdminPermission permission="admin:majors:manage"><MajorAdminPage /></RequireAdminPermission>} />
                <Route path="/majors/:id" element={<RequireAdminPermission permission="admin:majors:manage"><MajorDetailPage /></RequireAdminPermission>} />
                <Route path="/translations" element={<RequireAdminPermission permission="admin:cms:manage"><AdminTranslationWorkspacePage /></RequireAdminPermission>} />
                <Route path="/courses" element={<RequireAdminPermission permission="admin:courses:manage"><CourseListPage /></RequireAdminPermission>} />
                <Route path="/courses/:id" element={<RequireAdminPermission permission="admin:courses:manage"><CourseDetailPage /></RequireAdminPermission>} />
                <Route path="/certificates" element={<RequireAdminPermission permission="admin:certificates:view"><CertificateAdminPage /></RequireAdminPermission>} />
                <Route path="/certificates/:id" element={<RequireAdminPermission permission="admin:certificates:view"><CertificateDetailPage /></RequireAdminPermission>} />
                <Route path="/cms" element={<RequireAdminPermission permission="admin:cms:manage"><CmsAdminPage /></RequireAdminPermission>} />
                <Route path="/services" element={<RequireAdminPermission permission="admin:services:manage"><ServicesAdminPage /></RequireAdminPermission>} />
                <Route path="/finance" element={<RequireAdminPermission permission="admin:finance:manage"><FinanceAdminPage /></RequireAdminPermission>} />
                <Route path="/finance/invoices/:id" element={<RequireAdminPermission permission="admin:finance:manage"><FinanceInvoiceDetailPage /></RequireAdminPermission>} />
                <Route path="/careers" element={<RequireAdminPermission permission="admin:careers:manage"><CareerAdminPage /></RequireAdminPermission>} />
                <Route path="/international-tests" element={<RequireAdminPermission permission="admin:international-tests:manage"><InternationalTestsAdminPage /></RequireAdminPermission>} />
                <Route path="/international-tests/:id" element={<RequireAdminPermission permission="admin:international-tests:manage"><InternationalTestDetailPage /></RequireAdminPermission>} />
                <Route path="/admin/international-tests" element={<RequireAdminPermission permission="admin:international-tests:manage"><InternationalTestsAdminPage /></RequireAdminPermission>} />
                <Route path="/admin/international-tests/:id" element={<RequireAdminPermission permission="admin:international-tests:manage"><InternationalTestDetailPage /></RequireAdminPermission>} />
                <Route path="/ai" element={<RequireAdminPermission permission="admin:ai:manage"><AIGovernancePage /></RequireAdminPermission>} />
                <Route path="/ai/:section" element={<RequireAdminPermission permission="admin:ai:manage"><AIGovernancePage /></RequireAdminPermission>} />
                <Route path="/ai-governance" element={<Navigate to="/ai" replace />} />
                <Route path="/student-tools" element={<RequireAdminPermission permission="admin:student-tools:manage"><StudentToolsAdminPage /></RequireAdminPermission>} />
                <Route path="/student-tools/:toolKey" element={<RequireAdminPermission permission="admin:student-tools:manage"><StudentToolsAdminPage /></RequireAdminPermission>} />
                <Route path="/study-destinations" element={<RequireAdminPermission permission="admin:reference-data:manage"><StudyDestinationsAdminPage /></RequireAdminPermission>} />
                <Route path="/study-destinations/:countryIso2Code" element={<RequireAdminPermission permission="admin:reference-data:manage"><StudyDestinationDetailPage /></RequireAdminPermission>} />
                <Route path="/authorization" element={<RequireAdminPermission permission="admin:authorization:manage"><AuthorizationAdminPage /></RequireAdminPermission>} />
                <Route path="/audit" element={<RequireAdminPermission permission="admin:audit:manage"><AuditCenterPage /></RequireAdminPermission>} />
                <Route path="/assets" element={<RequireAdminPermission permission="admin:assets:manage"><AssetAdminPage /></RequireAdminPermission>} />
                <Route path="/students" element={<RequireAdminPermission permission="admin:students:support"><StudentSupportAdminPage /></RequireAdminPermission>} />
                <Route path="/settings" element={<RequireAdminPermission permission="admin:settings:manage"><SettingsAdminPage /></RequireAdminPermission>} />
                <Route path="/settings/reference-data" element={<RequireAdminPermission permission="admin:reference-data:manage"><ReferenceDataAdminPage /></RequireAdminPermission>} />
                <Route path="/academic-taxonomy" element={<RequireAdminPermission permission="admin:academic-taxonomy:manage"><AcademicTaxonomyAdminPage /></RequireAdminPermission>} />
                <Route path="/academic-taxonomy/:nodeId" element={<RequireAdminPermission permission="admin:academic-taxonomy:manage"><AcademicTaxonomyDetailPage /></RequireAdminPermission>} />
              </Routes>
            </main>
          </div>
          </AdminAuthorizationProvider>
        ) : (
          <main className="flex-1 p-6">
            {adminAccess === 'loading' ? (
              <div className="mx-auto mt-16 max-w-xl text-center text-sm text-[#203442]/60">{t('loading')}</div>
            ) : (
              <AdminAccessGate onUnlock={(permissions) => { setAdminPermissions(permissions); setAdminAccess('authorized'); }} />
            )}
          </main>
        )}
      </div>
    </BrowserRouter>
  );
}

function AdminAccessGate({ onUnlock }: { onUnlock: (permissions: string[]) => void }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError(t('admin_login_missing_credentials'));
      return;
    }

    setLoading(true);
    try {
      const response = await adminApiClient.request<{
        data?: { authenticated?: boolean };
      }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (!response.data?.authenticated) throw new Error('Authentication did not establish a session.');

      const permissions = await verifyAdminSession();
      if (!permissions) {
        clearAdminSession();
        setError(t('admin_login_no_permission'));
        return;
      }
      onUnlock(permissions);
    } catch {
      clearAdminSession();
      setError(t('admin_login_verification_failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto mt-16 max-w-3xl overflow-hidden rounded-3xl border border-[#DDEFF2] bg-white shadow-sm">
      <div className="bg-[#142B5F] p-8 text-white">
        <p className="mb-2 text-sm font-bold uppercase tracking-wide text-[#F4D999]">{t('admin_login_access_label')}</p>
        <h2 className="text-3xl font-bold mb-3">{t('admin_login_portal_title')}</h2>
        <p className="text-[#DDEFF2]">{t('admin_login_portal_desc')}</p>
      </div>
      <form onSubmit={submit} className="p-8 space-y-4">
        <label className="block text-sm font-medium" htmlFor="admin-email">{t('admin_login_email')}</label>
        <input
          id="admin-email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          autoComplete="username"
          className="w-full rounded-xl border border-[#DDEFF2] px-3 py-2 focus:border-[#21A7B4] focus:outline-none focus:ring-2 focus:ring-[#21A7B4]/15"
        />
        <label className="block text-sm font-medium" htmlFor="admin-password">{t('admin_login_password')}</label>
        <input
          id="admin-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          autoComplete="current-password"
          className="w-full rounded-xl border border-[#DDEFF2] px-3 py-2 focus:border-[#21A7B4] focus:outline-none focus:ring-2 focus:ring-[#21A7B4]/15"
        />
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>}
        <button disabled={loading} type="submit" className="w-full rounded-xl bg-[#142B5F] px-4 py-2 font-bold text-white transition hover:bg-[#0E7C86] disabled:opacity-60">
          {loading ? t('admin_login_verifying') : t('admin_login_submit')}
        </button>
      </form>
    </div>
  );
}

function clearAdminSession() {
  localStorage.removeItem('manaratak_admin_access');
  localStorage.removeItem('manaratak_admin_bearer');
  localStorage.removeItem('manaratak_admin_bearer_token');
}

async function verifyAdminSession(): Promise<string[] | null> {
  try {
    const response = await adminApiClient.request<{
      data?: { effectivePermissions?: string[] };
    }>('/auth/me');
    const permissions = response.data?.effectivePermissions || [];
    return permissions.some((permission) => permission === '*' || permission === 'admin:*' || permission.startsWith('admin:'))
      ? permissions
      : null;
  } catch {
    clearAdminSession();
    return null;
  }
}

export default function App() {
  return (
    <I18nProvider>
      <AdminLayout />
    </I18nProvider>
  );
}
