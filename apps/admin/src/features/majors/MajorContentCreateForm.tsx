import { useEffect, useRef, useState } from 'react';
import { Plus, Save, X } from 'lucide-react';
import { majorContentSlots } from '@manaratak/domain';
import { saveMajorContent } from './MajorContentCommands';
export function MajorContentCreateForm({
  majorId,
  profileId,
  versionId,
  revision,
  level,
  group,
  title,
  disabled,
  onSaved,
  onDirty,
}: {
  majorId: string;
  profileId: string;
  versionId?: string;
  revision?: number;
  level: string;
  group: number;
  title: string;
  disabled: boolean;
  onSaved: () => Promise<void>;
  onDirty: (dirty: boolean) => void;
}) {
  const slots = majorContentSlots(level, group);
  const [open, setOpen] = useState(false),
    [key, setKey] = useState(slots[0] ?? ''),
    [locale, setLocale] = useState('ar');
  const [heading, setHeading] = useState(title),
    [content, setContent] = useState(''),
    [status, setStatus] = useState('NEEDS_REVIEW');
  const [source, setSource] = useState(''),
    [reason, setReason] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const dirty = Boolean(open && (content || source || reason || heading !== title));
  const dirtyCallback = useRef(onDirty);
  dirtyCallback.current = onDirty;
  useEffect(() => {
    dirtyCallback.current(dirty);
    return () => dirtyCallback.current(false);
  }, [dirty]);
  const close = () => {
    if (!dirty || window.confirm('إلغاء مسودة المحتوى غير المحفوظة؟')) {
      setOpen(false);
      setContent('');
      setSource('');
      setReason('');
      setHeading(title);
    }
  };
  if (!open)
    return (
      <button
        type="button"
        disabled={disabled || !versionId || !slots.length}
        title={!versionId ? 'يلزم إنشاء نسخة عمل قابلة للتحرير' : undefined}
        onClick={() => setOpen(true)}
        className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-[#DDEFF2] px-3 text-[12px] font-bold text-[#0E7C86] disabled:opacity-50"
      >
        <Plus aria-hidden="true" size={16} />
        إضافة محتوى
      </button>
    );
  return (
    <form
      aria-label={'إضافة محتوى — ' + title}
      className="space-y-3 rounded-xl border border-[#DDEFF2] bg-white p-3"
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy || !versionId || revision === undefined) return;
        setBusy(true);
        setError('');
        try {
          await saveMajorContent({
            majorId,
            profileId,
            versionId,
            revision,
            reason,
            sections: [
              {
                sectionKey: key,
                locale,
                title: heading,
                content,
                reviewStatus: status,
                groupNumber: group,
                sourceUri: source,
              },
            ],
          });
          setOpen(false);
          setContent('');
          setSource('');
          setReason('');
          onDirty(false);
          await onSaved();
        } catch (error) {
          setError(error instanceof Error ? error.message : 'تعذر حفظ المحتوى.');
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          مفتاح القالب
          <select value={key} onChange={(event) => setKey(event.target.value)}>
            {slots.map((slot) => (
              <option key={slot}>{slot}</option>
            ))}
          </select>
        </label>
        <label>
          اللغة
          <select value={locale} onChange={(event) => setLocale(event.target.value)}>
            <option value="ar">العربية</option>
            <option value="en">English</option>
          </select>
        </label>
      </div>
      <label className="block">
        عنوان المحتوى
        <input
          required
          value={heading}
          maxLength={500}
          onChange={(event) => setHeading(event.target.value)}
        />
      </label>
      <label className="block">
        المحتوى
        <textarea
          required
          value={content}
          rows={6}
          maxLength={100000}
          onChange={(event) => setContent(event.target.value)}
        />
      </label>
      <label className="block">
        حالة المراجعة
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="NEEDS_REVIEW">بحاجة لمراجعة</option>
          <option value="INCOMPLETE">غير مكتمل</option>
          <option value="COMPLETE">مكتمل للتحقق؛ غير معتمد</option>
        </select>
      </label>
      <label className="block">
        مصدر التغيير
        <input
          required
          type="url"
          value={source}
          placeholder="https://"
          onChange={(event) => setSource(event.target.value)}
        />
      </label>
      <label className="block">
        مبرر الإضافة
        <textarea
          required
          maxLength={2000}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </label>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          disabled={busy || disabled || !reason.trim() || !source.trim()}
          className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-[#0E7C86] px-3 text-white"
        >
          <Save size={16} />
          {busy ? 'جارٍ الحفظ…' : 'حفظ المحتوى'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={close}
          className="inline-flex min-h-10 items-center gap-1 rounded-lg border px-3"
        >
          <X size={16} />
          إلغاء
        </button>
      </div>
    </form>
  );
}
