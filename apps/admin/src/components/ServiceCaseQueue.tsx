import { useEffect, useRef, useState } from 'react';
import { adminApiClient } from '../api/client';
import { useTranslation } from '../i18n/I18nProvider';
export function ServiceCaseQueue({ onClaim }: { onClaim: (id: string) => void }) {
  const { language } = useTranslation();
  const [rows, setRows] = useState<
    Array<{ id: string; publicId: string; status: string; version: number }>
  >([]);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const mutation = useRef(false);
  useEffect(() => {
    let current = true;
    void adminApiClient
      .request<{ data: typeof rows }>('/admin/services/requests/unassigned')
      .then((page) => {
        if (current) setRows(page.data);
      })
      .catch(() => {
        if (current)
          setNotice(
            language === 'ar'
              ? 'تعذر تحميل الحالات غير المسندة.'
              : 'Unable to load unassigned cases.',
          );
      });
    return () => {
      current = false;
    };
  }, [language]);
  async function claim(row: (typeof rows)[number]) {
    if (mutation.current) return;
    mutation.current = true;
    setBusy(true);
    try {
      await adminApiClient.request(`/admin/services/requests/${row.id}/claim`, {
        method: 'POST',
        body: JSON.stringify({ expectedVersion: row.version }),
      });
      setRows((previous) => previous.filter((item) => item.id !== row.id));
      onClaim(row.id);
    } catch {
      setNotice(
        language === 'ar'
          ? 'تغيّرت الحالة أو لا تملك صلاحية إسنادها.'
          : 'Case changed or assignment is not authorized.',
      );
    } finally {
      mutation.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="rounded-2xl border p-4">
      <h3>{language === 'ar' ? 'حالات تنتظر الإسناد' : 'Unassigned cases'}</h3>
      <p role="status">{notice}</p>
      {rows.map((row) => (
        <div className="flex justify-between p-2" key={row.id}>
          <span>{row.publicId}</span>
          <button type="button" disabled={busy} onClick={() => void claim(row)}>
            {language === 'ar' ? 'إسناد الحالة إليّ' : 'Assign to me'}
          </button>
        </div>
      ))}
    </section>
  );
}
