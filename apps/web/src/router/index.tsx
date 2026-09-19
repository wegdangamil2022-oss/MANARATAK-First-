import React, { useEffect } from 'react';
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  Outlet,
  useLocation,
  useParams,
} from 'react-router-dom';
import { isSupportedLocale } from '@manaratak/shared';
import { useTranslation } from '../i18n/I18nProvider';
import { localizeLocation, resolveLegacyPublicLocale } from '../i18n/localeRouting';
import PublicTemplateApp from '../features/public-template/PublicTemplateApp';

const CertificateVerificationPage = React.lazy(() =>
  import('../features/certificates').then((m) => ({ default: m.CertificateVerificationPage }))
);
const StudentToolPage = React.lazy(() =>
  import('../features/student-tools').then((m) => ({ default: m.StudentToolPage }))
);
const CourseLearnerPage = React.lazy(() =>
  import('../features/learning').then((m) => ({ default: m.CourseLearnerPage }))
);

const PageLoadingFallback = () => {
  const { t } = useTranslation();
  return (
    <div className="mn-page-shell flex min-h-40 items-center justify-center gap-2 py-20 text-center font-medium text-[var(--mn-text-muted)]">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--mn-primary)] border-t-transparent" />
      <span>{t('loading')}</span>
    </div>
  );
};


const RootLayout = () => {
  const { language, setLanguage } = useTranslation();
  const location = useLocation();
  const { locale } = useParams<{ locale?: string }>();
  const routeLocale = isSupportedLocale(locale) ? locale : null;

  useEffect(() => {
    if (routeLocale && routeLocale !== language) setLanguage(routeLocale);
  }, [language, routeLocale, setLanguage]);

  if (!routeLocale) {
    const targetLocale = resolveLegacyPublicLocale(localStorage.getItem('manaratak_lang'));
    return <Navigate replace to={localizeLocation(location, targetLocale)} />;
  }

  const localeRelativePath = location.pathname.replace(/^\/(?:ar|en)(?=\/|$)/, '') || '/';
  const isCanonicalAdminPath =
    localeRelativePath.startsWith('/admin') ||
    localeRelativePath.startsWith('/study-destinations') ||
    localeRelativePath.startsWith('/academic-taxonomy');
  // apps/admin is the only administrative UI. apps/web never renders a shadow/local admin.
  if (isCanonicalAdminPath) return <CanonicalAdminRedirect legacyPath={location.pathname} />;

  // Render the matched public child route. This keeps /tools/:toolKey executable
  // while the catalog/detail routes remain owned by PublicTemplateApp.
  return (
    <React.Suspense fallback={<PageLoadingFallback />}>
      <Outlet />
    </React.Suspense>
  );
};

// Route Groups Definition

const router = createBrowserRouter([
  {
    path: '/:locale?',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <PublicTemplateApp />,
      },
      {
        path: 'login',
        element: <PublicTemplateApp />,
      },
      {
        path: 'search',
        element: <PublicTemplateApp />,
      },
      {
        path: 'compare',
        element: <PublicTemplateApp />,
      },
      {
        path: 'scholarships',
        element: <PublicTemplateApp />,
      },
      {
        path: 'scholarships/:slug',
        element: <PublicTemplateApp />,
      },
      {
        path: 'universities',
        element: <PublicTemplateApp />,
      },
      {
        path: 'universities/:slug',
        element: <PublicTemplateApp />,
      },
      {
        path: 'countries',
        element: <PublicTemplateApp />,
      },
      {
        path: 'countries/:slug',
        element: <PublicTemplateApp />,
      },
      {
        path: 'majors',
        element: <PublicTemplateApp />,
      },
      {
        path: 'majors/:slug',
        element: <PublicTemplateApp />,
      },
      {
        path: 'courses',
        element: <PublicTemplateApp />,
      },
      {
        path: 'courses/:slug',
        element: <PublicTemplateApp />,
      },
      {
        path: 'articles',
        element: <PublicTemplateApp />,
      },
      {
        path: 'articles/:slug',
        element: <PublicTemplateApp />,
      },
      {
        path: 'content/:slug',
        element: <PublicTemplateApp />,
      },
      {
        path: 'services',
        element: <PublicTemplateApp />,
      },
      {
        path: 'services/:slug',
        element: <PublicTemplateApp />,
      },
      {
        path: 'international-tests',
        element: <PublicTemplateApp />,
      },
      {
        path: 'international-tests/:slug',
        element: <PublicTemplateApp />,
      },
      {
        path: 'careers',
        element: <PublicTemplateApp />,
      },
      {
        path: 'careers/:slug',
        element: <PublicTemplateApp />,
      },
      {
        path: 'tools',
        element: <PublicTemplateApp />,
      },
      {
        path: 'tools/:toolKey',
        element: <StudentToolPage />,
      },
      {
        path: 'certificates/verify',
        element: <CertificateVerificationPage />,
      },
      {
        path: 'verify-certificate',
        element: <CertificateVerificationPage />,
      },
      {
        path: 'student/courses/:courseId',
        element: <CourseLearnerPage />,
      },
      {
        path: 'student',
        element: <PublicTemplateApp />,
      },
      {
        path: 'admin/*',
        element: <CanonicalAdminRedirect legacyPath={window.location.pathname} />,
      },
      {
        path: 'study-destinations/*',
        element: <CanonicalAdminRedirect legacyPath={window.location.pathname} />,
      },
      {
        path: 'academic-taxonomy/*',
        element: <CanonicalAdminRedirect legacyPath={window.location.pathname} />,
      },
    ],
  },
]);

function CanonicalAdminRedirect({ legacyPath }: { legacyPath: string }) {
  const rawAdminUrl = import.meta.env.VITE_ADMIN_URL;
  const adminBase =
    rawAdminUrl && rawAdminUrl !== '/admin' && rawAdminUrl.startsWith('http')
      ? rawAdminUrl.replace(/\/$/, '')
      : null;
  const normalizedLegacyPath = legacyPath.replace(/^\/(?:ar|en)(?=\/)/, '');
  const targetPath = normalizedLegacyPath.replace(/^\/admin/, '') || '/dashboard';

  useEffect(() => {
    if (adminBase) window.location.replace(`${adminBase}${targetPath}`);
  }, [adminBase, targetPath]);

  return adminBase ? <PageLoadingFallback /> : <CanonicalAdminUnavailable />;
}

function CanonicalAdminUnavailable() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-2xl py-12 text-center">
      <div className="mn-card rounded-2xl border border-[var(--mn-border)] bg-[var(--mn-surface)] p-8">
        <h1 className="text-xl font-bold text-[var(--mn-heading)]">{t('admin_unavailable_title')}</h1>
        <p className="mt-3 text-sm text-[var(--mn-text-muted)]">{t('admin_unavailable_desc')}</p>
      </div>
    </div>
  );
}

export function AppRouter() {
  return <RouterProvider router={router} />;
}
