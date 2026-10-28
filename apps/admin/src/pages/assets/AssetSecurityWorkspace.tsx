import { useEffect, useState } from 'react';
import { adminApiClient } from '../../api/client';
import { useTranslation } from '../../i18n/I18nProvider';
import { OperationsNotice } from '../../features/operations/OperationsWorkspace';
interface Capabilities {
  upload: boolean;
  scanner: string;
  sanitizer: string;
  delivery: boolean;
  verifiedAt: null;
}
export function AssetSecurityWorkspace() {
  const { language } = useTranslation(),
    c = (ar: string, en: string) => (language === 'ar' ? ar : en);
  const [data, setData] = useState<Capabilities | null>(null),
    [error, setError] = useState(false),
    [busy, setBusy] = useState(false);
  const load = async () => {
    setBusy(true);
    setError(false);
    try {
      setData(await adminApiClient.request<Capabilities>('/admin/assets/capabilities'));
    } catch {
      setData(null);
      setError(true);
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  return (
    <section className="operations-panel">
      <h2>{c('قدرات التخزين والأمان', 'Storage and security capabilities')}</h2>
      <button className="operations-button" disabled={busy} onClick={() => void load()}>
        {c('تحديث حالة التهيئة', 'Refresh configuration status')}
      </button>
      {error && (
        <OperationsNotice error>
          {c(
            'تعذر قراءة حالة المزود. الحالة مجهولة وليست جاهزة.',
            'Provider state is unavailable and readiness is unknown.',
          )}
        </OperationsNotice>
      )}
      {data && (
        <>
          <div className="operations-filters">
            <p>
              {c('إذن الرفع المباشر', 'Direct upload')}:{' '}
              {data.upload
                ? c('مهيأ — يحتاج تحققًا تشغيليًا', 'Configured — runtime unverified')
                : c('غير متاح', 'Unavailable')}
            </p>
            <p>
              {c('فحص البرمجيات الخبيثة', 'Malware scan')}:{' '}
              {data.scanner === 'UNAVAILABLE'
                ? c('غير متاح', 'Unavailable')
                : c('مهيأ — يحتاج تحققًا تشغيليًا', 'Configured — runtime unverified')}
            </p>
            <p>
              {c('تنقية الملفات', 'Sanitization')}:{' '}
              {data.sanitizer === 'UNAVAILABLE'
                ? c('غير متاحة', 'Unavailable')
                : c('مهيأة — تحتاج تحققًا تشغيليًا', 'Configured — runtime unverified')}
            </p>
            <p>
              {c('إذن الوصول المؤقت', 'Temporary delivery')}:{' '}
              {data.delivery
                ? c('مهيأ — يخضع لسياسة الملف', 'Configured — subject to asset policy')
                : c('غير متاح', 'Unavailable')}
            </p>
          </div>
          <OperationsNotice>
            {c(
              'هذه حالة تهيئة وليست فحص اتصال أو شهادة سلامة. لكل ملف أدلة فحص مستقلة، ولا يجري حذف أو تنظيف تلقائي من هذه الصفحة.',
              'This is configuration status, not a connectivity or safety attestation. Each asset has its own evidence; no automatic cleanup runs here.',
            )}
          </OperationsNotice>
        </>
      )}
    </section>
  );
}
