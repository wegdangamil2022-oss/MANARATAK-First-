import { PreviewStudentApiClient } from './studentWorkspacePreviewApi';
const ApiClient = import.meta.env.VITE_PUBLIC_TEMPLATE_DATA_MODE === 'prototype' ? PreviewStudentApiClient : LiveApiClient;
import {StudentDocumentUpload} from './StudentDocumentUpload';
import { applicationCycleLabel } from './ApplicationCycleLabel';
import { useEffect, useState, useRef, useCallback } from 'react';
import { ChevronDown, FileCheck2, Info, Calendar, Sparkles, AlertCircle, Link2 } from 'lucide-react';
import {
  ApiClient as LiveApiClient,
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
  const detailsId = `mn-student-application-documents-${tracker.id}`;
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
    <section className="mn-student-application-documents relative mt-2 overflow-hidden rounded-xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] font-['Cairo',sans-serif] w-full max-w-full min-w-0 shadow-2xs transition-all">
      <span aria-hidden="true" className="mn-student-card-start-bar" />
      <button
        type="button"
        className="mn-student-documents-toggle flex w-full items-center justify-between gap-2 pr-3.5 pl-2.5 py-2 text-start text-[#1E293B] dark:text-[#F8FAFC] transition-colors hover:bg-[var(--mn-surface)] cursor-pointer"
        aria-expanded={open}
        aria-controls={detailsId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 min-w-0">
            <span className="h-[19px] w-[19px] rounded-[5px] bg-[#142B5F] text-white flex items-center justify-center shrink-0">
              <FileCheck2 className="h-3 w-3 text-white" aria-hidden="true" />
            </span>
            <span className="text-[10.5px] sm:text-[11px] leading-snug font-bold text-[#1E293B] dark:text-[#F8FAFC] font-['Cairo',sans-serif]">
              {text('مستندات ودورة التقديم', 'Documents and application cycle')}
            </span>
          </span>
          <span className="mt-0.5 pr-[25px] block text-[9.5px] leading-snug font-medium text-[#64748B] dark:text-[#94A3B8] font-['Cairo',sans-serif]">
            {text('مراجعة المتطلبات الرسمية وربط الوثائق الخاصة', 'Review requirements and link documents')}
          </span>
        </span>
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md border border-[#142B5F]/25 dark:border-white/15 bg-white dark:bg-[var(--mn-surface)] text-[#142B5F] dark:text-[#F2CD78]">
          <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        </span>
      </button>

      {open && (
        <div id={detailsId} className="mn-student-documents-detail space-y-3 border-t border-[var(--mn-border)] dark:border-white/10 p-3 text-[11px] leading-[1.7] text-[#1E293B] dark:text-[#F1F5F9] font-['Cairo',sans-serif] w-full max-w-full min-w-0 overflow-hidden">
          {/* Informative Guidance Banner */}
          <div className="flex items-start gap-2 rounded-xl bg-[#0E7C86]/[0.07] dark:bg-[#0E7C86]/15 border border-[#0E7C86]/25 p-2.5 text-[10.5px] font-medium text-[#1E293B] dark:text-[#F1F5F9] leading-[1.7]">
            <Info className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#55CBC5] shrink-0 mt-0.5" />
            <span>
              {text(
                'هذه متابعة تنظيمية خاصة بملفك الطلابي لتجهيز مستنداتك دون إرسالها للجهة المانحة؛ الربط يسهل مراجعتها والتحقق منها بخصوصية كاملة.',
                'This is personal planning to prepare your documents privately; linking helps organize and review them securely.',
              )}
            </span>
          </div>

          {/* Section 1: Cycle & Scholarship Snapshot Info Boxes */}
          <div className="rounded-xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] p-3 space-y-2 shadow-2xs">
            <div className="flex items-center gap-2 border-b border-[var(--mn-border)] dark:border-white/10 pb-1.5">
              <span className="w-6 h-6 rounded-md bg-[#0E7C86] border-[1.5px] border-[#142B5F] ring-1 ring-[#142B5F]/40 text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                <Calendar className="w-3 h-3 text-white" />
              </span>
              <h5 className="text-[11px] sm:text-[11.5px] font-bold text-[#1E293B] dark:text-[#F8FAFC] leading-tight">
                {text('بيانات الدورة والموعد المرجعي', 'Cycle & Reference Info')}
              </h5>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex items-center justify-between gap-2 rounded-xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] px-3 py-2">
                <div className="min-w-0">
                  <span className="block text-[10.5px] font-semibold text-[#64748B] dark:text-[#94A3B8]">
                    {text('الدورة الأكاديمية', 'Cycle')}
                  </span>
                  <span className="mt-0.5 block text-[12px] font-bold text-[#1E293B] dark:text-[#F8FAFC] break-words">
                    {applicationCycleLabel(
                      tracker.ownerSnapshot?.cycleKey,
                      language === 'en' ? 'en' : 'ar',
                    )}
                  </span>
                </div>
                <Calendar className="w-4 h-4 text-[#0E7C86] shrink-0" />
              </div>

              {snapshotDeadline ? (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] px-3 py-2">
                  <div className="min-w-0">
                    <span className="block text-[10.5px] font-semibold text-[#64748B] dark:text-[#94A3B8]">
                      {text('الموعد المرجعي', 'Reference deadline')}
                    </span>
                    <strong className="mt-0.5 block text-[12px] font-bold text-[#1E293B] dark:text-[#F8FAFC]">
                      {snapshotDeadline}
                    </strong>
                  </div>
                  <FileCheck2 className="w-4 h-4 text-[#0E7C86] shrink-0" />
                </div>
              ) : (
                typeof tracker.ownerSnapshot?.displayName === 'string' && (
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] px-3 py-2">
                    <div className="min-w-0">
                      <span className="block text-[10.5px] font-semibold text-[#64748B] dark:text-[#94A3B8]">
                        {text('الفرصة المرتبطة', 'Linked Scholarship')}
                      </span>
                      <span className="mt-0.5 block text-[12px] font-bold text-[#1E293B] dark:text-[#F8FAFC] break-words">
                        {tracker.ownerSnapshot.displayName}
                      </span>
                    </div>
                    <Sparkles className="w-4 h-4 text-[#0E7C86] shrink-0" />
                  </div>
                )
              )}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-300 border border-rose-200 text-[12px] font-bold" role="alert">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 2: Upload Document Box */}
          {tracker.status === 'ACTIVE' && (
            <StudentDocumentUpload
              key={tracker.id}
              onUploaded={(item) => {
                setAssets((previous) => [item, ...previous.filter((a) => a.id !== item.id)]);
                setAsset(item.id);
                setConsent(false);
              }}
            />
          )}

          {/* Section 3: Readiness Requirements Section */}
          {readiness && (
            <div className="space-y-3">
              <div className="rounded-xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] p-3 space-y-2.5 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--mn-border)] dark:border-white/10 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-[#D6A43B]/40 bg-[#142B5F]">
                      <FileCheck2 className="w-3 h-3 text-[#F2CD78]" />
                    </span>
                    <h5 className="text-[12px] font-bold text-[#1E293B] dark:text-[#F8FAFC] leading-tight">
                      {readiness.ownerState === 'AVAILABLE'
                        ? text('قائمة المستندات والمتطلبات الرسمية', 'Official documents and requirements')
                        : text('حالة متطلبات الجهة المانحة', 'Donor requirements state')}
                    </h5>
                  </div>
                  <span className="rounded-lg border border-[var(--mn-border)] dark:border-white/15 bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] px-2 py-0.5 text-[10.5px] font-bold text-[#334155] dark:text-[#E2E8F0]">
                    {readiness.entries.length} {text('متطلبات', 'requirements')}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {readiness.entries.map((r) => {
                    const stateLabel = labels[r.state]?.[language === 'en' ? 1 : 0] ?? r.state;
                    const isLinked = r.linked;
                    return (
                      <div
                        key={r.requirementId}
                        className="rounded-xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] p-3 space-y-2.5 transition-all hover:border-[#0E7C86]/40"
                      >
                        <div className="flex items-start justify-between gap-2.5 flex-wrap">
                          <div className="flex items-start gap-2.5 min-w-0 flex-1">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border ${isLinked ? 'bg-[#0E7C86]/10 text-[#0E7C86] border-[#0E7C86]/25' : 'bg-[var(--mn-surface)] text-[#64748B] border-[var(--mn-border)]'}`}>
                              <FileCheck2 className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="block font-bold text-[12.5px] text-[#1E293B] dark:text-[#F8FAFC] break-words leading-snug">
                                {r.displayName}
                              </span>
                              <div className="text-[10.5px] flex flex-wrap items-center gap-1.5 mt-1">
                                <span className={`px-2 py-0.5 rounded-md font-bold border ${isLinked ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25' : 'bg-[var(--mn-surface)] text-[#64748B] dark:text-[#94A3B8] border-[var(--mn-border)]'}`}>
                                  {stateLabel}
                                </span>
                                {r.verification && (
                                  <span className="px-2 py-0.5 rounded-md font-bold bg-[#0E7C86]/10 text-[#0E7C86] dark:text-[#55CBC5] border border-[#0E7C86]/25">
                                    {({
                                      VERIFIED: text('تم التدقيق الأكاديمي', 'Academically verified'),
                                      REJECTED: text('مرفوض', 'Rejected'),
                                      STALE: text('بحاجة لتحديث', 'Update needed'),
                                      NOT_ATTESTED: text('غير مصدق', 'Not attested'),
                                    } as Record<string, string>)[r.verification] ?? r.verification}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Action buttons per requirement */}
                          {r.linked && (
                            <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                              <button
                                type="button"
                                disabled={busy || (!r.reviewConsentGranted && (!r.bindable || r.state !== 'ASSET_AVAILABLE_UNVERIFIED'))}
                                onClick={() => {
                                  const current = generation.current;
                                  if (!r.reviewConsentGranted && !window.confirm(text('أوافق على إتاحة المستند للمراجعة الأكاديمية البشرية وحفظ نتيجتها حسب المدة الموضحة.', 'I consent to human academic review of this document and retention of its result for the stated period.'))) return;
                                  setBusy(true);
                                  void ApiClient.setMyDocumentReviewConsent(tracker.id, r.requirementId, tracker.version, !r.reviewConsentGranted).then(() => {
                                    if (current === generation.current) onChanged();
                                  }).catch(() => {
                                    if (current === generation.current) setError(text('تعذر تحديث موافقة المراجعة؛ حدّث الملف.', 'Could not update review consent; refresh the tracker.'));
                                  }).finally(() => {
                                    if (current === generation.current) setBusy(false);
                                  });
                                }}
                                className="px-2.5 py-1 rounded-lg border border-[#0E7C86]/35 bg-[#0E7C86]/10 hover:bg-[#0E7C86] hover:text-white text-[#0E7C86] dark:text-[#55CBC5] text-[11px] font-bold transition cursor-pointer disabled:opacity-50"
                              >
                                {r.reviewConsentGranted ? text('سحب المراجعة', 'Withdraw review') : text('طلب مراجعة أكاديمية', 'Request review')}
                              </button>

                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => {
                                  const current = generation.current;
                                  setBusy(true);
                                  void ApiClient.unbindMyApplicationDocument(tracker.id, r.requirementId, tracker.version).then(() => {
                                    if (current === generation.current) onChanged();
                                  }).catch(() => {
                                    if (current === generation.current) setError(text('تعذر إلغاء الربط؛ حدّث الملف.', 'Could not unlink; refresh the tracker.'));
                                  }).finally(() => setBusy(false));
                                }}
                                className="px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-900/30 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 text-[11px] font-bold transition cursor-pointer disabled:opacity-50"
                              >
                                {text('إلغاء الربط وسحب الموافقة', 'Unlink and withdraw consent')}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section 4: Linking Form Container */}
              {tracker.status === 'ACTIVE' && tracker.cycleReferenceId && tracker.cycleReferenceId !== 'LEGACY' && (
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
                    }).then(() => {
                      if (current === generation.current) {
                        setConsent(false);
                        onChanged();
                      }
                    }).catch(() => {
                      if (current === generation.current) setError(text('تعذر الربط؛ حدّث الملف وتحقق من صلاحية الأصل.', 'Could not link; refresh the tracker and check asset access.'));
                    }).finally(() => setBusy(false));
                  }}
                  className="rounded-xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] p-3 space-y-2.5 shadow-2xs"
                >
                  <div className="flex items-center gap-2 border-b border-[var(--mn-border)] dark:border-white/10 pb-2">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-[#D6A43B]/40 bg-[#142B5F]">
                      <Link2 className="w-3 h-3 text-[#F2CD78]" />
                    </span>
                    <h5 className="text-[12px] font-bold text-[#1E293B] dark:text-[#F8FAFC] leading-tight">
                      {text('ربط مستند بمتطلب رسمي للمنحة', 'Link document to an official requirement (first 100 of each type)')}
                    </h5>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="block space-y-1">
                      <span className="text-[12px] font-bold text-[#1E293B] dark:text-[#F8FAFC]">{text('١. اختر المتطلب المطلوب', 'Requirement')}</span>
                      <select
                        value={requirement}
                        onChange={(e) => setRequirement(e.target.value)}
                        className="w-full min-h-10 rounded-xl border border-[var(--mn-border)] dark:border-white/15 bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] px-3 text-[12px] font-semibold text-[#1E293B] dark:text-[#F8FAFC] outline-none focus:border-[#0E7C86]"
                      >
                        <option value="">— {text('حدد المتطلب الرسمي', 'Select requirement')} —</option>
                        {readiness.entries.filter((r) => r.bindable).map((r) => (
                          <option key={r.requirementId} value={r.requirementId}>
                            {r.displayName}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block space-y-1">
                      <span className="text-[12px] font-bold text-[#1E293B] dark:text-[#F8FAFC]">{text('٢. اختر المستند من أصولك', 'Asset file')}</span>
                      <select
                        value={asset}
                        onChange={(e) => setAsset(e.target.value)}
                        className="w-full min-h-10 rounded-xl border border-[var(--mn-border)] dark:border-white/15 bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] px-3 text-[12px] font-semibold text-[#1E293B] dark:text-[#F8FAFC] outline-none focus:border-[#0E7C86]"
                      >
                        <option value="">— {text('حدد الملف المرفوع', 'Select file')} —</option>
                        {assets.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.metadata?.originalFilename ?? a.reference}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className="block space-y-1">
                    <span className="text-[12px] font-bold text-[#1E293B] dark:text-[#F8FAFC]">{text('٣. تاريخ انتهاء صلاحية المستند (اختياري)', 'Document expiry date (optional)')}</span>
                    <input
                      type="date"
                      value={expiry}
                      onChange={(e) => setExpiry(e.target.value)}
                      className="w-full min-h-10 rounded-xl border border-[var(--mn-border)] dark:border-white/15 bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] px-3 text-[12px] font-semibold text-[#1E293B] dark:text-[#F8FAFC] outline-none focus:border-[#0E7C86]"
                    />
                  </label>

                  <label className="flex items-start gap-2.5 rounded-xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] p-2.5 text-[11.5px] font-medium text-[#334155] dark:text-[#E2E8F0] cursor-pointer leading-[1.7]">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-slate-300 accent-[#142B5F] focus:ring-[#D6A43B] shrink-0"
                    />
                    <span>
                      {text(
                        'أوافق على ربط هذا المستند بملفي الطلابي لمدة أقصاها 180 يومًا وفق معايير الخصوصية.',
                        'I consent to linking this document to my application profile for up to 180 days privately.',
                      )}
                    </span>
                  </label>

                  <button
                    disabled={busy || !requirement || !asset || !consent}
                    className="w-full sm:w-auto min-h-10 px-5 rounded-xl bg-[#142B5F] hover:bg-[#1a3675] text-white text-[12px] font-bold shadow-xs transition cursor-pointer disabled:opacity-50 border border-[#D6A43B]/35"
                  >
                    {text('ربط المستند بالمتطلب الآن', 'Link document')}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Section 5: Separate Cycle Tracking */}
          {cycles.length > 0 && (
            <div className="rounded-xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] p-3 space-y-2.5 shadow-2xs">
              <div className="flex items-center gap-2 border-b border-[var(--mn-border)] dark:border-white/10 pb-1.5">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-[#0E7C86]/35 bg-[#0E7C86]/10">
                  <Calendar className="w-3 h-3 text-[#0E7C86] dark:text-[#55CBC5]" />
                </span>
                <h5 className="text-[12px] font-bold text-[#1E293B] dark:text-[#F8FAFC] leading-tight">
                  {text('بدء متابعة دورة منشورة مستقلة', 'Track a separate published cycle')}
                </h5>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <select
                  value={cycle}
                  onChange={(e) => setCycle(e.target.value)}
                  className="flex-1 min-h-10 rounded-xl border border-[var(--mn-border)] dark:border-white/15 bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] px-3 text-[12px] font-semibold text-[#1E293B] dark:text-[#F8FAFC] outline-none focus:border-[#0E7C86]"
                >
                  <option value="">— {text('اختر الدورة الأكاديمية', 'Select cycle')} —</option>
                  {cycles.map((c) => (
                    <option key={c.id} value={c.id}>
                      {applicationCycleLabel(c.cycleKey, language === 'en' ? 'en' : 'ar')}
                    </option>
                  ))}
                </select>

                <button
                  disabled={busy || !cycle}
                  onClick={() => {
                    if (busy || !cycle) return;
                    const current = generation.current;
                    setBusy(true);
                    void ApiClient.createMyStudentApplicationTracker({
                      scholarshipId: tracker.scholarshipId,
                      cycleId: cycle,
                    }).then(() => {
                      if (current === generation.current) onChanged();
                    }).catch(() => {
                      if (current === generation.current) setError(text('تعذر بدء الدورة', 'Could not start this cycle'));
                    }).finally(() => setBusy(false));
                  }}
                  className="min-h-10 px-4 rounded-xl bg-[#142B5F] hover:bg-[#1a3675] text-white text-[12px] font-bold shadow-xs transition cursor-pointer disabled:opacity-50 shrink-0 border border-[#D6A43B]/35"
                >
                  {text('متابعة الدورة', 'Track cycle')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
