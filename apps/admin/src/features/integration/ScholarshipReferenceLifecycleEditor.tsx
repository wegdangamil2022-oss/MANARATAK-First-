import { useEffect, useRef, useState } from 'react';
import { adminApiClient } from '../../api/client';
import { useTranslation } from '../../i18n/I18nProvider';
type Transition = {
  id: string;
  sourceRevision: number;
  changeType: string;
  targetOwnerId: string | null;
  status: string;
  proposedBy: string;
  reviewedBy: string | null;
  reason: string;
};
export function ScholarshipReferenceLifecycleEditor({
  ownerId,
  onChanged,
}: {
  ownerId: string;
  onChanged: () => void;
}) {
  const { language } = useTranslation(),
    en = language === 'en';
  const [rows, setRows] = useState<Transition[]>([]),
    [kind, setKind] = useState<'MERGE' | 'TOMBSTONE' | 'RESTORE'>('MERGE'),
    [target, setTarget] = useState(''),
    [choices, setChoices] = useState<Array<{ id: string; displayName: string }>>([]),
    [search, setSearch] = useState(''),
    [after, setAfter] = useState<string | undefined>(),
    [next, setNext] = useState<string | null>(null),
    [reason, setReason] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [refresh, setRefresh] = useState(0),
    generation = useRef(0);
  useEffect(() => {
    const request = ++generation.current,
      controller = new AbortController();
    setRows([]);
    setError('');
    void adminApiClient
      .request<{ data: Transition[] }>(
        `/admin/scholarships/${encodeURIComponent(ownerId)}/reference-transitions`,
        { signal: controller.signal, cache: 'no-store' },
      )
      .then((value) => {
        if (request === generation.current) setRows(value.data);
      })
      .catch(() => {
        if (request === generation.current && !controller.signal.aborted)
          setError(en ? 'Could not load reference history.' : 'تعذر قراءة سجل المرجع.');
      });
    return () => {
      ++generation.current;
      controller.abort();
    };
  }, [ownerId, refresh, en]);
  useEffect(() => {
    const controller = new AbortController();
    setChoices([]);
    setNext(null);
    if (kind !== 'MERGE') return;
    const query = new URLSearchParams({
      limit: '20',
      ...(search ? { search } : {}),
      ...(after ? { cursor: after } : {}),
    });
    void adminApiClient
      .request<{ data: Array<{ id: string; displayName: string }>; nextCursor?: string | null }>(
        `/public/scholarships?${query}`,
        { signal: controller.signal, cache: 'no-store' },
      )
      .then((value) => {
        if (!controller.signal.aborted) {
          setChoices(value.data.filter((row) => row.id !== ownerId));
          setNext(value.nextCursor ?? null);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError(
            en ? 'Could not load published replacement choices.' : 'تعذر قراءة البدائل المنشورة.',
          );
      });
    return () => controller.abort();
  }, [ownerId, kind, search, after, en]);
  const command = async (transitionId?: string) => {
    if (reason.trim().length < 3) return;
    setBusy(true);
    setError('');
    const request = generation.current;
    try {
      await adminApiClient.request(
        `/admin/scholarships/${encodeURIComponent(ownerId)}/reference-transitions${transitionId ? `/${encodeURIComponent(transitionId)}/approve` : ''}`,
        {
          method: 'POST',
          headers: { 'X-Review-Reason': reason },
          body: JSON.stringify(
            transitionId
              ? {}
              : { changeType: kind, ...(kind === 'MERGE' ? { targetOwnerId: target } : {}) },
          ),
        },
      );
      if (request === generation.current) {
        setReason('');
        setRefresh((v) => v + 1);
        onChanged();
      }
    } catch (e) {
      if (request === generation.current)
        setError(e instanceof Error ? e.message : 'REFERENCE_CHANGE_FAILED');
    } finally {
      if (request === generation.current) setBusy(false);
    }
  };
  return (
    <section className="border rounded-xl p-4 my-4 space-y-3">
      <h3>{en ? 'Immutable reference lifecycle' : 'دورة حياة المرجع الثابت'}</h3>
      <p>
        {en
          ? 'These decisions need an independent reviewer. A merge retires this catalog entry and offers a published replacement; student cycles and history are never moved. Restore returns the same identity to draft review. Physical deletion is blocked.'
          : 'تحتاج هذه القرارات مراجعًا مستقلًا. الدمج يتقاعد بهذا السجل ويعرض بديلًا منشورًا؛ لا تُنقل دورات الطالب أو تاريخه. الاستعادة تعيد الهوية نفسها لمسودة مراجعة. الحذف الفعلي ممنوع.'}
      </p>
      <select
        aria-label={en ? 'Reference change' : 'تغيير المرجع'}
        value={kind}
        onChange={(e) => {
          setKind(e.target.value as typeof kind);
          setTarget('');
        }}
      >
        <option value="MERGE">{en ? 'Merge / approved replacement' : 'دمج / بديل معتمد'}</option>
        <option value="TOMBSTONE">
          {en ? 'Retire and preserve identity' : 'تقاعد مع حفظ الهوية'}
        </option>
        <option value="RESTORE">{en ? 'Restore to review' : 'استعادة للمراجعة'}</option>
      </select>
      {kind === 'MERGE' && (
        <>
          <input
            aria-label={en ? 'Search published replacement' : 'بحث عن بديل منشور'}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setAfter(undefined);
              setTarget('');
            }}
          />
          <select
            aria-label={en ? 'Published replacement' : 'البديل المنشور'}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          >
            <option value="">—</option>
            {choices.map((row) => (
              <option key={row.id} value={row.id}>
                {row.displayName}
              </option>
            ))}
          </select>
          <button type="button" disabled={!after || busy} onClick={() => setAfter(undefined)}>
            {en ? 'First choices' : 'أول البدائل'}
          </button>
          <button type="button" disabled={!next || busy} onClick={() => setAfter(next!)}>
            {en ? 'Next choices' : 'البدائل التالية'}
          </button>
        </>
      )}
      <label>
        {en ? 'Reason for this decision' : 'سبب القرار'}
        <textarea value={reason} maxLength={2000} onChange={(e) => setReason(e.target.value)} />
      </label>
      <button
        type="button"
        disabled={busy || reason.trim().length < 3 || (kind === 'MERGE' && !target)}
        onClick={() => void command()}
      >
        {en ? 'Propose for independent review' : 'اقتراح للمراجعة المستقلة'}
      </button>
      {error && <p role="alert">{error}</p>}
      <p>
        {en
          ? 'Most recent 20 decisions. A stale proposal must be proposed again after a source or target change.'
          : 'أحدث 20 قرارًا. إذا تغير المصدر أو الهدف يلزم اقتراح جديد بدل اعتماد اقتراح قديم.'}
      </p>
      <ul>
        {rows.map((row) => (
          <li key={row.id}>
            {row.changeType} — {row.status} — {row.reason}
            {row.status === 'PENDING' && (
              <button
                type="button"
                disabled={busy || reason.trim().length < 3}
                onClick={() => void command(row.id)}
              >
                {en ? 'Approve as independent reviewer' : 'اعتماد بصفتي مراجعًا مستقلًا'}
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
