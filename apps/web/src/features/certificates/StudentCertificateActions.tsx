import { useTranslation } from '../../i18n/I18nProvider';
import { certificateCopy } from '@manaratak/shared';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { createQrMatrix } from '@manaratak/shared';
import { ApiClient, type StudentCertificateProjectionDto } from '../../api/client';
import { Eye, ShieldCheck, Download, Bookmark, FileText } from 'lucide-react';

export function StudentCertificateActions({
  certificate,
  onSaveReference,
}: {
  certificate: StudentCertificateProjectionDto;
  onSaveReference?: () => Promise<void>;
}) {
  const { language } = useTranslation();
  const isPrototype = import.meta.env.VITE_PUBLIC_TEMPLATE_DATA_MODE === 'prototype';
  const copy = useCallback((value: string) => certificateCopy(language, value), [language]);
  const [busy, setBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState('');
  const previewRef = useRef('');
  const [previewBusy, setPreviewBusy] = useState(false);
  const requestRef = useRef<AbortController | null>(null);

  const closePreview = () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = '';
    setPreview('');
  };

  useEffect(
    () => () => {
      requestRef.current?.abort();
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    [],
  );

  const viewPreview = async () => {
    setPreviewBusy(true);
    setError('');
    const controller = new AbortController();
    requestRef.current = controller;
    try {
      if (isPrototype) {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="540" viewBox="0 0 900 540">
          <rect width="900" height="540" fill="#f7f8fb"/><rect x="25" y="25" width="850" height="490" fill="none" stroke="#142B5F" stroke-width="4"/>
          <text x="450" y="155" text-anchor="middle" font-size="38" fill="#142B5F" font-family="sans-serif">MANARATAK</text>
          <text x="450" y="255" text-anchor="middle" font-size="45" fill="#B38018" font-family="sans-serif">DEMO / PREVIEW</text>
          <text x="450" y="320" text-anchor="middle" font-size="25" fill="#142B5F" font-family="sans-serif">NOT A VALID CERTIFICATE</text>
          <text x="450" y="388" text-anchor="middle" font-size="20" fill="#142B5F" font-family="sans-serif">Design-only visual placeholder</text>
        </svg>`;
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        closePreview();
        previewRef.current = URL.createObjectURL(blob);
        setPreview(previewRef.current);
        return;
      }
      const blob = await ApiClient.getMyCertificateArtifactBlob(certificate.id, 'preview', controller.signal);
      if (!['image/svg+xml', 'image/png', 'image/jpeg'].includes(blob.type))
        throw new Error(copy('رابط ملف الشهادة غير صالح.'));
      if (controller.signal.aborted) return;
      closePreview();
      previewRef.current = URL.createObjectURL(blob);
      setPreview(previewRef.current);
    } catch (error) {
      if (!controller.signal.aborted)
        setError(error instanceof Error ? error.message : copy('تعذر تحميل الشهادة'));
    } finally {
      if (!controller.signal.aborted) setPreviewBusy(false);
    }
  };

  const verifyPath = certificate.verificationCode
    ? `/certificates/verify?code=${encodeURIComponent(certificate.verificationCode)}`
    : null;
  const verificationUrl =
    certificate.verificationUrl ||
    (verifyPath ? new URL(verifyPath, window.location.origin).href : '');
  const matrix = useMemo(() => {
    try {
      return verificationUrl ? createQrMatrix(verificationUrl) : null;
    } catch {
      return null;
    }
  }, [verificationUrl]);

  const download = async () => {
    setBusy(true);
    setError('');
    try {
      if (isPrototype) {
        setError(copy('معاينة فقط: لا توجد شهادة رسمية أو ملف PDF قابل للتنزيل. استخدم زر عرض الشهادة لتجربة التصميم.'));
        return;
      }
      const blob = await ApiClient.getMyCertificateArtifactBlob(certificate.id, 'pdf');
      if (blob.type !== 'application/pdf') throw new Error(copy('تعذر تنزيل الشهادة.'));
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = `${certificate.serialNumber || 'certificate'}.pdf`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
    } catch (error) {
      setError(error instanceof Error ? error.message : copy('تعذر تحميل الشهادة'));
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    if (!onSaveReference || saveBusy) return;
    setSaveBusy(true);
    setError('');
    try {
      await onSaveReference();
    } catch {
      setError(language === 'en' ? 'Could not save this owned certificate.' : 'تعذر حفظ الشهادة المملوكة لك.');
    } finally {
      setSaveBusy(false);
    }
  };

  return (
    <div className="mt-2.5 pt-2 border-t border-[var(--mn-border)] space-y-2 font-['Cairo',sans-serif]">
      {/* Compact QR Section if present */}
      {matrix && (
        <div className="flex items-center gap-2.5 rounded-lg bg-[var(--mn-surface)] border border-[var(--mn-border)] p-2">
          <svg
            role="img"
            aria-label={copy('QR للتحقق من الشهادة')}
            viewBox={`0 0 ${matrix.length + 8} ${matrix.length + 8}`}
            className="h-12 w-12 shrink-0 rounded bg-white p-1 border border-slate-200"
            shapeRendering="crispEdges"
          >
            <rect width="100%" height="100%" fill="white" />
            {matrix.flatMap((row, y) =>
              row.map((filled, x) =>
                filled ? (
                  <rect key={`${x}:${y}`} x={x + 4} y={y + 4} width={1} height={1} fill="black" />
                ) : null,
              ),
            )}
          </svg>
          <div className="min-w-0 flex-1 text-[11px] leading-snug text-[var(--mn-text-muted)]">
            <span className="font-bold text-[var(--mn-heading)] block">رمز التحقق السريع (QR)</span>
            <span className="text-[10.5px]">يمكنك مسح الرمز للتحقق الفوري من صحة الشهادة</span>
          </div>
        </div>
      )}

      {/* Action Buttons Row - Neatly arranged, tight spacing */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        {certificate.previewImageAssetId && (
          <button
            type="button"
            disabled={previewBusy}
            onClick={() => void viewPreview()}
            className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg bg-[#142B5F] hover:bg-[#163D76] dark:bg-[#D6A43B] dark:text-[#142B5F] dark:hover:bg-[#E5B54F] px-3 py-1.5 text-[13px] font-bold text-white transition-all shadow-2xs cursor-pointer disabled:opacity-50 font-['Cairo',sans-serif]"
          >
            <Eye className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{previewBusy ? copy('جارٍ التحميل…') : copy('عرض الشهادة')}</span>
          </button>
        )}

        {verifyPath && (isPrototype ? (
          <button
            type="button"
            onClick={() => setError(copy('هذه شهادة توضيحية فقط؛ لا توجد شهادة رسمية للتحقق منها.'))}
            className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg border border-[var(--mn-border)] bg-[var(--mn-surface)] hover:bg-[var(--mn-page)] px-3 py-1.5 text-[13px] font-bold text-[var(--mn-heading)] transition-all hover:border-[#D6A43B]/60 cursor-pointer font-['Cairo',sans-serif]"
          >
            <ShieldCheck className="h-4 w-4 shrink-0 text-[#D6A43B]" aria-hidden="true" />
            <span>{copy('التحقق من الشهادة')}</span>
          </button>
        ) : (
          <Link
            to={verifyPath}
            className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg border border-[var(--mn-border)] bg-[var(--mn-surface)] hover:bg-[var(--mn-page)] px-3 py-1.5 text-[13px] font-bold text-[var(--mn-heading)] transition-all hover:border-[#D6A43B]/60 cursor-pointer font-['Cairo',sans-serif]"
          >
            <ShieldCheck className="h-4 w-4 shrink-0 text-[#D6A43B]" aria-hidden="true" />
            <span>{copy('التحقق من الشهادة')}</span>
          </Link>
        ))}

        {certificate.certificatePdfAssetId ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void download()}
            className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg border border-[var(--mn-border)] bg-[var(--mn-surface)] hover:bg-[var(--mn-page)] px-3 py-1.5 text-[13px] font-bold text-[var(--mn-heading)] transition-all hover:border-[#D6A43B]/60 cursor-pointer disabled:opacity-50 font-['Cairo',sans-serif]"
          >
            <Download className="h-4 w-4 shrink-0 text-[#0E7C86]" aria-hidden="true" />
            <span>{busy ? copy('جارٍ التحميل…') : copy('تحميل الشهادة PDF')}</span>
          </button>
        ) : (
          <span className="inline-flex min-h-8 items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-[var(--mn-text-muted)] border border-dashed border-[var(--mn-border)] rounded-lg font-['Cairo',sans-serif]">
            <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{copy('ملف الشهادة قيد التجهيز')}</span>
          </span>
        )}

        {onSaveReference && (
          <button
            type="button"
            disabled={saveBusy}
            onClick={() => void handleSave()}
            className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg border border-[var(--mn-border)] bg-[var(--mn-surface)] hover:bg-[var(--mn-page)] px-3 py-1.5 text-[13px] font-bold text-[var(--mn-heading)] transition-all hover:border-[#D6A43B]/60 cursor-pointer disabled:opacity-50 font-['Cairo',sans-serif]"
          >
            <Bookmark className="h-4 w-4 shrink-0 text-[#142B5F] dark:text-[#E5B54F]" aria-hidden="true" />
            <span>{saveBusy ? copy('جارٍ الحفظ…') : (language === 'en' ? 'Save reference' : 'حفظ مرجع الشهادة')}</span>
          </button>
        )}
      </div>

      {preview && (
        <div className="mt-2 space-y-2 rounded-xl border border-[var(--mn-border)] bg-[var(--mn-surface)] p-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--mn-heading)]">معاينة الشهادة</span>
            <button type="button" onClick={closePreview} className="text-[11px] font-bold text-rose-600 hover:underline">
              {copy('إغلاق')}
            </button>
          </div>
          <img src={preview} alt={copy('معاينة الشهادة')} className="w-full rounded-lg border border-[var(--mn-border)]" />
        </div>
      )}

      {error && (
        <p role="alert" className="text-[11px] font-bold text-[var(--mn-danger-text)] mt-1">
          {error}
        </p>
      )}
    </div>
  );
}
