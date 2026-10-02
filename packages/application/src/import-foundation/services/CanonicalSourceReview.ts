import { createHash } from 'node:crypto';
import { z } from 'zod';

const kind = z.enum(['COUNTRY', 'CITY', 'UNIVERSITY', 'ACADEMIC_PROGRAM', 'DEGREE_LEVEL', 'INTERNATIONAL_TEST', 'PROVIDER', 'LANGUAGE', 'TAXONOMY']);
const digest = z.string().regex(/^[a-f0-9]{64}$/);
export const canonicalSourceRowSchema = z.object({ sourceKey: z.string().min(1).max(500), sourceHash: digest, rawLabel: z.string().max(20_000), targetKind: kind, standardCode: z.string().max(120).optional(), countryIso2: z.string().regex(/^[A-Z]{2}$/).optional(), ownerId: z.string().uuid().optional() }).strict();
export const canonicalSourceTargetSchema = z.object({ id: z.string().uuid(), kind, publicId: z.string().optional(), standardCode: z.string().optional(), name: z.string().min(1), aliases: z.array(z.string()), active: z.boolean(), countryIso2: z.string().regex(/^[A-Z]{2}$/).optional(), ownerId: z.string().uuid().optional() }).strict();
export const canonicalSourceDecisionSchema = z.object({ sourceKey: z.string(), sourceHash: digest, snapshotHash: digest, action: z.enum(['SELECT_EXISTING', 'HOLD', 'EXCLUDE']), targetId: z.string().uuid().optional(), actorId: z.string().uuid(), reason: z.string().trim().min(1).max(2000), evidenceReference: z.string().trim().min(1).max(500) }).strict();
export type CanonicalSourceRow = z.infer<typeof canonicalSourceRowSchema>;
export type CanonicalSourceTarget = z.infer<typeof canonicalSourceTargetSchema>;
export type CanonicalSourceDecision = z.infer<typeof canonicalSourceDecisionSchema>;
export function sourceReviewHash(value: unknown): string {
  const ordered = (item: unknown): unknown => Array.isArray(item) ? item.map(ordered) : item && typeof item === 'object'
    ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, child]) => [key, ordered(child)])) : item;
  return createHash('sha256').update(JSON.stringify(ordered(JSON.parse(JSON.stringify(value))))).digest('hex');
}
export const normalizeSourceLabel = (value: string): string => value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();

/** No DB writes. Canonical UUIDs must come from a reviewed snapshot; source
 * public IDs are candidates only. The final owner writer revalidates live state. */
export class CanonicalSourceReview {
  private readonly targets: CanonicalSourceTarget[];
  public readonly snapshotHash: string;
  constructor(input: unknown) {
    this.targets = z.array(canonicalSourceTargetSchema).parse(input).sort((a, b) => a.id.localeCompare(b.id));
    if (new Set(this.targets.map(target => target.id)).size !== this.targets.length) throw new Error('SOURCE_REVIEW_DUPLICATE_CANONICAL_ID');
    this.snapshotHash = sourceReviewHash(this.targets);
  }
  candidates(input: unknown) {
    const row = canonicalSourceRowSchema.parse(input);
    const label = normalizeSourceLabel(row.rawLabel);
    const targets = this.targets.filter(target => this.inScope(row, target) && (row.standardCode
      ? target.standardCode === row.standardCode
      : [target.name, target.publicId ?? '', ...target.aliases].some(value => label !== '' && normalizeSourceLabel(value) === label)));
    return { state: targets.length === 0 ? 'UNRESOLVED' as const : targets.length > 1 ? 'AMBIGUOUS' as const : 'PROPOSED' as const, targets, snapshotHash: this.snapshotHash, databaseWrites: 0 as const };
  }
  decide(input: unknown, review: unknown) {
    const row = canonicalSourceRowSchema.parse(input);
    const decision = canonicalSourceDecisionSchema.parse(review);
    if (decision.sourceKey !== row.sourceKey || decision.sourceHash !== row.sourceHash || decision.snapshotHash !== this.snapshotHash) throw new Error('SOURCE_REVIEW_STALE_DECISION');
    if (decision.action !== 'SELECT_EXISTING' && decision.targetId) throw new Error('SOURCE_REVIEW_NON_LINK_DECISION_HAS_TARGET');
    const target = decision.action === 'SELECT_EXISTING' ? this.targets.find(item => item.id === decision.targetId) : undefined;
    if (decision.action === 'SELECT_EXISTING' && (!target || !this.inScope(row, target))) throw new Error('SOURCE_REVIEW_TARGET_MISSING_INACTIVE_OR_FOREIGN');
    if (target?.kind === 'UNIVERSITY' && !/^INS-[A-Z0-9]+(?:-[A-Z0-9]+)+$/.test(target.publicId ?? '')) throw new Error('SOURCE_REVIEW_UNIVERSITY_PUBLIC_ID_REQUIRED');
    return { ...decision, targetId: target?.id ?? null, targetPublicId: target?.publicId ?? null, targetStandardCode: target?.standardCode ?? null, targetOwnerId: target?.ownerId ?? null, state: decision.action === 'SELECT_EXISTING' ? 'REVIEWED_SOURCE_MAPPING' : decision.action, rawLabel: row.rawLabel, targetKind: row.targetKind, sourceDecisionHash: sourceReviewHash({ row, decision }), databaseWrites: 0 as const, runtime: 'RUNTIME_UNTESTED' as const };
  }
  private inScope(row: CanonicalSourceRow, target: CanonicalSourceTarget): boolean {
    if (!target.active || target.kind !== row.targetKind) return false;
    if (row.targetKind === 'CITY' && (!row.countryIso2 || target.countryIso2 !== row.countryIso2)) return false;
    if (row.countryIso2 && row.countryIso2 !== target.countryIso2) return false;
    if (row.targetKind === 'ACADEMIC_PROGRAM' && (!row.ownerId || target.ownerId !== row.ownerId)) return false;
    if (row.ownerId && target.ownerId !== row.ownerId) return false;
    return true;
  }
}
