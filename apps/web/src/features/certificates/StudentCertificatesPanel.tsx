import { PreviewStudentApiClient } from '../students/studentWorkspacePreviewApi';
const ApiClient = import.meta.env.VITE_PUBLIC_TEMPLATE_DATA_MODE === 'prototype' ? PreviewStudentApiClient : LiveApiClient;
import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiClient as LiveApiClient, type StudentCertificateProjectionDto } from '../../api/client';
import { certificateCopy, certificateStatusCopy } from '@manaratak/shared';
import { useTranslation } from '../../i18n/I18nProvider';
import { StudentCertificateActions } from './StudentCertificateActions';
import { Check, RefreshCw } from 'lucide-react';

export function StudentCertificatesPanel({
  initial,
  compactLearning = false,
}: {
  initial: StudentCertificateProjectionDto[];
  compactLearning?: boolean;
}) {
  const { language } = useTranslation();
  const copy = useCallback((text: string) => certificateCopy(language, text), [language]);
  const [rows, setRows] = useState(initial);
  const [cursor, setCursor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const pageController = useRef<AbortController | null>(null);
  const loadedMore = useRef(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    loadedMore.current = false;
    pageController.current?.abort();
    const load = async () => {
      if (document.hidden || loadedMore.current) return;
      try {
        const page = await ApiClient.listMyCertificates(undefined, controller.signal);
        if (active && !loadedMore.current) {
          setRows(page.data);
          setCursor(page.nextCursor);
          setError('');
        }
      } catch {
        if (active && !controller.signal.aborted) setError(copy('تعذر تحميل الشهادات'));
      }
    };
    let inFlight = true;
    void load().finally(() => {
      inFlight = false;
    });
    // Poll the canonical owner
    const timer = window.setInterval(() => {
      if (!inFlight) {
        inFlight = true;
        void load().finally(() => {
          inFlight = false;
        });
      }
    }, 5000);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(timer);
      pageController.current?.abort();
    };
  }, [refresh, copy]);

  const more = async () => {
    if (!cursor || busy) return;
    loadedMore.current = true;
    const controller = new AbortController();
    pageController.current = controller;
    setBusy(true);
    setError('');
    try {
      const page = await ApiClient.listMyCertificates(cursor, controller.signal);
      if (!controller.signal.aborted) {
        setRows((previous) => [
          ...previous,
          ...page.data.filter((row) => !previous.some((old) => old.id === row.id)),
        ]);
        setCursor(page.nextCursor);
      }
    } catch {
      if (!controller.signal.aborted) setError(copy('تعذر تحميل الشهادات'));
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  };

  return (
    <section id="certificates" className="space-y-3 scroll-mt-6 font-['Cairo',sans-serif]" aria-label={copy('الشهادات')}>
      <div className="flex items-center justify-between">
        {!compactLearning && <h3 className="font-bold text-[15px] text-[var(--mn-heading)]">{copy('إنجازاتي وشهاداتي')}</h3>}
        <button
          type="button"
          onClick={() => {
            setBusy(false);
            setRefresh((value) => value + 1);
          }}
          className="ms-auto inline-flex items-center gap-1.5 rounded-lg border border-[var(--mn-border)] bg-[var(--mn-page)] px-3 py-1.5 text-[13px] font-bold text-[var(--mn-heading)] hover:border-[#D6A43B]/60 transition-all cursor-pointer font-['Cairo',sans-serif]"
        >
          <RefreshCw className="h-3.5 w-3.5 text-[#D6A43B]" aria-hidden="true" />
          <span>{copy('تحديث')}</span>
        </button>
      </div>

      {error && (
        <p role="alert" className="text-[12px] font-bold text-[var(--mn-danger-text)]">
          {error}
        </p>
      )}

      {!rows.length && (
        <p className="rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] p-4 text-center text-[12px] font-medium leading-[1.8] text-[var(--mn-text-muted)]">
          {copy('تظهر شهادة منارتك للدورات المؤهلة بعد إتمام المتطلبات وانتهاء عملية إصدار الشهادة.')}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map((row) => (
          <article
            key={row.id}
            className="mn-student-learning-certificate relative overflow-hidden flex min-w-0 flex-col justify-between rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] p-3 pr-4 shadow-2xs transition-all hover:border-[#D6A43B]/60 font-['Cairo',sans-serif]"
          >
            {/* Signature Golden Accent Line on Right Edge */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 w-[3.5px] bg-gradient-to-b from-[#142B5F] via-[#D6A43B] to-[#B78622]"
            />

            <div>
              {/* Header: Title & Status Badge */}
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-[13px] sm:text-[13.5px] font-bold leading-snug text-[var(--mn-heading)] break-words">
                  {row.courseDisplayName}
                </h4>
                <span className="shrink-0 inline-flex items-center gap-1 rounded-full border border-[var(--mn-success-border)] bg-[var(--mn-success-soft)] px-2 py-0.5 text-[10.5px] font-bold text-[var(--mn-success-text)]">
                  <Check className="h-3 w-3 shrink-0 text-[var(--mn-success-text)]" aria-hidden="true" />
                  <span>{certificateStatusCopy(language, row.status)}</span>
                </span>
              </div>

              {/* Metadata Row: Serial & Date */}
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-medium text-[var(--mn-text-muted)]">
                <span>{copy('تاريخ الإصدار')}: <strong className="font-semibold text-[var(--mn-heading)]">{new Date(row.issuedAt).toLocaleDateString(language === 'ar' ? 'ar' : 'en')}</strong></span>
                <span className="text-[var(--mn-border)]">•</span>
                <span>الرقم التسلسلي: <strong className="font-mono font-semibold text-[var(--mn-heading)]" dir="ltr">{row.serialNumber}</strong></span>
              </div>
            </div>

            {/* Actions Bar */}
            <StudentCertificateActions
              certificate={row}
              onSaveReference={async () => {
                await ApiClient.createMyStudentSavedItem({
                  entityType: 'CERTIFICATE',
                  entityId: row.id,
                });
              }}
            />
          </article>
        ))}
      </div>

      {cursor && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void more()}
          className="w-full min-h-9 rounded-lg border border-[var(--mn-border)] bg-[var(--mn-page)] px-4 py-2 text-[12px] font-bold text-[var(--mn-heading)] hover:border-[#D6A43B] transition-all disabled:opacity-50 cursor-pointer"
        >
          {busy ? copy('جارٍ التحميل…') : copy('عرض المزيد')}
        </button>
      )}
    </section>
  );
}
