import { useEffect, useState } from 'react';
import { TRANSLATION_OWNER_CAPABILITIES, type TranslationOwnerCapability } from '@manaratak/shared';
import { adminApiClient } from '../../api/client';
export function useTranslationOwnerCapabilities(enabled = true) {
  const [data, setData] = useState<TranslationOwnerCapability[] | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const abort = new AbortController();
    setLoading(true);
    setError('');
    setData(null);
    adminApiClient
      .request<{ data: TranslationOwnerCapability[] }>('/admin/translations/capabilities', {
        signal: abort.signal,
        cache: 'no-store',
      })
      .then((result) => {
        if (abort.signal.aborted) return;
        if (
          !Array.isArray(result.data) ||
          result.data.some((row) => {
            const known = TRANSLATION_OWNER_CAPABILITIES[row.key];
            return (
              !known || row.ownerPath !== known.ownerPath || row.permission !== known.permission
            );
          }) ||
          new Set(result.data.map((row) => row.key)).size !== result.data.length
        )
          throw Error('TRANSLATION_CAPABILITIES_INVALID');
        setData(result.data);
      })
      .catch(() => {
        if (!abort.signal.aborted) setError('TRANSLATION_CAPABILITIES_UNAVAILABLE');
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [enabled, revision]);
  return { data, loading, error, reload: () => setRevision((value) => value + 1) };
}
