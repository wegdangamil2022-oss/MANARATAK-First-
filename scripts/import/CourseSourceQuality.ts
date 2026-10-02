import { createHash } from 'node:crypto';
import type { ImportedCourseMasterRowContract } from '@manaratak/domain';
import { normalizeSourceLabel, sourceReviewHash } from '../../packages/application/src/import-foundation/services/CanonicalSourceReview';

export interface CourseSourceRow { datasetId: string; artifactHash: string; sourceRowNumber: number; row: ImportedCourseMasterRowContract }
const master1 = 'courses-master-1-2026-09-15'; const master2 = 'courses-master-2-2026-09-23';
export const reviewedCourseArtifactHashes = {
  [master1]: '8e92f89b4814ae40398d5b555b02a8c17eeb5db3ce247f316cf68987b99c8d88',
  [master2]: 'f5944476f63f13999216ebd5eb6dcfeb6bb067ce1ffb2166735bd973e5da321e',
};
const duplicatePairs = new Set([`${master1}#10632|${master2}#432`, `${master2}#2070|${master2}#2141`, `${master2}#2071|${master2}#2142`]);
export function courseSourceUrlKey(value: string): string {
  const url = new URL(value.trim());
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('COURSE_SOURCE_URL_INVALID');
  url.hash = '';
  return `${url.protocol}//${url.host.toLowerCase()}${url.pathname.replace(/\/$/, '')}${url.search}`;
}

/** Only the three evidence-bound URL overlaps are removed. Unknown collisions
 * stop projection. The raw payload and provenance of both editions are retained. */
export function projectReviewedCourseSources(input: readonly CourseSourceRow[]) {
  const byUrl = new Map<string, CourseSourceRow>(); const byName = new Map<string, CourseSourceRow>();
  const projected: CourseSourceRow[] = []; const decisions: Record<string, unknown>[] = [];
  const sourceKeys = new Set<string>();
  const reference = (item: CourseSourceRow) => `${item.datasetId}#${item.sourceRowNumber}`;
  const knownArtifact = (item: CourseSourceRow) => reviewedCourseArtifactHashes[item.datasetId as keyof typeof reviewedCourseArtifactHashes] === item.artifactHash;
  const evidence = (item: CourseSourceRow) => ({ sourceKey: reference(item), artifactHash: item.artifactHash, sourceHash: sourceReviewHash(item.row), raw: item.row });
  for (const item of input) {
    const sourceKey = reference(item);
    if (sourceKeys.has(sourceKey)) throw new Error('COURSE_SOURCE_DUPLICATE_ROW_ID');
    sourceKeys.add(sourceKey);
    const url = courseSourceUrlKey(item.row.directCourseUrl); const previous = byUrl.get(url);
    if (previous) {
      if (!knownArtifact(item) || !knownArtifact(previous) || !duplicatePairs.has(`${reference(previous)}|${sourceKey}`)) throw new Error(`COURSE_SOURCE_UNREVIEWED_URL_COLLISION:${sourceKey}`);
      decisions.push({ action: 'SKIP_REVIEWED_DUPLICATE_URL', url, kept: evidence(previous), excluded: evidence(item), changedFields: Object.keys(item.row).filter(field => item.row[field as keyof typeof item.row] !== previous.row[field as keyof typeof item.row]), evidenceReference: 'M10-14: exact artifact hashes and source row pair', canonicalCourseId: null });
      continue;
    }
    let row = { ...item.row };
    let name = `${normalizeSourceLabel(row.providerLabel)}|${normalizeSourceLabel(row.courseName)}`;
    const previousName = byName.get(name);
    if (previousName) {
      if (!(knownArtifact(item) && knownArtifact(previousName) && sourceKey === `${master2}#2129` && reference(previousName) === `${master2}#2112` && url === 'https://www.pok.polimi.it/course/view.php?id=204' && normalizeSourceLabel(row.languageRaw) === 'english')) throw new Error(`COURSE_SOURCE_UNREVIEWED_NAME_COLLISION:${sourceKey}`);
      row = { ...row, courseName: `${row.courseName} (English)` };
      name = `${normalizeSourceLabel(row.providerLabel)}|${normalizeSourceLabel(row.courseName)}`;
      if (byName.has(name)) throw new Error('COURSE_SOURCE_EDITION_NAME_COLLISION');
      decisions.push({ action: 'DISTINGUISH_ENGLISH_EDITION', original: evidence(item), otherEdition: evidence(previousName), projectedName: row.courseName, policy: 'KEEP_DISTINCT_URL_AND_LANGUAGE_EDITION; RAW_NAME_UNCHANGED', canonicalCourseId: null });
    }
    byUrl.set(url, item); byName.set(name, item); projected.push({ ...item, row });
  }
  return { inputRows: input.length, projected, decisions, distinctUrls: byUrl.size, decisionHash: sourceReviewHash(decisions), missingHistory: { state: 'MISSING_OLD_MASTER', approximateRows: 5000, policy: 'NO_FABRICATED_ROWS; NO_COMPLETE_HISTORY_CLAIM' }, databaseWrites: 0 as const, runtime: 'RUNTIME_UNTESTED' as const };
}

export interface CourseSourceLookup { publicId: string; labels: string[]; allowedDomains?: string[] }
export function buildCourseSourceRelationshipQueue(rows: readonly CourseSourceRow[], providers: readonly CourseSourceLookup[], languages: readonly CourseSourceLookup[], taxonomy: readonly CourseSourceLookup[]) {
  const index = (items: readonly CourseSourceLookup[]) => {
    const result = new Map<string, Set<string>>();
    for (const item of items) for (const label of item.labels) {
      const key = normalizeSourceLabel(label); if (!key) continue;
      const values = result.get(key) ?? new Set<string>(); values.add(item.publicId); result.set(key, values);
    }
    return result;
  };
  const providerIndex = index(providers); const languageIndex = index(languages); const taxonomyIndex = index(taxonomy);
  const providerById = new Map(providers.map(provider => [provider.publicId, provider]));
  const queue = new Map<string, { target: string; rawValue: string; sourceCandidatePublicIds: string[]; evidence: Array<{ sourceKey: string; sourceHash: string; artifactHash: string }>; policy: string; state: string; canonicalId: null }>();
  const add = (target: string, rawValue: string, candidates: string[], item: CourseSourceRow, policy: string) => {
    const key = `${target}|${rawValue}|${candidates.join(',')}|${policy}`;
    const record = queue.get(key) ?? { target, rawValue, sourceCandidatePublicIds: candidates, evidence: [], policy, state: candidates.length === 1 ? 'PROPOSED_SOURCE_CANDIDATE' : candidates.length > 1 ? 'AMBIGUOUS' : 'UNRESOLVED', canonicalId: null };
    record.evidence.push({ sourceKey: `${item.datasetId}#${item.sourceRowNumber}`, sourceHash: sourceReviewHash(item.row), artifactHash: item.artifactHash }); queue.set(key, record);
  };
  const identityKeys = new Map<string, string[]>();
  for (const item of rows) {
    const providerCandidates = [...(providerIndex.get(normalizeSourceLabel(item.row.providerLabel)) ?? [])].sort();
    const url = new URL(item.row.directCourseUrl);
    const scoped = providerCandidates.filter(id => providerById.get(id)?.allowedDomains?.some(domain => url.hostname === domain || url.hostname.endsWith(`.${domain}`)));
    add('PROVIDER', item.row.providerLabel, scoped, item, 'EXACT_ALIAS_AND_ALLOWED_DOMAIN; NO_NEW_PROVIDER_OR_COUNTRY_INFERENCE');
    const languageCandidates = [...(languageIndex.get(normalizeSourceLabel(item.row.languageRaw)) ?? [])].sort();
    add('LANGUAGE', item.row.languageRaw, languageCandidates, item, 'SOURCE_ALIAS_PROPOSAL_ONLY; LIVE_CANONICAL_LANGUAGE_REVIEW_REQUIRED');
    for (const term of item.row.shortCourseTopicsRaw.split(/\s*(?:•|\||;|\n)\s*/g).filter(Boolean)) add('TAXONOMY', term, [...(taxonomyIndex.get(normalizeSourceLabel(term)) ?? [])].sort(), item, 'EXACT_SOURCE_TERM_ONLY; NO_FUZZY_AUTO_LINK; EVERY_TERM_REQUIRES_REVIEW');
    // Stable URL fallback is a proposal, not a DB identity or a provider native key.
    const identity = createHash('sha256').update(`${scoped.length === 1 ? scoped[0] : normalizeSourceLabel(item.row.providerLabel)}|${courseSourceUrlKey(item.row.directCourseUrl)}|${normalizeSourceLabel(item.row.languageRaw)}`).digest('hex');
    const refs = identityKeys.get(identity) ?? []; refs.push(`${item.datasetId}#${item.sourceRowNumber}`); identityKeys.set(identity, refs);
  }
  return { policy: 'CANONICAL_UUID_AND_PROVIDER_NATIVE_KEY_REVALIDATION_REQUIRED; NO_AUTO_APPROVAL; NO_PROVIDER_COUNTRY_AS_STUDY_COUNTRY', rows: rows.length, identityVersion: 'M10_SOURCE_PROVIDER_URL_LANGUAGE_V1', identityCollisions: [...identityKeys].filter(([, refs]) => refs.length > 1).map(([identity, sourceKeys]) => ({ identity, sourceKeys })), queue: [...queue.values()], databaseWrites: 0 as const, runtime: 'RUNTIME_UNTESTED' as const, linkHealth: 'RUNTIME_UNTESTED' as const };
}
