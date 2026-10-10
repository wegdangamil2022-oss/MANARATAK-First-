
/** P7 standards provenance. A parsed code is NOT an authoritative code without
 * evidence that it belongs to a reviewed versioned authority snapshot.
 * Persistent approval and distribution are separate features; no fake snapshot.
 */
export const REQUIRED_REFERENCE_STANDARD_FAMILIES = [
  'ISO_3166', 'ISO_4217', 'ISO_639', 'UN_M49', 'IANA_TZ', 'CLDR',
] as const;

export type ReferenceStandardFamily = typeof REQUIRED_REFERENCE_STANDARD_FAMILIES[number];

export interface ReferenceStandardSnapshot {
  snapshotId: string;
  standardFamily: ReferenceStandardFamily;
  sourceAuthority: string;
  sourceVersion: string;
  sourceArtifactHash: string;
  sourceUrl: string;
  retrievedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  status: 'DRAFT' | 'REVIEWED' | 'SUPERSEDED' | 'REJECTED';
  supersedesSnapshotId?: string | null;
  notes?: string | null;
}

/** Validate field completeness only. Does NOT verify the content of the source. */
export function validateStandardSnapshotEvidence(input: ReferenceStandardSnapshot): string[] {
  const issues: string[] = [];
  if (!REQUIRED_REFERENCE_STANDARD_FAMILIES.includes(input.standardFamily))
    issues.push('UNKNOWN_STANDARD_FAMILY');
  if (!input.snapshotId.trim() || !input.sourceAuthority.trim() || !input.sourceVersion.trim() || !input.sourceUrl.trim())
    issues.push('MISSING_STANDARD_PROVENANCE');
  if (!/^https:\/\//i.test(input.sourceUrl)) issues.push('STANDARD_SOURCE_HTTPS_REQUIRED');
  if (!/^[a-f0-9]{64}$/i.test(input.sourceArtifactHash)) issues.push('STANDARD_SHA256_REQUIRED');
  if (!Number.isFinite(Date.parse(input.retrievedAt))) issues.push('STANDARD_RETRIEVAL_DATE_INVALID');
  if (input.status === 'REVIEWED' && (
    !input.reviewedBy?.trim() || !input.reviewedAt || !Number.isFinite(Date.parse(input.reviewedAt))
  )) issues.push('STANDARD_REVIEW_EVIDENCE_REQUIRED');
  if (input.status === 'REVIEWED' && input.reviewedAt &&
      Number.isFinite(Date.parse(input.reviewedAt)) && Number.isFinite(Date.parse(input.retrievedAt)) &&
      Date.parse(input.reviewedAt) < Date.parse(input.retrievedAt))
    issues.push('STANDARD_REVIEW_BEFORE_RETRIEVAL');
  if (input.supersedesSnapshotId === input.snapshotId) issues.push('STANDARD_SELF_SUPERSESSION');
  return issues;
}

export function referenceStandardsReadiness(snapshots: readonly ReferenceStandardSnapshot[]) {
  return REQUIRED_REFERENCE_STANDARD_FAMILIES.map(family => {
    const valid = snapshots.filter(s => s.standardFamily === family && s.status === 'REVIEWED' &&
      validateStandardSnapshotEvidence(s).length === 0);
    const candidateVersions = valid.map(s => s.sourceVersion);
    return {
      standardFamily: family,
      readiness: valid.length === 1 ? 'EVIDENCE_RECORDED' as const : valid.length === 0 ? 'MISSING_REVIEWED_SNAPSHOT' as const : 'AMBIGUOUS_REVIEWED_SNAPSHOTS' as const,
      sourceVersion: valid.length === 1 ? valid[0].sourceVersion : null,
      candidateVersions,
    };
  });
}

/** BCP47 LocaleTag is NEVER stored as ReferenceLanguage.isoCode (ISO639). */
export interface ReferenceLocaleTag {
  tag: string; // canonical casing: e.g. zh-Hans-CN, en-US
  languageCode: string; // ISO639 language subtag
  scriptCode?: string; // ISO15924 script subtag
  regionCode?: string; // ISO3166-1 alpha2 or UN M49 numeric region subtag
}

export function parseReferenceLocaleTag(tag: string): ReferenceLocaleTag {
  if (!tag || tag.length > 35 || tag !== tag.trim()) throw new Error('INVALID_BCP47_LOCALE_TAG');
  let canonical: string;
  try {
    const candidates = Intl.getCanonicalLocales(tag);
    if (candidates.length !== 1) throw new Error('INVALID_BCP47_LOCALE_TAG');
    canonical = candidates[0];
  } catch { throw new Error('INVALID_BCP47_LOCALE_TAG'); }
  const parts = canonical.split('-');
  const languageCode = parts[0].toLowerCase();
  // Full authoritative ISO membership must be proven by an approved snapshot.
  const scriptCode = parts.find(p => /^[A-Z][a-z]{3}$/.test(p));
  const regionCode = parts.find(p => /^[A-Z]{2}$/.test(p) || /^\d{3}$/.test(p));
  return { tag: canonical, languageCode, scriptCode, regionCode };
}
