import { 
  InternationalTestDto, 
  UpsertInternationalTestDto,
  InternationalTestFilters,
  PaginatedInternationalTestResult,
  InternationalTestVariantDto,
  UpsertInternationalTestVariantDto,
  InternationalTestSectionDto,
  UpsertInternationalTestSectionDto,
  InternationalTestScoreScaleDto,
  UpsertInternationalTestScoreScaleDto,
  InternationalTestFeeMetadataDto,
  UpsertInternationalTestFeeMetadataDto,
  InternationalTestOfficialLinkDto,
  UpsertInternationalTestOfficialLinkDto,
  InternationalTestAvailabilityDto,
  UpsertInternationalTestAvailabilityDto,
  InternationalTestPreparationMaterialDto,
  UpsertInternationalTestPreparationMaterialDto,
  InternationalTestEvidenceDto,
  InternationalTestImportDraftRequestDto,
  InternationalTestImportDraftResultDto,
  InternationalTestVersionDto,
  InternationalTestProviderDto,
  UpsertInternationalTestAcademicTaxonomyRelationshipDto,
  UpsertInternationalTestDegreeRelationshipReference,
  UpsertInternationalTestReferenceRelationshipDto
} from './contracts';
import { InternationalTestStatus } from './enums';
import { AtomicPersistenceContext } from '../event-foundation/outbox/TransactionalOutbox';

export interface IInternationalTestRepository {
  // Legacy / current application compatibility methods
  findById(id: string): Promise<InternationalTestDto | null>;
  findBySlug(slug: string): Promise<InternationalTestDto | null>;
  /** Public boundary: predicate is enforced in persistence, not after DTO mapping. */
  findPublishedBySlug(slug: string): Promise<InternationalTestDto | null>;
  findByDedupKey(dedupKey: string): Promise<InternationalTestDto | null>;
  create(data: UpsertInternationalTestDto): Promise<InternationalTestDto>;
  update(id: string, data: Partial<UpsertInternationalTestDto>): Promise<InternationalTestDto>;
  updateStatus(id: string, status: InternationalTestStatus): Promise<InternationalTestDto>;
  list(filters: InternationalTestFilters): Promise<PaginatedInternationalTestResult<InternationalTestDto>>;
  listPublished(filters?: Omit<InternationalTestFilters, 'status'>): Promise<PaginatedInternationalTestResult<InternationalTestDto>>;
  
  // Forward-looking Phase 09 profile methods
  listTests?(filters: InternationalTestFilters): Promise<PaginatedInternationalTestResult<InternationalTestDto>>;
  getTest?(id: string): Promise<InternationalTestDto | null>;
  getTestBySlug?(slug: string): Promise<InternationalTestDto | null>;
  getTestByDeterministicKey?(key: string): Promise<InternationalTestDto | null>;
  upsertTest?(data: UpsertInternationalTestDto): Promise<InternationalTestDto>;
  
  listVariants?(testId: string): Promise<InternationalTestVariantDto[]>;
  upsertVariant?(testId: string, data: UpsertInternationalTestVariantDto): Promise<InternationalTestVariantDto>;
  
  listSections?(testId: string): Promise<InternationalTestSectionDto[]>;
  upsertSection?(testId: string, data: UpsertInternationalTestSectionDto): Promise<InternationalTestSectionDto>;
  
  upsertScoreScale?(testId: string, data: UpsertInternationalTestScoreScaleDto): Promise<InternationalTestScoreScaleDto>;
  
  upsertFeeMetadata?(testId: string, data: UpsertInternationalTestFeeMetadataDto): Promise<InternationalTestFeeMetadataDto>;
  
  upsertOfficialLink?(testId: string, data: UpsertInternationalTestOfficialLinkDto): Promise<InternationalTestOfficialLinkDto>;
  
  listAvailability?(testId: string): Promise<InternationalTestAvailabilityDto | null>;
  upsertAvailability?(testId: string, data: UpsertInternationalTestAvailabilityDto): Promise<InternationalTestAvailabilityDto>;
  
  listPreparationMaterials?(testId: string): Promise<InternationalTestPreparationMaterialDto[]>;
  upsertPreparationMaterial?(testId: string, data: UpsertInternationalTestPreparationMaterialDto): Promise<InternationalTestPreparationMaterialDto>;
  
  listEvidence?(testId: string): Promise<InternationalTestEvidenceDto[]>;
  addEvidence?(testId: string, data: InternationalTestEvidenceDto): Promise<InternationalTestEvidenceDto>;

  createImportDraftVersion?(testId: string, data: InternationalTestImportDraftRequestDto): Promise<InternationalTestImportDraftResultDto>;
  listImportVersions?(testId: string): Promise<InternationalTestVersionDto[]>;
  findProviderById?(providerId: string): Promise<InternationalTestProviderDto | null>;
  listProviders?(search?: string): Promise<InternationalTestProviderDto[]>;
  upsertProvider?(data: Omit<InternationalTestProviderDto, 'id'> & { id?: string }): Promise<InternationalTestProviderDto>;
  upsertCountryRelationship?(testId: string, data: UpsertInternationalTestReferenceRelationshipDto): Promise<void>;
  upsertLanguageRelationship?(testId: string, data: UpsertInternationalTestReferenceRelationshipDto): Promise<void>;
  upsertAcademicTaxonomyRelationship?(testId: string, data: UpsertInternationalTestAcademicTaxonomyRelationshipDto): Promise<void>;
  upsertDegreeRelationship?(testId: string, data: UpsertInternationalTestDegreeRelationshipReference): Promise<void>;
}

export interface ITransactionalInternationalTestRepository extends IInternationalTestRepository {
  withTransaction(context: AtomicPersistenceContext): IInternationalTestRepository;
}
