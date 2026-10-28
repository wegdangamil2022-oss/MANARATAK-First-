import { useState, type FormEvent } from 'react';
import {
  BookOpen,
  FileText,
  ClipboardList,
  Workflow,
  CircleDollarSign,
  ShieldCheck,
  Link2,
  Save,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import {
  ServiceAvailabilityStatus,
  ServiceCategory,
  ServiceDeliveryMode,
  ServiceFulfillmentType,
  type ServiceCatalogItemDto,
} from '@manaratak/domain';
import type { ServiceCatalogDraft } from './ServiceCatalogModel';
import { CanonicalMultiPicker, CanonicalPicker } from '../../components/CanonicalPicker';
import { canonicalPickerApi } from '../../api/canonicalPickers';
import { TestDiscoveryEditor } from '../integration/TestDiscoveryEditor';
import { serviceText } from '../../i18n/serviceText';
import { useAdminAuthorization } from '../../security/AdminAuthorizationContext';
import { OwnerNavigation, useOwnerCopy } from './WorkspaceUI';

export type ServicePublicationAction =
  'mark-ready' | 'mark-publishable' | 'publish' | 'unpublish' | 'reject' | 'archive';
const sections = [
  { id: 'basic', ar: 'البيانات الأساسية', en: 'Basics', icon: BookOpen },
  { id: 'content', ar: 'المحتوى العام', en: 'Public content', icon: FileText },
  { id: 'requirements', ar: 'المتطلبات', en: 'Requirements', icon: ClipboardList },
  { id: 'execution', ar: 'التنفيذ والمزود', en: 'Execution & provider', icon: Workflow },
  { id: 'pricing', ar: 'التسعير والسياسات', en: 'Pricing & policies', icon: CircleDollarSign },
  { id: 'review', ar: 'المراجعة والنشر', en: 'Review & publish', icon: ShieldCheck },
  { id: 'relations', ar: 'العلاقات', en: 'Relationships', icon: Link2 },
];
export function ServiceCatalogEditor({
  draft,
  onChange,
  service,
  busy,
  dirty,
  onSubmit,
  onClose,
  onTransition,
  onReload,
}: {
  draft: ServiceCatalogDraft;
  onChange: (draft: ServiceCatalogDraft) => void;
  service: ServiceCatalogItemDto | null;
  busy: boolean;
  dirty: boolean;
  onSubmit: (event: FormEvent) => void;
  onClose: () => void;
  onTransition: (service: ServiceCatalogItemDto, action: ServicePublicationAction) => void;
  onReload: () => void;
}) {
  const { c, language } = useOwnerCopy();
  const { hasPermission } = useAdminAuthorization();
  const [section, setSection] = useState('basic');
  const [validation, setValidation] = useState('');
  const text = (key: keyof ServiceCatalogDraft, label: string, multiline = false) => (
    <label key={key}>
      {label}
      {multiline ? (
        <textarea
          value={String(draft[key])}
          maxLength={12000}
          onChange={(e) => onChange({ ...draft, [key]: e.target.value })}
          className="mt-1 w-full"
        />
      ) : (
        <input
          value={String(draft[key])}
          maxLength={2000}
          onChange={(e) => onChange({ ...draft, [key]: e.target.value })}
          className="mt-1 w-full"
        />
      )}
    </label>
  );
  const select = (key: keyof ServiceCatalogDraft, label: string, values: string[]) => (
    <label>
      {label}
      <select
        className="mt-1 w-full"
        value={String(draft[key])}
        onChange={(e) => onChange({ ...draft, [key]: e.target.value })}
      >
        {values.map((value) => (
          <option key={value} value={value}>
            {serviceText(value, language)}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (
            !draft.displayName.trim() ||
            !draft.serviceDescription.trim() ||
            !draft.requiredInputsOrDocuments.trim()
          ) {
            setValidation(
              c(
                'أكمل اسم الخدمة ووصفها ومتطلباتها قبل الحفظ.',
                'Complete the name, description and requirements before saving.',
              ),
            );
            setSection(
              !draft.displayName.trim() || !draft.serviceDescription.trim()
                ? 'basic'
                : 'requirements',
            );
            return;
          }
          if (!Number.isSafeInteger(Number(draft.slaMinutes)) || Number(draft.slaMinutes) < 1) {
            setValidation(
              c(
                'مهلة التنفيذ يجب أن تكون عدد دقائق صحيحًا موجبًا.',
                'Delivery SLA must be a positive integer in minutes.',
              ),
            );
            setSection('execution');
            return;
          }
          setValidation('');
          onSubmit(event);
        }}
        className="sf-panel"
      >
        <div className="sf-panel-heading">
          <div>
            <h2>{service ? c('تحرير الخدمة', 'Edit service') : c('إضافة خدمة', 'Add service')}</h2>
            {service && <p className="sf-reference">{service.publicId}</p>}
          </div>
          <button type="button" className="sf-secondary" disabled={busy} onClick={onClose}>
            <ArrowRight size={15} />
            {c('العودة للكتالوج', 'Back to catalog')}
          </button>
        </div>
        <OwnerNavigation
          secondary
          items={sections.map((item) => ({ ...item, label: c(item.ar, item.en) }))}
          active={section}
          onChange={setSection}
          disabled={busy}
          label={c('أقسام تحرير الخدمة', 'Service editor sections')}
        />
        {dirty && <p className="sf-notice">{c('تعديلات غير محفوظة', 'Unsaved changes')}</p>}
        {validation && (
          <p role="alert" className="text-red-700">
            {validation}
          </p>
        )}
        <fieldset disabled={busy} className="min-w-0">
          {section === 'basic' && (
            <div className="sf-form-grid">
              {text('displayName', c('اسم الخدمة بالعربية', 'Arabic service name'))}
              {select('serviceCategory', c('الفئة', 'Category'), Object.values(ServiceCategory))}
              {text('serviceDescription', c('وصف الخدمة بالعربية', 'Arabic description'), true)}
              {select(
                'fulfillmentType',
                c('نوع الخدمة', 'Service type'),
                Object.values(ServiceFulfillmentType),
              )}
              {select(
                'deliveryMode',
                c('طريقة تقديم الخدمة', 'Delivery mode'),
                Object.values(ServiceDeliveryMode),
              )}
              {select(
                'serviceAvailabilityStatus',
                c('الإتاحة', 'Availability'),
                Object.values(ServiceAvailabilityStatus),
              )}
              {draft.fulfillmentType === ServiceFulfillmentType.APPLICATION_SUPPORT && (
                <label>
                  <input
                    type="checkbox"
                    checked={draft.managedApplication}
                    onChange={(e) => onChange({ ...draft, managedApplication: e.target.checked })}
                  />
                  {c(
                    'منارتك تتولى التقديم نيابة عن الطالب',
                    'MANARATAK submits applications for the student',
                  )}
                </label>
              )}
            </div>
          )}
          {section === 'content' && (
            <div className="sf-form-grid">
              {text('displayNameEn', c('الاسم بالإنجليزية', 'English name'))}
              {text('descriptionEn', c('الوصف بالإنجليزية', 'English description'), true)}
              {text(
                'includes',
                c('ما تشمل الخدمة — عنصر في كل سطر', 'Included — one item per line'),
                true,
              )}
              {text('excludes', c('ما لا تشمل الخدمة', 'Excluded'), true)}
              {text(
                'faqs',
                c('الأسئلة الشائعة — سؤال | إجابة في كل سطر', 'FAQ — question | answer per line'),
                true,
              )}
              {text('badge', c('وسم البطاقة', 'Card badge'))}
              {text('priceLabel', c('وصف السعر للعرض', 'Public price label'))}
              {text(
                'thumbnailAssetId',
                c('مرجع الصورة المعتمدة', 'Approved thumbnail asset reference'),
              )}
            </div>
          )}
          {section === 'requirements' && (
            <div className="sf-form-grid">
              {text(
                'requiredInputsOrDocuments',
                c('المستندات المطلوبة — تفصل بفواصل', 'Required documents — comma separated'),
                true,
              )}
              {text(
                'inputFieldKeys',
                c('مفاتيح حقول الطلب — تفصل بفواصل', 'Request field keys — comma separated'),
              )}
              {text(
                'servicePrerequisites',
                c('شروط طلب الخدمة — شرط في كل سطر', 'Prerequisites — one per line'),
                true,
              )}
              <p className="sf-notice">
                {c(
                  'تحتفظ الطلبات القائمة بمتطلباتها وشروطها المحفوظة؛ تعديل الخدمة يخص النسخة الجديدة.',
                  'Existing requests retain their saved requirements and terms; edits apply to the new revision.',
                )}
              </p>
            </div>
          )}
          {section === 'execution' && (
            <div className="sf-form-grid">
              {select('fulfillmentPolicy', c('سياسة التنفيذ', 'Fulfillment policy'), [
                'FREE',
                'CHARGEABLE',
                'QUOTE_REQUIRED',
              ])}
              {text(
                'responsibleServiceOwnerType',
                c('الجهة المسؤولة عن التنفيذ', 'Responsible owner'),
              )}
              {hasPermission('admin:services:operations:manage') ? (
                <CanonicalPicker
                  label={c('المزود', 'Provider')}
                  value={draft.providerReferenceId}
                  onChange={(id) => onChange({ ...draft, providerReferenceId: id ?? '' })}
                  reloadKey="service-provider"
                  load={async (query, page) => {
                    const options = await import('../../api/serviceOperationPickers');
                    return options.serviceOperationOptions('providers', query, page);
                  }}
                />
              ) : (
                <p className="sf-notice">
                  {c(
                    'تغيير مرجع المزود يتطلب صلاحية إدارة العمليات.',
                    'Changing the provider requires operations permission.',
                  )}
                </p>
              )}
              {text('providerName', c('اسم المزود للعرض', 'Provider display name'))}
              <label>
                {c('مهلة التنفيذ بالدقائق', 'Delivery SLA in minutes')}
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={draft.slaMinutes}
                  onChange={(e) => onChange({ ...draft, slaMinutes: e.target.value })}
                  className="mt-1 w-full"
                />
              </label>
              {text('estimatedDeliveryTime', c('وصف مدة التنفيذ', 'Delivery time description'))}
              {text(
                'deliveryArtifactTypes',
                c('مخرجات التسليم — نوع في كل سطر', 'Deliverable types — one per line'),
                true,
              )}
              <label>
                <input
                  type="checkbox"
                  checked={draft.appointmentRequired}
                  onChange={(e) => onChange({ ...draft, appointmentRequired: e.target.checked })}
                />
                {c('يتطلب حجز موعد', 'Appointment required')}
              </label>
            </div>
          )}
          {section === 'pricing' && (
            <div className="sf-form-grid">
              {hasPermission('admin:services:operations:manage') ? (
                <CanonicalPicker
                  label={c('التسعيرة المعتمدة', 'Approved pricing')}
                  value={draft.pricingReferenceId}
                  onChange={(id) => onChange({ ...draft, pricingReferenceId: id ?? '' })}
                  reloadKey="service-pricing"
                  load={async (query, page) => {
                    const options = await import('../../api/serviceOperationPickers');
                    return options.serviceOperationOptions('pricing', query, page);
                  }}
                />
              ) : (
                <p className="sf-notice">
                  {c(
                    'تعديل التسعيرة المرجعية يتطلب صلاحية إدارة العمليات.',
                    'Changing referenced pricing requires operations permission.',
                  )}
                </p>
              )}
              {text('cancellationPolicy', c('سياسة الإلغاء', 'Cancellation policy'), true)}
              <p className="sf-notice">
                {c(
                  'التسعير الملزم من التسعيرة المعتمدة. وصف السعر للعرض لا يثبت مبلغًا ولا سدادًا.',
                  'Binding amounts come from approved pricing. A public label does not establish an amount or payment.',
                )}
              </p>
            </div>
          )}
          {section === 'review' && (
            <div className="space-y-4">
              <p className="sf-notice">
                {c(
                  'تُحفظ التعديلات أولًا، ثم تُراجع النسخة قبل النشر. تبقى النسخة المنشورة المعتمدة مستقلة عن مسودة التحرير.',
                  'Save changes first, then review the revision before publishing. The approved published version remains separate from the working draft.',
                )}
              </p>
              {service ? (
                <>
                  <dl className="sf-form-grid">
                    <div>
                      <dt>{c('الحالة', 'Status')}</dt>
                      <dd>{serviceText(service.status, language)}</dd>
                    </div>
                    <div>
                      <dt>{c('اكتمال البيانات', 'Completeness')}</dt>
                      <dd>{serviceText(service.completenessStatus, language)}</dd>
                    </div>
                  </dl>
                  <div className="sf-actions">
                    {hasPermission('admin:services:review') &&
                      !['PUBLISHED', 'ARCHIVED', 'READY_TO_PUBLISH'].includes(service.status) && (
                        <button
                          type="button"
                          className="sf-primary"
                          disabled={busy || dirty || service.completenessStatus !== 'COMPLETE'}
                          onClick={() => onTransition(service, 'mark-publishable')}
                        >
                          {c('مراجعة واعتماد النسخة', 'Review & approve revision')}
                        </button>
                      )}
                    {hasPermission('admin:services:publish') &&
                      service.status === 'READY_TO_PUBLISH' && (
                        <button
                          type="button"
                          className="sf-primary"
                          disabled={busy || dirty}
                          onClick={() => onTransition(service, 'publish')}
                        >
                          {c('نشر النسخة المعتمدة', 'Publish approved revision')}
                        </button>
                      )}
                    {hasPermission('admin:services:publish') && service.status === 'PUBLISHED' && (
                      <button
                        type="button"
                        className="sf-secondary"
                        disabled={busy || dirty}
                        onClick={() => onTransition(service, 'unpublish')}
                      >
                        {c('إلغاء النشر', 'Unpublish')}
                      </button>
                    )}
                    {service.status !== 'PUBLISHED' && service.status !== 'REJECTED' && (
                      <button
                        type="button"
                        className="sf-secondary"
                        disabled={busy || dirty}
                        onClick={() => onTransition(service, 'reject')}
                      >
                        {c('رفض النسخة', 'Reject revision')}
                      </button>
                    )}
                    {['ARCHIVED', 'REJECTED'].includes(service.status) && (
                      <button
                        type="button"
                        className="sf-secondary"
                        disabled={busy || dirty}
                        onClick={() => onTransition(service, 'mark-ready')}
                      >
                        {c('إعادة للمراجعة', 'Return for review')}
                      </button>
                    )}
                    {service.status !== 'ARCHIVED' && (
                      <button
                        type="button"
                        className="sf-secondary"
                        disabled={busy || dirty}
                        onClick={() => onTransition(service, 'archive')}
                      >
                        {c('أرشفة الخدمة', 'Archive service')}
                      </button>
                    )}
                    {service.status === 'PUBLISHED' && (
                      <a
                        className="sf-link inline-flex items-center gap-1"
                        target="_blank"
                        rel="noreferrer"
                        href={`${(import.meta.env.VITE_PUBLIC_WEB_URL || '').replace(/\/$/, '')}/services/${encodeURIComponent(service.slug)}`}
                      >
                        <ExternalLink size={15} />
                        {c('عرض الصفحة العامة', 'View public page')}
                      </a>
                    )}
                  </div>
                </>
              ) : (
                <p>
                  {c(
                    'احفظ المسودة قبل مراجعتها ونشرها.',
                    'Save the draft before review and publication.',
                  )}
                </p>
              )}
            </div>
          )}
          {section === 'relations' && (
            <div className="space-y-4">
              <div className="sf-form-grid">
                <CanonicalMultiPicker
                  label={c('الدول المدعومة', 'Supported countries')}
                  values={draft.supportedCountryReferenceIds}
                  onChange={(ids) => onChange({ ...draft, supportedCountryReferenceIds: ids })}
                  load={() => canonicalPickerApi.countries()}
                  reloadKey="service-countries"
                />
                <CanonicalMultiPicker
                  label={c('اللغات المدعومة', 'Supported languages')}
                  values={draft.supportedLanguageReferenceIds}
                  onChange={(ids) => onChange({ ...draft, supportedLanguageReferenceIds: ids })}
                  load={() => canonicalPickerApi.languages()}
                  reloadKey="service-languages"
                />
              </div>
            </div>
          )}
        </fieldset>
        <footer className="sf-editor-footer">
          {service && (
            <button type="button" disabled={busy} className="sf-secondary" onClick={onReload}>
              {c('إعادة قراءة المحفوظ', 'Reload saved revision')}
            </button>
          )}
          <button type="button" disabled={busy} className="sf-secondary" onClick={onClose}>
            {c('إلغاء والعودة', 'Cancel & return')}
          </button>
          <button type="submit" disabled={busy} className="sf-primary">
            <Save size={15} />
            {busy ? c('جارٍ الحفظ…', 'Saving…') : c('حفظ المسودة', 'Save draft')}
          </button>
        </footer>
      </form>
      {section === 'relations' && service && (
        <TestDiscoveryEditor
          key={`${service.id}:${service.version}`}
          ownerType="SERVICES"
          ownerKey={service.id}
        />
      )}
    </>
  );
}
