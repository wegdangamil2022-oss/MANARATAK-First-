import { useEffect, useRef, useState } from 'react';
import { adminApiClient } from '../../api/client';
import { useTranslation } from '../../i18n/I18nProvider';
import { useAdminAuthorization } from '../../security/AdminAuthorizationContext';
import { CanonicalPicker } from '../../components/CanonicalPicker';
type LinkRow = {
  testId: string;
  status: 'PENDING' | 'APPROVED' | 'REVOKED';
  version: number;
  ownerRevision: string;
  testRevision: string;
};
export function TestDiscoveryEditor({
  ownerType,
  ownerKey,
}: {
  ownerType: 'STUDENT_TOOLS' | 'SERVICES';
  ownerKey: string;
}) {
  const { language } = useTranslation(),
    { hasPermission } = useAdminAuthorization(),
    en = language === 'en';
  const tool = ownerType === 'STUDENT_TOOLS',
    base = `/admin/${tool ? 'student-tools' : 'services'}/${encodeURIComponent(ownerKey)}/test-discovery`;
  const canView = hasPermission(tool ? 'admin:student-tools:view' : 'admin:services:manage'),
    canPropose = hasPermission(
      tool ? 'admin:student-tools:manage-availability' : 'admin:services:manage',
    ),
    canReview = hasPermission(
      tool ? 'admin:student-tools:approve-release' : 'admin:services:manage',
    );
  const [rows, setRows] = useState<LinkRow[]>([]),
    [testId, setTestId] = useState<string | null>(null),
    [reason, setReason] = useState(''),
    [after, setAfter] = useState<string | undefined>(),
    [next, setNext] = useState<string | null>(null),
    [refresh, setRefresh] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(false);
  const generation = useRef(0);
  useEffect(() => {
    const current = ++generation.current,
      controller = new AbortController();
    setRows([]);
    setNext(null);
    setError(false);
    if (!canView) return;
    void adminApiClient
      .request<{ data: { data: LinkRow[]; hasMore: boolean; nextCursor: string | null } }>(
        `${base}${after ? `?after=${encodeURIComponent(after)}` : ''}`,
        { signal: controller.signal, cache: 'no-store' },
      )
      .then((raw) => {
        if (current !== generation.current) return;
        if (!Array.isArray(raw.data?.data)) throw new Error('INVALID_DISCOVERY_RESPONSE');
        setRows(raw.data.data);
        setNext(raw.data.nextCursor);
      })
      .catch(() => {
        if (current === generation.current && !controller.signal.aborted) setError(true);
      });
    return () => {
      ++generation.current;
      controller.abort();
    };
  }, [base, after, refresh, canView]);
  useEffect(() => {
    setAfter(undefined);
    setTestId(null);
    setReason('');
  }, [base]);
  async function mutate(path: string, body: object) {
    if (busy) return;
    const current = generation.current;
    setBusy(true);
    setError(false);
    try {
      await adminApiClient.request(`${base}${path}`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (current === generation.current) setRefresh((v) => v + 1);
    } catch {
      if (current === generation.current) setError(true);
    } finally {
      setBusy(false);
    }
  }
  if (!canView) return null;
  return (
    <section className="border rounded-xl p-4 space-y-3">
      <h3>{en ? 'Reviewed test discovery links' : 'روابط الاختبارات المعتمدة للاكتشاف'}</h3>
      <p>
        {en
          ? 'Opt in from this owner. Another reviewer must approve. Owner or test revision changes require a new proposal.'
          : 'الربط اختياري من هذا المالك، ويعتمده مراجع آخر. تغيّر إصدار المالك أو الاختبار يستلزم اقتراحًا جديدًا.'}
      </p>
      {error && (
        <p role="alert">
          {en
            ? 'Could not load or save links. Check permissions, current revisions and independent review.'
            : 'تعذرت قراءة الروابط أو حفظها. تحقق من الصلاحيات والإصدارات الحالية والمراجع المستقل.'}
        </p>
      )}
      <CanonicalPicker
        label={en ? 'Published test' : 'اختبار منشور'}
        value={testId}
        onChange={setTestId}
        disabled={busy || !canPropose}
        paged
        load={async (query = '', page = 1) => {
          const result = await adminApiClient.request<{
            data: Array<{
              id: string;
              displayName?: string;
              localizedNameAr?: string;
              localizedNameEn?: string;
              canonicalName: string;
            }>;
          }>(
            `/public/international-tests?locale=${en ? 'en' : 'ar'}&searchQuery=${encodeURIComponent(query)}&page=${page}&pageSize=20`,
            { cache: 'no-store' },
          );
          return result.data.map((row) => ({
            id: row.id,
            label:
              row.displayName ??
              (en ? row.localizedNameEn : row.localizedNameAr) ??
              row.canonicalName,
            lifecycle: 'PUBLISHED',
            active: true,
          }));
        }}
      />
      <label>
        {en ? 'Review reason' : 'سبب المراجعة'}
        <input value={reason} maxLength={2000} onChange={(e) => setReason(e.target.value)} />
      </label>
      <button
        type="button"
        disabled={busy || !canPropose || !testId || reason.trim().length < 3}
        onClick={() => {
          if (!testId || !canPropose || reason.trim().length < 3) return;
          void mutate('', {
            testId,
            expectedVersion: rows.find((row) => row.testId === testId)?.version ?? 0,
            reason,
          });
        }}
      >
        {en ? 'Propose link / opt in' : 'اقتراح الرابط / الموافقة على الاكتشاف'}
      </button>
      <button type="button" disabled={busy} onClick={() => setRefresh((v) => v + 1)}>
        {en ? 'Refresh' : 'تحديث'}
      </button>
      <ul>
        {rows.map((row) => (
          <li key={row.testId} className="border p-2">
            <span>
              {row.testId} ·{' '}
              {row.status === 'APPROVED'
                ? en
                  ? 'Approved'
                  : 'معتمد'
                : row.status === 'PENDING'
                  ? en
                    ? 'Pending independent review'
                    : 'بانتظار المراجع المستقل'
                  : en
                    ? 'Revoked'
                    : 'مسحوب'}
            </span>
            <button
              type="button"
              disabled={busy || !canReview || row.status !== 'PENDING' || reason.trim().length < 3}
              onClick={() => {
                if (canReview && reason.trim().length >= 3)
                  void mutate(`/${encodeURIComponent(row.testId)}/approve`, {
                    expectedVersion: row.version,
                    reason,
                  });
              }}
            >
              {en ? 'Approve' : 'اعتماد'}
            </button>
            <button
              type="button"
              disabled={busy || !canPropose || row.status === 'REVOKED' || reason.trim().length < 3}
              onClick={() => {
                if (canPropose && reason.trim().length >= 3)
                  void mutate(`/${encodeURIComponent(row.testId)}/revoke`, {
                    expectedVersion: row.version,
                    reason,
                  });
              }}
            >
              {en ? 'Revoke' : 'سحب الرابط'}
            </button>
          </li>
        ))}
      </ul>
      <button type="button" disabled={busy || !after} onClick={() => setAfter(undefined)}>
        {en ? 'First page' : 'الصفحة الأولى'}
      </button>
      <button type="button" disabled={busy || !next} onClick={() => setAfter(next ?? undefined)}>
        {en ? 'Next links' : 'الروابط التالية'}
      </button>
    </section>
  );
}
