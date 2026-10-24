import { useEffect, useRef, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  UserCheck,
  Users,
  MessageSquare,
  History,
  ShieldCheck,
  Flag,
  FileSearch,
  Copy,
  RefreshCw,
} from 'lucide-react';
import type { ReviewRecord, ReviewCommand, ReviewHistory } from '@manaratak/shared';
import { createAdminIdempotencyKey, adminApiClient } from '../../api/client';
import { auditQuery, parseAuditPreview } from './ReviewLoader';
import { workRequest, ownerEvidenceItem } from './WorkspaceData';
import { displayDate, labelFor, textFor, workspaceError } from './WorkspaceText';
export function WorkspacePreview({
  language,
  row,
  close,
  move,
  canPrevious,
  canNext,
  command,
  canCoordinate,
  hasPermission,
  busy,
}: {
  language: string;
  row: ReviewRecord;
  close: () => void;
  move: (delta: number) => void;
  canPrevious: boolean;
  canNext: boolean;
  command: (command: ReviewCommand) => Promise<boolean | string>;
  canCoordinate: boolean;
  hasPermission: (key: string) => boolean;
  busy: boolean;
}) {
  const tr = textFor(language),
    label = useMemo(() => labelFor(language), [language]),
    dialog = useRef<HTMLElement>(null),
    [history, setHistory] = useState<ReviewHistory[]>([]),
    [reviewers, setReviewers] = useState<Array<{ id: string; label: string; kind: string }>>([]),
    [assignee, setAssignee] = useState(''),
    [reason, setReason] = useState(''),
    [note, setNote] = useState(''),
    [priority, setPriority] = useState(row.priority),
    [workState, setWorkState] = useState<'OPEN' | 'WAITING_INFORMATION' | 'REFERRED'>('OPEN'),
    [message, setMessage] = useState(''),
    [audit, setAudit] = useState<{
      items: Array<{ id: string; action: string; timestamp: string }>;
      nextCursor: string | null;
      hasMore: boolean;
    }>({ items: [], nextCursor: null, hasMore: false }),
    [auditState, setAuditState] = useState(''),
    [diff, setDiff] = useState<string[]>([]),
    [diffState, setDiffState] = useState(''),
    [auditReload, setAuditReload] = useState(0);
  const commandKeys = useRef(new Map<string, string>());
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.focus();
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
      if (event.key === 'Tab') {
        const nodes = dialog.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),a[href],input,textarea,select,[tabindex="0"]',
        );
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (
          event.shiftKey &&
          (document.activeElement === first || document.activeElement === dialog.current)
        ) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          (document.activeElement === last || document.activeElement === dialog.current)
        ) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener('keydown', keydown);
      previous?.focus();
    };
  }, [close]);
  useEffect(() => {
    const abort = new AbortController();
    setHistory([]);
    setReviewers([]);
    setAssignee(row.assigneeId ?? row.teamId ?? '');
    setReason('');
    setNote('');
    setPriority(row.priority);
    setWorkState(
      row.workState === 'WAITING_INFORMATION' || row.workState === 'REFERRED'
        ? row.workState
        : 'OPEN',
    );
    setMessage('');
    commandKeys.current.clear();
    void workRequest<ReviewHistory[]>(
      '/history?' + new URLSearchParams({ key: row.key }),
      undefined,
      abort.signal,
    )
      .then((value) => {
        if (!abort.signal.aborted) setHistory(value);
      })
      .catch((error) => {
        if (!abort.signal.aborted) setMessage(label(workspaceError(error)));
      });
    if (canCoordinate)
      void workRequest<typeof reviewers>('/reviewers?domain=' + row.domain, undefined, abort.signal)
        .then((value) => {
          if (!abort.signal.aborted) setReviewers(value);
        })
        .catch(() => {});
    return () => abort.abort();
  }, [
    row.key,
    row.version,
    row.domain,
    row.priority,
    row.workState,
    row.assigneeId,
    row.teamId,
    canCoordinate,
    label,
  ]);
  useEffect(() => {
    const abort = new AbortController(),
      item = ownerEvidenceItem(row),
      query = auditQuery(item, hasPermission('admin:audit:manage'));
    setAudit({ items: [], nextCursor: null, hasMore: false });
    setAuditState(query ? 'loading' : 'forbidden');
    setDiff([]);
    setDiffState(row.domain === 'scholarships' && row.importRecordId ? 'loading' : 'unsupported');
    if (query)
      void adminApiClient
        .request<Parameters<typeof parseAuditPreview>[0]>(query, {
          signal: abort.signal,
          cache: 'no-store',
        })
        .then((value) => {
          if (!abort.signal.aborted) {
            setAudit(parseAuditPreview(value, item));
            setAuditState('ready');
          }
        })
        .catch((error) => {
          if (!abort.signal.aborted) {
            setAuditState(/\[(401|403)\]/.test(String(error)) ? 'forbidden' : 'unavailable');
            setAudit({ items: [], nextCursor: null, hasMore: false });
          }
        });
    if (row.domain === 'scholarships' && row.importRecordId) {
      if (!hasPermission('admin:imports:manage')) setDiffState('forbidden');
      else
        void adminApiClient
          .request<{ recordId: string; fields: Array<{ field: string; state: string }> }>(
            '/admin/scholarships/import-center/records/' +
              encodeURIComponent(row.importRecordId) +
              '/diff',
            { signal: abort.signal, cache: 'no-store' },
          )
          .then((value) => {
            if (value.recordId !== row.importRecordId || !Array.isArray(value.fields))
              throw new Error('DIFF_TARGET_INVALID');
            if (!abort.signal.aborted) {
              setDiff(value.fields.slice(0, 100).map((field) => field.field + ': ' + field.state));
              setDiffState('ready');
            }
          })
          .catch(() => {
            if (!abort.signal.aborted) setDiffState('unavailable');
          });
    }
    return () => abort.abort();
  }, [row, hasPermission, auditReload]);
  const submit = async (action: ReviewCommand['action']) => {
    if (reason.trim().length < 5) {
      setMessage(
        tr(
          'أدخل سببًا واضحًا من خمسة أحرف على الأقل.',
          'Enter a reason of at least five characters.',
        ),
      );
      return;
    }
    const target = reviewers.find((value) => value.id === assignee);
    if (action === 'assign' && assignee && !target) {
      setMessage(
        tr(
          'اختر مراجعًا مخولًا أو أزل الإسناد صراحةً.',
          'Select an eligible reviewer or explicitly remove the assignment.',
        ),
      );
      return;
    }
    const body = {
      key: row.key,
      version: row.version,
      ownerRevision: row.ownerRevision,
      action,
      reason,
      ...(action === 'assign'
        ? {
            assigneeId: target?.kind === 'person' ? target.id : null,
            teamId: target?.kind === 'team' ? target.id : null,
          }
        : {}),
      ...(action === 'priority' ? { priority } : {}),
      ...(action === 'note' ? { note } : {}),
      ...(action === 'state' ? { state: workState } : {}),
    };
    const fingerprint = JSON.stringify(body);
    let idempotencyKey = commandKeys.current.get(fingerprint);
    if (!idempotencyKey) {
      idempotencyKey = createAdminIdempotencyKey();
      commandKeys.current.set(fingerprint, idempotencyKey);
    }
    const ok = await command({ ...body, idempotencyKey });
    if (ok === true)
      setMessage(tr('حُفظ التغيير، ويجري تحديث الحالة.', 'Change saved; refreshing the case.'));
    else setMessage(label(typeof ok === 'string' ? ok : 'REVIEW_UNAVAILABLE'));
  };
  const loadMoreAudit = async () => {
    const query = auditQuery(
      ownerEvidenceItem(row),
      hasPermission('admin:audit:manage'),
      audit.nextCursor ?? undefined,
    );
    if (!query) return;
    setAuditState('loading');
    try {
      const next = parseAuditPreview(
        await adminApiClient.request(query, { cache: 'no-store' }),
        ownerEvidenceItem(row),
      );
      setAudit((previous) => ({ ...next, items: [...previous.items, ...next.items].slice(-120) }));
      setAuditState('ready');
    } catch (error) {
      setAudit({ items: [], nextCursor: null, hasMore: false });
      setAuditState(/\[(401|403)\]/.test(String(error)) ? 'forbidden' : 'unavailable');
    }
  };
  return (
    <div className="rw-drawer-backdrop">
      <aside
        className="rw-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rw-preview-title"
        tabIndex={-1}
        ref={dialog}
      >
        <header>
          <div>
            <span className="rw-eyebrow">{label(row.domain)}</span>
            <h2 id="rw-preview-title">{row.title}</h2>
            {row.titleEn && row.titleEn !== row.title ? (
              <p lang="en" dir="ltr">
                {row.titleEn}
              </p>
            ) : null}
          </div>
          <button onClick={close} aria-label={tr('إغلاق المعاينة', 'Close preview')}>
            <X aria-hidden="true" />
          </button>
        </header>
        <nav className="rw-preview-nav" aria-label={tr('التنقل بين السجلات', 'Navigate records')}>
          <button onClick={() => move(-1)} disabled={!canPrevious}>
            <ChevronRight aria-hidden="true" />
            {tr('السابق', 'Previous')}
          </button>
          <button onClick={() => move(1)} disabled={!canNext}>
            {tr('التالي', 'Next')}
            <ChevronLeft aria-hidden="true" />
          </button>
        </nav>
        <div className="rw-preview-body">
          <div className="rw-badges">
            <span className="rw-badge">{label(row.status)}</span>
            <span className={'rw-badge rw-priority-' + row.priority}>
              {label(row.priority)} · {label(row.priorityBasis)}
            </span>
            <span className="rw-badge">{label(row.workState)}</span>
          </div>
          <Link to={row.href} className="rw-primary rw-open-owner">
            <ExternalLink aria-hidden="true" />
            {tr('فتح السجل في ', 'Open record in ') + label(row.domain)}
          </Link>
          {!row.detail ? (
            <p>
              {tr(
                'يفتح قائمة القسم مع بحث السجل.',
                'Opens the owner list filtered for this record.',
              )}
            </p>
          ) : null}
          <section>
            <h3>
              <FileSearch aria-hidden="true" />
              {tr('الأسباب والأدلة', 'Reasons and evidence')}
            </h3>
            <ul>
              {row.reasons.map((reason) => (
                <li key={reason}>{label(reason)}</li>
              ))}
            </ul>
            <dl>
              <div>
                <dt>{tr('المسؤول', 'Assignee')}</dt>
                <dd>{row.assigneeLabel ?? label('unassigned')}</dd>
              </div>
              <div>
                <dt>{tr('بدء الرصد', 'First observed')}</dt>
                <dd>{displayDate(row.enteredAt, language)}</dd>
              </div>
              <div>
                <dt>{tr('المهلة', 'Deadline')}</dt>
                <dd>
                  {row.dueAt
                    ? displayDate(row.dueAt, language)
                    : tr('لم تُحدد مهلة', 'No deadline set')}
                </dd>
              </div>
              <div>
                <dt>{tr('حالة المهلة', 'Deadline state')}</dt>
                <dd>
                  {row.sla === 'unknown'
                    ? tr('لا سياسة مهلة مثبتة', 'No approved deadline policy')
                    : label(row.sla)}
                </dd>
              </div>
              <div>
                <dt>{tr('آخر تعديل لدى القسم', 'Owner last modified')}</dt>
                <dd>{displayDate(row.modifiedAt, language)}</dd>
              </div>
              <div>
                <dt>{tr('آخر مزامنة', 'Last synchronized')}</dt>
                <dd>{displayDate(row.synchronizedAt, language)}</dd>
              </div>
            </dl>
          </section>
          {canCoordinate && row.version > 0 ? (
            <section>
              <h3>
                <Users aria-hidden="true" />
                {tr('توزيع عمل المراجعة', 'Review coordination')}
              </h3>
              <label>
                {tr('سبب الإجراء', 'Action reason')}
                <input
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  minLength={5}
                  maxLength={500}
                />
              </label>
              {!row.assigneeId && !row.teamId ? (
                <button className="rw-primary" disabled={busy} onClick={() => void submit('claim')}>
                  <UserCheck aria-hidden="true" />
                  {tr('استلام المراجعة', 'Claim review')}
                </button>
              ) : null}
              <label>
                {tr('إسناد إلى مراجع أو فريق', 'Assign to reviewer or team')}
                <select value={assignee} onChange={(event) => setAssignee(event.target.value)}>
                  <option value="">
                    {tr('غير مسندة — إزالة الإسناد', 'Unassigned — remove assignment')}
                  </option>
                  {assignee && !reviewers.some((person) => person.id === assignee) ? (
                    <option value={assignee} disabled>
                      {row.assigneeLabel ??
                        tr('الإسناد الحالي — غير متاح', 'Current assignment — unavailable')}
                    </option>
                  ) : null}
                  {reviewers.map((person) => (
                    <option key={person.kind + person.id} value={person.id}>
                      {person.label}
                      {person.kind === 'team' ? tr(' — فريق', ' — team') : ''}
                    </option>
                  ))}
                </select>
              </label>
              <button disabled={busy} onClick={() => void submit('assign')}>
                <Users aria-hidden="true" />
                {tr('حفظ الإسناد', 'Save assignment')}
              </button>
              <label>
                {tr('أولوية العمل', 'Work priority')}
                <select
                  value={priority}
                  onChange={(event) => setPriority(event.target.value as typeof priority)}
                >
                  {['critical', 'high', 'medium', 'low'].map((value) => (
                    <option key={value} value={value}>
                      {label(value)}
                    </option>
                  ))}
                </select>
              </label>
              <button disabled={busy} onClick={() => void submit('priority')}>
                <Flag aria-hidden="true" />
                {tr('حفظ الأولوية', 'Save priority')}
              </button>
              <label>
                {tr('حالة العمل — دون إغلاق أو نشر', 'Work state — no closure or publication')}
                <select
                  value={workState}
                  onChange={(event) => setWorkState(event.target.value as typeof workState)}
                >
                  {['OPEN', 'WAITING_INFORMATION', 'REFERRED'].map((value) => (
                    <option key={value} value={value}>
                      {label(value)}
                    </option>
                  ))}
                </select>
              </label>
              <button disabled={busy} onClick={() => void submit('state')}>
                {tr('حفظ حالة العمل', 'Save work state')}
              </button>
              <label>
                {tr(
                  'ملاحظة داخلية — لا تضع بيانات طالب حساسة',
                  'Internal note — do not include private student data',
                )}
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  maxLength={2000}
                  rows={3}
                />
              </label>
              <button disabled={busy || !note.trim()} onClick={() => void submit('note')}>
                <MessageSquare aria-hidden="true" />
                {tr('إضافة ملاحظة', 'Add note')}
              </button>
            </section>
          ) : row.version === 0 ? (
            <p>
              {tr(
                'حدّث المزامنة لتسجيل قضية المراجعة قبل الإسناد.',
                'Synchronize this owner before assigning its review case.',
              )}
            </p>
          ) : null}
          <p role="status">{message}</p>
          <section>
            <h3>
              <History aria-hidden="true" />
              {tr('سجل عمل المراجعة', 'Review work history')}
            </h3>
            {history.length ? (
              <ol className="rw-timeline">
                {history.map((event) => (
                  <li key={event.id}>
                    <strong>{label(event.action)}</strong>
                    <time>{displayDate(event.at, language)}</time>
                    {event.actorLabel ? <span>{event.actorLabel}</span> : null}
                    {event.note ? <p>{event.note}</p> : null}
                  </li>
                ))}
              </ol>
            ) : (
              <p>{tr('لا أحداث مسجلة لهذه القضية.', 'No events recorded for this case.')}</p>
            )}
          </section>
          <section>
            <h3>
              <ShieldCheck aria-hidden="true" />
              {tr('المصدر والاستيراد', 'Source and import evidence')}
            </h3>
            <p>
              {tr('حالة التحقق: ', 'Verification: ')}
              {label(row.verificationState)}
            </p>
            {row.sourceUrl ? (
              <>
                <a href={row.sourceUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink aria-hidden="true" />
                  {tr('فتح المصدر الخارجي', 'Open external source')}
                </a>
                {row.sourceUrl.startsWith('http:') ? (
                  <p className="rw-alert">
                    {tr(
                      'الرابط غير مشفر؛ لا تُدخل بيانات حساسة.',
                      'Unencrypted source. Do not enter sensitive data.',
                    )}
                  </p>
                ) : null}
              </>
            ) : (
              <p>{tr('لا يوجد رابط مصدر صالح.', 'No valid source link.')}</p>
            )}
            {row.importRecordId ? (
              <p>
                {tr('مرجع الاستيراد: ', 'Import reference: ')}
                {row.importRecordId}
              </p>
            ) : null}
            {row.batchId ? (
              <p>
                {tr('دفعة الاستيراد: ', 'Import batch: ')}
                {row.batchId}
              </p>
            ) : null}
            {diffState === 'ready' ? (
              <ul>
                {diff.map((field) => (
                  <li key={field}>{field}</li>
                ))}
              </ul>
            ) : row.importRecordId ? (
              <p>
                {tr('مقارنة المصدر: ', 'Source comparison: ')}
                {label(diffState)}
              </p>
            ) : null}
            <Link to={row.href}>
              <RefreshCw aria-hidden="true" />
              {tr('إعادة التحقق لدى القسم', 'Recheck at owner')}
            </Link>
          </section>
          <section>
            <h3>
              <History aria-hidden="true" />
              {tr('أحدث تدقيق مصرح للسجل', 'Recent authorized owner audit')}
            </h3>
            {audit.items.map((event) => (
              <p key={event.id}>
                {event.action}
                <br />
                {displayDate(event.timestamp, language)}
              </p>
            ))}
            {auditState !== 'ready' ? (
              <p>{label(auditState)}</p>
            ) : !audit.items.length ? (
              <p>{tr('لا أحداث في هذا النطاق.', 'No events in this scope.')}</p>
            ) : null}
            {audit.hasMore && audit.items.length < 120 ? (
              <button onClick={() => void loadMoreAudit()} disabled={auditState === 'loading'}>
                {tr('أحداث أقدم', 'Earlier events')}
              </button>
            ) : null}
            {auditState === 'unavailable' ? (
              <button onClick={() => setAuditReload((value) => value + 1)}>
                {tr('إعادة قراءة الأدلة', 'Retry evidence')}
              </button>
            ) : null}
            {hasPermission('admin:audit:manage') ? (
              <Link to={'/audit?' + new URLSearchParams({ targetId: row.ownerId })}>
                {tr('فتح سجل التدقيق الكامل', 'Open full audit workspace')}
              </Link>
            ) : null}
          </section>
          <footer>
            <span>
              {tr('معرّف السجل', 'Record ID')}: {row.ownerId}
            </span>
            <button
              onClick={() =>
                void navigator.clipboard
                  .writeText(row.ownerId)
                  .then(() => setMessage(tr('نُسخ المعرّف', 'ID copied')))
                  .catch(() =>
                    setMessage(
                      tr('تعذر النسخ؛ حدد المعرف يدويًا.', 'Copy failed; select the ID manually.'),
                    ),
                  )
              }
            >
              <Copy aria-hidden="true" />
              {tr('نسخ', 'Copy')}
            </button>
          </footer>
        </div>
      </aside>
    </div>
  );
}
