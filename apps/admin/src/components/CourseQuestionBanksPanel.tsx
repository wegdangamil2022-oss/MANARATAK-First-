import { useState } from 'react';
import { adminApiClient } from '../api/client';
import { useAdminAuthorization } from '../security/AdminAuthorizationContext';
export function CourseQuestionBanksPanel({
  courseId,
  version,
  status,
  snapshot,
  onSaved,
}: {
  courseId: string;
  version: number;
  status: string;
  snapshot: {
    questionBanks: Array<{ id: string; title: string; status: string }>;
    questions: Array<{
      id: string;
      questionBankId?: string | null;
      prompt: string;
      position: number;
      status?: string;
      questionType?: string;
      correctAnswer?: unknown;
    }>;
  };
  onSaved: () => Promise<void>;
}) {
  const { hasPermission } = useAdminAuthorization();
  const [editing, setEditing] = useState<string>();
  const [title, setTitle] = useState('');
  const [bank, setBank] = useState('');
  const [prompt, setPrompt] = useState('');
  const [answer, setAnswer] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (!hasPermission('admin:courses:manage')) return null;
  const disabled = busy || ['PUBLISHED', 'ARCHIVED', 'REJECTED'].includes(status);
  const command = async (path: string, method: string, body?: unknown) => {
    if (disabled || !reason.trim()) return;
    setBusy(true);
    setError('');
    try {
      await adminApiClient.request(`/admin/courses/${courseId}/${path}`, {
        method,
        headers: { 'If-Match': String(version), 'X-Review-Reason': reason.trim() },
        body: body ? JSON.stringify(body) : undefined,
      });
      await onSaved();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'تعذر الحفظ');
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="rounded border bg-white p-4">
      <h3>بنوك أسئلة الدورة</h3>
      <p>
        التأليف خاص بالمسودة. الأرشفة تحفظ تاريخ السؤال ومحاولات الطلاب، ويرفض أرشفة بنك مرتبط
        بأسئلة.
      </p>
      {error && <p role="alert">{error}</p>}
      <label>
        سبب التعديل
        <input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={2000}
        />
      </label>
      <fieldset disabled={disabled} className="space-y-3">
        <label>
          عنوان البنك
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <button
          disabled={!title.trim() || !reason.trim()}
          onClick={() => void command('question-banks', 'POST', { title, status: 'DRAFT' })}
        >
          إنشاء بنك مسودة
        </button>
        {snapshot.questionBanks.map((row) => (
          <div key={row.id}>
            {row.title} · {row.status}
            <button
              disabled={!reason.trim() || row.status === 'ARCHIVED'}
              onClick={() =>
                void command(`question-banks/${row.id}`, 'PATCH', {
                  title: title.trim() || row.title,
                })
              }
            >
              حفظ عنوان البنك
            </button>
            <button
              disabled={!reason.trim() || row.status === 'ARCHIVED'}
              onClick={() => void command(`question-banks/${row.id}`, 'DELETE')}
            >
              أرشفة البنك
            </button>
          </div>
        ))}
        <label>
          البنك
          <select
            value={bank}
            onChange={(event) => {
              setBank(event.target.value);
              setEditing(undefined);
              setPrompt('');
              setAnswer('');
            }}
          >
            <option value="">اختر بنكًا</option>
            {snapshot.questionBanks
              .filter((row) => row.status !== 'ARCHIVED')
              .map((row) => (
                <option key={row.id} value={row.id}>
                  {row.title}
                </option>
              ))}
          </select>
        </label>
        <label>
          السؤال
          <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} />
        </label>
        <label>
          الإجابة النموذجية
          <textarea value={answer} onChange={(event) => setAnswer(event.target.value)} />
        </label>
        <button
          disabled={!!editing || !bank || !prompt.trim() || !reason.trim() || !answer.trim()}
          onClick={() =>
            void command('questions', 'POST', {
              questionBankId: bank,
              questionType: 'SHORT_ANSWER',
              prompt,
              correctAnswer: answer,
              points: 1,
              position: Math.max(0, ...snapshot.questions.map((row) => row.position)) + 1,
              status: 'DRAFT',
            })
          }
        >
          إضافة سؤال إجابة قصيرة للمراجعة
        </button>
        {editing && (
          <>
            <button
              disabled={!prompt.trim() || !answer.trim() || !reason.trim()}
              onClick={() =>
                void command(`questions/${editing}`, 'PATCH', {
                  prompt,
                  correctAnswer: answer,
                  status: 'DRAFT',
                })
              }
            >
              حفظ تعديل السؤال
            </button>
            <button
              onClick={() => {
                setEditing(undefined);
                setPrompt('');
                setAnswer('');
              }}
            >
              إلغاء تعديل السؤال
            </button>
          </>
        )}
        {snapshot.questions
          .filter((row) => row.questionBankId === bank)
          .map((row) => (
            <div key={row.id}>
              {row.prompt} · {row.status}
              {row.questionType === 'SHORT_ANSWER' && (
                <button
                  disabled={row.status === 'ARCHIVED'}
                  onClick={() => {
                    setEditing(row.id);
                    setPrompt(row.prompt);
                    setAnswer(typeof row.correctAnswer === 'string' ? row.correctAnswer : '');
                  }}
                >
                  تعديل السؤال
                </button>
              )}
              <button
                disabled={!reason.trim() || row.status === 'ARCHIVED'}
                onClick={() => void command(`questions/${row.id}`, 'DELETE')}
              >
                أرشفة السؤال
              </button>
            </div>
          ))}
      </fieldset>
    </section>
  );
}
