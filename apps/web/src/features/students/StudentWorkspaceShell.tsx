import type { ReactNode } from 'react';
import { User, Home, Route, BookOpen, Heart, GraduationCap, ClipboardList, Bell } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import './student-workspace.css';

/**
 * The SAME latest student header and navigation is used for both:
 * - authenticated live P15 workspace (API-backed)
 * - isolated public design preview (mock data; never calls private endpoints).
 * All new visual changes to the workspace chrome must go here.
 */
export type StudentWorkspaceTab = 'SUMMARY' | 'OPPORTUNITIES' | 'LEARNING' | 'VAULT' | 'SERVICES' | 'CAREERS' | 'NOTIFICATIONS' | 'PROFILE';
const tabs: Array<{ id: Exclude<StudentWorkspaceTab, 'PROFILE'>; label: string; icon: LucideIcon }> = [
  { id: 'SUMMARY', label: 'ملخصي', icon: Home },
  { id: 'OPPORTUNITIES', label: 'فرصي', icon: Route },
  { id: 'LEARNING', label: 'تعلمي', icon: BookOpen },
  { id: 'VAULT', label: 'محفوظاتي', icon: Heart },
  { id: 'CAREERS', label: 'مساري المهني', icon: GraduationCap },
  { id: 'SERVICES', label: 'طلباتي', icon: ClipboardList },
  { id: 'NOTIFICATIONS', label: 'إشعاراتي', icon: Bell },
];

type Props = {
  children: ReactNode;
  activeTab: StudentWorkspaceTab;
  onTabChange: (tab: StudentWorkspaceTab) => void;
  displayName?: string;
  email?: string;
  statusLabel: string;
  stats: { activeCourses: number; certificates: number; averageCourseProgress: number };
  onLogout: () => void;
  logoutDisabled?: boolean;
  logoutLabel?: string;
  accessibility?: { textScale?: unknown; reduceMotion?: unknown; highContrast?: unknown };
};

export function StudentWorkspaceShell({
  children, activeTab: tab, onTabChange, displayName, email, statusLabel, stats,
  onLogout, logoutDisabled = false, logoutLabel = 'خروج', accessibility = {},
}: Props) {
  return (
    <main dir="rtl"
      data-text-scale={String(accessibility.textScale || 'DEFAULT')}
      data-reduce-motion={String(Boolean(accessibility.reduceMotion))}
      data-high-contrast={String(Boolean(accessibility.highContrast))}
      className="mn-student-workspace w-full max-w-4xl mx-auto px-3 sm:px-6 pb-28 sm:pb-16 text-right font-['Cairo',sans-serif] min-h-screen text-[var(--mn-text)]"
    >
      {/* Main Hero Card with Golden Top Bar & Royal Gradient */}
      <div className="mn-inverse relative overflow-hidden rounded-[26px] border border-[#142B5F] dark:border-[#B38018]/50 bg-gradient-to-br from-[#142B5F] via-[#112450] to-[#0c1a3b] text-white shadow-md mx-auto w-full mt-4">
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
              onClick={() => onTabChange('PROFILE')}
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
                    {displayName || 'حساب الطالب'}
                  </h1>
                  <span className="text-[10px] bg-white/15 px-2 py-0.5 rounded-full text-white/90 shrink-0 font-medium">
                    ملفي
                  </span>
                </div>
                {email && (
                  <p className="text-[10.5px] sm:text-[11.5px] text-white/70 font-mono mt-0.5 truncate">
                    {identity.primaryEmail}
                  </p>
                )}
              </div>
            </button>

            {/* Quick Status and Logout in Header */}
            <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/10">
              {stats.activeCourses > 0 || stats.certificates > 0 ? (
                <div className="flex items-center gap-2 text-xs bg-black/25 px-3 py-1.5 rounded-xl border border-white/10">
                  <span className="text-white/80 text-[11px]">التقدم:</span>
                  <span className="font-bold text-[#E0B244] text-[11px]">{stats.averageCourseProgress}%</span>
                  <span className="text-white/30">|</span>
                  <span className="text-white/80 text-[11px]">{stats.activeCourses} دورة</span>
                </div>
              ) : (
                <span className="text-[11px] text-white/80 bg-white/10 px-2.5 py-1 rounded-xl font-medium">
                  {statusLabel}
                </span>
              )}
              <button
                type="button"
                disabled={logoutDisabled}
                onClick={onLogout}
                className="rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white/90 hover:bg-white/20 hover:text-white disabled:opacity-60 transition-colors shrink-0 cursor-pointer"
                title="تسجيل الخروج من الحساب"
              >
                {logoutLabel}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar - 5 main tabs: ملخصي | فرصي | تعلمي | محفوظاتي | طلباتي */}
      <div role="navigation" aria-label="أقسام حساب الطالب" className="w-full max-w-4xl mx-auto mt-3.5 p-1 sm:p-1.5 rounded-2xl bg-[var(--mn-surface)] dark:bg-[var(--mn-surface)] border border-[var(--mn-border)] dark:border-white/10 shadow-sm grid grid-cols-3 sm:grid-cols-6 gap-1 sm:gap-1.5 mn-panel">
        {tabs.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-current={active ? 'page' : undefined}
              onClick={() => onTabChange(item.id)}
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


      {children}
    </main>
  );
}
