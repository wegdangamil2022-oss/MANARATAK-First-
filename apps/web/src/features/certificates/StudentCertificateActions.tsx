import { useTranslation } from '../../i18n/I18nProvider';
import { certificateCopy } from '@manaratak/shared';
import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { createQrMatrix } from '@manaratak/shared';
import { ApiClient, type StudentCertificateProjectionDto } from '../../api/client';

export function StudentCertificateActions({
  certificate,
}: {
  certificate: StudentCertificateProjectionDto;
}) {
  const {language} = useTranslation();
  const copy = useCallback((value:string) => certificateCopy(language,value), [language]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
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
      const grant = await ApiClient.getMyCertificateArtifactDeliveryGrant(certificate.id, 'pdf');
      if (!/^https?:\/\//i.test(grant.url)) throw new Error(copy("رابط ملف الشهادة غير صالح."));
      const response = await fetch(grant.url, { headers: grant.headers });
      if (!response.ok) throw new Error(copy("تعذر تنزيل الشهادة."));
      const objectUrl = URL.createObjectURL(await response.blob());
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = `${certificate.serialNumber || 'certificate'}.pdf`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
    } catch (error) {
      setError(error instanceof Error ? error.message : copy("تعذر تحميل الشهادة"));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mt-3 space-y-3">
      {matrix && (
        <svg
          role="img"
          aria-label={copy("QR للتحقق من الشهادة")}
          viewBox={`0 0 ${matrix.length + 8} ${matrix.length + 8}`}
          className="h-28 w-28 rounded bg-white p-1"
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
      )}
      <div className="flex flex-wrap gap-3 text-xs font-bold">
        {verifyPath && (
          <Link to={verifyPath} className="text-[var(--mn-secondary)] underline">
            {copy("التحقق من الشهادة")}</Link>
        )}
        {certificate.certificatePdfAssetId ? (
          <button
            disabled={busy}
            onClick={() => void download()}
            className="text-[var(--mn-secondary)] underline disabled:opacity-50"
          >
            {busy ? copy("جارٍ التحميل…") : copy("تحميل الشهادة PDF")}
          </button>
        ) : (
          <span className="text-[var(--mn-text-muted)]">{copy("ملف الشهادة قيد التجهيز")}</span>
        )}
      </div>
      {!matrix && verifyPath && (
        <p className="text-xs text-[var(--mn-text-muted)]">
          {copy("يمكن التحقق عبر الرابط أو رمز الشهادة.")}</p>
      )}
      {error && (
        <p role="alert" className="text-xs text-[var(--mn-danger-text)]">
          {error}
        </p>
      )}
    </div>
  );
}
