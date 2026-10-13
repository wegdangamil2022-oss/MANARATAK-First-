import { useState } from 'react';
import { certificateCopy, certificateStatusCopy } from '@manaratak/shared';
import { useTranslation } from '../../i18n/I18nProvider';
import {
  CertificatePreview,
  type CertificateTemplatePreviewModel,
} from './CertificatePreview';
export type CertificateReviewVersion = CertificateTemplatePreviewModel & {
  id: string;
  versionNumber: string;
  createdBy: string;
  [key: string]: unknown;
};
export type CertificateTemplateReviewSnapshot = {
  templateId: string;
  currentVersionId: string;
  status: string;
  current: CertificateReviewVersion;
  previous: CertificateReviewVersion | null;
};
const fields = [
  'issuerId',
  'language',
  'layout',
  'accentColor',
  'secondaryColor',
  'titleAr',
  'titleEn',
  'bodyAr',
  'bodyEn',
  'signatoryNameAr',
  'signatoryNameEn',
  'signatoryTitleAr',
  'signatoryTitleEn',
  'logoAssetId',
  'sealAssetId',
  'signatureAssetId',
  'designAssetId',
  'validityPolicy',
  'validityDurationDays',
  'renewalPeriodDays',
  'renewalPolicy',
  'requiresRevalidation',
  'metadata',
];
const canonical = (value: unknown): string =>
  Array.isArray(value)
    ? `[${value.map(canonical).join(',')}]`
    : value && typeof value === 'object'
      ? `{${Object.keys(value)
          .sort()
          .map(
            (key) =>
              `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`,
          )
          .join(',')}}`
      : JSON.stringify(value ?? null);
export function CertificateTemplateReview({
  snapshot,
  busy,
  onConfirm,
}: {
  snapshot: CertificateTemplateReviewSnapshot;
  busy: boolean;
  onConfirm(reason: string): Promise<void>;
}) {
  const { language } = useTranslation(),
    copy = (value: string) => certificateCopy(language, value);
  const [reason, setReason] = useState('');
  const changed = fields.filter(
    (key) =>
      canonical(snapshot.current[key]) !== canonical(snapshot.previous?.[key]),
  );
  const display = (value: unknown) =>
    typeof value === 'boolean'
      ? copy(value ? 'نعم' : 'لا')
      : typeof value === 'string'
        ? certificateStatusCopy(language, value)
        : JSON.stringify(value ?? null);
  return (
    <div className="space-y-4">
      <p>
        {copy('نسخة المراجعة')}{' '}
        <span dir="ltr">
          {snapshot.current.versionNumber} · {snapshot.currentVersionId}
        </span>{' '}
        · {copy('المنشئ')}: {snapshot.current.createdBy}
      </p>
      <CertificatePreview
        template={{
          ...snapshot.current,
          templateVersion: snapshot.current.versionNumber,
        }}
      />
      {!snapshot.previous ? (
        <p>{copy('هذه أول نسخة من القالب.')}</p>
      ) : (
        <p>
          {copy('المقارنة مع النسخة السابقة')}{' '}
          <span dir="ltr">{snapshot.previous.versionNumber}</span>
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th>{copy('الحقل')}</th>
              <th>{copy('قبل')}</th>
              <th>{copy('بعد')}</th>
            </tr>
          </thead>
          <tbody>
            {changed.map((key) => (
              <tr key={key} className="border-t">
                <th>{copy(key)}</th>
                <td className="max-w-sm break-words whitespace-pre-wrap">
                  {display(snapshot.previous?.[key])}
                </td>
                <td className="max-w-sm break-words whitespace-pre-wrap">
                  {display(snapshot.current[key])}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!changed.length ? (
        <p>{copy('لا توجد تغييرات في محتوى النسخة.')}</p>
      ) : null}
      <label className="block">
        {copy('سبب الاعتماد')}
        <textarea
          required
          minLength={8}
          maxLength={2000}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="block w-full rounded border p-2"
        />
      </label>
      <p>
        {copy(
          'يعتمد الإجراء هذه النسخة فقط؛ إذا تغيّرت أثناء المراجعة سيُرفض الطلب.',
        )}
      </p>
      <button
        type="button"
        disabled={busy || reason.trim().length < 8}
        onClick={() => void onConfirm(reason.trim())}
        className="rounded border px-4 py-2 disabled:opacity-40"
      >
        {copy(busy ? 'جارٍ الحفظ…' : 'تأكيد المراجعة')}
      </button>
    </div>
  );
}
