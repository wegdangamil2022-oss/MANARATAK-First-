import { createHash } from 'node:crypto';
import { ParsedImportRow, ImportParseError, ImportTargetDomain } from '@manaratak/domain';
import type { IImportGovernanceGateway, ImportMappingDefinition, ImportMappingProfileDto } from '../contracts/IImportGovernanceGateway';
import type { AtomicDomainMutationCoordinator, AtomicMutationRequestContext } from '../../event-foundation/use-cases/AtomicDomainMutationCoordinator';

const reserved = (key: string) => key.startsWith('_') || ['__proto__', 'constructor', 'prototype'].includes(key);
export class ImportGovernanceUseCases {
  constructor(private readonly gateway: IImportGovernanceGateway, private readonly atomic: AtomicDomainMutationCoordinator,
    private readonly reviewerAllowed: (identityId: string, ownerDomain: string) => Promise<boolean>) {}
  profiles(sourceId: string, domain: string) { return this.gateway.listProfiles(sourceId, domain); }
  reviews(input: { assigneeId?: string; batchId?: string; page: number }) { return this.gateway.listReviews(input); }
  observation(sourceId: string) { return this.gateway.getObservation(sourceId); }
  counters(batchId: string) { return this.gateway.counters(batchId); }
  private mutate<T>(action: string, id: string, reason: string, context: AtomicMutationRequestContext,
    work: (gateway: IImportGovernanceGateway) => Promise<T>) {
    if (!context.actorId?.trim() || !reason.trim() || reason.length > 1000) throw new Error('IMPORT_GOVERNANCE_REASON_REQUIRED');
    return this.atomic.execute({ domain: 'IMPORT', aggregateType: 'ImportGovernance', aggregateId: id, action,
      context, auditMetadata: { reason } }, tx => work(this.gateway.withTransaction(tx)));
  }
  static validateMapping(definition: ImportMappingDefinition) {
    if (!definition || Object.keys(definition).join() !== 'fields' || !Array.isArray(definition.fields) ||
        !definition.fields.length || definition.fields.length > 100) throw new Error('IMPORT_MAPPING_INVALID');
    const targets = new Set<string>(); const aliases = new Set<string>();
    for (const field of definition.fields) {
      if (!field || Object.keys(field).sort().join() !== 'aliases,required,target,type' ||
          typeof field.target !== 'string' || !/^[a-zA-Z][a-zA-Z0-9_]{0,119}$/.test(field.target) || reserved(field.target) ||
          targets.has(field.target) || !['string','number','boolean'].includes(field.type) || typeof field.required !== 'boolean' ||
          !Array.isArray(field.aliases) || !field.aliases.length || field.aliases.length > 20) throw new Error('IMPORT_MAPPING_INVALID');
      targets.add(field.target);
      for (const alias of field.aliases) {
        if (typeof alias !== 'string' || !alias.trim() || alias !== alias.trim() || alias.length > 240 || reserved(alias) || aliases.has(alias))
          throw new Error('IMPORT_MAPPING_ALIAS_AMBIGUOUS');
        aliases.add(alias);
      }
    }
  }
  saveProfile(input: { sourceId: string; ownerDomain: string; sourceRevision: string; expectedVersion: number;
    definition: ImportMappingDefinition; reason: string }, context: AtomicMutationRequestContext) {
    ImportGovernanceUseCases.validateMapping(input.definition);
    if (!Object.values(ImportTargetDomain).includes(input.ownerDomain as ImportTargetDomain) ||
        !Number.isSafeInteger(input.expectedVersion) || input.expectedVersion < 0) throw new Error('IMPORT_MAPPING_INVALID');
    const definitionHash = createHash('sha256').update(JSON.stringify(input.definition)).digest('hex');
    return this.mutate('IMPORT_MAPPING_PROFILE_CREATED', input.sourceId, input.reason, context,
      gateway => gateway.createProfile({ ...input, definitionHash, actorId: context.actorId }));
  }
  static mapRow(row: ParsedImportRow, profile: ImportMappingProfileDto): ParsedImportRow | ImportParseError {
    const normalized: Record<string, unknown> = Object.create(null);
    for (const field of profile.definition.fields) {
      const present = field.aliases.filter(key => Object.hasOwn(row.raw, key) && row.raw[key] !== null && row.raw[key] !== '');
      if (present.length > 1) return new ImportParseError({ code: 'IMPORT_MAPPING_ALIAS_AMBIGUOUS',
        message: 'Multiple aliases contain values.', sourceRowNumber: row.sourceRowNumber, recordOffset: row.recordOffset, chunkIndex: row.chunkIndex, recoverable: true });
      const value = present.length ? row.raw[present[0]] : undefined;
      if (value === undefined) {
        if (field.required) return new ImportParseError({ code: 'IMPORT_MAPPING_REQUIRED_FIELD',
          message: 'A required mapping field is absent.', sourceRowNumber: row.sourceRowNumber, recordOffset: row.recordOffset, chunkIndex: row.chunkIndex, recoverable: true });
        continue;
      }
      let result: unknown = value;
      if (field.type === 'number' && typeof value === 'string' && /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value.trim())) result = Number(value);
      if (field.type === 'boolean' && typeof value === 'string' && /^(true|false)$/i.test(value.trim())) result = value.trim().toLowerCase() === 'true';
      if (typeof result !== field.type || (typeof result === 'number' && !Number.isFinite(result)))
        return new ImportParseError({ code: 'IMPORT_MAPPING_TYPE_INVALID', message: 'Mapping field type is invalid.',
          sourceRowNumber: row.sourceRowNumber, recordOffset: row.recordOffset, chunkIndex: row.chunkIndex, recoverable: true });
      normalized[field.target] = result;
    }
    return new ParsedImportRow({ ...row, normalized, metadata: { ...row.metadata, mappingProfileId: profile.id, mappingProfileHash: profile.definitionHash } });
  }
  async pinnedProfile(id: string, sourceId: string, domain: string, sourceRevision?: string) {
    const profile = await this.gateway.getProfile(id);
    if (!profile || profile.sourceId !== sourceId || profile.ownerDomain !== domain ||
        (sourceRevision && profile.sourceRevision.toISOString() !== sourceRevision)) throw new Error('IMPORT_MAPPING_PROFILE_CONFLICT');
    ImportGovernanceUseCases.validateMapping(profile.definition);
    return profile;
  }
  async *mapRows(rows: AsyncIterable<ParsedImportRow | ImportParseError>, profile: ImportMappingProfileDto) {
    for await (const row of rows) yield row instanceof ParsedImportRow ? ImportGovernanceUseCases.mapRow(row, profile) : row;
  }
  preview(profile: ImportMappingProfileDto, rows: Record<string, unknown>[]) {
    if (rows.length > 20 || Buffer.byteLength(JSON.stringify(rows)) > 100_000) throw new Error('IMPORT_MAPPING_PREVIEW_LIMIT');
    return rows.map((raw, i) => {
      const mapped = ImportGovernanceUseCases.mapRow(new ParsedImportRow({ raw, sourceRowNumber: i + 1 }), profile);
      return mapped instanceof ImportParseError ? { sourceRowNumber: i + 1, error: mapped.code } :
        { sourceRowNumber: i + 1, normalized: mapped.normalized, unmappedFields: Object.keys(raw).filter(key =>
          !profile.definition.fields.some(field => field.aliases.includes(key))) };
    });
  }
  async assign(input: { recordId: string; assigneeId: string; dueAt: string; expectedVersion: number; reason: string }, context: AtomicMutationRequestContext) {
    const due = Date.parse(input.dueAt);
    if (!Number.isFinite(due) || due <= Date.now() || due > Date.now() + 90 * 86400_000) throw new Error('IMPORT_REVIEW_DUE_INVALID');
    if (!await this.reviewerAllowed(input.assigneeId, await this.gateway.reviewDomain(input.recordId))) throw new Error('IMPORT_REVIEWER_AUTHORITY_REQUIRED');
    return this.mutate('IMPORT_REVIEW_ASSIGNED', input.recordId, input.reason, context,
      gateway => gateway.assign({ ...input, actorId: context.actorId }));
  }
  async claim(input: { recordId: string; expectedVersion: number; reason: string }, context: AtomicMutationRequestContext) {
    if (!await this.reviewerAllowed(context.actorId, await this.gateway.reviewDomain(input.recordId))) throw new Error('IMPORT_REVIEWER_AUTHORITY_REQUIRED');
    return this.mutate('IMPORT_REVIEW_CLAIMED', input.recordId, input.reason, context,
      gateway => gateway.claim({ ...input, actorId: context.actorId }));
  }
  release(input: { recordId: string; expectedVersion: number; reason: string }, context: AtomicMutationRequestContext) {
    return this.mutate('IMPORT_REVIEW_RELEASED', input.recordId, input.reason, context,
      gateway => gateway.release({ ...input, actorId: context.actorId }));
  }
  reconcile(input: { recordId: string; expectedUpdatedAt: string; reason: string }, context: AtomicMutationRequestContext) {
    return this.mutate('IMPORT_SCREENING_RECEIPT_RECONCILED', input.recordId, input.reason, context,
      gateway => gateway.reconcile({ ...input, actorId: context.actorId }));
  }
  decideDrift(input: { sourceId: string; expectedUpdatedAt: string; decision: 'ACCEPT' | 'REJECT'; reason: string }, context: AtomicMutationRequestContext) {
    return this.mutate('IMPORT_SOURCE_DRIFT_DECIDED', input.sourceId, input.reason, context,
      gateway => gateway.decideDrift({ ...input, actorId: context.actorId }));
  }
  fallback(input: { sourceId: string; fallbackSourceId: string | null; sourceRevision: string; fallbackSourceRevision?: string; reason: string }, context: AtomicMutationRequestContext) {
    if (input.sourceId === input.fallbackSourceId) throw new Error('IMPORT_FALLBACK_INVALID');
    return this.mutate('IMPORT_SOURCE_FALLBACK_CHANGED', input.sourceId, input.reason, context,
      gateway => gateway.setFallback({ ...input, actorId: context.actorId }));
  }
  recover(input: { batchId: string; expectedUpdatedAt: string; decision: 'QUEUE' | 'REJECT'; reason: string }, context: AtomicMutationRequestContext) {
    return this.mutate('IMPORT_LEGACY_BATCH_RECOVERED', input.batchId, input.reason, context, gateway => gateway.recoverLegacy(input));
  }
  retention(input: { batchId: string; expectedUpdatedAt: string; days: number; reason: string }, context: AtomicMutationRequestContext) {
    if (!Number.isSafeInteger(input.days) || input.days < 30 || input.days > 3650) throw new Error('IMPORT_RETENTION_POLICY_INVALID');
    return this.mutate('IMPORT_RETENTION_ASSIGNED', input.batchId, input.reason, context, gateway => gateway.assignRetention(input));
  }
}
