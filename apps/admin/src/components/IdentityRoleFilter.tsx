import { useEffect, useState } from 'react';
import { adminApiClient } from '../api/client';
import { useTranslation } from '../i18n/I18nProvider';
export function IdentityRoleFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [cursor, setCursor] = useState('');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [rows, setRows] = useState<{ id: string; name: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setBusy(true);
      setError('');
      const params = new URLSearchParams({ limit: '25', search, ...(cursor ? { cursor } : {}) });
      adminApiClient
        .request<{ data: { roles: { id: string; name: string }[]; nextCursor: string | null } }>(
          `/admin/identities/role-options?${params}`,
          { cache: 'no-store' },
        )
        .then((response) => {
          if (active) {
            setRows(response.data.roles);
            setNextCursor(response.data.nextCursor);
          }
        })
        .catch((failure) => {
          if (active) {
            setRows([]);
            setError(String(failure));
          }
        })
        .finally(() => {
          if (active) setBusy(false);
        });
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [search, cursor]);
  return (
    <fieldset className="space-y-2">
      <legend>{t('iam_role_filter')}</legend>
      <label>
        {t('iam_search')}
        <input
          className="w-full border p-2"
          value={search}
          maxLength={240}
          onChange={(e) => {
            setSearch(e.target.value);
            setCursor('');
            setRows([]);
          }}
        />
      </label>
      <label>
        {t('iam_select_role')}
        <select
          className="w-full border p-2"
          disabled={busy}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">{t('iam_all')}</option>
          {value && !rows.some((row) => row.id === value) && <option value={value}>{value}</option>}
          {rows.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
      </label>
      {error && <p role="alert">{error}</p>}
      {busy && <p role="status">{t('iam_loading')}</p>}
      <button type="button" disabled={busy || !cursor} onClick={() => setCursor('')}>
        {t('iam_first_page')}
      </button>
      <button type="button" disabled={busy || !nextCursor} onClick={() => setCursor(nextCursor!)}>
        {t('iam_next')}
      </button>
    </fieldset>
  );
}
