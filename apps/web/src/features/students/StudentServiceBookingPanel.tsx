import { useEffect, useRef, useState } from 'react';
import { ApiClient } from '../../api/client';
export function StudentServiceBookingPanel({ requestId }: { requestId: string }) {
  const [slots, setSlots] = useState<Array<{ id: string; startsAt: string; timezone: string }>>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const intent = useRef<{ slotId: string; key: string } | null>(null);
  const mutation = useRef(false);
  useEffect(() => {
    let current = true;
    setSlots([]);
    setNotice('');
    intent.current = null;
    void ApiClient.listMyServiceAvailability(requestId)
      .then((result) => {
        if (current) setSlots(result.data);
      })
      .catch(() => {
        if (current) setNotice('تعذر تحميل المواعيد المتاحة.');
      });
    return () => {
      current = false;
    };
  }, [requestId]);
  async function book(slotId: string) {
    if (mutation.current) return;
    mutation.current = true;
    setBusy(true);
    if (!intent.current || intent.current.slotId !== slotId)
      intent.current = { slotId, key: crypto.randomUUID() };
    try {
      const result = await ApiClient.bookMyServiceRequest(requestId, slotId, intent.current.key);
      setNotice(
        `تم حجز الموعد مؤقتاً: ${result.publicId}. يتطلب التأكيد تسوية الفاتورة قبل انتهاء الحجز.`,
      );
    } catch {
      setNotice('تعذر تأكيد حجز الموعد؛ تحقق من الطلب والسعة المتاحة.');
    } finally {
      mutation.current = false;
      setBusy(false);
    }
  }
  if (!slots.length && !notice) return null;
  return (
    <section className="rounded-2xl border p-4" aria-label="مواعيد الخدمة">
      <p role="status">{notice}</p>
      {slots.map((slot) => (
        <button
          key={slot.id}
          type="button"
          disabled={busy}
          className="m-2 rounded-xl border p-3"
          onClick={() => void book(slot.id)}
        >
          {new Date(slot.startsAt).toLocaleString('ar', { timeZone: slot.timezone })} — حجز مؤقت
        </button>
      ))}
    </section>
  );
}
