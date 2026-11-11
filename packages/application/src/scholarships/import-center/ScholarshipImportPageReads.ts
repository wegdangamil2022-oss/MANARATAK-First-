import type { IScholarshipRepository, ScholarshipDto } from '@manaratak/domain';
import type {
  IScholarshipImportCanonicalResolutionDecisionPort,
  IScholarshipImportVerificationDecisionPort,
} from './ScholarshipImportCenterContracts';

/** Request-local batching only. Never retain review decisions across requests;
 * authoritative transfer revalidates inside its separate owner transaction. */
export async function scholarshipImportPageReads(
  ids: string[],
  repository: IScholarshipRepository,
  verification?: IScholarshipImportVerificationDecisionPort,
  canonical?: IScholarshipImportCanonicalResolutionDecisionPort,
) {
  const [verified, resolved] = await Promise.all([
    verification?.latestMany?.(ids),
    canonical?.listMany?.(ids),
  ]);
  const pending = new Map<
    string,
    { resolve: (row: ScholarshipDto | null) => void; reject: (error: unknown) => void }
  >();
  const cached = new Map<string, Promise<ScholarshipDto | null>>();
  const findDuplicate = (key: string): Promise<ScholarshipDto | null> => {
    if (!repository.findByDedupKeys) return repository.findByDedupKey(key);
    const prior = cached.get(key);
    if (prior) return prior;
    const result = new Promise<ScholarshipDto | null>((resolve, reject) => {
      pending.set(key, { resolve, reject });
      if (pending.size !== 1) return;
      queueMicrotask(async () => {
        const requests = new Map(pending);
        pending.clear();
        try {
          const rows = await repository.findByDedupKeys!([...requests.keys()]);
          const matches = new Map(rows.map((row) => [row.canonicalDedupKey, row]));
          for (const [requested, complete] of requests)
            complete.resolve(matches.get(requested) ?? null);
        } catch (error) {
          for (const complete of requests.values()) complete.reject(error);
        }
      });
    });
    cached.set(key, result);
    return result;
  };
  const verificationById = new Map(verified?.map((row) => [row.recordId, row]));
  const canonicalById = new Map<string, NonNullable<typeof resolved>>();
  for (const row of resolved ?? []) {
    const entries = canonicalById.get(row.recordId) ?? [];
    entries.push(row);
    canonicalById.set(row.recordId, entries);
  }
  return {
    latestVerification: (id: string) =>
      verified
        ? Promise.resolve(verificationById.get(id) ?? null)
        : (verification?.latest(id) ?? Promise.resolve(null)),
    canonicalDecisions: (id: string) =>
      resolved
        ? Promise.resolve(canonicalById.get(id) ?? [])
        : (canonical?.list(id) ?? Promise.resolve([])),
    findDuplicate,
  };
}
export type ScholarshipImportPageReads = Awaited<ReturnType<typeof scholarshipImportPageReads>>;
