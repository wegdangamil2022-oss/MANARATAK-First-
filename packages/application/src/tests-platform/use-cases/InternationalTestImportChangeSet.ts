import { createHash } from 'node:crypto';
import { z } from 'zod';
import { InternationalTestCategory } from '@manaratak/domain';
import { InternationalTestMarkdownParser } from '../utils/InternationalTestMarkdownParser';

const digest = z.string().regex(/^[a-f0-9]{64}$/);
const coreSchema = z.object({
  publicId: z.string().trim().min(1).max(120), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(180),
  canonicalName: z.string().trim().min(1).max(300), displayName: z.string().trim().min(1).max(300),
  testCategory: z.nativeEnum(InternationalTestCategory), providerId: z.string().uuid(), familyId: z.string().uuid().optional(),
  localizedNameAr: z.string().trim().min(1).max(300).optional(), localizedNameEn: z.string().trim().min(1).max(300).optional(),
  abbreviation: z.string().trim().min(1).max(120).optional(),
}).strict();
export const internationalTestImportEntrySchema = z.object({
  sourceKey: z.string().regex(/^[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+\.md$/).max(300),
  sourceClassification: z.enum(['NEW_TEST', 'REPLACE_EXISTING', 'REVIEW_REQUIRED']),
  resolution: z.enum(['APPROVE_CREATE', 'APPROVE_UPDATE']),
  reviewReason: z.string().trim().min(1).max(2000), evidenceReference: z.string().trim().min(1).max(500),
  targetId: z.string().uuid(), core: coreSchema,
  sourceCycle: z.string().regex(/^\d{4}(?:-\d{4})?$/), sourceUri: z.string().url().max(2048).optional(),
  sourceHash: digest, rawContent: z.string().min(1).max(2_000_000),
}).strict();
const planBodySchema = z.object({ schemaVersion: z.literal(1), changeSetId: z.string().uuid(), sourceManifestHash: digest, entries: z.array(internationalTestImportEntrySchema).min(1).max(5), databaseWrites: z.literal(0) }).strict();
export const internationalTestImportPlanSchema = planBodySchema.extend({ planHash: digest });
export type InternationalTestImportEntry = z.infer<typeof internationalTestImportEntrySchema>;
export type InternationalTestImportPlan = z.infer<typeof internationalTestImportPlanSchema>;
export interface InternationalTestImportPreview {
  changeSetId: string; planHash: string; previewHash: string; state: 'READY' | 'BLOCKED' | 'APPLIED' | 'ROLLED_BACK';
  changes: Array<{ targetId: string; operation: 'CREATE' | 'UPDATE'; sourceHash: string; currentHash: string | null; blockCount: number }>;
  issues: string[]; databaseWrites: 0;
}
export interface InternationalTestImportApproval {
  actorId: string; planHash: string; previewHash: string;
  approval: 'APPROVE_WRITE' | 'APPROVE_ROLLBACK'; recoveryGateToken: string; recoveryEvidenceReference: string;
}
export interface InternationalTestImportResult {
  changeSetId: string; planHash: string; state: 'APPLIED' | 'ROLLED_BACK'; created: number; updated: number;
  replayed: boolean; databaseWrites: number;
}
export interface InternationalTestImportChangeGateway {
  preview(plan: InternationalTestImportPlan, actorId: string): Promise<InternationalTestImportPreview>;
  commit(plan: InternationalTestImportPlan, approval: InternationalTestImportApproval): Promise<InternationalTestImportResult>;
  rollback(plan: InternationalTestImportPlan, approval: InternationalTestImportApproval): Promise<InternationalTestImportResult>;
  reconcile(plan: InternationalTestImportPlan, actorId: string): Promise<{ state: 'PASS' | 'FAIL'; issues: string[]; databaseWrites: 0 }>;
}

/** Canonical JSON digest; dates become ISO strings, object key order is immaterial. */
export function internationalTestImportHash(value: unknown): string {
  const plain: unknown = JSON.parse(JSON.stringify(value));
  const ordered = (item: unknown): unknown => Array.isArray(item) ? item.map(ordered)
    : item !== null && typeof item === 'object' ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, child]) => [key, ordered(child)])) : item;
  return createHash('sha256').update(JSON.stringify(ordered(plain))).digest('hex');
}
export function internationalTestSourceHash(rawContent: string): string { return createHash('sha256').update(rawContent, 'utf8').digest('hex'); }
export function prepareInternationalTestImport(input: unknown): InternationalTestImportPlan {
  const body = planBodySchema.parse(input);
  const sources = new Set<string>(); const targets = new Set<string>(); const publicIds = new Set<string>(); const slugs = new Set<string>(); const canonicalKeys = new Set<string>();
  for (const entry of body.entries) {
    const canonicalKey = `${entry.core.canonicalName.toLowerCase()}|${entry.core.providerId}`;
    if (sources.has(entry.sourceKey) || targets.has(entry.targetId) || publicIds.has(entry.core.publicId) || slugs.has(entry.core.slug) || canonicalKeys.has(canonicalKey)) throw new Error('TEST_IMPORT_DUPLICATE_PLAN_IDENTITY');
    sources.add(entry.sourceKey); targets.add(entry.targetId); publicIds.add(entry.core.publicId); slugs.add(entry.core.slug);
    canonicalKeys.add(canonicalKey);
    if (internationalTestSourceHash(entry.rawContent) !== entry.sourceHash) throw new Error('TEST_IMPORT_SOURCE_HASH_MISMATCH');
    if (entry.sourceClassification === 'NEW_TEST' && entry.resolution !== 'APPROVE_CREATE') throw new Error('TEST_IMPORT_CLASSIFICATION_RESOLUTION_MISMATCH');
    if (entry.sourceClassification === 'REPLACE_EXISTING' && entry.resolution !== 'APPROVE_UPDATE') throw new Error('TEST_IMPORT_CLASSIFICATION_RESOLUTION_MISMATCH');
    const blocks = InternationalTestMarkdownParser.parse(entry.rawContent);
    if (!blocks.length || blocks.some((block, index) => block.sectionNumber !== index + 1)) throw new Error('TEST_IMPORT_SOURCE_SECTIONS_INVALID');
  }
  return { ...body, planHash: internationalTestImportHash(body) };
}
export function validateInternationalTestImportPlan(input: unknown): InternationalTestImportPlan {
  const { planHash, ...body } = internationalTestImportPlanSchema.parse(input);
  const validated = prepareInternationalTestImport(body);
  if (validated.planHash !== planHash) throw new Error('TEST_IMPORT_PLAN_HASH_MISMATCH');
  return validated;
}
export class InternationalTestImportChangeExecutor {
  constructor(private readonly gateway: InternationalTestImportChangeGateway) {}
  preview(input: unknown, actorId: string): Promise<InternationalTestImportPreview> {
    if (!actorId.trim()) throw new Error('TEST_IMPORT_ACTOR_REQUIRED');
    return this.gateway.preview(validateInternationalTestImportPlan(input), actorId);
  }
  commit(input: unknown, approval: InternationalTestImportApproval): Promise<InternationalTestImportResult> {
    return this.gateway.commit(this.approve(input, approval, 'APPROVE_WRITE'), approval);
  }
  rollback(input: unknown, approval: InternationalTestImportApproval): Promise<InternationalTestImportResult> {
    return this.gateway.rollback(this.approve(input, approval, 'APPROVE_ROLLBACK'), approval);
  }
  reconcile(input: unknown, actorId: string) {
    if (!actorId.trim()) throw new Error('TEST_IMPORT_ACTOR_REQUIRED');
    return this.gateway.reconcile(validateInternationalTestImportPlan(input), actorId);
  }
  private approve(input: unknown, approval: InternationalTestImportApproval, required: InternationalTestImportApproval['approval']): InternationalTestImportPlan {
    const plan = validateInternationalTestImportPlan(input);
    if (approval.approval !== required || !approval.actorId?.trim() || approval.planHash !== plan.planHash || !/^[a-f0-9]{64}$/.test(approval.previewHash)
      || !approval.recoveryGateToken?.trim() || !approval.recoveryEvidenceReference?.trim()) throw new Error('TEST_IMPORT_EXACT_APPROVAL_AND_RECOVERY_REQUIRED');
    return plan;
  }
}
