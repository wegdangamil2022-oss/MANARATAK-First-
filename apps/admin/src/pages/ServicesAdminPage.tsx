import { emptyForm } from '../features/services-finance/ServiceCatalogModel';
import { CanonicalPicker } from '../components/CanonicalPicker';
import { canonicalPickerApi } from '../api/canonicalPickers';
import { reviewOwnerSearch } from '../features/review-queue/ReviewOwnerNavigation';
import { serviceText } from '../i18n/serviceText';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { adminApiClient } from '../api/client';
import { Edit3, Loader2, Plus, ClipboardList, BookOpen, Workflow } from 'lucide-react';
import { useTranslation } from '../i18n/I18nProvider';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { OwnerHeading, OwnerNavigation } from '../features/services-finance/WorkspaceUI';
import { serviceSection, type ServiceSection } from '../features/services-finance/workspaceModel';
import { ServiceCatalogEditor } from '../features/services-finance/ServiceCatalogEditor';
import { ServiceOperationsWorkspace } from '../components/ServiceOperationsWorkspace';
import { useAdminAuthorization } from '../security/AdminAuthorizationContext';
import { ServiceRequestsWorkspace } from '../components/ServiceRequestsWorkspace';

import {
  ServiceAvailabilityStatus,
  ServiceCategory,
  ServiceCompletenessStatus,
  ServiceDeliveryMode,
  ServiceFulfillmentType,
  ServiceStatus,
  type ServiceCatalogItemDto,
} from '@manaratak/domain';

type ServiceCatalogItem = ServiceCatalogItemDto;

interface ServiceListResponse {
  data: ServiceCatalogItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const serviceCategories = Object.values(ServiceCategory);
const deliveryModes = Object.values(ServiceDeliveryMode);
const availabilityStatuses = Object.values(ServiceAvailabilityStatus);

export function ServicesAdminPage() {
  const { t, language } = useTranslation();
  const { hasPermission } = useAdminAuthorization();
  const [searchParams, setSearchParams] = useSearchParams();
  const route = useParams();
  const navigate = useNavigate();
  const activeTab = serviceSection(searchParams, hasPermission, Boolean(route.requestReference));
  const [editorOpen, setEditorOpen] = useState(false);
  const countryFilter = searchParams.get('supportedCountryReferenceId') || '';
  const languageFilter = searchParams.get('supportedLanguageReferenceId') || '';
  const [query, setQuery] = useState(() => reviewOwnerSearch(searchParams));
  const [search, setSearch] = useState(() => reviewOwnerSearch(searchParams));
  const [page, setPage] = useState(1);
  const [availabilityFilter, setAvailabilityFilter] = useState('');
  const [fulfillmentFilter, setFulfillmentFilter] = useState('');
  const [completenessFilter, setCompletenessFilter] = useState('');
  const [deliveryFilter, setDeliveryFilter] = useState('');
  const [dirty, setDirty] = useState(false);
  const listSequence = useRef(0);
  const mutation = useRef(false);
  const [requestBusy, setRequestBusy] = useState(false);
  const [requestDirty, setRequestDirty] = useState(false);
  const [services, setServices] = useState<ServiceListResponse | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceCatalogItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const formBaseline = useRef(JSON.stringify(emptyForm));
  useEffect(() => {
    setDirty(JSON.stringify(form) !== formBaseline.current);
  }, [form]);

  const loadServices = useCallback(async () => {
    const request = ++listSequence.current;
    setLoading(true);
    setListError(null);
    setServices(null);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (countryFilter) params.set('supportedCountryReferenceId', countryFilter);
      if (languageFilter) params.set('supportedLanguageReferenceId', languageFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (categoryFilter) params.set('serviceCategory', categoryFilter);
      if (availabilityFilter) params.set('serviceAvailabilityStatus', availabilityFilter);
      if (deliveryFilter) params.set('deliveryMode', deliveryFilter);
      if (search) params.set('search', search);
      if (fulfillmentFilter) params.set('fulfillmentType', fulfillmentFilter);
      if (completenessFilter) params.set('completenessStatus', completenessFilter);
      const response = await adminApiClient.request<ServiceListResponse>(
        `/admin/services?${params}`,
      );
      if (request === listSequence.current) {
        if (response.totalPages > 0 && page > response.totalPages) setPage(response.totalPages);
        else setServices(response);
      }
    } catch (cause) {
      if (request === listSequence.current)
        setListError(
          cause instanceof Error ? cause.message : serviceText('تعذر تحميل الخدمات.', language),
        );
    } finally {
      if (request === listSequence.current) setLoading(false);
    }
  }, [
    statusFilter,
    categoryFilter,
    availabilityFilter,
    deliveryFilter,
    search,
    page,
    fulfillmentFilter,
    completenessFilter,
    countryFilter,
    languageFilter,
    language,
  ]);
  useEffect(() => {
    if (activeTab === 'CATALOG') void loadServices();
    return () => {
      ++listSequence.current;
    };
  }, [loadServices, activeTab]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  function switchTab(tab: 'CATALOG' | 'REQUESTS' | 'OPERATIONS') {
    if (
      saving ||
      requestBusy ||
      ((dirty || requestDirty) &&
        !window.confirm(serviceText('لديك تعديلات غير محفوظة للخدمة. الانتقال دون حفظ؟', language)))
    )
      return;
    formBaseline.current = JSON.stringify(emptyForm);
    setDirty(false);
    setSelectedService(null);
    setForm(emptyForm);
    setEditorOpen(false);
    const next = new URLSearchParams(searchParams);
    next.delete('request');
    next.set(
      'tab',
      tab === 'REQUESTS' ? 'requests' : tab === 'OPERATIONS' ? 'operations' : 'catalog',
    );
    next.delete('operation');
    next.delete('kind');
    if (route.requestReference) navigate('/services?' + next.toString());
    else setSearchParams(next);
  }

  const createService = async (event: FormEvent) => {
    event.preventDefault();
    await saveService('create');
  };

  const updateService = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedService) return;
    await saveService('update');
  };

  const saveService = async (mode: 'create' | 'update') => {
    if (mutation.current) return;
    mutation.current = true;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const payload =
        mode === 'update' && selectedService
          ? { ...buildPayload(), expectedVersion: selectedService.version }
          : buildPayload();
      const endpoint =
        mode === 'create' ? '/admin/services' : `/admin/services/${selectedService?.id}`;
      const method = mode === 'create' ? 'POST' : 'PATCH';
      const saved = await adminApiClient.request<ServiceCatalogItem>(endpoint, {
        method,
        body: JSON.stringify(payload),
      });
      setSelectedService(saved);
      setDirty(false);
      const persisted = await adminApiClient.request<ServiceCatalogItem>(
        `/admin/services/${encodeURIComponent(saved.id)}`,
      );
      selectService(persisted, true);
      setMessage(`حُفظت الخدمة وأُعيد تحميل بياناتها: ${persisted.displayName}`);
      await loadServices();
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : serviceText('تعذر حفظ الخدمة أو إعادة تحميلها.', language);
      setError(
        message.includes('VERSION_CONFLICT')
          ? serviceText(
              'تغيّرت الخدمة في جلسة أخرى. أعد تحميل النسخة المحفوظة ثم راجع تعديلاتك.',
              language,
            )
          : message,
      );
    } finally {
      mutation.current = false;
      setSaving(false);
    }
  };

  const transitionService = async (
    service: ServiceCatalogItem,
    action: 'mark-ready' | 'mark-publishable' | 'publish' | 'unpublish' | 'reject' | 'archive',
  ) => {
    if (mutation.current) return;
    if (selectedService?.id === service.id && dirty) {
      setError(serviceText('احفظ تعديلات الخدمة قبل تغيير حالتها.', language));
      return;
    }
    let reviewReason = '';
    if (action === 'mark-publishable') {
      reviewReason =
        window
          .prompt(
            serviceText(
              'سبب الاعتماد بعد مراجعة القانون والمزوّد والسعر والخصوصية والإتاحة واللغتين:',
              language,
            ),
          )
          ?.trim() ?? '';
      if (reviewReason.length < 3) return;
    }
    if (
      !window.confirm(
        `تنفيذ «${serviceText(formatLabel(action), language)}» للخدمة «${service.displayName}»؟`,
      )
    )
      return;
    mutation.current = true;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await adminApiClient.request<ServiceCatalogItem>(
        `/admin/services/${service.id}/${action}`,
        {
          method: 'POST',
          body: JSON.stringify({
            expectedVersion: service.version,
            ...(action === 'mark-publishable'
              ? {
                  reason: reviewReason,
                  checklist: {
                    legal: true,
                    provider: true,
                    price: true,
                    privacy: true,
                    availability: true,
                    language: true,
                  },
                }
              : {}),
          }),
        },
      );
      if (selectedService?.id === service.id) selectService(updated, true);
      setMessage(`تم تنفيذ: ${serviceText(formatLabel(action), language)}`);
      await loadServices();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : serviceText('تعذر تحديث حالة الخدمة.', language),
      );
    } finally {
      mutation.current = false;
      setSaving(false);
    }
  };

  const selectService = (service: ServiceCatalogItem, force = false) => {
    if (
      !force &&
      (saving ||
        (dirty && !window.confirm(serviceText('ترك تعديلات الخدمة غير المحفوظة؟', language))))
    )
      return;
    setDirty(false);
    setSelectedService(service);
    setEditorOpen(true);
    const nextForm = {
      managedApplication: service.managedApplication === true,
      fulfillmentPolicy: service.fulfillmentPolicy ?? 'QUOTE_REQUIRED',
      providerReferenceId: service.providerReferenceId ?? '',
      inputFieldKeys: (service.inputSchema ?? []).map((field) => field.key).join(', '),
      displayNameEn: service.localizedContent?.en?.displayName ?? '',
      descriptionEn: service.localizedContent?.en?.serviceDescription ?? '',
      slaMinutes: String(service.slaPolicy?.minutes ?? 1440),
      displayName: service.displayName,
      serviceCategory: service.serviceCategory,
      fulfillmentType: service.fulfillmentType,
      serviceDescription: service.serviceDescription,
      serviceAvailabilityStatus: service.serviceAvailabilityStatus,
      requiredInputsOrDocuments: service.requiredInputsOrDocuments.join(', '),
      deliveryMode: service.deliveryMode,
      responsibleServiceOwnerType: service.responsibleServiceOwnerType,
      providerName: service.providerName || '',
      estimatedDeliveryTime: service.estimatedDeliveryTime || '',
      appointmentRequired: Boolean(service.appointmentRequired),
      supportedCountryReferenceIds: service.supportedCountryReferenceIds || [],
      supportedLanguageReferenceIds: service.supportedLanguageReferenceIds || [],
      pricingReferenceId: service.pricingReferenceId || '',
      thumbnailAssetId: service.thumbnailAssetId || '',
      includes: stringList(service.publicDisplayMetadata?.includes).join('\n'),
      excludes: stringList(service.publicDisplayMetadata?.excludes).join('\n'),
      faqs: faqRows(service.publicDisplayMetadata?.faqs)
        .map((row) => `${row.question} | ${row.answer}`)
        .join('\n'),
      cancellationPolicy: String(service.publicDisplayMetadata?.cancellationPolicy || ''),
      badge: String(service.publicDisplayMetadata?.badge || ''),
      priceLabel: String(service.publicDisplayMetadata?.priceLabel || ''),
      servicePrerequisites: (service.servicePrerequisites || []).join('\n'),
      deliveryArtifactTypes: (service.deliveryArtifactTypes || []).join('\n'),
    };
    formBaseline.current = JSON.stringify(nextForm);
    setForm(nextForm);
  };

  const unchanged = (key: keyof typeof emptyForm) =>
    form[key] === JSON.parse(formBaseline.current)[key];
  const buildPayload = () => ({
    managedApplication: form.managedApplication,
    displayName: form.displayName.trim(),
    serviceCategory: form.serviceCategory,
    fulfillmentType: form.fulfillmentType,
    serviceDescription: form.serviceDescription.trim(),
    serviceAvailabilityStatus: form.serviceAvailabilityStatus,
    requiredInputsOrDocuments:
      selectedService && unchanged('requiredInputsOrDocuments')
        ? selectedService.requiredInputsOrDocuments
        : splitList(form.requiredInputsOrDocuments),
    deliveryMode: form.deliveryMode,
    fulfillmentPolicy: form.fulfillmentPolicy,
    providerReferenceId: form.providerReferenceId.trim() || null,
    inputSchema:
      selectedService && unchanged('inputFieldKeys')
        ? selectedService.inputSchema
        : splitList(form.inputFieldKeys).map(
            (key) =>
              selectedService?.inputSchema?.find((field) => field.key === key) ?? {
                key,
                type: 'TEXT',
                required: true,
                sensitive: true,
              },
          ),
    localizedContent: {
      ...selectedService?.localizedContent,
      ar: {
        ...selectedService?.localizedContent?.ar,
        displayName: form.displayName,
        serviceDescription: form.serviceDescription,
      },
      en: {
        ...selectedService?.localizedContent?.en,
        displayName: form.displayNameEn,
        serviceDescription: form.descriptionEn,
      },
    },
    slaPolicy: { ...selectedService?.slaPolicy, minutes: Number(form.slaMinutes) },
    responsibleServiceOwnerType: form.responsibleServiceOwnerType.trim(),
    providerName: form.providerName.trim() || null,
    estimatedDeliveryTime: form.estimatedDeliveryTime.trim() || null,
    appointmentRequired: form.appointmentRequired,
    supportedCountryReferenceIds: form.supportedCountryReferenceIds,
    supportedLanguageReferenceIds: form.supportedLanguageReferenceIds,
    pricingReferenceId: form.pricingReferenceId.trim() || null,
    thumbnailAssetId: form.thumbnailAssetId.trim() || null,
    servicePrerequisites:
      selectedService && unchanged('servicePrerequisites')
        ? selectedService.servicePrerequisites
        : splitList(form.servicePrerequisites),
    deliveryArtifactTypes:
      selectedService && unchanged('deliveryArtifactTypes')
        ? selectedService.deliveryArtifactTypes
        : splitList(form.deliveryArtifactTypes),
    publicDisplayMetadata: {
      ...(selectedService?.publicDisplayMetadata || {}),
      includes:
        selectedService && unchanged('includes')
          ? selectedService.publicDisplayMetadata?.includes
          : splitList(form.includes),
      excludes:
        selectedService && unchanged('excludes')
          ? selectedService.publicDisplayMetadata?.excludes
          : splitList(form.excludes),
      faqs:
        selectedService && unchanged('faqs')
          ? selectedService.publicDisplayMetadata?.faqs
          : parseFaqs(form.faqs),
      cancellationPolicy: form.cancellationPolicy.trim(),
      badge: form.badge.trim(),
      priceLabel: form.priceLabel.trim(),
    },
  });

  return (
    <div className="sf-workspace mx-auto max-w-7xl" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <OwnerHeading
        title={t('enterprise_services')}
        description={
          language === 'ar'
            ? 'إدارة طلبات الطلاب والخدمات والمواعيد والتنفيذ من مساحة واحدة.'
            : 'Manage student requests, catalog, scheduling and fulfillment.'
        }
        actions={
          activeTab === 'CATALOG' &&
          !editorOpen && (
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                formBaseline.current = JSON.stringify(emptyForm);
                setForm(emptyForm);
                setSelectedService(null);
                setDirty(false);
                setEditorOpen(true);
              }}
            >
              <Plus size={16} />
              {language === 'ar' ? 'إضافة خدمة' : 'Add service'}
            </button>
          )
        }
      />
      <OwnerNavigation
        items={[
          ...(hasPermission('admin:services:requests:view')
            ? [
                {
                  id: 'REQUESTS',
                  label: language === 'ar' ? 'الطلبات والتنفيذ' : 'Requests & fulfillment',
                  description:
                    language === 'ar' ? 'متابعة الحالات وتسليم النتائج' : 'Cases and delivery',
                  icon: ClipboardList,
                },
              ]
            : []),
          ...(hasPermission('admin:services:manage')
            ? [
                {
                  id: 'CATALOG',
                  label: language === 'ar' ? 'كتالوج الخدمات' : 'Service catalog',
                  description:
                    language === 'ar'
                      ? 'التعريف والمتطلبات والنشر'
                      : 'Definitions, requirements and publishing',
                  icon: BookOpen,
                },
              ]
            : []),
          ...(hasPermission('admin:services:operations:manage')
            ? [
                {
                  id: 'OPERATIONS',
                  label: language === 'ar' ? 'العمليات' : 'Operations',
                  description:
                    language === 'ar'
                      ? 'المزودون والتسعير والمواعيد'
                      : 'Providers, pricing and scheduling',
                  icon: Workflow,
                },
              ]
            : []),
        ]}
        active={activeTab ?? ''}
        onChange={(tab) => switchTab(tab as ServiceSection)}
        disabled={saving || requestBusy}
        label={language === 'ar' ? 'أقسام الخدمات' : 'Service sections'}
      />
      {!activeTab && (
        <p role="alert" className="sf-notice">
          {language === 'ar'
            ? 'ليس لديك صلاحية لعرض هذا الجزء من الخدمات.'
            : 'You do not have permission to view this service section.'}
        </p>
      )}
      {activeTab === 'OPERATIONS' && (
        <ServiceOperationsWorkspace onBusyChange={setRequestBusy} onDirtyChange={setRequestDirty} />
      )}
      {activeTab === 'REQUESTS' && hasPermission('admin:services:requests:view') && (
        <ServiceRequestsWorkspace onBusyChange={setRequestBusy} onDirtyChange={setRequestDirty} />
      )}
      {activeTab === 'CATALOG' && (
        <>
          {!editorOpen && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setPage(1);
                query.trim() === search ? void loadServices() : setSearch(query.trim());
              }}
              className="sf-toolbar sf-filter-panel"
            >
              <label className="flex-1 text-xs font-bold">
                {serviceText('بحث بالاسم أو الرمز أو المزود', language)}
                <input
                  maxLength={120}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <label>
                {t('status')}
                <select
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">{t('all_statuses')}</option>
                  {Object.values(ServiceStatus).map((value) => (
                    <option key={value} value={value}>
                      {serviceText(formatLabel(value), language)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t('category')}
                <select
                  value={categoryFilter}
                  onChange={(event) => {
                    setCategoryFilter(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">{t('all_categories')}</option>
                  {serviceCategories.map((value) => (
                    <option key={value} value={value}>
                      {serviceText(formatLabel(value), language)}
                    </option>
                  ))}
                </select>
              </label>
              <details
                className="sf-advanced-filters"
                open={Boolean(
                  fulfillmentFilter ||
                  completenessFilter ||
                  countryFilter ||
                  languageFilter ||
                  availabilityFilter ||
                  deliveryFilter,
                )}
              >
                <summary>{language === 'ar' ? 'فلاتر إضافية' : 'More filters'}</summary>
                <div className="sf-form-grid">
                  <label>
                    {t('svc_fulfillment')}
                    <select
                      value={fulfillmentFilter}
                      onChange={(e) => {
                        setFulfillmentFilter(e.target.value);
                        setPage(1);
                      }}
                    >
                      <option value="">{t('all')}</option>
                      {Object.values(ServiceFulfillmentType).map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {t('svc_completeness')}
                    <select
                      value={completenessFilter}
                      onChange={(e) => {
                        setCompletenessFilter(e.target.value);
                        setPage(1);
                      }}
                    >
                      <option value="">{t('all')}</option>
                      {Object.values(ServiceCompletenessStatus).map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                  </label>
                  <CanonicalPicker
                    label={t('supported_countries')}
                    value={countryFilter || null}
                    load={canonicalPickerApi.countries}
                    paged
                    optional
                    onChange={(value) => {
                      setPage(1);
                      setSearchParams((current) => {
                        const next = new URLSearchParams(current);
                        value
                          ? next.set('supportedCountryReferenceId', value)
                          : next.delete('supportedCountryReferenceId');
                        return next;
                      });
                    }}
                  />
                  <CanonicalPicker
                    label={t('supported_languages')}
                    value={languageFilter || null}
                    load={canonicalPickerApi.languages}
                    paged
                    optional
                    onChange={(value) => {
                      setPage(1);
                      setSearchParams((current) => {
                        const next = new URLSearchParams(current);
                        value
                          ? next.set('supportedLanguageReferenceId', value)
                          : next.delete('supportedLanguageReferenceId');
                        return next;
                      });
                    }}
                  />
                  <SelectField
                    label={serviceText('التوفر', language)}
                    value={availabilityFilter}
                    values={['', ...availabilityStatuses]}
                    onChange={(value) => {
                      setAvailabilityFilter(value);
                      setPage(1);
                    }}
                  />
                  <SelectField
                    label={serviceText('طريقة التنفيذ', language)}
                    value={deliveryFilter}
                    values={['', ...deliveryModes]}
                    onChange={(value) => {
                      setDeliveryFilter(value);
                      setPage(1);
                    }}
                  />
                </div>
              </details>
              <button className="sf-primary">{serviceText('بحث', language)}</button>
              <button
                type="button"
                disabled={loading}
                onClick={() => void loadServices()}
                className="rounded-xl border px-4 py-3 text-sm"
              >
                {serviceText('تحديث', language)}
              </button>
            </form>
          )}
          {message && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-2xl text-xs font-bold">
              {message}
            </div>
          )}
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl text-xs font-bold">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {!editorOpen && (
              <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden">
                <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
                  <h2 className="font-black text-[#142B5F]">
                    {serviceText('سجل كتالوج الخدمات (', language)}
                    {services?.total ?? 0})
                  </h2>
                  <span className="text-xs font-bold text-slate-500">
                    {loading
                      ? serviceText('جارٍ التحديث…', language)
                      : serviceText('البيانات المحملة من الخادم', language)}
                  </span>
                </div>
                {loading ? (
                  <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-[#142B5F]" />
                  </div>
                ) : listError ? (
                  <p role="alert" className="p-6 text-sm text-red-700">
                    {listError}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#FAF7F0] border-b border-slate-100 font-black text-[#142B5F]">
                          <th className="px-5 py-3.5">{t('service')}</th>
                          <th className="px-4 py-3.5">{t('category')}</th>
                          <th className="px-4 py-3.5">{t('delivery')}</th>
                          <th className="px-4 py-3.5">{t('status')}</th>
                          <th className="px-4 py-3.5">{t('updated')}</th>
                          <th className="px-5 py-3.5 text-left">{t('actions')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {services?.data.length ? (
                          services.data.map((service) => (
                            <tr
                              key={service.id}
                              className="hover:bg-slate-50/70 transition align-top"
                            >
                              <td className="px-5 py-4">
                                <div className="font-bold text-[#142B5F] text-sm">
                                  {service.displayName}
                                </div>
                                <div className="text-[11px] font-mono text-slate-400">
                                  /{service.slug}
                                </div>
                                <div className="text-xs text-slate-600 mt-1 line-clamp-2">
                                  {service.serviceDescription}
                                </div>
                              </td>
                              <td className="px-4 py-4 font-semibold text-slate-700">
                                {serviceText(formatLabel(service.serviceCategory), language)}
                              </td>
                              <td className="px-4 py-4 text-slate-600">
                                <div className="font-bold text-[#142B5F]">
                                  {serviceText(formatLabel(service.deliveryMode), language)}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  {serviceText(formatLabel(service.fulfillmentType), language)}
                                </div>
                              </td>
                              <td className="px-4 py-4 space-y-1.5">
                                <StatusBadge status={service.status} />
                                <div>
                                  <CompletenessBadge status={service.completenessStatus} />
                                </div>
                              </td>
                              <td className="px-4 py-4 text-slate-500 font-medium">
                                {formatDate(service.updatedAt)}
                              </td>
                              <td className="px-5 py-4 text-left">
                                <div className="flex flex-wrap justify-end gap-1.5">
                                  <button
                                    disabled={saving}
                                    onClick={() => selectService(service)}
                                    className="rounded-xl border border-slate-200 px-2.5 py-1 text-xs font-bold text-[#142B5F] hover:bg-slate-50 inline-flex items-center gap-1 transition"
                                  >
                                    <Edit3 className="h-3.5 w-3.5 text-[#142B5F]" /> {t('edit')}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-6 py-12 text-center text-slate-400 font-bold"
                            >
                              {t('no_services_found')}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {editorOpen && (
              <ServiceCatalogEditor
                draft={form}
                onChange={setForm}
                service={selectedService}
                busy={saving}
                dirty={dirty}
                onSubmit={selectedService ? updateService : createService}
                onTransition={(service, action) => void transitionService(service, action)}
                onClose={() => {
                  if (
                    saving ||
                    (dirty && !window.confirm(serviceText('ترك التعديلات غير المحفوظة؟', language)))
                  )
                    return;
                  formBaseline.current = JSON.stringify(emptyForm);
                  setDirty(false);
                  setSelectedService(null);
                  setForm(emptyForm);
                  setEditorOpen(false);
                }}
                onReload={async () => {
                  if (
                    !selectedService ||
                    (dirty &&
                      !window.confirm(serviceText('استبدال التعديلات بالنسخة المحفوظة؟', language)))
                  )
                    return;
                  try {
                    selectService(
                      await adminApiClient.request<ServiceCatalogItem>(
                        '/admin/services/' + encodeURIComponent(selectedService.id),
                      ),
                      true,
                    );
                  } catch (cause) {
                    setError(cause instanceof Error ? cause.message : 'SERVICE_RELOAD_FAILED');
                  }
                }}
              />
            )}
          </div>
          {services && !editorOpen && (
            <div className="flex justify-between rounded-xl border bg-white p-4 text-sm">
              <button disabled={loading || page <= 1} onClick={() => setPage((value) => value - 1)}>
                {serviceText('السابق', language)}
              </button>
              <span>
                {page} / {Math.max(1, services.totalPages)}
              </span>
              <button
                disabled={loading || page >= services.totalPages}
                onClick={() => setPage((value) => value + 1)}
              >
                {serviceText('التالي', language)}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: ServiceStatus }) {
  const color =
    status === 'PUBLISHED'
      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      : status === 'READY_TO_PUBLISH'
        ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
        : status === 'REJECTED'
          ? 'bg-rose-50 text-rose-700 border border-rose-200'
          : 'bg-slate-100 text-slate-700 border border-slate-200';
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-black ${color}`}>
      {formatLabel(status)}
    </span>
  );
}

function CompletenessBadge({ status }: { status: ServiceCompletenessStatus }) {
  const color =
    status === 'COMPLETE'
      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      : status === 'NEEDS_REVIEW'
        ? 'bg-amber-50 text-amber-700 border border-amber-200'
        : 'bg-slate-100 text-slate-600 border border-slate-200';
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-black ${color}`}>
      {formatLabel(status)}
    </span>
  );
}

function splitList(value: string): string[] {
  return value
    .split(/[,،\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatLabel(value: string): string {
  const arabicMap: Record<string, string> = {
    STUDENT_SERVICES: 'خدمات الطلاب',
    CONSULTATION: 'استشارات',
    DOCUMENT_REVIEW: 'مراجعة المستندات',
    APPLICATION_ASSISTANCE: 'مساعدة التقديم',
    TRANSLATION: 'ترجمة',
    HOUSING: 'سكن وإقامة',
    VISA_ASSISTANCE: 'تأشيرات وسفر',
    TEST_PREPARATION: 'تحضير اختبارات',
    ONLINE: 'عبر الإنترنت',
    OFFLINE: 'حضوري',
    HYBRID: 'مدمج',
    AVAILABLE: 'متاح',
    UNAVAILABLE: 'غير متاح',
    LIMITED: 'محدود',
    DRAFT: 'مسودة',
    READY_TO_REVIEW: 'جاهز للمراجعة',
    READY_TO_PUBLISH: 'جاهز للنشر',
    PUBLISHED: 'منشور',
    REJECTED: 'مرفوض',
    ARCHIVED: 'مؤرشف',
    COMPLETE: 'مكتمل',
    NEEDS_REVIEW: 'يحتاج مراجعة',
    INCOMPLETE: 'غير مكتمل',
    DOCUMENT_SERVICES: 'خدمات المستندات',
    VISA_SERVICES: 'خدمات التأشيرات',
    TRAVEL_SERVICES: 'خدمات السفر',
    ACADEMIC_SERVICES: 'خدمات أكاديمية',
    PROFESSIONAL_SERVICES: 'خدمات مهنية',
    ENTERPRISE_SERVICES: 'خدمات المؤسسات',
    IN_PERSON: 'حضوري',
    DOCUMENT_PROCESSING: 'معالجة مستندات',
    BOOKING: 'حجز',
    APPLICATION_SUPPORT: 'دعم التقديم',
    MANAGED_SERVICE: 'خدمة مُدارة',
    PAUSED: 'متوقف مؤقتاً',
    'mark-ready': 'جاهز للمراجعة',
    'mark-publishable': 'جاهز للنشر',
    publish: 'نشر',
    unpublish: 'إلغاء النشر',
    reject: 'رفض',
    archive: 'أرشفة',
  };
  if (!value) return 'الكل';
  return (
    arabicMap[value] ||
    value
      .replace(/_/g, ' ')
      .replace(/-/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
}

function formatDate(value: string | Date): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? '—'
    : new Intl.DateTimeFormat('ar', { year: 'numeric', month: 'short', day: '2-digit' }).format(
        parsed,
      );
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}
function faqRows(value: unknown): Array<{ question: string; answer: string }> {
  return Array.isArray(value)
    ? value.filter((row): row is { question: string; answer: string } =>
        Boolean(row && typeof row.question === 'string' && typeof row.answer === 'string'),
      )
    : [];
}
function parseFaqs(value: string): Array<{ question: string; answer: string }> {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const index = line.indexOf('|');
      if (index < 1 || !line.slice(index + 1).trim())
        throw new Error('اكتب كل سؤال بصيغة: سؤال | إجابة.');
      return { question: line.slice(0, index).trim(), answer: line.slice(index + 1).trim() };
    });
}

function SelectField({
  label,
  value,
  values,
  onChange,
}: {
  label: string;
  value: string;
  values: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-[#21A7B4] bg-white transition"
      >
        {values.map((item) => (
          <option key={item} value={item}>
            {formatLabel(item)}
          </option>
        ))}
      </select>
    </label>
  );
}
