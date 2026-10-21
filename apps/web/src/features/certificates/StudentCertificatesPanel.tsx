import { PreviewStudentApiClient } from '../students/studentWorkspacePreviewApi';
const ApiClient = import.meta.env.VITE_PUBLIC_TEMPLATE_DATA_MODE === 'prototype' ? PreviewStudentApiClient : LiveApiClient;
import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiClient as LiveApiClient, type StudentCertificateProjectionDto } from '../../api/client';
import { certificateCopy, certificateStatusCopy } from '@manaratak/shared';
import { useTranslation } from '../../i18n/I18nProvider';
import { StudentCertificateActions } from './StudentCertificateActions';

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
    // Poll the canonical owner, including an initially empty list, so asynchronous issuance arrives.
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
    <section id="certificates" className={compactLearning ? "mn-student-learning-certificates scroll-mt-6 space-y-3" : "space-y-3 scroll-mt-6"} aria-label={copy('الشهادات')}>
      <div className={compactLearning ? "flex items-center justify-end" : "flex items-center justify-between"}>
        {!compactLearning && <h3 className="font-bold">{copy('إنجازاتي وشهاداتي')}</h3>}
        <button
          type="button"
          onClick={() => {
            setBusy(false);
            setRefresh((value) => value + 1);
          }}
          className={compactLearning
            ? "inline-flex min-h-9 items-center rounded-lg border border-[var(--mn-border)] bg-[var(--mn-page)] px-3 py-1.5 text-[12px] font-bold text-[var(--mn-primary)] transition-colors hover:border-[#D6A43B]"
            : "text-xs underline"}
        >
          {copy('تحديث')}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-[var(--mn-danger-text)]">
          {error}
        </p>
      )}
      {!rows.length && (
        <p className={compactLearning
          ? "rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] p-4 text-center text-[12px] leading-[1.9] text-[var(--mn-text-muted)]"
          : "rounded-xl border p-5 text-sm"}>
          {copy(
            'تظهر شهادة منارتك للدورات المؤهلة بعد إتمام المتطلبات وانتهاء عملية إصدار الشهادة.',
          )}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map((row) => (
          <article
            key={row.id}
            className={compactLearning
              ? "mn-student-learning-certificate min-w-0 rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] p-3.5"
              : "rounded-2xl border border-[#D6A43B]/40 bg-[var(--mn-surface)] p-4"}
          >
            <h4 className={compactLearning ? "text-[14px] font-bold leading-[1.65] text-[var(--mn-heading)] break-words" : "font-bold"}>{row.courseDisplayName}</h4>
            <p className={compactLearning ? "mt-1 text-[11px] font-semibold text-[var(--mn-text-muted)]" : "mt-1 text-xs"}>{certificateStatusCopy(language, row.status)}</p>
            <p className={compactLearning ? "mt-2 text-[11px] text-[var(--mn-text-muted)] break-all" : "mt-2 text-xs"} dir="ltr">
              {row.serialNumber}
            </p>
            <p className={compactLearning ? "text-[11px] text-[var(--mn-text-muted)]" : "text-xs"}>
              {copy('تاريخ الإصدار')}:{' '}
              {new Date(row.issuedAt).toLocaleDateString(language === 'ar' ? 'ar' : 'en')}
            </p>
            <StudentCertificateActions certificate={row} />
            <button type="button" disabled={busy} className={compactLearning
              ? "mt-2 inline-flex min-h-9 items-center rounded-lg border border-[var(--mn-border)] bg-[var(--mn-surface)] px-3 py-1.5 text-[12px] font-bold text-[var(--mn-primary)] disabled:opacity-50"
              : undefined} onClick={()=>{setBusy(true);setError('');void ApiClient.createMyStudentSavedItem({entityType:'CERTIFICATE',entityId:row.id}).catch(()=>setError(language==='en'?'Could not save this owned certificate.':'تعذر حفظ الشهادة المملوكة لك.')).finally(()=>setBusy(false));}}>{language==='en'?'Save certificate reference':'حفظ مرجع الشهادة'}</button>

          </article>
        ))}
      </div>
      {cursor && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void more()}
          className={compactLearning
            ? "min-h-9 rounded-lg border border-[var(--mn-border)] bg-[var(--mn-page)] px-4 py-2 text-[12px] font-bold text-[var(--mn-primary)] disabled:opacity-50"
            : "rounded-lg border px-4 py-2 text-sm disabled:opacity-50"}
        >
          {busy ? copy('جارٍ التحميل…') : copy('عرض المزيد')}
        </button>
      )}
    </section>
  );
}
