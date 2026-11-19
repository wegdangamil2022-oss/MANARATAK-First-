import { type ReactNode } from 'react';
import { User, Home, Route, BookOpen, Heart, GraduationCap, ClipboardList, Bell, Settings2, ClipboardCheck, Mail, UserPlus, LogIn } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import './student-workspace.css';

/**
 * Original student dashboard chrome shared by preview and the authenticated P15 page.
 * The header is presentation only: no private API request or persistence is performed here.
 */
export type StudentWorkspaceTab = 'SUMMARY' | 'OPPORTUNITIES' | 'LEARNING' | 'VAULT' | 'SERVICES' | 'CAREERS' | 'NOTIFICATIONS' | 'PROFILE';
const tabs: Array<{ id: StudentWorkspaceTab; label: string; icon: LucideIcon }> = [
  { id: 'SUMMARY', label: 'ملخصي', icon: Home },
  { id: 'OPPORTUNITIES', label: 'فرصي', icon: Route },
  { id: 'LEARNING', label: 'تعلمي', icon: BookOpen },
  { id: 'VAULT', label: 'محفوظاتي', icon: Heart },
  { id: 'CAREERS', label: 'مساري', icon: GraduationCap },
  { id: 'SERVICES', label: 'طلباتي', icon: ClipboardList },
  { id: 'NOTIFICATIONS', label: 'إشعاراتي', icon: Bell },
  { id: 'PROFILE', label: 'إعداداتي', icon: User },
];


type Props = {
  children: ReactNode;
  activeTab: StudentWorkspaceTab;
  onTabChange: (tab: StudentWorkspaceTab) => void;
  displayName?: string;
  email?: string;
  countryName?: string;
  countryFlag?: string;
  cityName?: string;
  timezone?: string | null;
  previewMode?: boolean;
  accessibility?: { textScale?: unknown; reduceMotion?: unknown; highContrast?: unknown };
  readinessPercent?: number;
  completedRequirementsCount?: number;
  totalRequirementsCount?: number;
  activeApplicationsCount?: number;
  activeServiceRequestsCount?: number;
  isGuest?: boolean;
  onOpenLogin?: () => void;
  onOpenSignup?: () => void;
  onTogglePreviewAccount?: () => void;
};

export function StudentWorkspaceShell({
  children,
  activeTab: tab,
  onTabChange,
  displayName,
  email,
  accessibility = {},
  readinessPercent = 80,
  completedRequirementsCount = 8,
  totalRequirementsCount = 10,
  activeApplicationsCount = 2,
  activeServiceRequestsCount = 2,
  isGuest = false,
  onOpenLogin,
  onOpenSignup,
  onTogglePreviewAccount,
}: Props) {
  const safePercent = Math.min(100, Math.max(0, Math.round(readinessPercent)));
  const totalActiveCount = activeApplicationsCount + activeServiceRequestsCount;
  // The name, not the platform locale, determines the profile-image alignment.
  // Keep RTL for Arabic or mixed-script names; pure Latin names use LTR.
  const studentName = (displayName || '').trim();
  const isLatinName = /[A-Za-z]/.test(studentName) && !/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(studentName);

  return (
    <main
      dir="rtl"
      data-text-scale={String(accessibility.textScale || 'DEFAULT')}
      data-reduce-motion={String(Boolean(accessibility.reduceMotion))}
      data-high-contrast={String(Boolean(accessibility.highContrast))}
      className="mn-student-workspace w-full max-w-4xl mx-auto px-3 sm:px-6 pb-28 sm:pb-16 text-right font-['Cairo',sans-serif] min-h-screen text-[var(--mn-text)]"
    >
      {/* Full-bleed student identity on mobile: matching GlobalSearchPage gradient (#142B5F -> #12496B -> #0E7C86) */}
      <section
        aria-label="بطاقة هوية الطالب"
        className="mn-student-identity-header mn-search-hero bg-gradient-to-r from-[#142B5F] via-[#12496B] to-[#0E7C86] mn-inverse relative isolate -mx-3 sm:-mx-6 mt-0 w-[calc(100%+1.5rem)] sm:w-[calc(100%+3rem)] overflow-hidden rounded-none border-0 shadow-none text-white"
      >
        {/* Background Decorative Gold Dot Grid, Gold Orbital Rings & Curved Gold Waves (matching Scholarships/Majors Hero) */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          {/* Top-left gold dot grid */}
          <div className="absolute top-3 left-5 grid grid-cols-5 gap-1.5 opacity-25">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="h-1 w-1 rounded-full bg-[#F2CD78]" />
            ))}
          </div>

          {/* Thin gold curved orbital arcs on left */}
          <div className="absolute -top-12 -left-12 h-52 w-52 rounded-full border border-[#D6A43B]/30" />
          <div className="absolute -top-6 -left-6 h-68 w-68 rounded-full border border-[#D6A43B]/18" />

          {/* Flowing gold wave curves */}
          <svg
            className="absolute inset-0 h-full w-full opacity-25"
            viewBox="0 0 400 200"
            fill="none"
            preserveAspectRatio="none"
          >
            <path
              d="M-50,45 Q110,-20 255,58 T550,35"
              stroke="#F2CD78"
              strokeWidth="1.4"
              fill="none"
            />
            <path
              d="M-20,135 Q160,55 310,145 T600,105"
              stroke="#D6A43B"
              strokeWidth="1"
              fill="none"
            />
          </svg>

          {/* Lower curved gold swirl */}
          <svg
            className="absolute inset-x-0 bottom-0 h-11 w-full opacity-30"
            viewBox="0 0 500 80"
            fill="none"
            preserveAspectRatio="none"
          >
            <path
              d="M-20,70 Q250,-18 520,70"
              stroke="#F2CD78"
              strokeWidth="1.8"
              fill="none"
            />
          </svg>
        </div>

        <div className="relative z-10 p-3 sm:p-5">
          {isGuest ? (
            <>
              {/* Top Row: Avatar on right, Welcome title lowered slightly opposite the avatar, and quick preview switch button on the left */}
              <div dir="rtl" className="flex items-center justify-between gap-2 sm:gap-3 min-w-0">
                <div className="flex flex-1 items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className="w-[48px] h-[48px] sm:w-16 sm:h-16 rounded-full border-[2.2px] border-[#F2CD78] bg-[#142B5F]/90 shrink-0 flex items-center justify-center shadow-[0_0_12px_rgba(214,164,59,0.28)]">
                    <User className="w-6 h-6 sm:w-8 sm:h-8 text-[#F2CD78]" strokeWidth={1.8} />
                  </div>
                  <div className="min-w-0 flex-1 text-right pt-1.5">
                    <h1 className="text-[15px] sm:text-lg font-bold text-[#F2CD78] leading-tight">
                      مرحبًا بك في منارتك
                    </h1>
                  </div>
                </div>

                {onTogglePreviewAccount && (
                  <button
                    type="button"
                    onClick={onTogglePreviewAccount}
                    title="التنقل لمعاينة حساب الطالب الحقيقي"
                    className="shrink-0 min-h-[32px] sm:min-h-[36px] px-2.5 py-1 rounded-xl bg-[#142B5F]/75 hover:bg-[#142B5F] border border-[#D6A43B]/65 text-[#F2CD78] text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1 shadow-sm transition-colors cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5 text-[#F2CD78] shrink-0" />
                    <span>حساب الطالب</span>
                  </button>
                )}
              </div>

              <div className="my-2.5 sm:my-4 h-px bg-gradient-to-r from-transparent via-[#F2CD78]/45 to-transparent" />

              {/* Middle Inner Box: previous size with clear readable text */}
              <div className="rounded-xl border border-[#D6A43B]/50 bg-[#0D2149]/65 backdrop-blur-xs px-3 py-2.5 sm:px-3.5 sm:py-3 shadow-sm text-right">
                <p className="text-[11px] sm:text-[12.5px] font-semibold text-[#EAF4F7] leading-relaxed">
                  أنشئ حسابًا مجانيًا لحفظ فرصك، وإدارة طلباتك، ومتابعة مسارك الدراسي.
                </p>
              </div>

              {/* Bottom Row: Long indigo base container with Create Account & Sign In boxes on top of it, matching AuthPage header */}
              <div className="mt-2.5 grid grid-cols-2 gap-1.5 rounded-xl bg-[#0D2149]/65 p-1 border border-white/15">
                <button
                  type="button"
                  onClick={onOpenSignup}
                  className="!min-h-[34px] h-[34px] sm:!min-h-[38px] sm:h-[38px] rounded-lg bg-white/15 hover:bg-white/22 text-[#F2CD78] border border-[#F2CD78]/45 shadow-xs text-[11.5px] sm:text-xs font-bold transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5 text-[#F2CD78] shrink-0" />
                  <span className="text-[#F2CD78] font-bold">إنشاء حساب</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenLogin}
                  className="!min-h-[34px] h-[34px] sm:!min-h-[38px] sm:h-[38px] rounded-lg text-white/85 hover:text-white hover:bg-white/10 text-[11.5px] sm:text-xs font-bold transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5 shrink-0" />
                  <span>تسجيل الدخول</span>
                </button>
              </div>
            </>
          ) : (
            <>
              {/* English name: avatar left/settings right. Arabic name: avatar right/settings left. */}
              <div dir={isLatinName ? 'ltr' : 'rtl'} className="flex items-start gap-2 sm:gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => onTabChange('PROFILE')}
                  title="عرض وتعديل ملفي"
                  className="flex flex-1 items-center gap-2 sm:gap-3 min-w-0 text-start cursor-pointer group/profile focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#71E5D9]"
                >
                  <div className="w-[48px] h-[48px] sm:w-16 sm:h-16 rounded-full border-[2.2px] border-[#F2CD78] bg-[#142B5F]/90 shrink-0 flex items-center justify-center shadow-[0_0_12px_rgba(214,164,59,0.28)] group-hover/profile:scale-[1.03] transition-transform">
                    <User className="w-6 h-6 sm:w-8 sm:h-8 text-[#F2CD78]" strokeWidth={1.8} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h1 dir={isLatinName ? 'ltr' : 'rtl'} className="text-base sm:text-lg font-bold text-[#F2CD78] leading-tight [overflow-wrap:anywhere] group-hover/profile:text-[#FFDE96] transition-colors">
                      {displayName || 'حساب الطالب'}
                    </h1>
                  </div>
                </button>
                <div className="flex items-center gap-1.5 shrink-0">
                  {onTogglePreviewAccount && (
                    <button
                      type="button"
                      onClick={onTogglePreviewAccount}
                      title="التنقل لمعاينة وضع الزائر"
                      className="min-h-[32px] sm:min-h-[40px] px-2.5 py-1 rounded-xl bg-[#142B5F]/65 hover:bg-[#142B5F]/85 border border-[#D6A43B]/60 text-[#F2CD78] text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1 shadow-sm transition-colors cursor-pointer"
                    >
                      <span>وضع الزائر</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onTabChange('PROFILE')}
                    title="ملفي وإعداداتي"
                    aria-label="فتح ملفي وإعداداتي"
                    className="shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#142B5F]/65 border border-[#D6A43B]/60 text-[#F2CD78] flex items-center justify-center shadow-sm hover:bg-[#142B5F]/85 cursor-pointer focus-visible:outline focus-visible:outline-offset-2"
                  >
                    <Settings2 className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                </div>
              </div>

              <div className="my-2.5 sm:my-4 h-px bg-gradient-to-r from-transparent via-[#F2CD78]/45 to-transparent" />

              {/* Compact interactive student readiness & active applications/requests cards */}
              <div className="grid grid-cols-[1.06fr_0.94fr] sm:grid-cols-[1.08fr_0.92fr] gap-1.5 sm:gap-3 items-stretch">
                <button
                  type="button"
                  onClick={() => onTabChange('PROFILE')}
                  title="استكمال جاهزية ملفي الأكاديمي ومتطلبات التقديم"
                  className="min-w-0 rounded-xl border border-[#D6A43B]/45 bg-[#10264A]/55 hover:bg-[#10264A]/75 hover:border-[#F2CD78]/75 backdrop-blur-xs px-2.5 py-2 sm:px-3.5 sm:py-2.5 shadow-sm text-right transition-all active:scale-[0.99] cursor-pointer flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 text-[10.5px] sm:text-[11.5px] text-[#F2CD78] min-w-0">
                      <ClipboardCheck className="h-3.5 w-3.5 shrink-0 text-[#F2CD78]" />
                      <span className="truncate font-semibold">جاهزية ملفي</span>
                    </div>
                    <span className="text-[11px] sm:text-xs font-bold text-[#F2CD78] tabular-nums shrink-0">
                      {safePercent}%
                    </span>
                  </div>
                  <div className="my-1.5 h-[4px] w-full rounded-full bg-white/15 overflow-hidden" dir="rtl">
                    <div
                      className="h-full rounded-full bg-gradient-to-l from-[#0E7C86] via-[#38C6D4] to-[#71E5D9] shadow-[0_0_8px_rgba(113,229,217,0.65)] transition-all duration-300"
                      data-mn-width={Math.round(Math.max(0, Math.min(100, Number(safePercent) || 0)))}
                    />
                  </div>
                  <p className="text-[10.5px] sm:text-xs font-bold text-white truncate">
                    {completedRequirementsCount} من {totalRequirementsCount} متطلبات مكتملة
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => onTabChange('OPPORTUNITIES')}
                  title="متابعة تقديماتي على المنح وطلباتي النشطة"
                  className="min-w-0 rounded-xl border border-[#D6A43B]/45 bg-[#10264A]/55 hover:bg-[#10264A]/75 hover:border-[#F2CD78]/75 backdrop-blur-xs px-2.5 py-2 sm:px-3 sm:py-2.5 shadow-sm text-right transition-all active:scale-[0.99] cursor-pointer flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-[#F2CD78] min-w-0">
                      <Route className="h-3.5 w-3.5 shrink-0 text-[#F2CD78]" />
                      <span className="truncate font-semibold">تقديماتي وطلباتي</span>
                    </div>
                    <span className="text-[10.5px] sm:text-[11.5px] font-bold text-[#71E5D9] tabular-nums shrink-0">
                      {totalActiveCount} نشطة
                    </span>
                  </div>
                  <p className="mt-1.5 text-[10.5px] sm:text-xs font-bold text-white leading-snug whitespace-nowrap truncate">
                    {activeApplicationsCount} منح · {activeServiceRequestsCount} طلبات
                  </p>
                </button>
              </div>

              {/* Email is intentionally LAST, below both compact cards. */}
              <div className="mt-2.5 pt-2 border-t border-[#F2CD78]/30 flex items-center justify-center gap-2 min-w-0">
                <Mail className="h-3.5 w-3.5 shrink-0 text-[#F2CD78]" />
                <span dir="ltr" className="min-w-0 truncate text-[10.5px] sm:text-[11.5px] font-medium text-white/95 font-['Cairo',sans-serif]">
                  {email || 'لم يُضف بريد إلكتروني'}
                </span>
              </div>
            </>
          )}
        </div>
        {/* Gold baseline joins the identity panel to the quick-access navigation. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[3px] bg-gradient-to-r from-[#B38018] via-[#F2CE75] to-[#B38018]" />
      </section>

      {/* Compact inline 8-tab student navigation: stretched edge-to-edge to right and left */}
      <div
        role="navigation"
        aria-label="أقسام حساب الطالب"
        className="mn-student-nav relative -mx-3 sm:-mx-6 w-[calc(100%+1.5rem)] sm:w-[calc(100%+3rem)] mt-0 px-1 py-1.5 sm:px-1.5 sm:py-2.5 rounded-none bg-[var(--mn-surface)] dark:bg-[var(--mn-surface)] border-x-0 border-t-0 border-b border-[var(--mn-border)] shadow-none grid grid-cols-4 gap-1 sm:gap-2 mn-panel"
      >
        {tabs.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-current={active ? 'page' : undefined}
              title={item.id === 'PROFILE' ? 'إعداداتي وملفي الشخصي' : item.label}
              onClick={() => onTabChange(item.id)}
              className={`mn-student-nav-tile w-full min-w-0 min-h-[40px] sm:min-h-[50px] rounded-xl border px-1.5 py-1.5 sm:px-2.5 sm:py-2.5 flex flex-row items-center justify-center gap-1 sm:gap-2 transition-all duration-150 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#142B5F] ${
                active
                  ? 'border-[#D6A43B] bg-[#142B5F] text-[#F2CD78] shadow-xs font-bold'
                  : 'border-slate-300/90 bg-white text-[#1E293B] dark:border-white/15 dark:bg-[#10264A] dark:text-[#F1F5F9] hover:border-[#142B5F]/60 hover:bg-slate-50/80 dark:hover:border-[#D6A43B]/70 dark:hover:bg-[#183456] font-semibold'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${active ? 'text-[#F2CD78]' : 'text-[#142B5F] dark:text-[#E5B54F]'}`} />
              <span className="text-[12px] sm:text-[13px] font-['Cairo',sans-serif] leading-[1.3] text-center whitespace-nowrap">{item.label}</span>
            </button>
          );
        })}
      </div>

      {children}
    </main>
  );
}
