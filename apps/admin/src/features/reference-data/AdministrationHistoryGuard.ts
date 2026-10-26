type Guard = (event: PopStateEvent) => void;
let active: Guard | null = null;
let bound: Window | undefined;
const dispatch = (event: PopStateEvent) => active?.(event);
function install() {
  if (typeof window === 'undefined' || bound === window) return;
  bound?.removeEventListener('popstate', dispatch, true);
  bound = window;
  bound.addEventListener('popstate', dispatch, true);
}
// Imported by both workspaces before BrowserRouter mounts.
install();
export function registerAdministrationHistoryGuard(guard: Guard) {
  install();
  active = guard;
  return () => {
    if (active === guard) active = null;
  };
}
