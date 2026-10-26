import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Award, BookOpen, CheckCircle2, Loader2, LockKeyhole, PlayCircle } from 'lucide-react';
import {
  ApiClient,
  type CourseLearnerQuestionDto,
  type CourseLearnerWorkspaceDto,
  type StudentCourseQuizAttemptDto,
} from '../../api/client';
import { preservePostLoginReturn } from '../students/postLoginIntent';
import { CourseLessonBlocks } from './CourseLessonBlocks';
import {CourseCompletionCertificate} from './CourseCompletionCertificate';
import './course-learner.css';
import { CourseMediaPlayer, type LearningMedia } from './CourseMediaPlayer';
import { fetchCourseMediaBlob } from './course-media-delivery';

function currentProgress(workspace: CourseLearnerWorkspaceDto | null, lessonId: string): number {
  return (
    workspace?.progress.lessons.find((row) => row.lessonId === lessonId)?.progressPercentage ?? 0
  );
}

export function CourseLearnerPage() {
  const { courseId = '', locale = 'ar' } = useParams<{ courseId: string; locale?: string }>();
  const location = useLocation();
  const [workspace, setWorkspace] = useState<CourseLearnerWorkspaceDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [enrollmentRequired, setEnrollmentRequired] = useState(false);
  const workspaceRequest = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const [activeAttempt, setActiveAttempt] = useState<StudentCourseQuizAttemptDto | null>(null);
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const assetRequest = useRef(0);
  const [media, setMedia] = useState<LearningMedia | null>(null);
  const [openedLesson, setOpenedLesson] = useState<string | null>(null);
  async function openLesson(lessonId: string) {
    setError(null);
    try {
      await ApiClient.saveStudentCourseResume(courseId, lessonId);
      setOpenedLesson(lessonId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'COURSE_RESUME_FAILED');
    }
  }
  useEffect(
    () => () => {
      if (media) { URL.revokeObjectURL(media.url); if (media.subtitleUrl) URL.revokeObjectURL(media.subtitleUrl); }
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
  const returnPath = `${location.pathname}${location.search}${location.hash}`;

  const load = useCallback(async () => {
    const request = ++workspaceRequest.current;
    setLoading(true);
    setWorkspace(null);
    setAuthRequired(false);
    setEnrollmentRequired(false);
    setError(null);
    try {
      const result = await ApiClient.getStudentCourseWorkspace(courseId);
      if (request !== workspaceRequest.current) return;
      setWorkspace(result);
      setOpenedLesson(result.resumeLessonId ?? null);
    } catch (cause) {
      if (request !== workspaceRequest.current) return;
      const message = cause instanceof Error ? cause.message : 'LEARNER_WORKSPACE_UNAVAILABLE';
      if (message === 'STUDENT_AUTHENTICATION_REQUIRED') {
        preservePostLoginReturn(returnPath);
        setAuthRequired(true);
      } else if (message === 'COURSE_ENROLLMENT_REQUIRED') {
        setEnrollmentRequired(true);
      } else {
        setError(message);
      }
    } finally {
      if (request === workspaceRequest.current) setLoading(false);
    }
  }, [courseId, returnPath]);

  useEffect(() => {
    setBusy(false);
    setActiveAttempt(null);
    setActiveQuizId(null);
    setAnswers({});
    void load();
    const requestCounter = workspaceRequest;
    return () => { ++requestCounter.current; };
  }, [load]);

  const questionsByQuiz = useMemo(() => {
    const grouped = new Map<string, CourseLearnerQuestionDto[]>();
    for (const question of workspace?.curriculum.questions ?? []) {
      if (!question.quizId) continue;
      grouped.set(question.quizId, [...(grouped.get(question.quizId) ?? []), question]);
    }
    return grouped;
  }, [workspace]);

  async function enroll() {
    const request = workspaceRequest.current;
    setBusy(true);
    setError(null);
    try {
      await ApiClient.enrollStudentCourse(courseId);
      if (request !== workspaceRequest.current) return;
      setBusy(false);
      await load();
    } catch (cause) {
      if (request !== workspaceRequest.current) return;
      const message = cause instanceof Error ? cause.message : 'COURSE_ENROLLMENT_FAILED';
      if (message.includes('STUDENT_AUTHENTICATION_REQUIRED')) {
        preservePostLoginReturn(returnPath);
        setAuthRequired(true);
      } else setError(message);
    } finally {
      if (request === workspaceRequest.current) setBusy(false);
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

  async function openLessonAsset(lessonId: string, assetReferenceId: string, title: string, subtitle?: { id: string; language: string }) {
    setBusy(true);
    setError(null);
    const request = ++assetRequest.current;
    try {
      const grant = await ApiClient.getStudentCourseAssetDeliveryGrant(
        courseId,
        lessonId,
        assetReferenceId,
      );
      const blob = await fetchCourseMediaBlob(grant);
      let subtitleUrl: string | undefined;
      if (subtitle) {
        const captionGrant = await ApiClient.getStudentCourseAssetDeliveryGrant(courseId, lessonId, subtitle.id);
        const caption = await fetchCourseMediaBlob(captionGrant, 2 * 1024 * 1024);
        if (!['text/vtt','text/plain'].includes(caption.type)) throw Error('COURSE_MEDIA_SUBTITLE_TYPE_INVALID');
        if (request !== assetRequest.current) return;
        subtitleUrl = URL.createObjectURL(new Blob([caption], { type: 'text/vtt' }));
      }
      if (request !== assetRequest.current) return;
      const assetUrl = URL.createObjectURL(blob);
      const type = blob.type.startsWith('video/')
        ? 'video'
        : blob.type.startsWith('audio/')
          ? 'audio'
          : blob.type.startsWith('image/')
            ? 'image'
            : null;
      if (type) {
        setMedia({ url: assetUrl, type, title, referenceId: assetReferenceId, subtitleUrl, subtitleLanguage: subtitle?.language });
        return;
      }
      const link = document.createElement('a');
      link.href = assetUrl;
      link.download = `${title || 'course-content'}${blob.type === 'application/pdf' ? '.pdf' : ''}`;
      link.click();
      if (subtitleUrl) URL.revokeObjectURL(subtitleUrl);
      setTimeout(() => URL.revokeObjectURL(assetUrl), 60000);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'تعذر فتح محتوى الدرس');
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
      <div className="mn-course-learner mn-page-shell grid min-h-[50vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  if (authRequired)
    return (
      <main dir={locale === 'ar' ? 'rtl' : 'ltr'} className="mn-course-learner mn-page-shell mx-auto max-w-xl py-16 text-center">
        <LockKeyhole className="mx-auto h-10 w-10 text-[var(--mn-primary)]" />
        <h1 className="mt-4 text-xl font-bold">سجّل الدخول لمتابعة التعلم</h1>
        <p className="mt-2 text-sm text-[var(--mn-text-muted)]">
          سيتم الاحتفاظ بمسار هذه الدورة والعودة إليه بعد تسجيل الدخول.
        </p>
        <Link
          to={loginPath}
          onClick={() => preservePostLoginReturn(returnPath)}
          className="mt-6 inline-flex rounded-xl bg-[var(--mn-primary)] px-5 py-3 font-bold text-white"
        >
          تسجيل الدخول
        </Link>
      </main>
    );

  if (!workspace)
    return (
      <main dir={locale === 'ar' ? 'rtl' : 'ltr'} className="mn-course-learner mn-page-shell mx-auto max-w-xl py-16 text-center">
        <BookOpen className="mx-auto h-10 w-10 text-[var(--mn-primary)]" />
        <h1 className="mt-4 text-xl font-bold">
          {enrollmentRequired ? 'ابدأ هذه الدورة على منارتك' : 'تعذر فتح مساحة التعلم'}
        </h1>
        <p className="mt-2 text-sm text-[var(--mn-text-muted)]">
          التسجيل والتقدم والاختبارات تُدار من نظام التعلم الداخلي.
        </p>
        {error && (
          <p role="alert" className="mt-4 text-sm text-[var(--mn-danger-text)]">
            {error}
          </p>
        )}
        <button
          disabled={busy}
          onClick={() => (enrollmentRequired ? void enroll() : void load())}
          className="mt-6 rounded-xl bg-[var(--mn-primary)] px-5 py-3 font-bold text-white disabled:opacity-60"
        >
          {busy ? 'جارٍ التسجيل...' : enrollmentRequired ? 'التسجيل في الدورة' : 'إعادة المحاولة'}
        </button>
      </main>
    );

  const progress = workspace.progress.enrollment.progressPercentage;
  return (
    <main dir={locale === 'ar' ? 'rtl' : 'ltr'} className="mn-course-learner mn-page-shell mx-auto max-w-4xl space-y-5 py-8">
      <section className="mn-card rounded-3xl p-5 sm:p-7">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[var(--mn-secondary)]">مساحة التعلم</p>
            <h1 className="mt-1 text-[22px] font-bold">
              {workspace.course?.displayName ?? (locale === 'ar' ? 'دورة منارتك' : 'Manaratak course')}
            </h1>
          </div>
          <span className="rounded-full bg-[var(--mn-gold-surface)] px-3 py-1 text-sm font-bold">
            {progress}%
          </span>
        </div>
        <progress className="mn-native-progress mt-4 h-2 w-full" value={progress} max={100} />
        {workspace.resumeLessonId && (
          <button
            className="mt-3 rounded-xl border px-4 py-2 text-sm font-bold"
            onClick={() => {
              void openLesson(workspace.resumeLessonId!);
              document
                .getElementById(`lecture-${workspace.resumeLessonId}`)
                ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          >
            {locale === 'ar' ? 'متابعة التعلم' : 'Resume learning'}
          </button>
        )}
      </section>

      {[...workspace.curriculum.modules, ...(workspace.curriculum.quizzes.some(quiz => !quiz.moduleId) ?
        [{id: '__course_assessments', title: 'تقييمات الدورة والواجبات', description: '', position: Number.MAX_SAFE_INTEGER}] : [])]
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
                      id={`lecture-${lesson.id}`}
                      data-lesson-id={lesson.id}
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
                      {lesson.locked ? (
                        <p className="mt-3 flex gap-2 text-sm">
                          <LockKeyhole size={18} />
                          {lesson.lockReason === 'SCHEDULED'
                            ? (locale === 'ar' ? 'تتاح في ' : 'Available at ') +
                              (lesson.availableAt
                                ? new Date(lesson.availableAt).toLocaleString(
                                    locale === 'ar' ? 'ar' : 'en',
                                  )
                                : '')
                            : locale === 'ar'
                              ? 'أكمل المحاضرة السابقة لفتح هذه المحاضرة.'
                              : 'Complete the previous lecture to unlock this lecture.'}
                        </p>
                      ) : (
                        <button
                          disabled={busy}
                          aria-pressed={openedLesson === lesson.id}
                          className="mt-3 rounded-xl border px-3 py-2 text-sm font-bold"
                          onClick={() => void openLesson(lesson.id)}
                        >
                          {locale === 'ar'
                            ? 'فتح المحاضرة وحفظ موضع المتابعة'
                            : 'Open lecture and save resume position'}
                        </button>
                      )}
                      {lesson.contentText && !lesson.locked && (
                        <div className="mt-3 whitespace-pre-wrap text-sm leading-7">
                          {lesson.contentText}
                        </div>
                      )}
                      <CourseLessonBlocks
                        blocks={(workspace.curriculum.contentBlocks ?? []).filter(block => block.lessonId === lesson.id)}
                        busy={busy}
                        onAsset={(reference, title, subtitle) => void openLessonAsset(lesson.id, reference, title, subtitle)}
                        onQuiz={(quizId) => void startQuiz(quizId)}
                        media={(block) =>
                          media && media.referenceId === block.assetReferenceId ? (
                            <CourseMediaPlayer media={media} alt={String(block.payload.alt ?? media.title)} onError={() => setError(locale === 'ar' ? 'تعذر تشغيل الملف؛ أعد فتحه للحصول على إذن جديد.' : 'Playback failed; reopen the file to obtain a fresh grant.')}/>
                          ) : null
                        }
                      />
                      <div className="mt-3 flex flex-wrap gap-2">
                        {workspace.curriculum.assets
                          .filter((asset) => asset.lessonId === lesson.id && !(workspace.curriculum.contentBlocks ?? []).some(block => block.assetReferenceId === asset.id))
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
                      {!done && !lesson.locked && (
                        <button
                          disabled={busy}
                          onClick={() => void completeLesson(lesson.id)}
                          className="mt-4 rounded-xl border border-[var(--mn-border)] px-4 py-2 text-sm font-bold disabled:opacity-60"
                        >
                          تحديد الدرس كمكتمل
                        </button>
                      )}
                    </article>
                  );
                })}
                {quizzes.map((quiz) => (
                  <article
                    key={quiz.id}
                    data-course-quiz-id={quiz.id}
                    className="rounded-2xl border border-[var(--mn-border-gold)] bg-[var(--mn-gold-surface)] p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-bold">{quiz.title}</h3>
                        {quiz.instructions && <p className="mt-1 text-sm">{quiz.instructions}</p>}
                      </div>
                      <Award className="h-5 w-5" />
                    </div>
                    {workspace?.progress.quizAttempts.filter(attempt => attempt.quizId === quiz.id).map((attempt) => (
                        <p key={attempt.id} className="mt-2 text-sm" role="status">
                          المحاولة {attempt.attemptNumber}:{' '}
                          {attempt.status === 'SUBMITTED' ? 'بانتظار التصحيح اليدوي' : attempt.score != null ? `${attempt.score}% — ${attempt.passed ? 'ناجح' : 'لم يجتز'}` : 'قيد الحل'}
                          {attempt.metadata?.assessmentGrade?.feedback && (
                            <span className="block">
                              ملاحظات المصحّح: {attempt.metadata.assessmentGrade.feedback}
                            </span>
                          )}
                        </p>
                      ))}
                    {activeQuizId !== quiz.id ? (
                      <button
                        disabled={busy}
                        onClick={() => void startQuiz(quiz.id)}
                        className="mt-4 rounded-xl bg-[var(--mn-primary)] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                      >
                        {quiz.assessmentType === 'ASSIGNMENT' ? 'بدء الواجب' : 'بدء الاختبار'}
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
                                              ? 'صحيح'
                                              : 'خطأ'
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
                          إرسال الإجابات
                        </button>
                      </form>
                    )}
                  </article>
                ))}
              </div>
            </section>
          );
        })}

      {media && !(workspace?.curriculum.contentBlocks ?? []).some(block => block.assetReferenceId === media.referenceId) && (
          <section className="rounded-2xl border bg-[var(--mn-surface)] p-4">
            <div className="flex justify-between gap-3">
              <h2 className="font-bold">{media.title}</h2>
              <button onClick={() => setMedia(null)}>إغلاق المحتوى</button>
            </div>
            <CourseMediaPlayer media={media} onError={() => setError(locale === 'ar' ? 'تعذر تشغيل الملف؛ أعد فتحه للحصول على إذن جديد.' : 'Playback failed; reopen the file to obtain a fresh grant.')}/>
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
        <CourseCompletionCertificate key={courseId} courseId={courseId} locale={locale}/>
      )}
      <section className="text-center">
        <button
          disabled={busy || progress < 100 || !!workspace.progress.completion}
          onClick={() => void completeCourse()}
          className="rounded-xl bg-[var(--mn-primary)] px-5 py-3 font-bold text-white disabled:opacity-50"
        >
          إنهاء الدورة والتحقق من الاستحقاق
        </button>
      </section>
    </main>
  );
}
