import { useEffect } from 'react';
/** A same-URL fence lets a Back action ask before the router reaches another page. */
export function useCourseNavigationGuard(dirty: boolean, confirmLeave: () => boolean) {
  useEffect(() => {
    if (!dirty) return;
    const url = window.location.href;
    const state = window.history.state;
    const token = crypto.randomUUID();
    window.history.pushState({ ...state, courseEditorFence: token }, '', url);
    let handling = false;
    const pop = () => {
      if (
        handling ||
        window.location.href !== url ||
        window.history.state?.courseEditorFence === token
      )
        return;
      if (confirmLeave()) {
        window.removeEventListener('popstate', pop);
        handling = true;
        window.history.back();
      } else {
        handling = true;
        window.history.forward();
        queueMicrotask(() => {
          handling = false;
        });
      }
    };
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, [dirty]);
}
