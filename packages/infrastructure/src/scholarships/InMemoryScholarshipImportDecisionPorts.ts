import { randomUUID } from 'node:crypto';
import type { IScholarshipImportCanonicalResolutionDecisionPort, IScholarshipImportVerificationDecisionPort, ScholarshipImportCanonicalResolutionDecision, ScholarshipImportVerificationDecision } from '@manaratak/application';

export class InMemoryScholarshipImportVerificationDecisionPort implements IScholarshipImportVerificationDecisionPort {
  public readonly persistenceClassification = 'DEVELOPMENT_ONLY' as const; private readonly values = new Map<string, Array<ScholarshipImportVerificationDecision & { decisionId: string; recordedAt: string }>>();
  async record(input: ScholarshipImportVerificationDecision) { const value = { ...input, decisionId: randomUUID(), recordedAt: new Date().toISOString() }; this.values.set(input.recordId, [...(this.values.get(input.recordId) ?? []), value]); return { decisionId: value.decisionId, recordedAt: value.recordedAt }; }
  async latest(recordId: string) { const values = this.values.get(recordId) ?? []; return values.at(-1) ?? null; }
  async list(recordId: string) { return this.values.get(recordId) ?? []; }
}
export class InMemoryScholarshipImportCanonicalResolutionDecisionPort implements IScholarshipImportCanonicalResolutionDecisionPort {
  public readonly persistenceClassification = 'DEVELOPMENT_ONLY' as const; private readonly values = new Map<string, Array<ScholarshipImportCanonicalResolutionDecision & { decisionId: string; recordedAt: string }>>();
  async record(input: ScholarshipImportCanonicalResolutionDecision) { const value = { ...input, decisionId: randomUUID(), recordedAt: new Date().toISOString() }; this.values.set(input.recordId, [...(this.values.get(input.recordId) ?? []), value]); return { decisionId: value.decisionId, recordedAt: value.recordedAt }; }
  async list(recordId: string) { return this.values.get(recordId) ?? []; }
}
