import { createContext, FormEvent, useContext, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Plus, Trash2 } from 'lucide-react';
import { ApiClient, type PublicStudentToolDto, type PublicUniversityDto } from '../../api/client';
import { StudentToolResultView } from './StudentToolResultView';
import { Seo } from '../../components/Seo';
import { preservePostLoginReturn } from '../students/postLoginIntent';

type RunState = { loading: boolean; error: string; result: unknown; executionId?: string };
const initialRun: RunState = { loading: false, error: '', result: null };
const ToolContext = createContext<PublicStudentToolDto | null>(null);
export function StudentToolPage() {
  const { toolKey } = useParams();
  return <AvailableTool key={toolKey} toolKey={toolKey ?? ''} />;
}
function AvailableTool({ toolKey }: { toolKey: string }) {
  const [tool, setTool] = useState<PublicStudentToolDto | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const location = useLocation();
  const pendingExecution = new URLSearchParams(location.search).get('claimExecution');
  useEffect(() => {
    let active = true;
    let generation = 0;
    const refresh = async () => {
      if (document.visibilityState === 'hidden') return;
      const request = ++generation;
      try {
        const [value, identity] = await Promise.all([
          ApiClient.getStudentTool(toolKey),
          ApiClient.getCurrentSessionIdentity().catch(() => null),
        ]);
        if (!active || request !== generation) return;
        setTool(value);
        setAuthenticated(Boolean(identity));
        setError('');
      } catch (reason) {
        if (active && request === generation) {
          setTool(null);
          setError(reason instanceof Error ? reason.message : 'TOOL_NOT_FOUND');
        }
      } finally {
        if (active && request === generation) setLoading(false);
      }
    };
    void refresh();
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      active = false;
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [toolKey]);
  if (loading)
    return (
      <Shell title="أدوات الطالب" description="">
        <p role="status">جاري تحميل الأداة...</p>
      </Shell>
    );
  if (!tool)
    return (
      <Shell title="الأداة غير متاحة" description="">
        <p role="alert">{translateError(error)}</p>
      </Shell>
    );
  const localeAllowed =
    !tool.availability.allowedLocales?.length || tool.availability.allowedLocales.includes('ar');
  const allowed =
    localeAllowed &&
    (authenticated
      ? tool.availability.authenticatedEnabled && tool.featureFlags.authenticatedEnabled
      : tool.availability.anonymousEnabled && tool.featureFlags.anonymousEnabled);
  return (
    <ToolContext.Provider value={tool}>
      {pendingExecution && (
        <section dir="rtl" className="mn-card mx-auto my-4 max-w-5xl p-5">
          <p className="mb-3">يمكنك حفظ نتيجة استخدامك السابق في حسابك دون إعادة تشغيل الأداة.</p>
          <SaveResult executionId={pendingExecution} />
        </section>
      )}
      {!allowed ? (
        <Shell title={tool.nameAr} description={tool.descriptionAr}>
          <p role="alert">
            {!localeAllowed
              ? 'الأداة غير متاحة باللغة العربية حاليًا.'
              : authenticated
                ? 'الأداة غير متاحة لحسابات الطلاب حاليًا.'
                : 'سجّل الدخول لاستخدام هذه الأداة.'}
          </p>
          {!authenticated && localeAllowed && <LoginForTool />}
        </Shell>
      ) : toolKey === 'gpa-calculator' ? (
        <GpaTool />
      ) : toolKey === 'university-comparison' ? (
        <UniversityTool />
      ) : toolKey === 'motivation-letter-generator' ? (
        <MotivationTool />
      ) : toolKey === 'scholarship-recommendation' ? (
        <ScholarshipTool />
      ) : (
        <Shell title={tool.nameAr} description={tool.descriptionAr}>
          <p>واجهة تشغيل هذه الأداة غير متاحة حاليًا.</p>
        </Shell>
      )}
    </ToolContext.Provider>
  );
}
function LoginForTool({ executionId }: { executionId?: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <button
      type="button"
      className="mt-3 rounded-xl bg-[var(--mn-primary)] px-5 py-3 text-white"
      onClick={() => {
        const query = new URLSearchParams(location.search);
        if (executionId) query.set('claimExecution', executionId);
        preservePostLoginReturn(`${location.pathname}${query.size ? `?${query}` : ''}`);
        navigate('/login');
      }}
    >
      تسجيل الدخول{executionId ? ' وحفظ النتيجة' : ''}
    </button>
  );
}
function SaveResult({ executionId }: { executionId: string }) {
  const [state, setState] = useState({ loading: false, message: '', error: '' });
  const busy = useRef(false);
  return (
    <div className="mt-5 border-t border-[var(--mn-border)] pt-4">
      <button
        type="button"
        disabled={state.loading || Boolean(state.message)}
        onClick={async () => {
          if (busy.current) return;
          busy.current = true;
          setState({ loading: true, message: '', error: '' });
          try {
            await ApiClient.saveStudentToolExecution(executionId);
            setState({ loading: false, message: 'حُفظت النتيجة في حسابك.', error: '' });
          } catch (reason) {
            setState({
              loading: false,
              message: '',
              error: reason instanceof Error ? reason.message : 'TOOL_SAVE_FAILED',
            });
          } finally {
            busy.current = false;
          }
        }}
        className="rounded-xl border border-[var(--mn-success-border)] px-4 py-2 font-semibold text-[var(--mn-success-text)] disabled:opacity-60"
      >
        {state.loading ? 'جاري الحفظ...' : state.message ? 'تم الحفظ' : 'حفظ في حسابي'}
      </button>
      {state.message && (
        <p role="status" className="mt-3 text-[var(--mn-success-text)]">
          {state.message}{' '}
          <Link to="/student?tab=saved" className="underline">
            فتح حسابي
          </Link>
        </p>
      )}
      {state.error && (
        <p role="alert" className="mt-3 text-[var(--mn-danger-text)]">
          {translateError(state.error)}
        </p>
      )}
      {state.error === 'TOOL_AUTH_REQUIRED' && <LoginForTool executionId={executionId} />}
    </div>
  );
}
function Shell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const tool = useContext(ToolContext);
  title = tool?.nameAr || title;
  description = tool?.descriptionAr || description;
  return (
    <main
      dir="rtl"
      className="manaratak-public mn-page-shell mx-auto min-h-screen max-w-5xl space-y-6 p-3 pb-16 font-['Cairo',sans-serif] sm:p-6"
    >
      <Seo title={`${title} | منارتك`} description={description} />
      <Link
        to="/tools"
        className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[var(--mn-secondary)]"
      >
        <ArrowRight className="h-4 w-4" /> كل الأدوات
      </Link>
      <header className="mn-search-hero rounded-3xl border border-[var(--mn-border-gold)] p-5 text-white shadow-xl sm:p-7 mn-inverse">
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="mt-3 leading-7 text-white/80">{description}</p>
      </header>
      {children}
      {tool && (
        <nav
          aria-label="صفحات مرتبطة بالأداة"
          className="flex flex-wrap gap-3 text-sm font-semibold text-[var(--mn-secondary)]"
        >
          {tool.toolKey === 'university-comparison' && (
            <Link to="/universities">استعراض الجامعات</Link>
          )}
          {tool.toolKey === 'scholarship-recommendation' && (
            <Link to="/scholarships">استعراض المنح</Link>
          )}
          <Link to="/services">خدمات المساعدة</Link>
          <Link to="/student">حساب الطالب</Link>
        </nav>
      )}
    </main>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-[var(--mn-heading)]">
      <span>{label}</span>
      {children}
    </label>
  );
}
const inputClass =
  'min-h-12 rounded-xl border border-[var(--mn-border)] bg-[var(--mn-surface)] px-3 py-2 font-normal text-[var(--mn-text)] outline-none focus:border-[var(--mn-accent)] focus:ring-2 focus:ring-[var(--mn-focus)]';
function Submit({ loading }: { loading: boolean }) {
  return (
    <button
      disabled={loading}
      className="rounded-xl bg-[var(--mn-primary)] px-6 py-3 font-semibold text-white hover:bg-[var(--mn-primary-hover)] disabled:opacity-60 mn-inverse"
    >
      {loading ? 'جاري التنفيذ...' : 'تنفيذ الأداة'}
    </button>
  );
}
function Result({ run }: { run: RunState }) {
  if (run.error)
    return (
      <div
        role="alert"
        className="rounded-2xl border border-[var(--mn-danger-border)] bg-[var(--mn-danger-soft)] p-4 text-[var(--mn-danger-text)]"
      >
        {translateError(run.error)}
      </div>
    );
  if (!run.result) return null;
  return (
    <section
      aria-live="polite"
      className="mn-card rounded-3xl border-[var(--mn-border-gold)] bg-[var(--mn-gold-surface)]/40 p-5 sm:p-6"
    >
      <h2 className="mb-4 text-xl font-bold text-[var(--mn-heading)]">النتيجة</h2>
      <StudentToolResultView value={run.result} />
      {run.executionId && <SaveResult executionId={run.executionId} />}
    </section>
  );
}
function useToolRun(toolKey: string) {
  const [run, setRun] = useState(initialRun);
  const busy = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const execute = async (input: unknown) => {
    if (busy.current) return;
    busy.current = true;
    setRun({ loading: true, error: '', result: null });
    try {
      const response = await ApiClient.executeStudentTool(toolKey, input, 'ar');
      if (mounted.current)
        setRun(
          response.status === 'COMPLETED'
            ? {
                loading: false,
                error: '',
                result: response.result,
                executionId: response.executionId,
              }
            : {
                loading: false,
                error:
                  response.status === 'RUNNING' || response.status === 'RECEIVED'
                    ? 'TOOL_EXECUTION_RUNNING'
                    : 'TOOL_EXECUTION_FAILED',
                result: null,
              },
        );
    } catch (reason) {
      if (mounted.current)
        setRun({
          loading: false,
          error: reason instanceof Error ? reason.message : 'TOOL_EXECUTION_FAILED',
          result: null,
        });
    } finally {
      busy.current = false;
    }
  };
  return {
    run,
    execute,
    reset: () => {
      if (!busy.current) setRun(initialRun);
    },
    fail: (error: string) => {
      if (!busy.current) setRun({ loading: false, error, result: null });
    },
  };
}

function GpaTool() {
  const defaultCourses = () => [
    { label: 'المقرر 1', creditHours: 3, gradePoints: 4 },
    { label: 'المقرر 2', creditHours: 3, gradePoints: 3.5 },
  ];
  const [scale, setScale] = useState(4);
  const [courses, setCourses] = useState(defaultCourses);
  const [cumulative, setCumulative] = useState('');
  const [credits, setCredits] = useState('');
  const { run, execute, reset, fail } = useToolRun('gpa-calculator');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (Boolean(cumulative.trim()) !== Boolean(credits.trim())) {
      fail('أدخل المعدل السابق والساعات السابقة معًا أو اتركهما فارغين.');
      return;
    }
    void execute({
      scale,
      courses,
      ...(cumulative && credits
        ? { existingCumulativeGpa: Number(cumulative), existingCompletedCredits: Number(credits) }
        : {}),
    });
  };
  return (
    <Shell
      title="حاسبة المعدل التراكمي"
      description="حساب دقيق للمعدل الفصلي وتوقع المعدل التراكمي دون تقريب مبكر."
    >
      <form onSubmit={submit}>
        <fieldset
          disabled={run.loading}
          className="min-w-0 mn-card space-y-5 rounded-3xl p-5 sm:p-6"
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="سلم المعدل">
              <input
                className={inputClass}
                type="number"
                required
                min="1"
                max="10"
                step="0.01"
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
              />
            </Field>
            <Field label="المعدل التراكمي السابق (اختياري)">
              <input
                className={inputClass}
                type="number"
                min={0}
                max={scale}
                step="0.01"
                value={cumulative}
                onChange={(e) => setCumulative(e.target.value)}
              />
            </Field>
            <Field label="الساعات السابقة">
              <input
                className={inputClass}
                type="number"
                min={1}
                max={1000}
                value={credits}
                onChange={(e) => setCredits(e.target.value)}
              />
            </Field>
          </div>
          <div className="space-y-3">
            {courses.map((course, index) => (
              <div
                key={index}
                className="grid gap-3 rounded-2xl bg-[var(--mn-surface-muted)] p-3 sm:grid-cols-[1fr_140px_140px_44px]"
              >
                <input
                  required
                  maxLength={120}
                  aria-label="اسم المقرر"
                  className={inputClass}
                  value={course.label}
                  onChange={(e) =>
                    setCourses((current) =>
                      current.map((item, i) =>
                        i === index ? { ...item, label: e.target.value } : item,
                      ),
                    )
                  }
                />
                <input
                  required
                  min={0.5}
                  max={30}
                  aria-label="الساعات"
                  className={inputClass}
                  type="number"
                  step="0.5"
                  value={course.creditHours}
                  onChange={(e) =>
                    setCourses((current) =>
                      current.map((item, i) =>
                        i === index ? { ...item, creditHours: Number(e.target.value) } : item,
                      ),
                    )
                  }
                />
                <input
                  required
                  min={0}
                  max={scale}
                  aria-label="نقاط الدرجة"
                  className={inputClass}
                  type="number"
                  step="0.01"
                  value={course.gradePoints}
                  onChange={(e) =>
                    setCourses((current) =>
                      current.map((item, i) =>
                        i === index ? { ...item, gradePoints: Number(e.target.value) } : item,
                      ),
                    )
                  }
                />
                <button
                  disabled={courses.length <= 1}
                  aria-label="حذف المقرر"
                  type="button"
                  onClick={() => setCourses((current) => current.filter((_, i) => i !== index))}
                >
                  <Trash2 className="h-5 w-5 text-red-600" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap justify-between gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border px-4 py-2"
              disabled={courses.length >= 50}
              onClick={() =>
                setCourses((current) => [
                  ...current,
                  { label: `المقرر ${current.length + 1}`, creditHours: 3, gradePoints: 0 },
                ])
              }
            >
              <Plus className="h-4 w-4" /> إضافة مقرر ({courses.length}/50)
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                className="rounded-xl border border-[var(--mn-border)] px-4 py-2 font-bold text-[var(--mn-text)]"
                onClick={() => {
                  setScale(4);
                  setCourses(defaultCourses());
                  setCumulative('');
                  setCredits('');
                  reset();
                }}
              >
                إعادة تعيين
              </button>
              <Submit loading={run.loading} />
            </div>
          </div>
        </fieldset>
      </form>
      <Result key={run.executionId ?? 'gpa-empty'} run={run} />
    </Shell>
  );
}
function UniversityTool() {
  const [search, setSearch] = useState('');
  const [choices, setChoices] = useState<PublicUniversityDto[]>([]);
  const [selected, setSelected] = useState<PublicUniversityDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const { run, execute, fail } = useToolRun('university-comparison');
  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError('');
    const timer = window.setTimeout(() => {
      void ApiClient.getUniversities({
        search: search.trim() || undefined,
        limit: 30,
        locale: 'ar',
      })
        .then((result) => {
          if (active) setChoices(result.data);
        })
        .catch(() => {
          if (active) {
            setChoices([]);
            setLoadError('تعذر تحميل الجامعات المنشورة.');
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [search]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (selected.length < 2) {
      fail('اختر جامعتين على الأقل للمقارنة.');
      return;
    }
    void execute({ universityIds: selected.map((item) => item.publicId) });
  };
  return (
    <Shell
      title="مقارنة الجامعات"
      description="اختر جامعتين إلى أربع جامعات من الجامعات المنشورة للمقارنة."
    >
      <form onSubmit={submit}>
        <fieldset
          disabled={run.loading}
          className="mn-card min-w-0 space-y-5 rounded-3xl p-5 sm:p-6"
        >
          <Field label="البحث عن جامعة">
            <input
              className={inputClass}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="اسم الجامعة"
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            {selected.map((item) => (
              <button
                key={item.publicId}
                type="button"
                onClick={() =>
                  setSelected((current) =>
                    current.filter((value) => value.publicId !== item.publicId),
                  )
                }
                className="rounded-xl bg-[var(--mn-info-soft)] px-3 py-2"
              >
                {item.displayName} ×
              </button>
            ))}
          </div>
          <p className="text-sm">المحدد: {selected.length}/4</p>
          {loading ? (
            <p role="status">جاري تحميل الجامعات...</p>
          ) : loadError ? (
            <p role="alert">{loadError}</p>
          ) : !choices.length ? (
            <p>لا توجد جامعات منشورة مطابقة للبحث.</p>
          ) : (
            <div className="max-h-80 space-y-2 overflow-auto">
              {choices.map((item) => (
                <label
                  key={item.publicId}
                  className="flex items-center gap-3 rounded-xl border border-[var(--mn-border)] p-3"
                >
                  <input
                    type="checkbox"
                    checked={selected.some((value) => value.publicId === item.publicId)}
                    disabled={
                      selected.length >= 4 &&
                      !selected.some((value) => value.publicId === item.publicId)
                    }
                    onChange={(e) =>
                      setSelected((current) =>
                        e.target.checked
                          ? [...current, item]
                          : current.filter((value) => value.publicId !== item.publicId),
                      )
                    }
                  />
                  <span>
                    {item.displayName}
                    <small className="block text-[var(--mn-text-muted)]">{item.country}</small>
                  </span>
                </label>
              ))}
            </div>
          )}
          <Submit loading={run.loading} />
        </fieldset>
      </form>
      <Result key={run.executionId ?? 'university-empty'} run={run} />
    </Shell>
  );
}
function MotivationTool() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    program: '',
    degreeLevel: '',
    education: '',
    interests: '',
    experiences: '',
    achievements: '',
    skills: '',
    whyField: '',
    whyProgram: '',
    careerGoals: '',
    contribution: '',
    targetWords: 500,
  });
  const { run, execute, reset, fail } = useToolRun('motivation-letter-generator');
  const steps: Array<{ title: string; fields: Array<[keyof typeof form, string]> }> = [
    {
      title: 'الهدف الدراسي',
      fields: [
        ['program', 'البرنامج المستهدف'],
        ['degreeLevel', 'الدرجة العلمية'],
      ],
    },
    {
      title: 'الخلفية',
      fields: [
        ['education', 'خلفيتك التعليمية'],
        ['interests', 'اهتماماتك الأكاديمية'],
        ['experiences', 'خبراتك'],
        ['achievements', 'إنجازاتك'],
        ['skills', 'مهاراتك'],
      ],
    },
    {
      title: 'الدوافع',
      fields: [
        ['whyField', 'لماذا هذا المجال؟'],
        ['whyProgram', 'لماذا هذا البرنامج؟'],
        ['careerGoals', 'أهدافك المهنية'],
        ['contribution', 'ما الذي ستضيفه؟'],
      ],
    },
    { title: 'المراجعة والإخراج', fields: [] },
  ];
  const field =
    (key: keyof typeof form) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((current) => ({
        ...current,
        [key]: event.target.type === 'number' ? Number(event.target.value) : event.target.value,
      }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (step < 3) {
      setStep((value) => value + 1);
      return;
    }
    const missing = steps
      .slice(0, 3)
      .findIndex((item) => item.fields.some(([key]) => !String(form[key]).trim()));
    if (missing >= 0) {
      setStep(missing);
      fail('راجع الحقول المطلوبة قبل التنفيذ.');
      return;
    }
    const list = (v: string) =>
      v
        .split(/[،,\n]/)
        .map((x) => x.trim())
        .filter(Boolean);
    void execute({
      target: {
        program: form.program,
        degreeLevel: form.degreeLevel,
        applicationType: 'ADMISSION',
      },
      studentBackground: {
        education: form.education,
        academicInterests: list(form.interests),
        experiences: list(form.experiences),
        achievements: list(form.achievements),
        skills: list(form.skills),
      },
      motivation: {
        whyField: form.whyField,
        whyProgram: form.whyProgram,
        careerGoals: form.careerGoals,
        contribution: form.contribution,
        emphasizedExperiences: list(form.experiences),
      },
      outputPreferences: { language: 'ar', targetWords: form.targetWords, tone: 'FORMAL' },
    });
  };
  return (
    <Shell
      title="منشئ خطاب الدافع"
      description="مسودة رسمية منظمة تعتمد على معلوماتك، وتتطلب تسجيل الدخول وتوفر خدمة إنشاء الخطابات."
    >
      <form onSubmit={submit}>
        <fieldset
          disabled={run.loading}
          className="min-w-0 grid gap-5 rounded-3xl border bg-[var(--mn-surface)] p-6 sm:grid-cols-2"
        >
          <div className="sm:col-span-2 rounded-2xl border border-[var(--mn-warning-border)] bg-[var(--mn-warning-soft)] p-4 text-sm leading-7 text-[var(--mn-warning-text)]">
            اذكر معلوماتك الحقيقية فقط. المسودة مساعدة أولية وليست بديلًا عن كتابتك ومراجعتك
            الشخصية، ولا تُحفظ تلقائيًا.
          </div>
          <ol
            className="sm:col-span-2 grid grid-cols-2 gap-2 sm:grid-cols-4"
            aria-label="خطوات إنشاء الخطاب"
          >
            {steps.map((item, index) => (
              <li
                key={item.title}
                className={`rounded-xl px-3 py-2 text-center text-xs font-bold ${index === step ? 'bg-[var(--mn-primary)] text-white' : index < step ? 'bg-[var(--mn-info-soft)] text-[var(--mn-secondary)]' : 'bg-[var(--mn-surface-muted)] text-[var(--mn-text-muted)]'}`}
              >
                {index + 1}. {item.title}
              </li>
            ))}
          </ol>
          {steps[step].fields.map(([key, label]) => (
            <Field key={key} label={label}>
              <textarea
                required
                className={`${inputClass} min-h-24`}
                value={String(form[key as keyof typeof form])}
                onChange={field(key as keyof typeof form)}
              />
            </Field>
          ))}
          {step === 3 ? (
            <>
              <div className="sm:col-span-2 rounded-2xl bg-[var(--mn-surface-muted)] p-4 text-sm leading-7 text-[var(--mn-text)]">
                راجع أن المعلومات تعبّر عنك فعلًا. لن تُحفظ المسودة إلا إذا اخترت «حفظ في حسابي» بعد
                ظهور النتيجة.
              </div>
              <Field label="عدد الكلمات">
                <input
                  className={inputClass}
                  type="number"
                  required
                  min="250"
                  max="1200"
                  value={form.targetWords}
                  onChange={field('targetWords')}
                />
              </Field>
            </>
          ) : null}
          <div className="sm:col-span-2 flex justify-between gap-3">
            <button
              type="button"
              disabled={step === 0}
              onClick={() => setStep((value) => Math.max(0, value - 1))}
              className="rounded-xl border px-5 py-2 font-bold disabled:opacity-40"
            >
              السابق
            </button>
            {step < steps.length - 1 ? (
              <button
                type="button"
                onClick={(event) => {
                  if (event.currentTarget.form?.reportValidity()) setStep((value) => value + 1);
                }}
                className="rounded-xl bg-[var(--mn-primary)] px-5 py-2 font-bold text-white"
              >
                التالي
              </button>
            ) : (
              <Submit loading={run.loading} />
            )}
          </div>
        </fieldset>
      </form>
      <Result key={run.executionId ?? 'motivation-empty'} run={run} />
    </Shell>
  );
}
function ScholarshipTool() {
  const [countries, setCountries] = useState('');
  const [degree, setDegree] = useState('');
  const [funding, setFunding] = useState('ANY');
  const [language, setLanguage] = useState('');
  const { run, execute, reset, fail } = useToolRun('scholarship-recommendation');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void execute({
      preferredCountries: countries
        .split(/[،,\n]/)
        .map((v) => v.trim())
        .filter(Boolean),
      targetDegree: degree || undefined,
      fundingPreference: funding,
      studyLanguage: language || undefined,
    });
  };
  return (
    <Shell
      title="توصية المنح"
      description="مطابقة المنح المنشورة فقط، مع ترتيب إرشادي أو بديل حتمي عند غياب إعداد الذكاء الاصطناعي."
    >
      <form onSubmit={submit}>
        <fieldset
          disabled={run.loading}
          className="min-w-0 grid gap-5 rounded-3xl border bg-[var(--mn-surface)] p-6 sm:grid-cols-2"
        >
          <Field label="الدول المفضلة">
            <input
              className={inputClass}
              value={countries}
              onChange={(e) => setCountries(e.target.value)}
              placeholder="مثال: السعودية، كندا"
            />
          </Field>
          <Field label="الدرجة المستهدفة">
            <select
              className={inputClass}
              value={degree}
              onChange={(e) => setDegree(e.target.value)}
            >
              <option value="">كل الدرجات</option>
              <option value="BACHELOR">بكالوريوس</option>
              <option value="MASTER">ماجستير</option>
              <option value="DOCTORATE">دكتوراه</option>
            </select>
          </Field>
          <Field label="نوع التمويل">
            <select
              className={inputClass}
              value={funding}
              onChange={(e) => setFunding(e.target.value)}
            >
              <option value="ANY">الكل</option>
              <option value="FULL">تمويل كامل</option>
              <option value="PARTIAL">تمويل جزئي</option>
            </select>
          </Field>
          <Field label="لغة الدراسة">
            <input
              className={inputClass}
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            />
          </Field>
          <div className="sm:col-span-2">
            <Submit loading={run.loading} />
          </div>
        </fieldset>
      </form>
      <Result key={run.executionId ?? 'scholarship-empty'} run={run} />
    </Shell>
  );
}
function translateError(code: string) {
  const labels: Record<string, string> = {
    TOOL_LOCALE_NOT_ALLOWED: 'الأداة غير متاحة بلغة التشغيل المحددة.',
    TOOL_NOT_FOUND: 'الأداة غير متاحة للعامة حاليًا.',
    TOOL_EXECUTION_NOT_FOUND: 'لم تُعثر على النتيجة لهذه الجلسة أو الحساب.',
    TOOL_ANONYMOUS_SESSION_REQUIRED: 'انتهت جلسة الزائر؛ شغّل الأداة من جديد بعد تسجيل الدخول.',
    TOOL_RESULT_EXPIRED: 'انتهت مدة الاحتفاظ المؤقت بالنتيجة. شغّل الأداة من جديد.',
    TOOL_SAVE_NOT_CONFIGURED: 'خدمة حفظ نتائج الأدوات غير مهيأة حاليًا.',
    TOOL_SAVE_FAILED: 'تعذر حفظ النتيجة. حاول مجددًا.',
    TOOL_ACCESS_DENIED: 'الأداة غير متاحة لحسابك حاليًا.',
    TOOL_EXECUTION_RUNNING: 'الطلب ما زال قيد التنفيذ. لا تعِد إرساله الآن.',
    TOOL_EXECUTION_FAILED: 'تعذر تنفيذ الأداة. حاول لاحقًا.',
    STUDENT_TOOL_QUOTA_STORE_UNAVAILABLE: 'تعذر الاتصال بخدمة حدود الاستخدام. حاول لاحقًا.',
    SCHOLARSHIP_COUNTRY_REFERENCE_NOT_ACTIVE: 'راجع الدولة المدخلة؛ يجب أن تطابق دولة نشطة.',
    SCHOLARSHIP_LANGUAGE_REFERENCE_NOT_ACTIVE: 'راجع لغة الدراسة المدخلة.',
    SCHOLARSHIP_DEGREE_REFERENCE_NOT_ACTIVE: 'الدرجة المحددة غير متاحة حاليًا.',
    TOOL_AUTH_REQUIRED: 'سجّل الدخول لاستخدام هذه الأداة.',
    TOOL_AI_CAPABILITY_UNAVAILABLE: 'خدمة الذكاء الاصطناعي غير مهيأة حاليًا في بيئة التشغيل.',
    TOOL_RATE_LIMITED: 'تم بلوغ حد الاستخدام المؤقت. حاول لاحقًا.',
    TOOL_INPUT_INVALID: 'راجع المدخلات المطلوبة.',
    TOOL_IDEMPOTENCY_KEY_REUSED: 'تعذر إعادة الطلب لأن مفتاح التكرار استُخدم مع مدخلات مختلفة.',
    TOOL_RESULT_PROTECTION_NOT_CONFIGURED:
      'حماية نتائج الأدوات غير مهيأة في بيئة التشغيل؛ لم تُنفذ الأداة.',
  };
  return labels[code.split(':')[0]] ?? code;
}
