import { useState, useRef, useEffect } from 'react';
import { Copy, X } from 'lucide-react';
import type { CourseDto } from '@manaratak/domain';
import { reviewReasonHeaders } from '@manaratak/shared';
import { adminApiClient } from '../../api/client';
import { useCourseCopy } from './useCourseCopy';

export function NativeCourseCopyDialog({
  course,
  onClose,
  onCreated,
}: {
  course: CourseDto;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { tr } = useCourseCopy(),
    dialog = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState(course.displayName + tr(' — نسخة', ' — copy'));
  const [reason, setReason] = useState(''),
    [media, setMedia] = useState(true),
    [rights, setRights] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="course-dialog native-copy-dialog"
      aria-labelledby="native-copy-title"
      onCancel={(event) => {
        if (busy) event.preventDefault();
        else onClose();
      }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (busy) return;
          setBusy(true);
          setError('');
          void adminApiClient
            .request<CourseDto>(`/admin/courses/${course.id}/duplicate`, {
              method: 'POST',
              headers: { 'If-Match': String(course.version), ...reviewReasonHeaders(reason) },
              body: JSON.stringify({
                titleAr: title,
                includeAssets: media,
                acknowledgeAssetRights: rights,
              }),
            })
            .then((result) => onCreated(result.id))
            .catch((error) => setError(String(error.message)))
            .finally(() => setBusy(false));
        }}
      >
        <header>
          <h2 id="native-copy-title">
            <Copy size={18} />
            {tr('نسخ الدورة إلى مسودة جديدة', 'Copy course to a new draft')}
          </h2>
          <button type="button" disabled={busy} onClick={onClose} aria-label={tr('إغلاق', 'Close')}>
            <X size={18} />
          </button>
        </header>
        <p>
          {tr(
            'ستنسخ المنهج والأسئلة بمعرفات جديدة. لن تُنسخ تسجيلات الطلاب أو التقدم أو المدفوعات أو الشهادات أو الصلاحيات أو ربط جهة إصدار. يلزم فحص جاهزية المسودة واعتمادها قبل النشر.',
            'Copies curriculum and questions with new IDs. Enrollments, progress, payments, certificates, permissions and issuer bindings are excluded. The draft needs a fresh readiness review before publication.',
          )}
        </p>
        <fieldset disabled={busy}>
          <label className="course-field">
            <span>{tr('اسم النسخة بالعربية', 'Copy name in Arabic')}</span>
            <input
              required
              minLength={2}
              maxLength={500}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label className="course-field">
            <span>{tr('سبب النسخ', 'Copy reason')}</span>
            <input
              required
              minLength={3}
              maxLength={2000}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={media}
              onChange={(event) => setMedia(event.target.checked)}
            />
            {tr(
              'تضمين مراجع الملفات والغلاف الأصلية',
              'Include original media references and cover',
            )}
          </label>
          {media ? (
            <label>
              <input
                type="checkbox"
                required
                checked={rights}
                onChange={(event) => setRights(event.target.checked)}
              />
              {tr(
                'راجعت حقوق إعادة استخدام الملفات؛ الملفات مشتركة وليست نسخًا مستقلة، وتظل صلاحية وصولها محكومة بخدمة الأصول.',
                'I reviewed reuse rights. Files remain shared references, not independent copies; access is controlled by the asset service.',
              )}
            </label>
          ) : (
            <p>
              {tr(
                'ستُستبعد الملفات والغلاف وكتل الوسائط المرتبطة بها؛ تُحفظ النصوص والتقييمات.',
                'Attachments, cover and their media blocks are excluded; text and assessments remain.',
              )}
            </p>
          )}
          <button type="submit" className="course-primary" disabled={busy}>
            {busy ? tr('جارٍ النسخ…', 'Copying…') : tr('إنشاء النسخة', 'Create copy')}
          </button>
        </fieldset>
        {error && (
          <p role="alert" className="course-error">
            {error}
          </p>
        )}
      </form>
    </dialog>
  );
}

export function NativeCurriculumCopyDialog({
  kind,
  id,
  command,
  onClose,
}: {
  kind: 'modules' | 'lessons';
  id: string;
  command: (path: string, body: object) => Promise<unknown>;
  onClose: () => void;
}) {
  const { tr } = useCourseCopy(),
    dialog = useRef<HTMLDialogElement>(null);
  const [media, setMedia] = useState(true),
    [rights, setRights] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="course-dialog native-copy-dialog"
      aria-labelledby="curriculum-copy-title"
      onCancel={(event) => {
        if (busy) event.preventDefault();
        else onClose();
      }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (busy) return;
          setBusy(true);
          setError('');
          void command(`${kind}/${id}/duplicate`, {
            includeAssets: media,
            acknowledgeAssetRights: rights,
          })
            .then(onClose)
            .catch((error) => setError(String(error.message)))
            .finally(() => setBusy(false));
        }}
      >
        <h2 id="curriculum-copy-title">
          {kind === 'modules'
            ? tr('نسخ الوحدة ومحاضراتها', 'Copy module and lectures')
            : tr('نسخ المحاضرة', 'Copy lecture')}
        </h2>
        <p>
          {tr(
            'ستُنشأ عناصر مسودة بمعرفات جديدة دون تقدم أو محاولات طلاب. الملفات تبقى مراجع مشتركة ويتحقق الخادم من صلاحيتها.',
            'Creates draft content with new IDs, without learner progress or attempts. Files remain shared references and their eligibility is checked by the server.',
          )}
        </p>
        <fieldset disabled={busy}>
          <label>
            <input
              type="checkbox"
              checked={media}
              onChange={(event) => setMedia(event.target.checked)}
            />
            {tr('تضمين مراجع الملفات', 'Include attachment references')}
          </label>
          {media && (
            <label>
              <input
                type="checkbox"
                required
                checked={rights}
                onChange={(event) => setRights(event.target.checked)}
              />
              {tr(
                'راجعت حق إعادة استخدام الملفات في النسخة.',
                'I reviewed the right to reuse the attachments in this copy.',
              )}
            </label>
          )}
          <button type="submit" className="course-primary">
            {busy ? tr('جارٍ النسخ…', 'Copying…') : tr('تأكيد النسخ', 'Confirm copy')}
          </button>
          <button type="button" disabled={busy} onClick={onClose}>
            {tr('إلغاء', 'Cancel')}
          </button>
        </fieldset>
        {error && (
          <p role="alert" className="course-error">
            {error}
          </p>
        )}
      </form>
    </dialog>
  );
}
