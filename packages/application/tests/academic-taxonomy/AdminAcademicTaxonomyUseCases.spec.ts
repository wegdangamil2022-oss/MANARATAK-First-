import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AdminAcademicTaxonomyUseCases,
  AcademicTaxonomyImportHandoffCommand,
} from '../../src/academic-taxonomy';
import {
  IAcademicTaxonomyRepository,
  IAcademicTaxonomyValidationService,
  AcademicTaxonomyNodeDto,
  AcademicTaxonomyNodeType,
  AcademicTaxonomyStatus,
  AcademicStandardType,
  AcademicTaxonomyValidationSeverity,
  AcademicMappingStrength,
  AcademicTaxonomyEdgeDto,
  AcademicTaxonomyAliasDto,
  AcademicStandardMappingDto,
  AcademicTaxonomySeedStatus,
} from '@manaratak/domain';

describe('AdminAcademicTaxonomyUseCases', () => {
  const mockNode: AcademicTaxonomyNodeDto = {
    nodeId: 'node_parent',
    nodeType: AcademicTaxonomyNodeType.FIELD,
    canonicalCode: '06',
    canonicalName: 'ICT',
    status: AcademicTaxonomyStatus.ACTIVE,
    standardType: AcademicStandardType.CUSTOM_NATIONAL,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockChildNode: AcademicTaxonomyNodeDto = {
    nodeId: 'node_child',
    nodeType: AcademicTaxonomyNodeType.DISCIPLINE,
    canonicalCode: '0611',
    canonicalName: 'Computer Science',
    status: AcademicTaxonomyStatus.ACTIVE,
    standardType: AcademicStandardType.CUSTOM_NATIONAL,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockEdge: AcademicTaxonomyEdgeDto = {
    edgeId: 'edge_01',
    parentNodeId: 'node_parent',
    childNodeId: 'node_child',
    isPrimary: true,
    createdAt: new Date(),
  };

  const mockAlias: AcademicTaxonomyAliasDto = {
    aliasId: 'alias_01',
    nodeId: 'node_parent',
    alias: 'CompSci',
    normalizedAlias: 'compsci',
    locale: 'en',
    createdAt: new Date(),
  };

  const mockMapping: AcademicStandardMappingDto = {
    mappingId: 'map_01',
    sourceNodeId: 'node_parent',
    targetNodeId: 'node_child',
    sourceStandard: AcademicStandardType.ISCED,
    targetStandard: AcademicStandardType.CIP,
    strength: AcademicMappingStrength.EXACT,
    confidence: 0.9,
    createdAt: new Date(),
  };

  let mockRepo: IAcademicTaxonomyRepository;
  let mockValidationService: IAcademicTaxonomyValidationService;

  beforeEach(() => {
    mockRepo = {
      executeSerializable: vi.fn(),
      listNodes: vi.fn().mockResolvedValue([mockNode, mockChildNode]),
      getNode: vi.fn().mockResolvedValue(mockNode),
      getNodeByCanonicalKey: vi.fn().mockResolvedValue(mockNode),
      upsertNode: vi.fn().mockResolvedValue(mockNode),
      listChildren: vi.fn().mockResolvedValue([mockChildNode]),
      listParents: vi.fn().mockResolvedValue([]),
      listEdges: vi.fn().mockResolvedValue([mockEdge]),
      findEdgeByNodes: vi.fn().mockResolvedValue(mockEdge),
      addEdge: vi.fn().mockResolvedValue(mockEdge),
      removeEdge: vi.fn().mockResolvedValue(undefined),
      listAliases: vi.fn().mockResolvedValue([mockAlias]),
      listAliasesByNormalizedAlias: vi.fn().mockResolvedValue([mockAlias]),
      addAlias: vi.fn().mockResolvedValue(mockAlias),
      removeAlias: vi.fn().mockResolvedValue(undefined),
      listMappings: vi.fn().mockResolvedValue([mockMapping]),
      addMapping: vi.fn().mockResolvedValue(mockMapping),
      removeMapping: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(mockRepo.executeSerializable).mockImplementation(async (operation) => operation(mockRepo));

    mockValidationService = {
      validateNode: vi.fn().mockReturnValue({
        deterministicKey: 'DISCIPLINE|CUSTOM_NATIONAL|0611',
        requiredFields: ['nodeType', 'canonicalCode', 'canonicalName', 'status', 'standardType'],
        presentFields: ['nodeType', 'canonicalCode', 'canonicalName', 'status', 'standardType'],
        missingFields: [],
        isComplete: true,
        canBeReviewed: true,
        issues: [],
      }),
      validateEdge: vi.fn().mockReturnValue([]),
      validateAlias: vi.fn().mockReturnValue([]),
      validateMapping: vi.fn().mockReturnValue([]),
    };
  });

  it('validateNode delegates to validationService.validateNode', () => {
    const useCases = new AdminAcademicTaxonomyUseCases(mockRepo, mockValidationService);
    const input = {
      nodeType: AcademicTaxonomyNodeType.DISCIPLINE,
      canonicalCode: '0611',
      canonicalName: 'Computer Science',
    };

    const report = useCases.validateNode(input);

    expect(mockValidationService.validateNode).toHaveBeenCalledWith(input);
    expect(report.canBeReviewed).toBe(true);
  });

  it('upsertNode calls validation before repository.upsertNode and returns node with report', async () => {
    const useCases = new AdminAcademicTaxonomyUseCases(mockRepo, mockValidationService);
    const input = {
      nodeType: AcademicTaxonomyNodeType.DISCIPLINE,
      canonicalCode: '0611',
      canonicalName: 'Computer Science',
    };

    const result = await useCases.upsertNode(input);

    expect(mockValidationService.validateNode).toHaveBeenCalledWith(input);
    expect(mockRepo.upsertNode).toHaveBeenCalledWith(input);
    expect(result.node).toEqual(mockNode);
    expect(result.report.canBeReviewed).toBe(true);
  });

  it('upsertNode throws and does not call repository when validation has ERROR severity', async () => {
    vi.mocked(mockValidationService.validateNode).mockReturnValue({
      deterministicKey: 'UNKNOWN',
      requiredFields: ['nodeType', 'canonicalCode', 'canonicalName', 'status', 'standardType'],
      presentFields: ['nodeType', 'canonicalName', 'status', 'standardType'],
      missingFields: ['canonicalCode'],
      isComplete: false,
      canBeReviewed: false,
      issues: [
        {
          fieldName: 'canonicalCode',
          code: 'CANONICAL_CODE_REQUIRED',
          message: 'Code is required',
          severity: AcademicTaxonomyValidationSeverity.ERROR,
        },
      ],
    });

    const useCases = new AdminAcademicTaxonomyUseCases(mockRepo, mockValidationService);
    const input = {
      nodeType: AcademicTaxonomyNodeType.DISCIPLINE,
      canonicalCode: '',
      canonicalName: 'Computer Science',
    };

    await expect(useCases.upsertNode(input)).rejects.toThrow(
      'Node validation failed: CANONICAL_CODE_REQUIRED'
    );
    expect(mockRepo.upsertNode).not.toHaveBeenCalled();
  });

  it('upsertNode allows WARNING/INFO and persists node', async () => {
    vi.mocked(mockValidationService.validateNode).mockReturnValue({
      deterministicKey: 'DISCIPLINE|CUSTOM_NATIONAL|0611',
      requiredFields: ['nodeType', 'canonicalCode', 'canonicalName', 'status', 'standardType'],
      presentFields: ['nodeType', 'canonicalCode', 'canonicalName', 'status', 'standardType'],
      missingFields: [],
      isComplete: true,
      canBeReviewed: true,
      issues: [
        {
          fieldName: 'metadata',
          code: 'METADATA_RECOMMENDED',
          message: 'Metadata recommended',
          severity: AcademicTaxonomyValidationSeverity.WARNING,
        },
      ],
    });

    const useCases = new AdminAcademicTaxonomyUseCases(mockRepo, mockValidationService);
    const input = {
      nodeType: AcademicTaxonomyNodeType.DISCIPLINE,
      canonicalCode: '0611',
      canonicalName: 'Computer Science',
    };

    const result = await useCases.upsertNode(input);

    expect(mockRepo.upsertNode).toHaveBeenCalledWith(input);
    expect(result.node).toEqual(mockNode);
    expect(result.report.issues).toHaveLength(1);
  });

  it('addEdge calls validationService.validateEdge before repository.addEdge', async () => {
    const useCases = new AdminAcademicTaxonomyUseCases(mockRepo, mockValidationService);
    const edgeInput = {
      parentNodeId: 'node_parent',
      childNodeId: 'node_child',
    };

    const result = await useCases.addEdge(edgeInput);

    expect(mockRepo.executeSerializable).toHaveBeenCalledTimes(1);
    expect(mockRepo.listNodes).toHaveBeenCalled();
    expect(mockValidationService.validateEdge).toHaveBeenCalledWith({
      edge: edgeInput,
      existingNodes: [mockNode, mockChildNode],
      existingEdges: [mockEdge],
    });
    expect(mockRepo.addEdge).toHaveBeenCalledWith(edgeInput);
    expect(result).toEqual(mockEdge);
  });

  it('addEdge throws and does not call repository.addEdge on ERROR', async () => {
    vi.mocked(mockValidationService.validateEdge).mockReturnValue([
      {
        fieldName: 'childNodeId',
        code: 'CYCLE_DETECTED',
        message: 'Cycle detected',
        severity: AcademicTaxonomyValidationSeverity.ERROR,
      },
    ]);

    const useCases = new AdminAcademicTaxonomyUseCases(mockRepo, mockValidationService);
    const edgeInput = {
      parentNodeId: 'node_parent',
      childNodeId: 'node_parent',
    };

    await expect(useCases.addEdge(edgeInput)).rejects.toThrow(
      'Edge validation failed: CYCLE_DETECTED'
    );
    expect(mockRepo.addEdge).not.toHaveBeenCalled();
  });

  it('removeEdge delegates to repository.removeEdge', async () => {
    const useCases = new AdminAcademicTaxonomyUseCases(mockRepo, mockValidationService);

    await useCases.removeEdge('edge_01');

    expect(mockRepo.removeEdge).toHaveBeenCalledWith('edge_01');
  });

  it('addAlias fetches global normalized aliases and validates before addAlias', async () => {
    const useCases = new AdminAcademicTaxonomyUseCases(mockRepo, mockValidationService);
    const aliasInput = {
      nodeId: 'node_parent',
      alias: 'NewAlias',
      locale: 'en',
    };

    const result = await useCases.addAlias(aliasInput);

    expect(mockRepo.listAliasesByNormalizedAlias).toHaveBeenCalledWith('newalias');
    expect(mockValidationService.validateAlias).toHaveBeenCalledWith({
      alias: aliasInput,
      existingAliases: [mockAlias],
    });
    expect(mockRepo.addAlias).toHaveBeenCalledWith(aliasInput);
    expect(result).toEqual(mockAlias);
  });

  it('addAlias blocks a normalized alias already attached to another node', async () => {
    vi.mocked(mockRepo.listAliasesByNormalizedAlias).mockResolvedValue([
      {
        ...mockAlias,
        nodeId: 'different_node',
        alias: 'Computer Science',
        normalizedAlias: 'computer science',
      },
    ]);
    const useCases = new AdminAcademicTaxonomyUseCases(mockRepo);

    await expect(useCases.addAlias({
      nodeId: 'node_parent',
      alias: 'Computer Science',
      locale: 'en',
    })).rejects.toThrow('Alias validation failed: ALIAS_CONFLICT_OTHER_NODE');
    expect(mockRepo.addAlias).not.toHaveBeenCalled();
  });

  it('addAlias throws and does not call repository.addAlias on ERROR', async () => {
    vi.mocked(mockValidationService.validateAlias).mockReturnValue([
      {
        fieldName: 'alias',
        code: 'DUPLICATE_ALIAS',
        message: 'Duplicate alias',
        severity: AcademicTaxonomyValidationSeverity.ERROR,
      },
    ]);

    const useCases = new AdminAcademicTaxonomyUseCases(mockRepo, mockValidationService);
    const aliasInput = {
      nodeId: 'node_parent',
      alias: 'CompSci',
      locale: 'en',
    };

    await expect(useCases.addAlias(aliasInput)).rejects.toThrow(
      'Alias validation failed: DUPLICATE_ALIAS'
    );
    expect(mockRepo.addAlias).not.toHaveBeenCalled();
  });

  it('addMapping fetches repository.listMappings and validates before addMapping', async () => {
    const useCases = new AdminAcademicTaxonomyUseCases(mockRepo, mockValidationService);
    const mappingInput = {
      sourceNodeId: 'node_parent',
      targetNodeId: 'node_child',
      sourceStandard: AcademicStandardType.ISCED,
      targetStandard: AcademicStandardType.CIP,
      strength: AcademicMappingStrength.EXACT,
      confidence: 0.9,
    };

    vi.mocked(mockRepo.getNode)
      .mockResolvedValueOnce({ ...mockNode, standardType: AcademicStandardType.ISCED })
      .mockResolvedValueOnce({ ...mockChildNode, standardType: AcademicStandardType.CIP });

    const result = await useCases.addMapping(mappingInput);

    expect(mockRepo.listMappings).toHaveBeenCalledWith('node_parent');
    expect(mockValidationService.validateMapping).toHaveBeenCalledWith({
      mapping: mappingInput,
      existingMappings: [mockMapping],
      sourceNode: { ...mockNode, standardType: AcademicStandardType.ISCED },
      targetNode: { ...mockChildNode, standardType: AcademicStandardType.CIP },
    });
    expect(mockRepo.addMapping).toHaveBeenCalledWith(mappingInput);
    expect(result).toEqual(mockMapping);
  });

  it('addMapping throws and does not call repository.addMapping on ERROR', async () => {
    vi.mocked(mockValidationService.validateMapping).mockReturnValue([
      {
        fieldName: 'confidence',
        code: 'INVALID_CONFIDENCE_SCORE',
        message: 'Invalid confidence score',
        severity: AcademicTaxonomyValidationSeverity.ERROR,
      },
    ]);

    const useCases = new AdminAcademicTaxonomyUseCases(mockRepo, mockValidationService);
    const mappingInput = {
      sourceNodeId: 'node_parent',
      targetNodeId: 'node_child',
      sourceStandard: AcademicStandardType.ISCED,
      targetStandard: AcademicStandardType.CIP,
      strength: AcademicMappingStrength.EXACT,
      confidence: -0.5,
    };

    await expect(useCases.addMapping(mappingInput)).rejects.toThrow(
      'Mapping validation failed: INVALID_CONFIDENCE_SCORE'
    );
    expect(mockRepo.addMapping).not.toHaveBeenCalled();
  });

  it('prepareImportHandoff delegates to AcademicTaxonomyImportHandoffService without calling repository', () => {
    const useCases = new AdminAcademicTaxonomyUseCases(mockRepo, mockValidationService);
    const command: AcademicTaxonomyImportHandoffCommand = {
      seedBatchId: 'b_handoff_admin',
      sourceName: 'ISCED',
      sourceVersion: '2013',
      records: [
        {
          recordId: 'rec_1',
          recordType: 'NODE',
          payload: {
            nodeType: AcademicTaxonomyNodeType.DISCIPLINE,
            canonicalCode: '0611',
            canonicalName: 'Computer Science',
          },
        },
      ],
      autoMarkReadyIfValid: true,
    };

    const batch = useCases.prepareImportHandoff(command);

    expect(batch.seedBatchId).toBe('b_handoff_admin');
    expect(batch.status).toBe(AcademicTaxonomySeedStatus.READY_TO_APPLY);
    expect(mockRepo.upsertNode).not.toHaveBeenCalled();
    expect(mockRepo.addEdge).not.toHaveBeenCalled();
    expect(mockRepo.addAlias).not.toHaveBeenCalled();
    expect(mockRepo.addMapping).not.toHaveBeenCalled();
  });
  it('removeAlias delegates to repository.removeAlias', async () => {
    const useCases = new AdminAcademicTaxonomyUseCases(mockRepo, mockValidationService);
    await useCases.removeAlias('alias_01');
    expect(mockRepo.removeAlias).toHaveBeenCalledWith('alias_01');
  });
  it('removeMapping delegates to repository.removeMapping', async () => {
    const useCases = new AdminAcademicTaxonomyUseCases(mockRepo, mockValidationService);
    await useCases.removeMapping('mapping_01');
    expect(mockRepo.removeMapping).toHaveBeenCalledWith('mapping_01');
  });
});
