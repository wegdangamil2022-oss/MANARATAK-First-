import { FormEvent, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowRight, Plus, Trash2 } from 'lucide-react';
import { ApiClient } from '../../api/client';
import { Seo } from '../../components/Seo';

type RunState = { loading: boolean; error: string; result: unknown; executionId?: string };
type UniversityResult = { publicId: string; slug?: string; displayName: string; country?: string; city?: string; institutionType?: string; academicProgramCount?: number };
type RecommendationResult = { scholarship: { publicId: string; slug?: string; displayName: string }; explanation?: string; constraintSummary?: string[] };
type ToolResult = { draft?: string; warnings?: string[]; semesterGpa?: number; totalSemesterCredits?: number; projectedCumulativeGpa?: number; universities?: UniversityResult[]; unavailableUniversityIds?: string[]; recommendations?: RecommendationResult[]; disclaimer?: string };
const initialRun: RunState = { loading: false, error: '', result: null };
export function StudentToolPage() {
  const { toolKey } = useParams();
  if (toolKey === 'gpa-calculator') return <GpaTool />;
  if (toolKey === 'university-comparison') return <UniversityTool />;
  if (toolKey === 'motivation-letter-generator') return <MotivationTool />;
  if (toolKey === 'scholarship-recommendation') return <ScholarshipTool />;
  return <Navigate to="/tools" replace />;
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
  return (
    <main dir="rtl" className="manaratak-public mn-page-shell mx-auto min-h-screen max-w-5xl space-y-6 p-3 pb-16 font-['Cairo',sans-serif] sm:p-6">
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
  const [saveState, setSaveState] = useState<{ loading: boolean; message: string; error: string }>({ loading: false, message: '', error: '' });
  if (run.error)
    return (
      <div role="alert" className="rounded-2xl border border-[var(--mn-danger-border)] bg-[var(--mn-danger-soft)] p-4 text-[var(--mn-danger-text)]">
        {translateError(run.error)}
      </div>
    );
  if (!run.result) return null;
  return (
    <section aria-live="polite" className="mn-card rounded-3xl border-[var(--mn-border-gold)] bg-[var(--mn-gold-surface)]/40 p-5 sm:p-6">
      <h2 className="mb-4 text-xl font-bold text-[var(--mn-heading)]">النتيجة</h2>
      <ResultBody value={run.result} />
      {run.executionId ? <div className="mt-5 border-t border-[var(--mn-success-border)] pt-4"><button type="button" disabled={saveState.loading} onClick={async () => { setSaveState({ loading: true, message: '', error: '' }); try { await ApiClient.saveStudentToolExecution(run.executionId!); setSaveState({ loading: false, message: 'حُفظت النتيجة صراحةً في مساحة الطالب الخاصة.', error: '' }); } catch (error) { setSaveState({ loading: false, message: '', error: error instanceof Error ? translateError(error.message) : 'تعذر الحفظ.' }); } }} className="rounded-xl border border-[var(--mn-success-border)] bg-[var(--mn-surface)] px-4 py-2 font-semibold text-[var(--mn-success-text)] disabled:opacity-60">{saveState.loading ? 'جاري الحفظ...' : 'حفظ في حسابي'}</button>{saveState.message ? <span className="mr-3 text-sm text-[var(--mn-success-text)]">{saveState.message}</span> : null}{saveState.error ? <span role="alert" className="mr-3 text-sm text-[var(--mn-danger-text)]">{saveState.error}</span> : null}</div> : null}
    </section>
  );
}
function ResultBody({ value }: { value: unknown }) {
  if (!value || typeof value !== 'object') return <p>{String(value)}</p>;
  const result = value as ToolResult;
  if (typeof result.draft === 'string')
    return (
      <div className="space-y-4">
        <div className="mn-card-subtle whitespace-pre-wrap rounded-2xl p-5 leading-8 text-[var(--mn-text)]">
          {result.draft}
        </div>
        {result.warnings?.length ? (
          <ul className="list-inside list-disc text-[var(--mn-warning-text)]">
            {result.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  if (typeof result.semesterGpa === 'number')
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="معدل الفصل" value={result.semesterGpa} />
        <Metric label="الساعات" value={result.totalSemesterCredits ?? '—'} />
        <Metric label="المعدل المتوقع" value={result.projectedCumulativeGpa ?? '—'} />
      </div>
    );
  if (Array.isArray(result.universities))
    return (
      <div className="overflow-x-auto">
        <table className="w-full bg-[var(--mn-surface)] text-sm text-[var(--mn-text)]">
          <thead>
            <tr>
              {['الجامعة', 'الدولة', 'المدينة', 'النوع', 'البرامج'].map((label) => (
                <th key={label} className="p-3 text-right">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.universities.map((item) => (
              <tr key={item.publicId} className="border-t border-[var(--mn-border)]">
                <td className="p-3 font-bold">{item.slug ? <Link className="text-[var(--mn-secondary)] underline-offset-4 hover:underline" to={`/universities/${encodeURIComponent(item.slug)}`}>{item.displayName}</Link> : item.displayName}</td>
                <td className="p-3">{item.country ?? '—'}</td>
                <td className="p-3">{item.city ?? '—'}</td>
                <td className="p-3">{item.institutionType ?? '—'}</td>
                <td className="p-3">{item.academicProgramCount ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {result.unavailableUniversityIds?.length ? (
          <p className="mt-3 text-[var(--mn-warning-text)]">
            تعذر العثور على: {result.unavailableUniversityIds.join('، ')}
          </p>
        ) : null}
      </div>
    );
  if (Array.isArray(result.recommendations))
    return (
      <div className="space-y-3">
        {result.recommendations.map((item) => (
          <article key={item.scholarship.publicId} className="mn-card-subtle rounded-2xl p-4">
            <h3 className="font-bold">{item.scholarship.slug ? <Link className="text-[var(--mn-secondary)] underline-offset-4 hover:underline" to={`/scholarships/${encodeURIComponent(item.scholarship.slug)}`}>{item.scholarship.displayName}</Link> : item.scholarship.displayName}</h3>
            <p className="mt-1 text-sm text-[var(--mn-text-muted)]">
              {item.explanation ?? item.constraintSummary?.join(' • ')}
            </p>
          </article>
        ))}
        <p className="text-sm text-[var(--mn-text-muted)]">{result.disclaimer}</p>
      </div>
    );
  return (
    <pre className="overflow-auto whitespace-pre-wrap text-sm">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}
function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="mn-card-subtle rounded-2xl p-5">
      <div className="text-sm text-[var(--mn-text-muted)]">{label}</div>
      <div className="mt-2 text-3xl font-bold text-[var(--mn-heading)]">{value}</div>
    </div>
  );
}
async function runTool(toolKey: string, input: unknown, setRun: (value: RunState) => void) {
  setRun({ loading: true, error: '', result: null });
  try {
    const response = await ApiClient.executeStudentTool(toolKey, input, 'ar');
    setRun({ loading: false, error: '', result: response.result, executionId: response.executionId });
  } catch (error) {
    setRun({
      loading: false,
      error: error instanceof Error ? error.message : 'TOOL_EXECUTION_FAILED',
      result: null,
    });
  }
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
  const [run, setRun] = useState(initialRun);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void runTool(
      'gpa-calculator',
      {
        scale,
        courses,
        ...(cumulative && credits
          ? { existingCumulativeGpa: Number(cumulative), existingCompletedCredits: Number(credits) }
          : {}),
      },
      setRun,
    );
  };
  return (
    <Shell
      title="حاسبة المعدل التراكمي"
      description="حساب دقيق للمعدل الفصلي وتوقع المعدل التراكمي دون تقريب مبكر."
    >
      <form onSubmit={submit} className="mn-card space-y-5 rounded-3xl p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="سلم المعدل">
            <input
              className={inputClass}
              type="number"
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
              step="0.01"
              value={cumulative}
              onChange={(e) => setCumulative(e.target.value)}
            />
          </Field>
          <Field label="الساعات السابقة">
            <input
              className={inputClass}
              type="number"
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
            onClick={() =>
              setCourses((current) => [
                ...current,
                { label: `المقرر ${current.length + 1}`, creditHours: 3, gradePoints: 0 },
              ])
            }
          >
            <Plus className="h-4 w-4" /> إضافة مقرر
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
                setRun(initialRun);
              }}
            >
              إعادة تعيين
            </button>
            <Submit loading={run.loading} />
          </div>
        </div>
      </form>
      <Result key={run.executionId ?? 'gpa-empty'} run={run} />
    </Shell>
  );
}
function UniversityTool() {
  const [ids, setIds] = useState('');
  const [run, setRun] = useState(initialRun);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void runTool(
      'university-comparison',
      {
        universityIds: ids
          .split(/[،,\n]/)
          .map((v) => v.trim())
          .filter(Boolean),
      },
      setRun,
    );
  };
  return (
    <Shell
      title="مقارنة الجامعات"
      description="مقارنة من جامعتين إلى أربع جامعات باستخدام معرفاتها العامة وبياناتها المنشورة فقط."
    >
      <form onSubmit={submit} className="mn-card space-y-5 rounded-3xl p-5 sm:p-6">
        <Field label="المعرفات العامة للجامعات">
          <textarea
            required
            className={`${inputClass} min-h-32`}
            value={ids}
            onChange={(e) => setIds(e.target.value)}
            placeholder="ألصق 2–4 معرفات، وافصل بينها بفاصلة"
          />
        </Field>
        <p className="text-sm text-[var(--mn-text-muted)]">
          لن تُعرض الجامعات غير المنشورة، وستظهر المعرفات غير المتاحة بوضوح.
        </p>
        <Submit loading={run.loading} />
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
  const [run, setRun] = useState(initialRun);
  const steps: Array<{ title: string; fields: Array<[keyof typeof form, string]> }> = [
    { title: 'الهدف الدراسي', fields: [['program', 'البرنامج المستهدف'], ['degreeLevel', 'الدرجة العلمية']] },
    { title: 'الخلفية', fields: [['education', 'خلفيتك التعليمية'], ['interests', 'اهتماماتك الأكاديمية'], ['experiences', 'خبراتك'], ['achievements', 'إنجازاتك'], ['skills', 'مهاراتك']] },
    { title: 'الدوافع', fields: [['whyField', 'لماذا هذا المجال؟'], ['whyProgram', 'لماذا هذا البرنامج؟'], ['careerGoals', 'أهدافك المهنية'], ['contribution', 'ما الذي ستضيفه؟']] },
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
    const list = (v: string) =>
      v
        .split(/[،,\n]/)
        .map((x) => x.trim())
        .filter(Boolean);
    void runTool(
      'motivation-letter-generator',
      {
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
      },
      setRun,
    );
  };
  return (
    <Shell
      title="منشئ خطاب الدافع"
      description="مسودة رسمية منظمة تعتمد على معلوماتك، وتتطلب تسجيل الدخول وإعداد Phase 17 في التشغيل."
    >
      <form onSubmit={submit} className="grid gap-5 rounded-3xl border bg-[var(--mn-surface)] p-6 sm:grid-cols-2">
        <div className="sm:col-span-2 rounded-2xl border border-[var(--mn-warning-border)] bg-[var(--mn-warning-soft)] p-4 text-sm leading-7 text-[var(--mn-warning-text)]">
          اذكر معلوماتك الحقيقية فقط. المسودة مساعدة أولية وليست بديلًا عن كتابتك ومراجعتك الشخصية، ولا تُحفظ تلقائيًا.
        </div>
        <ol className="sm:col-span-2 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="خطوات إنشاء الخطاب">
          {steps.map((item, index) => <li key={item.title} className={`rounded-xl px-3 py-2 text-center text-xs font-bold ${index === step ? 'bg-[var(--mn-primary)] text-white' : index < step ? 'bg-[var(--mn-info-soft)] text-[var(--mn-secondary)]' : 'bg-[var(--mn-surface-muted)] text-[var(--mn-text-muted)]'}`}>{index + 1}. {item.title}</li>)}
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
        {step === 3 ? <><div className="sm:col-span-2 rounded-2xl bg-[var(--mn-surface-muted)] p-4 text-sm leading-7 text-[var(--mn-text)]">راجع أن المعلومات تعبّر عنك فعلًا. لن تُحفظ المسودة إلا إذا اخترت «حفظ في حسابي» بعد ظهور النتيجة.</div><Field label="عدد الكلمات">
          <input
            className={inputClass}
            type="number"
            min="250"
            max="1200"
            value={form.targetWords}
            onChange={field('targetWords')}
          />
        </Field></> : null}
        <div className="sm:col-span-2 flex justify-between gap-3">
          <button type="button" disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))} className="rounded-xl border px-5 py-2 font-bold disabled:opacity-40">السابق</button>
          {step < steps.length - 1 ? <button type="button" onClick={(event) => { if (event.currentTarget.form?.reportValidity()) setStep((value) => value + 1); }} className="rounded-xl bg-[var(--mn-primary)] px-5 py-2 font-bold text-white">التالي</button> : <Submit loading={run.loading} />}
        </div>
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
  const [run, setRun] = useState(initialRun);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void runTool(
      'scholarship-recommendation',
      {
        preferredCountries: countries
          .split(/[،,\n]/)
          .map((v) => v.trim())
          .filter(Boolean),
        targetDegree: degree || undefined,
        fundingPreference: funding,
        studyLanguage: language || undefined,
      },
      setRun,
    );
  };
  return (
    <Shell
      title="توصية المنح"
      description="مطابقة المنح المنشورة فقط، مع ترتيب إرشادي أو بديل حتمي عند غياب إعداد الذكاء الاصطناعي."
    >
      <form onSubmit={submit} className="grid gap-5 rounded-3xl border bg-[var(--mn-surface)] p-6 sm:grid-cols-2">
        <Field label="الدول المفضلة">
          <input
            className={inputClass}
            value={countries}
            onChange={(e) => setCountries(e.target.value)}
            placeholder="مثال: السعودية، كندا"
          />
        </Field>
        <Field label="الدرجة المستهدفة">
          <input
            className={inputClass}
            value={degree}
            onChange={(e) => setDegree(e.target.value)}
          />
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
      </form>
      <Result key={run.executionId ?? 'scholarship-empty'} run={run} />
    </Shell>
  );
}
function translateError(code: string) {
  const labels: Record<string, string> = {
    TOOL_AUTH_REQUIRED: 'سجّل الدخول لاستخدام هذه الأداة.',
    TOOL_AI_CAPABILITY_UNAVAILABLE: 'خدمة الذكاء الاصطناعي غير مهيأة حاليًا في بيئة التشغيل.',
    TOOL_RATE_LIMITED: 'تم بلوغ حد الاستخدام المؤقت. حاول لاحقًا.',
    TOOL_INPUT_INVALID: 'راجع المدخلات المطلوبة.',
    TOOL_IDEMPOTENCY_KEY_REUSED: 'تعذر إعادة الطلب لأن مفتاح التكرار استُخدم مع مدخلات مختلفة.',
    TOOL_RESULT_PROTECTION_NOT_CONFIGURED: 'حماية نتائج الأدوات غير مهيأة في بيئة التشغيل؛ لم تُنفذ الأداة.',
  };
  return labels[code.split(':')[0]] ?? code;
}
