import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpLeft,
  Award,
  BookOpen,
  BriefcaseBusiness,
  Calendar,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ClipboardList,
  Clock3,
  Compass,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  Folder,
  Gem,
  GraduationCap,
  HelpCircle,
  Heart,
  Layers,
  ListChecks,
  LockKeyhole,
  MessageSquare,
  Plus,
  Route,
  Scale,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Upload,
  UserCheck,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type {
  HydratedStudentSavedItemDto,
  StudentApplicationTrackerDto,
  StudentDashboardSummaryDto,
  StudentFinanceInvoiceDto,
  StudentSavedItemDto,
  StudentServiceRequestDto,
} from '../../api/client';
import { StudentDocumentUpload } from './StudentDocumentUpload';
import {
  computeNextPriorityStep,
  resolveDocumentStatusDimensions,
} from './studentAccountBriefLogic';

/**
 * Horizontal swipeable sub-navigation bar with selective Petrol (#0E7C86) scrollbar indicator
 * and official Royal Navy (#142B5F) icons on unselected pills.
 */
export interface SwipeTabItem<T extends string> {
  id: T;
  label: string;
  count?: number;
  icon: LucideIcon;
}

export function HorizontalSwipeTabs<T extends string>({
  items,
  activeId,
  onSelect,
  onChange,
  ariaLabel,
}: {
  items: ReadonlyArray<SwipeTabItem<T>>;
  activeId: T;
  onSelect?: (id: T) => void;
  onChange?: (id: T) => void;
  ariaLabel: string;
}) {
  const handleSelect = onSelect ?? onChange ?? (() => {});
  const gridColsClass =
    items.length >= 5
      ? 'grid-cols-3 sm:grid-cols-6'
      : items.length === 3
        ? 'grid-cols-3'
        : items.length === 2
          ? 'grid-cols-2'
          : 'grid-cols-4';

  return (
    <div className="-mt-px border-x-0 border-t border-b border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] px-2.5 py-1.5 shadow-2xs font-['Cairo',sans-serif]">
      <nav
        aria-label={ariaLabel}
        className={`grid ${gridColsClass} gap-1`}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.id === activeId;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={active}
              onClick={() => handleSelect(item.id)}
              className="mn-student-subtab-btn inline-flex items-center justify-center gap-1 transition-all cursor-pointer truncate"
            >
              <Icon
                className={`h-3 w-3 shrink-0 ${
                  active ? 'text-[#F2CD78]' : 'text-[#142B5F] dark:text-[#F2CD78]'
                }`}
                aria-hidden="true"
              />
              <span className="whitespace-nowrap">
                {item.label}
                {typeof item.count === 'number' ? ` (${item.count})` : ''}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

/**
 * Calm section container.
 * By default, NO start-of-box vertical stripe is rendered unless `accentStart = 'navy' | 'petrol'` is explicitly set,
 * honoring the user's instruction: "لاتفعل لكل الاقسام خط بداية المربع يعني فقط في البعض".
 */
export function CalmSectionCard({
  id,
  title,
  icon: Icon,
  badge,
  action,
  accentStart,
  children,
}: {
  id?: string;
  title: string;
  icon: LucideIcon;
  badge?: string;
  action?: React.ReactNode;
  accentStart?: 'navy' | 'petrol';
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-label={title}
      className="relative -mx-3 sm:-mx-6 w-[calc(100%+1.5rem)] sm:w-[calc(100%+3rem)] overflow-hidden rounded-none border-x-0 border-t border-b border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] py-3 sm:py-3.5 shadow-2xs mn-panel font-['Cairo',sans-serif]"
    >
      {accentStart && (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-y-0 right-0 w-[3.5px] z-10 ${
            accentStart === 'petrol' ? 'bg-[#0E7C86]' : 'bg-[#142B5F]'
          }`}
        />
      )}

      <div className="flex min-w-0 items-center justify-between gap-2 px-3.5 sm:px-5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg border border-[#D6A43B]/45 bg-[#142B5F] text-[#F2CD78]">
            <Icon className="h-3.5 w-3.5 text-[#F2CD78]" aria-hidden="true" />
          </span>
          <h3 className="text-[13px] sm:text-[14px] font-bold leading-snug text-[#1E293B] dark:text-[#F8FAFC] font-['Cairo',sans-serif]">
            {title}
          </h3>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {badge && (
            <span className="rounded-md border border-[#0E7C86]/25 bg-[#0E7C86]/10 px-2 py-0.5 text-[9.5px] font-bold text-[#0E7C86] dark:text-[#55CBC5]">
              {badge}
            </span>
          )}
          {action}
        </div>
      </div>

      <div className="mt-3 pt-0.5 px-3.5 sm:px-5">{children}</div>
    </section>
  );
}

/**
 * 1) خطوتي التالية (Next Priority Action in ملخصي)
 * Connected layout without divider line, Navy Gem icon, normal dark larger scholarship title,
 * smaller task title, and compact white+petrol action button.
 */
export function NextStepHeroCard({
  trackers = [],
  invoices = [],
  courses,
  dashboard,
  onNavigateTab,
  onNavigate,
}: {
  trackers?: readonly StudentApplicationTrackerDto[];
  invoices?: readonly StudentFinanceInvoiceDto[];
  courses?: StudentDashboardSummaryDto['courseEnrollments'];
  dashboard?: StudentDashboardSummaryDto;
  onNavigateTab?: (tab: 'OPPORTUNITIES' | 'LEARNING' | 'SERVICES' | 'PROFILE') => void;
  onNavigate?: (tab: 'OPPORTUNITIES' | 'LEARNING' | 'SERVICES' | 'PROFILE') => void;
}) {
  const resolvedCourses = courses ?? dashboard?.courseEnrollments ?? [];
  const handleNavigate = onNavigateTab ?? onNavigate ?? (() => {});
  const step = useMemo(
    () => computeNextPriorityStep({ trackers, invoices, courses: resolvedCourses }),
    [trackers, invoices, resolvedCourses],
  );

  return (
    <CalmSectionCard
      title="خطوتي التالية"
      icon={Target}
      badge={step.dateLabel}
    >
      <div className="relative overflow-hidden rounded-xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] pr-3.5 pl-2.5 py-2 flex items-center justify-between gap-2">
        <span
          aria-hidden="true"
          className="mn-student-card-start-bar"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="grid h-[19px] w-[19px] shrink-0 place-items-center rounded-[5px] bg-[#142B5F] text-white">
              <Gem className="h-3 w-3 text-white" aria-hidden="true" />
            </span>
            <span className="text-[11px] sm:text-[12px] font-bold leading-snug text-[#1E293B] dark:text-[#F8FAFC] truncate">
              {step.subtitle}
            </span>
          </div>
          <h4 className="mt-0.5 pr-[25px] text-[9.5px] sm:text-[10.5px] font-semibold text-[#475569] dark:text-[#CBD5E1] leading-snug break-words">
            {step.title}
          </h4>
        </div>

        <button
          type="button"
          onClick={() => handleNavigate(step.targetTab)}
          className="mn-student-summary-primary-action shrink-0 inline-flex items-center justify-center gap-1 rounded-md px-2.5 py-0.5 text-[9.5px] font-bold text-[#F2CD78] transition-colors cursor-pointer"
        >
          <span>{step.ctaLabel}</span>
          <ArrowLeft className="h-2.5 w-2.5 text-[#F2CD78]" aria-hidden="true" />
        </button>
      </div>
    </CalmSectionCard>
  );
}

/**
 * 3) هذا الأسبوع (Upcoming Deadlines & Tasks in ملخصي)
 */
export function ThisWeekScheduleCard({
  trackers = [],
  courses,
  dashboard,
  onOpenCalendar,
}: {
  trackers?: readonly StudentApplicationTrackerDto[];
  courses?: StudentDashboardSummaryDto['courseEnrollments'];
  dashboard?: StudentDashboardSummaryDto;
  onOpenCalendar: () => void;
  onNavigate?: (tab: 'OPPORTUNITIES' | 'LEARNING' | 'SERVICES' | 'PROFILE') => void;
}) {
  const resolvedCourses = courses ?? dashboard?.courseEnrollments ?? [];
  const items = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      meta: string;
      tag: string;
      kind: 'SCHOLARSHIP' | 'COURSE';
    }> = [];
    (trackers ?? [])
      .filter((t) => t.status === 'ACTIVE')
      .slice(0, 2)
      .forEach((t) => {
        const name =
          t.owner?.displayName ||
          (typeof t.ownerSnapshot?.displayName === 'string'
            ? t.ownerSnapshot.displayName
            : 'ملف منحة');
        list.push({
          id: `wk-tr-${t.id}`,
          title: name,
          meta: t.stage,
          tag: t.deadlineAt
            ? new Date(t.deadlineAt).toLocaleDateString('ar', {
                month: 'short',
                day: 'numeric',
              })
            : 'متجدد',
          kind: 'SCHOLARSHIP',
        });
      });

    const activeCourse = (resolvedCourses ?? []).find((c) => c.progressPercentage < 100);
    if (activeCourse) {
      list.push({
        id: `wk-cr-${activeCourse.courseId}`,
        title: activeCourse.courseName,
        meta: 'مراجعة درس هذا الأسبوع',
        tag: `${activeCourse.progressPercentage}%`,
        kind: 'COURSE',
      });
    }
    return list.slice(0, 3);
  }, [trackers, resolvedCourses]);

  return (
    <CalmSectionCard
      title="هذا الأسبوع"
      icon={CalendarClock}
      action={
        <button
          type="button"
          onClick={onOpenCalendar}
          className="mn-student-summary-header-link inline-flex items-center gap-1 rounded-md border border-[var(--mn-border)] bg-[var(--mn-page)] px-2 py-0.5 text-[9.5px] font-bold text-[#142B5F] dark:text-[#F8FAFC] hover:border-[#0E7C86] cursor-pointer"
        >
          <span>التقويم والمهام</span>
          <ChevronLeft className="h-2.5 w-2.5 text-[#142B5F] dark:text-[#F2CD78]" aria-hidden="true" />
        </button>
      }
    >
      <div className="grid gap-1.5 sm:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="relative overflow-hidden flex items-center justify-between gap-2 rounded-xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] pr-3.5 pl-2.5 py-2"
          >
            <span
              aria-hidden="true"
              className="mn-student-card-start-bar"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="grid h-[19px] w-[19px] shrink-0 place-items-center rounded-[5px] bg-[#142B5F] text-white">
                  {item.kind === 'COURSE' ? (
                    <BookOpen className="h-3 w-3 text-white" aria-hidden="true" />
                  ) : (
                    <GraduationCap className="h-3 w-3 text-white" aria-hidden="true" />
                  )}
                </span>
                <h4 className="min-w-0 flex-1 text-[10.5px] font-bold leading-snug text-[#1E293B] dark:text-[#F8FAFC] truncate">
                  {item.title}
                </h4>
              </div>
              <p className="mt-0.5 pr-[25px] text-[9.5px] font-medium leading-snug text-[#64748B] dark:text-[#94A3B8] truncate">
                {item.meta}
              </p>
            </div>
            <span className="shrink-0 rounded-md border border-[#0E7C86]/25 bg-[#0E7C86]/10 px-1.5 py-0.5 text-[9px] font-bold text-[#0E7C86] dark:text-[#55CBC5]">
              {item.tag}
            </span>
          </div>
        ))}
      </div>
    </CalmSectionCard>
  );
}

/**
 * 5) مناسب لهدفي (Goal-Matched Recommendations in ملخصي)
 */
const STUDENT_GOALS = [
  { id: 'MASTERS_SCHOLARSHIP', label: 'منحة ماجستير ممولة · 2027' },
  { id: 'BACHELOR_ADMISSION', label: 'قبول جامعي بكالوريوس · 2027' },
  { id: 'IELTS_PREP', label: 'تحقيق 7.0 في IELTS الأكاديمي' },
  { id: 'CAREER_INTERNSHIP', label: 'تدريب مهني وخبرة بحثية' },
] as const;

export function GoalMatchedSection(_props?: {
  onNavigate?: (tab: 'OPPORTUNITIES' | 'LEARNING' | 'SERVICES' | 'PROFILE') => void;
}) {
  const [goalIndex, setGoalIndex] = useState(0);
  const currentGoal = STUDENT_GOALS[goalIndex];

  const recommendations = useMemo(() => {
    if (currentGoal.id === 'IELTS_PREP') {
      return [
        {
          id: 'rec-ielts-1',
          title: 'خطة إتقان الكتابة الأكاديمية (Task 1 & 2)',
          reason: 'اختبار دولي · يرفع درجتك في معيار الترابط الأكاديمي',
          href: '/exams',
        },
        {
          id: 'rec-ielts-2',
          title: 'دورة مهارات الكتابة الأكاديمية والبحثية',
          reason: 'دورة تدريبية · مرتبطة بهدفك اللغوي الحالي',
          href: '/courses',
        },
      ];
    }
    return [
      {
        id: 'rec-sch-1',
        title: 'منحة الحكومة الصينية (CSC)',
        reason: 'منحة ممولة · تطابق هدفك ودرجتك المستهدفة',
        href: '/scholarships',
      },
      {
        id: 'rec-sch-2',
        title: 'أداة تقييم أهلية المنح وخطاب الدافع',
        reason: 'أداة ذكية · تحقق من جاهزية ملفك قبل التقديم',
        href: '/tools',
      },
    ];
  }, [currentGoal.id]);

  return (
    <CalmSectionCard
      title="مناسب لهدفي"
      icon={Compass}
      action={
        <button
          type="button"
          onClick={() => setGoalIndex((i) => (i + 1) % STUDENT_GOALS.length)}
          className="mn-student-summary-header-link inline-flex items-center gap-1 rounded-md border border-[var(--mn-border)] bg-[var(--mn-page)] px-2 py-0.5 text-[9.5px] font-bold text-[#142B5F] dark:text-[#F2CD78] hover:border-[#0E7C86] cursor-pointer"
        >
          <span>تغيير الهدف</span>
        </button>
      }
    >
      <div className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] px-2.5 py-1.5">
        <span className="text-[10px] font-semibold text-[#64748B] dark:text-[#94A3B8]">
          هدفي الحالي:
        </span>
        <span className="text-[10.5px] font-bold text-[#1E293B] dark:text-[#F8FAFC] truncate">
          {currentGoal.label}
        </span>
      </div>

      <div className="grid gap-1.5 sm:grid-cols-2">
        {recommendations.map((rec) => (
          <div
            key={rec.id}
            className="relative overflow-hidden flex items-center justify-between gap-2 rounded-xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] pr-3.5 pl-2.5 py-2"
          >
            <span
              aria-hidden="true"
              className="mn-student-card-start-bar"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="grid h-[19px] w-[19px] shrink-0 place-items-center rounded-[5px] bg-[#142B5F] text-white">
                  <GraduationCap className="h-3 w-3 text-white" aria-hidden="true" />
                </span>
                <h4 className="min-w-0 flex-1 text-[10.5px] font-bold leading-snug text-[#1E293B] dark:text-[#F8FAFC] truncate">
                  {rec.title}
                </h4>
              </div>
              <p className="mt-0.5 pr-[25px] text-[9.5px] font-medium leading-snug text-[#64748B] dark:text-[#94A3B8] truncate">
                {rec.reason}
              </p>
            </div>
            <Link
              to={rec.href}
              className="mn-student-summary-primary-action shrink-0 inline-flex items-center gap-1 rounded-md px-2 text-[9.5px] font-bold text-[#F2CD78]"
            >
              <span>عرض</span>
              <ArrowUpLeft className="h-2.5 w-2.5 text-[#F2CD78]" aria-hidden="true" />
            </Link>
          </div>
        ))}
      </div>
    </CalmSectionCard>
  );
}

/**
 * Opportunities Sub-View: اكتشف (Curated Scholarships & Programs)
 */
export function OpportunitiesDiscoverPanel() {
  const curated = [
    {
      id: 'disc-csc',
      title: 'منحة الحكومة الصينية (CSC)',
      country: 'الصين',
      degree: 'بكالوريوس · ماجستير · دكتوراه',
      funding: 'تمويل كامل + راتب شهري',
      deadline: '31 مارس 2027',
      match: 'مناسبة لملفك',
      href: '/scholarships/csc-china',
    },
    {
      id: 'disc-chevening',
      title: 'منحة تشيفنينغ البريطانية (Chevening)',
      country: 'المملكة المتحدة',
      degree: 'ماجستير لمدة عام',
      funding: 'تمويل كامل للرسوم والمعيشة',
      deadline: '15 أكتوبر 2027',
      match: 'تغطية شاملة',
      href: '/scholarships/chevening-uk',
    },
    {
      id: 'disc-daad',
      title: 'منحة التبادل الأكاديمي الألماني (DAAD EPOS)',
      country: 'ألمانيا',
      degree: 'ماجستير · دكتوراه',
      funding: 'راتب شهري + تأمين صحي + سفر',
      deadline: '30 سبتمبر 2027',
      match: 'تخصصات هندسية وإدارية',
      href: '/scholarships',
    },
  ];

  return (
    <CalmSectionCard title="فرص مقترحة لملفك" icon={Compass} badge={`${curated.length} فرص`}>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {curated.map((item) => (
          <article
            key={item.id}
            className="relative overflow-hidden flex flex-col justify-between rounded-xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] pr-3.5 pl-2.5 py-2"
          >
            <span aria-hidden="true" className="mn-student-card-start-bar" />
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <span className="grid h-[19px] w-[19px] shrink-0 place-items-center rounded-[5px] bg-[#142B5F] text-white">
                    <GraduationCap className="h-3 w-3 text-white" aria-hidden="true" />
                  </span>
                  <h4 className="min-w-0 flex-1 text-[10.5px] font-bold leading-snug text-[#1E293B] dark:text-[#F8FAFC] truncate">
                    {item.title}
                  </h4>
                </div>
                <span className="shrink-0 rounded-md border border-[#0E7C86]/25 bg-[#0E7C86]/10 px-1.5 py-0.5 text-[9px] font-bold text-[#0E7C86] dark:text-[#55CBC5]">
                  {item.deadline}
                </span>
              </div>
              <p className="mt-0.5 pr-[25px] text-[9.5px] font-medium leading-snug text-[#64748B] dark:text-[#94A3B8]">
                {item.country} · {item.degree} — {item.funding}
              </p>
            </div>

            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="pr-[25px] text-[9.5px] font-semibold text-[#0E7C86] dark:text-[#55CBC5]">
                {item.match}
              </span>
              <Link
                to={item.href}
                className="mn-student-summary-primary-action inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-[9.5px] font-bold text-[#F2CD78]"
              >
                <span>تفاصيل المنحة</span>
                <ArrowLeft className="h-2.5 w-2.5 text-[#F2CD78]" aria-hidden="true" />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </CalmSectionCard>
  );
}

/**
 * Opportunities Sub-View: قائمتي المختصرة (Shortlist from Saved Scholarships/Universities)
 */
export function OpportunitiesShortlistPanel({
  savedItems = [],
  onSwitchToVault,
  onSwitchToActive,
}: {
  savedItems?: readonly StudentSavedItemDto[];
  trackers?: readonly StudentApplicationTrackerDto[];
  onSwitchToVault?: () => void;
  onSwitchToActive?: () => void;
}) {
  const shortlist = useMemo(
    () =>
      (savedItems ?? []).filter((item) =>
        ['SCHOLARSHIP', 'UNIVERSITY', 'MAJOR'].includes(item.entityType),
      ),
    [savedItems],
  );
  const handleAction = onSwitchToVault ?? onSwitchToActive;

  return (
    <CalmSectionCard
      title="قائمتي المختصرة للفرص"
      icon={Star}
      badge={`${shortlist.length} عنصر`}
      action={
        handleAction ? (
          <button
            type="button"
            onClick={handleAction}
            className="mn-student-summary-header-link inline-flex items-center gap-1 rounded-md border border-[var(--mn-border)] bg-[var(--mn-page)] px-2 py-0.5 text-[9.5px] font-bold text-[#142B5F] dark:text-[#F8FAFC] cursor-pointer"
          >
            <span>إدارة التقديمات</span>
            <ChevronLeft className="h-2.5 w-2.5 text-[#142B5F] dark:text-[#F2CD78]" aria-hidden="true" />
          </button>
        ) : undefined
      }
    >
      {shortlist.length === 0 ? (
        <div className="rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] p-3.5 text-center">
          <p className="text-[10.5px] font-medium text-[#64748B]">
            لم تحفظ منحًا أو جامعات في قائمتك المختصرة بعد.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {shortlist.map((item) => (
            <div
              key={item.id}
              className="relative overflow-hidden flex items-center justify-between gap-2 rounded-xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] pr-3.5 pl-2.5 py-2"
            >
              <span aria-hidden="true" className="mn-student-card-start-bar" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="grid h-[19px] w-[19px] shrink-0 place-items-center rounded-[5px] bg-[#142B5F] text-white">
                    <GraduationCap className="h-3 w-3 text-white" aria-hidden="true" />
                  </span>
                  <h4 className="min-w-0 flex-1 text-[10.5px] font-bold leading-snug text-[#1E293B] dark:text-[#F8FAFC] truncate">
                    {item.displayName || item.entityId}
                  </h4>
                </div>
                <p className="mt-0.5 pr-[25px] text-[9.5px] font-medium leading-snug text-[#64748B]">
                  {item.entityType === 'SCHOLARSHIP'
                    ? 'منحة محفوظة للمقارنة والتقديم'
                    : 'جامعة / برنامج محفوظ'}
                </p>
              </div>

              <Link
                to={
                  item.entityType === 'SCHOLARSHIP'
                    ? `/scholarships/${encodeURIComponent(item.entitySlug || item.entityId)}`
                    : `/universities/${encodeURIComponent(item.entitySlug || item.entityId)}`
                }
                className="mn-student-summary-primary-action shrink-0 inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-[9.5px] font-bold text-[#F2CD78]"
              >
                <span>عرض</span>
                <ArrowUpLeft className="h-2.5 w-2.5 text-[#F2CD78]" aria-hidden="true" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </CalmSectionCard>
  );
}

/**
 * Opportunities Sub-View: النتائج والعروض + خطواتي بعد القبول (Offers & Post-Acceptance Checklist)
 */
const INITIAL_POST_ACCEPTANCE_STEPS = [
  { id: 'pa-1', label: 'تأكيد قبول العرض الرسمي في بوابة المنحة/الجامعة', done: true },
  { id: 'pa-2', label: 'التحقق من صلاحية جواز السفر (أكثر من 18 شهرًا)', done: true },
  { id: 'pa-3', label: 'تجهيز ملف الفيزا الدراسية وحجز موعد السفارة', done: false },
  { id: 'pa-4', label: 'تأكيد السكن الجامعي واستلام خطاب الإقامة', done: false },
  { id: 'pa-5', label: 'إجراء الفحص الطبي وحجز تذكرة السفر', done: false },
  { id: 'pa-6', label: 'التسجيل النهائي عند الوصول للجامعة', done: false },
];

export function OpportunitiesOffersPanel({
  trackers,
}: {
  trackers: readonly StudentApplicationTrackerDto[];
}) {
  const [steps, setSteps] = useState(INITIAL_POST_ACCEPTANCE_STEPS);
  const completedCount = steps.filter((s) => s.done).length;
  const progress = Math.round((completedCount / steps.length) * 100);

  const toggleStep = (id: string) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, done: !s.done } : s)));
  };

  return (
    <div className="space-y-3.5">
      <CalmSectionCard
        title="النتائج والعروض المسجلة"
        icon={Award}
        badge={`${trackers.length} ملف`}
      >
        <div className="space-y-1.5">
          {trackers.map((t) => {
            const name =
              t.owner?.displayName ||
              (typeof t.ownerSnapshot?.displayName === 'string'
                ? t.ownerSnapshot.displayName
                : 'منحة مسجلة');
            const isAccepted = t.stage.includes('قبول');
            return (
              <div
                key={t.id}
                className="relative overflow-hidden flex items-center justify-between gap-2 rounded-xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] pr-3.5 pl-2.5 py-2"
              >
                <span aria-hidden="true" className="mn-student-card-start-bar" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="grid h-[19px] w-[19px] shrink-0 place-items-center rounded-[5px] bg-[#142B5F] text-white">
                      <Award className="h-3 w-3 text-white" aria-hidden="true" />
                    </span>
                    <h4 className="min-w-0 flex-1 text-[10.5px] font-bold leading-snug text-[#1E293B] dark:text-[#F8FAFC] truncate">
                      {name}
                    </h4>
                  </div>
                  <p className="mt-0.5 pr-[25px] text-[9.5px] font-medium leading-snug text-[#64748B]">
                    المرحلة الحالية: {t.stage}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-md border px-2 py-0.5 text-[9px] font-bold ${
                    isAccepted
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      : 'border-[#0E7C86]/25 bg-[#0E7C86]/10 text-[#0E7C86] dark:text-[#55CBC5]'
                  }`}
                >
                  {isAccepted ? 'عرض قبول' : 'قيد المتابعة'}
                </span>
              </div>
            );
          })}
        </div>
      </CalmSectionCard>

      <CalmSectionCard
        title="خطواتي بعد القبول"
        icon={ListChecks}
        badge={`${progress}%`}
      >
        <div className="mb-2.5 rounded-xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] p-2.5">
          <div className="flex items-center justify-between text-[10px] mb-1.5">
            <span className="font-bold text-[#1E293B] dark:text-[#F8FAFC]">
              جاهزية السفر والالتحاق الجامعي
            </span>
            <span className="font-bold text-[#0E7C86]">
              {completedCount} من {steps.length}
            </span>
          </div>
          <div className="h-1 w-[92%] mx-auto overflow-hidden rounded-full bg-slate-200/85 dark:bg-slate-800" dir="rtl">
            <div
              className="h-full rounded-full transition-all duration-300"
              data-mn-width={Math.round(Math.max(0, Math.min(100, Number(progress) || 0)))} data-mn-progress-gradient
            />
          </div>
        </div>

        <div className="space-y-1.5">
          {steps.map((step) => (
            <label
              key={step.id}
              className="flex items-center gap-2 rounded-xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] px-2.5 py-1.5 text-[10.5px] cursor-pointer"
            >
              <input
                type="checkbox"
                checked={step.done}
                onChange={() => toggleStep(step.id)}
                className="h-3.5 w-3.5 shrink-0 rounded accent-[#142B5F]"
              />
              <span
                className={`font-semibold text-[#1E293B] dark:text-[#F8FAFC] ${
                  step.done ? 'line-through opacity-65' : ''
                }`}
              >
                {step.label}
              </span>
            </label>
          ))}
        </div>
      </CalmSectionCard>
    </div>
  );
}

/**
 * Section 10 of Brief: مستنداتي (Personal Document Library with 4 independent status dimensions)
 */
interface PersonalDocItem {
  id: string;
  title: string;
  category: 'IDENTITY' | 'ACADEMIC' | 'LANGUAGE' | 'LETTERS';
  version: string;
  expiresAt: string | null;
  available: boolean;
  consentGranted: boolean;
  verification: 'VERIFIED' | 'NOT_ATTESTED' | 'STALE';
  linkedTo: string[];
}

const INITIAL_PERSONAL_DOCS: PersonalDocItem[] = [
  {
    id: 'doc-passport',
    title: 'جواز السفر الدولي',
    category: 'IDENTITY',
    version: 'v2',
    expiresAt: '2029-05-15T00:00:00Z',
    available: true,
    consentGranted: true,
    verification: 'VERIFIED',
    linkedTo: ['منحة الحكومة الصينية (CSC)'],
  },
  {
    id: 'doc-transcript',
    title: 'كشف الدرجات الأكاديمي (مترجم للإنجليزية)',
    category: 'ACADEMIC',
    version: 'v1',
    expiresAt: null,
    available: true,
    consentGranted: true,
    verification: 'NOT_ATTESTED',
    linkedTo: ['منحة الحكومة الصينية (CSC)', 'منحة تشيفنينغ'],
  },
  {
    id: 'doc-ielts',
    title: 'شهادة اختبار IELTS الأكاديمي',
    category: 'LANGUAGE',
    version: 'v1',
    expiresAt: '2026-12-01T00:00:00Z',
    available: true,
    consentGranted: false,
    verification: 'STALE',
    linkedTo: ['منحة تشيفنينغ'],
  },
  {
    id: 'doc-sop',
    title: 'خطاب الدافع والسيرة الأكاديمية (CV & SOP)',
    category: 'LETTERS',
    version: 'v3',
    expiresAt: null,
    available: true,
    consentGranted: false,
    verification: 'NOT_ATTESTED',
    linkedTo: [],
  },
];

export function StudentDocumentsLibraryPanel(_props?: {
  trackers?: readonly StudentApplicationTrackerDto[];
  onDocumentsChanged?: () => void;
}) {
  const [subFilter, setSubFilter] = useState<'LIBRARY' | 'ATTENTION' | 'SHARES'>('LIBRARY');
  const [docs, setDocs] = useState<PersonalDocItem[]>(INITIAL_PERSONAL_DOCS);

  const visibleDocs = useMemo(() => {
    if (subFilter === 'ATTENTION') {
      return docs.filter((d) => d.verification === 'STALE' || !d.consentGranted);
    }
    if (subFilter === 'SHARES') {
      return docs.filter((d) => d.consentGranted || d.linkedTo.length > 0);
    }
    return docs;
  }, [docs, subFilter]);

  const toggleConsent = (id: string) => {
    setDocs((prev) =>
      prev.map((d) => (d.id === id ? { ...d, consentGranted: !d.consentGranted } : d)),
    );
  };

  return (
    <CalmSectionCard
      title="مكتبة مستنداتي الخاصة"
      icon={FileCheck2}
      badge={`${docs.length} مستند`}
    >
      {/* Sub-pills: مكتبتي | يحتاج انتباهي | المشاركات */}
      <div className="mb-3 flex items-center gap-1.5 overflow-x-auto pb-1">
        {[
          { id: 'LIBRARY' as const, label: `مكتبتي (${docs.length})` },
          {
            id: 'ATTENTION' as const,
            label: `يحتاج انتباهي (${docs.filter((d) => d.verification === 'STALE').length})`,
          },
          {
            id: 'SHARES' as const,
            label: `المشاركات (${docs.filter((d) => d.consentGranted).length})`,
          },
        ].map((tab) => {
          const active = subFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubFilter(tab.id)}
              className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold cursor-pointer transition-colors ${
                active
                  ? 'border-[#142B5F] bg-[#142B5F] text-[#F2CD78]'
                  : 'border-[var(--mn-border)] bg-[var(--mn-page)] text-[#334155] dark:text-[#CBD5E1]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Upload new document */}
      <div className="mb-3">
        <StudentDocumentUpload
          onUploaded={(uploaded) => {
            setDocs((prev) => [
              {
                id: uploaded.id,
                title: uploaded.metadata?.originalFilename || 'مستند جديد مرفوع.pdf',
                category: 'ACADEMIC',
                version: 'v1',
                expiresAt: null,
                available: true,
                consentGranted: false,
                verification: 'NOT_ATTESTED',
                linkedTo: [],
              },
              ...prev,
            ]);
          }}
        />
      </div>

      {/* Documents List with 4 clear status dimensions */}
      <div className="space-y-2.5">
        {visibleDocs.map((doc) => {
          const dims = resolveDocumentStatusDimensions({
            expiresAt: doc.expiresAt,
            available: doc.available,
            consentGranted: doc.consentGranted,
            verification: doc.verification,
          });

          return (
            <article
              key={doc.id}
              className="rounded-xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] p-3 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#142B5F] border border-[#D6A43B]/35 text-[#F2CD78]">
                    <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-[12px] font-bold text-[#1E293B] dark:text-[#F8FAFC] break-words">
                      {doc.title}
                    </h4>
                    <span className="text-[10px] font-semibold text-[#64748B]">
                      الإصدار النشط: {doc.version}
                      {doc.linkedTo.length > 0 ? ` · مرتبط بـ: ${doc.linkedTo.join('، ')}` : ''}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleConsent(doc.id)}
                  className="shrink-0 rounded-lg border border-[#0E7C86]/35 bg-[#0E7C86]/10 px-2.5 py-1 text-[10px] font-bold text-[#0E7C86] dark:text-[#55CBC5] hover:bg-[#0E7C86] hover:text-white transition-colors cursor-pointer"
                >
                  {doc.consentGranted ? 'إيقاف المراجعة' : 'تفعيل المراجعة'}
                </button>
              </div>

              {/* 4 Independent Status Dimensions Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
                <div className="rounded-lg border border-[var(--mn-border)] bg-[var(--mn-surface)] px-2 py-1">
                  <span className="block text-[9px] text-[#64748B]">١. صلاحية الوثيقة</span>
                  <span className="text-[10px] font-bold text-[#1E293B] dark:text-[#F8FAFC]">
                    {dims.validityLabel}
                  </span>
                </div>
                <div className="rounded-lg border border-[var(--mn-border)] bg-[var(--mn-surface)] px-2 py-1">
                  <span className="block text-[9px] text-[#64748B]">٢. حالة الأصل</span>
                  <span className="text-[10px] font-bold text-[#0E7C86] dark:text-[#55CBC5]">
                    {dims.availabilityLabel}
                  </span>
                </div>
                <div className="rounded-lg border border-[var(--mn-border)] bg-[var(--mn-surface)] px-2 py-1">
                  <span className="block text-[9px] text-[#64748B]">٣. موافقة المراجعة</span>
                  <span className="text-[10px] font-bold text-[#1E293B] dark:text-[#F8FAFC]">
                    {doc.consentGranted ? 'مفعلة' : 'غير مفعلة'}
                  </span>
                </div>
                <div className="rounded-lg border border-[var(--mn-border)] bg-[var(--mn-surface)] px-2 py-1">
                  <span className="block text-[9px] text-[#64748B]">٤. التدقيق الأكاديمي</span>
                  <span className="text-[10px] font-bold text-[#142B5F] dark:text-[#F2CD78]">
                    {dims.verificationLabel}
                  </span>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </CalmSectionCard>
  );
}

/**
 * Section 8 of Brief: تعلمي -> خطتي (Structured Weekly Study Plan) & الاختبارات والتحضير (IELTS/TOEFL)
 */
export function LearningStudyPlanPanel({
  courses,
  dashboard,
}: {
  courses?: StudentDashboardSummaryDto['courseEnrollments'];
  dashboard?: StudentDashboardSummaryDto;
}) {
  const resolvedCourses = courses ?? dashboard?.courseEnrollments ?? [];
  const milestones = [
    {
      id: 'pl-1',
      week: 'الأسبوع ١',
      title: 'إتمام أساسيات الكتابة الأكاديمية وبنية خطاب الدافع',
      progress: 100,
      status: 'مكتمل',
    },
    {
      id: 'pl-2',
      week: 'الأسبوع ٢',
      title:
        resolvedCourses[0]?.courseName || 'مدخل إلى الذكاء الاصطناعي ومهارات البحث العلمي',
      progress: resolvedCourses[0]?.progressPercentage ?? 45,
      status: 'قيد التنفيذ',
    },
    {
      id: 'pl-3',
      week: 'الأسبوع ٣',
      title: 'التدريب العملي على اختبار IELTS الأكاديمي (Reading & Writing)',
      progress: 25,
      status: 'مجدول',
    },
  ];

  return (
    <CalmSectionCard title="خطتي التعليمية الأسبوعية" icon={Target} badge="٣ مراحل">
      <div className="space-y-2.5">
        {milestones.map((m) => (
          <div
            key={m.id}
            className="rounded-xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold text-[#0E7C86] dark:text-[#55CBC5]">
                {m.week} · {m.status}
              </span>
              <span className="text-[11px] font-bold text-[#142B5F] dark:text-[#F2CD78]">
                {m.progress}%
              </span>
            </div>
            <h4 className="mt-1 text-[12px] font-bold text-[#1E293B] dark:text-[#F8FAFC]">
              {m.title}
            </h4>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-l from-[#142B5F] to-[#0E7C86]"
                data-mn-width={Math.round(Math.max(0, Math.min(100, Number(m.progress) || 0)))}
              />
            </div>
          </div>
        ))}
      </div>
    </CalmSectionCard>
  );
}

export function LearningTestPrepPanel() {
  return (
    <div className="space-y-4">
      <CalmSectionCard
        title="سجل التدريب والتحضير للاختبارات الدولية"
        icon={ClipboardList}
        badge="تدريب ذاتي"
      >
        <div className="grid gap-2.5 sm:grid-cols-2">
          <div className="rounded-xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#142B5F] dark:text-[#F2CD78]">
                IELTS Academic (تجريبي)
              </span>
              <span className="rounded-md bg-[#0E7C86]/10 border border-[#0E7C86]/25 px-2 py-0.5 text-[10px] font-bold text-[#0E7C86]">
                الهدف: 7.0
              </span>
            </div>
            <div className="mt-2 grid grid-cols-4 gap-1 text-center">
              {[
                { s: 'Listening', v: '7.0' },
                { s: 'Reading', v: '6.5' },
                { s: 'Writing', v: '6.0' },
                { s: 'Speaking', v: '6.5' },
              ].map((sec) => (
                <div
                  key={sec.s}
                  className="rounded-lg border border-[var(--mn-border)] bg-[var(--mn-surface)] p-1.5"
                >
                  <span className="block text-[9px] text-[#64748B]">{sec.s}</span>
                  <strong className="text-[11px] font-bold text-[#1E293B] dark:text-[#F8FAFC]">
                    {sec.v}
                  </strong>
                </div>
              ))}
            </div>
            <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-[var(--mn-border)]">
              <span className="text-[10px] font-semibold text-[#64748B]">
                نقطة التركيز: رفع Writing إلى 6.5
              </span>
              <Link
                to="/exams"
                className="text-[10.5px] font-bold text-[#0E7C86] hover:underline"
              >
                بدء تدريب جديد
              </Link>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] p-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#142B5F] dark:text-[#F2CD78]">
                  الدرجة الرسمية الموثقة
                </span>
                <span className="rounded-md border border-[var(--mn-border)] bg-[var(--mn-surface)] px-2 py-0.5 text-[9.5px] font-bold text-[#64748B]">
                  مرتبطة بملفي
                </span>
              </div>
              <p className="mt-1.5 text-[11px] font-medium text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
                الدرجة الرسمية المعتمدة في ملف التقديم منفصلة عن محاولات التدريب، وتُربط مباشرة بشهادة الاختبار في «مستنداتي».
              </p>
            </div>
            <div className="mt-2.5 pt-2 border-t border-[var(--mn-border)] flex items-center justify-between text-[10.5px]">
              <span className="font-bold text-[#1E293B] dark:text-[#F8FAFC]">
                IELTS 6.5 (صالح حتى ديسمبر 2026)
              </span>
              <Link to="/exams" className="font-bold text-[#142B5F] dark:text-[#F2CD78]">
                دليل الاختبارات
              </Link>
            </div>
          </div>
        </div>
      </CalmSectionCard>
    </div>
  );
}

/**
 * Section 9 of Brief: محفوظاتي -> المقارنات والقرارات (2-item Mobile Side-by-Side Comparison) & نتائج الأدوات
 */
export function VaultComparisonsPanel(_props?: {
  savedItems?: readonly StudentSavedItemDto[];
  onOpenApplications?: () => void;
}) {
  const [preferredId, setPreferredId] = useState<'csc' | 'chevening'>('csc');

  const rows = [
    { label: 'الدولة والوجهة', csc: 'الصين', chevening: 'المملكة المتحدة' },
    { label: 'التغطية المالية', csc: 'رسوم + سكن + راتب', chevening: 'رسوم + تذاكر + معيشة' },
    { label: 'متطلب اللغة', csc: 'IELTS 6.0 أو HSK', chevening: 'IELTS 6.5 أكاديمي' },
    { label: 'خبرة العمل', csc: 'غير مشروطة', chevening: 'سنتان (2,800 ساعة)' },
    { label: 'نقطة القوة لك', csc: 'معدلك الأكاديمي ممتاز', chevening: 'مدة ماجستير سنة واحدة' },
  ];

  return (
    <CalmSectionCard title="مقارنة الفرص وقراري" icon={Scale} badge="مقارنة ثنائية">
      <div className="overflow-x-auto rounded-xl border border-[var(--mn-border)] dark:border-white/10">
        <table className="w-full text-right text-[11px] font-['Cairo',sans-serif] border-collapse">
          <thead>
            <tr className="bg-[#142B5F] text-white">
              <th className="p-2.5 font-bold text-[#F2CD78] w-[28%] border-l border-white/10">
                المعيار
              </th>
              <th className="p-2.5 font-bold w-[36%] border-l border-white/10">
                منحة الحكومة الصينية (CSC)
              </th>
              <th className="p-2.5 font-bold w-[36%]">منحة تشيفنينغ البريطانية</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--mn-border)] dark:divide-white/10 bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)]">
            {rows.map((r) => (
              <tr key={r.label}>
                <td className="p-2 font-bold text-[#1E293B] dark:text-[#F8FAFC] bg-[var(--mn-surface)] border-l border-[var(--mn-border)] dark:border-white/10">
                  {r.label}
                </td>
                <td className="p-2 font-medium text-[#334155] dark:text-[#CBD5E1] border-l border-[var(--mn-border)] dark:border-white/10">
                  {r.csc}
                </td>
                <td className="p-2 font-medium text-[#334155] dark:text-[#CBD5E1]">
                  {r.chevening}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] p-2.5">
        <span className="text-[11px] font-bold text-[#1E293B] dark:text-[#F8FAFC]">
          الخيار المفضل للتقديم الأول:
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setPreferredId('csc')}
            className={`rounded-lg border px-2.5 py-1 text-[10.5px] font-bold cursor-pointer ${
              preferredId === 'csc'
                ? 'border-[#142B5F] bg-[#142B5F] text-[#F2CD78]'
                : 'border-[var(--mn-border)] bg-[var(--mn-surface)] text-[#334155]'
            }`}
          >
            منحة الصين CSC ✓
          </button>
          <button
            type="button"
            onClick={() => setPreferredId('chevening')}
            className={`rounded-lg border px-2.5 py-1 text-[10.5px] font-bold cursor-pointer ${
              preferredId === 'chevening'
                ? 'border-[#142B5F] bg-[#142B5F] text-[#F2CD78]'
                : 'border-[var(--mn-border)] bg-[var(--mn-surface)] text-[#334155]'
            }`}
          >
            منحة تشيفنينغ
          </button>
        </div>
      </div>
    </CalmSectionCard>
  );
}

export function VaultToolsResultsPanel(_props?: {
  savedItems?: readonly StudentSavedItemDto[];
  hydratedSavedItems?: unknown;
}) {
  const tools = [
    {
      slug: 'gpa-calculator',
      title: 'حاسبة المعدل التراكمي (GPA)',
      summary: 'المعدل المحسوب: 3.82 / 4.00 (يعادل 95.5%)',
      date: 'محفوظة في حسابك',
    },
    {
      slug: 'scholarship-recommendation',
      title: 'تقييم أهلية المنح الدراسية',
      summary: 'نسبة التوافق العليا: منح الحكومة الصينية والألمانية (92%)',
      date: 'محفوظة في حسابك',
    },
    {
      slug: 'motivation-letter-generator',
      title: 'مسودة خطاب الدافع الأكاديمي',
      summary: 'نسخة مخصصة لبرنامج ماجستير الذكاء الاصطناعي',
      date: 'محفوظة في حسابك',
    },
    {
      slug: 'university-comparison',
      title: 'مقارنة الجامعات العالمية',
      summary: 'مقارنة جامعة تسينغهوا وجامعة مانشستر',
      date: 'محفوظة في حسابك',
    },
  ];

  return (
    <CalmSectionCard
      title="نتائج أدواتي المحفوظة"
      icon={Sparkles}
      badge={`${tools.length} نتائج`}
    >
      <div className="grid gap-2.5 sm:grid-cols-2">
        {tools.map((t) => (
          <div
            key={t.slug}
            className="rounded-xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] p-3 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold text-[#0E7C86] dark:text-[#55CBC5]">
                  {t.date}
                </span>
                <LockKeyhole className="h-3.5 w-3.5 text-[#142B5F] dark:text-[#F2CD78]" />
              </div>
              <h4 className="mt-1 text-[12px] font-bold text-[#1E293B] dark:text-[#F8FAFC]">
                {t.title}
              </h4>
              <p className="mt-1 text-[11px] font-medium text-[#475569] dark:text-[#CBD5E1]">
                {t.summary}
              </p>
            </div>
            <div className="mt-2.5 pt-2 border-t border-[var(--mn-border)] flex justify-end">
              <Link
                to="/tools"
                className="inline-flex items-center gap-1 text-[10.5px] font-bold text-[#142B5F] dark:text-[#F2CD78] hover:underline"
              >
                <span>فتح الأداة</span>
                <ArrowUpLeft className="h-3 w-3 text-[#0E7C86]" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </CalmSectionCard>
  );
}

/**
 * Section 11 of Brief: خدماتي -> الحجوزات والمواعيد + الملفات المستلمة
 */
export function ServiceDeliverablesPanel({
  requests,
}: {
  requests: readonly StudentServiceRequestDto[];
}) {
  const deliverables = [
    {
      id: 'deliv-1',
      title: 'تقرير المراجعة اللغوية والأكاديمية لخطاب الدافع (SOP)',
      requestCode: requests[0]?.publicId || 'DEMO-REQ-001',
      version: 'النسخة المراجَعة v1',
      status: 'جاهز للتنزيل',
      date: 'أكتوبر 2026',
    },
    {
      id: 'deliv-2',
      title: 'قائمة الجامعات الموصى بها حسب تخصصك ومعدلك',
      requestCode: requests[1]?.publicId || 'DEMO-REQ-002',
      version: 'ملف PDF معتمد',
      status: 'بانتظار إتمام المراجعة',
      date: 'قيد الإعداد',
    },
  ];

  return (
    <CalmSectionCard
      title="الملفات والمخرجات المستلمة"
      icon={FileCheck2}
      badge={`${deliverables.length} ملف`}
    >
      <div className="space-y-2.5">
        {deliverables.map((item) => (
          <div
            key={item.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] p-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[10px] font-bold text-[#0E7C86]">
                <span>طلب #{item.requestCode}</span>
                <span>·</span>
                <span>{item.version}</span>
              </div>
              <h4 className="mt-0.5 text-[12px] font-bold text-[#1E293B] dark:text-[#F8FAFC]">
                {item.title}
              </h4>
            </div>
            <span className="shrink-0 rounded-lg border border-[var(--mn-border)] bg-[var(--mn-surface)] px-2.5 py-1 text-[10.5px] font-bold text-[#142B5F] dark:text-[#F2CD78]">
              {item.status}
            </span>
          </div>
        ))}
      </div>
    </CalmSectionCard>
  );
}

/**
 * Section 12 of Brief: مساري المهني -> فرص العمل والتدريب + تطوير مهاراتي
 */
export function CareerJobsExplorePanel({
  onSelectJob,
}: {
  onSelectJob: (job: { id: string; title: string }) => void;
}) {
  const jobs = [
    {
      id: 'job-ra-ai',
      title: 'مساعد باحث أكاديمي — مختبرات تحليل البيانات والذكاء الاصطناعي',
      org: 'برنامج التدريب البحثي للخريجين',
      type: 'تدريب بحثي عن بُعد / هجين',
      channel: 'تقديم مباشر من حسابك',
    },
    {
      id: 'job-edtech-fellow',
      title: 'زميل تطوير محتوى أكاديمي وإرشاد طلابي',
      org: 'مبادرات التعليم العالي الإقليمية',
      type: 'دوام جزئي مرن',
      channel: 'تقديم مباشر من حسابك',
    },
  ];

  return (
    <CalmSectionCard title="فرص العمل والتدريب المتاحة" icon={BriefcaseBusiness} badge="٢ فرص">
      <div className="grid gap-2.5 sm:grid-cols-2">
        {jobs.map((item) => (
          <article
            key={item.id}
            className="rounded-xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] p-3 flex flex-col justify-between"
          >
            <div>
              <span className="text-[10px] font-bold text-[#0E7C86] dark:text-[#55CBC5]">
                {item.type} · {item.channel}
              </span>
              <h4 className="mt-1 text-[12px] font-bold text-[#1E293B] dark:text-[#F8FAFC] leading-snug">
                {item.title}
              </h4>
              <p className="mt-0.5 text-[10.5px] font-medium text-[#64748B]">{item.org}</p>
            </div>
            <div className="mt-3 pt-2 border-t border-[var(--mn-border)] flex items-center justify-between">
              <button
                type="button"
                onClick={() => onSelectJob({ id: item.id, title: item.title })}
                className="inline-flex min-h-8 items-center gap-1 rounded-lg bg-[#142B5F] hover:bg-[#1a3675] border border-[#D6A43B]/35 px-3 py-1 text-[10.5px] font-bold text-white cursor-pointer"
              >
                <span>التقديم بملفي المهني</span>
                <ArrowLeft className="h-3 w-3 text-[#F2CD78]" />
              </button>
              <Link
                to="/careers"
                className="text-[10.5px] font-bold text-[#0E7C86] hover:underline"
              >
                دليل الوظائف
              </Link>
            </div>
          </article>
        ))}
      </div>
    </CalmSectionCard>
  );
}

export function CareerSkillDevelopmentPanel({
  skillsCount,
}: {
  skillsCount: number;
}) {
  const tracks = [
    {
      id: 'sk-1',
      title: 'صياغة السيرة الذاتية الأكاديمية والمهنية (ATS-Ready)',
      status: skillsCount > 0 ? 'مكتمل جزئياً' : 'مقترح للبدء',
      href: '/tools',
    },
    {
      id: 'sk-2',
      title: 'مهارات المقابلات الشخصية للمنح والزمالات البحثية',
      status: 'دورة تدريبية متاحة',
      href: '/courses',
    },
  ];

  return (
    <CalmSectionCard title="تطوير مهاراتي المهنية" icon={Sparkles} badge="جاهزية المسار">
      <div className="grid gap-2.5 sm:grid-cols-2">
        {tracks.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between gap-2 rounded-xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] p-3"
          >
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-[#0E7C86]">{t.status}</span>
              <h4 className="mt-0.5 text-[11.5px] font-bold text-[#1E293B] dark:text-[#F8FAFC]">
                {t.title}
              </h4>
            </div>
            <Link
              to={t.href}
              className="shrink-0 rounded-lg border border-[#142B5F]/30 bg-[var(--mn-surface)] px-2.5 py-1 text-[10.5px] font-bold text-[#142B5F] dark:text-[#F2CD78]"
            >
              فتح
            </Link>
          </div>
        ))}
      </div>
    </CalmSectionCard>
  );
}

/**
 * Section 13 of Brief: ملفي الأكاديمي (Qualifications, GPA + Scale, Languages, Study Goal)
 */
export function AcademicProfileSummaryCard() {
  const [qualification, setQualification] = useState('بكالوريوس علوم الحاسوب ونظم المعلومات');
  const [gpa, setGpa] = useState('3.82');
  const [gpaScale, setGpaScale] = useState('4.00');
  const [englishTest, setEnglishTest] = useState('IELTS 6.5');
  const [targetDegree, setTargetDegree] = useState('ماجستير — خريف 2027 (الصين / بريطانيا)');
  const [savedNotice, setSavedNotice] = useState(false);

  return (
    <CalmSectionCard
      title="ملفي الأكاديمي واللغوي"
      icon={GraduationCap}
      badge="يغذي توصيات المنح"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="block text-[11.5px] font-bold text-[#1E293B] dark:text-[#F8FAFC] mb-1">
            المؤهل الأكاديمي والتخصص
          </span>
          <input
            type="text"
            value={qualification}
            onChange={(e) => setQualification(e.target.value)}
            className="w-full rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] px-3 py-2 text-[12px] font-medium text-[#1E293B] dark:text-[#F8FAFC] outline-none focus:border-[#0E7C86]"
          />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="block text-[11.5px] font-bold text-[#1E293B] dark:text-[#F8FAFC] mb-1">
              المعدل التراكمي
            </span>
            <input
              type="text"
              value={gpa}
              onChange={(e) => setGpa(e.target.value)}
              className="w-full rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] px-3 py-2 text-[12px] font-bold text-[#1E293B] dark:text-[#F8FAFC] outline-none focus:border-[#0E7C86]"
            />
          </label>
          <label className="block">
            <span className="block text-[11.5px] font-bold text-[#1E293B] dark:text-[#F8FAFC] mb-1">
              مقياس المعدل
            </span>
            <select
              value={gpaScale}
              onChange={(e) => setGpaScale(e.target.value)}
              className="w-full rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] px-2.5 py-2 text-[12px] font-semibold text-[#1E293B] dark:text-[#F8FAFC] outline-none focus:border-[#0E7C86]"
            >
              <option value="4.00">من 4.00</option>
              <option value="5.00">من 5.00</option>
              <option value="100">من 100%</option>
            </select>
          </label>
        </div>

        <label className="block">
          <span className="block text-[11.5px] font-bold text-[#1E293B] dark:text-[#F8FAFC] mb-1">
            مستوى اللغة والاختبارات المعتمدة
          </span>
          <input
            type="text"
            value={englishTest}
            onChange={(e) => setEnglishTest(e.target.value)}
            className="w-full rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] px-3 py-2 text-[12px] font-medium text-[#1E293B] dark:text-[#F8FAFC] outline-none focus:border-[#0E7C86]"
          />
        </label>

        <label className="block">
          <span className="block text-[11.5px] font-bold text-[#1E293B] dark:text-[#F8FAFC] mb-1">
            الهدف الدراسي والوجهات المفضلة
          </span>
          <input
            type="text"
            value={targetDegree}
            onChange={(e) => setTargetDegree(e.target.value)}
            className="w-full rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] px-3 py-2 text-[12px] font-medium text-[#1E293B] dark:text-[#F8FAFC] outline-none focus:border-[#0E7C86]"
          />
        </label>
      </div>

      <div className="mt-3 pt-2.5 border-t border-[var(--mn-border)] dark:border-white/10 flex items-center justify-between gap-2">
        <span className="text-[10.5px] font-medium text-[#64748B]">
          {savedNotice
            ? '✓ تم تحديث بيانات ملفك الأكاديمي'
            : 'تُستخدم هذه المعايير لمطابقة المنح وحساب الأهلية تلقائياً.'}
        </span>
        <button
          type="button"
          onClick={() => setSavedNotice(true)}
          className="rounded-xl bg-[#142B5F] hover:bg-[#1a3675] border border-[#D6A43B]/35 px-3.5 py-1.5 text-[11px] font-bold text-white cursor-pointer"
        >
          تحديث المؤهلات
        </button>
      </div>
    </CalmSectionCard>
  );
}

/**
 * Section 15 of Brief: التقويم والمهام (Unified Calendar & Reminders)
 */
export function StudentCalendarTasksPanel({
  trackers,
}: {
  trackers: readonly StudentApplicationTrackerDto[];
}) {
  const [customTasks, setCustomTasks] = useState([
    { id: 'cal-1', title: 'تصديق ترجمة كشف الدرجات', date: '25 أكتوبر 2026', done: false },
    { id: 'cal-2', title: 'مراجعة مسودة خطاب التوصية مع المشرف', date: '2 نوفمبر 2026', done: true },
  ]);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    setCustomTasks((prev) => [
      { id: `cal-${Date.now()}`, title: newTaskTitle.trim(), date: 'تذكير هذا الأسبوع', done: false },
      ...prev,
    ]);
    setNewTaskTitle('');
  };

  return (
    <CalmSectionCard title="التقويم والمواعيد والمهام" icon={CalendarClock} badge="مواعيدي">
      <form onSubmit={addTask} className="mb-3 flex items-center gap-2">
        <input
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          placeholder="أضف تذكيرًا أو مهمة شخصية جديدة..."
          className="flex-1 min-h-9 rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] px-3 text-[11.5px] font-medium text-[#1E293B] dark:text-[#F8FAFC] outline-none focus:border-[#0E7C86]"
        />
        <button
          type="submit"
          className="shrink-0 inline-flex min-h-9 items-center gap-1 rounded-xl bg-[#142B5F] px-3 text-[11px] font-bold text-white cursor-pointer border border-[#D6A43B]/35"
        >
          <Plus className="h-3.5 w-3.5 text-[#F2CD78]" />
          <span>إضافة</span>
        </button>
      </form>

      <div className="space-y-2">
        {trackers.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between gap-2 rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] px-3 py-2"
          >
            <div className="min-w-0">
              <span className="text-[9.5px] font-bold text-[#0E7C86]">موعد منحة</span>
              <h4 className="text-[11.5px] font-bold text-[#1E293B] dark:text-[#F8FAFC] truncate">
                {t.owner?.displayName || 'ملف تقديم منحة'}
              </h4>
            </div>
            <span className="shrink-0 rounded-lg border border-[#0E7C86]/25 bg-[#0E7C86]/10 px-2 py-0.5 text-[10px] font-bold text-[#0E7C86]">
              {t.deadlineAt
                ? new Date(t.deadlineAt).toLocaleDateString('ar', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                : 'متجدد'}
            </span>
          </div>
        ))}

        {customTasks.map((task) => (
          <label
            key={task.id}
            className="flex items-center justify-between gap-2 rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] px-3 py-2 cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              <input
                type="checkbox"
                checked={task.done}
                onChange={() =>
                  setCustomTasks((prev) =>
                    prev.map((item) =>
                      item.id === task.id ? { ...item, done: !item.done } : item,
                    ),
                  )
                }
                className="h-4 w-4 rounded accent-[#142B5F]"
              />
              <span
                className={`text-[11.5px] font-bold text-[#1E293B] dark:text-[#F8FAFC] ${
                  task.done ? 'line-through opacity-65' : ''
                }`}
              >
                {task.title}
              </span>
            </div>
            <span className="shrink-0 text-[10px] font-semibold text-[#64748B]">
              {task.date}
            </span>
          </label>
        ))}
      </div>
    </CalmSectionCard>
  );
}

/**
 * Section 17 of Brief: الدعم والمساعدة (مركز المساعدة + تذاكري)
 */
export function StudentSupportCenterPanel() {
  const [subTab, setSubTab] = useState<'FAQ' | 'TICKETS'>('FAQ');
  const [tickets, setTickets] = useState([
    {
      id: 'TCK-204',
      subject: 'استفسار حول تصديق الوثائق لمنحة الحكومة الصينية',
      category: 'ملفات التقديم',
      status: 'تم الرد من المستشار',
      updatedAt: 'قبل يومين',
    },
  ]);
  const [subject, setSubject] = useState('');

  const faqs = [
    {
      q: 'ما الفرق بين حفظ المنحة في «محفوظاتي» وفتح «ملف تقديم» في فرصي؟',
      a: 'المحفوظات للاطلاع السريع والمقارنة، بينما ملف التقديم ينشئ لك قائمة مهام وربط مستندات ومواعيد نهائية مخصصة.',
    },
    {
      q: 'هل تُرسل مستنداتي تلقائياً للجامعات عند رفعها؟',
      a: 'لا، مستنداتك خاصة بك تماماً داخل حسابك ولا تُفعل للمراجعة الأكاديمية إلا بموافقتك الصريحة.',
    },
    {
      q: 'كيف أؤكد الحجز المؤقت للاستشارة الأكاديمية؟',
      a: 'من قسم «طلباتي» اختر الطلب ثم راجع الفاتورة المرتبطة لإتمام التأكيد قبل انتهاء مهلة الحجز المؤقت.',
    },
  ];

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) return;
    setTickets((prev) => [
      {
        id: `TCK-${205 + prev.length}`,
        subject: subject.trim(),
        category: 'استفسار أكاديمي',
        status: 'قيد المراجعة',
        updatedAt: 'الآن',
      },
      ...prev,
    ]);
    setSubject('');
  };

  return (
    <CalmSectionCard title="الدعم والمساعدة الطلابية" icon={HelpCircle} badge="خدمة الطلاب">
      <div className="mb-3 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setSubTab('FAQ')}
          className={`rounded-lg border px-3 py-1 text-[11px] font-bold cursor-pointer ${
            subTab === 'FAQ'
              ? 'border-[#142B5F] bg-[#142B5F] text-[#F2CD78]'
              : 'border-[var(--mn-border)] bg-[var(--mn-page)] text-[#334155]'
          }`}
        >
          مركز المساعدة
        </button>
        <button
          type="button"
          onClick={() => setSubTab('TICKETS')}
          className={`rounded-lg border px-3 py-1 text-[11px] font-bold cursor-pointer ${
            subTab === 'TICKETS'
              ? 'border-[#142B5F] bg-[#142B5F] text-[#F2CD78]'
              : 'border-[var(--mn-border)] bg-[var(--mn-page)] text-[#334155]'
          }`}
        >
          تذاكري ({tickets.length})
        </button>
      </div>

      {subTab === 'FAQ' ? (
        <div className="space-y-2">
          {faqs.map((item) => (
            <div
              key={item.q}
              className="rounded-xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] p-3"
            >
              <h4 className="text-[11.5px] font-bold text-[#1E293B] dark:text-[#F8FAFC]">
                {item.q}
              </h4>
              <p className="mt-1 text-[11px] font-medium text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
                {item.a}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <form onSubmit={handleCreateTicket} className="flex items-center gap-2">
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="اكتب عنوان استفسارك أو المشكلة..."
              className="flex-1 min-h-9 rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] px-3 text-[11.5px] font-medium text-[#1E293B] dark:text-[#F8FAFC] outline-none focus:border-[#0E7C86]"
            />
            <button
              type="submit"
              className="shrink-0 inline-flex min-h-9 items-center gap-1 rounded-xl bg-[#142B5F] px-3 text-[11px] font-bold text-white cursor-pointer border border-[#D6A43B]/35"
            >
              <Send className="h-3.5 w-3.5 text-[#F2CD78]" />
              <span>إرسال تذكرة</span>
            </button>
          </form>

          <div className="space-y-2">
            {tickets.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] p-3"
              >
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-[#0E7C86]">
                    #{t.id} · {t.category} · {t.updatedAt}
                  </span>
                  <h4 className="mt-0.5 text-[11.5px] font-bold text-[#1E293B] dark:text-[#F8FAFC]">
                    {t.subject}
                  </h4>
                </div>
                <span className="shrink-0 rounded-lg border border-[#0E7C86]/25 bg-[#0E7C86]/10 px-2.5 py-0.5 text-[10px] font-bold text-[#0E7C86]">
                  {t.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </CalmSectionCard>
  );
}

/**
 * Section 18 of Brief: البحث في حسابي (Unified Account Search Modal)
 */
export function AccountQuickSearchModal({
  open,
  onClose,
  dashboard,
  trackers = [],
  savedItems,
  courses,
  requests = [],
  onSelectTab,
  onNavigateTab,
}: {
  open: boolean;
  onClose: () => void;
  dashboard?: StudentDashboardSummaryDto;
  trackers?: readonly StudentApplicationTrackerDto[];
  savedItems?: readonly StudentSavedItemDto[];
  courses?: StudentDashboardSummaryDto['courseEnrollments'];
  requests?: readonly StudentServiceRequestDto[];
  onSelectTab?: (
    tab:
      | 'SUMMARY'
      | 'OPPORTUNITIES'
      | 'LEARNING'
      | 'VAULT'
      | 'SERVICES'
      | 'CAREERS'
      | 'NOTIFICATIONS'
      | 'PROFILE',
  ) => void;
  onNavigateTab?: (
    tab:
      | 'SUMMARY'
      | 'OPPORTUNITIES'
      | 'LEARNING'
      | 'VAULT'
      | 'SERVICES'
      | 'CAREERS'
      | 'NOTIFICATIONS'
      | 'PROFILE',
  ) => void;
}) {
  const [query, setQuery] = useState('');

  if (!open) return null;

  const resolvedSaved = savedItems ?? dashboard?.savedItems ?? [];
  const resolvedCourses = courses ?? dashboard?.courseEnrollments ?? [];
  const handleSelectTab = onSelectTab ?? onNavigateTab ?? (() => {});

  const q = query.trim().toLowerCase();
  const matchedTrackers = (trackers ?? []).filter((t) =>
    (t.owner?.displayName || '').toLowerCase().includes(q),
  );
  const matchedCourses = (resolvedCourses ?? []).filter((c) =>
    c.courseName.toLowerCase().includes(q),
  );
  const matchedSaved = (resolvedSaved ?? []).filter((s) =>
    (s.displayName || s.entityId).toLowerCase().includes(q),
  );
  const matchedRequests = (requests ?? []).filter((r) =>
    (r.publicId || r.id).toLowerCase().includes(q),
  );

  return (
    <div tabIndex={0} onKeyDown={event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); event.currentTarget.click(); } }}
      role="dialog"
      aria-modal="true"
      aria-label="البحث في حسابي"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/55 p-3 pt-14 backdrop-blur-xs font-['Cairo',sans-serif]"
      onClick={onClose}
    >
      <div role="button" tabIndex={0} onKeyDown={event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); event.currentTarget.click(); } }}
        className="w-full max-w-md rounded-2xl border border-[var(--mn-border)] dark:border-white/15 bg-[var(--mn-surface)] p-3.5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[var(--mn-border)]">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#142B5F] border border-[#D6A43B]/40 text-[#F2CD78]">
              <Search className="h-3.5 w-3.5" />
            </span>
            <h3 className="text-[13px] font-bold text-[#1E293B] dark:text-[#F8FAFC]">
              البحث السريع في حسابي
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded-lg text-[#64748B] hover:bg-slate-100 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-2.5 relative">
          <input
            type="search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث في تقديماتك، دوراتك، مستنداتك، أو طلباتك..."
            className="w-full min-h-9 rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] pr-8 pl-3 text-[12px] font-medium text-[#1E293B] dark:text-[#F8FAFC] outline-none focus:border-[#0E7C86]"
          />
          <Search className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#0E7C86]" />
        </div>

        <div className="mt-3 max-h-64 overflow-y-auto space-y-1.5">
          {matchedTrackers.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                handleSelectTab('OPPORTUNITIES');
                onClose();
              }}
              className="w-full flex items-center justify-between rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] px-3 py-2 text-right hover:border-[#0E7C86] cursor-pointer"
            >
              <span className="text-[11.5px] font-bold text-[#1E293B] dark:text-[#F8FAFC] truncate">
                {t.owner?.displayName || 'ملف تقديم'}
              </span>
              <span className="text-[10px] font-bold text-[#0E7C86]">فرصي</span>
            </button>
          ))}
          {matchedCourses.map((c) => (
            <button
              key={c.courseId}
              type="button"
              onClick={() => {
                handleSelectTab('LEARNING');
                onClose();
              }}
              className="w-full flex items-center justify-between rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] px-3 py-2 text-right hover:border-[#0E7C86] cursor-pointer"
            >
              <span className="text-[11.5px] font-bold text-[#1E293B] dark:text-[#F8FAFC] truncate">
                {c.courseName}
              </span>
              <span className="text-[10px] font-bold text-[#0E7C86]">تعلمي</span>
            </button>
          ))}
          {matchedSaved.slice(0, 3).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                handleSelectTab('VAULT');
                onClose();
              }}
              className="w-full flex items-center justify-between rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] px-3 py-2 text-right hover:border-[#0E7C86] cursor-pointer"
            >
              <span className="text-[11.5px] font-bold text-[#1E293B] dark:text-[#F8FAFC] truncate">
                {s.displayName || s.entityId}
              </span>
              <span className="text-[10px] font-bold text-[#0E7C86]">محفوظاتي</span>
            </button>
          ))}
          {matchedRequests.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => {
                handleSelectTab('SERVICES');
                onClose();
              }}
              className="w-full flex items-center justify-between rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] px-3 py-2 text-right hover:border-[#0E7C86] cursor-pointer"
            >
              <span className="text-[11.5px] font-bold text-[#1E293B] dark:text-[#F8FAFC]">
                طلب خدمة #{r.publicId}
              </span>
              <span className="text-[10px] font-bold text-[#0E7C86]">طلباتي</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
