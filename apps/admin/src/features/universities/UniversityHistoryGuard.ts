type Guard = (event: PopStateEvent) => void;
let active: Guard | null = null;
let boundWindow: Window | undefined;
const dispatch = (event: PopStateEvent) => active?.(event);
function install() {
  if (typeof window === 'undefined' || boundWindow === window) return;
  boundWindow?.removeEventListener('popstate', dispatch, true);
  boundWindow = window;
  boundWindow.addEventListener('popstate', dispatch, true);
}
// Install before the statically imported BrowserRouter mounts. A late
// page effect can otherwise run after the router has already changed routes.
install();
export function registerUniversityHistoryGuard(guard: Guard) {
  install();
  active = guard;
  return () => {
    if (active === guard) active = null;
  };
}
