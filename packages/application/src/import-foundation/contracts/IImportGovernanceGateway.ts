import type { AtomicPersistenceContext, UniversalImportHandoff } from '@manaratak/domain';
export interface ImportMappingField { target: string; aliases: string[]; type: 'string' | 'number' | 'boolean'; required: boolean; }
export interface ImportMappingDefinition { fields: ImportMappingField[]; }
export interface ImportMappingProfileDto { id: string; sourceId: string; ownerDomain: string; version: number;
  sourceRevision: Date; definition: ImportMappingDefinition; definitionHash: string; }
export interface IImportScreeningReceiptStore {
  find(handoff: UniversalImportHandoff): Promise<{ result: unknown } | null>;
  accept(handoff: UniversalImportHandoff, screen: () => Promise<unknown>): Promise<unknown>;
}
export interface IImportGovernanceGateway {
  withTransaction(context: AtomicPersistenceContext): IImportGovernanceGateway;
  listProfiles(sourceId: string, ownerDomain: string): Promise<ImportMappingProfileDto[]>;
  getProfile(id: string): Promise<ImportMappingProfileDto | null>;
  createProfile(input: { sourceId: string; ownerDomain: string; sourceRevision: string; expectedVersion: number;
    definition: ImportMappingDefinition; definitionHash: string; actorId: string; reason: string }): Promise<ImportMappingProfileDto>;
  reviewDomain(recordId: string): Promise<string>;
  release(input: { recordId: string; expectedVersion: number; actorId: string }): Promise<unknown>;
  assign(input: { recordId: string; assigneeId: string; dueAt: string; expectedVersion: number;
    actorId: string }): Promise<unknown>;
  claim(input: { recordId: string; expectedVersion: number; actorId: string }): Promise<unknown>;
  listReviews(input: { assigneeId?: string; batchId?: string; page: number }): Promise<unknown>;
  reconcile(input: { recordId: string; expectedUpdatedAt: string; actorId: string }): Promise<unknown>;
  decideDrift(input: { sourceId: string; expectedUpdatedAt: string; decision: 'ACCEPT' | 'REJECT'; actorId: string; reason: string }): Promise<unknown>;
  setFallback(input: { sourceId: string; fallbackSourceId: string | null; sourceRevision: string;
    fallbackSourceRevision?: string; actorId: string; reason: string }): Promise<unknown>;
  getObservation(sourceId: string): Promise<unknown>;
  counters(batchId: string): Promise<unknown>;
  recoverLegacy(input: { batchId: string; expectedUpdatedAt: string; decision: 'QUEUE' | 'REJECT' }): Promise<unknown>;
  assignRetention(input: { batchId: string; expectedUpdatedAt: string; days: number }): Promise<unknown>;
}
