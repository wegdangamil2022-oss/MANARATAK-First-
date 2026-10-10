import { useEffect, useState } from 'react';
import { adminApiClient } from '../api/client';
import { useTranslation } from '../i18n/I18nProvider';

interface Candidate {
  id: string;
  displayName: string;
  primaryEmail: string;
}
export function AuthorizationIdentityPicker({
  value,
  onChange,
  approver = false,
}: {
  value: string;
  onChange: (id: string) => void;
  approver?: boolean;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [cursor, setCursor] = useState('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setBusy(true);
      setError('');
      const query = new URLSearchParams({
        search,
        cursor,
        limit: '20',
        ...(approver ? { approver: 'true' } : {}),
      });
      adminApiClient
        .request<{
          data: { identities: Candidate[]; nextCursor: string | null; hasMore: boolean };
        }>(`/admin/authorization/eligible-identities?${query}`, { cache: 'no-store' })
        .then((result) => {
          if (active) {
            setCandidates(result.data.identities);
            setNextCursor(result.data.nextCursor);
            setHasMore(Boolean(result.data.nextCursor));
          }
        })
        .catch((failure) => {
          if (active) {
            setError(String(failure));
            setCandidates([]);
            setHasMore(false);
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
  }, [search, cursor, approver]);
  return (
    <div className="space-y-2">
      <label className="block">
        {t(approver ? 'iam_second_approver' : 'iam_select_identity')}
        <input
          className="mt-1 w-full rounded-xl border p-2"
          value={search}
          maxLength={240}
          onChange={(event) => {
            setSearch(event.target.value);
            setCursor('');
            setCandidates([]);
            onChange('');
          }}
          placeholder={t('iam_search')}
        />
      </label>
      {error && <p role="alert">{error}</p>}
      {busy && <p role="status">{t('iam_loading')}</p>}
      <label className="block">
        {t('iam_search_results')}
        <select
          className="mt-1 w-full rounded-xl border p-2"
          value={value}
          disabled={busy}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">{t('iam_select_identity')}</option>
          {value && !candidates.some((candidate) => candidate.id === value) && (
            <option value={value}>{value}</option>
          )}
          {candidates.map((candidate) => (
            <option value={candidate.id} key={candidate.id}>
              {candidate.displayName} — {candidate.primaryEmail}
            </option>
          ))}
        </select>
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy || cursor === ''}
          onClick={() => {
            setCursor('');
            onChange('');
          }}
        >
          {t('iam_first_page')}
        </button>
        <button
          type="button"
          disabled={busy || !hasMore}
          onClick={() => {
            setCursor(nextCursor || '');
            onChange('');
          }}
        >
          {t('iam_next')}
        </button>
      </div>
    </div>
  );
}
