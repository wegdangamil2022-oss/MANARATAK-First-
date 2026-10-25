import { useEffect } from 'react';
import { registerMajorHistoryGuard } from './MajorHistoryGuard';
export function useMajorDraftGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const index = window.history.state?.idx;
    let restoring = false,
      approved = false,
      pendingDelta = 0;
    const confirm = () => window.confirm('لديك تعديلات غير محفوظة. هل تريد المغادرة دون حفظ؟');
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
          window.history.go(-pendingDelta);
        }
        return;
      }
      pendingDelta = index - event.state.idx;
      if (pendingDelta) {
        restoring = true;
        window.history.go(pendingDelta);
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
      } else approved = true;
    };
    const unregister = registerMajorHistoryGuard(pop);
    window.addEventListener('beforeunload', unload);
    document.addEventListener('click', click, true);
    return () => {
      unregister();
      window.removeEventListener('beforeunload', unload);
      document.removeEventListener('click', click, true);
    };
  }, [dirty]);
}
