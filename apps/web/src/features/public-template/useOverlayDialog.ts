import {useEffect, useRef} from 'react';

/** Shared keyboard/focus behavior for the existing drawer and modal designs. */
export function useOverlayDialog(open: boolean, onClose: () => void, id: string) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!open) return;
    const dialog = document.getElementById(id);
    if (!dialog) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    const background = Array.from(document.querySelectorAll<HTMLElement>('#manaratak-header, #manaratak-bottom-nav, .manaratak-public > main'));
    const previousInert = background.map(element => element.inert);
    background.forEach(element => {element.inert = true;});
    document.body.style.overflow = 'hidden';
    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select, textarea, [tabindex="0"]')).filter(element => element.getClientRects().length);
    (focusable()[0] || dialog).focus({preventScroll: true});
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {event.preventDefault(); close.current();}
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (!items.length) {event.preventDefault(); dialog.focus(); return;}
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {event.preventDefault(); last.focus();}
      else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {event.preventDefault(); first.focus();}
    };
    document.addEventListener('keydown', keyboard);
    return () => {
      document.removeEventListener('keydown', keyboard);
      document.body.style.overflow = previousOverflow;
      background.forEach((element, index) => {element.inert = previousInert[index];});
      if (previousFocus?.isConnected) previousFocus.focus({preventScroll: true});
    };
  }, [open, id]);
}

