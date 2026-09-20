import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { AcademicTaxonomyAdminRouter } from '../../../../src/presentation/api/router/AcademicTaxonomyAdminRouter';
import {
  AcademicTaxonomyNodeType,
  AcademicTaxonomyStatus,
  AcademicStandardType,
  AcademicTaxonomyNodeDto,
  AcademicTaxonomyEdgeDto,
  AcademicTaxonomyAliasDto,
  AcademicStandardMappingDto,
  AcademicMappingStrength,
  AcademicTaxonomySeedStatus,
} from '@manaratak/domain';

describe('AcademicTaxonomyAdminRouter', () => {
  const mockNode: AcademicTaxonomyNodeDto = {
    nodeId: 'node_001',
    nodeType: AcademicTaxonomyNodeType.DISCIPLINE,
    canonicalCode: '0611',
    canonicalName: 'Computer Science',
    status: AcademicTaxonomyStatus.ACTIVE,
    standardType: AcademicStandardType.CUSTOM_NATIONAL,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockEdge: AcademicTaxonomyEdgeDto = {
    edgeId: 'edge_001',
    parentNodeId: 'node_parent',
    childNodeId: 'node_child',
    isPrimary: true,
    createdAt: new Date(),
  };

  const mockAlias: AcademicTaxonomyAliasDto = {
    aliasId: 'alias_001',
    nodeId: 'node_001',
    alias: 'CS',
    normalizedAlias: 'cs',
    createdAt: new Date(),
  };

  const mockMapping: AcademicStandardMappingDto = {
    mappingId: 'mapping_001',
    sourceNodeId: 'node_001',
    targetNodeId: 'node_002',
    sourceStandard: AcademicStandardType.ISCED,
    targetStandard: AcademicStandardType.CIP,
    strength: AcademicMappingStrength.EXACT,
    createdAt: new Date(),
  };

  const createUseCases = () => ({
    validateNode: vi.fn(),
    upsertNode: vi.fn(),
    addEdge: vi.fn(),
    removeEdge: vi.fn(),
    removeEdgeByNodes: vi.fn(),
    addAlias: vi.fn(),
    addMapping: vi.fn(),
    prepareImportHandoff: vi.fn(),
  });

  const createApp = (useCases: ReturnType<typeof createUseCases>) => {
    const degreeLevelUseCases = {
      list: vi.fn().mockResolvedValue([]),
      getById: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue(null),
    };
    const app = express();
    const adminMajorUseCases = {
      listByTaxonomyNode: vi.fn().mockResolvedValue([]),
    };
    app.use(express.json());
    app.use((req, _res, next) => {
      (req as any).authUserId = 'admin-taxonomy-1';
      next();
    });
    app.use(
      '/admin/academic-taxonomy',
      AcademicTaxonomyAdminRouter.create({
        adminAcademicTaxonomyUseCases: useCases as any,
        adminMajorUseCases: adminMajorUseCases as any,
        degreeLevelUseCases: degreeLevelUseCases as any,
      }),
    );
    return app;
  };

  it('GET /admin/academic-taxonomy/nodes/:nodeId/mapped-majors returns Major-owned mappings', async () => {
    const useCases = createUseCases();
    const degreeLevelUseCases = { list: vi.fn(), getById: vi.fn(), update: vi.fn() };
    const adminMajorUseCases = {
      listByTaxonomyNode: vi
        .fn()
        .mockResolvedValue([{ id: 'mapping-1', relationshipType: 'PRIMARY' }]),
    };
    const app = express();
    app.use(
      '/admin/academic-taxonomy',
      AcademicTaxonomyAdminRouter.create({
        adminAcademicTaxonomyUseCases: useCases as any,
        adminMajorUseCases: adminMajorUseCases as any,
        degreeLevelUseCases: degreeLevelUseCases as any,
      }),
    );

    const res = await request(app).get('/admin/academic-taxonomy/nodes/taxonomy-1/mapped-majors');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([{ id: 'mapping-1', relationshipType: 'PRIMARY' }]);
    expect(adminMajorUseCases.listByTaxonomyNode).toHaveBeenCalledWith('taxonomy-1');
  });

  it('POST /admin/academic-taxonomy/nodes/validate calls validateNode and returns report', async () => {
    const useCases = createUseCases();
    useCases.validateNode.mockReturnValue({
      canBeReviewed: true,
      completenessScore: 100,
      issues: [],
    });
    const app = createApp(useCases);

    const input = {
      nodeType: AcademicTaxonomyNodeType.DISCIPLINE,
      canonicalCode: '0611',
      canonicalName: 'Computer Science',
      description: 'Test description',
      standardCode: 'STD001',
    };

    const res = await request(app).post('/admin/academic-taxonomy/nodes/validate').send(input);

    expect(res.status).toBe(200);
    expect(res.body.completenessScore).toBe(100);
    expect(useCases.validateNode).toHaveBeenCalledWith(input);
  });

  it('PUT /admin/academic-taxonomy/nodes calls upsertNode and returns { node, report }', async () => {
    const useCases = createUseCases();
    useCases.upsertNode.mockResolvedValue({
      node: mockNode,
      report: { canBeReviewed: true, completenessScore: 100, issues: [] },
    });
    const app = createApp(useCases);

    const input = {
      nodeType: AcademicTaxonomyNodeType.DISCIPLINE,
      canonicalCode: '0611',
      canonicalName: 'Computer Science',
      description: 'Test description',
      standardCode: 'STD001',
    };

    const res = await request(app).put('/admin/academic-taxonomy/nodes').send(input);

    expect(res.status).toBe(200);
    expect(res.body.node.nodeId).toBe('node_001');
    expect(useCases.upsertNode).toHaveBeenCalledWith(input);
  });

  it('PUT /admin/academic-taxonomy/nodes returns 400 for invalid body without calling use case', async () => {
    const useCases = createUseCases();
    const app = createApp(useCases);

    const res = await request(app).put('/admin/academic-taxonomy/nodes').send({});

    expect(res.status).toBe(400);
    expect(useCases.upsertNode).not.toHaveBeenCalled();
  });

  it('POST /admin/academic-taxonomy/edges calls addEdge', async () => {
    const useCases = createUseCases();
    useCases.addEdge.mockResolvedValue(mockEdge);
    const app = createApp(useCases);

    const input = {
      parentNodeId: 'node_parent',
      childNodeId: 'node_child',
    };

    const res = await request(app).post('/admin/academic-taxonomy/edges').send(input);

    expect(res.status).toBe(200);
    expect(res.body.edgeId).toBe('edge_001');
    expect(useCases.addEdge).toHaveBeenCalledWith(input);
  });

  it('DELETE /admin/academic-taxonomy/edges/:edgeId calls removeEdge', async () => {
    const useCases = createUseCases();
    useCases.removeEdge.mockResolvedValue(undefined);
    const app = createApp(useCases);

    const res = await request(app).delete('/admin/academic-taxonomy/edges/edge_001');

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(useCases.removeEdge).toHaveBeenCalledWith('edge_001');
  });

  it('POST /admin/academic-taxonomy/aliases calls addAlias', async () => {
    const useCases = createUseCases();
    useCases.addAlias.mockResolvedValue(mockAlias);
    const app = createApp(useCases);

    const input = {
      nodeId: 'node_001',
      alias: 'CS',
    };

    const res = await request(app).post('/admin/academic-taxonomy/aliases').send(input);

    expect(res.status).toBe(200);
    expect(res.body.aliasId).toBe('alias_001');
    expect(useCases.addAlias).toHaveBeenCalledWith(input);
  });

  it('POST /admin/academic-taxonomy/mappings calls addMapping', async () => {
    const useCases = createUseCases();
    useCases.addMapping.mockResolvedValue(mockMapping);
    const app = createApp(useCases);

    const input = {
      sourceNodeId: 'node_001',
      targetNodeId: 'node_002',
      sourceStandard: AcademicStandardType.ISCED,
      targetStandard: AcademicStandardType.CIP,
      strength: AcademicMappingStrength.EXACT,
    };

    const res = await request(app).post('/admin/academic-taxonomy/mappings').send(input);

    expect(res.status).toBe(200);
    expect(res.body.mappingId).toBe('mapping_001');
    expect(useCases.addMapping).toHaveBeenCalledWith(input);
  });

  it('POST /admin/academic-taxonomy/import-handoff calls prepareImportHandoff', async () => {
    const useCases = createUseCases();
    const mockBatch = {
      seedBatchId: 'b_001',
      status: AcademicTaxonomySeedStatus.READY_TO_APPLY,
      records: [],
    };
    useCases.prepareImportHandoff.mockReturnValue(mockBatch);
    const app = createApp(useCases);

    const input = {
      seedBatchId: 'b_001',
      sourceName: 'ISCED',
      sourceVersion: '2013',
      records: [],
    };

    const res = await request(app).post('/admin/academic-taxonomy/import-handoff').send(input);

    expect(res.status).toBe(200);
    expect(res.body.seedBatchId).toBe('b_001');
    expect(res.body.status).not.toBe('APPLIED');
    expect(useCases.prepareImportHandoff).toHaveBeenCalledWith(input);
  });

  it('admin router does not expose publish/auto-merge endpoint', async () => {
    const useCases = createUseCases();
    const app = createApp(useCases);

    const res1 = await request(app).post('/admin/academic-taxonomy/publish').send({});
    const res2 = await request(app).post('/admin/academic-taxonomy/merge').send({});

    expect(res1.status).toBe(404);
    expect(res2.status).toBe(404);
  });
});
