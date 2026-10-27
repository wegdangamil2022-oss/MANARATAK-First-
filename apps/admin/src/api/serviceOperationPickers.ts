import { adminApiClient } from './client';
import type { CanonicalPickerPage } from './canonicalPickers';

export async function serviceOperationOptions(
  kind: string,
  query = '',
  page = 1,
): Promise<CanonicalPickerPage> {
  const result = await adminApiClient.request<{
    total: number;
    data: Array<{
      id: string;
      displayName?: string;
      name?: string;
      publicId?: string;
      status: string;
    }>;
  }>(`/admin/services/operations/${kind}?page=${page}`);
  const options = result.data
    .filter(
      (row) =>
        !query ||
        `${row.displayName ?? ''} ${row.name ?? ''} ${row.publicId ?? ''}`
          .toLocaleLowerCase()
          .includes(query.toLocaleLowerCase()),
    )
    .map((row) => ({
      id: row.id,
      label: row.displayName || row.name || row.publicId || row.id,
      lifecycle: row.status,
    }));
  return { options, nextCursor: page * 20 < result.total ? String(page + 1) : null };
}
