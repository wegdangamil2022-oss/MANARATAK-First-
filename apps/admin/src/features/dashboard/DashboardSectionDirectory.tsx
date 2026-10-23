import { ArrowLeft, LayoutGrid } from 'lucide-react';
import { Link } from 'react-router-dom';
import { adminNavigationGroups } from '../../components/AdminNavigation';
import { useTranslation } from '../../i18n/I18nProvider';
import { useAdminAuthorization } from '../../security/AdminAuthorizationContext';

export function DashboardSectionDirectory() {
  const { t, language } = useTranslation();
  const { hasPermission } = useAdminAuthorization();
  const groups = adminNavigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          item.to !== '/dashboard' &&
          (!item.requiredPermission || hasPermission(item.requiredPermission)),
      ),
    }))
    .filter((group) => group.items.length > 0);
  const count = groups.reduce((total, group) => total + group.items.length, 0);
  const tr = (ar: string, en: string) => (language === 'ar' ? ar : en);

  return (
    <details
      aria-labelledby="dashboard-shortcuts"
      className="rounded-3xl border border-[#DDEFF2] bg-white p-5 shadow-xs sm:p-6"
    >
      <summary className="flex items-center justify-between gap-3">
        <div>
          <span id="dashboard-shortcuts" className="flex items-center gap-2 font-bold">
            <LayoutGrid aria-hidden="true" className="h-5 w-5 text-[#0E7C86]" />
            {tr('دليل الأقسام', 'Workspace directory')}
          </span>
        </div>
        <span className="rounded-full bg-[#DDEFF2]/60 px-3 py-1 text-xs font-bold text-[#0E7C86]">
          {tr('الأقسام المتاحة', 'Available sections')}: {new Intl.NumberFormat(language).format(count)}
        </span>
      </summary>
      {count === 0 ? (
        <p className="text-sm text-slate-600">
          {tr('لا توجد أقسام متاحة لهذا الحساب.', 'No sections are available for this account.')}
        </p>
      ) : null}
      <div className="mt-4 space-y-4">
        {groups.map((group) => (
          <section key={group.labelKey} aria-labelledby={`dashboard-directory-${group.labelKey}`}>
            <h3
              id={`dashboard-directory-${group.labelKey}`}
              className="mb-3 border-s-4 border-[#D6A43B] ps-3 text-sm font-extrabold"
            >
              {t(group.labelKey)}
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="group flex min-h-16 min-w-0 items-center gap-3 rounded-2xl border border-[#DDEFF2] bg-[#FAF7F0]/40 p-3 text-sm font-bold transition hover:border-[#21A7B4] hover:bg-[#DDEFF2]/40 focus-visible:outline focus-visible:outline-2"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#0E7C86] shadow-xs">
                      <Icon aria-hidden="true" className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1 break-words">{t(item.labelKey)}</span>
                    <ArrowLeft aria-hidden="true" className="h-4 w-4 shrink-0 text-[#0E7C86] ltr:rotate-180" />
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </details>
  );
}
