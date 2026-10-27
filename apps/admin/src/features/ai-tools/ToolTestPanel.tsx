import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { adminApiClient, createAdminIdempotencyKey } from '../../api/client';
import { useAdminAuthorization } from '../../security/AdminAuthorizationContext';
import { useWorkspaceCopy, WorkspacePanel } from './Workspace';
import { toolLabel, type Tool } from './studentToolModel';
import { toolTestInput } from './toolTestInput';

type Input = Record<string, unknown>;
export function ToolTestPanel({ tool, onBusy }: { tool: Tool; onBusy?: (busy: boolean) => void }) {
  const { c, language } = useWorkspaceCopy();
  const { hasPermission } = useAdminAuthorization();
  const [input, setInput] = useState<Input>({});
  const [approved, setApproved] = useState(false),
    [costApproved, setCostApproved] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [receipt, setReceipt] = useState<Record<string, unknown> | null>(null);
  const lock = useRef(false),
    intent = useRef<{ fingerprint: string; key: string } | null>(null);
  const [uncertain, setUncertain] = useState(false);
  useEffect(() => {
    onBusy?.(busy);
    return () => onBusy?.(false);
  }, [busy, onBusy]);
  const ai =
    tool.executionType === 'AI_DELEGATED' ||
    (tool.executionType === 'HYBRID' && input.allowAI === true);
  const unresolved = receipt?.status === 'UNKNOWN_OUTCOME' || receipt?.status === 'RUNNING';
  const set = (key: string, value: unknown) => {
    setInput((previous) => ({ ...previous, [key]: value }));
    setReceipt(null);
    setError('');
  };
  const run = async (event: FormEvent) => {
    event.preventDefault();
    if (lock.current || !approved || unresolved || !hasPermission('admin:student-tools:run-test'))
      return;
    if (
      ai &&
      (!costApproved ||
        !window.confirm(
          c(
            'تشغيل فعلي قد يستهلك رصيدًا وفق ميزانية AI. متابعة؟',
            'This real execution may incur AI costs within its budget. Continue?',
          ),
        ))
    )
      return;
    lock.current = true;
    setBusy(true);
    setError('');
    const body =
      uncertain && intent.current
        ? intent.current.fingerprint
        : JSON.stringify({
            input: toolTestInput(tool.toolKey, input, language),
            locale: language,
            costApproved: ai && costApproved,
            privacyConsent: ai && costApproved,
            fixturePolicy: 'SYNTHETIC_ONLY',
          });
    if (intent.current?.fingerprint !== body)
      intent.current = { fingerprint: body, key: createAdminIdempotencyKey() };
    try {
      const response = await adminApiClient.request<{ data: Record<string, unknown> }>(
        `/admin/student-tools/${encodeURIComponent(tool.toolKey)}/test`,
        {
          method: 'POST',
          idempotencyKey: intent.current.key,
          headers: { 'Idempotency-Key': intent.current.key },
          body,
        },
      );
      setReceipt(response.data);
      setUncertain(false);
      if (['COMPLETED', 'BLOCKED', 'FAILED', 'CANCELLED'].includes(String(response.data.status)))
        intent.current = null;
    } catch {
      setUncertain(true);
      setError(
        c(
          'تعذر تأكيد نتيجة الطلب. عند إعادة الطلب نفسه سيُستخدم مرجع العملية نفسه لمنع التكرار.',
          'The request outcome could not be confirmed. Retrying identical input reuses its idempotency key.',
        ),
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  if (tool.implementationStatus !== 'IMPLEMENTED')
    return (
      <WorkspacePanel title={c('الاختبار والجودة', 'Testing and quality')}>
        <p>
          {c(
            'هذه الأداة ضمن خطة التطوير؛ لا يوجد تشغيل تجريبي متاح لها.',
            'This tool is planned; no executable test handler is available.',
          )}
        </p>
      </WorkspacePanel>
    );
  return (
    <WorkspacePanel title={c('اختبار الأداة', 'Test tool')}>
      <p className="certificate-notice">
        {c(
          'استخدم بيانات مصطنعة فقط. هذا تشغيل حقيقي للمعالج، وليس معاينة شكلية، ويُسجل منفصلًا عن استخدام الطلاب.',
          'Use synthetic data only. This executes the real handler and is recorded separately from student traffic.',
        )}
      </p>
      <form className="ai-form" onSubmit={run}>
        <fieldset
          disabled={
            busy || uncertain || !hasPermission('admin:student-tools:run-test') || unresolved
          }
        >
          <ToolInputFields toolKey={tool.toolKey} input={input} set={set} />
          <label className="ai-check">
            <input
              type="checkbox"
              checked={approved}
              onChange={(event) => setApproved(event.target.checked)}
            />
            {c(
              'أؤكد أن جميع المدخلات مصطنعة ولا تخص طالبًا حقيقيًا.',
              'I confirm all inputs are synthetic and contain no real student data.',
            )}
          </label>
          {ai && (
            <label className="ai-check">
              <input
                type="checkbox"
                checked={costApproved}
                onChange={(event) => setCostApproved(event.target.checked)}
              />
              {c(
                'أوافق على تكلفة تجربة AI وعلى سياسة البيانات المطبقة.',
                'I approve this AI test cost and its data policy.',
              )}
            </label>
          )}
          <button
            className="certificate-primary"
            disabled={!approved || (ai && !costApproved)}
            type="submit"
          >
            {busy ? c('جارٍ التنفيذ…', 'Running…') : c('تشغيل الاختبار', 'Run test')}
          </button>
        </fieldset>
        {uncertain && (
          <button type="submit" disabled={busy || !hasPermission('admin:student-tools:run-test')}>
            {c('التحقق بإعادة الطلب نفسه بأمان', 'Retry the identical request safely')}
          </button>
        )}
      </form>
      {error && (
        <p role="alert" className="certificate-notice certificate-error">
          {error}
        </p>
      )}
      {receipt && (
        <div role="status" className="ai-form">
          <strong>{toolLabel(String(receipt.status ?? ''), language)}</strong>
          <small>{String(receipt.executionId ?? '')}</small>
          {receipt.result != null && <StructuredToolResult value={receipt.result} />}
          {unresolved && (
            <p>
              {c(
                'تحقق من حالة العملية في سجل التنفيذ قبل أي محاولة جديدة.',
                'Check the execution log before starting another attempt.',
              )}
            </p>
          )}
          <Link
            className="certificate-link"
            to={`/student-tools/${encodeURIComponent(tool.toolKey)}?tab=executions`}
          >
            {c('فتح سجل التنفيذ', 'Open execution log')}
          </Link>
        </div>
      )}
    </WorkspacePanel>
  );
}
function ToolInputFields({
  toolKey,
  input,
  set,
}: {
  toolKey: string;
  input: Input;
  set: (key: string, value: unknown) => void;
}) {
  const { c } = useWorkspaceCopy();
  const text = (
    key: string,
    ar: string,
    en: string,
    options: {
      number?: boolean;
      required?: boolean;
      min?: number;
      max?: number;
      lines?: boolean;
    } = {},
  ) => (
    <label key={key}>
      {c(ar, en)}
      {options.lines ? (
        <textarea
          value={Array.isArray(input[key]) ? (input[key] as string[]).join('\n') : ''}
          onChange={(event) => set(key, event.target.value.split('\n').filter(Boolean))}
        />
      ) : (
        <input
          type={options.number ? 'number' : 'text'}
          required={options.required}
          min={options.min}
          max={options.max}
          step={options.number ? 'any' : undefined}
          value={
            typeof input[key] === 'string' || typeof input[key] === 'number'
              ? (input[key] as string | number)
              : ''
          }
          onChange={(event) =>
            set(
              key,
              options.number
                ? event.target.value === ''
                  ? undefined
                  : Number(event.target.value)
                : event.target.value,
            )
          }
        />
      )}
    </label>
  );
  if (toolKey === 'gpa-calculator') {
    const courses = Array.isArray(input.courses)
      ? (input.courses as Array<{ label: string; creditHours: number; gradePoints: number }>)
      : [];
    return (
      <>
        {text('scale', 'سلم المعدل', 'GPA scale', {
          number: true,
          required: true,
          min: 1,
          max: 10,
        })}
        {text(
          'existingCumulativeGpa',
          'المعدل التراكمي الحالي — اختياري مع الساعات',
          'Current cumulative GPA — paired with credits',
          { number: true, min: 0 },
        )}
        {text(
          'existingCompletedCredits',
          'الساعات المكتملة — اختياري مع المعدل',
          'Completed credits — paired with GPA',
          { number: true, min: 0 },
        )}
        <fieldset>
          <legend>{c('المقررات — مقرر واحد على الأقل', 'Courses — at least one')}</legend>
          {courses.map((course, index) => (
            <div className="certificate-form" key={index}>
              {(['label', 'creditHours', 'gradePoints'] as const).map((key, position) => (
                <label key={key}>
                  {c(
                    ['اسم المقرر', 'الساعات', 'نقاط التقدير'][position],
                    ['Course label', 'Credits', 'Grade points'][position],
                  )}
                  <input
                    type={key === 'label' ? 'text' : 'number'}
                    required
                    min={key === 'creditHours' ? 0.01 : 0}
                    max={key === 'gradePoints' ? Number(input.scale ?? 10) : undefined}
                    step="any"
                    value={course[key]}
                    onChange={(event) =>
                      set(
                        'courses',
                        courses.map((item, i) =>
                          i === index
                            ? {
                                ...item,
                                [key]:
                                  key === 'label' ? event.target.value : Number(event.target.value),
                              }
                            : item,
                        ),
                      )
                    }
                  />
                </label>
              ))}
              <button
                type="button"
                onClick={() =>
                  set(
                    'courses',
                    courses.filter((_, i) => i !== index),
                  )
                }
              >
                {c('حذف المقرر', 'Remove course')}
              </button>
            </div>
          ))}
          <button
            type="button"
            disabled={courses.length >= 50}
            onClick={() =>
              set('courses', [...courses, { label: '', creditHours: 3, gradePoints: 0 }])
            }
          >
            {c('إضافة مقرر', 'Add course')}
          </button>
        </fieldset>
      </>
    );
  }
  if (toolKey === 'university-comparison')
    return (
      <>
        {text(
          'universityIds',
          'معرفات الجامعات المنشورة — معرف في كل سطر، من 2 إلى 4',
          'Published university IDs — one per line, 2 to 4',
          { lines: true },
        )}
        <label className="ai-check">
          <input
            type="checkbox"
            checked={input.hideUnavailableRows === true}
            onChange={(event) => set('hideUnavailableRows', event.target.checked)}
          />
          {c('إخفاء الصفوف غير المتاحة', 'Hide unavailable rows')}
        </label>
      </>
    );
  if (toolKey === 'scholarship-recommendation')
    return (
      <>
        {text('targetDegree', 'الدرجة المستهدفة', 'Target degree')}
        {text('studyField', 'مجال الدراسة', 'Study field')}
        {text(
          'preferredCountries',
          'الدول المفضلة — دولة في كل سطر',
          'Preferred countries — one per line',
          { lines: true },
        )}
        {text('academicInterests', 'الاهتمامات — اهتمام في كل سطر', 'Interests — one per line', {
          lines: true,
        })}
        {text('careerGoals', 'الأهداف المهنية', 'Career goals')}
        {text('studyLanguage', 'لغة الدراسة', 'Study language')}
        {text('targetYear', 'السنة المستهدفة', 'Target year', {
          number: true,
          min: 2020,
          max: 2100,
        })}
        <label>
          {c('التمويل', 'Funding')}
          <select
            value={String(input.fundingPreference ?? 'ANY')}
            onChange={(event) => set('fundingPreference', event.target.value)}
          >
            <option value="ANY">{c('أي تمويل', 'Any')}</option>
            <option value="FULL">{c('كامل', 'Full')}</option>
            <option value="PARTIAL">{c('جزئي', 'Partial')}</option>
          </select>
        </label>
        <label className="ai-check">
          <input
            type="checkbox"
            checked={input.allowAI === true}
            onChange={(event) => set('allowAI', event.target.checked)}
          />
          {c('طلب ترتيب استشاري بالذكاء الاصطناعي — اختياري', 'Request optional AI ranking')}
        </label>
        <small>
          {c(
            'الاختبار لا يستخدم ملف طالب حقيقي. البديل القائم على القواعد يبقى متاحًا وفق الاعتماديات.',
            'Tests do not read a real student profile. Rule-based fallback depends on available canonical data.',
          )}
        </small>
      </>
    );
  if (toolKey === 'motivation-letter-generator')
    return (
      <>
        <NestedFields
          name="target"
          ar="البرنامج المستهدف"
          en="Target program"
          input={input}
          set={set}
          fields={[
            ['program', 'البرنامج', 'Program'],
            ['degreeLevel', 'الدرجة', 'Degree'],
            ['applicationType', 'نوع التقديم', 'Application type'],
            ['country', 'الدولة — اختياري', 'Country — optional'],
          ]}
        />
        <NestedFields
          name="studentBackground"
          ar="خلفية مصطنعة للاختبار"
          en="Synthetic test background"
          input={input}
          set={set}
          fields={[
            ['education', 'التعليم — عشرة أحرف على الأقل', 'Education — at least 10 characters'],
            ['academicInterests', 'الاهتمامات', 'Academic interests', 'lines'],
            ['experiences', 'الخبرات', 'Experiences', 'lines'],
            ['achievements', 'الإنجازات', 'Achievements', 'lines'],
            ['skills', 'المهارات', 'Skills', 'lines'],
          ]}
        />
        <NestedFields
          name="motivation"
          ar="الدوافع والأهداف"
          en="Motivation and goals"
          input={input}
          set={set}
          fields={[
            ['whyField', 'سبب اختيار المجال', 'Why this field'],
            ['whyProgram', 'سبب اختيار البرنامج', 'Why this program'],
            ['careerGoals', 'الأهداف المهنية', 'Career goals'],
            ['contribution', 'المساهمة المتوقعة', 'Contribution'],
            ['emphasizedExperiences', 'الخبرات المراد إبرازها', 'Highlighted experiences', 'lines'],
          ]}
        />
        <fieldset>
          <legend>{c('تفضيلات المسودة', 'Output preferences')}</legend>
          <label>
            {c('اللغة', 'Language')}
            <select
              value={String((input.outputPreferences as Input)?.language ?? '')}
              onChange={(event) =>
                set('outputPreferences', {
                  ...(input.outputPreferences as Input),
                  tone: 'FORMAL',
                  language: event.target.value,
                })
              }
            >
              <option value="">{c('اختر اللغة', 'Select language')}</option>
              <option value="ar">العربية</option>
              <option value="en">English</option>
            </select>
          </label>
          <label>
            {c('عدد الكلمات — من 250 إلى 1200', 'Target words — 250 to 1200')}
            <input
              type="number"
              required
              min={250}
              max={1200}
              value={Number((input.outputPreferences as Input)?.targetWords ?? 500)}
              onChange={(event) =>
                set('outputPreferences', {
                  ...(input.outputPreferences as Input),
                  tone: 'FORMAL',
                  targetWords: Number(event.target.value),
                })
              }
            />
          </label>
          <p>{c('النبرة المعتمدة: رسمية.', 'Supported tone: formal.')}</p>
        </fieldset>
      </>
    );
  return (
    <p>
      {c('لا يوجد نموذج اختبار معتمد لهذه الأداة.', 'No approved test form exists for this tool.')}
    </p>
  );
}
function NestedFields({
  name,
  ar,
  en,
  fields,
  input,
  set,
}: {
  name: string;
  ar: string;
  en: string;
  fields: Array<[string, string, string, 'lines'?]>;
  input: Input;
  set: (key: string, value: unknown) => void;
}) {
  const { c } = useWorkspaceCopy();
  const value = (input[name] as Input) ?? {};
  return (
    <fieldset>
      <legend>{c(ar, en)}</legend>
      {fields.map(([key, arLabel, enLabel, type]) => (
        <label key={key}>
          {c(arLabel, enLabel)}
          {type === 'lines' ? (
            <textarea
              value={Array.isArray(value[key]) ? (value[key] as string[]).join('\n') : ''}
              onChange={(event) =>
                set(name, { ...value, [key]: event.target.value.split('\n').filter(Boolean) })
              }
            />
          ) : (
            <textarea
              value={String(value[key] ?? '')}
              onChange={(event) => set(name, { ...value, [key]: event.target.value })}
            />
          )}
        </label>
      ))}
    </fieldset>
  );
}
export function StructuredToolResult({ value }: { value: unknown }) {
  if (value == null) return null;
  if (typeof value !== 'object') return <p>{String(value)}</p>;
  if (Array.isArray(value))
    return (
      <div className="ai-form">
        {value.slice(0, 50).map((item, index) => (
          <div className="ai-dependency" key={index}>
            <StructuredToolResult value={item} />
          </div>
        ))}
      </div>
    );
  return (
    <dl className="ai-definition">
      {Object.entries(value as Input).map(([key, child]) => (
        <div key={key}>
          <dt>{key}</dt>
          <dd>
            <StructuredToolResult value={child} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
