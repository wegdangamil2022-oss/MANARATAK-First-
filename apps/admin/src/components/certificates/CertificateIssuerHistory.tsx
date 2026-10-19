import { certificateCopy, certificateStatusCopy } from '@absheer/shared';
import { useTranslation } from '../../i18n/I18nProvider';
export type CertificateIssuerHistoryEntry = {
  id: string;
  action: string;
  actorId: string;
  timestamp: string;
  contextMetadata: Record<string, unknown>;
};
const fields = [
  'name',
  'issuerType',
  'status',
  'universityId',
  'organizationId',
  'issuerLogoAssetId',
  'signingKeyReference',
  'accreditationAuthority',
  'accreditationReference',
];
export function CertificateIssuerHistory({
  rows,
}: {
  rows: CertificateIssuerHistoryEntry[];
}) {
  const { language } = useTranslation(),
    copy = (value: string) => certificateCopy(language, value);
  const display = (value: unknown) =>
    typeof value === 'string'
      ? certificateStatusCopy(language, copy(value))
      : copy('غير محدد');
  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const before = row.contextMetadata.before as
            Record<string, unknown> | null | undefined,
          after = row.contextMetadata.after as
            Record<string, unknown> | undefined;
        const changed = fields.filter((key) => before?.[key] !== after?.[key]);
        const trust = after?.trust as Record<string, unknown> | undefined;
        return (
          <article key={row.id} className="rounded border p-3">
            <p>
              {copy(row.action)} ·{' '}
              {new Intl.DateTimeFormat(language, {
                dateStyle: 'medium',
                timeStyle: 'short',
              }).format(new Date(row.timestamp))}{' '}
              · {copy('المراجع')}: {row.actorId}
            </p>
            <p>
              {copy('نسخة السلطة')}:{' '}
              {String(row.contextMetadata.authorityVersion ?? '—')} ·{' '}
              {copy('السبب')}: {String(row.contextMetadata.reason ?? '—')}
            </p>
            {!after ? (
              <p>{copy('السجل القديم لا يحتوي مقارنة تفصيلية.')}</p>
            ) : (
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
                    <tr key={key}>
                      <th>{copy(key)}</th>
                      <td className="break-all">{display(before?.[key])}</td>
                      <td className="break-all">{display(after[key])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {trust ? (
              <p>
                {copy('وثيقة التفويض')}: {String(trust.evidenceAssetId ?? '—')}{' '}
                · {copy('مرجع السلطة')}:{' '}
                {String(trust.authorityReference ?? '—')} · {copy('المعتمد')}:{' '}
                {String(trust.approvedBy ?? '—')}
              </p>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
