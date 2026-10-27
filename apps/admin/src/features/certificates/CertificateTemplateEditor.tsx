import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  APPROVED_CERTIFICATE_DESIGN,
  approvedCertificateCopy,
  certificateCopy,
} from '@manaratak/shared';
import { AssetPicker } from '../../components/AssetPicker';
import { CertificatePreview } from '../../components/certificates/CertificatePreview';
import { useAdministrationDraftGuard } from '../reference-data/useAdministrationDraftGuard';
import { CertificatePanel, CertificateBack, CertificateNotice } from './CertificateControls';
import { Field, NumberField, TextArea, bumpPatch } from './CertificateFields';
import { useCertificateCopy, useCertificateCommand } from './certificateHooks';
import {
  templateDraft,
  type CertificateTemplate,
  type CertificateTemplateDraft,
  type CertificateIssuer,
} from './certificateModels';
export function toCertificateDraft(
  source?: CertificateTemplate,
  editing = false,
): CertificateTemplateDraft {
  const seed = source ?? templateDraft;
  const metadata = seed.metadata ? JSON.parse(JSON.stringify(seed.metadata)) : {};
  if (!editing) {
    delete metadata.previousVersionId;
    if (source) {
      metadata.copiedFromTemplateId = source.id;
      metadata.copiedFromVersionId = source.currentVersionId;
    }
  }
  return {
    ...templateDraft,
    ...Object.fromEntries(
      Object.keys(templateDraft).map((key) => [
        key,
        (seed as unknown as Record<string, unknown>)[key] ??
          (templateDraft as unknown as Record<string, unknown>)[key],
      ]),
    ),
    code: editing ? seed.code : '',
    templateVersion: source ? (editing ? bumpPatch(source.templateVersion) : '1.0.0') : '1.0.0',
    metadata,
  };
}
export function CertificateTemplateEditor({
  source,
  editing,
  issuers,
}: {
  source?: CertificateTemplate;
  editing: boolean;
  issuers: CertificateIssuer[];
}) {
  const { c, ar, language } = useCertificateCopy(),
    copy = (value: string) => certificateCopy(language, value),
    navigate = useNavigate(),
    command = useCertificateCommand();
  const [initial] = useState(() => ({
    ...toCertificateDraft(source, editing),
    issuerId:
      source?.issuerId ??
      issuers.find((item) => item.code === 'MANARATAK' && item.status === 'ACTIVE')?.id ??
      '',
  }));
  const [draft, setDraft] = useState<CertificateTemplateDraft>(initial),
    [saved, setSaved] = useState(false);
  const editingTemplateId = editing ? source?.id : undefined;
  useAdministrationDraftGuard(
    !saved &&
      (JSON.stringify(draft) !== JSON.stringify(initial) || command.uncertain || command.busy),
    ar,
  );
  if (editing && (!source || source.status !== 'DRAFT'))
    return (
      <CertificateNotice error>
        {c(
          'يمكن تعديل المسودة فقط؛ انسخ القالب النشط كقالب مستقل.',
          'Only drafts can be edited. Copy an active template as an independent template.',
        )}
      </CertificateNotice>
    );
  async function saveTemplate(event: FormEvent) {
    event.preventDefault();
    const payload = {
      ...draft,
      logoAssetId: draft.logoAssetId.trim() || null,
      sealAssetId: draft.sealAssetId.trim() || null,
      signatureAssetId: draft.signatureAssetId.trim() || null,
      designAssetId: draft.designAssetId.trim() || null,
      validityDurationDays:
        draft.validityPolicy === 'PERMANENT' ? null : draft.validityDurationDays,
      renewalPeriodDays: draft.validityPolicy === 'RENEWABLE' ? draft.renewalPeriodDays : null,
      renewalPolicy: draft.validityPolicy === 'RENEWABLE' ? draft.renewalPolicy : null,
    };
    const result = await command.execute<CertificateTemplate>(
      editingTemplateId
        ? '/admin/certificates/templates/' + editingTemplateId
        : '/admin/certificates/templates',
      payload,
      editingTemplateId
        ? {
            method: 'PATCH',
            headers: { 'If-Match': '"' + source!.currentVersionId + ':' + source!.status + '"' },
          }
        : {},
    );
    if (result) {
      setSaved(true);
      navigate('/certificates/templates/' + result.id, { replace: true });
    }
  }
  return (
    <>
      <CertificateBack
        to={
          source && editing
            ? '/certificates/templates/' + source.id
            : '/certificates?section=templates'
        }
      >
        {c('العودة إلى القوالب', 'Back to templates')}
      </CertificateBack>
      <CertificatePanel
        title={
          editing
            ? c('تعديل مسودة القالب', 'Edit draft template')
            : source
              ? c('نسخ كقالب مستقل', 'Copy as independent template')
              : c('قالب شهادة جديد', 'New certificate template')
        }
      >
        {source && !editing ? (
          <CertificateNotice>
            {c(
              'تنشئ هذه العملية قالبًا مستقلًا بكود جديد. لا يتغير القالب الأصلي أو ربط الدورات أو الشهادات الصادرة.',
              'This creates an independent template with a new code. The source template, course bindings and issued certificates remain unchanged.',
            )}
          </CertificateNotice>
        ) : null}
        <nav className="certificate-subnav" aria-label={c('أقسام المحرر', 'Editor sections')}>
          {[
            ['basics', c('الأساسيات', 'Basics')],
            ['content', c('المحتوى', 'Content')],
            ['design', c('التصميم', 'Design')],
            ['validity', c('الصلاحية', 'Validity')],
            ['preview', c('المعاينة', 'Preview')],
          ].map(([id, label]) => (
            <button
              type="button"
              key={id}
              onClick={() =>
                document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
            >
              {label}
            </button>
          ))}
        </nav>
        {command.error ? <CertificateNotice error>{command.error}</CertificateNotice> : null}
        <form onSubmit={saveTemplate} className="certificate-tab-content">
          <fieldset disabled={command.busy} id="basics">
            <legend>{c('البيانات الأساسية', 'Basics')}</legend>
            <div className="certificate-form">
              <Field
                label={copy('الكود')}
                value={draft.code}
                disabled={Boolean(editingTemplateId)}
                onChange={(v) => setDraft({ ...draft, code: v.toUpperCase() })}
              />
              <Field
                label={copy('الاسم الإداري')}
                value={draft.name}
                onChange={(v) => setDraft({ ...draft, name: v })}
              />
              <Field
                label={copy('الاسم العربي')}
                value={draft.nameAr}
                onChange={(v) => setDraft({ ...draft, nameAr: v })}
              />
              <Field
                label={copy('الاسم الإنجليزي')}
                value={draft.nameEn}
                onChange={(v) => setDraft({ ...draft, nameEn: v })}
              />
              <Field
                label={copy('الإصدار')}
                value={draft.templateVersion}
                onChange={(v) => setDraft({ ...draft, templateVersion: v })}
              />
              <label className="block">
                <span className="text-xs font-bold">{copy('جهة الإصدار')}</span>
                <select
                  required
                  value={draft.issuerId}
                  onChange={(e) => setDraft({ ...draft, issuerId: e.target.value })}
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                >
                  <option value="">{copy('اختر...')}</option>
                  {issuers
                    .filter((i) => i.status === 'ACTIVE')
                    .map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                <span className="text-xs font-bold">{copy('لغة الشهادة')}</span>
                <select
                  disabled={draft.metadata?.designId === APPROVED_CERTIFICATE_DESIGN}
                  value={draft.language}
                  onChange={(e) =>
                    setDraft({ ...draft, language: e.target.value as typeof draft.language })
                  }
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                >
                  <option value="BILINGUAL">{copy('عربي + English')}</option>
                  <option value="ARABIC">{copy('العربية')}</option>
                  <option value="ENGLISH">{copy('ENGLISH')}</option>
                </select>
              </label>
              <label>
                <span className="text-xs font-bold">{copy('اتجاه القالب')}</span>
                <select
                  disabled={draft.metadata?.designId === APPROVED_CERTIFICATE_DESIGN}
                  value={draft.layout}
                  onChange={(e) =>
                    setDraft({ ...draft, layout: e.target.value as typeof draft.layout })
                  }
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                >
                  <option value="LANDSCAPE">{copy('أفقي')}</option>
                  <option value="PORTRAIT">{copy('عمودي')}</option>
                </select>
              </label>
              <label>
                <span className="text-xs font-bold">{copy('تصميم الشهادة')}</span>
                <select
                  value={String(draft.metadata?.designId || 'LEGACY')}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      metadata: {
                        ...draft.metadata,
                        designId: e.target.value === 'LEGACY' ? null : APPROVED_CERTIFICATE_DESIGN,
                      },
                      ...(e.target.value !== 'LEGACY'
                        ? {
                            layout: 'LANDSCAPE',
                            language: 'BILINGUAL',
                            designAssetId: '',
                            logoAssetId: '',
                            titleAr: approvedCertificateCopy.titleAr,
                            titleEn: approvedCertificateCopy.titleEn,
                            bodyAr: approvedCertificateCopy.bodyAr,
                            bodyEn: approvedCertificateCopy.bodyEn,
                          }
                        : {}),
                    })
                  }
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                >
                  <option value={APPROVED_CERTIFICATE_DESIGN}>
                    {copy('قالب منارتك المعتمد — عربي / English')}
                  </option>
                  <option value="LEGACY">{copy('القالب السابق')}</option>
                </select>
              </label>
            </div>
          </fieldset>
          <fieldset disabled={command.busy} id="content">
            <legend>{c('النصوص والتوقيعات', 'Content and signatories')}</legend>
            <div className="certificate-form">
              <Field
                label={copy('العنوان العربي')}
                value={draft.titleAr}
                onChange={(v) => setDraft({ ...draft, titleAr: v })}
              />
              <Field
                label={copy('العنوان الإنجليزي')}
                value={draft.titleEn}
                onChange={(v) => setDraft({ ...draft, titleEn: v })}
              />
              <TextArea
                label={copy('النص العربي')}
                value={draft.bodyAr}
                onChange={(v) => setDraft({ ...draft, bodyAr: v })}
              />
              <TextArea
                label={copy('النص الإنجليزي')}
                value={draft.bodyEn}
                onChange={(v) => setDraft({ ...draft, bodyEn: v })}
              />
              <Field
                label={copy('اسم التوقيع العربي')}
                value={draft.signatoryNameAr}
                onChange={(v) => setDraft({ ...draft, signatoryNameAr: v })}
              />
              <Field
                label={copy('صفة التوقيع')}
                value={draft.signatoryTitleAr}
                onChange={(v) => setDraft({ ...draft, signatoryTitleAr: v })}
              />
              <Field
                optional
                label={c('اسم الموقّع بالإنجليزية', 'English signatory name')}
                value={draft.signatoryNameEn}
                onChange={(value) => setDraft({ ...draft, signatoryNameEn: value })}
              />
              <Field
                optional
                label={c('صفة الموقّع بالإنجليزية', 'English signatory title')}
                value={draft.signatoryTitleEn}
                onChange={(value) => setDraft({ ...draft, signatoryTitleEn: value })}
              />
            </div>
          </fieldset>
          <fieldset disabled={command.busy} id="design">
            <legend>{c('التصميم والأصول', 'Design and assets')}</legend>
            <div className="certificate-form">
              <label>
                <span className="text-xs font-bold">{copy('اللون الأساسي')}</span>
                <input
                  type="color"
                  value={draft.accentColor}
                  onChange={(e) =>
                    setDraft({ ...draft, accentColor: e.target.value.toUpperCase() })
                  }
                  className="mt-1 h-10 w-full rounded-lg border"
                />
              </label>
              <label>
                <span className="text-xs font-bold">{copy('الذهبي')}</span>
                <input
                  type="color"
                  value={draft.secondaryColor}
                  onChange={(e) =>
                    setDraft({ ...draft, secondaryColor: e.target.value.toUpperCase() })
                  }
                  className="mt-1 h-10 w-full rounded-lg border"
                />
              </label>
              <div className="md:col-span-2 grid gap-3 rounded-2xl border bg-slate-50 p-4 md:grid-cols-2">
                <h3 className="font-black text-[#142B5F] md:col-span-2">
                  {c('الشعار والختم والتوقيع', 'Logo, seal and signature')}
                </h3>
                {draft.metadata?.designId !== APPROVED_CERTIFICATE_DESIGN && (
                  <AssetPicker
                    label={copy('أصل الشعار')}
                    purpose="CERTIFICATE_TEMPLATE_LOGO"
                    mimeTypePrefix="image/"
                    value={draft.logoAssetId}
                    onChange={(logoAssetId) => setDraft({ ...draft, logoAssetId })}
                  />
                )}
                <AssetPicker
                  label={c('الختم', 'Seal')}
                  purpose="CERTIFICATE_TEMPLATE_SEAL"
                  mimeTypePrefix="image/"
                  value={draft.sealAssetId}
                  onChange={(sealAssetId) => setDraft({ ...draft, sealAssetId })}
                />
                <AssetPicker
                  label={c('التوقيع', 'Signature')}
                  purpose="CERTIFICATE_TEMPLATE_SIGNATURE"
                  mimeTypePrefix="image/"
                  value={draft.signatureAssetId}
                  onChange={(signatureAssetId) => setDraft({ ...draft, signatureAssetId })}
                />
                {draft.metadata?.designId !== APPROVED_CERTIFICATE_DESIGN && (
                  <AssetPicker
                    label="Design Asset"
                    purpose="CERTIFICATE_TEMPLATE_DESIGN"
                    mimeTypePrefix="image/"
                    value={draft.designAssetId}
                    onChange={(designAssetId) => setDraft({ ...draft, designAssetId })}
                  />
                )}
              </div>
            </div>
          </fieldset>
          <fieldset disabled={command.busy} id="validity">
            <legend>{c('الصلاحية وإعادة التحقق', 'Validity and revalidation')}</legend>
            <div className="certificate-form">
              <div className="md:col-span-2 grid gap-3 rounded-2xl border bg-[#fffdf7] p-4 md:grid-cols-2">
                <h3 className="font-black text-[#142B5F] md:col-span-2">
                  {copy('سياسة الصلاحية')}
                </h3>
                <label>
                  <span className="text-xs font-bold">{copy('السياسة')}</span>
                  <select
                    value={draft.validityPolicy}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        validityPolicy: e.target.value as typeof draft.validityPolicy,
                      })
                    }
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  >
                    <option value="PERMANENT">{copy('دائمة')}</option>
                    <option value="EXPIRING">{copy('تنتهي')}</option>
                    <option value="RENEWABLE">{copy('قابلة للتجديد')}</option>
                  </select>
                </label>
                {draft.validityPolicy !== 'PERMANENT' ? (
                  <NumberField
                    label={copy('مدة الصلاحية بالأيام')}
                    value={draft.validityDurationDays}
                    onChange={(v) => setDraft({ ...draft, validityDurationDays: v })}
                  />
                ) : (
                  <div />
                )}
                {draft.validityPolicy === 'RENEWABLE' ? (
                  <>
                    <NumberField
                      label={copy('فترة التجديد بالأيام')}
                      value={draft.renewalPeriodDays}
                      onChange={(v) => setDraft({ ...draft, renewalPeriodDays: v })}
                    />
                    <TextArea
                      label={copy('سياسة التجديد')}
                      value={draft.renewalPolicy || ''}
                      onChange={(v) => setDraft({ ...draft, renewalPolicy: v })}
                    />
                  </>
                ) : null}
                <label className="flex items-center gap-2 text-xs font-bold md:col-span-2">
                  <input
                    type="checkbox"
                    checked={draft.requiresRevalidation}
                    onChange={(e) => setDraft({ ...draft, requiresRevalidation: e.target.checked })}
                  />{' '}
                  {copy('تتطلب إعادة تحقق دورية')}
                </label>
              </div>
            </div>
          </fieldset>
          <fieldset id="preview">
            <legend>{c('المعاينة النهائية', 'Final preview')}</legend>
            <div className="certificate-form">
              <div className="md:col-span-2 rounded-xl bg-[#FAF7F0] p-3">
                <CertificatePreview compact template={draft} />
              </div>
            </div>
          </fieldset>
          <footer className="certificate-actions">
            <button className="certificate-primary" disabled={command.busy}>
              {command.busy ? c('جاري الحفظ…', 'Saving…') : c('حفظ كمسودة', 'Save draft')}
            </button>
            <small>
              {c(
                'الحفظ لا يعتمد القالب ولا يفعّله.',
                'Saving does not approve or activate this template.',
              )}
            </small>
          </footer>
        </form>
      </CertificatePanel>
    </>
  );
}
