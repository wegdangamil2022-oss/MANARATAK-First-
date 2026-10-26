import { useAdministrationDraftGuard } from './useAdministrationDraftGuard';
import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
export function ReferenceDialog({
  title,
  dirty,
  busy,
  close,
  children,
  isAr,
}: {
  title: string;
  dirty: boolean;
  busy: boolean;
  close: () => void;
  children: ReactNode;
  isAr: boolean;
}) {
  useAdministrationDraftGuard(dirty, isAr);
  const ref = useRef<HTMLDivElement>(null),
    state = useRef({ dirty, busy, close });
  state.current = { dirty, busy, close };
  const requestClose = () => {
    if (state.current.busy) return;
    if (
      state.current.dirty &&
      !window.confirm(isAr ? 'تجاهل التعديلات غير المحفوظة؟' : 'Discard unsaved changes?')
    )
      return;
    state.current.close();
  };
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null,
      overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        requestClose();
      }
      if (e.key === 'Tab') {
        const nodes = ref.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]',
        );
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first || document.activeElement === ref.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    const warn = (e: BeforeUnloadEvent) => {
      if (state.current.dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    document.addEventListener('keydown', onKey);
    window.addEventListener('beforeunload', warn);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('beforeunload', warn);
      previous?.focus();
    };
  }, []);
  return createPortal(
    <div className="reference-dialog-overlay">
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        dir={isAr ? 'rtl' : 'ltr'}
        className="reference-workspace reference-record-dialog"
      >
        <header className="reference-dialog-header">
          <h2>{title}</h2>
          <button
            type="button"
            disabled={busy}
            onClick={requestClose}
            aria-label={isAr ? 'إغلاق التفاصيل' : 'Close details'}
          >
            <X />
          </button>
        </header>
        {children}
      </div>
    </div>,
    document.body,
  );
}
