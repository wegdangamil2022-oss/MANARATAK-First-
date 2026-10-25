import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useCourseCopy } from './useCourseCopy';
import { useCourseDraftGuard } from './useCourseDraftGuard';

export function CourseDialog({ title, children, onClose, dirty = false }: { title: string; children: ReactNode; onClose: () => void; dirty?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const { tr } = useCourseCopy();
  useCourseDraftGuard(dirty);
  const close = () => { if (!dirty || window.confirm(tr('توجد تعديلات غير محفوظة. هل تريد مغادرتها؟', 'Discard unsaved changes?'))) onClose(); };
  useEffect(() => {
    const prior = document.activeElement;
    const node = dialog.current; node?.showModal();
    const old = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { node?.close(); document.body.style.overflow = old; if (prior instanceof HTMLElement) prior.focus(); };
  }, []);
  return <dialog ref={dialog} className="course-dialog" aria-labelledby={titleId} onCancel={event => { event.preventDefault(); close(); }}>
    <header><h2 id={titleId}>{title}</h2><button type="button" aria-label={tr('إغلاق', 'Close')} onClick={close}><X size={20}/></button></header>
    <div className="course-dialog-body">{children}</div>
  </dialog>;
}
