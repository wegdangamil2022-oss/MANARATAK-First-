import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { certificateCopy } from '@absheer/shared';
import { useTranslation } from '../../i18n/I18nProvider';
import { useAdminAuthorization } from '../../security/AdminAuthorizationContext';
import { adminApiClient } from '../../api/client';
export function CertificateVerificationPolicyPanel() {
  const { language } = useTranslation(),
    copy = (value: string) => certificateCopy(language, value),
    { hasPermission } = useAdminAuthorization();
  const [policy, setPolicy] = useState<{
      retentionDays: number | null;
      ipPerMinute: number;
      codePerMinute: number;
    } | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
  useEffect(() => {
    let active = true;
    adminApiClient
      .request<NonNullable<typeof policy>>(
        '/admin/certificates/verification-policy',
      )
      .then((value) => {
        if (active) setPolicy(value);
      })
      .catch(() => {
        if (active) setError('تعذر تحميل سياسة التحقق');
      });
    return () => {
      active = false;
    };
  }, []);
  const prepare = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const definitions = [
        {
          key: 'certificates.verification.retention_days',
          label: 'مدة الاحتفاظ بالأيام',
          max: 36500,
        },
        {
          key: 'certificates.verification.ip_per_minute',
          label: 'طلبات التحقق لكل عنوان في الدقيقة',
          max: 10000,
          defaultValue: 60,
        },
        {
          key: 'certificates.verification.code_per_minute',
          label: 'طلبات التحقق لكل رمز في الدقيقة',
          max: 10000,
          defaultValue: 120,
        },
      ];
      for (const definition of definitions) {
        const response = await adminApiClient.request<{
          data: { definitions: Array<{ key: string }> };
        }>(
          `/admin/settings/definitions?q=${encodeURIComponent(definition.key)}&limit=100`,
        );
        if (
          response.data.definitions.some((item) => item.key === definition.key)
        )
          continue;
        await adminApiClient.request('/admin/settings/definitions', {
          method: 'POST',
          body: JSON.stringify({
            id: crypto.randomUUID(),
            key: definition.key,
            valueType: 'Number',
            consumerDomain: 'certificates',
            description:
              certificateCopy('ar', definition.label) +
              ' / ' +
              certificateCopy('en', definition.label),
            validationRules: { min: 1, max: definition.max, integer: true },
            ...(definition.defaultValue === undefined
              ? {}
              : { defaultValue: definition.defaultValue }),
          }),
        });
      }
      setMessage('تم تجهيز التعريفات؛ اختر القيم من إعدادات النظام.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تجهيز سياسة التحقق');
    } finally {
      setBusy(false);
    }
  };
  return (
    <article className="rounded-2xl border bg-white p-5">
      <h2 className="font-bold">{copy('سياسة سجلات التحقق')}</h2>
      {error ? (
        <p role="alert">{copy(error)}</p>
      ) : !policy ? (
        <p>{copy('جارٍ التحميل…')}</p>
      ) : (
        <dl>
          <dt>{copy('مدة الاحتفاظ بالأيام')}</dt>
          <dd>
            {policy.retentionDays === null
              ? copy('غير محددة؛ الحذف التلقائي متوقف')
              : new Intl.NumberFormat(language).format(policy.retentionDays)}
          </dd>
          <dt>{copy('طلبات التحقق لكل عنوان في الدقيقة')}</dt>
          <dd>{new Intl.NumberFormat(language).format(policy.ipPerMinute)}</dd>
          <dt>{copy('طلبات التحقق لكل رمز في الدقيقة')}</dt>
          <dd>
            {new Intl.NumberFormat(language).format(policy.codePerMinute)}
          </dd>
        </dl>
      )}
      {message ? <p role="status">{copy(message)}</p> : null}
      {hasPermission('admin:settings:manage') ? (
        <button disabled={busy} onClick={() => void prepare()}>
          {copy('تهيئة تعريفات السياسة')}
        </button>
      ) : null}
      {hasPermission('admin:settings:manage') ? (
        <Link to="/settings">{copy('تعديل السياسة من إعدادات النظام')}</Link>
      ) : null}
    </article>
  );
}
