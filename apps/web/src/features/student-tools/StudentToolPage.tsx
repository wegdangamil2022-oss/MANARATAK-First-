import { studentToolCopy } from '../../i18n/studentToolCopy';
import { useTranslation } from '../../i18n/I18nProvider';
import { createContext, FormEvent, useContext, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Plus, Trash2 } from 'lucide-react';
import { ApiClient, type PublicStudentToolDto, type PublicUniversityDto } from '../../api/client';
import { StudentToolResultView } from './StudentToolResultView';
import { Seo } from '../../components/Seo';
import { preservePostLoginReturn } from '../students/postLoginIntent';

type RunState = {
  loading: boolean;
  error: string;
  result: unknown;
  executionId?: string;
  resultExpiresAt?: string | null;
};
const initialRun: RunState = { loading: false, error: '', result: null };
const ToolContext = createContext<PublicStudentToolDto | null>(null);
export function StudentToolPage() {
  const { toolKey } = useParams();
  return <AvailableTool key={toolKey} toolKey={toolKey ?? ''} />;
}
function AvailableTool({ toolKey }: { toolKey: string }) {
  const { language: uiLocale } = useTranslation();
  const [tool, setTool] = useState<PublicStudentToolDto | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const location = useLocation();
  const { language } = useTranslation();
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
      <Shell title={studentToolCopy('student_tools_copy_0', uiLocale)} description="">
        <p role="status">{studentToolCopy('student_tools_copy_1', uiLocale)}</p>
      </Shell>
    );
  if (!tool)
    return (
      <Shell title={studentToolCopy('student_tools_copy_2', uiLocale)} description="">
        <p role="alert">{translateError(error, uiLocale)}</p>
      </Shell>
    );
  const localeAllowed =
    !tool.availability.allowedLocales?.length ||
    tool.availability.allowedLocales.includes(language);
  const allowed =
    localeAllowed &&
    (authenticated
      ? tool.availability.authenticatedEnabled && tool.featureFlags.authenticatedEnabled
      : tool.availability.anonymousEnabled && tool.featureFlags.anonymousEnabled);
  return (
    <ToolContext.Provider value={tool}>
      {pendingExecution && (
        <section
          dir={uiLocale === 'ar' ? 'rtl' : 'ltr'}
          className="ab-card mx-auto my-4 max-w-5xl p-5"
        >
          <p className="mb-3">{studentToolCopy('student_tools_copy_3', uiLocale)}</p>
          <SaveResult executionId={pendingExecution} />
        </section>
      )}
      {!allowed ? (
        <Shell
          title={language === 'en' ? tool.nameEn : tool.nameAr}
          description={language === 'en' ? tool.descriptionEn : tool.descriptionAr}
        >
          <p role="alert">
            {!localeAllowed
              ? studentToolCopy('student_tools_copy_4', uiLocale)
              : authenticated
                ? studentToolCopy('student_tools_copy_5', uiLocale)
                : studentToolCopy('student_tools_copy_6', uiLocale)}
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
        <Shell
          title={language === 'en' ? tool.nameEn : tool.nameAr}
          description={language === 'en' ? tool.descriptionEn : tool.descriptionAr}
        >
          <p>{studentToolCopy('student_tools_copy_7', uiLocale)}</p>
        </Shell>
      )}
    </ToolContext.Provider>
  );
}
function LoginForTool({ executionId }: { executionId?: string }) {
  const { language: uiLocale } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <button
      type="button"
      className="mt-3 rounded-xl bg-[var(--ab-primary)] px-5 py-3 text-white"
      onClick={() => {
        const query = new URLSearchParams(location.search);
        if (executionId) query.set('claimExecution', executionId);
        preservePostLoginReturn(`${location.pathname}${query.size ? `?${query}` : ''}`);
        navigate('/login');
      }}
    >
      {studentToolCopy('student_tools_copy_8', uiLocale)}
      {executionId ? studentToolCopy('student_tools_copy_9', uiLocale) : ''}
    </button>
  );
}
function SaveResult({ executionId, expiresAt }: { executionId: string; expiresAt?: string | null }) {
  const { language: uiLocale } = useTranslation();
  const [state, setState] = useState({ loading: false, message: '', error: '' });
  const busy = useRef(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { if (!expiresAt) return; const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, [expiresAt]);
  const remaining = expiresAt ? Math.max(0, Math.ceil((Date.parse(expiresAt) - now) / 1000)) : null;
  return (
    <div className="mt-5 border-t border-[var(--ab-border)] pt-4">
      <button
        type="button"
        disabled={state.loading || Boolean(state.message) || remaining === 0}
        onClick={async () => {
          if (busy.current) return;
          busy.current = true;
          setState({ loading: true, message: '', error: '' });
          try {
            await ApiClient.saveStudentToolExecution(executionId);
            setState({
              loading: false,
              message: studentToolCopy('student_tools_copy_10', uiLocale),
              error: '',
            });
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
        className="rounded-xl border border-[var(--ab-success-border)] px-4 py-2 font-semibold text-[var(--ab-success-text)] disabled:opacity-60"
      >
        {state.loading
          ? studentToolCopy('student_tools_copy_11', uiLocale)
          : state.message
            ? studentToolCopy('student_tools_copy_12', uiLocale)
            : studentToolCopy('student_tools_copy_13', uiLocale)}
      </button>
      {remaining !== null && !state.message && <p>{studentToolCopy(remaining === 0 ? 'student_tools_copy_89' : 'student_tools_adoption_countdown', uiLocale)} {remaining > 0 ? `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}` : ''}</p>}
      {state.message && (
        <p role="status" className="mt-3 text-[var(--ab-success-text)]">
          {state.message}{' '}
          <Link to="/student?tab=saved" className="underline">
            {studentToolCopy('student_tools_copy_14', uiLocale)}
          </Link>
        </p>
      )}
      {state.error && (
        <p role="alert" className="mt-3 text-[var(--ab-danger-text)]">
          {translateError(state.error, uiLocale)}
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
  const { language: uiLocale } = useTranslation();
  const tool = useContext(ToolContext);
  title = tool?.nameAr || title;
  description = tool?.descriptionAr || description;
  return (
    <main
      dir={uiLocale === 'ar' ? 'rtl' : 'ltr'}
      className="absheer-public ab-page-shell mx-auto min-h-screen max-w-5xl space-y-6 p-3 pb-16 font-['Cairo',sans-serif] sm:p-6"
    >
      <Seo title={`${title} | أبشر`} description={description} />
      <Link
        to="/tools"
        className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[var(--ab-secondary)]"
      >
        <ArrowRight className="h-4 w-4" /> {studentToolCopy('student_tools_copy_15', uiLocale)}
      </Link>
      <header className="ab-search-hero rounded-3xl border border-[var(--ab-border-gold)] p-5 text-white shadow-xl sm:p-7 ab-inverse">
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="mt-3 leading-7 text-white/80">{description}</p>
      </header>
      {children}
      {tool && (
        <nav
          aria-label={studentToolCopy('student_tools_copy_16', uiLocale)}
          className="flex flex-wrap gap-3 text-sm font-semibold text-[var(--ab-secondary)]"
        >
          {tool.toolKey === 'university-comparison' && (
            <Link to="/universities">{studentToolCopy('student_tools_copy_17', uiLocale)}</Link>
          )}
          {tool.toolKey === 'scholarship-recommendation' && (
            <Link to="/scholarships">{studentToolCopy('student_tools_copy_18', uiLocale)}</Link>
          )}
          <Link to="/services">{studentToolCopy('student_tools_copy_19', uiLocale)}</Link>
          <Link to="/student">{studentToolCopy('student_tools_copy_20', uiLocale)}</Link>
        </nav>
      )}
    </main>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-[var(--ab-heading)]">
      <span>{label}</span>
      {children}
    </label>
  );
}
const inputClass =
  'min-h-12 rounded-xl border border-[var(--ab-border)] bg-[var(--ab-surface)] px-3 py-2 font-normal text-[var(--ab-text)] outline-none focus:border-[var(--ab-accent)] focus:ring-2 focus:ring-[var(--ab-focus)]';
function Submit({ loading }: { loading: boolean }) {
  const { language: uiLocale } = useTranslation();
  return (
    <button
      disabled={loading}
      className="rounded-xl bg-[var(--ab-primary)] px-6 py-3 font-semibold text-white hover:bg-[var(--ab-primary-hover)] disabled:opacity-60 ab-inverse"
    >
      {loading
        ? studentToolCopy('student_tools_copy_21', uiLocale)
        : studentToolCopy('student_tools_copy_22', uiLocale)}
    </button>
  );
}
function Result({ run }: { run: RunState }) {
  const { language: uiLocale } = useTranslation();
  if (run.error)
    return (
      <div
        role="alert"
        className="rounded-2xl border border-[var(--ab-danger-border)] bg-[var(--ab-danger-soft)] p-4 text-[var(--ab-danger-text)]"
      >
        {translateError(run.error, uiLocale)}
      </div>
    );
  if (!run.result) return null;
  return (
    <section
      aria-live="polite"
      className="ab-card rounded-3xl border-[var(--ab-border-gold)] bg-[var(--ab-gold-surface)]/40 p-5 sm:p-6"
    >
      <h2 className="mb-4 text-xl font-bold text-[var(--ab-heading)]">
        {studentToolCopy('student_tools_copy_23', uiLocale)}
      </h2>
      <StudentToolResultView value={run.result} />
      {run.executionId && (
        <>
          <p role="status">
            {run.resultExpiresAt
              ? `${studentToolCopy('student_tools_section19_7', uiLocale)} ${new Date(run.resultExpiresAt).toLocaleString(uiLocale)}`
              : ''}
          </p>
          <SaveResult executionId={run.executionId} expiresAt={run.resultExpiresAt} />
        </>
      )}
    </section>
  );
}
function useToolRun(toolKey: string) {
  const { language } = useTranslation();
  const [privacyConsent, setPrivacyConsent] = useState(false);
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
      const response = await ApiClient.executeStudentTool(toolKey, input, language, privacyConsent);
      if (mounted.current)
        setRun(
          response.status === 'COMPLETED'
            ? {
                loading: false,
                error: '',
                result: response.result,
                executionId: response.executionId,
                resultExpiresAt: response.resultExpiresAt,
              }
            : {
                loading: false,
                error:
                  response.status === 'UNKNOWN_OUTCOME'
                    ? 'TOOL_AI_UNKNOWN_OUTCOME'
                    : response.status === 'BLOCKED'
                      ? 'TOOL_EXECUTION_BLOCKED'
                      : response.status === 'RUNNING' || response.status === 'RECEIVED'
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
    privacyConsent,
    setPrivacyConsent,
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
  const { language: uiLocale } = useTranslation();
  const defaultCourses = () => [
    { label: studentToolCopy('student_tools_copy_24', uiLocale), creditHours: 3, gradePoints: 4 },
    { label: studentToolCopy('student_tools_copy_25', uiLocale), creditHours: 3, gradePoints: 3.5 },
  ];
  const [scale, setScale] = useState(4);
  const [courses, setCourses] = useState(defaultCourses);
  const [cumulative, setCumulative] = useState('');
  const [credits, setCredits] = useState('');
  const { run, execute, reset, fail } = useToolRun('gpa-calculator');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (Boolean(cumulative.trim()) !== Boolean(credits.trim())) {
      fail(studentToolCopy('student_tools_copy_26', uiLocale));
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
      title={studentToolCopy('student_tools_copy_27', uiLocale)}
      description={studentToolCopy('student_tools_copy_28', uiLocale)}
    >
      <form onSubmit={submit}>
        <fieldset
          disabled={run.loading}
          className="min-w-0 ab-card space-y-5 rounded-3xl p-5 sm:p-6"
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={studentToolCopy('student_tools_copy_29', uiLocale)}>
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
            <Field label={studentToolCopy('student_tools_copy_30', uiLocale)}>
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
            <Field label={studentToolCopy('student_tools_copy_31', uiLocale)}>
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
                className="grid gap-3 rounded-2xl bg-[var(--ab-surface-muted)] p-3 sm:grid-cols-[1fr_140px_140px_44px]"
              >
                <input
                  required
                  maxLength={120}
                  aria-label={studentToolCopy('student_tools_copy_32', uiLocale)}
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
                  aria-label={studentToolCopy('student_tools_result_1', uiLocale)}
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
                  aria-label={studentToolCopy('student_tools_copy_34', uiLocale)}
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
                  aria-label={studentToolCopy('student_tools_copy_35', uiLocale)}
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
              <Plus className="h-4 w-4" /> {studentToolCopy('student_tools_copy_36', uiLocale)}
              {courses.length}/50)
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                className="rounded-xl border border-[var(--ab-border)] px-4 py-2 font-bold text-[var(--ab-text)]"
                onClick={() => {
                  setScale(4);
                  setCourses(defaultCourses());
                  setCumulative('');
                  setCredits('');
                  reset();
                }}
              >
                {studentToolCopy('student_tools_copy_37', uiLocale)}
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
  const { language: uiLocale } = useTranslation();
  const { language } = useTranslation();
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
        locale: language,
      })
        .then((result) => {
          if (active) setChoices(result.data);
        })
        .catch(() => {
          if (active) {
            setChoices([]);
            setLoadError(studentToolCopy('student_tools_copy_38', uiLocale));
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
  }, [search, language, uiLocale]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (selected.length < 2) {
      fail(studentToolCopy('student_tools_copy_39', uiLocale));
      return;
    }
    void execute({ universityIds: selected.map((item) => item.publicId) });
  };
  return (
    <Shell
      title={studentToolCopy('student_tools_copy_40', uiLocale)}
      description={studentToolCopy('student_tools_copy_41', uiLocale)}
    >
      <form onSubmit={submit}>
        <fieldset
          disabled={run.loading}
          className="ab-card min-w-0 space-y-5 rounded-3xl p-5 sm:p-6"
        >
          <Field label={studentToolCopy('student_tools_copy_42', uiLocale)}>
            <input
              className={inputClass}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={studentToolCopy('student_tools_copy_43', uiLocale)}
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
                className="rounded-xl bg-[var(--ab-info-soft)] px-3 py-2"
              >
                {item.displayName} ×
              </button>
            ))}
          </div>
          <p className="text-sm">
            {studentToolCopy('student_tools_copy_44', uiLocale)}
            {selected.length}/4
          </p>
          {loading ? (
            <p role="status">{studentToolCopy('student_tools_copy_45', uiLocale)}</p>
          ) : loadError ? (
            <p role="alert">{loadError}</p>
          ) : !choices.length ? (
            <p>{studentToolCopy('student_tools_copy_46', uiLocale)}</p>
          ) : (
            <div className="max-h-80 space-y-2 overflow-auto">
              {choices.map((item) => (
                <label
                  key={item.publicId}
                  className="flex items-center gap-3 rounded-xl border border-[var(--ab-border)] p-3"
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
                    <small className="block text-[var(--ab-text-muted)]">{item.country}</small>
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
  const { language: uiLocale } = useTranslation();
  const { language: locale } = useTranslation();
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
  const { run, execute, fail, privacyConsent, setPrivacyConsent } = useToolRun(
    'motivation-letter-generator',
  );
  const steps: Array<{ title: string; fields: Array<[keyof typeof form, string]> }> = [
    {
      title: studentToolCopy('student_tools_copy_47', uiLocale),
      fields: [
        ['program', studentToolCopy('student_tools_copy_48', uiLocale)],
        ['degreeLevel', studentToolCopy('student_tools_copy_49', uiLocale)],
      ],
    },
    {
      title: studentToolCopy('student_tools_copy_50', uiLocale),
      fields: [
        ['education', studentToolCopy('student_tools_copy_51', uiLocale)],
        ['interests', studentToolCopy('student_tools_copy_52', uiLocale)],
        ['experiences', studentToolCopy('student_tools_copy_53', uiLocale)],
        ['achievements', studentToolCopy('student_tools_copy_54', uiLocale)],
        ['skills', studentToolCopy('student_tools_copy_55', uiLocale)],
      ],
    },
    {
      title: studentToolCopy('student_tools_copy_56', uiLocale),
      fields: [
        ['whyField', studentToolCopy('student_tools_copy_57', uiLocale)],
        ['whyProgram', studentToolCopy('student_tools_copy_58', uiLocale)],
        ['careerGoals', studentToolCopy('student_tools_copy_59', uiLocale)],
        ['contribution', studentToolCopy('student_tools_copy_60', uiLocale)],
      ],
    },
    { title: studentToolCopy('student_tools_copy_61', uiLocale), fields: [] },
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
      fail(studentToolCopy('student_tools_copy_62', uiLocale));
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
      outputPreferences: { language: locale, targetWords: form.targetWords, tone: 'FORMAL' },
    });
  };
  return (
    <Shell
      title={studentToolCopy('student_tools_copy_63', uiLocale)}
      description={studentToolCopy('student_tools_copy_64', uiLocale)}
    >
      <label className="block mb-4">
        <input
          type="checkbox"
          checked={privacyConsent}
          onChange={(event) => setPrivacyConsent(event.target.checked)}
        />
        {studentToolCopy('student_tools_private_consent', uiLocale)}
      </label>
      <form onSubmit={submit}>
        <fieldset
          disabled={run.loading}
          className="min-w-0 grid gap-5 rounded-3xl border bg-[var(--ab-surface)] p-6 sm:grid-cols-2"
        >
          <div className="sm:col-span-2 rounded-2xl border border-[var(--ab-warning-border)] bg-[var(--ab-warning-soft)] p-4 text-sm leading-7 text-[var(--ab-warning-text)]">
            {studentToolCopy('student_tools_copy_65', uiLocale)}
          </div>
          <ol
            className="sm:col-span-2 grid grid-cols-2 gap-2 sm:grid-cols-4"
            aria-label={studentToolCopy('student_tools_copy_66', uiLocale)}
          >
            {steps.map((item, index) => (
              <li
                key={item.title}
                className={`rounded-xl px-3 py-2 text-center text-xs font-bold ${index === step ? 'bg-[var(--ab-primary)] text-white' : index < step ? 'bg-[var(--ab-info-soft)] text-[var(--ab-secondary)]' : 'bg-[var(--ab-surface-muted)] text-[var(--ab-text-muted)]'}`}
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
              <div className="sm:col-span-2 rounded-2xl bg-[var(--ab-surface-muted)] p-4 text-sm leading-7 text-[var(--ab-text)]">
                {studentToolCopy('student_tools_copy_67', uiLocale)}
              </div>
              <Field label={studentToolCopy('student_tools_copy_68', uiLocale)}>
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
              {studentToolCopy('student_tools_copy_69', uiLocale)}
            </button>
            {step < steps.length - 1 ? (
              <button
                type="button"
                onClick={(event) => {
                  if (event.currentTarget.form?.reportValidity()) setStep((value) => value + 1);
                }}
                className="rounded-xl bg-[var(--ab-primary)] px-5 py-2 font-bold text-white"
              >
                {studentToolCopy('student_tools_copy_70', uiLocale)}
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
  const { language: uiLocale } = useTranslation();
  const [countries, setCountries] = useState('');
  const [degree, setDegree] = useState('');
  const [funding, setFunding] = useState('ANY');
  const [language, setLanguage] = useState('');
  const { run, execute, privacyConsent, setPrivacyConsent } = useToolRun(
    'scholarship-recommendation',
  );
  const [useProfile, setUseProfile] = useState(false);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void execute({
      allowAI: privacyConsent,
      useProfile,
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
      title={studentToolCopy('student_tools_copy_71', uiLocale)}
      description={studentToolCopy('student_tools_copy_72', uiLocale)}
    >
      <label className="block mb-3">
        <input
          type="checkbox"
          checked={privacyConsent}
          onChange={(e) => setPrivacyConsent(e.target.checked)}
        />
        {studentToolCopy('student_tools_section19_6', uiLocale)}
      </label>
      <label className="block mb-3">
        <input
          type="checkbox"
          checked={useProfile}
          disabled={!privacyConsent}
          onChange={(e) => setUseProfile(e.target.checked)}
        />
        {studentToolCopy('student_tools_section19_5', uiLocale)}
      </label>
      <form onSubmit={submit}>
        <fieldset
          disabled={run.loading}
          className="min-w-0 grid gap-5 rounded-3xl border bg-[var(--ab-surface)] p-6 sm:grid-cols-2"
        >
          <Field label={studentToolCopy('student_tools_copy_73', uiLocale)}>
            <input
              className={inputClass}
              value={countries}
              onChange={(e) => setCountries(e.target.value)}
              placeholder={studentToolCopy('student_tools_copy_74', uiLocale)}
            />
          </Field>
          <Field label={studentToolCopy('student_tools_copy_75', uiLocale)}>
            <select
              className={inputClass}
              value={degree}
              onChange={(e) => setDegree(e.target.value)}
            >
              <option value="">{studentToolCopy('student_tools_copy_76', uiLocale)}</option>
              <option value="BACHELOR">{studentToolCopy('student_tools_copy_77', uiLocale)}</option>
              <option value="MASTER">{studentToolCopy('student_tools_copy_78', uiLocale)}</option>
              <option value="DOCTORATE">
                {studentToolCopy('student_tools_copy_79', uiLocale)}
              </option>
            </select>
          </Field>
          <Field label={studentToolCopy('student_tools_copy_80', uiLocale)}>
            <select
              className={inputClass}
              value={funding}
              onChange={(e) => setFunding(e.target.value)}
            >
              <option value="ANY">{studentToolCopy('student_tools_copy_81', uiLocale)}</option>
              <option value="FULL">{studentToolCopy('student_tools_copy_82', uiLocale)}</option>
              <option value="PARTIAL">{studentToolCopy('student_tools_copy_83', uiLocale)}</option>
            </select>
          </Field>
          <Field label={studentToolCopy('student_tools_copy_84', uiLocale)}>
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
function translateError(code: string, uiLocale: 'ar' | 'en' = 'ar') {
  const labels: Record<string, string> = {
    TOOL_EXECUTION_BLOCKED:
      studentToolCopy('student_tools_section19_4', uiLocale),
    TOOL_AI_UNKNOWN_OUTCOME:
      studentToolCopy('student_tools_section19_3', uiLocale),
    TOOL_PRIVACY_CONSENT_REQUIRED:
      studentToolCopy('student_tools_section19_2', uiLocale),
    TOOL_IDEMPOTENT_RESULT_EXPIRED:
      studentToolCopy('student_tools_section19_1', uiLocale),

    TOOL_LOCALE_NOT_ALLOWED: studentToolCopy('student_tools_copy_85', uiLocale),
    TOOL_NOT_FOUND: studentToolCopy('student_tools_copy_86', uiLocale),
    TOOL_EXECUTION_NOT_FOUND: studentToolCopy('student_tools_copy_87', uiLocale),
    TOOL_ANONYMOUS_SESSION_REQUIRED: studentToolCopy('student_tools_copy_88', uiLocale),
    TOOL_RESULT_EXPIRED: studentToolCopy('student_tools_copy_89', uiLocale),
    TOOL_SAVE_NOT_CONFIGURED: studentToolCopy('student_tools_copy_90', uiLocale),
    TOOL_SAVE_FAILED: studentToolCopy('student_tools_copy_91', uiLocale),
    TOOL_ACCESS_DENIED: studentToolCopy('student_tools_copy_92', uiLocale),
    TOOL_EXECUTION_RUNNING: studentToolCopy('student_tools_copy_93', uiLocale),
    TOOL_EXECUTION_FAILED: studentToolCopy('student_tools_copy_94', uiLocale),
    STUDENT_TOOL_QUOTA_STORE_UNAVAILABLE: studentToolCopy('student_tools_copy_95', uiLocale),
    SCHOLARSHIP_COUNTRY_REFERENCE_NOT_ACTIVE: studentToolCopy('student_tools_copy_96', uiLocale),
    SCHOLARSHIP_LANGUAGE_REFERENCE_NOT_ACTIVE: studentToolCopy('student_tools_copy_97', uiLocale),
    SCHOLARSHIP_DEGREE_REFERENCE_NOT_ACTIVE: studentToolCopy('student_tools_copy_98', uiLocale),
    TOOL_AUTH_REQUIRED: studentToolCopy('student_tools_copy_6', uiLocale),
    TOOL_AI_CAPABILITY_UNAVAILABLE: studentToolCopy('student_tools_copy_99', uiLocale),
    TOOL_RATE_LIMITED: studentToolCopy('student_tools_copy_100', uiLocale),
    TOOL_INPUT_INVALID: studentToolCopy('student_tools_copy_101', uiLocale),
    TOOL_IDEMPOTENCY_KEY_REUSED: studentToolCopy('student_tools_copy_102', uiLocale),
    TOOL_RESULT_PROTECTION_NOT_CONFIGURED: studentToolCopy('student_tools_copy_103', uiLocale),
  };
  return (
    labels[code.split(':')[0]] ??
    (studentToolCopy('student_tools_section19_0', uiLocale))
  );
}
