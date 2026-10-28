import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  RefreshCw,
  School,
  Layers,
  BookOpen,
  Coins,
  Award,
  ShieldCheck,
  Archive,
  RotateCcw,
  Globe,
  ExternalLink,
} from 'lucide-react';
import {
  UNIVERSITY_STAGE_CARDS,
  UNIVERSITY_STAGE_NAMES,
  type UniversityStageEvidence,
} from '@manaratak/domain';
import { adminApiClient, createAdminIdempotencyKey } from '../api/client';
import { reviewReasonHeaders } from '@manaratak/shared';
import { useTranslation } from '../i18n/I18nProvider';
import { useAdminAuthorization } from '../security/AdminAuthorizationContext';
import {
  UniversityStageCard,
  universityField,
  universityUrl,
  type UniversityData,
  type Commit,
} from '../features/universities/UniversityStageCard';
import { UniversityNormalizedCard } from '../features/universities/UniversityNormalizedCard';
import { UniversityLocationCard } from '../features/universities/UniversityLocationCard';
import { UniversityProgramsCard } from '../features/universities/UniversityProgramsCard';
import { registerUniversityHistoryGuard } from '../features/universities/UniversityHistoryGuard';
import { universityIssueLabels } from '../features/universities/UniversityLabels';
import '../features/universities/university-stages.css';
interface Snapshot {
  university: UniversityData;
  stages: UniversityStageEvidence[];
  publicHref: string | null;
}
interface Readiness {
  ready: boolean;
  blockingIssues: Array<{ code: string; message: string; field?: string }>;
  warnings: Array<{ code: string; message: string }>;
}
type Confirmation = {
  message: string;
  action: (reason: string) => void | Promise<void>;
  reasonRequired: boolean;
};
const specialTuition = (row: Record<string, unknown>) =>
  /MEDIC|ENGINEER|SPECIAL/i.test(
    String(row.profileType ?? '') + ' ' + String(row.organizationUnitName ?? ''),
  );
const icons = [School, Layers, BookOpen, Coins, Award];
function status(value: string, ar: boolean) {
  const labels: Record<string, string> = {
    IMPORTED: 'مستوردة',
    READY_TO_REVIEW: 'جاهزة للمراجعة',
    READY_TO_PUBLISH: 'جاهزة للنشر',
    PUBLISHED: 'منشورة',
    ARCHIVED: 'مؤرشفة',
    REJECTED: 'مرفوضة',
    COMPLETE: 'مكتملة وفق عقد الجامعة',
    INCOMPLETE: 'غير مكتملة وفق عقد الجامعة',
    NEEDS_REVIEW: 'تحتاج مراجعة',
  };
  return ar ? (labels[value] ?? 'حالة تتطلب مراجعة') : value.replaceAll('_', ' ');
}
export function UniversityRelationshipEditorPage() {
  const { id = '' } = useParams(),
    [params, setParams] = useSearchParams(),
    { language, dir } = useTranslation(),
    { hasPermission } = useAdminAuthorization();
  const ar = language === 'ar';
  const requested = Number(params.get('stage') ?? 1),
    stage = Number.isInteger(requested) && requested >= 1 && requested <= 5 ? requested : 1;
  const [data, setData] = useState<Snapshot | null>(null),
    [readiness, setReadiness] = useState<Readiness | null>(null),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null),
    [dirty, setDirtyState] = useState(false),
    dirtyRef = useRef(false),
    savingLock = useRef(false),
    generation = useRef(0),
    approvedLeave = useRef(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null),
    [pending, setPending] = useState<(() => void) | null>(null),
    [decisionReason, setDecisionReason] = useState(''),
    [dialogError, setDialogError] = useState(''),
    [tool, setTool] = useState<string | null>(null);
  const setDirty = useCallback((value: boolean) => {
    dirtyRef.current = value;
    setDirtyState(value);
  }, []);
  const externalBusy = useRef(false);
  const setProgramBusy = useCallback((value: boolean) => {
    externalBusy.current = value;
    setBusy(value);
  }, []);
  const read = useCallback(async () => {
    const snapshot = await adminApiClient.request<Snapshot>(
      `/admin/universities/${encodeURIComponent(id)}/source-stages`,
      { cache: 'no-store' },
    );
    if (snapshot.university.id !== id) throw Error('UNIVERSITY_OWNER_READ_MISMATCH');
    return snapshot;
  }, [id]);
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true);
    setError('');
    try {
      const [snapshot, gate] = await Promise.all([
        read(),
        adminApiClient
          .request<Readiness>(
            `/admin/universities/${encodeURIComponent(id)}/publication-readiness`,
            { cache: 'no-store' },
          )
          .catch(() => null),
      ]);
      if (current !== generation.current) return;
      setData(snapshot);
      setReadiness(gate);
    } catch (e) {
      if (current === generation.current) setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, [id, read]);
  const cancelReads = useCallback(() => {
    generation.current++;
  }, []);
  useEffect(() => {
    setData(null);
    setEditingId(null);
    setDirty(false);
    void refresh();
    return cancelReads;
  }, [refresh, setDirty, cancelReads]);
  const transition = (action: () => void) => {
    if (externalBusy.current || savingLock.current) return;
    if (dirtyRef.current) setPending(() => action);
    else action();
  };
  const cancel = () =>
    transition(() => {
      setDirty(false);
      setEditingId(null);
    });
  const requestEdit = (key: string) => {
    transition(() => {
      setDirty(false);
      setEditingId(key);
    });
  };
  const confirm = (
    text: string,
    action: (reason: string) => void | Promise<void>,
    reasonRequired = false,
  ) => {
    const open = () => {
      setDecisionReason('');
      setDialogError('');
      setConfirmation({ message: text, action, reasonRequired });
    };
    if (reasonRequired) transition(open);
    else open();
  };
  const commit: Commit = async (path, method, body, reason) => {
    if (!data || savingLock.current || !hasPermission('admin:universities:manage'))
      throw Error('UNIVERSITY_OPERATION_UNAVAILABLE');
    const revision = data.university.revision;
    if (!Number.isSafeInteger(revision)) throw Error('UNIVERSITY_EXPECTED_REVISION_REQUIRED');
    savingLock.current = true;
    setBusy(true);
    setMessage('');
    try {
      const saved = await adminApiClient.request<Partial<UniversityData>>(
        `/admin/universities/${encodeURIComponent(id)}${path}`,
        {
          method,
          headers: { 'If-Match': String(revision), ...reviewReasonHeaders(reason) },
          idempotencyKey: createAdminIdempotencyKey(),
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        },
      );
      const snapshot = await read();
      if (
        snapshot.university.revision === revision ||
        (saved.revision !== undefined && snapshot.university.revision !== saved.revision)
      )
        throw Error(
          ar
            ? 'أُرسل الحفظ وتعذر إثبات آخر نسخة؛ أعد قراءة السجل قبل المحاولة.'
            : 'Save sent but latest revision could not be verified; reload before retrying.',
        );
      if (path.startsWith('/stage-cards/') && body && typeof body === 'object')
        for (const [key, value] of Object.entries(
          (body as { values: Record<string, unknown> }).values,
        ))
          if (JSON.stringify(universityField(snapshot.university, key)) !== JSON.stringify(value))
            throw Error('UNIVERSITY_CARD_READBACK_MISMATCH');
      setData(snapshot);
      setDirty(false);
      setEditingId(null);
      setMessage(
        ar
          ? 'تم حفظ الوحدة وإعادة قراءتها؛ لم تُحفظ بطاقات أخرى ولم يحدث نشر تلقائي.'
          : 'Unit saved and read back; other cards were not saved and publication was not automatic.',
      );
      setReadiness(
        await adminApiClient
          .request<Readiness>(
            `/admin/universities/${encodeURIComponent(id)}/publication-readiness`,
            { cache: 'no-store' },
          )
          .catch(() => null),
      );
    } finally {
      savingLock.current = false;
      setBusy(false);
    }
  };
  useEffect(() => {
    if (!dirty) return;
    const historyIndex = window.history?.state?.idx;
    let restoring = false;
    const unload = (event: BeforeUnloadEvent) => {
      if (!approvedLeave.current) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    const pop = (event: PopStateEvent) => {
      if (
        approvedLeave.current ||
        !Number.isSafeInteger(historyIndex) ||
        !Number.isSafeInteger(event.state?.idx)
      )
        return;
      event.stopImmediatePropagation();
      if (restoring && event.state.idx === historyIndex) {
        restoring = false;
        return;
      }
      const delta = historyIndex - event.state.idx;
      if (!delta) return;
      restoring = true;
      window.history.go(delta);
      setPending(() => () => {
        approvedLeave.current = true;
        window.history.go(-delta);
      });
    };
    const link = (event: MouseEvent) => {
      const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (
        !(anchor instanceof HTMLAnchorElement) ||
        anchor.target === '_blank' ||
        event.defaultPrevented ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        anchor.href === location.href
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      setPending(() => () => {
        approvedLeave.current = true;
        window.location.assign(anchor.href);
      });
    };
    const unregister = registerUniversityHistoryGuard(pop);
    window.addEventListener('beforeunload', unload);
    document.addEventListener('click', link, true);
    return () => {
      unregister();
      window.removeEventListener('beforeunload', unload);
      document.removeEventListener('click', link, true);
    };
  }, [dirty]);
  useEffect(() => {
    if (!confirmation && !pending) return;
    const previous = document.activeElement as HTMLElement | null,
      dialog = document.querySelector<HTMLElement>('[data-university-dialog]');
    dialog?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !savingLock.current) {
        event.preventDefault();
        setConfirmation(null);
        setPending(null);
      }
      if (event.key !== 'Tab' || !dialog) return;
      const nodes = [
          ...dialog.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled)'),
        ],
        first = nodes[0],
        last = nodes.at(-1);
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === dialog)
      ) {
        event.preventDefault();
        last?.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || document.activeElement === dialog)
      ) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', keyboard);
    return () => {
      document.removeEventListener('keydown', keyboard);
      previous?.focus();
    };
  }, [confirmation, pending]);
  if (!data)
    return (
      <main className="university-stages" dir={dir}>
        {error ? (
          <>
            <p role="alert">{error}</p>
            <button onClick={() => void refresh()}>{ar ? 'إعادة المحاولة' : 'Retry'}</button>
          </>
        ) : (
          <p>
            {ar ? 'جارٍ تحميل الجامعة ومصادر مراحلها…' : 'Loading university and source stages…'}
          </p>
        )}
      </main>
    );
  const u = data.university,
    immutable = ['PUBLISHED', 'ARCHIVED', 'REJECTED'].includes(u.status),
    disabled = immutable || !hasPermission('admin:universities:manage'),
    evidence = data.stages.find((s) => s.stage === stage);
  const sourceLabel = (item?: UniversityStageEvidence) =>
    !item
      ? ar
        ? 'حالة المصدر غير متاحة'
        : 'Source unavailable'
      : item.sourceState === 'NOT_SUPPLIED'
        ? ar
          ? 'ملف المرحلة غير موفّر'
          : 'Stage file not supplied'
        : item.sourceState === 'AVAILABLE'
          ? ar
            ? 'ملف مصدر متوفر'
            : 'Source file available'
          : ar
            ? 'تعذر التحقق من المصدر'
            : 'Source check unavailable';
  const common = (key: string) => ({
    university: u,
    ar,
    busy,
    disabled,
    editing: editingId === key,
    onEdit: () => requestEdit(key),
    onCancel: cancel,
    onDirty: setDirty,
    commit,
  });
  const normalized = (
    key: string,
    kind: string,
    title: string,
    options: Partial<React.ComponentProps<typeof UniversityNormalizedCard>> = {},
  ) => (
    <UniversityNormalizedCard
      key={key}
      {...common(key)}
      kind={kind}
      title={title}
      confirm={confirm}
      {...options}
    />
  );
  const action = (command: string, label: string) =>
    confirm(
      (ar ? 'تنفيذ «' : 'Run “') +
        label +
        (ar
          ? '» على الجامعة كاملة. يتطلب سببًا ويسجل في التدقيق.'
          : '” for the entire university. A reason and audit record are required.'),
      (reason) => commit('/' + command, 'POST', {}, reason),
      true,
    );
  return (
    <main className="university-stages" dir={dir}>
      <div className="university-links">
        <Link to="/universities">
          <ArrowRight size={16} /> {ar ? 'العودة إلى الجامعات' : 'Back to universities'}
        </Link>
        <button
          type="button"
          disabled={busy || loading}
          onClick={() =>
            transition(() => {
              setEditingId(null);
              setDirty(false);
              void refresh();
            })
          }
        >
          <RefreshCw />
          {ar ? 'تحديث السجل' : 'Refresh record'}
        </button>
      </div>
      <header className="university-top">
        <div>
          <h1>
            {String(
              (u.localizedNames as Record<string, string> | undefined)?.[language] ?? u.displayName,
            )}
          </h1>
          <p>
            {String(u.country ?? (ar ? 'دولة غير محددة' : 'Country unspecified'))} · {u.publicId} ·{' '}
            {status(u.status, ar)}
          </p>
          <small>{status(String(u.completenessStatus ?? ''), ar)}</small>
        </div>
        <div className="university-actions">
          {u.status === 'IMPORTED' && (
            <button
              disabled={busy || dirty || u.completenessStatus === 'INCOMPLETE'}
              onClick={() => action('mark-ready', ar ? 'جاهزة للمراجعة' : 'Ready for review')}
            >
              <ShieldCheck />
              {ar ? 'جاهزة للمراجعة' : 'Ready for review'}
            </button>
          )}
          {u.status === 'READY_TO_REVIEW' && (
            <button
              disabled={busy || dirty || u.completenessStatus !== 'COMPLETE'}
              onClick={() => action('mark-publishable', ar ? 'جاهزة للنشر' : 'Ready to publish')}
            >
              <ShieldCheck />
              {ar ? 'جاهزة للنشر' : 'Ready to publish'}
            </button>
          )}
          {u.status === 'READY_TO_PUBLISH' && (
            <button
              disabled={busy || dirty || readiness?.ready !== true}
              onClick={() => action('publish', ar ? 'نشر الجامعة' : 'Publish university')}
            >
              <Globe />
              {ar ? 'نشر الجامعة' : 'Publish university'}
            </button>
          )}
          {u.status === 'PUBLISHED' && (
            <button
              disabled={busy || dirty}
              onClick={() => action('unpublish', ar ? 'إلغاء النشر' : 'Unpublish')}
            >
              <RotateCcw />
              {ar ? 'إلغاء النشر' : 'Unpublish'}
            </button>
          )}
          {!['PUBLISHED', 'ARCHIVED', 'REJECTED'].includes(u.status) && (
            <>
              <button
                disabled={busy || dirty}
                onClick={() => action('archive', ar ? 'أرشفة الجامعة' : 'Archive university')}
              >
                <Archive />
                {ar ? 'أرشفة الجامعة' : 'Archive university'}
              </button>
              <button
                disabled={busy || dirty}
                onClick={() => action('reject', ar ? 'رفض وإيقاف المراجعة' : 'Reject review')}
              >
                {ar ? 'رفض المراجعة' : 'Reject review'}
              </button>
            </>
          )}
          {['ARCHIVED', 'REJECTED'].includes(u.status) && (
            <button
              disabled={busy || dirty}
              onClick={() => action('restore', ar ? 'استعادة للمراجعة' : 'Restore to review')}
            >
              <RotateCcw />
              {ar ? 'استعادة للمراجعة' : 'Restore to review'}
            </button>
          )}
          {data.publicHref && universityUrl(location.origin + data.publicHref) && (
            <a href={data.publicHref} target="_blank" rel="noopener noreferrer">
              <ExternalLink />
              {ar ? 'فتح الصفحة العامة' : 'Open public page'}
            </a>
          )}
        </div>
      </header>
      {immutable && (
        <p className="university-notice">
          {ar
            ? 'تعديل المحتوى مقفل وفق حالة الجامعة. إلغاء النشر أو الاستعادة يتم بإجراء صريح دون نشر تلقائي.'
            : 'Content editing is locked by the university state. Unpublishing or restoration requires an explicit action; publication is never automatic.'}
        </p>
      )}
      <section
        className="university-stage-status"
        aria-label={ar ? 'جاهزية الجامعة' : 'University readiness'}
      >
        <h2>
          <ShieldCheck />
          {ar ? 'الجاهزية' : 'Readiness'}
        </h2>
        {readiness ? (
          <>
            <p>
              {readiness.ready
                ? ar
                  ? 'اجتازت فحص الجاهزية الحالي؛ لا يعني ذلك نشرها.'
                  : 'Current readiness check passed; this does not publish the record.'
                : ar
                  ? 'غير جاهزة للنشر؛ راجع البنود التالية.'
                  : 'Not ready for publication; review the following items.'}
            </p>
            {readiness.blockingIssues.map((issue) => (
              <p key={issue.code + issue.field}>
                {ar ? 'يتطلب مراجعة: ' : 'Review required: '}
                {ar ? (universityIssueLabels[issue.code] ?? issue.code) : issue.message}
              </p>
            ))}
            {readiness.warnings.map((issue) => (
              <p key={issue.code}>
                {ar ? 'تنبيه: ' + (universityIssueLabels[issue.code] ?? issue.code) : issue.message}
              </p>
            ))}
          </>
        ) : (
          <p>
            {ar
              ? 'تعذر التحقق من الجاهزية؛ النشر غير متاح.'
              : 'Readiness unavailable; publication is disabled.'}
          </p>
        )}
      </section>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      {dirty && (
        <p className="university-notice">
          {ar ? 'تعديلات غير محفوظة في البطاقة الحالية.' : 'Unsaved changes in the current card.'}
        </p>
      )}
      <nav
        className="university-stage-tabs admin-section-navigation"
        role="tablist"
        aria-label={ar ? 'مراحل مصادر الجامعة' : 'University source stages'}
        onKeyDown={(event) => {
          const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
          if (!keys.includes(event.key)) return;
          event.preventDefault();
          const buttons = [
            ...event.currentTarget.querySelectorAll<HTMLButtonElement>('[role=tab]'),
          ];
          const offset = event.key === 'ArrowRight' ? (ar ? -1 : 1) : ar ? 1 : -1;
          const index =
            event.key === 'Home' ? 0 : event.key === 'End' ? 4 : (stage - 1 + offset + 5) % 5;
          buttons[index]?.focus();
          buttons[index]?.click();
        }}
      >
        {UNIVERSITY_STAGE_NAMES.map((name, index) => {
          const number = index + 1,
            Icon = icons[index];
          return (
            <button
              type="button"
              key={number}
              role="tab"
              id={'university-stage-' + number}
              aria-controls="university-stage-content"
              aria-selected={stage === number}
              tabIndex={stage === number ? 0 : -1}
              disabled={busy}
              onClick={() =>
                transition(() => {
                  setDirty(false);
                  setEditingId(null);
                  const next = new URLSearchParams(params);
                  next.set('stage', String(number));
                  setParams(next);
                })
              }
            >
              <strong>
                <Icon />
                {String(number).padStart(2, '0')} {name[ar ? 0 : 1]}
                {dirty && stage === number ? ' •' : ''}
              </strong>
              <small>{sourceLabel(data.stages.find((s) => s.stage === number))}</small>
            </button>
          );
        })}
      </nav>
      <div className="university-stage-status">
        <h2>{UNIVERSITY_STAGE_NAMES[stage - 1][ar ? 0 : 1]}</h2>
        <p>
          {sourceLabel(evidence)} ·{' '}
          {evidence?.importState === 'IMPORTED'
            ? ar
              ? 'يوجد دليل استيراد لهذه المرحلة'
              : 'Owner import evidence exists'
            : ar
              ? 'حالة الاستيراد غير متاحة'
              : 'Import state unavailable'}
        </p>
        {evidence?.sourceFile && (
          <p>
            {ar ? 'الملف: ' : 'File: '}
            {evidence.sourceFile.split('/').at(-1)}
          </p>
        )}
        {evidence?.importedAt && (
          <p>
            {ar ? 'آخر استيراد موثق: ' : 'Last evidenced import: '}
            {evidence.importedAt}
          </p>
        )}
        {evidence?.issues.map((code) => (
          <p key={code} role="alert">
            {ar ? 'ملاحظة مصدر تحتاج مراجعة: ' : 'Source review issue: '}
            {ar ? (universityIssueLabels[code] ?? code) : code}
          </p>
        ))}
        <Link to={'/review-queue?search=' + encodeURIComponent(u.publicId)}>
          {ar ? 'فتح سجل المراجعة' : 'Open review workspace'}
        </Link>{' '}
        ·{' '}
        <Link to="/imports/universities">
          {ar ? 'مركز استيراد الجامعات' : 'University import center'}
        </Link>
      </div>
      <div
        id="university-stage-content"
        role="tabpanel"
        aria-labelledby={'university-stage-' + stage}
      >
        {UNIVERSITY_STAGE_CARDS.filter((card) => card.stage === stage).map((card) => (
          <UniversityStageCard
            key={card.id}
            definition={card}
            evidence={evidence}
            {...common(card.id)}
          >
            {card.id === 'basic-location' && <UniversityLocationCard {...common('location')} />}
            {card.id === 'fees-general' &&
              normalized(
                'tuition-general',
                'tuitionProfiles',
                ar ? 'الرسوم العامة المعتمدة' : 'Canonical general tuition',
                { embedded: true, filter: (row) => !specialTuition(row) },
              )}
            {card.id === 'fees-special' &&
              normalized(
                'tuition-special',
                'tuitionProfiles',
                ar ? 'الرسوم التخصصية المعتمدة' : 'Canonical specialized tuition',
                { embedded: true, filter: specialTuition },
              )}
            {card.id === 'accommodation' &&
              normalized(
                'canonical-accommodation',
                'accommodationProfiles',
                ar ? 'السكن المعتمد' : 'Canonical accommodation',
                {
                  embedded: true,
                  fieldKeys: [
                    'accommodationAvailable',
                    'internationalEligible',
                    'typicalCost',
                    'currencyCode',
                    'currencyReferenceId',
                  ],
                },
              )}
            {card.id === 'living' &&
              normalized(
                'canonical-living',
                'accommodationProfiles',
                ar ? 'المعيشة المعتمدة' : 'Canonical living costs',
                {
                  embedded: true,
                  fieldKeys: [
                    'averageMonthlyLivingCost',
                    'livingCostCurrencyCode',
                    'livingCostCurrencyReferenceId',
                    'costVariationNote',
                  ],
                },
              )}
          </UniversityStageCard>
        ))}
        {stage === 3 && (
          <UniversityProgramsCard
            university={u}
            ar={ar}
            editingId={editingId}
            busy={busy}
            disabled={disabled}
            requestEdit={requestEdit}
            cancel={cancel}
            onDirty={setDirty}
            commit={commit}
            confirm={confirm}
            onSaved={async () => {
              setDirty(false);
              setEditingId(null);
              await refresh();
            }}
            onBusyChange={setProgramBusy}
          />
        )}
        {stage === 5 &&
          ['QS', 'THE', 'ARWU'].map((provider) =>
            normalized('rank-' + provider, 'rankings', provider, { provider }),
          )}
      </div>
      <section className="university-stage-status">
        <h2>
          {ar
            ? 'أدوات مؤسسية إضافية — خارج حقول ملفات المراحل'
            : 'Additional institutional tools — separate from source-file fields'}
        </h2>
        <div className="university-actions">
          {[
            ['campuses', 'الحرم الجامعي', 'Campuses'],
            ['organizationUnits', 'الكليات والأقسام', 'Faculties and departments'],
            ['accreditations', 'الاعتمادات المؤسسية', 'Institutional accreditations'],
          ].map(([key, label, en]) => (
            <button
              type="button"
              key={key}
              aria-pressed={tool === key}
              onClick={() =>
                transition(() => {
                  setDirty(false);
                  setEditingId(null);
                  setTool(tool === key ? null : key);
                })
              }
            >
              {ar ? label : en}
            </button>
          ))}
        </div>
      </section>
      {tool &&
        normalized(
          'tool-' + tool,
          tool,
          ar
            ? tool === 'campuses'
              ? 'الحرم الجامعي'
              : tool === 'organizationUnits'
                ? 'الكليات والأقسام'
                : 'الاعتمادات المؤسسية'
            : tool,
        )}
      <details>
        <summary>{ar ? 'أدلة تقنية للمراحل' : 'Technical stage evidence'}</summary>
        {data.stages.map((row) => (
          <p key={row.stage}>
            {row.stage} · {row.sourceHash ?? '—'} · {ar ? 'صف المصدر: ' : 'Source row: '}
            {row.sourceRow ?? '—'} · {row.sourceRecordId ?? '—'}
          </p>
        ))}
      </details>
      {(pending || confirmation) && (
        <div className="university-dialog-backdrop">
          <section
            className="university-dialog"
            data-university-dialog
            role="dialog"
            aria-modal="true"
            aria-labelledby="university-dialog-title"
            tabIndex={-1}
          >
            <h2 id="university-dialog-title">
              {pending
                ? ar
                  ? 'تغييرات غير محفوظة'
                  : 'Unsaved changes'
                : ar
                  ? 'تأكيد الإجراء'
                  : 'Confirm action'}
            </h2>
            <p>
              {pending
                ? ar
                  ? 'هل تريد تجاهل مسودة البطاقة والمتابعة؟ لن تتغير النسخة المحفوظة.'
                  : 'Discard this card draft and continue? The saved version remains unchanged.'
                : confirmation?.message}
            </p>
            {confirmation?.reasonRequired && (
              <label>
                {ar ? 'سبب القرار' : 'Decision reason'}
                <input
                  value={decisionReason}
                  onChange={(e) => setDecisionReason(e.target.value)}
                  maxLength={2000}
                />
              </label>
            )}
            {dialogError && <p role="alert">{dialogError}</p>}
            <div className="university-actions">
              <button
                disabled={busy || (!!confirmation?.reasonRequired && !decisionReason.trim())}
                onClick={() => {
                  if (pending) {
                    const action = pending;
                    setPending(null);
                    setDirty(false);
                    setEditingId(null);
                    action();
                  } else if (confirmation) {
                    void Promise.resolve()
                      .then(() => confirmation.action(decisionReason))
                      .then(() => setConfirmation(null))
                      .catch((e) => setDialogError(e instanceof Error ? e.message : String(e)));
                  }
                }}
              >
                {pending
                  ? ar
                    ? 'تجاهل والمتابعة'
                    : 'Discard and continue'
                  : ar
                    ? 'تأكيد'
                    : 'Confirm'}
              </button>
              <button
                disabled={busy}
                onClick={() => {
                  setPending(null);
                  setConfirmation(null);
                }}
              >
                {pending ? (ar ? 'متابعة التحرير' : 'Keep editing') : ar ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
