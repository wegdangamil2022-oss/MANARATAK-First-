import { describe, it, expect } from 'vitest';
import {
  AcademicTaxonomyImportHandoffService,
  AcademicTaxonomyImportHandoffCommand,
} from '../../src/academic-taxonomy';
import {
  AcademicTaxonomySeedStatus,
  AcademicTaxonomyNodeType,
  AcademicTaxonomyStatus,
  AcademicStandardType,
  AcademicMappingStrength,
  AcademicTaxonomyValidationSeverity,
} from '@manaratak/domain';

describe('AcademicTaxonomyImportHandoffService', () => {
  const service = new AcademicTaxonomyImportHandoffService();

  const validNodeRecord = {
    recordId: 'rec_node_1',
    recordType: 'NODE' as const,
    payload: {
      nodeType: AcademicTaxonomyNodeType.DISCIPLINE,
      canonicalCode: '0611',
      canonicalName: 'Computer Science',
      status: AcademicTaxonomyStatus.ACTIVE,
      standardType: AcademicStandardType.CUSTOM_NATIONAL,
    },
  };

  const validEdgeRecord = {
    recordId: 'rec_edge_1',
    recordType: 'EDGE' as const,
    payload: {
      parentNodeId: 'node_parent',
      childNodeId: 'node_child',
    },
  };

  const validAliasRecord = {
    recordId: 'rec_alias_1',
    recordType: 'ALIAS' as const,
    payload: {
      nodeId: 'node_parent',
      alias: 'CompSci',
      locale: 'en',
    },
  };

  const validMappingRecord = {
    recordId: 'rec_map_1',
    recordType: 'MAPPING' as const,
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

  it('creates DRAFT then returns VALIDATED batch when autoMarkReadyIfValid is false', () => {
    const command: AcademicTaxonomyImportHandoffCommand = {
      seedBatchId: 'batch_01',
      sourceName: 'ISCED-F',
      sourceVersion: '2013',
      records: [validNodeRecord],
      autoMarkReadyIfValid: false,
    };

    const result = service.prepareSeedBatch(command);

    expect(result.seedBatchId).toBe('batch_01');
    expect(result.status).toBe(AcademicTaxonomySeedStatus.VALIDATED);
    expect(result.validationSummary?.validRecords).toBe(1);
    expect(result.validatedAt).toBeInstanceOf(Date);
  });

  it('returns READY_TO_APPLY when autoMarkReadyIfValid is true and records are valid', () => {
    const command: AcademicTaxonomyImportHandoffCommand = {
      seedBatchId: 'batch_ready_01',
      sourceName: 'CIP 2020',
      sourceVersion: '2020.1',
      records: [validNodeRecord],
      autoMarkReadyIfValid: true,
    };

    const result = service.prepareSeedBatch(command);

    expect(result.status).toBe(AcademicTaxonomySeedStatus.READY_TO_APPLY);
  });

  it('never returns APPLIED status', () => {
    const command: AcademicTaxonomyImportHandoffCommand = {
      seedBatchId: 'batch_never_applied',
      sourceName: 'CIP 2020',
      sourceVersion: '2020.1',
      records: [validNodeRecord],
      autoMarkReadyIfValid: true,
    };

    const result = service.prepareSeedBatch(command);

    expect(result.status).not.toBe(AcademicTaxonomySeedStatus.APPLIED);
    expect(result.status).toBe(AcademicTaxonomySeedStatus.READY_TO_APPLY);
  });

  it('sanitizes forbidden Phase 06 top-level fields', () => {
    const command: AcademicTaxonomyImportHandoffCommand = {
      seedBatchId: 'batch_p06_toplevel',
      sourceName: 'ISCED',
      sourceVersion: '2013',
      records: [
        {
          recordId: 'rec_p06',
          recordType: 'NODE',
          payload: {
            nodeType: AcademicTaxonomyNodeType.DISCIPLINE,
            canonicalCode: '0611',
            canonicalName: 'Computer Science',
            evidenceSnippet: 'Some raw OCR snippet text',
            confidenceScore: 0.99,
            validationResults: { pass: true },
            sourceText: 'Raw extract text',
            rawPayload: { unparsed: 'data' },
          },
        },
      ],
    };

    const result = service.prepareSeedBatch(command);
    const payload = result.records[0].payload as Record<string, unknown>;

    expect(payload.canonicalCode).toBe('0611');
    expect(payload).not.toHaveProperty('evidenceSnippet');
    expect(payload).not.toHaveProperty('confidenceScore');
    expect(payload).not.toHaveProperty('validationResults');
    expect(payload).not.toHaveProperty('sourceText');
    expect(payload).not.toHaveProperty('rawPayload');
  });

  it('sanitizes forbidden Phase 06 metadata fields', () => {
    const command: AcademicTaxonomyImportHandoffCommand = {
      seedBatchId: 'batch_p06_meta',
      sourceName: 'ISCED',
      sourceVersion: '2013',
      records: [
        {
          recordId: 'rec_p06_meta',
          recordType: 'NODE',
          payload: {
            nodeType: AcademicTaxonomyNodeType.DISCIPLINE,
            canonicalCode: '0611',
            canonicalName: 'Computer Science',
            metadata: {
              license: 'CC-BY',
              evidenceSnippet: 'Nested raw evidence',
              sourceText: 'Nested source text',
            },
          },
        },
      ],
    };

    const result = service.prepareSeedBatch(command);
    const payload = result.records[0].payload as { metadata?: Record<string, unknown> };

    expect(payload.metadata).toBeDefined();
    expect(payload.metadata?.license).toBe('CC-BY');
    expect(payload.metadata).not.toHaveProperty('evidenceSnippet');
    expect(payload.metadata).not.toHaveProperty('sourceText');
  });

  it('sanitizes forbidden Phase 10 top-level fields', () => {
    const command: AcademicTaxonomyImportHandoffCommand = {
      seedBatchId: 'batch_p10_toplevel',
      sourceName: 'ISCED',
      sourceVersion: '2013',
      records: [
        {
          recordId: 'rec_p10',
          recordType: 'NODE',
          payload: {
            nodeType: AcademicTaxonomyNodeType.DISCIPLINE,
            canonicalCode: '0611',
            canonicalName: 'Computer Science',
            tuition: 50000,
            salary: 120000,
            careerOutcomes: ['Software Engineer'],
            universityId: 'univ_123',
            countryRanking: 1,
            featuredMajor: true,
          },
        },
      ],
    };

    const result = service.prepareSeedBatch(command);
    const payload = result.records[0].payload as Record<string, unknown>;

    expect(payload.canonicalCode).toBe('0611');
    expect(payload).not.toHaveProperty('tuition');
    expect(payload).not.toHaveProperty('salary');
    expect(payload).not.toHaveProperty('careerOutcomes');
    expect(payload).not.toHaveProperty('universityId');
    expect(payload).not.toHaveProperty('countryRanking');
    expect(payload).not.toHaveProperty('featuredMajor');
  });

  it('sanitizes forbidden Phase 10 metadata fields', () => {
    const command: AcademicTaxonomyImportHandoffCommand = {
      seedBatchId: 'batch_p10_meta',
      sourceName: 'ISCED',
      sourceVersion: '2013',
      records: [
        {
          recordId: 'rec_p10_meta',
          recordType: 'NODE',
          payload: {
            nodeType: AcademicTaxonomyNodeType.DISCIPLINE,
            canonicalCode: '0611',
            canonicalName: 'Computer Science',
            metadata: {
              approvedBy: 'curriculum_board',
              tuition: 30000,
              salary: 80000,
            },
          },
        },
      ],
    };

    const result = service.prepareSeedBatch(command);
    const payload = result.records[0].payload as { metadata?: Record<string, unknown> };

    expect(payload.metadata?.approvedBy).toBe('curriculum_board');
    expect(payload.metadata).not.toHaveProperty('tuition');
    expect(payload.metadata).not.toHaveProperty('salary');
  });

  it('does not mutate original command.records', () => {
    const rawPayload = {
      nodeType: AcademicTaxonomyNodeType.DISCIPLINE,
      canonicalCode: '0611',
      canonicalName: 'Computer Science',
      tuition: 50000,
      evidenceSnippet: 'Snippet',
    };

    const inputRecords = [
      {
        recordId: 'rec_immutable',
        recordType: 'NODE',
        payload: rawPayload,
      },
    ];

    const command: AcademicTaxonomyImportHandoffCommand = {
      seedBatchId: 'batch_immutable',
      sourceName: 'ISCED',
      sourceVersion: '2013',
      records: inputRecords,
    };

    service.prepareSeedBatch(command);

    expect(inputRecords[0].payload.tuition).toBe(50000);
    expect(inputRecords[0].payload.evidenceSnippet).toBe('Snippet');
  });

  it('handles NODE records', () => {
    const command: AcademicTaxonomyImportHandoffCommand = {
      seedBatchId: 'b_node',
      sourceName: 'ISCED',
      sourceVersion: '2013',
      records: [validNodeRecord],
    };

    const result = service.prepareSeedBatch(command);
    expect(result.validationSummary?.nodeRecords).toBe(1);
    expect(result.records[0].deterministicKey).toBe('CUSTOM_NATIONAL:DISCIPLINE:0611');
  });

  it('handles EDGE records', () => {
    const command: AcademicTaxonomyImportHandoffCommand = {
      seedBatchId: 'b_edge',
      sourceName: 'ISCED',
      sourceVersion: '2013',
      records: [validEdgeRecord],
      existingNodes,
    };

    const result = service.prepareSeedBatch(command);
    expect(result.validationSummary?.edgeRecords).toBe(1);
    expect(result.records[0].canBeApplied).toBe(true);
  });

  it('handles ALIAS records', () => {
    const command: AcademicTaxonomyImportHandoffCommand = {
      seedBatchId: 'b_alias',
      sourceName: 'ISCED',
      sourceVersion: '2013',
      records: [validAliasRecord],
      existingNodes,
    };

    const result = service.prepareSeedBatch(command);
    expect(result.validationSummary?.aliasRecords).toBe(1);
    expect(result.records[0].canBeApplied).toBe(true);
  });

  it('handles MAPPING records', () => {
    const command: AcademicTaxonomyImportHandoffCommand = {
      seedBatchId: 'b_mapping',
      sourceName: 'ISCED',
      sourceVersion: '2013',
      records: [validMappingRecord],
      existingNodes,
    };

    const result = service.prepareSeedBatch(command);
    expect(result.validationSummary?.mappingRecords).toBe(1);
    expect(result.records[0].canBeApplied).toBe(true);
  });

  it('handles unknown recordType producing invalid validated record without crashing', () => {
    const command: AcademicTaxonomyImportHandoffCommand = {
      seedBatchId: 'b_unknown',
      sourceName: 'ISCED',
      sourceVersion: '2013',
      records: [
        {
          recordId: 'rec_unk',
          recordType: 'UNKNOWN_TYPE' as any,
          payload: { foo: 'bar' },
        },
      ],
    };

    const result = service.prepareSeedBatch(command);
    expect(result.status).toBe(AcademicTaxonomySeedStatus.VALIDATED);
    expect(result.records[0].canBeApplied).toBe(false);
    expect(result.records[0].validationIssues).toContainEqual(
      expect.objectContaining({
        code: 'UNSUPPORTED_RECORD_TYPE',
        severity: AcademicTaxonomyValidationSeverity.ERROR,
      })
    );
  });

  it('leaves invalid record as VALIDATED and does not mark READY_TO_APPLY even if autoMarkReadyIfValid is true', () => {
    const invalidNodeRecord = {
      recordId: 'rec_invalid',
      recordType: 'NODE',
      payload: {
        nodeType: AcademicTaxonomyNodeType.DISCIPLINE,
        canonicalCode: '',
        canonicalName: '',
      },
    };

    const command: AcademicTaxonomyImportHandoffCommand = {
      seedBatchId: 'b_invalid_auto',
      sourceName: 'ISCED',
      sourceVersion: '2013',
      records: [invalidNodeRecord],
      autoMarkReadyIfValid: true,
    };

    const result = service.prepareSeedBatch(command);
    expect(result.status).toBe(AcademicTaxonomySeedStatus.VALIDATED);
    expect(result.validationSummary?.invalidRecords).toBe(1);
  });

  it('operates in-memory with no repository or database dependency required or called', () => {
    const command: AcademicTaxonomyImportHandoffCommand = {
      seedBatchId: 'b_in_memory',
      sourceName: 'ISCED',
      sourceVersion: '2013',
      records: [validNodeRecord],
    };

    const result = service.prepareSeedBatch(command);
    expect(result).toBeDefined();
    expect(result.seedBatchId).toBe('b_in_memory');
  });
});
