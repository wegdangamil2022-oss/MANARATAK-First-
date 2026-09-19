import React, { FormEvent, useEffect, useMemo, useState } from 'react';
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
  return workspace?.progress.lessons.find((row) => row.lessonId === lessonId)?.progressPercentage ?? 0;
}

export function CourseLearnerPage() {
  const { courseId = '', locale = 'ar' } = useParams<{ courseId: string; locale?: string }>();
  const location = useLocation();
  const [workspace, setWorkspace] = useState<CourseLearnerWorkspaceDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeAttempt, setActiveAttempt] = useState<StudentCourseQuizAttemptDto | null>(null);
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});

  const loginPath = `/${locale}/login`;
  const returnPath = `${location.pathname}${location.search}`;

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setWorkspace(await ApiClient.getStudentCourseWorkspace(courseId));
      setAuthRequired(false);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'LEARNER_WORKSPACE_UNAVAILABLE';
      if (message.includes('STUDENT_AUTHENTICATION_REQUIRED')) {
        preservePostLoginReturn(returnPath);
        setAuthRequired(true);
      } else if (message.includes('ENROLLMENT') || message.includes('NOT_ENROLLED')) {
        setWorkspace(null);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [courseId]);

  const questionsByQuiz = useMemo(() => {
    const grouped = new Map<string, CourseLearnerQuestionDto[]>();
    for (const question of workspace?.curriculum.questions ?? []) {
      if (!question.quizId) continue;
      grouped.set(question.quizId, [...(grouped.get(question.quizId) ?? []), question]);
    }
    return grouped;
  }, [workspace]);

  async function enroll() {
    setBusy(true); setError(null);
    try {
      await ApiClient.enrollStudentCourse(courseId);
      await load();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'COURSE_ENROLLMENT_FAILED';
      if (message.includes('STUDENT_AUTHENTICATION_REQUIRED')) {
        preservePostLoginReturn(returnPath); setAuthRequired(true);
      } else setError(message);
    } finally { setBusy(false); }
  }

  async function completeLesson(lessonId: string) {
    setBusy(true); setError(null);
    try {
      await ApiClient.markStudentCourseLessonComplete(courseId, lessonId);
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'LESSON_PROGRESS_FAILED'); }
    finally { setBusy(false); }
  }

  async function startQuiz(quizId: string) {
    setBusy(true); setError(null); setAnswers({});
    try {
      const attempt = await ApiClient.startStudentCourseQuiz(courseId, quizId);
      setActiveAttempt(attempt); setActiveQuizId(quizId);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'QUIZ_ATTEMPT_FAILED'); }
    finally { setBusy(false); }
  }

  async function submitQuiz(event: FormEvent) {
    event.preventDefault();
    if (!activeAttempt) return;
    setBusy(true); setError(null);
    try {
      await ApiClient.submitStudentCourseQuiz(courseId, activeAttempt.id, answers);
      setActiveAttempt(null); setActiveQuizId(null); setAnswers({});
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'QUIZ_SUBMISSION_FAILED'); }
    finally { setBusy(false); }
  }

  async function completeCourse() {
    setBusy(true); setError(null);
    try { await ApiClient.completeStudentCourse(courseId); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'COURSE_COMPLETION_FAILED'); }
    finally { setBusy(false); }
  }

  if (loading) return <div className="mn-page-shell grid min-h-[50vh] place-items-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (authRequired) return (
    <main dir="rtl" className="mn-page-shell mx-auto max-w-xl py-16 text-center">
      <LockKeyhole className="mx-auto h-10 w-10 text-[var(--mn-primary)]" />
      <h1 className="mt-4 text-xl font-bold">سجّل الدخول لمتابعة التعلم</h1>
      <p className="mt-2 text-sm text-[var(--mn-text-muted)]">سيتم الاحتفاظ بمسار هذه الدورة والعودة إليه بعد تسجيل الدخول.</p>
      <Link to={loginPath} onClick={() => preservePostLoginReturn(returnPath)} className="mt-6 inline-flex rounded-xl bg-[var(--mn-primary)] px-5 py-3 font-bold text-white">تسجيل الدخول</Link>
    </main>
  );

  if (!workspace) return (
    <main dir="rtl" className="mn-page-shell mx-auto max-w-xl py-16 text-center">
      <BookOpen className="mx-auto h-10 w-10 text-[var(--mn-primary)]" />
      <h1 className="mt-4 text-xl font-bold">ابدأ هذه الدورة على منارتك</h1>
      <p className="mt-2 text-sm text-[var(--mn-text-muted)]">التسجيل والتقدم والاختبارات تُدار من نظام التعلم الداخلي.</p>
      {error && <p role="alert" className="mt-4 text-sm text-[var(--mn-danger-text)]">{error}</p>}
      <button disabled={busy} onClick={() => void enroll()} className="mt-6 rounded-xl bg-[var(--mn-primary)] px-5 py-3 font-bold text-white disabled:opacity-60">{busy ? 'جارٍ التسجيل...' : 'التسجيل في الدورة'}</button>
    </main>
  );

  const progress = workspace.progress.enrollment.progressPercentage;
  return (
    <main dir="rtl" className="mn-page-shell mx-auto max-w-4xl space-y-5 py-8">
      <section className="mn-card rounded-3xl p-5 sm:p-7">
        <div className="flex items-center justify-between gap-4">
          <div><p className="text-xs font-semibold text-[var(--mn-secondary)]">مساحة التعلم</p><h1 className="mt-1 text-2xl font-bold">دورة منارتك</h1></div>
          <span className="rounded-full bg-[var(--mn-gold-surface)] px-3 py-1 text-sm font-bold">{progress}%</span>
        </div>
        <progress className="mn-native-progress mt-4 h-2 w-full" value={progress} max={100} />
      </section>

      {workspace.curriculum.modules.sort((a,b) => a.position-b.position).map((module) => {
        const lessons = workspace.curriculum.lessons.filter((lesson) => lesson.moduleId === module.id).sort((a,b) => a.position-b.position);
        const quizzes = workspace.curriculum.quizzes.filter((quiz) => quiz.moduleId === module.id).sort((a,b) => a.position-b.position);
        return <section key={module.id} className="mn-card rounded-3xl p-5 sm:p-6">
          <h2 className="text-lg font-bold">{module.title}</h2>
          {module.description && <p className="mt-2 text-sm text-[var(--mn-text-muted)]">{module.description}</p>}
          <div className="mt-4 space-y-3">
            {lessons.map((lesson) => {
              const done = currentProgress(workspace, lesson.id) >= 100;
              return <article key={lesson.id} className="rounded-2xl border border-[var(--mn-border)] p-4">
                <div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{lesson.title}</h3>{lesson.summary && <p className="mt-1 text-sm text-[var(--mn-text-muted)]">{lesson.summary}</p>}</div>{done ? <CheckCircle2 className="h-5 w-5 text-[var(--mn-success-text)]" /> : <PlayCircle className="h-5 w-5 text-[var(--mn-secondary)]" />}</div>
                {lesson.contentText && <div className="mt-3 whitespace-pre-wrap text-sm leading-7">{lesson.contentText}</div>}
                {!done && <button disabled={busy} onClick={() => void completeLesson(lesson.id)} className="mt-4 rounded-xl border border-[var(--mn-border)] px-4 py-2 text-sm font-bold disabled:opacity-60">تحديد الدرس كمكتمل</button>}
              </article>;
            })}
            {quizzes.map((quiz) => <article key={quiz.id} className="rounded-2xl border border-[var(--mn-border-gold)] bg-[var(--mn-gold-surface)] p-4">
              <div className="flex items-center justify-between gap-3"><div><h3 className="font-bold">{quiz.title}</h3>{quiz.instructions && <p className="mt-1 text-sm">{quiz.instructions}</p>}</div><Award className="h-5 w-5" /></div>
              {activeQuizId !== quiz.id ? <button disabled={busy} onClick={() => void startQuiz(quiz.id)} className="mt-4 rounded-xl bg-[var(--mn-primary)] px-4 py-2 text-sm font-bold text-white disabled:opacity-60">بدء الاختبار</button> : (
                <form onSubmit={submitQuiz} className="mt-4 space-y-4">
                  {(questionsByQuiz.get(quiz.id) ?? []).map((question) => {
                    const choices = Array.isArray(question.choices) ? question.choices : [];
                    return <fieldset key={question.id} className="rounded-xl bg-[var(--mn-surface)] p-3"><legend className="font-bold">{question.prompt}</legend>{choices.length ? choices.map((choice, index) => <label key={index} className="mt-2 flex gap-2 text-sm"><input type="radio" name={question.id} required onChange={() => setAnswers((value) => ({...value, [question.id]: choice}))}/><span>{String(typeof choice === 'object' && choice && 'label' in choice ? (choice as any).label : choice)}</span></label>) : <input className="mn-search-control mt-2 w-full" required onChange={(event) => setAnswers((value) => ({...value, [question.id]: event.target.value}))}/>}</fieldset>;
                  })}
                  <button disabled={busy} type="submit" className="rounded-xl bg-[var(--mn-primary)] px-4 py-2 text-sm font-bold text-white disabled:opacity-60">إرسال الإجابات</button>
                </form>
              )}
            </article>)}
          </div>
        </section>;
      })}

      {error && <p role="alert" className="rounded-xl bg-[var(--mn-danger-soft)] p-4 text-sm text-[var(--mn-danger-text)]">{error}</p>}
      <section className="text-center"><button disabled={busy || progress < 100} onClick={() => void completeCourse()} className="rounded-xl bg-[var(--mn-primary)] px-5 py-3 font-bold text-white disabled:opacity-50">إنهاء الدورة والتحقق من الاستحقاق</button></section>
    </main>
  );
}
