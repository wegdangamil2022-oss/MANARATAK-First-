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
// Register before BrowserRouter mounts so a rejected Back preserves the editor.
install();
export function registerCourseHistoryGuard(guard: Guard) {
  install(); active = guard;
  return () => { if (active === guard) active = null; };
}
