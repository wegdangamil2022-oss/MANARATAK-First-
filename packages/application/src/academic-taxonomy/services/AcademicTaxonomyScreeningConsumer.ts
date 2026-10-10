import { z } from 'zod';
import { AcademicMappingStrength, AcademicStandardType, AcademicTaxonomyNodeType, AcademicTaxonomyStatus,
  IImportHandoffConsumer, UniversalImportHandoff } from '@manaratak/domain';

const id = z.string().trim().min(1).max(128);
const standard = z.nativeEnum(AcademicStandardType);
const metadata = z.record(z.string(), z.unknown()).optional();
const schemas = {
  NODE: z.object({ nodeType: z.nativeEnum(AcademicTaxonomyNodeType), canonicalCode: id,
    canonicalName: z.string().trim().min(1).max(500), standardType: standard.default(AcademicStandardType.CUSTOM_NATIONAL),
    status: z.enum([AcademicTaxonomyStatus.DRAFT, AcademicTaxonomyStatus.READY_TO_REVIEW]).optional(),
    description: z.string().max(4000).optional(), standardCode: z.string().max(128).optional(),
    localizedNames: z.record(z.string(), z.string().max(500)).optional(), metadata }).strict(),
  EDGE: z.object({ parentNodeId: id, childNodeId: id, isPrimary: z.boolean().optional() }).strict(),
  ALIAS: z.object({ nodeId: id, alias: z.string().trim().min(1).max(500), locale: z.string().max(35).optional() }).strict(),
  MAPPING: z.object({ sourceNodeId: id, targetNodeId: id, sourceStandard: standard, targetStandard: standard,
    strength: z.nativeEnum(AcademicMappingStrength), confidence: z.number().min(0).max(1).optional(), notes: z.string().max(2000).optional() }).strict(),
};
export type AcademicImportRecord = { recordType: keyof typeof schemas; payload: Record<string, unknown> };
const forbidden = new Set(['__proto__', 'prototype', 'constructor', 'evidenceSnippet', 'confidenceScore', 'validationResults', 'sourceText',
  'rawPayload', 'tuition', 'salary', 'careerOutcomes', 'universityId', 'countryRanking', 'featuredMajor']);
function inspect(value: unknown, depth = 0): void {
  if (depth > 8) throw new Error('TAXONOMY_IMPORT_METADATA_DEPTH');
  if (!value || typeof value !== 'object') return;
  for (const [key, item] of Object.entries(value)) {
    if (forbidden.has(key) || key.startsWith('_phase6')) throw new Error('TAXONOMY_IMPORT_OWNER_FIELD_FORBIDDEN');
    inspect(item, depth + 1);
  }
}
export function parseAcademicImportRecord(raw: unknown): AcademicImportRecord {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || Buffer.byteLength(JSON.stringify(raw)) > 64_000)
    throw new Error('TAXONOMY_IMPORT_RECORD_INVALID');
  inspect(raw);
  const input = raw as Record<string, unknown>;
  const recordType = (input.recordType ?? 'NODE') as keyof typeof schemas;
  if (!Object.hasOwn(schemas, recordType)) throw new Error('TAXONOMY_IMPORT_RECORD_TYPE_INVALID');
  const payload = input.payload ?? Object.fromEntries(Object.entries(input).filter(([key]) => key !== 'recordType'));
  if (input.payload && Object.keys(input).some(key => !['recordType', 'payload'].includes(key))) throw new Error('TAXONOMY_IMPORT_RECORD_INVALID');
  return { recordType, payload: schemas[recordType].parse(payload) };
}
/** Pure P8 screening. P6 can invoke this, but it cannot write the canonical catalog. */
export class AcademicTaxonomyScreeningConsumer implements IImportHandoffConsumer {
  readonly effectMode = 'SCREENING_ONLY' as const;
  async accept(handoff: UniversalImportHandoff) {
    if (!['ACADEMIC_TAXONOMY', 'TAXONOMY'].includes(handoff.ownerDomain.trim().toUpperCase())) throw new Error('TAXONOMY_IMPORT_OWNER_MISMATCH');
    const upstreamValid = handoff.validation.state !== 'INVALID' && !handoff.validation.issues.some(issue => issue.severity === 'ERROR');
    try {
      const record = parseAcademicImportRecord(handoff.normalizedPayload);
      return { schemaVersion: 1, owner: 'ACADEMIC_TAXONOMY', state: upstreamValid ? 'NEEDS_OWNER_REVIEW' : 'INVALID',
        dryRun: handoff.execution.dryRun, record, source: { sourceId: handoff.artifact.sourceId, contentHash: handoff.provenance.contentHash ?? null },
        issues: upstreamValid ? [] : ['UPSTREAM_VALIDATION_FAILED'] };
    } catch {
      return { schemaVersion: 1, owner: 'ACADEMIC_TAXONOMY', state: 'INVALID', dryRun: handoff.execution.dryRun, record: null, issues: ['OWNER_PAYLOAD_INVALID'] };
    }
  }
}
