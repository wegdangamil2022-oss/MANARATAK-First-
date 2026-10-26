import { useEffect, useRef, useState } from 'react';
import { saveMajorContent } from './MajorContentCommands';
interface Block {
  id?: string;
  sectionKey: string;
  locale?: string;
  title?: string;
  content: string;
  profileId?: string;
  versionId?: string;
  reviewStatus?: string;
  metadata?: Record<string, unknown>;
}
export function MajorUnassignedContent({
  block,
  groups,
  majorId,
  profileId,
  versionId,
  revision,
  canEdit,
  canAssign,
  onDirty,
  onSaved,
}: {
  block: Block;
  groups: Array<{ number: number; title: string }>;
  majorId: string;
  profileId: string;
  versionId?: string;
  revision?: number;
  canEdit: boolean;
  canAssign: boolean;
  onDirty: (dirty: boolean) => void;
  onSaved: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false),
    [content, setContent] = useState(block.content),
    [title, setTitle] = useState(block.title ?? '');
  const [group, setGroup] = useState(''),
    [source, setSource] = useState(''),
    [reason, setReason] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const dirty =
    editing &&
    (content !== block.content ||
      title !== (block.title ?? '') ||
      Boolean(group || source || reason));
  const dirtyCallback = useRef(onDirty);
  dirtyCallback.current = onDirty;
  useEffect(() => {
    dirtyCallback.current(dirty);
    return () => dirtyCallback.current(false);
  }, [dirty]);
  return (
    <section className="space-y-2 py-3">
      <h4 className="font-bold">{block.title || block.sectionKey}</h4>
      <p className="whitespace-pre-wrap">{!editing && block.content}</p>
      <dl className="grid gap-1 text-[11px] sm:grid-cols-2">
        {Object.entries({
          sectionKey: block.sectionKey,
          sourceMainTitle: block.metadata?.sourceMainTitle,
          sourceLevel: block.metadata?.sourceLevel,
          locale: block.locale ?? 'ar',
          profileId: block.profileId,
          versionId: block.versionId,
          source: block.metadata?.authoringEvidence ?? block.metadata?.sourceUri,
          reviewStatus: block.reviewStatus,
        }).map(([key, value]) => (
          <div key={key} className="min-w-0 [overflow-wrap:anywhere]">
            <dt className="inline text-slate-500">{key}: </dt>
            <dd className="inline">
              {value == null
                ? '—'
                : typeof value === 'object'
                  ? JSON.stringify(value)
                  : String(value)}
            </dd>
          </div>
        ))}
      </dl>
      {!editing ? (
        <button
          type="button"
          disabled={!canEdit || !versionId || block.versionId !== versionId}
          onClick={() => setEditing(true)}
          className="min-h-10 rounded-lg border px-3"
        >
          تعديل / تحديد القسم
        </button>
      ) : (
        <form
          className="space-y-3"
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
                    id: block.id,
                    sectionKey: block.sectionKey,
                    locale: block.locale ?? 'ar',
                    title,
                    content,
                    reviewStatus: 'NEEDS_REVIEW',
                    ...(group ? { groupNumber: Number(group), sourceUri: source } : {}),
                  },
                ],
              });
              dirtyCallback.current(false);
              setEditing(false);
              await onSaved();
            } catch (error) {
              setError(error instanceof Error ? error.message : 'تعذر الحفظ.');
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="block">
            العنوان
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className="block">
            المحتوى
            <textarea
              rows={5}
              value={content}
              onChange={(event) => setContent(event.target.value)}
            />
          </label>
          {canAssign && (
            <>
              <label className="block">
                المجموعة المعتمدة
                <select value={group} onChange={(event) => setGroup(event.target.value)}>
                  <option value="">يبقى غير معين</option>
                  {groups.map((item) => (
                    <option key={item.number} value={item.number}>
                      {item.number}. {item.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                دليل تحديد المجموعة
                <input
                  type="url"
                  required={Boolean(group)}
                  value={source}
                  onChange={(event) => setSource(event.target.value)}
                />
              </label>
            </>
          )}
          <label className="block">
            مبرر التغيير
            <textarea
              required
              value={reason}
              maxLength={2000}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          {error && (
            <p role="alert" className="text-red-700">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              disabled={busy || !canEdit || !reason.trim()}
              className="min-h-10 rounded-lg bg-[#0E7C86] px-3 text-white"
            >
              حفظ للمراجعة
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (dirty && !window.confirm('إلغاء التعديلات غير المحفوظة؟')) return;
                setContent(block.content);
                setTitle(block.title ?? '');
                setReason('');
                setSource('');
                setGroup('');
                setEditing(false);
              }}
              className="min-h-10 rounded-lg border px-3"
            >
              إلغاء
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
