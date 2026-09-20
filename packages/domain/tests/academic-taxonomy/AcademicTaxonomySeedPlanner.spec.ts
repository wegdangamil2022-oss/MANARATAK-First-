import { describe, it, expect } from 'vitest';
import {
  AcademicTaxonomySeedPlanner,
  AcademicTaxonomySeedStatus,
  AcademicTaxonomySeedRecord,
  AcademicTaxonomyNodeType,
  AcademicTaxonomyStatus,
  AcademicStandardType,
  AcademicMappingStrength,
  AcademicTaxonomyValidationSeverity,
} from '../../src/academic-taxonomy';

describe('AcademicTaxonomySeedPlanner', () => {
  const planner = new AcademicTaxonomySeedPlanner();

  const validNodeRecord: AcademicTaxonomySeedRecord = {
    recordId: 'rec_node_1',
    recordType: 'NODE',
    payload: {
      nodeType: AcademicTaxonomyNodeType.DISCIPLINE,
      canonicalCode: '0611',
      canonicalName: 'Computer Science',
      status: AcademicTaxonomyStatus.ACTIVE,
      standardType: AcademicStandardType.CUSTOM_NATIONAL,
    },
  };

  const validEdgeRecord: AcademicTaxonomySeedRecord = {
    recordId: 'rec_edge_1',
    recordType: 'EDGE',
    payload: {
      parentNodeId: 'node_parent',
      childNodeId: 'node_child',
    },
  };

  const validAliasRecord: AcademicTaxonomySeedRecord = {
    recordId: 'rec_alias_1',
    recordType: 'ALIAS',
    payload: {
      nodeId: 'node_parent',
      alias: 'CompSci',
      locale: 'en',
    },
  };

  const validMappingRecord: AcademicTaxonomySeedRecord = {
    recordId: 'rec_map_1',
    recordType: 'MAPPING',
    payload: {
      sourceNodeId: 'node_parent',
      targetNodeId: 'node_child',
      sourceStandard: AcademicStandardType.ISCED,
      targetStandard: AcademicStandardType.CIP,
      strength: AcademicMappingStrength.EXACT,
      confidence: 0.95,
    },
  };

  const existingNodes = [
    {
      nodeId: 'node_parent',
      nodeType: AcademicTaxonomyNodeType.FIELD,
      canonicalCode: '06',
      canonicalName: 'ICT',
      status: AcademicTaxonomyStatus.ACTIVE,
      standardType: AcademicStandardType.ISCED,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      nodeId: 'node_child',
      nodeType: AcademicTaxonomyNodeType.DISCIPLINE,
      canonicalCode: '0611',
      canonicalName: 'Computer Science',
      status: AcademicTaxonomyStatus.ACTIVE,
      standardType: AcademicStandardType.CIP,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  describe('createBatch', () => {
    it('returns DRAFT status and shallowly copies records without mutating input', () => {
      const records = [validNodeRecord];
      const batch = planner.createBatch({
        seedBatchId: 'batch_001',
        sourceName: 'UNESCO ISCED',
        sourceVersion: '2013',
        sourceUrl: 'https://example.com',
        records,
      });

      expect(batch.seedBatchId).toBe('batch_001');
      expect(batch.status).toBe(AcademicTaxonomySeedStatus.DRAFT);
      expect(batch.records).toEqual(records);
      expect(batch.records).not.toBe(records);
      expect(batch.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('validateBatch', () => {
    it('validates NODE record and attaches deterministicKey', () => {
      const draft = planner.createBatch({
        seedBatchId: 'b_node',
        sourceName: 'ISCED',
        sourceVersion: '2013',
        records: [validNodeRecord],
      });

      const validated = planner.validateBatch({
        batch: draft,
        existingNodes: [],
        existingEdges: [],
        existingAliases: [],
        existingMappings: [],
      });

      expect(validated.status).toBe(AcademicTaxonomySeedStatus.VALIDATED);
      expect(validated.validatedAt).toBeInstanceOf(Date);

      const record = validated.records[0];
      expect(record.deterministicKey).toBe('CUSTOM_NATIONAL:DISCIPLINE:0611');
      expect(record.canBeApplied).toBe(true);
      expect(record.validationIssues).toHaveLength(0);
    });

    it('validates EDGE record correctly', () => {
      const draft = planner.createBatch({
        seedBatchId: 'b_edge',
        sourceName: 'ISCED',
        sourceVersion: '2013',
        records: [validEdgeRecord],
      });

      const validated = planner.validateBatch({
        batch: draft,
        existingNodes,
        existingEdges: [],
        existingAliases: [],
        existingMappings: [],
      });

      const record = validated.records[0];
      expect(record.canBeApplied).toBe(true);
      expect(record.validationIssues).toHaveLength(0);
    });

    it('validates ALIAS record correctly', () => {
      const draft = planner.createBatch({
        seedBatchId: 'b_alias',
        sourceName: 'ISCED',
        sourceVersion: '2013',
        records: [validAliasRecord],
      });

      const validated = planner.validateBatch({
        batch: draft,
        existingNodes,
        existingEdges: [],
        existingAliases: [],
        existingMappings: [],
      });

      const record = validated.records[0];
      expect(record.canBeApplied).toBe(true);
      expect(record.validationIssues).toHaveLength(0);
    });

    it('validates MAPPING record correctly', () => {
      const draft = planner.createBatch({
        seedBatchId: 'b_map',
        sourceName: 'ISCED',
        sourceVersion: '2013',
        records: [validMappingRecord],
      });

      const validated = planner.validateBatch({
        batch: draft,
        existingNodes,
        existingEdges: [],
        existingAliases: [],
        existingMappings: [],
      });

      const record = validated.records[0];
      expect(record.canBeApplied).toBe(true);
      expect(record.validationIssues).toHaveLength(0);
    });

    it('produces correct validationSummary category counts across all record types', () => {
      const draft = planner.createBatch({
        seedBatchId: 'b_all',
        sourceName: 'ISCED',
        sourceVersion: '2013',
        records: [validNodeRecord, validEdgeRecord, validAliasRecord, validMappingRecord],
      });

      const validated = planner.validateBatch({
        batch: draft,
        existingNodes,
        existingEdges: [],
        existingAliases: [],
        existingMappings: [],
      });

      expect(validated.validationSummary).toEqual({
        totalRecords: 4,
        validRecords: 4,
        invalidRecords: 0,
        nodeRecords: 1,
        edgeRecords: 1,
        aliasRecords: 1,
        mappingRecords: 1,
      });
    });

    it('marks invalid records as canBeApplied = false and increments invalidRecords', () => {
      const invalidNodeRecord: AcademicTaxonomySeedRecord = {
        recordId: 'rec_invalid_node',
        recordType: 'NODE',
        payload: {
          nodeType: AcademicTaxonomyNodeType.DISCIPLINE,
          canonicalCode: '',
          canonicalName: '',
        },
      };

      const draft = planner.createBatch({
        seedBatchId: 'b_invalid',
        sourceName: 'ISCED',
        sourceVersion: '2013',
        records: [invalidNodeRecord],
      });

      const validated = planner.validateBatch({
        batch: draft,
        existingNodes: [],
        existingEdges: [],
        existingAliases: [],
        existingMappings: [],
      });

      expect(validated.validationSummary?.invalidRecords).toBe(1);
      expect(validated.validationSummary?.validRecords).toBe(0);
      expect(validated.records[0].canBeApplied).toBe(false);
      expect(validated.records[0].validationIssues?.some((i) => i.severity === AcademicTaxonomyValidationSeverity.ERROR)).toBe(true);
    });

    it('handles unknown recordType with ERROR issue without crashing', () => {
      const unknownTypeRecord: AcademicTaxonomySeedRecord = {
        recordId: 'rec_unknown',
        recordType: 'UNKNOWN_TYPE' as any,
        payload: {},
      };

      const draft = planner.createBatch({
        seedBatchId: 'b_unknown',
        sourceName: 'ISCED',
        sourceVersion: '2013',
        records: [unknownTypeRecord],
      });

      const validated = planner.validateBatch({
        batch: draft,
        existingNodes: [],
        existingEdges: [],
        existingAliases: [],
        existingMappings: [],
      });

      expect(validated.records[0].canBeApplied).toBe(false);
      expect(validated.records[0].validationIssues).toContainEqual(
        expect.objectContaining({
          code: 'UNSUPPORTED_RECORD_TYPE',
          severity: AcademicTaxonomyValidationSeverity.ERROR,
        })
      );
    });

    it('does not mutate original batch or records during validateBatch', () => {
      const originalRecord: AcademicTaxonomySeedRecord = { ...validNodeRecord };
      const draft = planner.createBatch({
        seedBatchId: 'b_immutable',
        sourceName: 'ISCED',
        sourceVersion: '2013',
        records: [originalRecord],
      });

      const draftCopy = JSON.parse(JSON.stringify(draft));

      planner.validateBatch({
        batch: draft,
        existingNodes: [],
        existingEdges: [],
        existingAliases: [],
        existingMappings: [],
      });

      expect(draft.status).toBe(AcademicTaxonomySeedStatus.DRAFT);
      expect(draft.validatedAt).toBeUndefined();
      expect(draft.records[0].canBeApplied).toBeUndefined();
      expect(draft.records[0].deterministicKey).toBeUndefined();
      expect(originalRecord).toEqual(validNodeRecord);
    });
  });

  describe('markReadyToApply', () => {
    it('rejects a DRAFT batch', () => {
      const draft = planner.createBatch({
        seedBatchId: 'b_draft',
        sourceName: 'ISCED',
        sourceVersion: '2013',
        records: [validNodeRecord],
      });

      expect(() => planner.markReadyToApply(draft)).toThrow(
        'Batch must be validated before marking ready to apply'
      );
    });

    it('rejects a batch missing validationSummary', () => {
      const batchWithoutSummary = {
        seedBatchId: 'b_no_sum',
        sourceName: 'ISCED',
        sourceVersion: '2013',
        status: AcademicTaxonomySeedStatus.VALIDATED,
        records: [],
        createdAt: new Date(),
      };

      expect(() => planner.markReadyToApply(batchWithoutSummary as any)).toThrow(
        'Batch validation summary is missing'
      );
    });

    it('rejects a batch with invalidRecords > 0', () => {
      const invalidNodeRecord: AcademicTaxonomySeedRecord = {
        recordId: 'rec_invalid',
        recordType: 'NODE',
        payload: {
          nodeType: AcademicTaxonomyNodeType.DISCIPLINE,
          canonicalCode: '',
          canonicalName: '',
        },
      };

      const draft = planner.createBatch({
        seedBatchId: 'b_invalid',
        sourceName: 'ISCED',
        sourceVersion: '2013',
        records: [invalidNodeRecord],
      });

      const validated = planner.validateBatch({
        batch: draft,
        existingNodes: [],
        existingEdges: [],
        existingAliases: [],
        existingMappings: [],
      });

      expect(() => planner.markReadyToApply(validated)).toThrow(
        'Cannot mark batch ready to apply: batch contains invalid records'
      );
    });

    it('returns READY_TO_APPLY status for clean validated batch', () => {
      const draft = planner.createBatch({
        seedBatchId: 'b_clean',
        sourceName: 'ISCED',
        sourceVersion: '2013',
        records: [validNodeRecord, validEdgeRecord],
      });

      const validated = planner.validateBatch({
        batch: draft,
        existingNodes,
        existingEdges: [],
        existingAliases: [],
        existingMappings: [],
      });

      const ready = planner.markReadyToApply(validated);
      expect(ready.status).toBe(AcademicTaxonomySeedStatus.READY_TO_APPLY);
      expect(ready.seedBatchId).toBe('b_clean');
    });

    it('never produces APPLIED status directly from planner methods', () => {
      const draft = planner.createBatch({
        seedBatchId: 'b_test',
        sourceName: 'ISCED',
        sourceVersion: '2013',
        records: [validNodeRecord],
      });

      expect(draft.status).not.toBe(AcademicTaxonomySeedStatus.APPLIED);
      const validated = planner.validateBatch({
        batch: draft,
        existingNodes: [],
        existingEdges: [],
        existingAliases: [],
        existingMappings: [],
      });
      expect(validated.status).not.toBe(AcademicTaxonomySeedStatus.APPLIED);
      const ready = planner.markReadyToApply(validated);
      expect(ready.status).not.toBe(AcademicTaxonomySeedStatus.APPLIED);
    });
  });
});
