import { useEffect, useState, type ReactNode } from 'react';
import { User, Home, Route, BookOpen, Heart, GraduationCap, ClipboardList, Bell, Settings2, MapPin, Clock3, Mail } from 'lucide-react';
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
  { id: 'CAREERS', label: 'مساري المهني', icon: GraduationCap },
  { id: 'SERVICES', label: 'طلباتي', icon: ClipboardList },
  { id: 'NOTIFICATIONS', label: 'إشعاراتي', icon: Bell },
  { id: 'PROFILE', label: 'ملفي وإعداداتي', icon: User },
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
};

const timezoneCities: Record<string, string> = {
  'Asia/Aden': 'صنعاء',
  'Asia/Riyadh': 'الرياض',
  'Asia/Dubai': 'دبي',
  'Africa/Cairo': 'القاهرة',
  'UTC': 'UTC',
};

function localClock(zone: string | null | undefined, now: Date): string {
  if (!zone) return '—';
  try {
    return new Intl.DateTimeFormat('ar', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: zone }).format(now);
  } catch {
    return '—';
  }
}

export function StudentWorkspaceShell({
  children, activeTab: tab, onTabChange, displayName, email,
  countryName, countryFlag, cityName, timezone, accessibility = {},
}: Props) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(tick);
  }, []);
  const clock = localClock(timezone, now);
  const place = cityName || (timezone ? timezoneCities[timezone] : undefined);
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
      {/* Full-bleed student identity on mobile: navy dominant, restrained teal at the right edge. */}
      <section
        aria-label="بطاقة هوية الطالب"
        className="mn-inverse relative isolate -mx-3 sm:-mx-6 mt-0 w-[calc(100%+1.5rem)] sm:w-[calc(100%+3rem)] overflow-hidden rounded-none border-0 shadow-none text-white"
        style={{ backgroundImage: 'linear-gradient(105deg, #142B5F 0%, #142B5F 67%, #173E67 85%, #0E7C86 100%)' }}
      >
        <div className="relative z-10 p-3.5 sm:p-5">
          {/* English name: avatar left/settings right. Arabic name: avatar right/settings left. */}
          <div dir={isLatinName ? 'ltr' : 'rtl'} className="flex items-start gap-2.5 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => onTabChange('PROFILE')}
              title="عرض وتعديل ملفي"
              className="flex flex-1 items-center gap-2.5 sm:gap-3 min-w-0 text-start cursor-pointer group/profile focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#71E5D9]"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-[3px] border-[#43CDC3] bg-[#142B5F] shrink-0 flex items-center justify-center shadow-sm group-hover/profile:scale-[1.03] transition-transform">
                <User className="w-7 h-7 sm:w-8 sm:h-8 text-[#65E0D4]" strokeWidth={1.8} />
              </div>
              <div className="min-w-0 flex-1">
                <h1 dir={isLatinName ? 'ltr' : 'rtl'} className="text-base sm:text-lg font-bold text-[#F0C872] leading-tight [overflow-wrap:anywhere] group-hover/profile:text-[#FFDE96] transition-colors">
                  {displayName || 'حساب الطالب'}
                </h1>
              </div>
            </button>
            <button
              type="button"
              onClick={() => onTabChange('PROFILE')}
              title="ملفي وإعداداتي"
              aria-label="فتح ملفي وإعداداتي"
              className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#24466B] border border-[#75C5C4]/70 text-white flex items-center justify-center shadow-sm hover:bg-[#2B5676] cursor-pointer focus-visible:outline focus-visible:outline-offset-2"
            >
              <Settings2 className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>

          <div className="my-3.5 sm:my-4 h-px bg-[#D9ECF0]/40" />

          {/* Compact residence and actual IANA-timezone clock: no progress/courses here. */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="min-w-0 rounded-xl border border-[#76ADBE]/75 bg-[#203F6A] px-2.5 py-2.5 sm:px-3 sm:py-3 shadow-sm">
              <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-[#C9F2EB]">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span>دولة الطالب</span>
              </div>
              <p className="mt-1 text-xs sm:text-sm font-bold text-white truncate" title={countryName || 'لم تُحدد الدولة بعد'}>
                {countryFlag ? `${countryFlag} ` : ''}{countryName || 'غير محددة'}
              </p>
            </div>
            <div className="min-w-0 rounded-xl border border-[#76ADBE]/75 bg-[#203F6A] px-2.5 py-2.5 sm:px-3 sm:py-3 shadow-sm">
              <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-[#C9F2EB]">
                <Clock3 className="h-3.5 w-3.5 shrink-0" />
                <span>التوقيت المحلي</span>
              </div>
              <p className="mt-1 text-xs sm:text-sm font-bold text-white truncate" title={timezone || 'المنطقة الزمنية غير محددة'}>
                {place ? `${place} · ` : ''}{clock}
              </p>
            </div>
          </div>

          {/* Email is intentionally LAST, below both compact cards. */}
          <div className="mt-3.5 pt-2.5 border-t border-[#D9ECF0]/40 flex items-center justify-center gap-2 min-w-0">
            <Mail className="h-3.5 w-3.5 shrink-0 text-[#8CE7DE]" />
            <span dir="ltr" className="min-w-0 truncate text-[10.5px] sm:text-[11.5px] font-medium text-white/90 font-['Cairo',sans-serif]">
              {email || 'لم يُضف بريد إلكتروني'}
            </span>
          </div>
        </div>
        {/* Gold baseline joins the identity panel to the quick-access navigation. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[3px] bg-gradient-to-r from-[#B38018] via-[#F2CE75] to-[#B38018]" />
      </section>

      {/* Original P15 navigation; no additional account sections. */}
      <div role="navigation" aria-label="أقسام حساب الطالب" className="mn-student-nav relative -mx-3 sm:-mx-6 w-[calc(100%+1.5rem)] sm:w-[calc(100%+3rem)] mt-0 px-2.5 py-2.5 sm:px-3 sm:py-3 rounded-none bg-[var(--mn-surface)] dark:bg-[var(--mn-surface)] border-x-0 border-t-0 border-b border-[var(--mn-border)] shadow-none grid grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-2.5 mn-panel">
        {tabs.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-current={active ? 'page' : undefined}
              title={item.id === 'PROFILE' ? 'ملفي وإعدادات الحساب' : item.label}
              onClick={() => onTabChange(item.id)}
              className={`mn-student-nav-tile min-w-0 min-h-[76px] rounded-xl border px-1.5 py-2.5 flex flex-col items-center justify-center gap-1.5 transition-colors duration-150 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E7C86] ${
                active
                  ? 'border-[#D6A43B] bg-[#142B5F] text-white dark:bg-[#D6A43B] dark:text-[#142B5F] shadow-sm font-semibold'
                  : 'border-[#D6A43B]/55 bg-[#FFFCF5] text-[#29404B] dark:border-[#D6A43B]/65 dark:bg-[#13294D] dark:text-[#EEF4F6] hover:border-[#B78A2B] hover:bg-[#FBF4E7] dark:hover:bg-[#1B365A] font-medium'
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? 'text-[#E5B54F] dark:text-[#142B5F]' : 'text-[#586A74] dark:text-[#EEF4F6]'}`} />
              <span className="text-[11px] font-medium font-['Cairo',sans-serif] leading-[1.5] break-words w-full min-h-[2.3em] flex items-center justify-center text-center">{item.label}</span>
            </button>
          );
        })}
      </div>
      {children}
    </main>
  );
}
