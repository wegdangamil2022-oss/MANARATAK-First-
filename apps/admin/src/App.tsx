import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { adminApiClient, getStoredAdminToken, performAdminRefresh } from './api/client';
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
import { Languages, LockKeyhole, ArrowLeftRight, Loader2 } from 'lucide-react';

function AdminLayout() {
  const localReadOnly = import.meta.env.VITE_LOCAL_ADMIN_READ_ONLY === 'true';
  const [adminAccess, setAdminAccess] = useState<'loading' | 'authorized' | 'unauthorized'>(
    localReadOnly ? 'authorized' : 'loading',
  );
  const [adminPermissions, setAdminPermissions] = useState<string[]>(
    localReadOnly ? ['*'] : []
  );
  const { t, language, setLanguage } = useTranslation();

  const checkSession = () => {
    let active = true;
    adminApiClient.setAdminAuthStatus('LOADING');
    verifyAdminSession()
      .then((permissions) => {
        if (!active) return;
        if (permissions && permissions.length > 0) {
          adminApiClient.setAdminAuthStatus('AUTHORIZED');
          setAdminPermissions(permissions);
          setAdminAccess('authorized');
        } else {
          adminApiClient.setAdminAuthStatus('UNAUTHORIZED');
          adminApiClient.abortAllPendingAdminRequests();
          setAdminPermissions([]);
          setAdminAccess('unauthorized');
        }
      })
      .catch(() => {
        if (!active) return;
        adminApiClient.setAdminAuthStatus('UNAUTHORIZED');
        adminApiClient.abortAllPendingAdminRequests();
        setAdminPermissions([]);
        setAdminAccess('unauthorized');
      });
    return () => {
      active = false;
    };
  };

  useEffect(() => {
    if (localReadOnly) {
      adminApiClient.setAdminAuthStatus('AUTHORIZED');
      return;
    }
    return checkSession();
  }, [localReadOnly]);

  const lockAdmin = async () => {
    try {
      await adminApiClient.request('/auth/logout', { method: 'POST' });
    } finally {
      adminApiClient.setAdminAuthStatus('UNAUTHORIZED');
      adminApiClient.abortAllPendingAdminRequests();
      adminApiClient.clearSecuritySession();
      clearAdminSession();
      setAdminPermissions([]);
      setAdminAccess('unauthorized');
    }
  };

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <div className="min-h-screen bg-slate-50 text-[#142B5F] flex flex-col font-sans">
        <header className="sticky top-0 z-40 flex min-h-[73px] items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 py-3 shadow-xs backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#142B5F] text-white shadow-sm overflow-hidden p-1 border border-[#21A7B4]/20 shrink-0">
              <img
                src="/brand/manaratak-logo.png"
                alt="MANARATAK"
                className="h-full w-full object-contain rounded-xl"
                onError={(e) => {
                  // Fallback to stylized 'M' if image not found
                  (e.currentTarget as HTMLElement).style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent && !parent.querySelector('.fallback-m')) {
                    const span = document.createElement('span');
                    span.className = 'fallback-m text-sm font-black text-white';
                    span.textContent = 'M';
                    parent.appendChild(span);
                  }
                }}
              />
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight text-[#142B5F] sm:text-lg">{t('admin_title')}</h1>
              <p className="text-[10px] font-bold text-[#0E7C86]">{t('admin_control_plane')}</p>
            </div>
          </div>
          {adminAccess === 'authorized' && (
            <div className="flex items-center gap-2">
              <a
                href={(import.meta.env.VITE_PUBLIC_WEB_URL || '').replace(/\/$/, '') || '/'}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-[#0E7C86] transition hover:border-[#21A7B4] hover:bg-slate-50 shadow-xs"
              >
                <ArrowLeftRight className="h-4 w-4" />
                <span className="hidden sm:inline">{language === 'ar' ? 'العودة للموقع الرئيسي' : 'Back to main site'}</span>
              </a>
              <button
                type="button"
                onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-[#142B5F] transition hover:border-[#21A7B4] hover:bg-slate-50 shadow-xs"
              >
                <Languages className="h-4 w-4 text-[#0E7C86]" />
                {t('admin_lang_switch')}
              </button>
              {!localReadOnly && (
                <button
                  type="button"
                  onClick={() => void lockAdmin()}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100 shadow-xs"
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
          <main className="flex-1 p-6 flex items-center justify-center">
            {adminAccess === 'loading' ? (
              <div className="mx-auto mt-20 max-w-md rounded-3xl border border-[#DDEFF2] bg-white p-8 text-center shadow-xs">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-[#0E7C86] mb-3">
                  <Loader2 className="h-6 w-6 animate-spin text-[#0E7C86]" />
                </div>
                <div className="text-sm font-black text-[#142B5F]">{t('loading')}</div>
                <p className="mt-1 text-xs text-slate-500">جاري التحقق من جلسة المسؤول وتجهيز الصلاحيات...</p>
              </div>
            ) : (
              <AdminAccessGate />
            )}
          </main>
        )}
      </div>
    </BrowserRouter>
  );
}

function unifiedLoginUrl() {
  const publicBase = (import.meta.env.VITE_PUBLIC_WEB_URL || '').replace(/\/$/, '');
  return `${publicBase}/login`;
}

function AdminAccessGate() {
  const { t } = useTranslation();
  const handleLoginClick = () => {
    try {
      sessionStorage.setItem('manaratak_post_login_return', window.location.pathname + window.location.search);
    } catch {}
    window.location.href = unifiedLoginUrl();
  };

  return (
    <div className="mx-auto mt-16 max-w-xl rounded-3xl border border-[#DDEFF2] bg-white p-8 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 mb-4">
        <LockKeyhole className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-black text-[#142B5F] mb-2">{t('admin_login_no_permission')}</h3>
      <p className="text-xs text-slate-500 mb-6 leading-relaxed">
        يرجى تسجيل الدخول بحساب مسؤول للمتابعة إلى لوحة التحكم، أو إعادة التحقق في حال وجود تحديث في الخادم.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={handleLoginClick}
          className="rounded-xl bg-[#0E7C86] hover:bg-[#0c6a73] px-6 py-2.5 text-xs font-black text-white shadow-sm transition active:scale-95 cursor-pointer"
        >
          {t('admin_login_submit')}
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-5 py-2.5 text-xs font-bold text-slate-700 transition active:scale-95 cursor-pointer"
        >
          إعادة المحاولة
        </button>
      </div>
    </div>
  );
}

function clearAdminSession() {
  try {
    sessionStorage.removeItem('manaratak_admin_bearer_token');
    sessionStorage.removeItem('manaratak_access_token');
    sessionStorage.removeItem('manaratak_refresh_token');
    sessionStorage.removeItem('manaratak_admin_bearer');
  } catch {}
  try {
    localStorage.removeItem('manaratak_admin_access');
    localStorage.removeItem('manaratak_admin_bearer');
    localStorage.removeItem('manaratak_admin_bearer_token');
    localStorage.removeItem('manaratak_access_token');
    localStorage.removeItem('manaratak_refresh_token');
    localStorage.removeItem('manaratak_admin_permissions');
  } catch {}
}

async function verifyAdminSession(): Promise<string[] | null> {
  const storedToken = getStoredAdminToken();
  if (!storedToken) {
    clearAdminSession();
    return null;
  }

  try {
    const response = await adminApiClient.request<{
      data?: { effectivePermissions?: string[] };
    }>('/auth/me');
    const permissions = response.data?.effectivePermissions || [];
    const isAuthorized = permissions.some((permission) =>
      permission === '*' || permission === 'admin:*' || permission.startsWith('admin:')
    );
    if (isAuthorized) {
      try {
        localStorage.setItem('manaratak_admin_access', 'authorized');
        localStorage.setItem('manaratak_admin_permissions', JSON.stringify(permissions));
      } catch {}
      return permissions;
    }
    clearAdminSession();
    return null;
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
