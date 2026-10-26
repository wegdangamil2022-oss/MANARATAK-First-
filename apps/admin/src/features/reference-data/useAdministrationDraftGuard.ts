import { useEffect, useRef } from 'react';
import { registerAdministrationHistoryGuard } from './AdministrationHistoryGuard';
export function useAdministrationDraftGuard(dirty: boolean, isAr: boolean, onDiscard?: () => void) {
  const discard = useRef(onDiscard);
  discard.current = onDiscard;
  useEffect(() => {
    if (!dirty) return;
    const index = window.history.state?.idx;
    let restoring = false,
      approved = false,
      delta = 0;
    const confirm = () =>
      window.confirm(
        isAr
          ? 'لديك تعديلات غير محفوظة. هل تريد المغادرة دون حفظ؟'
          : 'Leave without saving your changes?',
      );
    const unload = (event: BeforeUnloadEvent) => {
      if (!approved) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    const pop = (event: PopStateEvent) => {
      if (approved || !Number.isSafeInteger(index) || !Number.isSafeInteger(event.state?.idx))
        return;
      event.stopImmediatePropagation();
      if (restoring && event.state.idx === index) {
        restoring = false;
        if (confirm()) {
          approved = true;
          discard.current?.();
          window.history.go(-delta);
        }
        return;
      }
      delta = index - event.state.idx;
      if (delta) {
        restoring = true;
        window.history.go(delta);
      }
    };
    const click = (event: MouseEvent) => {
      const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (
        !(anchor instanceof HTMLAnchorElement) ||
        anchor.target === '_blank' ||
        event.defaultPrevented ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        anchor.href === location.href
      )
        return;
      if (!confirm()) {
        event.preventDefault();
        event.stopPropagation();
      } else {
        approved = true;
        discard.current?.();
      }
    };
    const unregister = registerAdministrationHistoryGuard(pop);
    window.addEventListener('beforeunload', unload);
    document.addEventListener('click', click, true);
    return () => {
      unregister();
      window.removeEventListener('beforeunload', unload);
      document.removeEventListener('click', click, true);
    };
  }, [dirty, isAr]);
}
