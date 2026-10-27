import { useEffect, useRef, useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { useImportDialog } from './useImportDialog';
type Question = { title: string; description: string; reason?: boolean; minimum?: number };
type Answer = { reason: string } | null;
export function useImportActionDialog(isArabic: boolean) {
  const [question, setQuestion] = useState<Question | null>(null),
    [reason, setReason] = useState('');
  const pending = useRef<((answer: Answer) => void) | null>(null);
  const settle = (answer: Answer) => {
    const resolve = pending.current;
    pending.current = null;
    setQuestion(null);
    resolve?.(answer);
  };
  const ref = useImportDialog(Boolean(question), () => settle(null));
  useEffect(
    () => () => {
      const resolve = pending.current;
      pending.current = null;
      resolve?.(null);
    },
    [],
  );
  const ask = (value: Question): Promise<Answer> => {
    if (pending.current) return Promise.resolve(null);
    setReason('');
    setQuestion(value);
    return new Promise((resolve) => {
      pending.current = resolve;
    });
  };
  const valid = !question?.reason || reason.trim().length >= (question.minimum ?? 0);
  return {
    ask,
    actionDialog: question && (
      <div
        className="import-action-overlay"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) settle(null);
        }}
      >
        <section
          ref={ref}
          className="import-action-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="import-action-title"
          aria-describedby="import-action-description"
          tabIndex={-1}
        >
          <header>
            <h2 id="import-action-title">
              <ShieldCheck size={19} />
              {question.title}
            </h2>
            <button
              type="button"
              aria-label={isArabic ? 'إغلاق التأكيد' : 'Close confirmation'}
              onClick={() => settle(null)}
            >
              <X size={18} />
            </button>
          </header>
          <p id="import-action-description">{question.description}</p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (valid) settle({ reason: reason.trim() });
            }}
          >
            {question.reason && (
              <label>
                {isArabic ? 'سبب الإجراء' : 'Action reason'}
                <textarea
                  value={reason}
                  maxLength={1000}
                  minLength={question.minimum ?? 0}
                  required={Boolean(question.minimum)}
                  onChange={(event) => setReason(event.target.value)}
                />
              </label>
            )}
            <footer>
              <button type="button" onClick={() => settle(null)}>
                {isArabic ? 'تراجع' : 'Cancel'}
              </button>
              <button type="submit" className="import-confirm" disabled={!valid}>
                {isArabic ? 'تأكيد الإجراء' : 'Confirm action'}
              </button>
            </footer>
          </form>
        </section>
      </div>
    ),
  };
}
