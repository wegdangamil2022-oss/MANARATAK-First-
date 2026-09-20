import type { ScholarshipCanonicalResolutionService } from '../resolution';
import { ScholarshipImportScreeningReader } from './ScholarshipImportScreeningReader';
import type {
  IScholarshipImportCanonicalResolutionDecisionPort,
  IScholarshipImportCenterGateway,
  IScholarshipImportVerificationDecisionPort,
  ScholarshipImportCanonicalResolutionDecision,
  ScholarshipImportVerificationDecision,
} from './ScholarshipImportCenterContracts';

/** Command boundary for durable review decisions.  The router supplies identity only. */
export class ScholarshipImportDecisionUseCases {
  constructor(
    private readonly gateway: IScholarshipImportCenterGateway,
    private readonly verification: IScholarshipImportVerificationDecisionPort,
    private readonly canonical: IScholarshipImportCanonicalResolutionDecisionPort,
    private readonly resolver: ScholarshipCanonicalResolutionService,
  ) {}

  async recordVerification(input: ScholarshipImportVerificationDecision) {
    await this.assertScholarshipRecord(input.recordId);
    return this.verification.record(input);
  }

  async recordCanonical(input: ScholarshipImportCanonicalResolutionDecision) {
    const record = await this.assertScholarshipRecord(input.recordId);
    const item = this.screeningItem(record.rawPayload, input.fieldOrRequirementKey);
    if (!item) throw new Error('SCHOLARSHIP_CANONICAL_REQUIREMENT_NOT_FOUND');
    const target = string(item.canonicalEntityType) ?? string(item.target);
    const rawValue = string(item.rawValue);
    if (target !== input.canonicalEntityType || rawValue !== input.rawValue) throw new Error('SCHOLARSHIP_CANONICAL_REQUIREMENT_MISMATCH');
    if (input.resolutionType === 'NOT_APPLICABLE') {
      // Only an explicitly staged non-university provider has this semantic path.
      const payload = object(record.rawPayload);
      if (target !== 'PROVIDER_UNIVERSITY' || payload.providerIsUniversity !== false) throw new Error('SCHOLARSHIP_CANONICAL_NOT_APPLICABLE_NOT_ALLOWED');
    }
    if (input.resolutionType === 'RESOLVED') {
      const result = await this.resolver.resolve({ target: input.canonicalEntityType as never, rawValue: input.rawValue, canonicalId: input.canonicalId });
      if (result.state !== 'RESOLVED') throw new Error('SCHOLARSHIP_CANONICAL_RESOLUTION_NOT_EXISTING_OR_AMBIGUOUS');
    }
    return this.canonical.record(input);
  }

  private async assertScholarshipRecord(recordId: string) {
    const record = await this.gateway.getRecordById(recordId);
    if (!record) throw new Error('SCHOLARSHIP_IMPORT_RECORD_NOT_FOUND');
    const batch = record.batch ?? await this.gateway.getBatchById(record.batchId);
    if (!batch || batch.dataType.trim().toUpperCase() !== 'SCHOLARSHIPS') throw new Error('SCHOLARSHIP_IMPORT_RECORD_NOT_IN_SCHOLARSHIP_BATCH');
    return record;
  }

  private screeningItem(payload: unknown, key: string): Record<string, unknown> | null {
    return ScholarshipImportScreeningReader.findRequirement(payload, key);
  }
}

function object(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function string(value: unknown): string | undefined { return typeof value === 'string' && value.trim() ? value : undefined; }
