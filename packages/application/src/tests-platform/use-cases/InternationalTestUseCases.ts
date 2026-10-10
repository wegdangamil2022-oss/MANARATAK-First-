import { randomUUID } from 'node:crypto';
import { assertInternationalTestTransition, publicInternationalTest, assertOfficialTestUrl } from '@manaratak/domain';
import { AssetReferencePolicy, assertAssetReferenceUsable } from '../../asset-platform/AssetReferencePolicy';
import {
  validateInternationalTestScorePolicy,
  validateInternationalTestSectionScore,
  IInternationalTestRepository,
  ITransactionalInternationalTestRepository,
  InternationalTestDto,
  InternationalTestFilters,
  InternationalTestStatus,
  PaginatedInternationalTestResult,
  UpsertInternationalTestDto,
  InternationalTestValidationService,
  IInternationalTestValidationService,
  InternationalTestValidationSeverity,
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
  ReviewInternationalTestSourceNamesDto,
  CorrectDraftInternationalTestCanonicalIdentityDto,
  InternationalTestDeduplicationService,
  InternationalTestPublicationReadinessPolicy,
  PublicationReadinessEngine,
  PublicationReadinessResult,
  IReferenceResolver,
  IDegreeLevelRepository,
  IAcademicTaxonomyRepository
} from '@manaratak/domain';
import { assertNoTranslationPayloadFields } from '@manaratak/shared';
import { AtomicDomainMutationCoordinator, AtomicMutationRequestContext } from '../../event-foundation/use-cases/AtomicDomainMutationCoordinator';
type TestMutationContext = AtomicMutationRequestContext & { expectedRevision?: number; reason?: string };
import { InternationalTestCanonicalRelationshipService } from './InternationalTestCanonicalRelationshipService';

export class InternationalTestAdminUseCases {
  private readonly canonicalRelationshipService: InternationalTestCanonicalRelationshipService;

  constructor(
    private readonly repository: IInternationalTestRepository,
    private readonly validationService: IInternationalTestValidationService = new InternationalTestValidationService(),
    private readonly publicationReadiness = new PublicationReadinessEngine(),
    private readonly publicationPolicy = new InternationalTestPublicationReadinessPolicy(validationService),
    private readonly referenceResolver?: IReferenceResolver,
    degreeLevelRepository?: IDegreeLevelRepository,
    private readonly atomicMutations?: AtomicDomainMutationCoordinator,
    academicTaxonomyRepository?: IAcademicTaxonomyRepository,
    private readonly assetReferences?: AssetReferencePolicy,
  ) {
    this.canonicalRelationshipService = new InternationalTestCanonicalRelationshipService(
      referenceResolver,
      degreeLevelRepository,
      academicTaxonomyRepository,
    );
  }

  public async list(filters: InternationalTestFilters): Promise<PaginatedInternationalTestResult<InternationalTestDto>> {
    return this.repository.list(filters);
  }

  public async get(id: string): Promise<InternationalTestDto> {
    const test = await this.repository.findById(id);
    if (!test) throw new Error(`International test with id ${id} not found`);
    return test;
  }

  public async createTest(data: UpsertInternationalTestDto, context?: TestMutationContext): Promise<InternationalTestDto> {
    if (['isPubliclyVisible','isSourceVerified','currentPublishedVersionId'].some(key => data[key] !== undefined)) throw new Error('INTERNATIONAL_TEST_GOVERNANCE_FIELDS_FORBIDDEN');
    if (data.status && !['IMPORTED','READY_TO_REVIEW','NEEDS_REVIEW'].includes(data.status)) throw new Error('INTERNATIONAL_TEST_CREATE_STATUS_INVALID');
    assertNoTranslationPayloadFields('INTERNATIONAL_TEST', data as unknown as Record<string, unknown>, ['localizedNameAr', 'localizedNameEn']);
    const canonicalData = { ...data, ...(await this.canonicalRelationshipService.canonicalize(data)), ...(await this.canonicalizeProvider(data)) };
    const report = this.validationService.validate(canonicalData);
    const hasErrors = report.issues.some(i => i.severity === InternationalTestValidationSeverity.ERROR);
    if (hasErrors) {
      const errorMsg = report.issues.map(i => `${i.field}: ${i.message}`).join('; ');
      throw new Error(`Validation failed for international test creation: ${errorMsg}`);
    }
    const id=typeof data.id==='string'?data.id:randomUUID();
    const canonicalName=canonicalData.canonicalName.trim();
    const prepared={...canonicalData,id,publicId:typeof data.publicId==='string'?data.publicId:`ITEST_${id}`,slug:typeof data.slug==='string'?data.slug:`${canonicalName.normalize('NFKD').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-|-$/g,'')}-${id.slice(0,8)}`,displayName:typeof data.displayName==='string'?data.displayName:canonicalName,canonicalDedupKey:InternationalTestDeduplicationService.generateKey({canonicalName,providerName:canonicalData.providerName}),status:canonicalData.status??InternationalTestStatus.READY_TO_REVIEW,completenessStatus:report.status};
    return this.mutate('INTERNATIONAL_TEST_CREATED',id,context,repository=>repository.create(prepared));
  }

  public async updateTest(id: string, data: Partial<UpsertInternationalTestDto>, context?: TestMutationContext): Promise<InternationalTestDto> {
    if (['isPubliclyVisible','isSourceVerified','currentPublishedVersionId'].some(key => data[key] !== undefined)) throw new Error('INTERNATIONAL_TEST_GOVERNANCE_FIELDS_FORBIDDEN');
    assertNoTranslationPayloadFields('INTERNATIONAL_TEST', data as unknown as Record<string, unknown>, ['localizedNameAr', 'localizedNameEn']);
    const canonicalData = { ...data, ...(await this.canonicalRelationshipService.canonicalize(data)), ...(await this.canonicalizeProvider(data)) };
    const existing = await this.get(id);
    const merged = { ...existing, ...canonicalData };
    const report = this.validationService.validate(merged);
    const hasErrors = report.issues.some(i => i.severity === InternationalTestValidationSeverity.ERROR);
    if (hasErrors) {
      const errorMsg = report.issues.map(i => `${i.field}: ${i.message}`).join('; ');
      throw new Error(`Validation failed for international test update: ${errorMsg}`);
    }
    return this.mutate('INTERNATIONAL_TEST_UPDATED', id, context, repository => repository.update(id, canonicalData));
  }

  public async addCanonicalRelationship(id: string, input: {
    kind: 'COUNTRY' | 'LANGUAGE' | 'TAXONOMY' | 'DEGREE'; referenceId: string;
    relationshipType: string; reason: string; evidenceReference: string;
  }, context?: TestMutationContext): Promise<void> {
    if (!this.atomicMutations || !context?.actorId) throw new Error('INTERNATIONAL_TEST_GRAPH_AUDITED_ACTOR_REQUIRED');
    if (!input.reason.trim() || !input.evidenceReference.trim() || !input.relationshipType.trim()) throw new Error('INTERNATIONAL_TEST_GRAPH_REVIEW_REQUIRED');
    await this.mutate('INTERNATIONAL_TEST_CANONICAL_RELATIONSHIP_ADDED', id, context, async repository => {
      if (!repository.acquireGraphMutationLock) throw new Error('INTERNATIONAL_TEST_GRAPH_TRANSACTION_REQUIRED');
      await repository.acquireGraphMutationLock(id, input.kind, input.referenceId);
      const test = await repository.findById(id);
      if (!test || test.id !== id) throw new Error('INTERNATIONAL_TEST_GRAPH_OWNER_NOT_FOUND');
      if (['ARCHIVED', 'SUPERSEDED', 'REJECTED', 'MERGED'].includes(test.status)) throw new Error('INTERNATIONAL_TEST_GRAPH_OWNER_IMMUTABLE');
      const common = { relationshipType: input.relationshipType.trim(), notes: input.reason.trim(), metadata: { source: 'ADMIN_REVIEW', evidenceReference: input.evidenceReference.trim() } };
      const duplicate = <T extends { relationshipType: string }>(relationships: T[] | undefined, reference: (item: T) => string | undefined) => {
        if (relationships?.some(item => reference(item) === input.referenceId && item.relationshipType === common.relationshipType)) throw new Error('INTERNATIONAL_TEST_GRAPH_DUPLICATE_RELATIONSHIP');
      };
      if (input.kind === 'COUNTRY' || input.kind === 'LANGUAGE') {
        const country = input.kind === 'COUNTRY';
        const relationships = country ? test.countryRelationships : test.languageRelationships;
        duplicate(relationships, item => item.canonicalReferenceId);
        const data = { canonicalReferenceId: input.referenceId, ...common };
        const resolved = await this.canonicalRelationshipService.canonicalize(country ? { countryRelationships: [data] } : { languageRelationships: [data] });
        if (country) {
          if (!repository.upsertCountryRelationship) throw new Error('COUNTRY_RELATIONSHIP_WRITER_REQUIRED');
          await repository.upsertCountryRelationship(id, resolved.countryRelationships![0]);
        } else {
          if (!repository.upsertLanguageRelationship) throw new Error('LANGUAGE_RELATIONSHIP_WRITER_REQUIRED');
          await repository.upsertLanguageRelationship(id, resolved.languageRelationships![0]);
        }
      } else if (input.kind === 'TAXONOMY') {
        duplicate(test.academicTaxonomyRelationships, item => item.taxonomyNodeId);
        const resolved = await this.canonicalRelationshipService.canonicalize({ academicTaxonomyRelationships: [{ taxonomyNodeId: input.referenceId, ...common }] });
        if (!repository.upsertAcademicTaxonomyRelationship) throw new Error('TAXONOMY_RELATIONSHIP_WRITER_REQUIRED');
        await repository.upsertAcademicTaxonomyRelationship(id, resolved.academicTaxonomyRelationships![0]);
      } else {
        duplicate(test.degreeRelationships, item => item.degreeLevelId);
        const resolved = await this.canonicalRelationshipService.canonicalize({ degreeRelationships: [{ degreeLevelId: input.referenceId, ...common }] });
        if (!repository.upsertDegreeRelationship) throw new Error('DEGREE_RELATIONSHIP_WRITER_REQUIRED');
        await repository.upsertDegreeRelationship(id, resolved.degreeRelationships![0]);
      }
    }, { kind: input.kind, referenceId: input.referenceId, relationshipType: input.relationshipType, reason: input.reason, evidenceReference: input.evidenceReference });
  }

  public async upsertTest(data:UpsertInternationalTestDto,context?:TestMutationContext):Promise<InternationalTestDto> {
    // Compatibility creation alias. Existing records require their explicit owner/revision update.
    return this.createTest(data,context);
  }

  public async markReadyToPublish(id: string, context?: TestMutationContext): Promise<void> {
    await this.mutate('INTERNATIONAL_TEST_APPROVED', id, context, async repository => {
      const test = await repository.findById(id); if (!test) throw new Error('INTERNATIONAL_TEST_NOT_FOUND');
      assertInternationalTestTransition(test.status,InternationalTestStatus.READY_TO_PUBLISH);
      if (!repository.govern) throw new Error('INTERNATIONAL_TEST_GOVERNANCE_REQUIRED');
      await repository.govern(id,'APPROVE',{reason:context?.reason},context!.actorId);
      await repository.update(id,{status:InternationalTestStatus.READY_TO_PUBLISH});
    });
  }

  public async checkPublicationReadiness(id: string): Promise<PublicationReadinessResult> {
    const test = await this.get(id);
    const result=this.publicationReadiness.evaluate(id,test,this.publicationPolicy);
    if(!this.repository.govern) throw new Error('INTERNATIONAL_TEST_GOVERNANCE_REQUIRED');
    const owner=await this.repository.govern(id,'READINESS',{},'') as {blockers:string[]};
    const blockingIssues=[...result.blockingIssues,...owner.blockers.map(code=>({code,message:code,field:'sourceReview'}))];
    return {...result,blockingIssues,ready:blockingIssues.length===0};
  }

  public async publish(id: string, context?: TestMutationContext): Promise<void> {
    await this.mutate('INTERNATIONAL_TEST_PUBLISHED',id,context,async repository=>{
      const test = await repository.findById(id); if (!test) throw new Error('INTERNATIONAL_TEST_NOT_FOUND');
      assertInternationalTestTransition(test.status,InternationalTestStatus.PUBLISHED);
      if (!repository.govern) throw new Error('INTERNATIONAL_TEST_GOVERNANCE_REQUIRED');
      const result = await repository.govern(id,'PUBLISH',{reason:context?.reason},context!.actorId) as {versionId:string};
      await repository.update(id,{status:InternationalTestStatus.PUBLISHED,isPubliclyVisible:true,currentPublishedVersionId:result.versionId});
    });
  }
  public async unpublish(id:string,context?:TestMutationContext):Promise<void> {
    await this.transition(id,InternationalTestStatus.READY_TO_PUBLISH,context,true);
  }
  public async archive(id:string,context?:TestMutationContext):Promise<void> {
    await this.transition(id,InternationalTestStatus.ARCHIVED,context,true);
  }
  public async transition(id:string,to:InternationalTestStatus,context?:TestMutationContext,hide=false):Promise<void> {
    await this.mutate('INTERNATIONAL_TEST_'+to,id,context,async repository=>{
      const test=await repository.findById(id); if (!test) throw new Error('INTERNATIONAL_TEST_NOT_FOUND');
      assertInternationalTestTransition(test.status,to);
      await repository.update(id,{status:to,...(hide?{isPubliclyVisible:false}:{})});
    },{reason:context?.reason});
  }
  public async govern(id:string,action:string,input:Record<string,unknown>,context?:TestMutationContext):Promise<unknown> {
    if (action === 'HISTORY') { if (!this.repository.govern) throw new Error('INTERNATIONAL_TEST_GOVERNANCE_REQUIRED'); return this.repository.govern(id,action,input,context?.actorId??''); }
    return this.mutate('INTERNATIONAL_TEST_'+action,id,context,async repository=>{
      if (!repository.govern) throw new Error('INTERNATIONAL_TEST_GOVERNANCE_REQUIRED');
      const result=await repository.govern(id,action,input,context!.actorId);
      if (action==='REVOKE') await repository.update(id,{isSourceVerified:false,isPubliclyVisible:false,status:InternationalTestStatus.NEEDS_REVIEW});
      return result;
    },{reason:input.reason,kind:input.kind,versionId:input.versionId,sourceHash:input.sourceHash,blockId:input.blockId,decision:input.decision,mappingReference:input.mappingReference});
  }
  public async manualNames(id:string,input:{localizedNameAr:string;localizedNameEn:string;reason:string},context?:TestMutationContext):Promise<InternationalTestDto> {
    if (!input.localizedNameAr.trim() || !input.localizedNameEn.trim() || !input.reason.trim()) throw new Error('LOCALIZED_NAMES_AND_REASON_REQUIRED');
    return this.mutate('INTERNATIONAL_TEST_MANUAL_NAMES_REVIEWED',id,context,async repository=>{
      if ((await repository.listImportVersions?.(id))?.some(version=>version.sourceHash&&version.metadata?.publicationSnapshot!==true)) throw new Error('INTERNATIONAL_TEST_IMPORTED_NAME_REVIEW_REQUIRED');
      return repository.update(id,{localizedNameAr:input.localizedNameAr.trim(),localizedNameEn:input.localizedNameEn.trim()});
    },{reason:input.reason});
  }

  public async listProviders(search?: string, page = 1): Promise<InternationalTestProviderDto[]> {
    if (!this.repository.listProviders) return [];
    return this.repository.listProviders(search,page);
  }

  public async upsertProvider(data: Omit<InternationalTestProviderDto, 'id'> & { id?: string }, context?: TestMutationContext): Promise<InternationalTestProviderDto> {
    if (!this.repository.upsertProvider) throw new Error('Repository method upsertProvider not implemented');
    const key = data.key?.trim();
    const displayName = data.displayName?.trim();
    if (!key || !displayName) throw new Error('PROVIDER_KEY_AND_DISPLAY_NAME_REQUIRED');
    const normalized = {
      ...data,
      key: key.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, ''),
      displayName,
      countryIso2Code: data.countryIso2Code?.trim().toUpperCase(),
    };
    return this.mutate('INTERNATIONAL_TEST_PROVIDER_UPSERTED', data.id || normalized.key, context, repository => {
      if (!repository.upsertProvider) throw new Error('Repository method upsertProvider not implemented');
      return repository.upsertProvider(normalized);
    });
  }

  public async verifySource(id:string,context?:TestMutationContext):Promise<void> {
    await this.mutate('INTERNATIONAL_TEST_SOURCE_VERIFIED',id,context,async repository=>{
      if (!repository.govern) throw new Error('INTERNATIONAL_TEST_GOVERNANCE_REQUIRED');
      await repository.govern(id,'VERIFY',{reason:context?.reason},context!.actorId);
      await repository.update(id,{isSourceVerified:true});
    },{reason:context?.reason});
  }

  public async reviewSourceNames(id: string, input: ReviewInternationalTestSourceNamesDto, context?: TestMutationContext): Promise<InternationalTestDto> {
    const test = await this.get(id);
    const versions = await this.listImportVersions(id);
    const version = this.repository.findImportVersion?await this.repository.findImportVersion(id,input.versionId):versions.find(v => v.id === input.versionId);
    if (!version || version.testId !== id) {
      throw new Error(`Import version ${input.versionId} does not belong to test ${id}`);
    }
    if (!version.sourceHash || version.sourceHash !== input.sourceHash) {
      throw new Error('TEST_IMPORT_SOURCE_HASH_MISMATCH');
    }
    if (!input.reviewReason?.trim()) {
      throw new Error('REVIEW_REASON_REQUIRED');
    }
    if (!input.evidenceReference?.trim()) {
      throw new Error('EVIDENCE_REFERENCE_REQUIRED');
    }
    const nameAr = input.localizedNameAr?.trim();
    const nameEn = input.localizedNameEn?.trim();
    if (!nameAr || !nameEn) {
      throw new Error('LOCALIZED_NAMES_REQUIRED');
    }

    if (input.expectedCurrentLocalizedNameAr !== undefined && (test.localizedNameAr ?? null) !== (input.expectedCurrentLocalizedNameAr ?? null)) {
      throw new Error('CONFLICTING_LOCALIZED_NAME_AR_MODIFICATION');
    }
    if (input.expectedCurrentLocalizedNameEn !== undefined && (test.localizedNameEn ?? null) !== (input.expectedCurrentLocalizedNameEn ?? null)) {
      throw new Error('CONFLICTING_LOCALIZED_NAME_EN_MODIFICATION');
    }

    if (test.localizedNameAr && test.localizedNameAr !== nameAr && input.expectedCurrentLocalizedNameAr === undefined) {
      throw new Error('CONFLICTING_LOCALIZED_NAME_AR_ALREADY_SET');
    }
    if (test.localizedNameEn && test.localizedNameEn !== nameEn && input.expectedCurrentLocalizedNameEn === undefined) {
      throw new Error('CONFLICTING_LOCALIZED_NAME_EN_ALREADY_SET');
    }

    if (test.localizedNameAr === nameAr && test.localizedNameEn === nameEn) {
      return test;
    }

    return this.mutate(
      'INTERNATIONAL_TEST_SOURCE_NAMES_REVIEWED',
      id,
      context,
      async (repository) => {
        const current = await this.lockSourceReviewOwner(repository, id);
        const currentVersions = repository.findImportVersion?[await repository.findImportVersion(id,input.versionId)].filter((v):v is InternationalTestVersionDto=>v!==null):await repository.listImportVersions?.(id);
        if (!currentVersions?.some(v => v.id === input.versionId && v.testId === id && v.sourceHash === input.sourceHash)) {
          throw new Error('TEST_IMPORT_SOURCE_HASH_MISMATCH');
        }
        if ((current.localizedNameAr ?? null) !== (test.localizedNameAr ?? null)
          || (current.localizedNameEn ?? null) !== (test.localizedNameEn ?? null)) {
          throw new Error('CONFLICTING_LOCALIZED_NAME_MODIFICATION');
        }
        return repository.update(id, {
          localizedNameAr: nameAr,
          localizedNameEn: nameEn,
        });
      },
      {
        versionId: input.versionId,
        sourceHash: input.sourceHash,
        localizedNameAr: nameAr,
        localizedNameEn: nameEn,
        reviewReason: input.reviewReason.trim(),
        evidenceReference: input.evidenceReference.trim(),
      }
    );
  }

  public async correctDraftCanonicalIdentity(
    id: string,
    input: CorrectDraftInternationalTestCanonicalIdentityDto,
    context?: TestMutationContext
  ): Promise<InternationalTestDto> {
    const test = await this.get(id);
    if ([InternationalTestStatus.PUBLISHED, InternationalTestStatus.ARCHIVED, InternationalTestStatus.REJECTED].includes(test.status) || test.currentPublishedVersionId != null) {
      throw new Error('CANNOT_CORRECT_PUBLISHED_INTERNATIONAL_TEST_IDENTITY');
    }

    const versions = await this.listImportVersions(id);
    const version = this.repository.findImportVersion?await this.repository.findImportVersion(id,input.versionId):versions.find(v => v.id === input.versionId);
    if (!version || version.testId !== id) {
      throw new Error(`Import version ${input.versionId} does not belong to test ${id}`);
    }
    if (!version.sourceHash || version.sourceHash !== input.sourceHash) {
      throw new Error('TEST_IMPORT_SOURCE_HASH_MISMATCH');
    }

    if (!input.correctionReason?.trim()) {
      throw new Error('CORRECTION_REASON_REQUIRED');
    }
    if (!input.evidenceReference?.trim()) {
      throw new Error('EVIDENCE_REFERENCE_REQUIRED');
    }

    const newCanonical = input.newCanonicalName?.trim();
    if (!newCanonical) {
      throw new Error('CANONICAL_NAME_REQUIRED');
    }
    const newDisplayName = input.newDisplayName?.trim() || newCanonical;

    if (
      input.expectedCurrentCanonicalName !== undefined &&
      (test.canonicalName ?? null) !== (input.expectedCurrentCanonicalName?.trim() ?? null)
    ) {
      throw new Error('CONFLICTING_CANONICAL_NAME_MODIFICATION');
    }

    const newDedupKey = InternationalTestDeduplicationService.generateKey({
      canonicalName: newCanonical,
      providerName: test.providerName
    });

    if (this.repository.findByDedupKey) {
      const existingCollision = await this.repository.findByDedupKey(newDedupKey);
      if (existingCollision && existingCollision.id !== id) {
        throw new Error('INTERNATIONAL_TEST_CANONICAL_IDENTITY_COLLISION');
      }
    }

    if (
      test.canonicalName === newCanonical &&
      test.displayName === newDisplayName &&
      test.canonicalDedupKey === newDedupKey
    ) {
      return test;
    }

    return this.mutate(
      'INTERNATIONAL_TEST_DRAFT_CANONICAL_IDENTITY_CORRECTED',
      id,
      context,
      async (repository) => {
        const current = await this.lockSourceReviewOwner(repository, id);
        if ([InternationalTestStatus.PUBLISHED, InternationalTestStatus.ARCHIVED, InternationalTestStatus.REJECTED].includes(current.status) || current.currentPublishedVersionId != null) {
          throw new Error('CANNOT_CORRECT_PUBLISHED_INTERNATIONAL_TEST_IDENTITY');
        }
        if (current.canonicalName !== test.canonicalName || current.providerName !== test.providerName) {
          throw new Error('CONFLICTING_CANONICAL_NAME_MODIFICATION');
        }
        const currentVersions = repository.findImportVersion?[await repository.findImportVersion(id,input.versionId)].filter((v):v is InternationalTestVersionDto=>v!==null):await repository.listImportVersions?.(id);
        if (!currentVersions?.some(v => v.id === input.versionId && v.testId === id && v.sourceHash === input.sourceHash)) {
          throw new Error('TEST_IMPORT_SOURCE_HASH_MISMATCH');
        }
        const collision = await repository.findByDedupKey(newDedupKey);
        if (collision && collision.id !== id) throw new Error('INTERNATIONAL_TEST_CANONICAL_IDENTITY_COLLISION');
        return repository.update(id, {
          canonicalName: newCanonical,
          displayName: newDisplayName,
          canonicalDedupKey: newDedupKey,
        });
      },
      {
        previousCanonicalName: test.canonicalName,
        newCanonicalName: newCanonical,
        previousDisplayName: test.displayName,
        newDisplayName,
        previousCanonicalDedupKey: test.canonicalDedupKey,
        newCanonicalDedupKey: newDedupKey,
        correctionReason: input.correctionReason.trim(),
        evidenceReference: input.evidenceReference.trim(),
        versionId: input.versionId,
        sourceHash: input.sourceHash,
      }
    );
  }

  // Child profile delegates
  public async listVariants(testId: string): Promise<InternationalTestVariantDto[]> {
    await this.get(testId);
    if (!this.repository.listVariants) return [];
    return this.repository.listVariants(testId);
  }

  public async upsertVariant(testId: string, data: UpsertInternationalTestVariantDto & { id?: string }, context?: TestMutationContext): Promise<InternationalTestVariantDto> {
    await this.get(testId);
    if (!this.repository.upsertVariant) throw new Error('Repository method upsertVariant not implemented');
    return this.mutate('INTERNATIONAL_TEST_VARIANT_UPSERTED', testId, context, repository => repository.upsertVariant!(testId, data));
  }

  public async listSections(testId: string): Promise<InternationalTestSectionDto[]> {
    await this.get(testId);
    if (!this.repository.listSections) return [];
    return this.repository.listSections(testId);
  }

  public async upsertSection(testId: string, data: UpsertInternationalTestSectionDto & { id?: string }, context?: TestMutationContext): Promise<InternationalTestSectionDto> {
    await this.get(testId);
    const issues = validateInternationalTestSectionScore(data);
    if (issues.length) throw new Error(`Invalid section scores: ${issues.map(issue => issue.message).join('; ')}`);
    if (!this.repository.upsertSection) throw new Error('Repository method upsertSection not implemented');
    return this.mutate('INTERNATIONAL_TEST_SECTION_UPSERTED', testId, context, repository => repository.upsertSection!(testId, data));
  }

  public async upsertScoreScale(testId: string, data: UpsertInternationalTestScoreScaleDto, context?: TestMutationContext): Promise<InternationalTestScoreScaleDto> {
    await this.get(testId);
    const owner=await this.get(testId);
    if((data.cefrEquivalency||data.crossTestEquivalency)&&!['ENGLISH_LANGUAGE','NON_ENGLISH_LANGUAGE','LANGUAGE_PROFICIENCY'].includes(owner.testCategory)) throw new Error('INTERNATIONAL_TEST_EQUIVALENCY_FAMILY_INVALID');
    if(data.scoreReportingUrl){const provider=owner.providerId?await this.repository.findProviderById?.(owner.providerId):null;assertOfficialTestUrl(data.scoreReportingUrl,provider?.officialWebsite);}
    const issues = validateInternationalTestScorePolicy(data);
    if (issues.length) throw new Error(`Invalid score scale: ${issues.map(issue => issue.message).join('; ')}`);
    if (!this.repository.upsertScoreScale) throw new Error('Repository method upsertScoreScale not implemented');
    return this.mutate('INTERNATIONAL_TEST_SCORE_SCALE_UPSERTED', testId, context, repository => repository.upsertScoreScale!(testId, data));
  }

  public async upsertFeeMetadata(testId: string, data: Omit<UpsertInternationalTestFeeMetadataDto, 'currencyReferenceId'> & { currencyReferenceId?: string; id?: string }, context?: TestMutationContext): Promise<InternationalTestFeeMetadataDto> {
    await this.get(testId);
    if (data.amount < 0) {
      throw new Error('Fee amount cannot be negative');
    }
    if (!data.currencyCode || data.currencyCode.trim() === '') {
      throw new Error('Currency code is required for fee metadata');
    }
    if (!this.referenceResolver) throw new Error('Canonical Reference resolver is not configured');
    const currency = await this.referenceResolver.resolveCurrency({ standardCode: data.currencyCode });
    if (!currency?.active) throw new Error(`Active canonical Currency not found: ${data.currencyCode}`);
    if (data.currencyReferenceId) {
      const requestedCurrency = await this.referenceResolver.resolveCurrency({ id: data.currencyReferenceId });
      if (!requestedCurrency?.active || requestedCurrency.id !== currency.id) {
        throw new Error('CURRENCY_REFERENCE_ID_CODE_MISMATCH');
      }
    }
    const rawData = data as unknown as Record<string, unknown>;
    if (rawData.paymentGatewayId || rawData.chargeToken || rawData.paymentStatus || rawData.executePayment) {
      throw new Error('Payment execution fields are not supported in fee metadata');
    }
    if (!this.repository.upsertFeeMetadata) throw new Error('Repository method upsertFeeMetadata not implemented');
    const canonicalData: UpsertInternationalTestFeeMetadataDto & { id?: string } = {
      ...data,
      currencyCode: currency.standardCode ?? data.currencyCode.trim().toUpperCase(),
      currencyReferenceId: currency.id,
    };
    return this.mutate('INTERNATIONAL_TEST_FEE_UPSERTED', testId, context, repository => repository.upsertFeeMetadata!(testId, canonicalData));
  }

  public async upsertOfficialLink(testId: string, data: UpsertInternationalTestOfficialLinkDto & { id?: string }, context?: TestMutationContext): Promise<InternationalTestOfficialLinkDto> {
    await this.get(testId);
    if (!data.url || data.url.trim() === '') {
      throw new Error('URL is required for official link');
    }
    const owner = await this.get(testId);
    const provider = owner.providerId ? await this.repository.findProviderById?.(owner.providerId) : null;
    assertOfficialTestUrl(data.url,provider?.officialWebsite);
    if (!this.repository.upsertOfficialLink) throw new Error('Repository method upsertOfficialLink not implemented');
    return this.mutate('INTERNATIONAL_TEST_OFFICIAL_LINK_UPSERTED', testId, context, repository => repository.upsertOfficialLink!(testId, data));
  }

  public async listAvailability(testId: string): Promise<InternationalTestAvailabilityDto | null> {
    await this.get(testId);
    if (!this.repository.listAvailability) return null;
    return this.repository.listAvailability(testId);
  }

  public async upsertAvailability(testId: string, data: UpsertInternationalTestAvailabilityDto, context?: TestMutationContext): Promise<InternationalTestAvailabilityDto> {
    await this.get(testId);
    if (!this.referenceResolver) throw new Error('Canonical Reference resolver is not configured');
    if (new Set(data.availableCountryIds).size !== data.availableCountryIds.length || new Set(data.availableCityIds??[]).size !== (data.availableCityIds??[]).length) throw new Error('INTERNATIONAL_TEST_DUPLICATE_AVAILABILITY');
    const countryCodes = new Set<string>();
    for (const countryId of data.availableCountryIds) {
      const country = await this.referenceResolver.resolveCountry({ id: countryId });
      if (!country?.active) throw new Error(`Active canonical Country not found: ${countryId}`);
      if (country.standardCode) countryCodes.add(country.standardCode);
    }
    for (const cityId of data.availableCityIds || []) {
      const city = await this.referenceResolver.resolveCity({ id: cityId });
      if (!city?.active) throw new Error(`Active canonical City not found: ${cityId}`);
      if (!city.countryIso2Code || !countryCodes.has(city.countryIso2Code)) throw new Error('INTERNATIONAL_TEST_AVAILABILITY_COUNTRY_MISMATCH');
    }
    if (!this.repository.upsertAvailability) throw new Error('Repository method upsertAvailability not implemented');
    return this.mutate('INTERNATIONAL_TEST_AVAILABILITY_UPSERTED', testId, context, repository => repository.upsertAvailability!(testId, data));
  }

  public async listPreparationMaterials(testId: string): Promise<InternationalTestPreparationMaterialDto[]> {
    await this.get(testId);
    if (!this.repository.listPreparationMaterials) return [];
    return this.repository.listPreparationMaterials(testId);
  }

  public async upsertPreparationMaterial(testId: string, data: UpsertInternationalTestPreparationMaterialDto & { id?: string }, context?: TestMutationContext): Promise<InternationalTestPreparationMaterialDto> {
    await this.get(testId);
    if (data.url && (data.url.startsWith('file://') || data.url.startsWith('/local/') || data.url.startsWith('C:\\'))) {
      throw new Error('Raw local file paths are not allowed as persisted material URLs');
    }
    await assertAssetReferenceUsable(this.assetReferences, data.assetId, { purpose: 'INTERNATIONAL_TEST_MATERIAL' });
    if (!this.repository.upsertPreparationMaterial) throw new Error('Repository method upsertPreparationMaterial not implemented');
    return this.mutate('INTERNATIONAL_TEST_PREPARATION_MATERIAL_UPSERTED', testId, context, repository => repository.upsertPreparationMaterial!(testId, data));
  }

  public async listEvidence(testId: string): Promise<InternationalTestEvidenceDto[]> {
    await this.get(testId);
    if (!this.repository.listEvidence) return [];
    return this.repository.listEvidence(testId);
  }

  public async addEvidence(testId: string, data: InternationalTestEvidenceDto, context?: TestMutationContext): Promise<InternationalTestEvidenceDto> {
    await this.get(testId);
    if (!this.repository.addEvidence) throw new Error('Repository method addEvidence not implemented');
    return this.mutate('INTERNATIONAL_TEST_EVIDENCE_ADDED', testId, context, repository => repository.addEvidence!(testId, { ...data, reviewActorId: context?.actorId } as InternationalTestEvidenceDto));
  }

  public async createImportDraftVersion(
    testId: string,
    data: InternationalTestImportDraftRequestDto,
    context?: TestMutationContext,
  ): Promise<InternationalTestImportDraftResultDto> {
    await this.get(testId);
    if (!data.sourceFileName || data.sourceFileName.trim() === '') {
      throw new Error('Source file name is required to create an import draft version');
    }
    if (!this.repository.createImportDraftVersion) {
      throw new Error('Repository method createImportDraftVersion not implemented');
    }
    return this.mutate('INTERNATIONAL_TEST_IMPORT_DRAFT_CREATED', testId, context, repository => repository.createImportDraftVersion!(testId, {
      ...data,
      sourceFileName: data.sourceFileName.trim()
    }));
  }

  public async listImportVersions(testId: string, page = 1): Promise<InternationalTestVersionDto[]> {
    await this.get(testId);
    if (!this.repository.listImportVersions) return [];
    return this.repository.listImportVersions(testId,page);
  }

  private async canonicalizeProvider(data: Partial<UpsertInternationalTestDto>): Promise<Partial<UpsertInternationalTestDto>> {
    if (!data.providerId) return {};
    if (!this.repository.findProviderById) throw new Error('Canonical International Test provider lookup is not configured');
    const provider = await this.repository.findProviderById(data.providerId);
    if (!provider) throw new Error(`International test provider with id ${data.providerId} not found`);
    return { providerId: provider.id, providerName: provider.displayName };
  }

  private async lockSourceReviewOwner(repository: IInternationalTestRepository, id: string): Promise<InternationalTestDto> {
    if (this.atomicMutations && !repository.acquireSourceReviewLock) throw new Error('INTERNATIONAL_TEST_SOURCE_REVIEW_TRANSACTION_REQUIRED');
    await repository.acquireSourceReviewLock?.(id);
    const current = await repository.findById(id);
    if (!current) throw new Error(`International test with id ${id} not found`);
    return current;
  }

  private mutate<T>(action: string, id: string, context: TestMutationContext | undefined, mutation: (repository: IInternationalTestRepository) => Promise<T>, auditMetadata?: Record<string, unknown>): Promise<T> {
    if(!context?.actorId) throw new Error('AUTHENTICATED_ADMIN_ACTOR_REQUIRED');
    if (!this.atomicMutations) throw new Error('INTERNATIONAL_TEST_ATOMIC_COORDINATOR_REQUIRED');
    const repository = this.repository as Partial<ITransactionalInternationalTestRepository>;
    if (!repository.withTransaction) throw new Error('INTERNATIONAL_TEST_TRANSACTIONAL_PERSISTENCE_REQUIRED');
    const eventPayload:Record<string,unknown>={entityType:'INTERNATIONAL_TEST',entityId:id,operation:action};
    return this.atomicMutations.execute({ outbox:{payload:eventPayload}, domain: 'INTERNATIONAL_TESTS', aggregateType: 'INTERNATIONAL_TEST', aggregateId: id, action, context, auditMetadata:{reason:context.reason,...auditMetadata} },
      async transaction => {
        const scoped = repository.withTransaction!(transaction);
        const ownerMutation = !['INTERNATIONAL_TEST_CREATED','INTERNATIONAL_TEST_PROVIDER_UPSERTED'].includes(action);
        if (!ownerMutation) return mutation(scoped);
        if (!context?.actorId || !scoped.getRevision || !scoped.advanceRevision || !scoped.acquireSourceReviewLock) throw new Error('INTERNATIONAL_TEST_GOVERNED_ACTOR_REQUIRED');
        if (!Number.isSafeInteger(context.expectedRevision) || context.expectedRevision! < 0) throw new Error('INTERNATIONAL_TEST_EXPECTED_REVISION_REQUIRED');
        await scoped.acquireSourceReviewLock(id);
        const before = await scoped.findById(id); if (!before) throw new Error('INTERNATIONAL_TEST_NOT_FOUND');
        const revision = await scoped.getRevision(id);
        if (revision !== context.expectedRevision) throw new Error('INTERNATIONAL_TEST_REVISION_CONFLICT');
        if (before.status === InternationalTestStatus.ARCHIVED) throw new Error('INTERNATIONAL_TEST_ARCHIVED_IMMUTABLE');
        if (before.status === InternationalTestStatus.REJECTED && action !== 'INTERNATIONAL_TEST_NEEDS_REVIEW' && action !== 'INTERNATIONAL_TEST_ARCHIVED') throw new Error('INTERNATIONAL_TEST_REJECTED_IMMUTABLE');
        const result = await mutation(scoped);
        if(action==='INTERNATIONAL_TEST_PUBLISHED'){const published=await scoped.findById(id);eventPayload.versionId=published?.currentPublishedVersionId;}
        const preserveApproval=['INTERNATIONAL_TEST_APPROVED','INTERNATIONAL_TEST_PUBLISHED'].includes(action);
        if(!preserveApproval && !['INTERNATIONAL_TEST_ARCHIVED','INTERNATIONAL_TEST_REJECTED','INTERNATIONAL_TEST_READY_TO_PUBLISH'].includes(action) && ['PUBLISHED','READY_TO_PUBLISH'].includes(before.status)) await scoped.update(id,{status:InternationalTestStatus.NEEDS_REVIEW});
        await scoped.advanceRevision(id,revision,preserveApproval);
        if (result && typeof result === 'object' && 'id' in result && (result as {id?:string}).id === id) (result as {revision?:number}).revision = revision+1;
        return result;
      });
  }
}

export class InternationalTestPublicUseCases {
  constructor(private readonly repository: IInternationalTestRepository) {}

  public async listPublished(filters: Omit<InternationalTestFilters, 'status'> = {}): Promise<PaginatedInternationalTestResult<InternationalTestDto>> {
    const safeFilters = filters || {};
    const requestedPage = typeof safeFilters.page === 'number' ? safeFilters.page : 1;
    const requestedPageSize = typeof safeFilters.pageSize === 'number' ? safeFilters.pageSize : 20;
    const result=await this.repository.listPublished({
      ...safeFilters,
      page: Math.max(1, Math.floor(requestedPage)),
      pageSize: Math.min(50, Math.max(1, Math.floor(requestedPageSize)))
    });
    return {...result,data:result.data.map(publicInternationalTest)};
  }

  public async getPublishedBySlug(slug: string): Promise<InternationalTestDto> {
    const test = await this.repository.findPublishedBySlug(slug);
    if (!test) {
      throw new Error('International test not found');
    }
    return publicInternationalTest(test);
  }
}
