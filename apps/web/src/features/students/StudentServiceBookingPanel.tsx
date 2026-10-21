import { PreviewStudentApiClient } from './studentWorkspacePreviewApi';
const ApiClient = import.meta.env.VITE_PUBLIC_TEMPLATE_DATA_MODE === 'prototype' ? PreviewStudentApiClient : LiveApiClient;
import { useEffect, useRef, useState } from 'react';
import { ApiClient as LiveApiClient, type StudentServicePackageDto } from '../../api/client';
import { useTranslation } from '../../i18n/I18nProvider';
import { CalendarClock } from 'lucide-react';
type Slot = { id: string; startsAt: string; timezone: string };
export function StudentServiceBookingPanel({ requestId }: { requestId: string }) {
  const { language, dir } = useTranslation();
  const [slots, setSlots] = useState<Slot[]>([]),
    [slotCursor, setSlotCursor] = useState<string | null>(null);
  const [packages, setPackages] = useState<StudentServicePackageDto[]>([]),
    [packageCursor, setPackageCursor] = useState<string | null>(null);
  const [packageId, setPackageId] = useState(''),
    [consent, setConsent] = useState(false);
  const [inputs, setInputs] = useState<Record<string, Record<string, unknown>>>({});
  const [deliverables, setDeliverables] = useState<Array<{ id: string; artifactType: string }>>([]);
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState('');
  const mutation = useRef(false),
    intent = useRef<{ payload: string; key: string } | null>(null),
    active = useRef(requestId);
  active.current = requestId;
  const selected = packages.find((row) => row.id === packageId);
  const label = (ar: string, en: string) => (language === 'ar' ? ar : en);
  useEffect(() => {
    let current = true;
    setSlots([]);
    setSlotCursor(null);
    setPackages([]);
    setPackageCursor(null);
    setPackageId('');
    setConsent(false);
    setInputs({});
    setDeliverables([]);
    setNotice('');
    intent.current = null;
    void Promise.allSettled([
      ApiClient.listMyServiceAvailability(requestId),
      ApiClient.listMyServicePackages(requestId),
      ApiClient.listMyServiceDeliverables(requestId),
    ]).then((results) => {
      if (!current) return;
      if (results[0].status === 'fulfilled') {
        setSlots(results[0].value.data);
        setSlotCursor(results[0].value.nextCursor);
      }
      if (results[1].status === 'fulfilled') {
        setPackages(results[1].value.data);
        setPackageCursor(results[1].value.nextCursor);
      }
      if (results[2].status === 'fulfilled') setDeliverables(results[2].value.data);
      if (results.some((result) => result.status === 'rejected'))
        setNotice(
          language === 'ar'
            ? 'تعذر تحميل بعض معلومات الخدمة.'
            : 'Some service information could not be loaded.',
        );
    });
    return () => {
      current = false;
    };
  }, [requestId, language]);
  async function more(kind: 'slots' | 'packages') {
    if (mutation.current) return;
    const reference = requestId;
    mutation.current = true;
    setBusy(true);
    try {
      if (kind === 'slots' && slotCursor) {
        const page = await ApiClient.listMyServiceAvailability(reference, slotCursor);
        if (active.current === reference) {
          setSlots((previous) =>
            Array.from(new Map([...previous, ...page.data].map((row) => [row.id, row])).values()),
          );
          setSlotCursor(page.nextCursor);
        }
      }
      if (kind === 'packages' && packageCursor) {
        const page = await ApiClient.listMyServicePackages(reference, packageCursor);
        if (active.current === reference) {
          setPackages((previous) =>
            Array.from(new Map([...previous, ...page.data].map((row) => [row.id, row])).values()),
          );
          setPackageCursor(page.nextCursor);
        }
      }
    } catch {
      if (active.current === reference)
        setNotice(label('تعذر تحميل الصفحة التالية.', 'Unable to load the next page.'));
    } finally {
      mutation.current = false;
      setBusy(false);
    }
  }
  async function book(slotId: string) {
    if (mutation.current || (selected && !consent)) return;
    const reference = requestId;
    const options = selected
      ? { packageId: selected.id, packageConsent: true, packageParameters: inputs }
      : undefined;
    const payload = JSON.stringify({ requestId: reference, slotId, options });
    if (!intent.current || intent.current.payload !== payload)
      intent.current = { payload, key: crypto.randomUUID() };
    mutation.current = true;
    setBusy(true);
    try {
      const result = await ApiClient.bookMyServiceRequest(
        reference,
        slotId,
        intent.current.key,
        options,
      );
      if (active.current === reference)
        setNotice(import.meta.env.VITE_PUBLIC_TEMPLATE_DATA_MODE === 'prototype'
          ? label(
              `معاينة فقط: تمت محاكاة حجز الموعد برمز ${result.publicId}. لم يتم إنشاء حجز أو دفع حقيقي.`,
              `Design preview only: booking ${result.publicId} was simulated. No booking or payment was created.`,
            )
          : label(
              `حُجز الموعد مؤقتًا: ${result.publicId}. التأكيد يتطلب تسوية المالية قبل انتهاء الحجز.`,
              `Temporary booking: ${result.publicId}. Finance settlement is required before hold expiry.`,
            ));
    } catch {
      if (active.current === reference)
        setNotice(
          label(
            'تعذر حجز الموعد؛ تحقق من المدخلات والسعة وحالة الطلب.',
            'Booking failed; check inputs, capacity and request status.',
          ),
        );
    } finally {
      mutation.current = false;
      setBusy(false);
    }
  }
  async function download(id: string) {
    if (mutation.current) return;
    const reference = requestId;
    mutation.current = true;
    setBusy(true);
    try {
      const grant = await ApiClient.getMyServiceDeliveryGrant(reference, id);
      const url = new URL(grant.url);
      if (url.protocol !== 'https:' && url.protocol !== 'http:')
        throw new Error('UNSAFE_DELIVERY_URL');
      const response = await fetch(url, { headers: grant.headers, credentials: 'omit' });
      if (!response.ok) throw new Error('DELIVERY_FAILED');
      const blob = await response.blob();
      if (active.current !== reference) return;
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = 'service-deliverable';
      link.click();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch {
      if (active.current === reference)
        setNotice(
          label(
            'تعذر تنزيل الملف أو لم يعد التسليم مصرحًا.',
            'File unavailable or delivery is no longer authorized.',
          ),
        );
    } finally {
      mutation.current = false;
      setBusy(false);
    }
  }
  if (!slots.length && !packages.length && !deliverables.length && !notice) return null;
  return (
    <section
      dir={dir}
      className="mn-student-service-booking-panel space-y-3 rounded-2xl border border-[var(--mn-border)] bg-[var(--mn-surface)] p-3.5 shadow-2xs mn-panel dark:border-white/10 sm:p-4"
      aria-label={label('مواعيد ومخرجات الخدمة', 'Service bookings and deliverables')}
    >
      <div className="mb-3 flex min-w-0 items-center gap-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-[#D6A43B]/30 bg-[#142B5F] dark:bg-[#0c1a3b]">
          <CalendarClock className="h-4 w-4 text-[#E5B54F]" aria-hidden="true" />
        </span>
        <h3 className="mn-student-services-heading min-w-0 text-[14px] font-bold text-[var(--mn-heading)]">{label('مواعيد ومخرجات الخدمة', 'Service bookings and deliverables')}</h3>
      </div>
      {notice && <p role="status" className="rounded-lg border border-[var(--mn-border)] bg-[var(--mn-page)] p-3 text-[11px] leading-[1.8] text-[var(--mn-text-muted)]">{notice}</p>}
      {packages.length > 0 && (
        <>
          <label className="block text-[11px] font-semibold text-[var(--mn-heading)]">
            {label('الخدمة أو الباقة', 'Service or package')}
            <select
              value={packageId}
              disabled={busy}
              onChange={(event) => {
                setPackageId(event.target.value);
                setInputs({});
                setConsent(false);
              }}
              className="mt-1 block min-h-10 w-full rounded-lg border border-[var(--mn-border)] bg-[var(--mn-page)] px-3 py-2 text-[12px] text-[var(--mn-heading)]"
            >
              <option value="">{label('الخدمة المفردة', 'Single service')}</option>
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.id} disabled={!pkg.price}>
                  {pkg.displayName}
                </option>
              ))}
            </select>
          </label>
          {packageCursor && (
            <button type="button" disabled={busy} onClick={() => void more('packages')} className="min-h-9 rounded-lg border border-[var(--mn-border)] bg-[var(--mn-page)] px-3 py-1.5 text-[12px] font-bold text-[var(--mn-heading)] disabled:opacity-50">
              {label('المزيد من الباقات', 'More packages')}
            </button>
          )}
        </>
      )}
      {selected && (
        <div className="space-y-3">
          {selected.items.map((item) => (
            <fieldset key={item.serviceId} className="rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] p-3">
              <legend className="px-1 text-[12px] font-bold text-[var(--mn-heading)]">
                {item.localizedContent?.[language]?.displayName ?? item.displayName} ×{' '}
                {item.quantity}
              </legend>
              {item.inputSchema.map((field) => (
                <label key={field.key} className="mt-2 block text-[11px] font-semibold text-[var(--mn-heading)]">
                  {field.key}
                  <input
                    type={
                      field.type === 'BOOLEAN'
                        ? 'checkbox'
                        : field.type === 'NUMBER'
                          ? 'number'
                          : 'text'
                    }
                    required={field.required}
                    maxLength={2000}
                    checked={
                      field.type === 'BOOLEAN'
                        ? Boolean(inputs[item.serviceId]?.[field.key])
                        : undefined
                    }
                    value={
                      field.type === 'BOOLEAN'
                        ? undefined
                        : String(inputs[item.serviceId]?.[field.key] ?? '')
                    }
                    onChange={(event) =>
                      setInputs((previous) => ({
                        ...previous,
                        [item.serviceId]: {
                          ...previous[item.serviceId],
                          [field.key]:
                            field.type === 'BOOLEAN'
                              ? event.target.checked
                              : field.type === 'NUMBER'
                                ? Number(event.target.value)
                                : event.target.value,
                        },
                      }))
                    }
                    className={field.type === 'BOOLEAN'
                      ? 'mt-1 h-4 w-4 accent-[#142B5F]'
                      : 'mt-1 block min-h-10 w-full rounded-lg border border-[var(--mn-border)] bg-[var(--mn-surface)] px-3 py-2 text-[12px] text-[var(--mn-heading)]'}
                  />
                </label>
              ))}
            </fieldset>
          ))}
          <label className="flex items-start gap-2 rounded-lg border border-[var(--mn-border)] bg-[var(--mn-page)] p-3 text-[11px] font-semibold leading-[1.8] text-[var(--mn-heading)]">
            <input
              className="mt-1 h-4 w-4 shrink-0 accent-[#142B5F]"
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
            />
            {label(
              'أوافق على خدمات الباقة وشروطها ومعالجة مدخلاتها.',
              'I accept the package services, terms and input processing.',
            )}
          </label>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {slots.map((slot) => (
          <button
            type="button"
            key={slot.id}
            disabled={busy || Boolean(selected && !consent)}
            className="min-h-10 rounded-lg border border-[var(--mn-border)] bg-[var(--mn-page)] px-3 py-2 text-[12px] font-semibold text-[var(--mn-heading)] transition-colors hover:border-[#D6A43B] disabled:opacity-50"
            onClick={() => void book(slot.id)}
          >
            {new Date(slot.startsAt).toLocaleString(language, { timeZone: slot.timezone })} —{' '}
            {label('حجز مؤقت', 'Temporary booking')}
          </button>
        ))}
      </div>
      {slotCursor && (
        <button type="button" disabled={busy} onClick={() => void more('slots')} className="min-h-9 rounded-lg border border-[var(--mn-border)] bg-[var(--mn-page)] px-3 py-1.5 text-[12px] font-bold text-[var(--mn-heading)] disabled:opacity-50">
          {label('المزيد من المواعيد', 'More availability')}
        </button>
      )}
      {deliverables.map((file) => (
        <button
          type="button"
          key={file.id}
          disabled={busy}
          onClick={() => void download(file.id)}
          className="min-h-9 rounded-lg border border-[var(--mn-border)] bg-[var(--mn-page)] px-3 py-1.5 text-[12px] font-bold text-[var(--mn-heading)] transition-colors hover:border-[#D6A43B] disabled:opacity-50"
        >
          {label('تنزيل المخرج', 'Download deliverable')}: {file.artifactType}
        </button>
      ))}
    </section>
  );
}
