import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Bell, BookOpen, BriefcaseBusiness, CalendarClock, ChevronLeft,
  CheckCircle2, ClipboardList, GraduationCap, Heart, Info,
  LockKeyhole, Route, Settings2, ShieldCheck, Sparkles, User,
  Award, Bookmark, ExternalLink,
} from 'lucide-react';
import { StudentWorkspaceShell, type StudentWorkspaceTab } from './StudentWorkspaceShell';
import type { ApplicationMilestone, PushNotificationItem } from '../public-template/types';

/**
 * Offline design adapter for the current P15 student workspace.
 * Shared hero/navigation: StudentWorkspaceShell (also used by the actual API workspace).
 * No identity, student API, server persistence, payment or upload actions in this preview.
 */
export interface StudentWorkspacePreviewProps {
  initialTab?: StudentWorkspaceTab;
  favoriteKeys?: string[];
  milestones?: ApplicationMilestone[];
  notifications?: PushNotificationItem[];
  onOpenAuth: () => void;
  onOpenFavorites: () => void;
  onNavigateCategory: (category: string) => void;
}
type PreviewPanelProps = { title: string; description?: string; children: ReactNode };
function PreviewPanel({ title, description, children }: PreviewPanelProps) {
  return <section className="mn-panel rounded-2xl border border-[var(--mn-border)] bg-[var(--mn-surface)] p-4 sm:p-5 shadow-2xs space-y-3">
    <div><h2 className="text-sm sm:text-base font-bold text-[var(--mn-heading)]">{title}</h2>
      {description && <p className="mt-1 text-xs leading-6 text-[var(--mn-text-muted)]">{description}</p>}</div>
    {children}
  </section>;
}
function QuickAction({ label, onClick }: { label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick}
    className="inline-flex min-h-9 items-center gap-1 rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] px-3 py-1.5 text-xs font-bold text-[var(--mn-heading)] hover:border-[#D6A43B]">
    {label}<ChevronLeft className="h-3.5 w-3.5" />
  </button>;
}
function Counter({ title, count, icon: Icon, onClick }: {
  title: string; count: string | number; icon: typeof Heart; onClick: () => void;
}) {
  return <button type="button" onClick={onClick}
    className="mn-panel rounded-2xl border border-[var(--mn-border)] bg-[var(--mn-surface)] p-3 text-center shadow-2xs transition hover:shadow-sm">
    <Icon className="mx-auto mb-1 h-4 w-4 text-[#142B5F] dark:text-[#E5B54F]" />
    <span className="block text-base font-bold text-[var(--mn-heading)]">{count}</span>
    <span className="block text-[10px] font-semibold text-[var(--mn-text-muted)]">{title}</span>
  </button>;
}
const sampleCourses = [
  { id: 'design-course-one', title: 'الاستعداد للمنح والقبول الجامعي', progress: 35, lessons: '3 من 10 دروس' },
  { id: 'design-course-two', title: 'كتابة خطاب الدافع الأكاديمي', progress: 70, lessons: '7 من 10 دروس' },
];
const sampleRequests = [
  { id: 'example-request-1', title: 'استشارة اختيار الجامعة والتخصص', state: 'قيد المراجعة' },
  { id: 'example-request-2', title: 'مراجعة خطاب الدافع', state: 'بانتظار المستندات' },
];

export function StudentWorkspacePreviewPage({
  initialTab = 'SUMMARY', favoriteKeys = [], milestones = [], notifications = [],
  onOpenAuth, onOpenFavorites, onNavigateCategory,
}: StudentWorkspacePreviewProps) {
  const [tab, setTab] = useState<StudentWorkspaceTab>(initialTab);
  const [previewName, setPreviewName] = useState('طالب منارتك');
  const [targetDegree, setTargetDegree] = useState('بكالوريوس');
  const [targetCountry, setTargetCountry] = useState('الصين');
  const [preferences, setPreferences] = useState({ alerts: true, recommendations: true });
  const [readNotifications, setReadNotifications] = useState<string[]>([]);
  const [doneChecklist, setDoneChecklist] = useState<string[]>([]);
  const [profileNotice, setProfileNotice] = useState('');
  const [careerHeadline, setCareerHeadline] = useState('');
  useEffect(() => { setTab(initialTab); }, [initialTab]);
  const activeMilestones = useMemo(() => milestones.filter(item => item.progress < 100), [milestones]);
  const upcomingCount = useMemo(() => notifications.filter(item => !item.read && !readNotifications.includes(item.id)).length, [notifications, readNotifications]);
  const completedTasks = doneChecklist.length;
  const status = 'معاينة فقط';
  return <StudentWorkspaceShell
    activeTab={tab} onTabChange={setTab} displayName={previewName}
    statusLabel={status} stats={{ activeCourses: sampleCourses.length, certificates: 1, averageCourseProgress: 53 }}
    onLogout={onOpenAuth} logoutLabel="تسجيل الدخول"
  >
    <div className="mx-auto mt-3 rounded-xl border border-[#D6A43B]/35 bg-[#D6A43B]/10 px-3 py-2 text-[11px] leading-6 text-[var(--mn-heading)]">
      <span className="inline-flex items-center gap-1 font-bold"><Info className="h-3.5 w-3.5" /> حساب طالب تجريبي</span>
      <span className="mr-2 text-[var(--mn-text-muted)]">نفس تصميم الحساب المعتمد، والبيانات للتجربة فقط. لا توجد بيانات شخصية أو عمليات محفوظة على الخادم.</span>
    </div>
    <div className="mx-auto mt-5 w-full max-w-4xl space-y-5">
      {tab === 'SUMMARY' && <>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5">
          <Counter title="تقديمات نشطة" count={activeMilestones.length} icon={Route} onClick={() => setTab('OPPORTUNITIES')}/>
          <Counter title="دورات جارية" count={sampleCourses.length} icon={BookOpen} onClick={() => setTab('LEARNING')}/>
          <Counter title="عناصر محفوظة" count={favoriteKeys.length} icon={Heart} onClick={() => setTab('VAULT')}/>
          <Counter title="شهادات نموذجية" count={1} icon={Award} onClick={() => setTab('LEARNING')}/>
        </div>
        {upcomingCount > 0 && <PreviewPanel title="يحتاج انتباهك" description="تنبيهات تجريبية لا تمثل مواعيد تقديم حقيقية.">
          {notifications.filter(n => !n.read && !readNotifications.includes(n.id)).slice(0,2).map(n =>
            <button type="button" key={n.id} onClick={() => setTab('NOTIFICATIONS')} className="flex w-full items-center justify-between gap-2 rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] p-3 text-right text-xs">
              <span className="font-bold">{n.title}</span><Bell className="h-4 w-4 text-[#B38018]"/>
            </button>)}
        </PreviewPanel>}
        <PreviewPanel title="متابعة التعلم" description="نموذج لآخر دورة دراسية قيد التقدم.">
          <div className="rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] p-3">
            <div className="flex items-center justify-between gap-2">
              <strong className="text-xs text-[var(--mn-heading)]">{sampleCourses[0].title}</strong>
              <span className="text-xs font-bold">{sampleCourses[0].progress}%</span>
            </div>
            <progress value={sampleCourses[0].progress} max={100} aria-label="تقدم الدورة النموذجية" className="mn-native-progress mn-native-progress-secondary mt-3 h-2 w-full"/>
            <div className="mt-3 flex items-center justify-between text-xs text-[var(--mn-text-muted)]">
              <span>{sampleCourses[0].lessons}</span><QuickAction label="عرض تعلمي" onClick={() => setTab('LEARNING')}/>
            </div>
          </div>
        </PreviewPanel>
        <PreviewPanel title="فرصي الدراسية" description="متابعة المنح والفرص المحفوظة في مساحة الطالب.">
          {activeMilestones.slice(0,2).map(item => <div key={item.id} className="rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] p-3">
            <div className="flex items-center justify-between gap-2"><strong className="text-xs">{item.scholarshipTitle}</strong><span className="text-xs font-bold">{item.progress}%</span></div>
            <p className="mt-1 text-xs text-[var(--mn-text-muted)]">{item.stage}</p>
            <progress value={item.progress} max={100} className="mn-native-progress mn-native-progress-secondary mt-2 h-2 w-full" aria-label="التقدم في طلب المنحة"/>
          </div>)}
          {!activeMilestones.length && <p className="text-xs text-[var(--mn-text-muted)]">لا توجد متابعات تجريبية.</p>}
          <QuickAction label="عرض الفرص" onClick={() => setTab('OPPORTUNITIES')}/>
        </PreviewPanel>
        <PreviewPanel title="ابدأ رحلتك مع منارتك" description="استكشف المجالات المتاحة ثم عد إلى مساحة الطالب.">
          <div className="flex flex-wrap gap-2">
            <QuickAction label="المنح الدراسية" onClick={() => onNavigateCategory('scholarships')}/>
            <QuickAction label="دليل الجامعات" onClick={() => onNavigateCategory('universities')}/>
            <QuickAction label="التخصصات" onClick={() => onNavigateCategory('majors')}/>
            <QuickAction label="الدورات" onClick={() => onNavigateCategory('courses')}/>
          </div>
        </PreviewPanel>
      </>}
      {tab === 'OPPORTUNITIES' && <>
        <PreviewPanel title="فرصي وطلبات المنح" description="معاينة لمسار التقديم وقوائم التحقق دون رفع مستندات أو إرسال طلبات.">
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-xl bg-[var(--mn-page)] p-3"><span className="block text-lg font-bold">{activeMilestones.length}</span><span className="text-xs text-[var(--mn-text-muted)]">متابعة نشطة</span></div>
            <div className="rounded-xl bg-[var(--mn-page)] p-3"><span className="block text-lg font-bold">{completedTasks}</span><span className="text-xs text-[var(--mn-text-muted)]">مهام جربت إكمالها</span></div>
          </div>
          {milestones.map(item => <section key={item.id} className="rounded-xl border border-[var(--mn-border)] p-3 space-y-3">
            <div className="flex items-center justify-between gap-2"><strong className="text-sm">{item.scholarshipTitle}</strong><span className="text-xs font-bold">{item.progress}%</span></div>
            <p className="text-xs text-[var(--mn-text-muted)]">{item.stage}</p>
            <progress value={item.progress} max={100} className="mn-native-progress mn-native-progress-secondary h-2 w-full" aria-label="تقدم الطلب"/>
            {item.checklist.map((task, index) => {
              const id = item.id + ':' + index;
              const checked = doneChecklist.includes(id);
              return <label key={id} className="flex cursor-pointer items-center gap-2 text-xs">
                <input type="checkbox" checked={checked} onChange={() => setDoneChecklist(current => checked ? current.filter(x=>x!==id) : [...current,id])}/>
                <span>{task.task}</span>
              </label>;
            })}
          </section>)}
          {!milestones.length && <p className="text-xs text-[var(--mn-text-muted)]">لا توجد طلبات نموذجية.</p>}
          <QuickAction label="استكشف منحًا أخرى" onClick={() => onNavigateCategory('scholarships')}/>
        </PreviewPanel>
      </>}
      {tab === 'LEARNING' && <>
        <PreviewPanel title="تعلمي ودوراتي" description="معاينة متابعة الدروس والإنجازات والشهادات داخل الحساب.">
          {sampleCourses.map(course => <div key={course.id} className="rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] p-3 space-y-2">
            <div className="flex items-start justify-between gap-2"><div><strong className="block text-sm">{course.title}</strong><span className="text-xs text-[var(--mn-text-muted)]">{course.lessons}</span></div><BookOpen className="h-5 w-5 text-[#B38018]"/></div>
            <div className="flex items-center justify-between text-xs"><span>تقدم الدورة</span><b>{course.progress}%</b></div>
            <progress value={course.progress} max={100} className="mn-native-progress mn-native-progress-secondary h-2 w-full" aria-label="التقدم في دورة المعاينة"/>
          </div>)}
          <QuickAction label="استكشاف الدورات" onClick={() => onNavigateCategory('courses')}/>
        </PreviewPanel>
        <PreviewPanel title="شهاداتي" description="مكان عرض الشهادات المكتسبة بعد تشغيل المنصة.">
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-[var(--mn-border)] p-3">
            <Award className="h-7 w-7 text-[#B38018]"/><div><strong className="block text-sm">نموذج بطاقة شهادة</strong><p className="text-xs text-[var(--mn-text-muted)]">للتصميم فقط — ليست شهادة صادرة.</p></div>
          </div>
        </PreviewPanel>
      </>}
      {tab === 'VAULT' && <>
        <PreviewPanel title="محفوظاتي" description="مساحة تنظيم المنح والجامعات والتخصصات والدورات التي حفظتها.">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {['scholarship','university','major','country','course','exam','article','tool','career'].map(kind => {
              const labels: Record<string,string> = { scholarship:'منح', university:'جامعات', major:'تخصصات', country:'دول', course:'دورات', exam:'اختبارات', article:'مقالات', tool:'أدوات', career:'وظائف' };
              return <div key={kind} className="rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] p-3 text-center"><Heart className="mx-auto h-4 w-4 text-[#B38018]"/><b className="mt-1 block text-sm">{favoriteKeys.filter(x => x.startsWith(kind + ':')).length}</b><span className="text-xs text-[var(--mn-text-muted)]">{labels[kind]}</span></div>;
            })}
          </div>
          <QuickAction label="عرض العناصر المحفوظة" onClick={onOpenFavorites}/>
          <p className="text-xs text-[var(--mn-text-muted)]">العناصر المحفوظة في نسخة المعاينة موجودة محليًا في المتصفح، وليست مزامنة مع حساب حقيقي.</p>
        </PreviewPanel>
      </>}
      {tab === 'CAREERS' && <>
        <PreviewPanel title="مساري المهني" description="معاينة الملف المهني وطلبات الوظائف والتدريب وفرص الخريجين.">
          <label className="block text-xs font-bold">المسمى المهني المستهدف
            <input className="mt-1 block w-full rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] p-3 text-sm" value={careerHeadline} onChange={event => setCareerHeadline(event.target.value)} placeholder="مثل: مطور برمجيات" />
          </label>
          <div className="rounded-xl border border-dashed border-[var(--mn-border)] p-4 text-xs text-[var(--mn-text-muted)]">
            <BriefcaseBusiness className="mb-2 h-5 w-5 text-[#B38018]"/>
            نموذج لطلبات العمل والتدريب. ملف السيرة الذاتية ومشاركة البيانات مع أصحاب العمل لن يعملا حتى يتم ربط النظام.
          </div>
          <QuickAction label="تصفح فرص العمل والتدريب" onClick={() => onNavigateCategory('jobs')}/>
        </PreviewPanel>
      </>}
      {tab === 'SERVICES' && <>
        <PreviewPanel title="طلباتي وخدماتي" description="معاينة متابعة طلبات الخدمات والحالات والفواتير دون دفع أو طلب فعلي.">
          {sampleRequests.map(r => <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] p-3">
            <span className="inline-flex items-center gap-2 text-xs font-bold"><ClipboardList className="h-4 w-4 text-[#B38018]"/>{r.title}</span>
            <span className="rounded-full bg-[#B38018]/10 px-2 py-1 text-[11px] font-bold">{r.state}</span>
          </div>)}
          <QuickAction label="استكشف خدمات منارتك" onClick={() => onNavigateCategory('services')}/>
        </PreviewPanel>
      </>}
      {tab === 'NOTIFICATIONS' && <>
        <PreviewPanel title="إشعاراتي" description="نماذج إشعارات المعاينة؛ يمكنك تجربتها كمقروءة على هذه الصفحة فقط.">
          {notifications.map(item => { const read = item.read || readNotifications.includes(item.id);return <article key={item.id} className="rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] p-3 space-y-1">
            <div className="flex justify-between gap-2"><h3 className="text-sm font-bold">{item.title}</h3>{!read && <span className="rounded-full bg-[#D6A43B]/20 px-2 py-1 text-[10px]">جديد</span>}</div>
            <p className="text-xs text-[var(--mn-text-muted)]">{item.body}</p>
            <div className="flex items-center justify-between gap-2"><span className="text-[10px] text-[var(--mn-text-muted)]">{item.timestamp}</span><button disabled={read} type="button" className="text-xs font-bold text-[var(--mn-primary)] disabled:opacity-40" onClick={() => setReadNotifications(old => [...old,item.id])}>{read ? 'مقروء' : 'تحديد كمقروء'}</button></div>
          </article>; })}
          {!notifications.length && <p className="text-xs text-[var(--mn-text-muted)]">لا توجد إشعارات نموذجية.</p>}
        </PreviewPanel>
      </>}
      {tab === 'PROFILE' && <>
        <PreviewPanel title="الملف الشخصي والأكاديمي" description="تجربة عناصر الملف قبل ربط المصادقة والبيانات الحقيقية.">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-bold">اسم العرض<input className="mt-1 block w-full rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] p-3 text-sm" value={previewName} onChange={event => setPreviewName(event.target.value)}/></label>
            <label className="block text-xs font-bold">الدرجة المستهدفة<select className="mt-1 block w-full rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] p-3 text-sm" value={targetDegree} onChange={event => setTargetDegree(event.target.value)}><option>بكالوريوس</option><option>ماجستير</option><option>دكتوراه</option><option>زمالة</option></select></label>
            <label className="block text-xs font-bold">الدولة المستهدفة<input className="mt-1 block w-full rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] p-3 text-sm" value={targetCountry} onChange={event => setTargetCountry(event.target.value)} /></label>
          </div>
          <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setProfileNotice('تم تحديث نموذج التصميم محليًا فقط، ولم تُحفظ بيانات على خادم.')} className="rounded-xl bg-[var(--mn-primary)] px-4 py-2 text-xs font-bold text-white">حفظ تجريبي</button><QuickAction label="العودة إلى الملخص" onClick={() => setTab('SUMMARY')}/></div>
          {profileNotice && <p role="status" className="text-xs font-bold text-[var(--mn-heading)]">{profileNotice}</p>}
        </PreviewPanel>
        <PreviewPanel title="تفضيلات الإشعارات والخصوصية" description="حالة عناصر التحكم هنا للمعاينة فقط.">
          <label className="flex items-center justify-between gap-3 text-sm"><span className="inline-flex items-center gap-2"><Bell className="h-4 w-4"/>التنبيهات</span><input type="checkbox" checked={preferences.alerts} onChange={event=>setPreferences(p=>({...p,alerts:event.target.checked}))}/></label>
          <label className="flex items-center justify-between gap-3 text-sm"><span className="inline-flex items-center gap-2"><Sparkles className="h-4 w-4"/>التوصيات التعليمية</span><input type="checkbox" checked={preferences.recommendations} onChange={event=>setPreferences(p=>({...p,recommendations:event.target.checked}))}/></label>
          <div className="flex items-start gap-2 rounded-xl border border-dashed border-[var(--mn-border)] p-3 text-xs text-[var(--mn-text-muted)]"><LockKeyhole className="h-4 w-4 shrink-0"/><span>لن يتم رفع وثائق أو مشاركة بيانات شخصية في هذه المعاينة.</span></div>
          <QuickAction label="تسجيل الدخول الحقيقي لاحقًا" onClick={onOpenAuth}/>
        </PreviewPanel>
      </>}
    </div>
  </StudentWorkspaceShell>;
}
