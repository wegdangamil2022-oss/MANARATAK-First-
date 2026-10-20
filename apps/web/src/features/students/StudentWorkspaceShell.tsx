import { useEffect, useState, type ReactNode } from 'react';
import { User, Home, Route, BookOpen, Heart, GraduationCap, ClipboardList, Bell, Settings2, MapPin, Clock3, Mail, Sparkles } from 'lucide-react';
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
  countryName, countryFlag, cityName, timezone, previewMode = false, accessibility = {},
}: Props) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(tick);
  }, []);
  const clock = localClock(timezone, now);
  const place = cityName || (timezone ? timezoneCities[timezone] : undefined);

  return (
    <main
      dir="rtl"
      data-text-scale={String(accessibility.textScale || 'DEFAULT')}
      data-reduce-motion={String(Boolean(accessibility.reduceMotion))}
      data-high-contrast={String(Boolean(accessibility.highContrast))}
      className="mn-student-workspace w-full max-w-4xl mx-auto px-3 sm:px-6 pb-28 sm:pb-16 text-right font-['Cairo',sans-serif] min-h-screen text-[var(--mn-text)]"
    >
      {/* Student identity: indigo on the left, teal on the right, subtle gold details. */}
      <section
        aria-label="بطاقة هوية الطالب"
        className="mn-inverse relative isolate overflow-hidden rounded-[26px] border border-[#46C1BB]/40 text-white shadow-md mx-auto w-full mt-4"
        style={{ backgroundImage: 'radial-gradient(circle at 15% 13%, rgba(222,173,66,.14), transparent 32%), radial-gradient(circle at 89% 86%, rgba(230,184,89,.08), transparent 37%), linear-gradient(105deg, #142B5F 0%, #142B5F 54%, #184569 73%, #0E7C86 100%)' }}
      >
        {/* Purely decorative gold starlight, behind the content and reduced-motion safe. */}
        <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none select-none">
          <div className="absolute -left-12 -top-16 h-40 w-40 rounded-full bg-[#E6B75B]/15 blur-3xl" />
          <div className="absolute -right-12 bottom-0 h-36 w-36 rounded-full bg-[#D6A43B]/10 blur-3xl" />
          <Sparkles className="absolute top-7 left-[13%] h-5 w-5 text-[#EFC674] opacity-55" strokeWidth={1.4} />
          <Sparkles className="absolute top-[42%] right-[8%] h-3 w-3 text-[#F6D68B] opacity-45" strokeWidth={1.4} />
          <span className="absolute bottom-[25%] left-[13%] h-1 w-1 rounded-full bg-[#F5CF83]/55" />
          <span className="absolute top-[25%] left-[35%] h-1 w-1 rounded-full bg-[#F5CF83]/55" />
          <svg className="absolute inset-0 w-full h-full opacity-25" viewBox="0 0 800 300" preserveAspectRatio="none" fill="none">
            <path d="M-55 255 Q180 150 390 205 T855 120" stroke="#F0C778" strokeWidth="1.1" strokeLinecap="round" />
            <path d="M-40 266 Q180 165 398 215 T855 135" stroke="#F0C778" strokeWidth=".6" strokeLinecap="round" opacity=".48" />
          </svg>
        </div>
        <div className="relative z-10 h-[3px] w-full bg-gradient-to-r from-transparent via-[#E7B85F] to-transparent" />

        <div className="relative z-10 p-3.5 sm:p-5">
          {/* Avatar and the exact existing title font sizes. */}
          <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => onTabChange('PROFILE')}
              title="عرض وتعديل ملفي"
              className="flex flex-1 items-center gap-2.5 sm:gap-3 min-w-0 text-right cursor-pointer group/profile focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#71E5D9]"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-[3px] border-[#43CDC3] bg-[#142B5F] shrink-0 flex items-center justify-center shadow-sm group-hover/profile:scale-[1.03] transition-transform">
                <User className="w-7 h-7 sm:w-8 sm:h-8 text-[#65E0D4]" strokeWidth={1.8} />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-lg font-bold text-[#F0C872] leading-tight [overflow-wrap:anywhere] group-hover/profile:text-[#FFDE96] transition-colors">
                  {displayName || 'حساب الطالب'}
                </h1>
                <p className="text-[10px] sm:text-[11px] text-white/85 mt-1 leading-relaxed">
                  {previewMode ? 'حساب الطالب • معاينة التصميم' : 'حساب الطالب'}
                </p>
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
            <div className="min-w-0 rounded-xl border border-[#65ADB9]/75 bg-[#19516E] px-2.5 py-2.5 sm:px-3 sm:py-3 shadow-sm">
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
          <div className="mt-3.5 pt-2.5 border-t border-[#E5BD68]/55 flex items-center justify-center gap-2 min-w-0">
            <Mail className="h-3.5 w-3.5 shrink-0 text-[#8CE7DE]" />
            <span dir="ltr" className="min-w-0 truncate text-[10.5px] sm:text-[11.5px] font-medium text-white/90 font-['Cairo',sans-serif]">
              {email || 'لم يُضف بريد إلكتروني'}
            </span>
          </div>
        </div>
      </section>

      {/* Original P15 navigation; no additional account sections. */}
      <div role="navigation" aria-label="أقسام حساب الطالب" className="w-full max-w-4xl mx-auto mt-3.5 p-1 sm:p-1.5 rounded-2xl bg-[var(--mn-surface)] dark:bg-[var(--mn-surface)] border border-[var(--mn-border)] dark:border-white/10 shadow-sm grid grid-cols-4 lg:grid-cols-8 gap-1 sm:gap-1.5 mn-panel">
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
