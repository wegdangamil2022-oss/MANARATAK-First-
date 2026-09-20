import {
  AcademicTaxonomyNodeDto,
  UpsertAcademicTaxonomyNodeDto,
  AcademicTaxonomyAliasDto,
  UpsertAcademicTaxonomyAliasDto,
  UpsertAcademicTaxonomyEdgeDto,
  AcademicStandardMappingDto,
  UpsertAcademicStandardMappingDto,
} from './contracts';
import { AcademicTaxonomyValidationSeverity } from './enums';
import {
  AcademicTaxonomySeedStatus,
  AcademicTaxonomySeedRecord,
  AcademicTaxonomySeedBatch,
  IAcademicTaxonomySeedPlanner,
} from './seed';
import {
  IAcademicTaxonomyValidationService,
  AcademicTaxonomyValidationService,
} from './validation';

export class AcademicTaxonomySeedPlanner implements IAcademicTaxonomySeedPlanner {
  private readonly validationService: IAcademicTaxonomyValidationService;

  constructor(
    validationService: IAcademicTaxonomyValidationService = new AcademicTaxonomyValidationService()
  ) {
    this.validationService = validationService;
  }

  createBatch(input: {
    seedBatchId: string;
    sourceName: string;
    sourceVersion: string;
    sourceUrl?: string;
    records: AcademicTaxonomySeedRecord[];
  }): AcademicTaxonomySeedBatch {
    return {
      seedBatchId: input.seedBatchId,
      sourceName: input.sourceName,
      sourceVersion: input.sourceVersion,
      sourceUrl: input.sourceUrl,
      status: AcademicTaxonomySeedStatus.DRAFT,
      records: [...input.records],
      createdAt: new Date(),
    };
  }

  validateBatch(input: {
    batch: AcademicTaxonomySeedBatch;
    existingNodes: AcademicTaxonomyNodeDto[];
    existingEdges: Array<{ parentNodeId: string; childNodeId: string; isPrimary?: boolean }>;
    existingAliases: AcademicTaxonomyAliasDto[];
    existingMappings: AcademicStandardMappingDto[];
  }): AcademicTaxonomySeedBatch {
    const { batch, existingNodes, existingEdges, existingAliases, existingMappings } = input;

    const validatedRecords: AcademicTaxonomySeedRecord[] = batch.records.map((record) => {
      let issues = record.validationIssues ? [...record.validationIssues] : [];
      let deterministicKey = record.deterministicKey;
      let canBeApplied = false;

      switch (record.recordType) {
        case 'NODE': {
          const report = this.validationService.validateNode(
            record.payload as AcademicTaxonomyNodeDto | UpsertAcademicTaxonomyNodeDto
          );
          deterministicKey = report.deterministicKey;
          issues = report.issues;
          canBeApplied = report.canBeReviewed;
          break;
        }
        case 'EDGE': {
          issues = this.validationService.validateEdge({
            edge: record.payload as UpsertAcademicTaxonomyEdgeDto,
            existingNodes,
            existingEdges,
          });
          canBeApplied = !issues.some(
            (i) => i.severity === AcademicTaxonomyValidationSeverity.ERROR
          );
          break;
        }
        case 'ALIAS': {
          issues = this.validationService.validateAlias({
            alias: record.payload as UpsertAcademicTaxonomyAliasDto,
            existingAliases,
          });
          canBeApplied = !issues.some(
            (i) => i.severity === AcademicTaxonomyValidationSeverity.ERROR
          );
          break;
        }
        case 'MAPPING': {
          const mapping = record.payload as UpsertAcademicStandardMappingDto;
          issues = this.validationService.validateMapping({
            mapping,
            existingMappings,
            sourceNode: existingNodes.find((node) => node.nodeId === mapping.sourceNodeId) ?? null,
            targetNode: existingNodes.find((node) => node.nodeId === mapping.targetNodeId) ?? null,
          });
          canBeApplied = !issues.some(
            (i) => i.severity === AcademicTaxonomyValidationSeverity.ERROR
          );
          break;
        }
        default: {
          issues = [
            {
              fieldName: 'recordType',
              code: 'UNSUPPORTED_RECORD_TYPE',
              message: `Unsupported record type: ${String(record.recordType)}`,
              severity: AcademicTaxonomyValidationSeverity.ERROR,
            },
          ];
          canBeApplied = false;
          break;
        }
      }

      return {
        ...record,
        deterministicKey,
        validationIssues: issues,
        canBeApplied,
      };
    });

    const totalRecords = validatedRecords.length;
    const validRecords = validatedRecords.filter((r) => r.canBeApplied === true).length;
    const invalidRecords = validatedRecords.filter((r) => r.canBeApplied !== true).length;
    const nodeRecords = validatedRecords.filter((r) => r.recordType === 'NODE').length;
    const edgeRecords = validatedRecords.filter((r) => r.recordType === 'EDGE').length;
    const aliasRecords = validatedRecords.filter((r) => r.recordType === 'ALIAS').length;
    const mappingRecords = validatedRecords.filter((r) => r.recordType === 'MAPPING').length;

    return {
      ...batch,
      status: AcademicTaxonomySeedStatus.VALIDATED,
      validatedAt: new Date(),
      records: validatedRecords,
      validationSummary: {
        totalRecords,
        validRecords,
        invalidRecords,
        nodeRecords,
        edgeRecords,
        aliasRecords,
        mappingRecords,
      },
    };
  }

  markReadyToApply(batch: AcademicTaxonomySeedBatch): AcademicTaxonomySeedBatch {
    if (batch.status === AcademicTaxonomySeedStatus.DRAFT) {
      throw new Error('Batch must be validated before marking ready to apply');
    }

    if (!batch.validationSummary) {
      throw new Error('Batch validation summary is missing');
    }

    if (batch.validationSummary.invalidRecords > 0) {
      throw new Error('Cannot mark batch ready to apply: batch contains invalid records');
    }

    if (batch.records.some((r) => r.canBeApplied !== true)) {
      throw new Error('Cannot mark batch ready to apply: batch contains records that cannot be applied');
    }

    return {
      ...batch,
      status: AcademicTaxonomySeedStatus.READY_TO_APPLY,
    };
  }
}
