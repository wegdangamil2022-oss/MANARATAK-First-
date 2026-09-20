import { describe, it, expect } from 'vitest';
import {
  AcademicTaxonomySeedStatus,
  AcademicTaxonomySeedRecord,
  AcademicTaxonomySeedBatch,
  IAcademicTaxonomySeedPlanner,
  AcademicTaxonomyNodeType,
  AcademicTaxonomyStatus,
  AcademicStandardType,
  AcademicMappingStrength,
} from '../../src/academic-taxonomy';

describe('AcademicTaxonomySeedContracts', () => {
  it('has stable AcademicTaxonomySeedStatus enum values', () => {
    expect(AcademicTaxonomySeedStatus.DRAFT).toBe('DRAFT');
    expect(AcademicTaxonomySeedStatus.VALIDATED).toBe('VALIDATED');
    expect(AcademicTaxonomySeedStatus.READY_TO_APPLY).toBe('READY_TO_APPLY');
    expect(AcademicTaxonomySeedStatus.APPLIED).toBe('APPLIED');
    expect(AcademicTaxonomySeedStatus.REJECTED).toBe('REJECTED');
  });

  it('supports NODE payload in seed record', () => {
    const record: AcademicTaxonomySeedRecord = {
      recordId: 'rec_node_1',
      recordType: 'NODE',
      deterministicKey: 'CUSTOM_NATIONAL:DISCIPLINE:0611',
      payload: {
        nodeType: AcademicTaxonomyNodeType.DISCIPLINE,
        canonicalCode: '0611',
        canonicalName: 'Computer Science',
        status: AcademicTaxonomyStatus.ACTIVE,
        standardType: AcademicStandardType.CUSTOM_NATIONAL,
      },
      canBeApplied: true,
    };

    expect(record.recordType).toBe('NODE');
    expect(record.payload).toHaveProperty('canonicalCode', '0611');
    expect(record.payload).not.toHaveProperty('evidenceSnippet');
  });

  it('supports EDGE payload in seed record', () => {
    const record: AcademicTaxonomySeedRecord = {
      recordId: 'rec_edge_1',
      recordType: 'EDGE',
      payload: {
        parentNodeId: 'node_parent',
        childNodeId: 'node_child',
        isPrimary: true,
      },
      canBeApplied: true,
    };

    expect(record.recordType).toBe('EDGE');
    expect(record.payload).toEqual({
      parentNodeId: 'node_parent',
      childNodeId: 'node_child',
      isPrimary: true,
    });
  });

  it('supports ALIAS payload in seed record', () => {
    const record: AcademicTaxonomySeedRecord = {
      recordId: 'rec_alias_1',
      recordType: 'ALIAS',
      payload: {
        nodeId: 'node_1',
        alias: 'CompSci',
        locale: 'en',
      },
      canBeApplied: true,
    };

    expect(record.recordType).toBe('ALIAS');
    expect(record.payload).toEqual({
      nodeId: 'node_1',
      alias: 'CompSci',
      locale: 'en',
    });
  });

  it('supports MAPPING payload in seed record', () => {
    const record: AcademicTaxonomySeedRecord = {
      recordId: 'rec_map_1',
      recordType: 'MAPPING',
      payload: {
        sourceNodeId: 'node_isced',
        targetNodeId: 'node_cip',
        sourceStandard: AcademicStandardType.ISCED,
        targetStandard: AcademicStandardType.CIP,
        strength: AcademicMappingStrength.EXACT,
        confidence: 0.98,
      },
      canBeApplied: true,
    };

    expect(record.recordType).toBe('MAPPING');
    expect(record.payload).toHaveProperty('strength', AcademicMappingStrength.EXACT);
  });

  it('supports audit metadata in seed batch shape', () => {
    const batch: AcademicTaxonomySeedBatch = {
      seedBatchId: 'batch_2026_01',
      sourceName: 'UNESCO ISCED-F 2013',
      sourceVersion: '2013.1',
      sourceUrl: 'https://uis.unesco.org/isced-f-2013',
      status: AcademicTaxonomySeedStatus.DRAFT,
      records: [],
      createdAt: new Date('2026-01-01T00:00:00Z'),
      validatedAt: new Date('2026-01-01T01:00:00Z'),
      appliedAt: new Date('2026-01-01T02:00:00Z'),
      appliedBy: 'admin_user_01',
      validationSummary: {
        totalRecords: 10,
        validRecords: 10,
        invalidRecords: 0,
        nodeRecords: 4,
        edgeRecords: 3,
        aliasRecords: 2,
        mappingRecords: 1,
      },
    };

    expect(batch.seedBatchId).toBe('batch_2026_01');
    expect(batch.sourceName).toBe('UNESCO ISCED-F 2013');
    expect(batch.sourceVersion).toBe('2013.1');
    expect(batch.appliedBy).toBe('admin_user_01');
    expect(batch.validationSummary?.nodeRecords).toBe(4);
    expect(batch.validationSummary?.edgeRecords).toBe(3);
    expect(batch.validationSummary?.aliasRecords).toBe(2);
    expect(batch.validationSummary?.mappingRecords).toBe(1);
  });

  it('verifies an applied seed batch requires APPLIED status and appliedAt/appliedBy when used', () => {
    const appliedBatch: AcademicTaxonomySeedBatch = {
      seedBatchId: 'batch_applied_01',
      sourceName: 'Official CIP 2020',
      sourceVersion: '2020.1',
      status: AcademicTaxonomySeedStatus.APPLIED,
      records: [],
      createdAt: new Date(),
      appliedAt: new Date(),
      appliedBy: 'system_admin',
    };

    expect(appliedBatch.status).toBe(AcademicTaxonomySeedStatus.APPLIED);
    expect(appliedBatch.appliedAt).toBeDefined();
    expect(appliedBatch.appliedBy).toBeDefined();
  });

  it('verifies seed records do not require raw Phase 06 evidence fields', () => {
    const seedRecord: AcademicTaxonomySeedRecord = {
      recordId: 'clean_node_record',
      recordType: 'NODE',
      payload: {
        nodeType: AcademicTaxonomyNodeType.DISCIPLINE,
        canonicalCode: '0610',
        canonicalName: 'Information Technology',
      },
    };

    const payloadKeys = Object.keys(seedRecord.payload);
    expect(payloadKeys).not.toContain('evidenceSnippet');
    expect(payloadKeys).not.toContain('confidenceScore');
    expect(payloadKeys).not.toContain('validationResults');
    expect(payloadKeys).not.toContain('sourceText');
    expect(payloadKeys).not.toContain('rawPayload');
  });

  it('can mock IAcademicTaxonomySeedPlanner with createBatch, validateBatch, and markReadyToApply', () => {
    const mockPlanner: IAcademicTaxonomySeedPlanner = {
      createBatch: ({ seedBatchId, sourceName, sourceVersion, sourceUrl, records }) => ({
        seedBatchId,
        sourceName,
        sourceVersion,
        sourceUrl,
        status: AcademicTaxonomySeedStatus.DRAFT,
        records,
        createdAt: new Date(),
      }),

      validateBatch: ({ batch }) => ({
        ...batch,
        status: AcademicTaxonomySeedStatus.VALIDATED,
        validatedAt: new Date(),
        validationSummary: {
          totalRecords: batch.records.length,
          validRecords: batch.records.length,
          invalidRecords: 0,
          nodeRecords: batch.records.filter((r) => r.recordType === 'NODE').length,
          edgeRecords: batch.records.filter((r) => r.recordType === 'EDGE').length,
          aliasRecords: batch.records.filter((r) => r.recordType === 'ALIAS').length,
          mappingRecords: batch.records.filter((r) => r.recordType === 'MAPPING').length,
        },
      }),

      markReadyToApply: (batch) => ({
        ...batch,
        status: AcademicTaxonomySeedStatus.READY_TO_APPLY,
      }),
    };

    const created = mockPlanner.createBatch({
      seedBatchId: 'b1',
      sourceName: 'ISCED',
      sourceVersion: '2013',
      records: [
        {
          recordId: 'r1',
          recordType: 'NODE',
          payload: {
            nodeType: AcademicTaxonomyNodeType.DISCIPLINE,
            canonicalCode: '061',
            canonicalName: 'ICTs',
          },
        },
      ],
    });

    expect(created.status).toBe(AcademicTaxonomySeedStatus.DRAFT);

    const validated = mockPlanner.validateBatch({
      batch: created,
      existingNodes: [],
      existingEdges: [],
      existingAliases: [],
      existingMappings: [],
    });

    expect(validated.status).toBe(AcademicTaxonomySeedStatus.VALIDATED);
    expect(validated.validationSummary?.totalRecords).toBe(1);
    expect(validated.validationSummary?.nodeRecords).toBe(1);

    const ready = mockPlanner.markReadyToApply(validated);
    expect(ready.status).toBe(AcademicTaxonomySeedStatus.READY_TO_APPLY);
  });
});
