import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
export function TranslationRecordDialog({
  title,
  onClose,
  children,
  ar,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  ar: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null),
    close = useRef(onClose),
    titleId = useId();
  close.current = onClose;
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const prior = document.activeElement;
    const ownedScrollLock = !document.body.classList.contains('translation-dialog-open');
    document.body.classList.add('translation-dialog-open');
    panel.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close.current();
      }
      if (event.key === 'Tab') {
        const nodes = panel.current?.querySelectorAll<HTMLElement>(
          'a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]',
        );
        if (!nodes?.length) {
          event.preventDefault();
          panel.current?.focus();
          return;
        }
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (
          event.shiftKey &&
          (document.activeElement === first || document.activeElement === panel.current)
        ) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          (document.activeElement === last ||
            !panel.current?.contains(document.activeElement) ||
            document.activeElement === panel.current)
        ) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('keydown', key);
      if (ownedScrollLock) document.body.classList.remove('translation-dialog-open');
      if (prior instanceof HTMLElement && prior.isConnected) prior.focus();
    };
  }, []);
  return (
    <div className="translation-dialog-backdrop">
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="translation-dialog"
      >
        <header>
          <h2 id={titleId}>{title}</h2>
          <button
            type="button"
            aria-label={ar ? 'إغلاق المعاينة' : 'Close preview'}
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </button>
        </header>
        <div className="translation-dialog-body">{children}</div>
      </div>
    </div>
  );
}
