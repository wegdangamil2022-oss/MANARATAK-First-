import { useEffect, useRef, useState } from 'react';
import { adminApiClient } from '../api/client';

type Attempt = {
  id: string; studentReferenceId: string; attemptNumber: number; submittedAt: string;
  answers: Record<string, unknown>;
  metadata: {assessmentReview: {questions: {id: string; prompt: string; maximumPoints: number}[]}};
};

export function AssessmentReviewPanel({courseId}: {courseId: string}) {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [scores, setScores] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [reason, setReason] = useState('');
  const generation = useRef(0);
  useEffect(() => {
    ++generation.current;
    setAttempts([]); setLoaded(false); setPage(1); setScores({}); setFeedback({}); setReason(''); setError(''); setBusy(false);
    return () => {++generation.current;};
  }, [courseId]);

  async function load(nextPage: number) {
    const request = ++generation.current;
    setBusy(true); setError('');
    try {
      const result = await adminApiClient.request<{data: Attempt[]}>(`/admin/courses/${encodeURIComponent(courseId)}/assessment-reviews?page=${nextPage}&pageSize=20`);
      if (request !== generation.current) return;
      setAttempts(result.data); setHasNext(result.data.length === 20); setPage(nextPage); setLoaded(true); setScores({}); setFeedback({});
    } catch (cause) {if (request === generation.current) setError(cause instanceof Error ? cause.message : 'تعذر تحميل التسليمات');}
    finally {if (request === generation.current) setBusy(false);}
  }

  async function grade(attempt: Attempt) {
    const request = ++generation.current;
    setBusy(true); setError('');
    try {
      const questionScores = Object.fromEntries(attempt.metadata.assessmentReview.questions.map(q => [q.id, Number(scores[`${attempt.id}:${q.id}`])]));
      await adminApiClient.request(`/admin/courses/${encodeURIComponent(courseId)}/assessment-reviews/${encodeURIComponent(attempt.id)}/grade`, {
        method: 'POST', body: JSON.stringify({expectedSubmittedAt: attempt.submittedAt, questionScores, feedback: feedback[attempt.id] ?? '', reason}),
      });
      if (request === generation.current) {setAttempts(rows => rows.filter(row => row.id !== attempt.id));}
    } catch (cause) {if (request === generation.current) setError(cause instanceof Error ? cause.message : 'تعذر اعتماد الدرجة');}
    finally {if (request === generation.current) setBusy(false);}
  }

  return <section className="rounded-xl border bg-white p-4 space-y-3" dir="rtl" aria-label="التصحيح اليدوي">
    <h2 className="font-bold">الواجبات والتقييمات بانتظار التصحيح</h2>
    <button type="button" className="rounded border p-2" disabled={busy} onClick={() => void load(page)}>تحميل التسليمات</button>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {loaded && !attempts.length && <p>لا توجد تسليمات في هذه الصفحة.</p>}
    <label className="block">سبب اعتماد الدرجات<input className="mx-2 rounded border p-2" value={reason} maxLength={2000} onChange={event => setReason(event.target.value)} /></label>
    {attempts.map(attempt => {
      const questions = attempt.metadata.assessmentReview.questions;
      const valid = questions.every(q => {
        const value = scores[`${attempt.id}:${q.id}`];
        return value !== undefined && value.trim() !== '' && Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= q.maximumPoints;
      });
      return <article key={attempt.id} className="rounded border p-3 space-y-3">
        <h3>الطالب: {attempt.studentReferenceId} — المحاولة {attempt.attemptNumber}</h3>
        {questions.map(q => <div key={q.id}>
          <p>{q.prompt}</p><p className="whitespace-pre-wrap">{String(attempt.answers[q.id] ?? '')}</p>
          <label>الدرجة من {q.maximumPoints}<input className="mx-2 rounded border p-2" type="number" min={0} max={q.maximumPoints} step="any"
            value={scores[`${attempt.id}:${q.id}`] ?? ''} onChange={event => setScores({...scores, [`${attempt.id}:${q.id}`]: event.target.value})} /></label>
        </div>)}
        <label className="block">ملاحظات للطالب<textarea className="block w-full rounded border p-2" maxLength={5000} value={feedback[attempt.id] ?? ''}
          onChange={event => setFeedback({...feedback, [attempt.id]: event.target.value})} /></label>
        <button type="button" className="rounded border p-2" disabled={busy || reason.trim().length < 3 || !valid} onClick={() => void grade(attempt)}>اعتماد الدرجة</button>
      </article>;
    })}
    {loaded && <div className="flex gap-2">
      <button type="button" disabled={busy || page === 1} onClick={() => void load(page - 1)}>السابق</button>
      <span>صفحة {page}</span>
      <button type="button" disabled={busy || !hasNext} onClick={() => void load(page + 1)}>التالي</button>
    </div>}
  </section>;
}
