import React, { useMemo, useState } from 'react';
import {
  User,
  Heart,
  Bell,
  ListChecks,
  Search,
  Sparkles,
  BookOpen,
  Award,
  BadgeCheck,
  TrendingUp,
  CalendarClock,
  ChevronLeft,
  ShieldCheck,
  Settings2,
  History,
  Eye,
  SlidersHorizontal,
  Languages,
  Moon,
  Sun,
  LogIn,
  LayoutDashboard,
  MapPinned,
  GraduationCap,
  CheckCircle2,
  Clock3,
  ExternalLink,
  LockKeyhole,
  Smartphone,
  Info,
} from 'lucide-react';
import { ApplicationMilestone, FavoriteKind, Language, PushNotificationItem, UserProfile } from '../types';

type WorkspaceSection = 'hub' | 'vault' | 'journey' | 'control';

interface StudentWorkspacePageProps {
  profile?: UserProfile | null;
  language: Language;
  isDarkMode: boolean;
  favoriteTypeCounts: Partial<Record<FavoriteKind, number>>;
  favoritesCount: number;
  milestones: ApplicationMilestone[];
  notifications: PushNotificationItem[];
  onOpenFavorites: () => void;
  onOpenTracker: () => void;
  onOpenNotifications: () => void;
  onOpenGlobalSearch: () => void;
  onOpenSmartSearch: () => void;
  onOpenTools: () => void;
  onOpenAuth: () => void;
  onToggleLanguage: () => void;
  onToggleDarkMode: () => void;
  onRestrictedAction?: () => void;
}

const kindLabels: Partial<Record<FavoriteKind, string>> = {
  scholarship: 'منح',
  university: 'جامعات',
  major: 'تخصصات',
  country: 'دول',
  course: 'دورات',
  exam: 'اختبارات',
  article: 'مقالات',
  service: 'خدمات',
  tool: 'أدوات',
  career: 'وظائف وتدريب',
};

export const StudentWorkspacePage: React.FC<StudentWorkspacePageProps> = ({
  profile,
  language,
  isDarkMode,
  favoriteTypeCounts,
  favoritesCount,
  milestones,
  notifications,
  onOpenFavorites,
  onOpenTracker,
  onOpenNotifications,
  onOpenGlobalSearch,
  onOpenSmartSearch,
  onOpenTools,
  onOpenAuth,
  onToggleLanguage,
  onToggleDarkMode,
  onRestrictedAction,
}) => {
  const [section, setSection] = useState<WorkspaceSection>('hub');
  const [recommendationsEnabled, setRecommendationsEnabled] = useState(true);
  const [activityTrackingEnabled, setActivityTrackingEnabled] = useState(true);
  const [notificationPreviewEnabled, setNotificationPreviewEnabled] = useState(true);

  const handleAction = (fallback?: () => void) => {
    if (onRestrictedAction) {
      onRestrictedAction();
    } else if (fallback) {
      fallback();
    }
  };

  const unreadCount = notifications.filter((item) => !item.read).length;
  const activeMilestones = milestones.filter((item) => item.progress < 100);
  const completedTasks = milestones.reduce(
    (total, item) => total + item.checklist.filter((task) => task.completed).length,
    0,
  );
  const totalTasks = milestones.reduce((total, item) => total + item.checklist.length, 0);
  const journeyProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const profileCompletion = useMemo(() => {
    if (!profile) return 0;
    const values = [
      profile.name,
      profile.email,
      profile.degreeLevel,
      profile.targetMajor,
      profile.gpa,
      profile.englishLevel,
      profile.targetCountries?.length ? 'countries' : '',
    ];
    return Math.round((values.filter(Boolean).length / values.length) * 100);
  }, [profile]);

  const latestJourneyItems = useMemo(() => {
    const milestoneItems = milestones.slice(0, 2).map((item) => ({
      id: `milestone-${item.id}`,
      title: item.scholarshipTitle,
      meta: `${item.stage} • ${item.progress}%`,
      type: 'طلب/متابعة',
    }));
    const notificationItems = notifications.slice(0, 2).map((item) => ({
      id: `notification-${item.id}`,
      title: item.title,
      meta: item.timestamp,
      type: 'تنبيه',
    }));
    return [...milestoneItems, ...notificationItems].slice(0, 4);
  }, [milestones, notifications]);

  const savedGroups = Object.entries(favoriteTypeCounts)
    .filter(([, count]) => (count || 0) > 0)
    .sort((a, b) => (b[1] || 0) - (a[1] || 0))
    .slice(0, 6) as [FavoriteKind, number][];

  const navigation = [
    { id: 'hub' as const, label: 'الرئيسية', icon: LayoutDashboard },
    { id: 'vault' as const, label: 'المحفوظات', icon: Heart },
    { id: 'journey' as const, label: 'رحلتي', icon: History },
    { id: 'control' as const, label: 'الإعدادات', icon: Settings2 },
  ];

  const EmptyWidget = ({ icon: Icon, title, text }: { icon: React.ElementType; title: string; text: string }) => (
    <div className="rounded-2xl border border-dashed border-[var(--mn-border)] dark:border-[var(--mn-border)] bg-[var(--mn-page)]/70 dark:bg-[var(--mn-surface-elevated)] p-4 text-center dark:mn-panel ">
      <Icon className="w-6 h-6 mx-auto text-[var(--mn-text-muted)] mb-2" />
      <div className="text-xs font-bold text-[var(--mn-heading)] dark:text-white">{title}</div>
      <p className="text-[10px] leading-5 text-[var(--mn-text-muted)] mt-1">{text}</p>
    </div>
  );

  return (
    <section className="w-full max-w-4xl mx-auto mn-inline-gutter pb-12 text-right font-['Cairo',sans-serif]" dir="rtl">
      <div className="pt-3 sm:pt-5">
        {/* Main Hero Card with Golden Top Bar & Royal Gradient */}
        <div className="relative overflow-hidden rounded-[26px] border border-[#142B5F] dark:border-[#B38018]/50 bg-gradient-to-br from-[#142B5F] via-[#112450] to-[#0c1a3b] text-white shadow-md relative group">
          {/* Top Golden Accent Line - Deep Royal Gold */}
          <div className="h-1.5 w-full bg-gradient-to-r from-[#B38018] via-[#DDAA35] to-[#B38018] shadow-2xs" />

          {/* Decorative Glow Elements */}
          <div className="absolute -left-12 -top-12 w-44 h-44 rounded-full bg-[#B38018]/15 blur-2xl pointer-events-none" />
          <div className="absolute -right-12 -bottom-12 w-48 h-48 rounded-full bg-white/5 blur-2xl pointer-events-none" />

          <div className="p-4 sm:p-6 space-y-4">
            {/* Top User Info Section */}
            <div className="relative flex items-center gap-3.5 sm:gap-4">
              <div className="w-13 h-13 sm:w-15 sm:h-15 rounded-2xl p-0.5 bg-gradient-to-tr from-[#B38018] via-[#DDAA35] to-[#B38018] shrink-0 flex items-center justify-center shadow-sm">
                <div className="w-full h-full rounded-[14px] bg-[#142B5F] border border-white/20 flex items-center justify-center text-white shadow-inner">
                  <User className="w-6 h-6 sm:w-7 sm:h-7 text-[#E0B244]" />
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl font-bold text-white leading-tight">
                  {profile?.name || 'حساب الطالب في منارتك'}
                </h1>

                <p className="text-[11.5px] sm:text-[12.5px] leading-relaxed text-white/80 mt-1 max-w-xl font-medium">
                  {profile
                    ? 'مساحتك الشخصية المتكاملة لمتابعة رحلتك التعليمية، محفوظاتك، تنبيهاتك وإدارة ملفك الأكاديمي.'
                    : 'مساحتك الخاصة لمتابعة الفرص والمنح الدراسية، حفظ المسارات المفضلة، ومتابعة خطوات تقديمك خطوة بخطوة.'}
                </p>
              </div>
            </div>

            {/* Direct Login / Sign up Button - Petrol Indigo / Turquoise Navy with Golden Border */}
            {!profile && (
              <button
                type="button"
                onClick={() => handleAction(onOpenAuth)}
                data-mn-design="4df103579c"
                className="w-full min-h-[38px] rounded-xl bg-gradient-to-r from-[#0d2a45] via-[#113a5f] to-[#0d2a45] hover:brightness-110 border border-[#D6A43B] hover:border-[#F3CE74] text-white font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-md cursor-pointer py-2 px-3.5 relative overflow-hidden group"
              >
                <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#D6A43B] to-transparent" />
                <LogIn className="w-4 h-4 text-[#E5B54F] stroke-[2.2]" />
                <span data-mn-design="01abfae3c9" className="text-white font-bold">تسجيل الدخول أو إنشاء حساب</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs Bar - Normal flow without sticky overlap */}
        <div className="mt-3.5 p-1.5 rounded-2xl bg-[var(--mn-surface)] dark:bg-[var(--mn-surface)] border border-[var(--mn-border)] dark:border-white/10 shadow-sm grid grid-cols-4 gap-1.5 mn-panel">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className={`min-w-0 rounded-xl px-1.5 py-2 flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  active
                    ? 'bg-[var(--mn-primary)] text-white shadow-xs font-bold'
                    : 'text-[var(--mn-text-muted)] hover:bg-[var(--mn-page)] dark:hover:bg-[var(--mn-surface-elevated)] font-medium'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-[#E5B54F]' : ''}`} />
                <span className="text-[10px] sm:text-[11px] whitespace-nowrap">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Section: HUB */}
        {section === 'hub' && (
          <div className="mt-3.5 space-y-3.5">
            {/* Quick Stat Counters */}
            <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
              {[
                { label: 'محفوظ', value: favoritesCount, icon: Heart, action: () => handleAction(onOpenFavorites) },
                { label: 'تنبيهات', value: unreadCount, icon: Bell, action: () => handleAction(onOpenNotifications) },
                { label: 'متابعات', value: activeMilestones.length, icon: ListChecks, action: () => setSection('journey') },
                { label: 'التقدم', value: `${journeyProgress}%`, icon: CheckCircle2, action: () => setSection('journey') },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    onClick={item.action}
                    className="rounded-2xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] p-2.5 sm:p-3 min-h-[80px] text-center shadow-2xs hover:shadow-xs active:scale-[0.98] transition-all mn-panel cursor-pointer group"
                  >
                    <Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5 mx-auto text-[#142B5F] dark:text-[#E5B54F] mb-1.5 group-hover:scale-110 transition-transform" />
                    <div className="text-sm sm:text-base font-bold text-[var(--mn-heading)] leading-none">{item.value}</div>
                    <div className="text-[9.5px] sm:text-[10.5px] font-semibold text-[var(--mn-text-muted)] mt-1.5">{item.label}</div>
                  </button>
                );
              })}
            </div>

            {/* Academic Profile Card */}
            <div className="rounded-2xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] p-4 shadow-2xs mn-panel">
              <div className="text-center mb-3.5">
                <div className="inline-flex items-center justify-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#142B5F] dark:bg-[#0c1a3b] border border-[#D6A43B]/30 flex items-center justify-center text-[#E5B54F] shadow-2xs">
                    <GraduationCap className="w-3.5 h-3.5 text-[#E5B54F]" />
                  </div>
                  <h2 className="text-[13.5px] sm:text-sm font-bold text-[var(--mn-heading)] font-['Cairo',sans-serif]">ملفي الأكاديمي</h2>
                </div>
                <div className="h-[2px] w-14 mx-auto bg-gradient-to-r from-transparent via-[#D6A43B] to-transparent rounded-full my-1.5" />
                <p className="text-[10.5px] text-[var(--mn-text-muted)] font-medium">ملخص بياناتك الأكاديمية والدرجة والتخصص المستهدف.</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  ['الدرجة المستهدفة', profile?.degreeLevel || 'غير محدد'],
                  ['التخصص المستهدف', profile?.targetMajor || 'غير محدد'],
                  ['المعدل التراكمي', profile?.gpa || 'غير مرتبط'],
                  ['مستوى الإنجليزية', profile?.englishLevel || 'غير محدد'],
                  ['الدول المستهدفة', profile?.targetCountries?.length ? profile.targetCountries.join('، ') : 'غير محدد'],
                  ['حالة الحساب', profile ? 'مرتبط ومفعل' : 'معاينة فقط'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] border border-[var(--mn-border)] dark:border-white/10 p-2.5 mn-panel text-center">
                    <div className="text-[9.5px] font-bold text-[var(--mn-text-muted)]">{label}</div>
                    <div className="text-[11px] font-bold text-[var(--mn-heading)] mt-1 line-clamp-2">{value}</div>
                  </div>
                ))}
              </div>
              {!profile && (
                <button
                  type="button"
                  onClick={() => handleAction(onOpenAuth)}
                  data-mn-design="3b7dc7a9b0"
                  className="mt-3.5 w-full min-h-[36px] rounded-xl bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] border border-[var(--mn-border)] hover:border-[#D6A43B]/60 dark:border-white/10 dark:hover:border-[#E5B54F]/50 text-[var(--mn-heading)] dark:text-[#E5B54F] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs py-2 px-3 relative overflow-hidden group"
                >
                  <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#D6A43B]/60 to-transparent" />
                  <span data-mn-design="3b7dc7a9b0">تسجيل الدخول لإكمال ملفك الأكاديمي</span>
                  <ChevronLeft className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#E5B54F] group-hover:-translate-x-0.5 transition-transform" />
                </button>
              )}
            </div>

            {/* Journey & Deadlines 2-Column Grid */}
            <div className="grid sm:grid-cols-2 gap-3.5">
              {/* Journey Now */}
              <div className="rounded-2xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] p-4 shadow-2xs mn-panel flex flex-col justify-between">
                <div>
                  <div className="text-center mb-3">
                    <div className="inline-flex items-center justify-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#142B5F] dark:bg-[#0c1a3b] border border-[#D6A43B]/30 flex items-center justify-center text-[#E5B54F] shadow-2xs">
                        <History className="w-3.5 h-3.5 text-[#E5B54F]" />
                      </div>
                      <h2 className="text-[13.5px] sm:text-sm font-bold text-[var(--mn-heading)] font-['Cairo',sans-serif]">رحلتي الآن</h2>
                    </div>
                    <div className="h-[2px] w-14 mx-auto bg-gradient-to-r from-transparent via-[#D6A43B] to-transparent rounded-full my-1.5" />
                    <p className="text-[10.5px] text-[var(--mn-text-muted)] font-medium">ملخص الخطوات والمتابعات الجارية.</p>
                  </div>
                  {latestJourneyItems.length ? (
                    <div className="space-y-2">
                      {latestJourneyItems.slice(0, 3).map((item) => (
                        <div key={item.id} className="rounded-xl bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] p-2.5 border border-[var(--mn-border)] dark:border-white/10 mn-panel">
                          <div className="text-[9.5px] font-bold text-[#142B5F] dark:text-[#E5B54F]">{item.type}</div>
                          <div className="text-[11px] font-bold text-[var(--mn-heading)] mt-0.5 line-clamp-1">{item.title}</div>
                          <div className="text-[9.5px] text-[var(--mn-text-muted)] mt-1">{item.meta}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyWidget icon={History} title="رحلتك ستظهر هنا" text="تظهر الخطوات والأحداث بعد تسجيل الدخول وبدء التقديم." />
                  )}
                </div>
                {latestJourneyItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSection('journey')}
                    data-mn-design="3b7dc7a9b0"
                    className="mt-3 w-full min-h-[36px] rounded-xl bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] border border-[var(--mn-border)] hover:border-[#D6A43B]/60 dark:border-white/10 dark:hover:border-[#E5B54F]/50 text-[var(--mn-heading)] dark:text-[#E5B54F] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs py-2 px-3 relative overflow-hidden group"
                  >
                    <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#D6A43B] to-transparent" />
                    <span data-mn-design="3b7dc7a9b0">عرض الرحلة والمتابعة</span>
                    <ChevronLeft className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#E5B54F] group-hover:-translate-x-0.5 transition-transform" />
                  </button>
                )}
              </div>

              {/* Important Deadlines */}
              <div className="rounded-2xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] p-4 shadow-2xs mn-panel flex flex-col justify-between">
                <div>
                  <div className="text-center mb-3">
                    <div className="inline-flex items-center justify-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#142B5F] dark:bg-[#0c1a3b] border border-[#D6A43B]/30 flex items-center justify-center text-[#E5B54F] shadow-2xs">
                        <CalendarClock className="w-3.5 h-3.5 text-[#E5B54F]" />
                      </div>
                      <h2 className="text-[13.5px] sm:text-sm font-bold text-[var(--mn-heading)] font-['Cairo',sans-serif]">المواعيد المهمة</h2>
                    </div>
                    <div className="h-[2px] w-14 mx-auto bg-gradient-to-r from-transparent via-[#D6A43B] to-transparent rounded-full my-1.5" />
                    <p className="text-[10.5px] text-[var(--mn-text-muted)] font-medium">المواعيد النهائية القادمة لفرصك.</p>
                  </div>
                  {activeMilestones.length ? (
                    <div className="space-y-2">
                      {activeMilestones.slice(0, 2).map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setSection('journey')}
                          className="w-full rounded-xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] p-2.5 text-right mn-panel cursor-pointer"
                        >
                          <div className="text-[11px] font-bold text-[var(--mn-heading)] line-clamp-1">{item.scholarshipTitle}</div>
                          <div className="mt-1.5 flex items-center justify-between gap-2 text-[9.5px] text-[var(--mn-text-muted)]">
                            <span>{item.stage}</span>
                            <span className="font-bold text-[#142B5F] dark:text-[#E5B54F]">{item.deadline}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <EmptyWidget icon={CalendarClock} title="لا توجد مواعيد حالية" text="سيظهر هنا أي موعد نهائي أو موعد تقديم يتطلب انتباهك." />
                  )}
                </div>
              </div>
            </div>

            {/* Achievements & Certificates Section */}
            <div className="grid sm:grid-cols-2 gap-3.5">
              {/* My Certificates & Achievements */}
              <div className="rounded-2xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] p-4 shadow-2xs mn-panel flex flex-col justify-between">
                <div>
                  <div className="text-center mb-3">
                    <div className="inline-flex items-center justify-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#142B5F] dark:bg-[#0c1a3b] border border-[#D6A43B]/30 flex items-center justify-center text-[#E5B54F] shadow-2xs">
                        <Award className="w-3.5 h-3.5 text-[#E5B54F]" />
                      </div>
                      <h2 className="text-[13.5px] sm:text-sm font-bold text-[var(--mn-heading)] font-['Cairo',sans-serif]">إنجازاتي والشهادات</h2>
                    </div>
                    <div className="h-[2px] w-14 mx-auto bg-gradient-to-r from-transparent via-[#D6A43B] to-transparent rounded-full my-1.5" />
                    <p className="text-[10px] text-[var(--mn-text-muted)] font-medium">الشهادات المكتسبة والأوسمة الرقمية.</p>
                  </div>

                  <EmptyWidget
                    icon={Award}
                    title="لا توجد شهادات مرتبطة بعد"
                    text="عند إتمام دورة تدريبية أو اجتياز برنامج بنجاح، ستصدر شهادتك المعتمدة وتظهر هنا تلقائياً مع خيار التحميل والمشاركة."
                  />
                </div>
              </div>

              {/* Continue Learning / Courses */}
              <div className="rounded-2xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] p-4 shadow-2xs mn-panel flex flex-col justify-between">
                <div>
                  <div className="text-center mb-3">
                    <div className="inline-flex items-center justify-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#142B5F] dark:bg-[#0c1a3b] border border-[#D6A43B]/30 flex items-center justify-center text-[#E5B54F] shadow-2xs">
                        <BookOpen className="w-3.5 h-3.5 text-[#E5B54F]" />
                      </div>
                      <h2 className="text-[13.5px] sm:text-sm font-bold text-[var(--mn-heading)] font-['Cairo',sans-serif]">متابعة الدورات والتعلم</h2>
                    </div>
                    <div className="h-[2px] w-14 mx-auto bg-gradient-to-r from-transparent via-[#D6A43B] to-transparent rounded-full my-1.5" />
                    <p className="text-[10px] text-[var(--mn-text-muted)] font-medium">الدورات الجارية ونسبة الإنجاز والدروس.</p>
                  </div>

                  <EmptyWidget
                    icon={BookOpen}
                    title="لم تسجل في أي دورة بعد"
                    text="استكشف دليل الدورات وسجل في دوراتك المفضلة لمتابعة تقدمك التعليمي والدروس خطوة بخطوة."
                  />
                </div>
              </div>
            </div>

            {/* Recommendations Banner */}
            <div className="rounded-2xl border border-[#D6A43B]/30 bg-gradient-to-r from-[#D6A43B]/10 via-[#F3CE74]/5 to-transparent p-4">
              <div className="text-center max-w-xl mx-auto">
                <div className="inline-flex items-center justify-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#142B5F] dark:bg-[#0c1a3b] border border-[#D6A43B]/30 flex items-center justify-center text-[#E5B54F] shadow-2xs">
                    <Sparkles className="w-3.5 h-3.5 text-[#E5B54F]" />
                  </div>
                  <h2 className="text-[13.5px] sm:text-sm font-bold text-[var(--mn-heading)] font-['Cairo',sans-serif]">توصيات مخصصة لك</h2>
                </div>
                <div className="h-[2px] w-14 mx-auto bg-gradient-to-r from-transparent via-[#D6A43B] to-transparent rounded-full my-1.5" />
                <p className="text-[11px] leading-relaxed text-[var(--mn-text-muted)] font-medium mt-1">
                  اكتشف أفضل الفرص والمنح والدورات المتوافقة مع أهدافك وتخصصك الأكاديمي عبر محرك البحث الذكي.
                </p>
                <button
                  type="button"
                  onClick={() => handleAction(onOpenSmartSearch)}
                  data-mn-design="3b7dc7a9b0"
                  className="mt-3 inline-flex items-center justify-center gap-1.5 min-h-[34px] px-4 rounded-xl bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] border border-[var(--mn-border)] hover:border-[#D6A43B]/60 dark:border-white/10 dark:hover:border-[#E5B54F]/50 text-[var(--mn-heading)] dark:text-[#E5B54F] font-semibold transition-all cursor-pointer shadow-2xs py-1.5 relative overflow-hidden group"
                >
                  <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#D6A43B] to-transparent" />
                  <span data-mn-design="3b7dc7a9b0">استخدم البحث الذكي الآن</span>
                  <ChevronLeft className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#E5B54F] group-hover:-translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Section: VAULT */}
        {section === 'vault' && (
          <div className="mt-3.5 space-y-3.5">
            <div className="rounded-2xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] p-4 sm:p-5 shadow-2xs mn-panel">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold text-[#142B5F] dark:text-[#E5B54F]">خزنة المحفوظات</span>
                  <h2 className="text-base sm:text-lg font-bold text-[var(--mn-heading)] mt-0.5">المفضلة والمحفوظات</h2>
                  <p className="text-[11px] leading-relaxed text-[var(--mn-text-muted)] font-medium mt-1">مساحة موحدة لكل ما تحفظه من منح، جامعات، تخصصات ودورات.</p>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-red-500/10 dark:bg-red-500/15 flex items-center justify-center shrink-0">
                  <Heart className="w-5 h-5 text-red-600 dark:text-red-400 fill-red-500/20" />
                </div>
              </div>
              <div className="mt-4 text-3xl font-bold text-[var(--mn-heading)]">{favoritesCount}</div>
              <div className="text-[11px] font-medium text-[var(--mn-text-muted)] mt-0.5">عنصر محفوظ في حسابك</div>
            </div>

            {savedGroups.length ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {savedGroups.map(([kind, count]) => (
                  <button
                    key={kind}
                    onClick={() => handleAction(onOpenFavorites)}
                    className="rounded-xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] p-3 text-right shadow-2xs active:scale-[0.98] transition-all mn-panel cursor-pointer hover:border-[var(--mn-primary)] dark:hover:border-[#E5B54F]/40"
                  >
                    <div className="text-xl font-bold text-[var(--mn-heading)]">{count}</div>
                    <div className="text-[10.5px] font-bold text-[var(--mn-text-muted)] mt-1">{kindLabels[kind] || kind}</div>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyWidget icon={Heart} title="خزنتك فارغة حالياً" text="احفظ أي منحة أو جامعة أو دورة تعجبك للوصول إليها هنا في أي وقت." />
            )}

            <button
              type="button"
              onClick={() => handleAction(onOpenFavorites)}
              className="w-full min-h-[44px] rounded-xl bg-[var(--mn-primary)] hover:bg-[#1a3777] text-white border border-[#E5B54F]/40 font-bold text-xs sm:text-[13px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-xs cursor-pointer mn-inverse"
            >
              <span>فتح كل المفضلة والمحفوظات</span>
              <ChevronLeft className="w-4 h-4 text-[#E5B54F]" />
            </button>
          </div>
        )}

        {/* Section: JOURNEY */}
        {section === 'journey' && (
          <div className="mt-3.5 space-y-3.5">
            <div className="rounded-2xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] p-4 sm:p-5 shadow-2xs mn-panel">
              <span className="text-[10px] font-bold text-[#142B5F] dark:text-[#E5B54F]">مسار التقديم</span>
              <h2 className="text-base sm:text-lg font-bold text-[var(--mn-heading)] mt-0.5">رحلتي التعليمية</h2>
              <p className="text-[11px] leading-relaxed text-[var(--mn-text-muted)] font-medium mt-1">سجل تفاعلي يجمع كافة خطوات تقديمك على المنح والدورات والجامعات.</p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] p-3 text-center mn-panel">
                  <div className="text-lg font-bold text-[var(--mn-heading)]">{activeMilestones.length}</div>
                  <div className="text-[10px] font-semibold text-[var(--mn-text-muted)] mt-1">متابعة نشطة</div>
                </div>
                <div className="rounded-xl bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] p-3 text-center mn-panel">
                  <div className="text-lg font-bold text-[var(--mn-heading)]">{journeyProgress}%</div>
                  <div className="text-[10px] font-semibold text-[var(--mn-text-muted)] mt-1">تقدم المهام</div>
                </div>
                <div className="rounded-xl bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] p-3 text-center mn-panel">
                  <div className="text-lg font-bold text-[var(--mn-heading)]">{notifications.length}</div>
                  <div className="text-[10px] font-semibold text-[var(--mn-text-muted)] mt-1">تنبيهات الفرص</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] p-4 shadow-2xs mn-panel">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h3 className="text-[13.5px] sm:text-sm font-bold text-[var(--mn-heading)]">آخر النشاطات</h3>
                <Clock3 className="w-4 h-4 text-[#142B5F] dark:text-[#E5B54F]" />
              </div>
              {latestJourneyItems.length ? (
                <div className="relative pr-4 space-y-3 before:absolute before:right-[5px] before:top-2 before:bottom-2 before:w-px before:bg-[var(--mn-surface-muted)] dark:before:bg-white/10">
                  {latestJourneyItems.map((item) => (
                    <div key={item.id} className="relative">
                      <span className="absolute -right-4 top-1.5 w-2.5 h-2.5 rounded-full bg-[#E5B54F] ring-4 ring-[var(--mn-surface)]" />
                      <div className="rounded-xl bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] border border-[var(--mn-border)] dark:border-white/10 p-3 mn-panel">
                        <div className="text-[9.5px] font-bold text-[#142B5F] dark:text-[#E5B54F]">{item.type}</div>
                        <div className="text-[11px] font-bold text-[var(--mn-heading)] mt-0.5">{item.title}</div>
                        <div className="text-[9.5px] text-[var(--mn-text-muted)] mt-1">{item.meta}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyWidget icon={History} title="لا توجد أحداث مسجلة بعد" text="سيتم بناء سجل نشاطاتك تلقائياً عند التفاعل مع المنح والتقديمات." />
              )}
            </div>
          </div>
        )}

        {/* Section: CONTROL / SETTINGS */}
        {section === 'control' && (
          <div className="mt-3.5 space-y-3.5">
            <div className="rounded-2xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] p-4 sm:p-5 shadow-2xs mn-panel">
              <span className="text-[10px] font-bold text-[#142B5F] dark:text-[#E5B54F]">إعدادات الحساب</span>
              <h2 className="text-base sm:text-lg font-bold text-[var(--mn-heading)] mt-0.5">الإعدادات والخصوصية</h2>
              <p className="text-[11px] leading-relaxed text-[var(--mn-text-muted)] font-medium mt-1">تحكم في تفضيلات حسابك، الإشعارات، واللغة والمظهر.</p>
            </div>

            <div className="rounded-2xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] overflow-hidden shadow-2xs mn-panel">
              {[
                {
                  title: 'التوصيات المخصصة',
                  text: 'السماح بعرض فرص وبرامج مقترحة تتوافق مع اهتماماتك.',
                  icon: Sparkles,
                  enabled: recommendationsEnabled,
                  toggle: () => setRecommendationsEnabled((value) => !value),
                },
                {
                  title: 'سجل النشاط والبحث',
                  text: 'حفظ آخر ما قمت بالبحث عنه لتسهيل الرجوع إليه.',
                  icon: History,
                  enabled: activityTrackingEnabled,
                  toggle: () => setActivityTrackingEnabled((value) => !value),
                },
                {
                  title: 'التنبيهات الفورية',
                  text: 'إظهار تنبيهات مواعيد التقديم والمستجدات الهامة.',
                  icon: Bell,
                  enabled: notificationPreviewEnabled,
                  toggle: () => setNotificationPreviewEnabled((value) => !value),
                },
              ].map((item, index) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className={`p-3.5 sm:p-4 flex items-center gap-3 ${index ? 'border-t border-[var(--mn-border)] dark:border-white/10' : ''}`}>
                    <div className="w-9 h-9 rounded-xl bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] flex items-center justify-center shrink-0 text-[#142B5F] dark:text-[#E5B54F] mn-panel">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11.5px] font-bold text-[var(--mn-heading)]">{item.title}</div>
                      <p className="text-[10px] leading-4 text-[var(--mn-text-muted)] font-medium mt-0.5">{item.text}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAction(item.toggle)}
                      className={`w-11 h-6 p-0.5 rounded-full transition-colors shrink-0 cursor-pointer ${item.enabled ? 'bg-[#142B5F] dark:bg-[#E5B54F]' : 'bg-slate-300 dark:bg-slate-700'}`}
                      aria-label={`تبديل ${item.title}`}
                    >
                      <span className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${item.enabled ? '-translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleAction(onToggleLanguage)}
                className="rounded-xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] p-3 text-right flex items-center justify-between gap-2 mn-panel cursor-pointer hover:border-[var(--mn-primary)] dark:hover:border-[#E5B54F]/40"
              >
                <div>
                  <div className="text-[11px] font-bold text-[var(--mn-heading)]">اللغة</div>
                  <div className="text-[10px] font-medium text-[var(--mn-text-muted)] mt-0.5">{language === 'ar' ? 'العربية' : 'English'}</div>
                </div>
                <Languages className="w-4 h-4 text-[#142B5F] dark:text-[#E5B54F]" />
              </button>
              <button
                type="button"
                onClick={onToggleDarkMode}
                className="rounded-xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] p-3 text-right flex items-center justify-between gap-2 mn-panel cursor-pointer hover:border-[var(--mn-primary)] dark:hover:border-[#E5B54F]/40"
              >
                <div>
                  <div className="text-[11px] font-bold text-[var(--mn-heading)]">المظهر</div>
                  <div className="text-[10px] font-medium text-[var(--mn-text-muted)] mt-0.5">{isDarkMode ? 'الوضع الليلي' : 'الوضع النهاري'}</div>
                </div>
                {isDarkMode ? <Moon className="w-4 h-4 text-[#E5B54F]" /> : <Sun className="w-4 h-4 text-[#142B5F]" />}
              </button>
            </div>

            <div className="rounded-2xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] divide-y divide-[var(--mn-border)] dark:divide-white/10 shadow-2xs mn-panel">
              {[
                { label: 'إدارة مركز التنبيهات والإشعارات', icon: Bell, action: onOpenNotifications },
                { label: 'البحث داخل مساحة الطالب', icon: Search, action: onOpenGlobalSearch },
                { label: 'إعدادات الحساب وكلمة المرور', icon: LockKeyhole, action: onOpenAuth },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => handleAction(item.action)}
                    className="w-full min-h-[48px] px-4 flex items-center justify-between gap-3 text-right cursor-pointer hover:bg-[var(--mn-page)]/50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 text-[#142B5F] dark:text-[#E5B54F]" />
                      <span className="text-[11px] font-bold text-[var(--mn-heading)]">{item.label}</span>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-[var(--mn-text-muted)]" />
                  </button>
                );
              })}
            </div>

            <div className="rounded-xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] p-3 space-y-1.5 mn-panel">
              <div className="flex items-center gap-2 text-[11px] font-bold text-[var(--mn-heading)]">
                <ShieldCheck className="w-4 h-4 text-[#142B5F] dark:text-[#E5B54F]" />
                <span>خصوصيتك وأمان بياناتك في منارتك</span>
              </div>
              <p className="text-[10px] leading-relaxed text-[var(--mn-text-muted)] font-medium">
                بياناتك وملفاتك الأكاديمية مشفرة ومحمية بالكامل، ولا يتم مشاركتها إلا مع الجامعات والجهات التعليمية التي تختار التقديم إليها بنفسك.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
