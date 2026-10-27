import { useCallback, useEffect, useRef, useState } from 'react';
import { X, ShieldCheck } from 'lucide-react';
import { useTranslation } from '../../i18n/I18nProvider';

interface ActionRequest {
  title: string;
  description: string;
  fields?: { name: string; label: string; value?: string; type?: string; minLength?: number }[];
}

/** A single confirmation contract for versioned editorial actions. */
export function useCmsActionDialog() {
  const { language } = useTranslation();
  const [action, setAction] = useState<ActionRequest | null>(null);
  const resolver = useRef<((value: Record<string, string> | null) => void) | null>(null);
  const requestAction = (request: ActionRequest) =>
    new Promise<Record<string, string> | null>((resolve) => {
      resolver.current?.(null);
      resolver.current = resolve;
      setAction(request);
    });
  const finish = useCallback((value: Record<string, string> | null) => {
    resolver.current?.(value);
    resolver.current = null;
    setAction(null);
  }, []);
  useEffect(
    () => () => {
      resolver.current?.(null);
    },
    [],
  );
  return {
    requestAction,
    actionDialog: action ? (
      <CmsActionDialog action={action} finish={finish} ar={language === 'ar'} />
    ) : null,
  };
}

function CmsActionDialog({
  action,
  finish,
  ar,
}: {
  action: ActionRequest;
  finish: (value: Record<string, string> | null) => void;
  ar: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        finish(null);
      }
      if (event.key !== 'Tab') return;
      const nodes = ref.current?.querySelectorAll<HTMLElement>('button,input,textarea');
      if (!nodes?.length) return;
      const first = nodes[0],
        last = nodes[nodes.length - 1];
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === ref.current)
      ) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', keyboard);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', keyboard);
      previous?.focus();
    };
  }, [finish]);
  return (
    <div className="cms-dialog-overlay">
      <div
        ref={ref}
        className="cms-dialog"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cms-action-title"
        dir={ar ? 'rtl' : 'ltr'}
      >
        <header>
          <h2 id="cms-action-title">
            <ShieldCheck size={20} />
            {action.title}
          </h2>
          <button type="button" onClick={() => finish(null)} aria-label={ar ? 'إغلاق' : 'Close'}>
            <X size={18} />
          </button>
        </header>
        <p>{action.description}</p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            finish(
              Object.fromEntries(new FormData(event.currentTarget).entries()) as Record<
                string,
                string
              >,
            );
          }}
        >
          {action.fields?.map((field) => (
            <label key={field.name}>
              {field.label}
              <input
                name={field.name}
                type={field.type ?? 'text'}
                defaultValue={field.value}
                required
                minLength={field.minLength}
                maxLength={2000}
              />
            </label>
          ))}
          <footer>
            <button type="button" onClick={() => finish(null)}>
              {ar ? 'إلغاء' : 'Cancel'}
            </button>
            <button type="submit" className="cms-primary">
              {ar ? 'تأكيد ومتابعة' : 'Confirm and continue'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
