import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import { Pencil, Save, X, FileText } from 'lucide-react';

export const DestinationEditorContext = createContext({
  active: '',
  canEdit: false,
  busy: false,
  isAr: true,
  locale: 'ar' as 'ar' | 'en',
  reason: '',
  edit: (_id: string) => {},
  cancel: () => {},
  save: async () => {},
  setReason: (_value: string) => {},
});
export function DestinationCard({
  id,
  title,
  children,
  editor,
  translated = false,
}: {
  id: string;
  title: string;
  children: ReactNode;
  editor: ReactNode;
  translated?: boolean;
}) {
  const state = useContext(DestinationEditorContext),
    active = state.active === id;
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (new URLSearchParams(location.search).get('card') === id) heading.current?.focus();
  }, [id]);
  return (
    <section className="destination-content-card" id={'destination-card-' + id}>
      <header>
        <h3 ref={heading} tabIndex={-1}>
          <FileText aria-hidden="true" />
          {title}
        </h3>
        {!active && (
          <button
            type="button"
            disabled={
              !state.canEdit ||
              state.busy ||
              Boolean(state.active) ||
              (translated && state.locale === 'en')
            }
            onClick={() => state.edit(id)}
          >
            <Pencil aria-hidden="true" />
            {state.isAr ? 'تعديل' : 'Edit'}
          </button>
        )}
      </header>
      {active ? (
        <div className="destination-card-editor">
          {editor}
          <label>
            {state.isAr ? 'سبب التعديل' : 'Change reason'}
            <input value={state.reason} onChange={(e) => state.setReason(e.target.value)} />
          </label>
          <footer>
            <button
              type="button"
              disabled={state.busy || !state.reason.trim()}
              onClick={() => void state.save()}
            >
              <Save aria-hidden="true" />
              {state.isAr ? 'حفظ البطاقة' : 'Save card'}
            </button>
            <button type="button" disabled={state.busy} onClick={state.cancel}>
              <X aria-hidden="true" />
              {state.isAr ? 'إلغاء' : 'Cancel'}
            </button>
          </footer>
        </div>
      ) : (
        <div
          className="destination-card-reading"
          lang={translated ? state.locale : undefined}
          dir={translated ? (state.locale === 'ar' ? 'rtl' : 'ltr') : undefined}
        >
          {children}
        </div>
      )}
      {translated && state.locale === 'en' && (
        <p className="destination-muted">
          {state.isAr
            ? 'عرض الإنجليزية فقط؛ تحرير الترجمة غير متاح وفق السياسة الحالية.'
            : 'English is read-only under the current translation policy.'}
        </p>
      )}
    </section>
  );
}
