import { useEffect, useRef, useState } from 'react';
import {
  ShieldCheck,
  UserRoundCheck,
  ListChecks,
  Globe2,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  UnlockKeyhole,
  History,
  ArchiveRestore,
} from 'lucide-react';
import { AdminLink } from '../../components/AdminLink';
import { adminPaths } from '../../navigation/AdminRoutes';
import { adminApiClient } from '../../api/client';
import { ImportBatchEvidence } from './ImportBatchEvidence';

type RecordRow = { id: string; status?: string; updatedAt?: string };
type Batch = { id: string; batchStatus?: string; updatedAt?: string };
type Source = {
  sourceId: string;
  displayName: string;
  status: string;
  updatedAt?: string;
  metadata?: Record<string, unknown>;
};
type Assignment = {
  recordId: string;
  assigneeId: string;
  version: number;
  state: string;
  dueAt: string;
  ownerDomain: string;
};
type Observation = {
  sourceRevision: string;
  updatedAt: string;
  driftState: string;
  fallbackSourceId?: string;
};
const workspaces: Record<string, string> = {
  REFERENCE_DATA: adminPaths.referenceData,
  ACADEMIC_TAXONOMY: '/academic-taxonomy?view=imports',
  SCHOLARSHIPS: '/scholarships',
  UNIVERSITIES: '/universities',
  MAJORS: '/majors',
  COURSES: '/courses',
  TESTS: '/international-tests',
  INTERNATIONAL_TESTS: '/international-tests',
  SERVICES: '/services',
  CMS: '/cms',
};
export function importOwnerWorkspace(domain: string) {
  return workspaces[domain.toUpperCase()] ?? null;
}

export function ImportGovernancePanel({
  records,
  batches,
  sources,
  isArabic,
  onChanged,
}: {
  records: RecordRow[];
  batches: Batch[];
  sources: Source[];
  isArabic: boolean;
  onChanged?: () => Promise<void>;
}) {
  const text = (ar: string, en: string) => (isArabic ? ar : en);
  const [recordId, setRecordId] = useState(''),
    [batchId, setBatchId] = useState(''),
    [sourceId, setSourceId] = useState('');
  const [assignee, setAssignee] = useState(''),
    [due, setDue] = useState(''),
    [reason, setReason] = useState(''),
    [fallback, setFallback] = useState('');
  const [queue, setQueue] = useState<Assignment[]>([]),
    [page, setPage] = useState(1),
    [total, setTotal] = useState<number | null>(null);
  const [observation, setObservation] = useState<Observation | null>(null),
    [observed, setObserved] = useState(false);
  const [message, setMessage] = useState(''),
    [error, setError] = useState(false),
    [busy, setBusy] = useState(false);
  const lock = useRef(false),
    mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const refresh = async (targetPage = page) => {
    const result = await adminApiClient.request<{
      data: Assignment[];
      total: number;
      page: number;
    }>(`/admin/imports/review-queue?page=${targetPage}`);
    if (mounted.current) {
      setQueue(result.data);
      setTotal(result.total);
      setPage(result.page);
    }
  };
  const perform = async (task: () => Promise<void>, mutation = false) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setMessage('');
    setError(false);
    let completed = false;
    try {
      await task();
      completed = true;
      if (mutation) await onChanged?.();
      if (mounted.current)
        setMessage(
          text(
            mutation ? 'حُفظ الإجراء مع سجل التدقيق.' : 'تم تحميل البيانات من المصدر.',
            mutation ? 'Command saved with its audit trail.' : 'Data loaded from the source.',
          ),
        );
    } catch (failure) {
      if (mounted.current) {
        setError(true);
        const raw = failure instanceof Error ? failure.message : '';
        setMessage(
          completed || raw === 'IMPORT_COMMAND_REFRESH_FAILED'
            ? text(
                'حُفظ الإجراء، لكن تعذر تحديث العرض. حدّث البيانات قبل إجراء جديد.',
                'Command saved, but refresh failed. Reload before another command.',
              )
            : /CONFLICT|\b409\b/.test(raw)
              ? text(
                  'تغيّرت البيانات لدى مستخدم آخر. أعد تحميلها قبل المحاولة.',
                  'Another user changed these records. Reload before retrying.',
                )
              : /403|MFA_/.test(raw)
                ? text(
                    'لم يُسمح بالإجراء. تحقق من الصلاحيات والمصادقة الإضافية.',
                    'Command denied. Check permissions and MFA verification.',
                  )
                : text(
                    'تعذر إتمام الطلب. تحقق من الإدخال وأعد تحميل البيانات.',
                    'Request failed. Check the input and reload the data.',
                  ),
        );
      }
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  const command = (path: string, body: Record<string, unknown>, after?: () => Promise<void>) =>
    perform(async () => {
      await adminApiClient.request('/admin/imports/' + path, {
        method: 'POST',
        body: JSON.stringify({ ...body, reason: reason.trim() }),
      });
      if (after) {
        try {
          await after();
        } catch {
          throw new Error('IMPORT_COMMAND_REFRESH_FAILED');
        }
      }
    }, true);
  const record = records.find((item) => item.id === recordId),
    batch = batches.find((item) => item.id === batchId);
  const assignment = queue.find((item) => item.recordId === recordId),
    validReason = reason.trim().length >= 3;
  const genericSources = sources.filter((item) => item.metadata?.ownerDomain === 'GENERIC');
  const date = (value: string) =>
    Number.isFinite(Date.parse(value))
      ? new Date(value).toLocaleString(isArabic ? 'ar' : 'en')
      : '—';
  const dueValid = Boolean(due && Number.isFinite(new Date(due).getTime()));
  return (
    <section
      id="review-assignments"
      className="import-tools space-y-4 rounded-2xl border border-[#DDEFF2] bg-white p-5"
    >
      <h2>
        <ShieldCheck size={19} />
        {text('المراجعة واسترداد الاستيراد', 'Import review and recovery')}
      </h2>
      <p className="import-hint">
        {text(
          'نظّم الإسناد والتتبع هنا؛ قبول البيانات ونشرها يتمان داخل القسم المالك.',
          'Manage assignment and traceability here; data acceptance and publication belong to the owner.',
        )}
      </p>
      <label className="import-reason">
        {text('سبب الإجراء', 'Action reason')}
        <input
          value={reason}
          minLength={3}
          maxLength={1000}
          onChange={(event) => setReason(event.target.value)}
          disabled={busy}
        />
        <span className="import-hint">
          {text(
            'ثلاثة أحرف على الأقل للإجراءات التي تغيّر البيانات.',
            'At least three characters for commands that change data.',
          )}
        </span>
      </label>
      {message && <p role={error ? 'alert' : 'status'}>{message}</p>}
      {busy && <p role="status">{text('جارٍ إتمام الطلب…', 'Working…')}</p>}
      <h3>
        <UserRoundCheck size={18} />
        {text('إسناد المراجعات', 'Review assignments')}
      </h3>
      <fieldset disabled={busy}>
        <label>
          {text('السجل ضمن الصفحة المحملة', 'Record on the loaded page')}
          <select value={recordId} onChange={(event) => setRecordId(event.target.value)}>
            <option value="">—</option>
            {records.map((item) => (
              <option key={item.id} value={item.id}>
                {item.id} ({item.status})
              </option>
            ))}
          </select>
        </label>
        <label>
          {text('معرّف المراجع', 'Reviewer identity ID')}
          <input
            value={assignee}
            maxLength={180}
            onChange={(event) => setAssignee(event.target.value)}
          />
        </label>
        <label>
          {text('موعد المراجعة بالتوقيت المحلي', 'Review due in local time')}
          <input
            type="datetime-local"
            value={due}
            onChange={(event) => setDue(event.target.value)}
          />
        </label>
        <button type="button" onClick={() => void perform(() => refresh(1))}>
          <RefreshCw size={17} />
          {text('تحميل طابور المراجعة', 'Load review queue')}
        </button>
        <button
          type="button"
          disabled={!record || !assignee.trim() || !dueValid || !validReason}
          onClick={() =>
            void command(
              `records/${encodeURIComponent(recordId)}/assignment`,
              {
                assigneeId: assignee.trim(),
                dueAt: new Date(due).toISOString(),
                expectedVersion: assignment?.version ?? 0,
              },
              () => refresh(),
            )
          }
        >
          <UserRoundCheck size={17} />
          {text('تعيين المراجع', 'Assign reviewer')}
        </button>
        <button
          type="button"
          disabled={!assignment || !validReason}
          onClick={() =>
            void command(
              `records/${encodeURIComponent(recordId)}/claim`,
              { expectedVersion: assignment?.version },
              () => refresh(),
            )
          }
        >
          <CheckCircle2 size={17} />
          {text('استلام المراجعة أو تجديدها', 'Claim or renew review')}
        </button>
        <button
          type="button"
          disabled={!assignment || !validReason}
          onClick={() =>
            void command(
              `records/${encodeURIComponent(recordId)}/release`,
              { expectedVersion: assignment?.version },
              () => refresh(),
            )
          }
        >
          <UnlockKeyhole size={17} />
          {text('إخلاء حجز المراجعة', 'Release review claim')}
        </button>
        <button
          type="button"
          disabled={!record?.updatedAt || !validReason}
          onClick={() =>
            void command(`records/${encodeURIComponent(recordId)}/reconcile-receipt`, {
              expectedUpdatedAt: record?.updatedAt,
            })
          }
        >
          <ArchiveRestore size={17} />
          {text('تسوية التسليم من الإيصال المحفوظ', 'Reconcile saved delivery receipt')}
        </button>
      </fieldset>
      {total !== null && (
        <>
          <ul className="import-review-list">
            {queue.map((item) => (
              <li key={item.recordId}>
                <button type="button" disabled={busy} onClick={() => setRecordId(item.recordId)}>
                  {item.recordId}
                </button>
                <span>{item.assigneeId}</span>
                <time>{date(item.dueAt)}</time>
                <span>{item.state}</span>
                {importOwnerWorkspace(item.ownerDomain) && (
                  <AdminLink to={importOwnerWorkspace(item.ownerDomain)!}>
                    <ExternalLink size={16} />
                    {text('فتح القسم المالك', 'Open owner workspace')}
                  </AdminLink>
                )}
              </li>
            ))}
          </ul>
          {!queue.length && (
            <p>{text('لا توجد مراجعات في هذه الصفحة.', 'No reviews on this page.')}</p>
          )}
          <div
            className="import-actions"
            aria-label={text('صفحات مراجعة الاستيراد', 'Import review pages')}
          >
            <span>
              {text('إجمالي المراجعات', 'Total reviews')}: {total} · {page} /{' '}
              {Math.max(1, Math.ceil(total / 50))}
            </span>
            <button
              type="button"
              disabled={busy || page <= 1}
              onClick={() => void perform(() => refresh(page - 1))}
            >
              {text('السابق', 'Previous reviews')}
            </button>
            <button
              type="button"
              disabled={busy || page >= Math.ceil(total / 50)}
              onClick={() => void perform(() => refresh(page + 1))}
            >
              {text('التالي', 'Next reviews')}
            </button>
          </div>
        </>
      )}
      <h3>
        <ListChecks size={18} />
        {text('أدلة الدفعة والاسترداد', 'Batch evidence and recovery')}
      </h3>
      <fieldset disabled={busy}>
        <label>
          {text('الدفعة', 'Batch')}
          <select value={batchId} onChange={(event) => setBatchId(event.target.value)}>
            <option value="">—</option>
            {batches.map((item) => (
              <option key={item.id} value={item.id}>
                {item.id}
              </option>
            ))}
          </select>
        </label>
        {(['QUEUE', 'REJECT'] as const).map((decision) => (
          <button
            key={decision}
            type="button"
            disabled={batch?.batchStatus !== 'CREATED' || !batch.updatedAt || !validReason}
            onClick={() =>
              void command(`batches/${encodeURIComponent(batchId)}/recover`, {
                expectedUpdatedAt: batch?.updatedAt,
                decision,
              })
            }
          >
            <ArchiveRestore size={17} />
            {decision === 'QUEUE'
              ? text('استرداد دفعة قديمة للطابور', 'Recover legacy batch to queue')
              : text('رفض دفعة قديمة مع حفظ الأدلة', 'Reject legacy batch and retain evidence')}
          </button>
        ))}
        <button
          type="button"
          disabled={!batch?.updatedAt || !validReason}
          onClick={() =>
            void command(`batches/${encodeURIComponent(batchId)}/retention-policy`, {
              expectedUpdatedAt: batch?.updatedAt,
              days: 365,
            })
          }
        >
          <History size={17} />
          {text('تعيين احتفاظ سنة للسجلات القديمة', 'Assign one year retention to legacy records')}
        </button>
      </fieldset>
      <ImportBatchEvidence key={batchId} batchId={batchId} isArabic={isArabic} />
      <h3>
        <Globe2 size={18} />
        {text('تغيّر المصدر والبديل', 'Source drift and fallback')}
      </h3>
      <fieldset disabled={busy}>
        <label>
          {text('المصدر العام', 'Generic source')}
          <select
            value={sourceId}
            onChange={(event) => {
              setSourceId(event.target.value);
              setObservation(null);
              setObserved(false);
              setFallback('');
            }}
          >
            <option value="">—</option>
            {genericSources.map((item) => (
              <option key={item.sourceId} value={item.sourceId}>
                {item.displayName}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={!sourceId}
          onClick={() =>
            void perform(async () => {
              const result = await adminApiClient.request<{ data: Observation | null }>(
                `/admin/imports/sources/${encodeURIComponent(sourceId)}/observation`,
              );
              if (mounted.current) {
                setObservation(result.data);
                setObserved(true);
                setFallback(result.data?.fallbackSourceId ?? '');
              }
            })
          }
        >
          <RefreshCw size={17} />
          {text('فحص تغير المصدر والبديل', 'Inspect source drift and fallback')}
        </button>
        {(['ACCEPT', 'REJECT'] as const).map((decision) => (
          <button
            key={decision}
            type="button"
            disabled={observation?.driftState !== 'REVIEW_REQUIRED' || !validReason}
            onClick={() =>
              void command(
                `sources/${encodeURIComponent(sourceId)}/drift-decision`,
                { expectedUpdatedAt: observation?.updatedAt, decision },
                async () => {
                  if (mounted.current) setObservation(null);
                },
              )
            }
          >
            {decision === 'ACCEPT'
              ? text('قبول البنية الجديدة', 'Accept new shape')
              : text('رفض البنية الجديدة', 'Reject new shape')}
          </button>
        ))}
        <label>
          {text('المصدر البديل المعتمد', 'Approved fallback source')}
          <select value={fallback} onChange={(event) => setFallback(event.target.value)}>
            <option value="">{text('إلغاء البديل', 'Remove fallback')}</option>
            {genericSources
              .filter((item) => item.sourceId !== sourceId && item.status === 'ACTIVE')
              .map((item) => (
                <option key={item.sourceId} value={item.sourceId}>
                  {item.displayName}
                </option>
              ))}
          </select>
        </label>
        <button
          type="button"
          disabled={!observation || !validReason}
          onClick={() =>
            void perform(async () => {
              const target = fallback
                ? (
                    await adminApiClient.request<{ data: Source }>(
                      `/admin/imports/sources/${encodeURIComponent(fallback)}`,
                    )
                  ).data
                : null;
              await adminApiClient.request(
                `/admin/imports/sources/${encodeURIComponent(sourceId)}/fallback`,
                {
                  method: 'POST',
                  body: JSON.stringify({
                    fallbackSourceId: fallback || null,
                    sourceRevision: observation?.sourceRevision,
                    fallbackSourceRevision: target?.updatedAt,
                    reason: reason.trim(),
                  }),
                },
              );
              if (mounted.current) setObservation(null);
            }, true)
          }
        >
          <CheckCircle2 size={17} />
          {text('حفظ قرار البديل', 'Save fallback decision')}
        </button>
      </fieldset>
      {observed && (
        <p>
          {observation
            ? text('حالة بنية المصدر: ', 'Source shape status: ') + observation.driftState
            : text(
                'لا توجد ملاحظة بنية متاحة؛ لا تُستنتج سلامة المصدر من ذلك.',
                'No shape observation is available; this does not establish source health.',
              )}
        </p>
      )}
    </section>
  );
}
