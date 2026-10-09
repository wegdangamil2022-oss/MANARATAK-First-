import { useEffect, useState } from 'react';
import { adminApiClient } from '../api/client';

interface IdentityOption {
  id: string;
  status: string;
  user?: { profile?: { displayName?: string } };
}

/** Canonical IDs come from the Identity owner, never from a free-text scope field. */
export function SettingsIdentityScopePicker({
  value,
  onChange,
  isAr,
  disabled = false,
}: {
  value: string;
  onChange: (id: string) => void;
  isAr: boolean;
  disabled?: boolean;
}) {
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<IdentityOption[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setBusy(true);
      setError('');
      const query = new URLSearchParams({ limit: '20' });
      if (search.trim()) query.set('search', search.trim());
      void adminApiClient.request<{ data: { items: IdentityOption[] } }>(
        `/admin/identities?${query}`, { cache: 'no-store' },
      ).then(result => {
        if (!active) return;
        if (!Array.isArray(result.data?.items)) throw new Error('Invalid identity owner response');
        setItems(result.data.items.filter(item =>
          typeof item.id === 'string' && item.id.length > 0 && item.status !== 'PURGED'));
      }).catch(() => {
        if (active) {
          setItems([]);
          setError(isAr ? 'تعذر التحقق من دليل الهويات. لا تخمّن المعرف.' : 'Identity directory unavailable. Do not guess an ID.');
        }
      }).finally(() => { if (active) setBusy(false); });
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [search, isAr]);

  return (
    <div className="space-y-2">
      <input value={search} disabled={disabled} maxLength={240}
        placeholder={isAr ? 'ابحث عن هوية في دليل IAM' : 'Search IAM identity directory'}
        onChange={event => { setSearch(event.target.value); onChange(''); }}
        className="input" />
      <select required value={value} disabled={disabled || busy || !!error}
        onChange={event => onChange(event.target.value)} className="input" dir="ltr">
        <option value="">{isAr ? 'اختر هوية معتمدة' : 'Select a verified identity'}</option>
        {value && !items.some(item => item.id === value) && (
          <option value={value}>{value} — {isAr ? 'معرف محفوظ؛ يتحقق الخادم منه' : 'Saved ID; server validation required'}</option>
        )}
        {items.map(item => <option key={item.id} value={item.id}>
          {item.user?.profile?.displayName || item.id} — {item.id} ({item.status})
        </option>)}
      </select>
      {busy && <p role="status" className="text-xs text-slate-500">{isAr ? 'تحميل الهويات…' : 'Loading identities…'}</p>}
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
      <p className="text-xs text-slate-500">
        {isAr ? 'الاختيار من IAM فقط. يتأكد الخادم من وجود الهوية قبل حفظ القيمة.' : 'Select from IAM. Server verifies the identity before saving.'}
      </p>
    </div>
  );
}
