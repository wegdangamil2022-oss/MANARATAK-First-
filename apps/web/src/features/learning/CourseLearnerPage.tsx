import {useTranslation} from '../../i18n/I18nProvider';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Award, BookOpen, CheckCircle2, Loader2, LockKeyhole, PlayCircle } from 'lucide-react';
import {
  ApiClient,
  type CourseLearnerQuestionDto,
  type CourseLearnerWorkspaceDto,
  type StudentCourseQuizAttemptDto,
} from '../../api/client';
import { preservePostLoginReturn } from '../students/postLoginIntent';

function currentProgress(workspace: CourseLearnerWorkspaceDto | null, lessonId: string): number {
  return (
    workspace?.progress.lessons.find((row) => row.lessonId === lessonId)?.progressPercentage ?? 0
  );
}

export function CourseLearnerPage() {
 const {t,dir,language}=useTranslation();
  const { courseId = '', locale = 'ar' } = useParams<{ courseId: string; locale?: string }>();
  const location = useLocation();
  const [workspace, setWorkspace] = useState<CourseLearnerWorkspaceDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [admissionStatus,setAdmissionStatus]=useState('');
  const [error, setError] = useState<string | null>(null);
  const [activeAttempt, setActiveAttempt] = useState<StudentCourseQuizAttemptDto | null>(null);
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const assetRequest = useRef(0);
  const [media, setMedia] = useState<{
    url: string;
    type: 'video' | 'audio' | 'image' | 'document';
    title: string;
  } | null>(null);
  useEffect(
    () => () => {
      if (media?.url.startsWith('blob:')) URL.revokeObjectURL(media.url);
    },
    [media],
  );
  useEffect(() => {
    setMedia(null);
    return () => {
      ++assetRequest.current;
    };
  }, [courseId]);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});

  const loginPath = `/${locale}/login`;
  const returnPath = `${location.pathname}${location.search}`;

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setWorkspace(await ApiClient.getStudentCourseWorkspace(courseId));
      setAuthRequired(false);setAdmissionStatus('');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'LEARNER_WORKSPACE_UNAVAILABLE';
      if (message.includes('STUDENT_AUTHENTICATION_REQUIRED')) {
        preservePostLoginReturn(returnPath);
        setAuthRequired(true);
      } else if (/COURSE_ENROLLMENT_NOT_(?:ACCESSIBLE|ACTIVE):(PENDING|WAITLISTED)/.test(message)) {
        setAdmissionStatus(message.includes('WAITLISTED')?'WAITLISTED':'PENDING');setWorkspace(null);
      } else if (message.includes('COURSE_ENROLLMENT_REQUIRED') || message.includes('NOT_ENROLLED')) {
        setWorkspace(null);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [courseId]);

  const questionsByQuiz = useMemo(() => {
    const grouped = new Map<string, CourseLearnerQuestionDto[]>();
    for (const question of workspace?.curriculum.questions ?? []) {
      if (!question.quizId) continue;
      grouped.set(question.quizId, [...(grouped.get(question.quizId) ?? []), question]);
    }
    return grouped;
  }, [workspace]);

  async function enroll() {
    setBusy(true);
    setError(null);
    try {
      const snapshot=await ApiClient.enrollStudentCourse(courseId);
      const status=snapshot.enrollment?.status;
      if(status==='PENDING'||status==='WAITLISTED'){setAdmissionStatus(status);setWorkspace(null);}else{setAdmissionStatus('');await load();}
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'COURSE_ENROLLMENT_FAILED';
      if (message.includes('STUDENT_AUTHENTICATION_REQUIRED')) {
        preservePostLoginReturn(returnPath);
        setAuthRequired(true);
      } else setError(message);
    } finally {
      setBusy(false);
    }
  }

  async function completeLesson(lessonId: string) {
    setBusy(true);
    setError(null);
    try {
      await ApiClient.markStudentCourseLessonComplete(courseId, lessonId);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'LESSON_PROGRESS_FAILED');
    } finally {
      setBusy(false);
    }
  }

  async function startQuiz(quizId: string) {
    setBusy(true);
    setError(null);
    setAnswers({});
    try {
      const attempt = await ApiClient.startStudentCourseQuiz(courseId, quizId);
      setActiveAttempt(attempt);
      setActiveQuizId(quizId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'QUIZ_ATTEMPT_FAILED');
    } finally {
      setBusy(false);
    }
  }

  async function submitQuiz(event: FormEvent) {
    event.preventDefault();
    if (!activeAttempt) return;
    setBusy(true);
    setError(null);
    try {
      await ApiClient.submitStudentCourseQuiz(courseId, activeAttempt.id, answers);
      setActiveAttempt(null);
      setActiveQuizId(null);
      setAnswers({});
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'QUIZ_SUBMISSION_FAILED');
    } finally {
      setBusy(false);
    }
  }

  async function openLessonAsset(lessonId: string, assetReferenceId: string, title: string) {
    setBusy(true);
    setError(null);
    const request = ++assetRequest.current;
    try {
      const grant = await ApiClient.getStudentCourseAssetDeliveryGrant(
        courseId,
        lessonId,
        assetReferenceId,
      );
      if (!/^https?:\/\//i.test(grant.url)) throw new Error(t('course13_copy_156'));
      if (Object.keys(grant.headers??{}).length || Date.parse(grant.expiresAt)<=Date.now()) throw new Error(t('course13_copy_157'));
      if(request!==assetRequest.current)return;
      const type=grant.mimeType.startsWith('video/')?'video':grant.mimeType.startsWith('audio/')?'audio':grant.mimeType.startsWith('image/')?'image':'document';
      setMedia({url:grant.url,type,title});
    } catch (error) {
      setError(error instanceof Error ? error.message : t('course13_copy_158'));
    } finally {
      setBusy(false);
    }
  }

  async function completeCourse() {
    setBusy(true);
    setError(null);
    try {
      await ApiClient.completeStudentCourse(courseId);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'COURSE_COMPLETION_FAILED');
    } finally {
      setBusy(false);
    }
  }

  if (loading)
    return (
      <div className="mn-page-shell grid min-h-[50vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  if (authRequired)
    return (
      <main dir={dir} className="mn-page-shell mx-auto max-w-xl py-16 text-center">
        <LockKeyhole className="mx-auto h-10 w-10 text-[var(--mn-primary)]" />
        <h1 className="mt-4 text-xl font-bold">{t('course13_copy_159')}</h1>
        <p className="mt-2 text-sm text-[var(--mn-text-muted)]">
          {t('course13_copy_160')}</p>
        <Link
          to={loginPath}
          onClick={() => preservePostLoginReturn(returnPath)}
          className="mt-6 inline-flex rounded-xl bg-[var(--mn-primary)] px-5 py-3 font-bold text-white"
        >
          {t('course13_copy_161')}</Link>
      </main>
    );

  if(admissionStatus)return <main dir={dir} className="p-8"><p role="status">{t(admissionStatus==='PENDING'?'course13_admission_pending':'course13_admission_waitlisted')}</p><button disabled={busy} onClick={()=>{setAdmissionStatus('');void load();}}>{t('course13_admission_refresh')}</button></main>;

  if (!workspace)
    return (
      <main dir={dir} className="mn-page-shell mx-auto max-w-xl py-16 text-center">
        <BookOpen className="mx-auto h-10 w-10 text-[var(--mn-primary)]" />
        <h1 className="mt-4 text-xl font-bold">{t('course13_copy_162')}</h1>
        <p className="mt-2 text-sm text-[var(--mn-text-muted)]">
          {t('course13_copy_163')}</p>
        {error && (
          <p role="alert" className="mt-4 text-sm text-[var(--mn-danger-text)]">
            {error}
          </p>
        )}
        <button
          disabled={busy}
          onClick={() => void enroll()}
          className="mt-6 rounded-xl bg-[var(--mn-primary)] px-5 py-3 font-bold text-white disabled:opacity-60"
        >
          {busy ? t('course13_copy_164') : t('course13_copy_165')}
        </button>
      </main>
    );

  const progress = workspace.progress.enrollment.progressPercentage;
  return (
    <main dir={dir} className="mn-page-shell mx-auto max-w-4xl space-y-5 py-8">
      <p role="note">{t('course13_source_content')}</p>
      <section className="mn-card rounded-3xl p-5 sm:p-7">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[var(--mn-secondary)]">{t('course13_copy_166')}</p>
            <h1 className="mt-1 text-2xl font-bold">{t('course13_copy_167')}</h1>
          </div>
          <span className="rounded-full bg-[var(--mn-gold-surface)] px-3 py-1 text-sm font-bold">
            {progress}%
          </span>
        </div>
        <progress className="mn-native-progress mt-4 h-2 w-full" value={progress} max={100} />
      </section>

      {[...workspace.curriculum.modules, ...(workspace.curriculum.quizzes.some(quiz => !quiz.moduleId) ?
        [{id: '__course_assessments', title: t('course13_copy_168'), description: '', position: Number.MAX_SAFE_INTEGER}] : [])]
        .sort((a, b) => a.position - b.position)
        .map((module) => {
          const lessons = workspace.curriculum.lessons
            .filter((lesson) => lesson.moduleId === module.id)
            .sort((a, b) => a.position - b.position);
          const quizzes = workspace.curriculum.quizzes
            .filter((quiz) => module.id === '__course_assessments' ? !quiz.moduleId : quiz.moduleId === module.id)
            .sort((a, b) => a.position - b.position);
          return (
            <section key={module.id} className="mn-card rounded-3xl p-5 sm:p-6">
              <h2 className="text-lg font-bold">{module.title}</h2>
              {module.description && (
                <p className="mt-2 text-sm text-[var(--mn-text-muted)]">{module.description}</p>
              )}
              <div className="mt-4 space-y-3">
                {lessons.map((lesson) => {
                  const done = currentProgress(workspace, lesson.id) >= 100;
                  return (
                    <article
                      key={lesson.id}
                      className="rounded-2xl border border-[var(--mn-border)] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-bold">{lesson.title}</h3>
                          {lesson.summary && (
                            <p className="mt-1 text-sm text-[var(--mn-text-muted)]">
                              {lesson.summary}
                            </p>
                          )}
                        </div>
                        {done ? (
                          <CheckCircle2 className="h-5 w-5 text-[var(--mn-success-text)]" />
                        ) : (
                          <PlayCircle className="h-5 w-5 text-[var(--mn-secondary)]" />
                        )}
                      </div>
                      {lesson.contentText && (
                        <div className="mt-3 whitespace-pre-wrap text-sm leading-7">
                          {lesson.contentText}
                        </div>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {workspace.curriculum.assets
                          .filter((asset) => asset.lessonId === lesson.id)
                          .map((asset) => (
                            <button
                              key={asset.id}
                              disabled={busy}
                              onClick={() =>
                                void openLessonAsset(
                                  lesson.id,
                                  asset.id,
                                  asset.title || lesson.title,
                                )
                              }
                              className="rounded-xl border px-3 py-2 text-sm font-bold"
                            >
                              {asset.title || asset.assetType}
                            </button>
                          ))}
                      </div>
                      {!done && (
                        <button
                          disabled={busy}
                          onClick={() => void completeLesson(lesson.id)}
                          className="mt-4 rounded-xl border border-[var(--mn-border)] px-4 py-2 text-sm font-bold disabled:opacity-60"
                        >
                          {t('course13_copy_169')}</button>
                      )}
                    </article>
                  );
                })}
                {quizzes.map((quiz) => (
                  <article
                    key={quiz.id}
                    className="rounded-2xl border border-[var(--mn-border-gold)] bg-[var(--mn-gold-surface)] p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-bold">{quiz.title}</h3>
                        {quiz.instructions && <p className="mt-1 text-sm">{quiz.instructions}</p>}
                      </div>
                      <Award className="h-5 w-5" />
                    </div>
                    {workspace?.progress.quizAttempts.filter(attempt => attempt.quizId === quiz.id).map(attempt => (
                      <p key={attempt.id} className="mt-2 text-sm" role="status">
                        {t('course13_copy_170')}{attempt.attemptNumber}: {attempt.status === 'SUBMITTED' ? t('course13_copy_171') : attempt.score != null ? `${attempt.score}% — ${attempt.passed ? t('course13_copy_172') : t('course13_copy_173')}` : t('course13_copy_174')}
                        {attempt.metadata?.assessmentGrade?.feedback && <span className="block">{t('course13_copy_175')}{attempt.metadata.assessmentGrade.feedback}</span>}
                      </p>
                    ))}
                    {activeQuizId !== quiz.id ? (
                      <button
                        disabled={busy}
                        onClick={() => void startQuiz(quiz.id)}
                        className="mt-4 rounded-xl bg-[var(--mn-primary)] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                      >
                        {quiz.assessmentType === 'ASSIGNMENT' ? t('course13_copy_176') : t('course13_copy_177')}
                      </button>
                    ) : (
                      <form onSubmit={submitQuiz} className="mt-4 space-y-4">
                        {(questionsByQuiz.get(quiz.id) ?? []).map((question) => {
                          const choices =
                            question.questionType === 'TRUE_FALSE'
                              ? [true, false]
                              : Array.isArray(question.choices)
                                ? question.choices
                                : [];
                          return (
                            <fieldset
                              key={question.id}
                              className="rounded-xl bg-[var(--mn-surface)] p-3"
                            >
                              <legend className="font-bold">{question.prompt}</legend>
                              {choices.length ? (
                                choices.map((choice, index) => (
                                  <label key={index} className="mt-2 flex gap-2 text-sm">
                                    <input
                                      type="radio"
                                      name={question.id}
                                      required
                                      onChange={() =>
                                        setAnswers((value) => ({ ...value, [question.id]: choice }))
                                      }
                                    />
                                    <span>
                                      {String(
                                        typeof choice === 'object' && choice && 'label' in choice
                                          ? (choice as { label: unknown }).label
                                          : typeof choice === 'boolean'
                                            ? choice
                                              ? t('course13_copy_178')
                                              : t('course13_copy_179')
                                            : choice,
                                      )}
                                    </span>
                                  </label>
                                ))
                              ) : (
                                <textarea
                                  aria-label={question.prompt}
                                  maxLength={10000}
                                  className="mn-search-control mt-2 w-full"
                                  required
                                  onChange={(event) =>
                                    setAnswers((value) => ({
                                      ...value,
                                      [question.id]: event.target.value,
                                    }))
                                  }
                                />
                              )}
                            </fieldset>
                          );
                        })}
                        <button
                          disabled={busy}
                          type="submit"
                          className="rounded-xl bg-[var(--mn-primary)] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                        >
                          {t('course13_copy_180')}</button>
                      </form>
                    )}
                  </article>
                ))}
              </div>
            </section>
          );
        })}

      {media && (
        <section className="rounded-2xl border bg-[var(--mn-surface)] p-4">
          <div className="flex justify-between gap-3">
            <h2 className="font-bold">{media.title}</h2>
            <button onClick={() => setMedia(null)}>{t('course13_copy_181')}</button>
          </div>
          {media.type === 'video' ? (
            <video src={media.url} controls className="mt-3 w-full max-h-[70vh]" />
          ) : media.type === 'audio' ? (
            <audio src={media.url} controls className="mt-3 w-full" />
          ) : media.type === 'document' ? <a href={media.url} target="_blank" rel="noopener noreferrer">{t('course13_copy_182')}</a> : (
            <img src={media.url} alt={media.title} className="mt-3 max-h-[70vh] mx-auto" />
          )}
        </section>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-[var(--mn-danger-soft)] p-4 text-sm text-[var(--mn-danger-text)]"
        >
          {error}
        </p>
      )}
      {workspace.progress.completion && (
        <section className="mn-card rounded-2xl p-5 text-center">
          <h2 className="font-bold">{t('course13_copy_183')}</h2>
          <p className="mt-2 text-sm">
            {workspace.progress.completion.eligibleForCertificate
              ? t('course13_copy_184')
              : t('course13_copy_185')}
          </p>
          <Link
            to={`/${locale}/student?tab=LEARNING#certificates`}
            className="mt-3 inline-block text-[var(--mn-secondary)] underline"
          >
            {t('course13_copy_186')}</Link>
        </section>
      )}
      <section className="text-center">
        <button
          disabled={busy || progress < 100 || !!workspace.progress.completion}
          onClick={() => void completeCourse()}
          className="rounded-xl bg-[var(--mn-primary)] px-5 py-3 font-bold text-white disabled:opacity-50"
        >
          {t('course13_copy_187')}</button>
      </section>
    </main>
  );
}
