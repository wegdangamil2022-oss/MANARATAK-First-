import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileQuestion, Pencil, Trash2, Plus } from 'lucide-react';
import {
  CourseQuestionType,
  type CourseCurriculumSnapshotDto,
  type CourseQuestionDto,
} from '@manaratak/domain';
import type { NativeCourseCommand } from './NativeCourseCurriculumPanel';
import { useCourseCopy } from './useCourseCopy';

export function NativeAssessmentAuthoring({
  snapshot,
  busy,
  readonly,
  command,
  onDirty,
}: {
  snapshot: CourseCurriculumSnapshotDto;
  busy: boolean;
  readonly: boolean;
  command: NativeCourseCommand;
  onDirty: (value: boolean) => void;
}) {
  const { tr } = useCourseCopy(),
    [params, setParams] = useSearchParams();
  const quizzes = snapshot.quizzes.filter((row) => row.status !== 'ARCHIVED');
  const quizId = quizzes.some((row) => row.id === params.get('assessment'))
    ? params.get('assessment')!
    : (quizzes[0]?.id ?? '');
  const [dirty, setDirty] = useState(false),
    [error, setError] = useState('');
  const [editingQuiz, setEditingQuiz] = useState(''),
    [title, setTitle] = useState(''),
    [location, setLocation] = useState(''),
    [instructions, setInstructions] = useState(''),
    [assessmentType, setAssessmentType] = useState('QUIZ'),
    [passingScore, setPassingScore] = useState('70'),
    [attempts, setAttempts] = useState('3');
  const [editingQuestion, setEditingQuestion] = useState(''),
    [questionType, setQuestionType] = useState<CourseQuestionType>(
      CourseQuestionType.MULTIPLE_CHOICE,
    ),
    [prompt, setPrompt] = useState(''),
    [choices, setChoices] = useState(''),
    [answer, setAnswer] = useState(''),
    [points, setPoints] = useState('1'),
    [rubric, setRubric] = useState('');
  const change = () => {
    setDirty(true);
    onDirty(true);
    setError('');
  };
  const discard = () =>
    !dirty ||
    window.confirm(tr('تجاهل مدخلات التقييم غير المحفوظة؟', 'Discard unsaved assessment inputs?'));
  const select = (id: string) =>
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        next.set('assessment', id);
        return next;
      },
      { replace: true },
    );
  const resetQuestion = () => {
    setEditingQuestion('');
    setQuestionType(CourseQuestionType.MULTIPLE_CHOICE);
    setPrompt('');
    setChoices('');
    setAnswer('');
    setPoints('1');
    setRubric('');
  };
  const types = {
    MULTIPLE_CHOICE: tr('متعدد الخيارات', 'Multiple choice'),
    TRUE_FALSE: tr('صح / خطأ', 'True / false'),
    SHORT_ANSWER: tr('إجابة قصيرة — تصحيح يدوي', 'Short answer — manual grading'),
    ESSAY: tr('مقالي — تصحيح يدوي', 'Essay — manual grading'),
  };
  const editQuestion = (row: CourseQuestionDto) => {
    if (!discard()) return;
    if (
      row.questionType === 'MULTIPLE_CHOICE' &&
      (!Array.isArray(row.choices) || !row.choices.every((value) => typeof value === 'string'))
    ) {
      setError(
        tr(
          'صيغة خيارات قديمة متقدمة؛ استخدم أدوات الإدارة الحالية للحفاظ على بياناتها.',
          'Advanced legacy choice format; use existing administration tools to preserve it.',
        ),
      );
      return;
    }
    setEditingQuestion(row.id);
    setQuestionType(row.questionType);
    setPrompt(row.prompt);
    setChoices(Array.isArray(row.choices) ? row.choices.join('\n') : '');
    setAnswer(row.correctAnswer == null ? '' : String(row.correctAnswer));
    setPoints(String(row.points));
    setRubric(row.explanation ?? '');
    setDirty(false);
    onDirty(false);
  };
  return (
    <section className="course-panel native-assessments">
      <h2>
        <FileQuestion size={18} />
        {tr('بناء التقييمات والواجبات', 'Assessments and assignments')}
      </h2>
      <p className="course-hint">
        {tr(
          'اختبارات المحاضرة والوحدة والدورة اختيارية. الإجابة القصيرة والمقال والواجب تنتظر التصحيح البشري؛ لا تُعتمد درجة أو شهادة بمجرد إرسالها.',
          'Lecture, module and course assessments are optional. Written answers and assignments require human grading; submission does not establish a passing grade or certificate.',
        )}
      </p>
      {error && (
        <p className="course-error" role="alert">
          {error}
        </p>
      )}
      <fieldset disabled={readonly || busy}>
        <form
          className="course-section-form"
          onSubmit={(event) => {
            event.preventDefault();
            const lesson = snapshot.lessons.find((row) => row.id === location),
              moduleId =
                lesson?.moduleId ?? (location.startsWith('module:') ? location.slice(7) : null);
            const body = {
              title,
              instructions,
              assessmentType,
              moduleId,
              lessonId: lesson?.id ?? null,
              passingScore: Number(passingScore),
              maxAttempts: attempts ? Number(attempts) : null,
              ...(!editingQuiz
                ? { position: Math.max(0, ...snapshot.quizzes.map((row) => row.position)) + 1 }
                : {}),
            };
            const payload = editingQuiz
              ? body
              : { ...body, moduleId: moduleId ?? undefined, lessonId: lesson?.id };
            void command(
              editingQuiz ? `quizzes/${editingQuiz}` : 'quizzes',
              payload,
              editingQuiz ? 'PATCH' : 'POST',
            )
              .then((result) => {
                if (
                  result &&
                  typeof result === 'object' &&
                  'id' in result &&
                  typeof result.id === 'string'
                )
                  select(result.id);
              })
              .catch(() => undefined);
          }}
        >
          <h3>
            {editingQuiz
              ? tr('تعديل التقييم', 'Edit assessment')
              : tr('تقييم جديد', 'New assessment')}
          </h3>
          <label className="course-field">
            <span>{tr('عنوان الاختبار', 'Assessment title')}</span>
            <input
              required
              maxLength={500}
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                change();
              }}
            />
          </label>
          <label className="course-field">
            <span>{tr('نوع التقييم', 'Assessment type')}</span>
            <select
              aria-label={tr('نوع التقييم', 'Assessment type')}
              value={assessmentType}
              onChange={(event) => {
                setAssessmentType(event.target.value);
                change();
              }}
            >
              <option value="QUIZ">{tr('اختبار', 'Quiz')}</option>
              <option value="ASSIGNMENT">{tr('واجب كتابي', 'Written assignment')}</option>
            </select>
          </label>
          <label className="course-field">
            <span>{tr('موضع الاختبار', 'Assessment location')}</span>
            <select
              aria-label={tr('موضع الاختبار', 'Assessment location')}
              value={location}
              onChange={(event) => {
                setLocation(event.target.value);
                change();
              }}
            >
              <option value="">{tr('ختامي للدورة', 'Course final')}</option>
              <optgroup label={tr('الوحدات', 'Modules')}>
                {snapshot.modules
                  .filter((row) => row.status !== 'ARCHIVED')
                  .map((row) => (
                    <option key={row.id} value={'module:' + row.id}>
                      {row.title}
                    </option>
                  ))}
              </optgroup>
              <optgroup label={tr('المحاضرات', 'Lectures')}>
                {snapshot.lessons
                  .filter(
                    (row) =>
                      row.status !== 'ARCHIVED' &&
                      snapshot.modules.some(
                        (module) => module.id === row.moduleId && module.status !== 'ARCHIVED',
                      ),
                  )
                  .map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.title}
                    </option>
                  ))}
              </optgroup>
            </select>
          </label>
          <label className="course-field">
            <span>{tr('تعليمات التقييم', 'Assessment instructions')}</span>
            <textarea
              value={instructions}
              onChange={(event) => {
                setInstructions(event.target.value);
                change();
              }}
            />
          </label>
          <label className="course-field">
            <span>{tr('درجة النجاح %', 'Passing score %')}</span>
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              required
              value={passingScore}
              onChange={(event) => {
                setPassingScore(event.target.value);
                change();
              }}
            />
          </label>
          <label className="course-field">
            <span>{tr('حد المحاولات — فارغ دون حد', 'Attempt limit — blank for unlimited')}</span>
            <input
              type="number"
              min={1}
              step={1}
              value={attempts}
              onChange={(event) => {
                setAttempts(event.target.value);
                change();
              }}
            />
          </label>
          <button type="submit">
            {editingQuiz
              ? tr('حفظ التقييم', 'Save assessment')
              : tr('إضافة الاختبار', 'Add assessment')}
          </button>
          {editingQuiz && (
            <button
              type="button"
              onClick={() => {
                if (!discard()) return;
                setEditingQuiz('');
                setTitle('');
                setInstructions('');
                setLocation('');
                setDirty(false);
                onDirty(false);
              }}
            >
              {tr('إلغاء تعديل التقييم', 'Cancel assessment edit')}
            </button>
          )}
        </form>
        <div className="course-table-scroll">
          <table className="course-table">
            <thead>
              <tr>
                <th>{tr('التقييم', 'Assessment')}</th>
                <th>{tr('الموضع والنوع', 'Location and type')}</th>
                <th>{tr('الإجراءات', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {quizzes.map((row) => (
                <tr key={row.id}>
                  <td>{row.title}</td>
                  <td>
                    {row.lessonId
                      ? snapshot.lessons.find((lesson) => lesson.id === row.lessonId)?.title
                      : row.moduleId
                        ? snapshot.modules.find((module) => module.id === row.moduleId)?.title
                        : tr('الدورة', 'Course')}{' '}
                    ·{' '}
                    {row.assessmentType === 'ASSIGNMENT'
                      ? tr('واجب', 'Assignment')
                      : tr('اختبار', 'Quiz')}
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => {
                        if (!discard()) return;
                        setEditingQuiz(row.id);
                        setTitle(row.title);
                        setInstructions(row.instructions ?? '');
                        setLocation(row.lessonId ?? (row.moduleId ? 'module:' + row.moduleId : ''));
                        setAssessmentType(row.assessmentType ?? 'QUIZ');
                        setPassingScore(String(row.passingScore ?? 70));
                        setAttempts(row.maxAttempts == null ? '' : String(row.maxAttempts));
                        setDirty(false);
                        onDirty(false);
                      }}
                    >
                      <Pencil size={15} />
                      {tr('تعديل التقييم', 'Edit assessment')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          discard() &&
                          window.confirm(
                            tr(
                              'أرشفة التقييم من المسودة؟ تُحفظ النسخ والمحاولات التاريخية، ويُرفض إذا كانت كتلة نشطة تشير إليه.',
                              'Archive this draft assessment? Historical versions and attempts remain; active block references prevent archiving.',
                            ),
                          )
                        )
                          void command(`quizzes/${row.id}`, {}, 'DELETE').catch(() => undefined);
                      }}
                    >
                      <Trash2 size={15} />
                      {tr('أرشفة', 'Archive')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form
          className="course-section-form"
          onSubmit={(event) => {
            event.preventDefault();
            const options = choices
              .split('\n')
              .map((value) => value.trim())
              .filter(Boolean);
            if (
              questionType === CourseQuestionType.MULTIPLE_CHOICE &&
              (options.length < 2 ||
                options.length !== new Set(options).size ||
                !options.includes(answer))
            ) {
              setError(
                tr(
                  'أدخل خيارين مختلفين على الأقل وإجابة صحيحة منهما.',
                  'Enter at least two distinct choices and select their correct answer.',
                ),
              );
              return;
            }
            const body = {
              quizId,
              questionType,
              prompt,
              points: Number(points),
              explanation: rubric || null,
              ...(questionType === CourseQuestionType.MULTIPLE_CHOICE
                ? { choices: options, correctAnswer: answer }
                : questionType === CourseQuestionType.TRUE_FALSE
                  ? { choices: null, correctAnswer: answer === 'true' }
                  : { choices: null, correctAnswer: null }),
              ...(!editingQuestion
                ? {
                    position:
                      Math.max(
                        0,
                        ...snapshot.questions
                          .filter((row) => row.quizId === quizId)
                          .map((row) => row.position),
                      ) + 1,
                  }
                : {}),
            };
            void command(
              editingQuestion ? `questions/${editingQuestion}` : 'questions',
              body,
              editingQuestion ? 'PATCH' : 'POST',
            ).catch(() => undefined);
          }}
        >
          <h3>
            {editingQuestion
              ? tr('تعديل السؤال', 'Edit question')
              : tr('سؤال جديد', 'New question')}
          </h3>
          <label className="course-field">
            <span>{tr('الاختبار', 'Assessment')}</span>
            <select
              aria-label={tr('الاختبار', 'Assessment')}
              required
              value={quizId}
              onChange={(event) => {
                if (discard()) {
                  select(event.target.value);
                  resetQuestion();
                  setDirty(false);
                  onDirty(false);
                }
              }}
            >
              <option value="">{tr('اختر اختبارًا', 'Choose assessment')}</option>
              {quizzes.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.title}
                </option>
              ))}
            </select>
          </label>
          <label className="course-field">
            <span>{tr('نوع السؤال', 'Question type')}</span>
            <select
              aria-label={tr('نوع السؤال', 'Question type')}
              value={questionType}
              onChange={(event) => {
                setQuestionType(event.target.value as CourseQuestionType);
                setAnswer('');
                change();
              }}
            >
              {Object.entries(types).map(([value, title]) => (
                <option key={value} value={value}>
                  {title}
                </option>
              ))}
            </select>
          </label>
          <label className="course-field">
            <span>{tr('السؤال', 'Question')}</span>
            <textarea
              aria-label={tr('السؤال', 'Question')}
              required
              value={prompt}
              onChange={(event) => {
                setPrompt(event.target.value);
                change();
              }}
            />
          </label>
          {questionType === CourseQuestionType.MULTIPLE_CHOICE && (
            <label className="course-field">
              <span>{tr('الخيارات — خيار لكل سطر', 'Choices — one per line')}</span>
              <textarea
                aria-label={tr('الخيارات — خيار لكل سطر', 'Choices — one per line')}
                required
                value={choices}
                onChange={(event) => {
                  setChoices(event.target.value);
                  setAnswer('');
                  change();
                }}
              />
            </label>
          )}
          {[CourseQuestionType.MULTIPLE_CHOICE, CourseQuestionType.TRUE_FALSE].includes(
            questionType,
          ) && (
            <label className="course-field">
              <span>{tr('الإجابة الصحيحة', 'Correct answer')}</span>
              <select
                aria-label={tr('الإجابة الصحيحة', 'Correct answer')}
                required
                value={answer}
                onChange={(event) => {
                  setAnswer(event.target.value);
                  change();
                }}
              >
                <option value="">{tr('اختر الإجابة', 'Choose answer')}</option>
                {questionType === CourseQuestionType.TRUE_FALSE ? (
                  <>
                    <option value="true">{tr('صح', 'True')}</option>
                    <option value="false">{tr('خطأ', 'False')}</option>
                  </>
                ) : (
                  choices
                    .split('\n')
                    .map((value) => value.trim())
                    .filter(Boolean)
                    .map((value, index) => (
                      <option key={index} value={value}>
                        {value}
                      </option>
                    ))
                )}
              </select>
            </label>
          )}
          <label className="course-field">
            <span>
              {tr('معيار التصحيح / شرح للمراجع', 'Grading rubric / reviewer explanation')}
            </span>
            <textarea
              value={rubric}
              onChange={(event) => {
                setRubric(event.target.value);
                change();
              }}
            />
          </label>
          <label className="course-field">
            <span>{tr('درجة السؤال', 'Question points')}</span>
            <input
              type="number"
              min={1}
              step={1}
              required
              value={points}
              onChange={(event) => {
                setPoints(event.target.value);
                change();
              }}
            />
          </label>
          <button type="submit" disabled={!quizId}>
            {tr('حفظ السؤال', 'Save question')}
          </button>
          {editingQuestion && (
            <button
              type="button"
              onClick={() => {
                if (discard()) {
                  resetQuestion();
                  setDirty(false);
                  onDirty(false);
                }
              }}
            >
              <Plus size={15} />
              {tr('سؤال جديد', 'New question')}
            </button>
          )}
        </form>
        <div className="course-table-scroll">
          <table className="course-table">
            <thead>
              <tr>
                <th>{tr('السؤال', 'Question')}</th>
                <th>{tr('النوع / الدرجة', 'Type / points')}</th>
                <th>{tr('الإجراءات', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.questions
                .filter((row) => row.quizId === quizId && row.status !== 'ARCHIVED')
                .map((row) => (
                  <tr key={row.id}>
                    <td>{row.prompt}</td>
                    <td>
                      {types[row.questionType]} · {row.points}
                    </td>
                    <td>
                      <button type="button" onClick={() => editQuestion(row)}>
                        <Pencil size={15} />
                        {tr('تعديل السؤال', 'Edit question')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            discard() &&
                            window.confirm(
                              tr(
                                'أرشفة السؤال؟ تبقى النسخ والنتائج التاريخية.',
                                'Archive question? Historical versions and results remain.',
                              ),
                            )
                          )
                            void command(`questions/${row.id}`, {}, 'DELETE').catch(
                              () => undefined,
                            );
                        }}
                      >
                        <Trash2 size={15} />
                        {tr('أرشفة', 'Archive')}
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </fieldset>
    </section>
  );
}
