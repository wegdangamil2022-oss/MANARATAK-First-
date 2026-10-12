import { useEffect, useRef, useState } from 'react';
import { ApiClient, type StudentServicePackageDto } from '../../api/client';
import { useTranslation } from '../../i18n/I18nProvider';
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
        setNotice(
          label(
            `حُجز الموعد مؤقتًا: ${result.publicId}. التأكيد يتطلب تسوية المالية قبل انتهاء الحجز.`,
            `Temporary booking: ${result.publicId}. Finance settlement is required before hold expiry.`,
          ),
        );
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
      className="space-y-3 rounded-2xl border p-4"
      aria-label={label('مواعيد ومخرجات الخدمة', 'Service bookings and deliverables')}
    >
      <p role="status">{notice}</p>
      {packages.length > 0 && (
        <>
          <label>
            {label('الخدمة أو الباقة', 'Service or package')}
            <select
              value={packageId}
              disabled={busy}
              onChange={(event) => {
                setPackageId(event.target.value);
                setInputs({});
                setConsent(false);
              }}
              className="block rounded-xl border p-2"
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
            <button type="button" disabled={busy} onClick={() => void more('packages')}>
              {label('المزيد من الباقات', 'More packages')}
            </button>
          )}
        </>
      )}
      {selected && (
        <div className="space-y-3">
          {selected.items.map((item) => (
            <fieldset key={item.serviceId} className="rounded-xl border p-3">
              <legend>
                {item.localizedContent?.[language]?.displayName ?? item.displayName} ×{' '}
                {item.quantity}
              </legend>
              {item.inputSchema.map((field) => (
                <label key={field.key} className="block">
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
                    className="rounded-xl border p-2"
                  />
                </label>
              ))}
            </fieldset>
          ))}
          <label>
            <input
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
            className="rounded-xl border p-3"
            onClick={() => void book(slot.id)}
          >
            {new Date(slot.startsAt).toLocaleString(language, { timeZone: slot.timezone })} —{' '}
            {label('حجز مؤقت', 'Temporary booking')}
          </button>
        ))}
      </div>
      {slotCursor && (
        <button type="button" disabled={busy} onClick={() => void more('slots')}>
          {label('المزيد من المواعيد', 'More availability')}
        </button>
      )}
      {deliverables.map((file) => (
        <button
          type="button"
          key={file.id}
          disabled={busy}
          onClick={() => void download(file.id)}
          className="rounded-xl border p-3"
        >
          {label('تنزيل المخرج', 'Download deliverable')}: {file.artifactType}
        </button>
      ))}
    </section>
  );
}
