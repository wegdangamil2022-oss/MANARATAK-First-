import type { AtomicPersistenceContext } from '../event-foundation/outbox/TransactionalOutbox';
import {
  AcademicTaxonomyNodeDto,
  UpsertAcademicTaxonomyNodeDto,
  AcademicTaxonomyEdgeDto,
  UpsertAcademicTaxonomyEdgeDto,
  AcademicTaxonomyAliasDto,
  UpsertAcademicTaxonomyAliasDto,
  AcademicStandardMappingDto,
  UpsertAcademicStandardMappingDto,
  AcademicTaxonomyFilters,
} from './contracts';
import {
  AcademicTaxonomyNodeType,
  AcademicStandardType,
} from './enums';

export interface IAcademicTaxonomyRepository {
  /** Execute a hierarchy mutation against one serializable graph snapshot. */
  executeSerializable<T>(operation: (repository: IAcademicTaxonomyRepository) => Promise<T>): Promise<T>;

  withTransaction?(context: AtomicPersistenceContext): IAcademicTaxonomyRepository;
  createNode?(data: UpsertAcademicTaxonomyNodeDto): Promise<AcademicTaxonomyNodeDto>;

  countNodes?(filters?: AcademicTaxonomyFilters): Promise<number>;

  // Node methods
  listNodes(filters?: AcademicTaxonomyFilters): Promise<AcademicTaxonomyNodeDto[]>;
  getNode(nodeId: string): Promise<AcademicTaxonomyNodeDto | null>;
  getNodeByCanonicalKey(input: {
    nodeType: AcademicTaxonomyNodeType;
    canonicalCode: string;
    standardType?: AcademicStandardType;
  }): Promise<AcademicTaxonomyNodeDto | null>;
  upsertNode(data: UpsertAcademicTaxonomyNodeDto): Promise<AcademicTaxonomyNodeDto>;

  /** Optional only for compatibility adapters; governed edit fails closed when unavailable. */
  updateNode?(nodeId: string, data: UpsertAcademicTaxonomyNodeDto, expectedUpdatedAt: string): Promise<AcademicTaxonomyNodeDto>;

  // Hierarchy methods
  listEdges(): Promise<AcademicTaxonomyEdgeDto[]>;
  findEdgeByNodes(parentNodeId: string, childNodeId: string): Promise<AcademicTaxonomyEdgeDto | null>;
  listChildren(parentNodeId: string): Promise<AcademicTaxonomyNodeDto[]>;
  listParents(childNodeId: string): Promise<AcademicTaxonomyNodeDto[]>;
  addEdge(data: UpsertAcademicTaxonomyEdgeDto): Promise<AcademicTaxonomyEdgeDto>;
  removeEdge(edgeId: string): Promise<void>;

  // Alias methods
  listAliases(nodeId: string): Promise<AcademicTaxonomyAliasDto[]>;
  listAliasesByNormalizedAlias(normalizedAlias: string): Promise<AcademicTaxonomyAliasDto[]>;
  addAlias(data: UpsertAcademicTaxonomyAliasDto): Promise<AcademicTaxonomyAliasDto>;
  removeAlias(aliasId: string): Promise<void>;

  // Mapping methods
  listMappings(nodeId: string): Promise<AcademicStandardMappingDto[]>;
  addMapping(data: UpsertAcademicStandardMappingDto): Promise<AcademicStandardMappingDto>;
  removeMapping(mappingId: string): Promise<void>;
}
