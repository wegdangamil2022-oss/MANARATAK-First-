import {
  AcademicTaxonomyNodeDto,
  AcademicTaxonomyAliasDto,
  AcademicStandardMappingDto,
  AcademicTaxonomySeedBatch,
  AcademicTaxonomySeedRecord,
  AcademicTaxonomySeedRecordType,
  AcademicTaxonomySeedPlanner,
} from '@manaratak/domain';

export interface AcademicTaxonomyImportHandoffCommand {
  seedBatchId: string;
  sourceName: string;
  sourceVersion: string;
  sourceUrl?: string;
  records: Array<{
    recordId: string;
    recordType: 'NODE' | 'EDGE' | 'ALIAS' | 'MAPPING' | string;
    payload: Record<string, unknown>;
  }>;
  existingNodes?: AcademicTaxonomyNodeDto[];
  existingEdges?: Array<{ parentNodeId: string; childNodeId: string; isPrimary?: boolean }>;
  existingAliases?: AcademicTaxonomyAliasDto[];
  existingMappings?: AcademicStandardMappingDto[];
  autoMarkReadyIfValid?: boolean;
}

export class AcademicTaxonomyImportHandoffService {
  private readonly FORBIDDEN_KEYS = new Set([
    'evidenceSnippet',
    'confidenceScore',
    'validationResults',
    'sourceText',
    'rawPayload',
    'tuition',
    'salary',
    'careerOutcomes',
    'universityId',
    'countryRanking',
    'featuredMajor',
  ]);

  constructor(
    private readonly seedPlanner: AcademicTaxonomySeedPlanner = new AcademicTaxonomySeedPlanner()
  ) {}

  public prepareSeedBatch(
    command: AcademicTaxonomyImportHandoffCommand
  ): AcademicTaxonomySeedBatch {
    const sanitizedSeedRecords: AcademicTaxonomySeedRecord[] = command.records.map((rec) => {
      const sanitizedPayload = this.sanitizePayload(rec.payload);
      return {
        recordId: rec.recordId,
        recordType: rec.recordType as AcademicTaxonomySeedRecordType,
        payload: sanitizedPayload as any,
      };
    });

    const draftBatch = this.seedPlanner.createBatch({
      seedBatchId: command.seedBatchId,
      sourceName: command.sourceName,
      sourceVersion: command.sourceVersion,
      sourceUrl: command.sourceUrl,
      records: sanitizedSeedRecords,
    });

    const validatedBatch = this.seedPlanner.validateBatch({
      batch: draftBatch,
      existingNodes: command.existingNodes || [],
      existingEdges: command.existingEdges || [],
      existingAliases: command.existingAliases || [],
      existingMappings: command.existingMappings || [],
    });

    if (
      command.autoMarkReadyIfValid === true &&
      validatedBatch.validationSummary &&
      validatedBatch.validationSummary.invalidRecords === 0
    ) {
      return this.seedPlanner.markReadyToApply(validatedBatch);
    }

    return validatedBatch;
  }

  private sanitizePayload(rawPayload: Record<string, unknown>): Record<string, unknown> {
    if (!rawPayload || typeof rawPayload !== 'object') {
      return {};
    }

    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(rawPayload)) {
      if (this.FORBIDDEN_KEYS.has(key)) {
        continue;
      }

      if (key === 'metadata' && value && typeof value === 'object' && !Array.isArray(value)) {
        const sanitizedMeta: Record<string, unknown> = {};
        for (const [metaKey, metaVal] of Object.entries(value as Record<string, unknown>)) {
          if (!this.FORBIDDEN_KEYS.has(metaKey)) {
            sanitizedMeta[metaKey] = metaVal;
          }
        }
        sanitized[key] = sanitizedMeta;
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}
