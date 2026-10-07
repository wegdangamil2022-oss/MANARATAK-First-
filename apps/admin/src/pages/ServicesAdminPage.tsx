import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { adminApiClient } from '../api/client';
import { Archive, CheckCircle2, Edit3, Filter, Loader2, Plus, Send, XCircle } from 'lucide-react';
import { useTranslation } from '../i18n/I18nProvider';
import { useSearchParams } from 'react-router-dom';
import { ServiceRequestsWorkspace } from '../components/ServiceRequestsWorkspace';
import { CanonicalMultiPicker } from '../components/CanonicalPicker';
import { canonicalPickerApi } from '../api/canonicalPickers';
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
const fulfillmentTypes = Object.values(ServiceFulfillmentType);
const deliveryModes = Object.values(ServiceDeliveryMode);
const availabilityStatuses = Object.values(ServiceAvailabilityStatus);

const emptyForm = {
  displayName: '',
  serviceCategory: ServiceCategory.STUDENT_SERVICES,
  fulfillmentType: ServiceFulfillmentType.CONSULTATION,
  serviceDescription: '',
  serviceAvailabilityStatus: ServiceAvailabilityStatus.AVAILABLE,
  requiredInputsOrDocuments: '',
  deliveryMode: ServiceDeliveryMode.ONLINE,
  responsibleServiceOwnerType: 'MANARATAK_TEAM',
  providerName: '',
  estimatedDeliveryTime: '',
  appointmentRequired: false,
  supportedCountryReferenceIds: [] as string[],
  supportedLanguageReferenceIds: [] as string[],
  pricingReferenceId: '',
  thumbnailAssetId: '',
  includes: '',
  excludes: '',
  faqs: '',
  cancellationPolicy: '',
  badge: '',
  priceLabel: '',
  servicePrerequisites: '',
  deliveryArtifactTypes: '',
};

export function ServicesAdminPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('request')
    ? 'REQUESTS'
    : searchParams.get('tab') === 'requests'
      ? 'REQUESTS'
      : 'CATALOG';
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [availabilityFilter, setAvailabilityFilter] = useState('');
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
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (statusFilter) params.set('status', statusFilter);
      if (categoryFilter) params.set('serviceCategory', categoryFilter);
      if (availabilityFilter) params.set('serviceAvailabilityStatus', availabilityFilter);
      if (deliveryFilter) params.set('deliveryMode', deliveryFilter);
      if (search) params.set('search', search);
      const response = await adminApiClient.request<ServiceListResponse>(
        `/admin/services?${params}`,
      );
      if (request === listSequence.current) {
        if (response.totalPages > 0 && page > response.totalPages) setPage(response.totalPages);
        else setServices(response);
      }
    } catch (cause) {
      if (request === listSequence.current)
        setListError(cause instanceof Error ? cause.message : 'تعذر تحميل الخدمات.');
    } finally {
      if (request === listSequence.current) setLoading(false);
    }
  }, [statusFilter, categoryFilter, availabilityFilter, deliveryFilter, search, page]);
  useEffect(() => {
    void loadServices();
    return () => {
      ++listSequence.current;
    };
  }, [loadServices]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  function switchTab(tab: 'CATALOG' | 'REQUESTS') {
    if (
      saving ||
      requestBusy ||
      ((dirty || requestDirty) &&
        !window.confirm('لديك تعديلات غير محفوظة للخدمة. الانتقال دون حفظ؟'))
    )
      return;
    formBaseline.current = JSON.stringify(emptyForm);
    setDirty(false);
    setSelectedService(null);
    setForm(emptyForm);
    const next = new URLSearchParams(searchParams);
    next.delete('request');
    next.set('tab', tab === 'REQUESTS' ? 'requests' : 'catalog');
    setSearchParams(next);
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
      const message = cause instanceof Error ? cause.message : 'تعذر حفظ الخدمة أو إعادة تحميلها.';
      setError(
        message.includes('VERSION_CONFLICT')
          ? 'تغيّرت الخدمة في جلسة أخرى. أعد تحميل النسخة المحفوظة ثم راجع تعديلاتك.'
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
      setError('احفظ تعديلات الخدمة قبل تغيير حالتها.');
      return;
    }
    if (!window.confirm(`تنفيذ «${formatLabel(action)}» للخدمة «${service.displayName}»؟`)) return;
    mutation.current = true;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await adminApiClient.request<ServiceCatalogItem>(
        `/admin/services/${service.id}/${action}`,
        { method: 'POST', body: JSON.stringify({ expectedVersion: service.version }) },
      );
      if (selectedService?.id === service.id) selectService(updated, true);
      setMessage(`تم تنفيذ: ${formatLabel(action)}`);
      await loadServices();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تحديث حالة الخدمة.');
    } finally {
      mutation.current = false;
      setSaving(false);
    }
  };

  const selectService = (service: ServiceCatalogItem, force = false) => {
    if (!force && (saving || (dirty && !window.confirm('ترك تعديلات الخدمة غير المحفوظة؟'))))
      return;
    setDirty(false);
    setSelectedService(service);
    const nextForm = {
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
    <div className="max-w-7xl mx-auto space-y-6">
      <section className="relative overflow-hidden rounded-[28px] border border-[#21A7B4]/30 bg-gradient-to-l from-[#0E7C86] via-[#103E6A] to-[#142B5F] p-6 text-white shadow-[0_18px_45px_rgba(20,43,95,0.18)] sm:p-8">
        <div className="pointer-events-none absolute -left-16 -top-28 h-64 w-64 rounded-full border border-cyan-400/20" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-1.5 w-48 bg-gradient-to-r from-transparent via-[#21A7B4] to-[#0E7C86] sm:w-80" />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-cyan-200 backdrop-blur-sm border border-white/15">
              <Plus className="h-4 w-4 text-[#21A7B4]" />
              <span>منظومة خدمات الطلاب والمؤسسات</span>
            </div>
            <h1 className="text-3xl font-black leading-tight sm:text-4xl text-white tracking-tight">
              {t('enterprise_services')}
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-cyan-50/90">
              {t('manage_service_catalog_items_readiness_publication')}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setPage(1);
                }}
                className="appearance-none bg-white/10 border border-white/20 rounded-xl py-2.5 pl-3 pr-10 text-sm focus:outline-none text-white focus:ring-1 focus:ring-[#21A7B4]"
              >
                <option value="" className="text-slate-900">
                  {t('all_statuses')}
                </option>
                {Object.values(ServiceStatus).map((status) => (
                  <option key={status} value={status} className="text-slate-900">
                    {formatLabel(status)}
                  </option>
                ))}
              </select>
              <Filter className="absolute right-3 top-3 h-4 w-4 text-cyan-200 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(event) => {
                  setCategoryFilter(event.target.value);
                  setPage(1);
                }}
                className="appearance-none bg-white/10 border border-white/20 rounded-xl py-2.5 pl-3 pr-10 text-sm focus:outline-none text-white focus:ring-1 focus:ring-[#21A7B4]"
              >
                <option value="" className="text-slate-900">
                  {t('all_categories')}
                </option>
                {serviceCategories.map((category) => (
                  <option key={category} value={category} className="text-slate-900">
                    {formatLabel(category)}
                  </option>
                ))}
              </select>
              <Filter className="absolute right-3 top-3 h-4 w-4 text-cyan-200 pointer-events-none" />
            </div>
          </div>
        </div>
      </section>

      <div className="flex gap-2 rounded-2xl border bg-white p-2">
        <button
          type="button"
          disabled={saving || requestBusy}
          onClick={() => switchTab('CATALOG')}
          aria-pressed={activeTab === 'CATALOG'}
          className={`rounded-xl px-4 py-3 text-sm font-bold ${activeTab === 'CATALOG' ? 'bg-[#142B5F] text-white' : 'text-slate-700'}`}
        >
          كتالوج الخدمات
        </button>
        <button
          type="button"
          disabled={saving || requestBusy}
          onClick={() => switchTab('REQUESTS')}
          aria-pressed={activeTab === 'REQUESTS'}
          className={`rounded-xl px-4 py-3 text-sm font-bold ${activeTab === 'REQUESTS' ? 'bg-[#142B5F] text-white' : 'text-slate-700'}`}
        >
          طلبات الطلاب
        </button>
      </div>
      {activeTab === 'REQUESTS' && (
        <ServiceRequestsWorkspace onBusyChange={setRequestBusy} onDirtyChange={setRequestDirty} />
      )}
      {activeTab === 'CATALOG' && (
        <>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setPage(1);
              query.trim() === search ? void loadServices() : setSearch(query.trim());
            }}
            className="flex flex-wrap items-end gap-3 rounded-2xl border bg-white p-4"
          >
            <label className="flex-1 text-xs font-bold">
              بحث بالاسم أو الرمز أو المزود
              <input
                maxLength={120}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="mt-2 w-full rounded-xl border p-3"
              />
            </label>
            <SelectField
              label="التوفر"
              value={availabilityFilter}
              values={['', ...availabilityStatuses]}
              onChange={(value) => {
                setAvailabilityFilter(value);
                setPage(1);
              }}
            />
            <SelectField
              label="طريقة التنفيذ"
              value={deliveryFilter}
              values={['', ...deliveryModes]}
              onChange={(value) => {
                setDeliveryFilter(value);
                setPage(1);
              }}
            />
            <button className="rounded-xl bg-[#142B5F] px-4 py-3 text-sm font-bold text-white">
              بحث
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => void loadServices()}
              className="rounded-xl border px-4 py-3 text-sm"
            >
              تحديث
            </button>
          </form>
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

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 bg-white border border-slate-200/90 rounded-3xl shadow-xs overflow-hidden">
              <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
                <h2 className="font-black text-[#142B5F]">
                  سجل كتالوج الخدمات ({services?.total ?? 0})
                </h2>
                <span className="text-xs font-bold text-slate-500">
                  {loading ? 'جارٍ التحديث…' : 'البيانات المحملة من الخادم'}
                </span>
              </div>
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-[#0E7C86]" />
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
                              {formatLabel(service.serviceCategory)}
                            </td>
                            <td className="px-4 py-4 text-slate-600">
                              <div className="font-bold text-[#0E7C86]">
                                {formatLabel(service.deliveryMode)}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {formatLabel(service.fulfillmentType)}
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
                                  <Edit3 className="h-3.5 w-3.5 text-[#0E7C86]" /> {t('edit')}
                                </button>
                                <button
                                  onClick={() => transitionService(service, 'mark-publishable')}
                                  disabled={
                                    saving ||
                                    service.completenessStatus !== 'COMPLETE' ||
                                    service.status === 'PUBLISHED' ||
                                    service.status === 'ARCHIVED' ||
                                    service.status === 'READY_TO_PUBLISH'
                                  }
                                  className="rounded-xl border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100 disabled:opacity-40 inline-flex items-center gap-1 transition"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" /> {t('ready')}
                                </button>
                                <button
                                  onClick={() => transitionService(service, 'publish')}
                                  disabled={
                                    saving ||
                                    service.status !== 'READY_TO_PUBLISH' ||
                                    (selectedService?.id === service.id && dirty)
                                  }
                                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-40 inline-flex items-center gap-1 transition"
                                >
                                  <Send className="h-3.5 w-3.5" /> {t('publish')}
                                </button>
                                {service.status === 'PUBLISHED' && (
                                  <button
                                    disabled={saving}
                                    onClick={() => transitionService(service, 'unpublish')}
                                    className="rounded-xl border px-2.5 py-1 text-xs font-bold"
                                  >
                                    إلغاء النشر
                                  </button>
                                )}
                                {service.status === 'PUBLISHED' && (
                                  <a
                                    href={`${(import.meta.env.VITE_PUBLIC_WEB_URL || '').replace(/\/$/, '')}/services/${encodeURIComponent(service.slug)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded-xl border px-2.5 py-1 text-xs font-bold text-teal-700"
                                  >
                                    عرض للعامة
                                  </a>
                                )}
                                <button
                                  onClick={() => transitionService(service, 'reject')}
                                  disabled={saving || service.status === 'PUBLISHED'}
                                  className="rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-40 inline-flex items-center gap-1 transition"
                                >
                                  <XCircle className="h-3.5 w-3.5" /> {t('reject')}
                                </button>
                                {['ARCHIVED', 'REJECTED'].includes(service.status) && (
                                  <button
                                    disabled={saving}
                                    onClick={() => transitionService(service, 'mark-ready')}
                                    className="rounded-xl border px-2.5 py-1 text-xs font-bold text-teal-700"
                                  >
                                    إعادة للمراجعة
                                  </button>
                                )}
                                <button
                                  onClick={() => transitionService(service, 'archive')}
                                  disabled={saving || service.status === 'ARCHIVED'}
                                  className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40 inline-flex items-center gap-1 transition"
                                >
                                  <Archive className="h-3.5 w-3.5" /> {t('archive')}
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

            <form
              onChange={() => setDirty(true)}
              onSubmit={selectedService ? updateService : createService}
              className="bg-white border border-slate-200/90 rounded-3xl shadow-xs p-6 space-y-4"
            >
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Plus className="h-5 w-5 text-[#0E7C86]" />
                <h3 className="font-black text-[#142B5F] text-base">
                  {selectedService ? 'تعديل الخدمة' : 'إضافة خدمة جديدة'}
                </h3>
              </div>
              {selectedService && (
                <div className="space-y-2">
                  <p className="text-xs font-mono text-[#0E7C86] font-bold">
                    {t('editing')}: {selectedService.publicId}
                  </p>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={async () => {
                      if (
                        dirty &&
                        !window.confirm('استبدال التعديلات غير المحفوظة بالنسخة الحالية من الخادم؟')
                      )
                        return;
                      try {
                        selectService(
                          await adminApiClient.request<ServiceCatalogItem>(
                            `/admin/services/${encodeURIComponent(selectedService.id)}`,
                          ),
                          true,
                        );
                      } catch (cause) {
                        setError(cause instanceof Error ? cause.message : 'تعذر تحديث البيانات.');
                      }
                    }}
                    className="text-xs font-bold text-teal-700 underline"
                  >
                    إعادة تحميل النسخة المحفوظة
                  </button>
                </div>
              )}

              <fieldset disabled={saving} className="space-y-4 min-w-0">
                {dirty && (
                  <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
                    تعديلات غير محفوظة
                  </p>
                )}
                <Field
                  label={t('service_name')}
                  value={form.displayName}
                  onChange={(value) => setForm({ ...form, displayName: value })}
                  placeholder="مثال: استشارة قبول جامعي متخصص"
                />
                <TextArea
                  label={t('service_description')}
                  value={form.serviceDescription}
                  onChange={(value) => setForm({ ...form, serviceDescription: value })}
                  rows={3}
                  placeholder="وصف تفصيلي للخدمة ومخرجاتها..."
                />
                <SelectField
                  label={t('category')}
                  value={form.serviceCategory}
                  values={serviceCategories}
                  onChange={(value) =>
                    setForm({ ...form, serviceCategory: value as ServiceCategory })
                  }
                />
                <SelectField
                  label={t('fulfillment_type')}
                  value={form.fulfillmentType}
                  values={fulfillmentTypes}
                  onChange={(value) =>
                    setForm({ ...form, fulfillmentType: value as ServiceFulfillmentType })
                  }
                />
                <SelectField
                  label={t('delivery_mode')}
                  value={form.deliveryMode}
                  values={deliveryModes}
                  onChange={(value) =>
                    setForm({ ...form, deliveryMode: value as ServiceDeliveryMode })
                  }
                />
                <SelectField
                  label={t('availability')}
                  value={form.serviceAvailabilityStatus}
                  values={availabilityStatuses}
                  onChange={(value) =>
                    setForm({
                      ...form,
                      serviceAvailabilityStatus: value as ServiceAvailabilityStatus,
                    })
                  }
                />
                <Field
                  label={t('required_inputs_documents')}
                  value={form.requiredInputsOrDocuments}
                  onChange={(value) => setForm({ ...form, requiredInputsOrDocuments: value })}
                  placeholder="جواز السفر، كشف الدرجات، السيرة الذاتية"
                />
                <Field
                  label={t('responsible_owner_type')}
                  value={form.responsibleServiceOwnerType}
                  onChange={(value) => setForm({ ...form, responsibleServiceOwnerType: value })}
                  placeholder="MANARATAK_TEAM"
                />
                <Field
                  label={t('estimated_delivery_time')}
                  value={form.estimatedDeliveryTime}
                  onChange={(value) => setForm({ ...form, estimatedDeliveryTime: value })}
                  optional
                  placeholder="مثال: 3-5 أيام عمل"
                />
                <Field
                  label={t('provider_name')}
                  value={form.providerName}
                  onChange={(value) => setForm({ ...form, providerName: value })}
                  optional
                  placeholder="اسم المزود إن وجد"
                />
                <CanonicalMultiPicker
                  label={t('supported_countries')}
                  values={form.supportedCountryReferenceIds}
                  onChange={(values) => setForm({ ...form, supportedCountryReferenceIds: values })}
                  load={() => canonicalPickerApi.countries()}
                  reloadKey="service-countries"
                />
                <CanonicalMultiPicker
                  label={t('supported_languages')}
                  values={form.supportedLanguageReferenceIds}
                  onChange={(values) => setForm({ ...form, supportedLanguageReferenceIds: values })}
                  load={() => canonicalPickerApi.languages()}
                  reloadKey="service-languages"
                />
                <Field
                  label={t('pricing_reference_id')}
                  value={form.pricingReferenceId}
                  onChange={(value) => setForm({ ...form, pricingReferenceId: value })}
                  optional
                  placeholder="معرف التسعيرة المرجعية"
                />
                <Field
                  label={t('thumbnail_asset_id')}
                  value={form.thumbnailAssetId}
                  onChange={(value) => setForm({ ...form, thumbnailAssetId: value })}
                  optional
                  placeholder="معرف أصل الصورة المميزة"
                />

                <h4 className="border-t pt-4 text-sm font-bold text-[#142B5F]">
                  تفاصيل الصفحة العامة
                </h4>
                <TextArea
                  label="ما تشمل الخدمة (كل عنصر في سطر)"
                  value={form.includes}
                  onChange={(value) => setForm({ ...form, includes: value })}
                  rows={3}
                />
                <TextArea
                  label="ما لا تشمل الخدمة"
                  value={form.excludes}
                  onChange={(value) => setForm({ ...form, excludes: value })}
                  rows={3}
                />
                <TextArea
                  label="الأسئلة الشائعة (سؤال | إجابة في كل سطر)"
                  value={form.faqs}
                  onChange={(value) => setForm({ ...form, faqs: value })}
                  rows={4}
                />
                <TextArea
                  label="سياسة الإلغاء"
                  value={form.cancellationPolicy}
                  onChange={(value) => setForm({ ...form, cancellationPolicy: value })}
                  rows={3}
                />
                <Field
                  label="وسم البطاقة"
                  value={form.badge}
                  onChange={(value) => setForm({ ...form, badge: value })}
                  optional
                />
                <Field
                  label="وصف السعر المعروض"
                  value={form.priceLabel}
                  onChange={(value) => setForm({ ...form, priceLabel: value })}
                  optional
                />
                <TextArea
                  label="البيانات المطلوب إدخالها عند طلب الخدمة"
                  value={form.servicePrerequisites}
                  onChange={(value) => setForm({ ...form, servicePrerequisites: value })}
                  rows={3}
                />
                <TextArea
                  label="مخرجات التسليم"
                  value={form.deliveryArtifactTypes}
                  onChange={(value) => setForm({ ...form, deliveryArtifactTypes: value })}
                  rows={3}
                />
                <label className="flex items-center justify-between gap-3 text-xs font-bold text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span>{t('appointment_required')}</span>
                  <input
                    type="checkbox"
                    checked={form.appointmentRequired}
                    onChange={(event) =>
                      setForm({ ...form, appointmentRequired: event.target.checked })
                    }
                    className="h-4 w-4 rounded border-slate-300 text-[#0E7C86] focus:ring-[#0E7C86]"
                  />
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={
                      saving ||
                      !form.displayName ||
                      !form.serviceDescription ||
                      !form.requiredInputsOrDocuments
                    }
                    className="inline-flex items-center justify-center gap-2 bg-[#0E7C86] hover:bg-[#142B5F] text-white rounded-2xl px-4 py-2.5 text-xs font-black shadow-md transition disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    {selectedService ? 'حفظ التعديلات' : 'إنشاء الخدمة'}
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      if (dirty && !window.confirm('ترك التعديلات غير المحفوظة؟')) return;
                      formBaseline.current = JSON.stringify(emptyForm);
                      setSelectedService(null);
                      setForm(emptyForm);
                      setDirty(false);
                    }}
                    className="inline-flex items-center justify-center gap-2 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-bold bg-white text-slate-700 hover:bg-slate-50 transition"
                  >
                    {t('clear')}
                  </button>
                </div>
              </fieldset>
            </form>
          </div>
          {services && (
            <div className="flex justify-between rounded-xl border bg-white p-4 text-sm">
              <button disabled={loading || page <= 1} onClick={() => setPage((value) => value - 1)}>
                السابق
              </button>
              <span>
                {page} / {Math.max(1, services.totalPages)}
              </span>
              <button
                disabled={loading || page >= services.totalPages}
                onClick={() => setPage((value) => value + 1)}
              >
                التالي
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  optional,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  optional?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-slate-700">
        {label}
        {optional ? ' (اختياري)' : ''}
      </span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:border-[#21A7B4] transition"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-slate-700">{label}</span>
      <textarea
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:border-[#21A7B4] transition"
      />
    </label>
  );
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
