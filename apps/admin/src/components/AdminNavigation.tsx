import {
  Activity,
  Award,
  BookOpen,
  Bot,
  BriefcaseBusiness,
  Building2,
  CircleDollarSign,
  ClipboardCheck,
  FileText,
  GraduationCap,
  HeartPulse,
  Languages,
  LayoutDashboard,
  MapPinned,
  Bell,
  Settings,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Wrench,
  Users,
  ScrollText,
  Images,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from '../i18n/I18nProvider';
import { useAdminAuthorization } from '../security/AdminAuthorizationContext';

interface NavigationItem {
  to: string;
  labelKey: Parameters<ReturnType<typeof useTranslation>['t']>[0];
  icon: typeof LayoutDashboard;
  requiredPermission?: string;
}

interface NavigationGroup {
  labelKey: Parameters<ReturnType<typeof useTranslation>['t']>[0];
  items: NavigationItem[];
}

const groups: NavigationGroup[] = [
  {
    labelKey: 'admin_nav_group_overview',
    items: [
      { to: '/dashboard', labelKey: 'admin_nav_dashboard', icon: LayoutDashboard },
      { to: '/review-queue', labelKey: 'admin_nav_review', icon: ClipboardCheck, requiredPermission: 'admin:platform:manage' },
    ],
  },
  {
    labelKey: 'admin_nav_group_academic',
    items: [
      { to: '/scholarships', labelKey: 'admin_nav_scholarships', icon: Sparkles, requiredPermission: 'admin:scholarships:manage' },
      { to: '/universities', labelKey: 'admin_nav_universities', icon: Building2, requiredPermission: 'admin:universities:manage' },
      { to: '/majors', labelKey: 'admin_nav_majors', icon: GraduationCap, requiredPermission: 'admin:majors:manage' },
      { to: '/international-tests', labelKey: 'admin_nav_tests', icon: FileText, requiredPermission: 'admin:international-tests:manage' },
      { to: '/courses', labelKey: 'admin_nav_courses', icon: BookOpen, requiredPermission: 'admin:courses:manage' },
      { to: '/study-destinations', labelKey: 'admin_nav_study_destinations', icon: MapPinned, requiredPermission: 'admin:reference-data:manage' },
    ],
  },
  {
    labelKey: 'admin_nav_group_localization',
    items: [
      { to: '/translations', labelKey: 'admin_nav_translations', icon: Languages, requiredPermission: 'admin:cms:manage' },
      { to: '/cms', labelKey: 'admin_nav_cms', icon: FileText, requiredPermission: 'admin:cms:manage' },
    ],
  },
  {
    labelKey: 'admin_nav_group_operations',
    items: [
      { to: '/imports', labelKey: 'admin_nav_imports', icon: UploadCloud, requiredPermission: 'admin:imports:manage' },
      { to: '/certificates', labelKey: 'admin_nav_certificates', icon: Award, requiredPermission: 'admin:certificates:view' },
      { to: '/notifications', labelKey: 'admin_nav_notifications', icon: Bell, requiredPermission: 'admin:platform:manage' },
      { to: '/health-readiness', labelKey: 'admin_nav_health', icon: HeartPulse, requiredPermission: 'admin:platform:manage' },
    ],
  },
  {
    labelKey: 'admin_nav_group_platform',
    items: [
      { to: '/services', labelKey: 'admin_nav_services', icon: Wrench, requiredPermission: 'admin:services:manage' },
      { to: '/finance', labelKey: 'admin_nav_finance', icon: CircleDollarSign, requiredPermission: 'admin:finance:manage' },
      { to: '/careers', labelKey: 'admin_nav_careers', icon: BriefcaseBusiness, requiredPermission: 'admin:careers:manage' },
      { to: '/ai', labelKey: 'admin_nav_ai', icon: Bot, requiredPermission: 'admin:ai:manage' },
      { to: '/student-tools', labelKey: 'admin_nav_tools', icon: Activity, requiredPermission: 'admin:student-tools:manage' },
    ],
  },
  {
    labelKey: 'admin_nav_group_governance',
    items: [
      { to: '/academic-taxonomy', labelKey: 'admin_nav_academic_taxonomy', icon: ShieldCheck, requiredPermission: 'admin:academic-taxonomy:manage' },
      { to: '/authorization', labelKey: 'admin_nav_authorization', icon: Users, requiredPermission: 'admin:authorization:manage' },
      { to: '/audit', labelKey: 'admin_nav_audit', icon: ScrollText, requiredPermission: 'admin:audit:manage' },
      { to: '/assets', labelKey: 'admin_nav_assets', icon: Images, requiredPermission: 'admin:assets:manage' },
      { to: '/students', labelKey: 'admin_nav_students', icon: Users, requiredPermission: 'admin:students:support' },
      { to: '/settings', labelKey: 'admin_nav_settings', icon: Settings, requiredPermission: 'admin:settings:manage' },
    ],
  },
];

function itemClass(active: boolean) {
  return [
    'group flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-xs font-extrabold transition',
    active
      ? 'bg-[#DDEFF2]/80 text-[#142B5F] shadow-sm ring-1 ring-[#21A7B4]/15'
      : 'text-[#203442]/68 hover:bg-[#FAF7F0] hover:text-[#0E7C86]',
  ].join(' ');
}

export function AdminNavigation() {
  const { t } = useTranslation();
  const { hasPermission } = useAdminAuthorization();

  return (
    <aside className="w-full shrink-0 border-b border-[#DDEFF2] bg-white lg:w-[270px] lg:border-b-0 lg:border-e lg:min-h-[calc(100vh-73px)]">
      <div className="sticky top-[73px] max-h-[calc(100vh-73px)] overflow-y-auto p-4">
        <div className="mb-4 rounded-2xl border border-[#D6A43B]/25 bg-[#F4D999]/12 p-3">
          <div className="flex items-center gap-2 text-xs font-black text-[#142B5F]">
            <Languages className="h-4 w-4 text-[#0E7C86]" />
            {t('admin_bilingual_control')}
          </div>
          <p className="mt-1 text-[10px] font-semibold leading-5 text-[#203442]/58">{t('admin_bilingual_control_help')}</p>
        </div>

        <nav aria-label={t('admin_navigation')} className="space-y-5">
          {groups.map((group) => (
            <section key={group.labelKey}>
              <h2 className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.16em] text-[#203442]/38">
                {t(group.labelKey)}
              </h2>
              <div className="space-y-1">
                {group.items.filter((item) => hasPermission(item.requiredPermission)).map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/dashboard' || item.to === '/imports' || item.to === '/settings'}
                      className={({ isActive }) => itemClass(isActive)}
                    >
                      <Icon className="h-4 w-4 shrink-0 text-[#0E7C86] transition group-hover:text-[#21A7B4]" />
                      <span>{t(item.labelKey)}</span>
                    </NavLink>
                  );
                })}
              </div>
            </section>
          ))}
        </nav>
      </div>
    </aside>
  );
}
