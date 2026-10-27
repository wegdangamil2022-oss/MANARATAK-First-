import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { certificateCopy } from '@manaratak/shared';
import { AssetPicker } from '../../components/AssetPicker';
import { CanonicalPicker } from '../../components/CanonicalPicker';
import { canonicalPickerApi } from '../../api/canonicalPickers';
import { useAdminAuthorization } from '../../security/AdminAuthorizationContext';
import { useAdministrationDraftGuard } from '../reference-data/useAdministrationDraftGuard';
import { CertificatePanel, CertificateBack, CertificateNotice } from './CertificateControls';
import { Field } from './CertificateFields';
import { useCertificateCopy, useCertificateCommand } from './certificateHooks';
import type { CertificateIssuer } from './certificateModels';
export function CertificateIssuerEditor({
  source,
  editing,
}: {
  source?: CertificateIssuer;
  editing: boolean;
}) {
  const { c, ar, language } = useCertificateCopy(),
    copy = (value: string) => certificateCopy(language, value),
    navigate = useNavigate(),
    command = useCertificateCommand(),
    { hasPermission } = useAdminAuthorization();
  const editingIssuer = editing ? source : null;
  const [initial] = useState(() => ({
    code: source?.code ?? '',
    name: source?.name ?? '',
    issuerType: source?.issuerType ?? 'MANARATAK',
    issuerLogoAssetId: source?.issuerLogoAssetId ?? '',
    signingKeyReference: source?.signingKeyReference ?? '',
    accreditationAuthority: source?.accreditationAuthority ?? '',
    accreditationReference: source?.accreditationReference ?? '',
    universityId: source?.universityId ?? '',
    organizationId: source?.organizationId ?? '',
  }));
  const [issuerDraft, setIssuerDraft] = useState(initial),
    [reviewReason, setReviewReason] = useState(''),
    [saved, setSaved] = useState(false);
  useAdministrationDraftGuard(
    !saved &&
      (JSON.stringify(initial) !== JSON.stringify(issuerDraft) ||
        Boolean(reviewReason) ||
        command.uncertain),
    ar,
  );
  if (editing && (!source || source.status === 'ACTIVE'))
    return (
      <CertificateNotice error>
        {c(
          'بيانات سلطة الجهة النشطة محمية؛ يلزم تعليقها ومراجعة التغيير أولًا.',
          'Active issuing authority is immutable. Suspend it and review the authority change first.',
        )}
      </CertificateNotice>
    );
  async function saveIssuer(event: FormEvent) {
    event.preventDefault();
    const { code: _code, ...fields } = issuerDraft;
    const payload = {
      ...(editingIssuer ? { ...fields, reason: reviewReason } : issuerDraft),
      universityId:
        issuerDraft.issuerType === 'UNIVERSITY' ? issuerDraft.universityId.trim() || null : null,
      organizationId: !['MANARATAK', 'UNIVERSITY'].includes(issuerDraft.issuerType)
        ? issuerDraft.organizationId.trim() || null
        : null,
      accreditationAuthority: issuerDraft.accreditationAuthority.trim() || null,
      accreditationReference: issuerDraft.accreditationReference.trim() || null,
    };
    const result = await command.execute<CertificateIssuer>(
      editingIssuer
        ? '/admin/certificates/issuers/' + editingIssuer.id
        : '/admin/certificates/issuers',
      payload,
      editingIssuer
        ? { method: 'PATCH', headers: { 'If-Match': '"' + editingIssuer.updatedAt + '"' } }
        : {},
    );
    if (result) {
      setSaved(true);
      navigate('/certificates/issuers/' + result.id, { replace: true });
    }
  }
  return (
    <>
      <CertificateBack
        to={source ? '/certificates/issuers/' + source.id : '/certificates?section=issuers'}
      >
        {c('العودة إلى الجهات', 'Back to issuers')}
      </CertificateBack>
      <CertificatePanel
        title={editing ? c('تعديل جهة إصدار', 'Edit issuer') : c('إضافة جهة إصدار', 'Add issuer')}
      >
        <CertificateNotice>
          {c(
            'إضافة الجهة لا تعتمدها. تُراجع سلطة الإصدار والدليل عبر المسار الرسمي، ومرجع التوقيع يخص مزودًا قائمًا ولا ينشئ مفتاحًا جديدًا.',
            'Creating an issuer does not approve it. Authority and evidence follow the canonical review; the signing reference identifies an existing provider key.',
          )}
        </CertificateNotice>
        {command.error ? <CertificateNotice error>{command.error}</CertificateNotice> : null}
        <form onSubmit={saveIssuer} className="certificate-form">
          <Field
            label={copy('الكود')}
            disabled={Boolean(editingIssuer)}
            value={issuerDraft.code}
            onChange={(v) => setIssuerDraft({ ...issuerDraft, code: v.toUpperCase() })}
          />
          <Field
            label={copy('الاسم')}
            value={issuerDraft.name}
            onChange={(v) => setIssuerDraft({ ...issuerDraft, name: v })}
          />
          <label>
            <span className="text-xs font-bold">{copy('النوع')}</span>
            <select
              value={issuerDraft.issuerType}
              onChange={(e) =>
                setIssuerDraft({
                  ...issuerDraft,
                  issuerType: e.target.value as CertificateIssuer['issuerType'],
                })
              }
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            >
              {[
                'MANARATAK',
                'UNIVERSITY',
                'EDUCATIONAL_INSTITUTION',
                'GOVERNMENT',
                'TRAINING_CENTER',
                'EXTERNAL_PARTNER',
              ].map((v) => (
                <option key={v} value={v}>
                  {copy(v)}
                </option>
              ))}
            </select>
          </label>
          {issuerDraft.issuerType === 'UNIVERSITY' ? (
            hasPermission('admin:universities:manage') ? (
              <CanonicalPicker
                label={c('الجامعة المعتمدة', 'Canonical university')}
                value={issuerDraft.universityId}
                paged
                load={canonicalPickerApi.universities}
                onChange={(id) => setIssuerDraft({ ...issuerDraft, universityId: id ?? '' })}
              />
            ) : (
              <CertificateNotice>
                {c(
                  'اختيار الجامعة يتطلب صلاحية إدارة الجامعات.',
                  'Selecting a university requires university administration permission.',
                )}
              </CertificateNotice>
            )
          ) : null}
          {issuerDraft.issuerType !== 'MANARATAK' && issuerDraft.issuerType !== 'UNIVERSITY' ? (
            <Field
              label={c('مرجع المؤسسة في السجل الرسمي', 'Canonical organization registry reference')}
              value={issuerDraft.organizationId}
              onChange={(organizationId) => setIssuerDraft({ ...issuerDraft, organizationId })}
            />
          ) : null}
          <AssetPicker
            label={copy('أصل شعار الجهة')}
            purpose="CERTIFICATE_ISSUER_LOGO"
            mimeTypePrefix="image/"
            value={issuerDraft.issuerLogoAssetId}
            onChange={(issuerLogoAssetId) => setIssuerDraft({ ...issuerDraft, issuerLogoAssetId })}
          />
          <Field
            label={copy('مرجع مفتاح التوقيع')}
            value={issuerDraft.signingKeyReference}
            onChange={(v) => setIssuerDraft({ ...issuerDraft, signingKeyReference: v })}
          />
          <Field
            label={copy('جهة اعتماد خارجية')}
            value={issuerDraft.accreditationAuthority}
            optional
            onChange={(v) => setIssuerDraft({ ...issuerDraft, accreditationAuthority: v })}
          />
          <Field
            label={copy('مرجع الاعتماد الخارجي')}
            value={issuerDraft.accreditationReference}
            optional
            onChange={(v) => setIssuerDraft({ ...issuerDraft, accreditationReference: v })}
          />
          <div className="md:col-span-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-900">
            {copy(
              'لجهة MANARATAK لا نكتب اعتمادًا خارجيًا ما لم يوجد أساس قانوني حقيقي. الشهادة الافتراضية توصف كشهادة إتمام رقمية من المنصة.',
            )}
          </div>
          <div className="flex justify-end gap-2 md:col-span-2">
            <button
              type="button"
              onClick={() =>
                navigate(
                  source ? '/certificates/issuers/' + source.id : '/certificates?section=issuers',
                )
              }
              className="rounded-xl border px-4 py-2 text-sm font-bold"
            >
              {copy('إلغاء')}
            </button>
            <button disabled={command.busy} className="certificate-primary">
              {command.busy ? c('جاري الحفظ…', 'Saving…') : c('حفظ الجهة', 'Save issuer')}
            </button>
          </div>
          {editingIssuer ? (
            <Field label={copy('سبب الاعتماد')} value={reviewReason} onChange={setReviewReason} />
          ) : null}
        </form>
      </CertificatePanel>
    </>
  );
}
