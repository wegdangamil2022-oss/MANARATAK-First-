import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiClient, type StudentCertificateProjectionDto } from '../../api/client';
import { certificateCopy, certificateStatusCopy } from '@manaratak/shared';
import { useTranslation } from '../../i18n/I18nProvider';
import { StudentCertificateActions } from './StudentCertificateActions';

export function StudentCertificatesPanel({
  initial,
}: {
  initial: StudentCertificateProjectionDto[];
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
    <section id="certificates" className="space-y-3 scroll-mt-6" aria-label={copy('الشهادات')}>
      <div className="flex items-center justify-between">
        <h3 className="font-bold">{copy('إنجازاتي وشهاداتي')}</h3>
        <button
          type="button"
          onClick={() => {
            setBusy(false);
            setRefresh((value) => value + 1);
          }}
          className="text-xs underline"
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
        <p className="rounded-xl border p-5 text-sm">
          {copy(
            'تظهر شهادة منارتك للدورات المؤهلة بعد إتمام المتطلبات وانتهاء عملية إصدار الشهادة.',
          )}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map((row) => (
          <article
            key={row.id}
            className="rounded-2xl border border-[#D6A43B]/40 bg-[var(--mn-surface)] p-4"
          >
            <h4 className="font-bold">{row.courseDisplayName}</h4>
            <p className="mt-1 text-xs">{certificateStatusCopy(language, row.status)}</p>
            <p className="mt-2 text-xs" dir="ltr">
              {row.serialNumber}
            </p>
            <p className="text-xs">
              {copy('تاريخ الإصدار')}:{' '}
              {new Date(row.issuedAt).toLocaleDateString(language === 'ar' ? 'ar' : 'en')}
            </p>
            <StudentCertificateActions certificate={row} />
          </article>
        ))}
      </div>
      {cursor && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void more()}
          className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50"
        >
          {busy ? copy('جارٍ التحميل…') : copy('عرض المزيد')}
        </button>
      )}
    </section>
  );
}
