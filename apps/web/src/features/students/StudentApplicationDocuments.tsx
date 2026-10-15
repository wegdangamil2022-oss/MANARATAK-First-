import { applicationCycleLabel } from './ApplicationCycleLabel';
import { useEffect, useState, useRef, useCallback } from 'react';
import {
  ApiClient,
  type StudentApplicationTrackerDto,
  type StudentOwnedAssetDto,
} from '../../api/client';
import { useTranslation } from '../../i18n/I18nProvider';
export function StudentApplicationDocuments({
  tracker,
  onChanged,
}: {
  tracker: StudentApplicationTrackerDto;
  onChanged: () => void;
}) {
  const generation = useRef(0);
  const { language } = useTranslation();
  const text = useCallback((ar: string, en: string) => (language === 'en' ? en : ar), [language]);
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [readiness, setReadiness] = useState<Awaited<
    ReturnType<typeof ApiClient.getMyApplicationDocuments>
  > | null>(null);
  const [assets, setAssets] = useState<StudentOwnedAssetDto[]>([]),
    [requirement, setRequirement] = useState(''),
    [asset, setAsset] = useState(''),
    [consent, setConsent] = useState(false),
    [expiry, setExpiry] = useState('');
  const [cycles, setCycles] = useState<Array<{ id: string; cycleKey: string }>>([]),
    [cycle, setCycle] = useState('');
  useEffect(() => {
    const current = ++generation.current;
    if (!open) return;
    setReadiness(null);
    setAssets([]);
    setCycles([]);
    setRequirement('');
    setAsset('');
    setConsent(false);
    setError('');
    void Promise.allSettled([
      ApiClient.getMyApplicationDocuments(tracker.id),
      ApiClient.listMyActiveStudentAssets('application/pdf'),
      ApiClient.getScholarshipApplicationCycles(tracker.scholarshipId),
      ApiClient.listMyActiveStudentAssets('image/'),
    ]).then(([r, a, c, images]) => {
      if (current !== generation.current) return;
      if (r.status === 'fulfilled') setReadiness(r.value);
      const availableAssets = [a, images].flatMap((result) => result.status === 'fulfilled' ? result.value.items : []);
      setAssets([...new Map(availableAssets.map((item) => [item.id, item])).values()]);
      if (c.status === 'fulfilled') setCycles(c.value.cycles);
      if ([r, a, c, images].some((v) => v.status === 'rejected'))
        setError(
          text(
            'بعض المتطلبات أو الأصول أو الدورات غير متاحة. أعد فتح اللوحة للمحاولة.',
            'Some requirements, assets or cycles are unavailable. Reopen this panel to retry.',
          ),
        );
    });
    return () => {
      ++generation.current;
    };
  }, [open, tracker.id, tracker.version, tracker.scholarshipId, text]);
  const labels: Record<string, [string, string]> = {
    UNFULFILLED: ['لم يرتبط مستند', 'No document linked'],
    REQUIREMENT_REMOVED: [
      'حذف المالك المتطلب؛ يمكنك سحب الموافقة',
      'Owner removed this requirement; you can withdraw consent',
    ],
    ASSET_AVAILABLE_UNVERIFIED: [
      'أصل متاح؛ محتواه غير مُصدّق',
      'Asset available; content not attested',
    ],
    OWNER_UNAVAILABLE: ['متطلبات المالك غير متاحة', 'Owner unavailable'],
    REVISION_CHANGED: [
      'تغير إصدار المتطلبات؛ يلزم المراجعة',
      'Requirement revision changed; review needed',
    ],
    EXPIRED: ['انتهت المدة', 'Expired'],
    ASSET_UNAVAILABLE: ['الأصل غير متاح أو سُحبت صلاحيته', 'Asset unavailable or revoked'],
  };
  const snapshotDeadline =
    typeof tracker.ownerSnapshot?.deadlineAt === 'string' &&
    Number.isFinite(Date.parse(tracker.ownerSnapshot.deadlineAt))
      ? new Date(tracker.ownerSnapshot.deadlineAt).toLocaleDateString(
          language === 'en' ? 'en-GB' : 'ar',
          { timeZone: 'UTC' },
        )
      : null;
  return (
    <section className="my-3 rounded-xl border p-3">
      <button type="button" onClick={() => setOpen((v) => !v)}>
        {text('مستندات ودورة التقديم', 'Documents and application cycle')}
      </button>
      {open && (
        <div className="space-y-2">
          <p>
            {text(
              'هذه متابعة شخصية وليست تقديمًا رسميًا أو تحققًا أكاديميًا من المستند.',
              'This is personal planning, not official submission or academic document verification.',
            )}
          </p>
          <p>
            {applicationCycleLabel(
              tracker.ownerSnapshot?.cycleKey,
              language === 'en' ? 'en' : 'ar',
            )}
          </p>
          {typeof tracker.ownerSnapshot?.displayName === 'string' && (
            <p>{tracker.ownerSnapshot.displayName}</p>
          )}
          {snapshotDeadline && (
            <p>
              {text(
                'الموعد في اللقطة التاريخية، وليس تأكيدًا للموعد الحالي:',
                'Historical snapshot deadline; not confirmation of the current deadline:',
              )}{' '}
              {snapshotDeadline}
            </p>
          )}
          {error && <p role="alert">{error}</p>}
          {readiness && (
            <>
              <p>
                {readiness.ownerState === 'AVAILABLE'
                  ? text('متطلبات حالية من المالك', 'Current owner requirements')
                  : text(
                      'المالك غير متاح؛ لا تستنتج اكتمال المستندات',
                      'Owner unavailable; document completeness is unknown',
                    )}
              </p>
              {readiness.entries.map((r) => (
                <p key={r.requirementId}>
                  {r.displayName} — {labels[r.state]?.[language === 'en' ? 1 : 0] ?? r.state}
                  {r.linked && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        const current = generation.current;
                        setBusy(true);
                        void ApiClient.unbindMyApplicationDocument(
                          tracker.id,
                          r.requirementId,
                          tracker.version,
                        )
                          .then(() => {
                            if (current === generation.current) onChanged();
                          })
                          .catch(() => {
                            if (current === generation.current)
                              setError(
                                text(
                                  'تعذر إلغاء الربط؛ حدّث الملف.',
                                  'Could not unlink; refresh the tracker.',
                                ),
                              );
                          })
                          .finally(() => setBusy(false));
                      }}
                    >
                      {text('إلغاء الربط وسحب الموافقة', 'Unlink and withdraw consent')}
                    </button>
                  )}
                </p>
              ))}
              {tracker.status === 'ACTIVE' &&
                tracker.cycleReferenceId &&
                tracker.cycleReferenceId !== 'LEGACY' && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (busy || !consent || !requirement || !asset) return;
                      const current = generation.current;
                      setBusy(true);
                      setError('');
                      void ApiClient.bindMyApplicationDocument(tracker.id, {
                        requirementId: requirement,
                        assetId: asset,
                        expectedVersion: tracker.version,
                        consent: true,
                        expiresAt: expiry ? new Date(expiry).toISOString() : null,
                      })
                        .then(() => {
                          if (current === generation.current) {
                            setConsent(false);
                            onChanged();
                          }
                        })
                        .catch(() => {
                          if (current === generation.current)
                            setError(
                              text(
                                'تعذر الربط؛ حدّث الملف وتحقق من صلاحية الأصل.',
                                'Could not link; refresh the tracker and check asset access.',
                              ),
                            );
                        })
                        .finally(() => setBusy(false));
                    }}
                  >
                    <label>
                      {text('المتطلب', 'Requirement')}
                      <select value={requirement} onChange={(e) => setRequirement(e.target.value)}>
                        <option value="">—</option>
                        {readiness.entries
                          .filter((r) => r.bindable)
                          .map((r) => (
                            <option key={r.requirementId} value={r.requirementId}>
                              {r.displayName}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label>
                      {text(
                        'ملف PDF أو صورة من أصولك (أول 100 ملف لكل نوع)',
                        'PDF or image from your assets (first 100 of each type)',
                      )}
                      <select value={asset} onChange={(e) => setAsset(e.target.value)}>
                        <option value="">—</option>
                        {assets.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.metadata?.originalFilename ?? a.reference}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      {text('انتهاء المستند المعلن، إن وجد', 'Declared expiry, if any')}
                      <input
                        type="date"
                        value={expiry}
                        onChange={(e) => setExpiry(e.target.value)}
                      />
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={consent}
                        onChange={(e) => setConsent(e.target.checked)}
                      />
                      {text(
                        'أوافق على ربط الأصل الخاص لهذا المتطلب لمدة أقصاها 180 يومًا، دون نشره.',
                        'I consent to this private asset link for up to 180 days without publishing it.',
                      )}
                    </label>
                    <button disabled={busy || !requirement || !asset || !consent}>
                      {text('ربط المستند', 'Link document')}
                    </button>
                  </form>
                )}
            </>
          )}
          {cycles.length > 0 && (
            <div>
              <label>
                {text('بدء متابعة دورة منشورة مستقلة', 'Track a separate published cycle')}
                <select value={cycle} onChange={(e) => setCycle(e.target.value)}>
                  <option value="">—</option>
                  {cycles.map((c) => (
                    <option key={c.id} value={c.id}>
                      {applicationCycleLabel(c.cycleKey, language === 'en' ? 'en' : 'ar')}
                    </option>
                  ))}
                </select>
              </label>
              <button
                disabled={busy || !cycle}
                onClick={() => {
                  if (busy || !cycle) return;
                  const current = generation.current;
                  setBusy(true);
                  void ApiClient.createMyStudentApplicationTracker({
                    scholarshipId: tracker.scholarshipId,
                    cycleId: cycle,
                  })
                    .then(() => {
                      if (current === generation.current) onChanged();
                    })
                    .catch(() => {
                      if (current === generation.current)
                        setError(text('تعذر بدء الدورة', 'Could not start this cycle'));
                    })
                    .finally(() => setBusy(false));
                }}
              >
                {text('متابعة الدورة', 'Track cycle')}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
