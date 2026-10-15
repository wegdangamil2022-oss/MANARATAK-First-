import { createHash } from 'node:crypto';

export const universityTranslationSourceSelect = {
  id: true, publicId: true, status: true, displayName: true, canonicalName: true,
  officialWebsite: true, sourceUrl: true, officialSourceUrl: true, optionalFields: true,
  sourceRecords: {orderBy:{id:'asc'},select:{id:true,sourceHash:true,sourceUri:true,sourceLocale:true}},
} as const;

type Source = {
  id: string;
  publicId?: unknown;
  status?: unknown;
  displayName?: unknown;
  canonicalName?: unknown;
  officialWebsite?: unknown;
  sourceUrl?: unknown;
  officialSourceUrl?: unknown;
  optionalFields?: unknown;
  sourceRecords?: readonly { id: string; sourceHash?: unknown; sourceUri?: unknown; sourceLocale?: unknown }[];
};
type Translation = { locale: string; displayName?: string | null; description?: string | null; metadata?: unknown };

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)]));
  }
  return value ?? null;
}
function digest(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}

/** Shared by the owner reader and governed handover; independent of ORM field order. */
export function universityTranslationSourceDigest(owner: Source): string {
  return digest({
    id: owner.id, publicId: owner.publicId, status: owner.status,
    displayName: owner.displayName, canonicalName: owner.canonicalName,
    officialWebsite: owner.officialWebsite, sourceUrl: owner.sourceUrl,
    officialSourceUrl: owner.officialSourceUrl, optionalFields: owner.optionalFields,
    sourceRecords: [...(owner.sourceRecords ?? [])].sort((a, b) => a.id.localeCompare(b.id)).map(row => ({
      id: row.id, sourceHash: row.sourceHash, sourceUri: row.sourceUri, sourceLocale: row.sourceLocale,
    })),
  });
}
export function universityTranslationValueDigest(translation: Translation): string {
  return digest({locale: translation.locale, displayName: translation.displayName, description: translation.description});
}

/** Legacy rows without publication evidence fail closed; no inferred/backfilled approval. */
export function universityTranslationSourceStatus(owner: Source, translation: Translation): 'CURRENT' | 'STALE' | 'UNVERIFIED' {
  const metadata = translation.metadata as Record<string, unknown> | null | undefined;
  const evidence = metadata?.publishedTranslationEvidence as Record<string, unknown> | undefined;
  if (!translation.displayName?.trim() || !translation.description?.trim() || !evidence || typeof metadata?.publishedTranslationApprovalId !== 'string' || !metadata.publishedTranslationApprovalId) return 'UNVERIFIED';
  if (evidence.ownerSourceDigest !== universityTranslationSourceDigest(owner) ||
      evidence.valueDigest !== universityTranslationValueDigest(translation)) return 'STALE';
  return 'CURRENT';
}
