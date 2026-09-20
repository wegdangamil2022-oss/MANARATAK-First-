import { v4 as uuidv4 } from 'uuid';
import {
  IInternationalTestRepository,
  ImportRecordDto,
  ImportRecordStatus,
  InternationalTestCategory,
  InternationalTestCompletenessStatus,
  InternationalTestDeduplicationService,
  InternationalTestDeliveryMode,
  InternationalTestImportPayloadSchema,
  InternationalTestNamingService,
  InternationalTestSourceTrustLevel,
  InternationalTestStatus,
  InternationalTestValidationService,
  IInternationalTestValidationService,
  InternationalTestValidationSeverity,
  UpsertInternationalTestScoreScaleDto,
  IReferenceResolver,
  ITransactionalInternationalTestRepository,
  IDegreeLevelRepository,
  IAcademicTaxonomyRepository,
  UpsertInternationalTestDto,
} from '@manaratak/domain';
import { AtomicDomainMutationCoordinator } from '../../event-foundation/use-cases/AtomicDomainMutationCoordinator';
import { InternationalTestCanonicalRelationshipService } from './InternationalTestCanonicalRelationshipService';

export type InternationalTestPromotionResult =
  | { type: 'CREATED'; testId: string }
  | { type: 'DUPLICATE'; existingId: string }
  | { type: 'REJECTED'; reason: string }
  | { type: 'FAILED'; error: string };

interface LegacyInternationalTestImportCompatibilityFields {
  officialRegistrationUrl?: string;
  officialSourceUrl?: string;
  acceptedFor?: string[];
  validityPeriodMonths?: number;
  currencyCode?: string;
  feeAmountMinorUnits?: string;
  feeScale?: number;
  availableCountries?: string[];
  testCenters?: unknown[];
  sampleMaterialAssetIds?: string[];
  preparationResourceRefs?: unknown[];
}

export class InternationalTestImportPromotionUseCase {
  private readonly canonicalRelationshipService: InternationalTestCanonicalRelationshipService;

  constructor(
    private readonly repository: IInternationalTestRepository,
    private readonly validationService: IInternationalTestValidationService = new InternationalTestValidationService(),
    private readonly referenceResolver?: IReferenceResolver,
    private readonly atomicMutations?: AtomicDomainMutationCoordinator,
    private readonly degreeLevelRepository?: IDegreeLevelRepository,
    private readonly academicTaxonomyRepository?: IAcademicTaxonomyRepository,
  ) {
    this.canonicalRelationshipService = new InternationalTestCanonicalRelationshipService(
      referenceResolver,
      degreeLevelRepository,
      academicTaxonomyRepository,
    );
  }

  public async promote(record: ImportRecordDto): Promise<InternationalTestPromotionResult> {
    if (this.atomicMutations) {
      const transactional = this.repository as Partial<ITransactionalInternationalTestRepository>;
      if (!transactional.withTransaction)
        return { type: 'FAILED', error: 'INTERNATIONAL_TEST_TRANSACTIONAL_PERSISTENCE_REQUIRED' };
      let noMutationResult:
        Extract<InternationalTestPromotionResult, { type: 'REJECTED' | 'DUPLICATE' }> | undefined;
      try {
        return await this.atomicMutations.execute(
          {
            domain: 'INTERNATIONAL_TESTS',
            aggregateType: 'IMPORT_RECORD',
            aggregateId: String(record.id ?? 'UNPERSISTED_IMPORT_RECORD'),
            action: 'INTERNATIONAL_TEST_IMPORT_PROMOTED',
            context: { actorId: 'IMPORT_WORKER', actorType: 'SYSTEM', source: 'import-promotion' },
          },
          async (transaction) => {
            const result = await new InternationalTestImportPromotionUseCase(
              transactional.withTransaction!(transaction),
              this.validationService,
              this.referenceResolver,
              undefined,
              this.degreeLevelRepository,
              this.academicTaxonomyRepository,
            ).promote(record);
            if (result.type === 'FAILED') throw new Error(result.error);
            if (result.type === 'REJECTED' || result.type === 'DUPLICATE') {
              noMutationResult = result;
              throw new Error('NO_INTERNATIONAL_TEST_PROMOTION_MUTATION');
            }
            return result;
          },
        );
      } catch (error: unknown) {
        if (noMutationResult) return noMutationResult;
        return {
          type: 'FAILED',
          error: error instanceof Error ? error.message : 'Unknown error in atomic promotion',
        };
      }
    }
    try {
      if (
        record.status !== ImportRecordStatus.VALID &&
        record.status !== ImportRecordStatus.COMPLETE &&
        record.status !== ImportRecordStatus.NEEDS_REVIEW
      ) {
        return {
          type: 'REJECTED',
          reason: `ImportRecord status is ${record.status}, not VALID or NEEDS_REVIEW`,
        };
      }

      const rawPayload = record.normalizedPayload || record.rawPayload;
      const validation = InternationalTestImportPayloadSchema.safeParse(rawPayload);
      if (!validation.success) {
        return { type: 'REJECTED', reason: 'Payload fails schema validation' };
      }

      const parsedPayload = validation.data;
      const canonicalRelationships = await this.canonicalRelationshipService.canonicalize(
        parsedPayload as unknown as Partial<UpsertInternationalTestDto>,
      );
      // Import payloads intentionally accept legacy flat compatibility fields via
      // the schema's passthrough contract. Preserve that shape while canonical
      // relationships replace only the normalized relationship collections.
      const payload = { ...parsedPayload, ...canonicalRelationships } as Partial<UpsertInternationalTestDto> &
        LegacyInternationalTestImportCompatibilityFields & typeof parsedPayload;
      const referenceIssue = await this.validateReferenceInputs(payload);
      if (referenceIssue) return { type: 'REJECTED', reason: referenceIssue };
      const domainReport = this.validationService.validate(payload);
      const hasErrors = domainReport.issues.some(
        (i) => i.severity === InternationalTestValidationSeverity.ERROR,
      );
      if (hasErrors) {
        return {
          type: 'REJECTED',
          reason: `Domain validation failed: ${domainReport.issues.map((i) => i.message).join(', ')}`,
        };
      }

      const completenessStatus = {
        state: domainReport.status,
        missingFields: domainReport.missingFields,
      };
      if (completenessStatus.state === InternationalTestCompletenessStatus.INCOMPLETE) {
        return { type: 'REJECTED', reason: 'Record classified as INCOMPLETE' };
      }

      const displayName =
        payload.displayName || payload.testName || payload.canonicalName || 'International Test';
      const canonicalName = InternationalTestNamingService.normalize(displayName);
      const dedupKey = InternationalTestDeduplicationService.generateKey(payload);
      const existing = await this.repository.findByDedupKey(dedupKey);
      if (existing) {
        return { type: 'DUPLICATE', existingId: existing.id };
      }

      let canonicalProviderName = payload.providerName || 'UNKNOWN';
      if (payload.providerId) {
        if (!this.repository.findProviderById) {
          return { type: 'REJECTED', reason: 'Canonical International Test provider lookup is not configured' };
        }
        const provider = await this.repository.findProviderById(payload.providerId);
        if (!provider) return { type: 'REJECTED', reason: `International test provider not found: ${payload.providerId}` };
        canonicalProviderName = provider.displayName;
      }

      const publicId = `test-${uuidv4().substring(0, 8)}`;
      const slugBase = canonicalName.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      const primaryRegUrl =
        payload.officialRegistrationUrl ||
        payload.officialLinks?.find((l) => l.linkType === 'REGISTRATION')?.url ||
        payload.officialLinks?.[0]?.url ||
        null;

      const created = await this.repository.create({
        publicId,
        slug: `${slugBase || 'international-test'}-${publicId.substring(0, 4)}`,
        canonicalName,
        canonicalDedupKey: dedupKey,
        displayName,
        testCode: payload.testCode || payload.abbreviation,
        testCategory:
          (payload.testCategory as InternationalTestCategory) ||
          InternationalTestCategory.LANGUAGE_PROFICIENCY,
        providerName: canonicalProviderName,
        providerId: payload.providerId,
        localizedNameAr: payload.localizedNameAr,
        localizedNameEn: payload.localizedNameEn,
        abbreviation: payload.abbreviation,
        isSourceVerified: payload.isSourceVerified === true,
        officialRegistrationUrl: primaryRegUrl,
        officialSourceUrl: payload.officialSourceUrl || payload.importEvidence?.sourceUrl || null,
        acceptedFor: payload.acceptedFor || payload.useCases,
        scoreScale:
          typeof payload.scoreScale === 'object' && payload.scoreScale !== null
            ? (payload.scoreScale as UpsertInternationalTestScoreScaleDto)
            : undefined,
        validityPeriodMonths:
          payload.validityPeriodMonths ||
          (typeof payload.scoreScale === 'object' && payload.scoreScale !== null
            ? payload.scoreScale.resultValidityDurationMonths
            : undefined),
        currencyCode: payload.currencyCode || payload.fees?.[0]?.currencyCode,
        feeAmountMinorUnits:
          payload.feeAmountMinorUnits ||
          (payload.fees?.[0]?.amount !== undefined
            ? Math.round(payload.fees[0].amount * 100).toString()
            : undefined),
        feeScale: payload.feeScale || 2,
        availableCountries: payload.availableCountries || payload.availability?.availableCountryIds,
        testCenters:
          payload.testCenters ||
          (payload.availability as (typeof payload.availability & { testCenters?: unknown[] }) | undefined)
            ?.testCenters,
        sampleMaterialAssetIds:
          payload.sampleMaterialAssetIds ||
          payload.preparationMaterials
            ?.map((m) => m.assetId)
            .filter((a): a is string => Boolean(a)),
        preparationResourceRefs: payload.preparationResourceRefs || payload.preparationMaterials,
        registrationRequirements: payload.registrationRequirements,
        identificationRequirements: payload.identificationRequirements,
        retakePolicy: payload.retakePolicy,
        cancellationReschedulingNotes: payload.cancellationReschedulingNotes,
        accessibilityNotes: payload.accessibilityNotes,
        countryRelationships: payload.countryRelationships,
        languageRelationships: payload.languageRelationships,
        academicTaxonomyRelationships: payload.academicTaxonomyRelationships,
        degreeRelationships: payload.degreeRelationships,
        officialLinks: payload.officialLinks?.filter(link => Boolean(link.url)).map(link => ({
          linkType: (link.linkType || 'OTHER') as 'REGISTRATION' | 'INFORMATION' | 'PREPARATION' | 'SCORE_REPORTING' | 'OTHER',
          url: link.url!,
          description: link.description,
        })),
        status:
          completenessStatus.state === InternationalTestCompletenessStatus.COMPLETE
            ? InternationalTestStatus.IMPORTED
            : InternationalTestStatus.READY_TO_REVIEW,
        completenessStatus: completenessStatus.state,
        sourceImportRecordId: record.id,
        optionalFields: {
          ...((payload as { optionalFields?: Record<string, unknown> }).optionalFields || {}),
          description: payload.description,
          overview: payload.overview,
          useCases: payload.useCases,
          targetAudience: payload.targetAudience,
          commonlyUsedCountriesOrRegions: payload.commonlyUsedCountriesOrRegions,
          relatedLanguages: payload.relatedLanguages,
          ageRules: payload.ageRules,
          testDayRequirements: payload.testDayRequirements,
          missingFields:
            payload.missingFields ||
            domainReport.issues
              .filter((i) => i.severity === InternationalTestValidationSeverity.WARNING)
              .map((i) => i.field),
          readinessWarnings:
            payload.readinessWarnings ||
            domainReport.issues
              .filter((i) => i.severity === InternationalTestValidationSeverity.WARNING)
              .map((i) => i.message),
          crossPhaseReferences: payload.crossPhaseReferences,
          variants: payload.variants,
          sections: payload.sections,
          fees: payload.fees,
          availability: payload.availability,
          preparationMaterials: payload.preparationMaterials,
          importEvidence: payload.importEvidence,
        },
        metadata: {
          ...((payload as { metadata?: Record<string, unknown> }).metadata || {}),
          warnings: domainReport.issues
            .filter((i) => i.severity === InternationalTestValidationSeverity.WARNING)
            .map((i) => i.message),
        },
      });

      await this.persistMinimumNormalizedLifecycle(created.id, record, payload);

      // Child sub-entities propagation if repository methods are available
      if (Array.isArray(payload.variants) && typeof this.repository.upsertVariant === 'function') {
        for (const v of payload.variants) {
          if (v.variantName) {
            await this.repository.upsertVariant(created.id, {
              variantName: v.variantName,
              deliveryMode:
                (v.deliveryMode as InternationalTestDeliveryMode) ||
                InternationalTestDeliveryMode.IN_PERSON,
              isActive: v.isActive !== false,
              specificOfficialUrl: v.specificOfficialUrl,
              administrativeNotes:
                v.administrativeNotes ||
                (v as typeof v & { description?: string }).description,
            });
          }
        }
      }

      if (Array.isArray(payload.sections) && typeof this.repository.upsertSection === 'function') {
        for (let idx = 0; idx < payload.sections.length; idx++) {
          const s = payload.sections[idx];
          if (s.sectionName) {
            await this.repository.upsertSection(created.id, {
              sectionName: s.sectionName,
              sectionType: s.sectionType || 'GENERAL',
              durationMinutes: s.durationMinutes,
              order: s.order ?? idx + 1,
              questionTypes: s.questionTypes,
              scoreMinimum: s.scoreMinimum,
              scoreMaximum: s.scoreMaximum,
            });
          }
        }
      }

      if (
        payload.scoreScale &&
        typeof payload.scoreScale === 'object' &&
        typeof this.repository.upsertScoreScale === 'function'
      ) {
        await this.repository.upsertScoreScale(created.id, {
          overallMinimum: payload.scoreScale.overallMinimum ?? 0,
          overallMaximum: payload.scoreScale.overallMaximum ?? 100,
          scoreIncrement: payload.scoreScale.scoreIncrement,
          bandsOrLevels: payload.scoreScale.bandsOrLevels,
          passFailRules: payload.scoreScale.passFailRules,
          cefrEquivalency: payload.scoreScale.cefrEquivalency,
          resultValidityDurationMonths: payload.scoreScale.resultValidityDurationMonths,
          resultDeliveryTimeDays: payload.scoreScale.resultDeliveryTimeDays,
          scoreReportingUrl: payload.scoreScale.scoreReportingUrl,
        });
      }

      if (Array.isArray(payload.fees) && typeof this.repository.upsertFeeMetadata === 'function') {
        for (const f of payload.fees) {
          const currency = await this.referenceResolver!.resolveCurrency({ standardCode: f.currencyCode! });
          if (!currency?.active) throw new Error(`Active canonical Currency not found: ${f.currencyCode}`);
          await this.repository.upsertFeeMetadata(created.id, {
            feeType:
              (f.feeType as
                'REGISTRATION' | 'LATE_REGISTRATION' | 'RESCHEDULING' | 'CANCELLATION' | 'OTHER') ||
              'REGISTRATION',
            amount: f.amount ?? 0,
            currencyCode: f.currencyCode!,
            currencyReferenceId: currency.id,
            hasRegionalVariation: Boolean(f.hasRegionalVariation),
            validityWindowNotes: f.validityWindowNotes,
          });
        }
      }

      if (
        Array.isArray(payload.officialLinks) &&
        typeof this.repository.upsertOfficialLink === 'function'
      ) {
        for (const l of payload.officialLinks) {
          if (l.url) {
            await this.repository.upsertOfficialLink(created.id, {
              linkType:
                (l.linkType as
                  'REGISTRATION' | 'INFORMATION' | 'PREPARATION' | 'SCORE_REPORTING' | 'OTHER') ||
                'INFORMATION',
              url: l.url,
              description: l.description,
            });
          }
        }
      }

      if (payload.availability && typeof this.repository.upsertAvailability === 'function') {
        await this.repository.upsertAvailability(created.id, {
          availableCountryIds: (payload.availability.availableCountryIds || []) as string[],
          availableCityIds: payload.availability.availableCityIds as string[],
          onlineAvailabilityRegions: payload.availability.onlineAvailabilityRegions,
          testingWindowsNotes: payload.availability.testingWindowsNotes,
        });
      }

      if (
        Array.isArray(payload.preparationMaterials) &&
        typeof this.repository.upsertPreparationMaterial === 'function'
      ) {
        for (const m of payload.preparationMaterials) {
          if (m.title) {
            await this.repository.upsertPreparationMaterial(created.id, {
              materialType:
                (m.materialType as
                  'SAMPLE_QUESTIONS' | 'PRACTICE_TEST' | 'BROCHURE' | 'AUDIO_SAMPLE' | 'GUIDE') ||
                'GUIDE',
              title: m.title,
              url: m.url,
              assetId: m.assetId,
              description: m.description,
            });
          }
        }
      }

      if (payload.importEvidence && typeof this.repository.addEvidence === 'function') {
        await this.repository.addEvidence(created.id, {
          originalImportedName: payload.importEvidence.originalImportedName || displayName,
          normalizedCanonicalName: payload.importEvidence.normalizedCanonicalName || canonicalName,
          deterministicKey: payload.importEvidence.deterministicKey || dedupKey,
          sourceId: payload.importEvidence.sourceId || record.id,
          sourceUrl: payload.importEvidence.sourceUrl,
          contentHash: payload.importEvidence.contentHash,
          retrievedAt: payload.importEvidence.retrievedAt
            ? new Date(payload.importEvidence.retrievedAt)
            : new Date(),
          evidenceSnippet: payload.importEvidence.evidenceSnippet,
          sourceTrustLevel: this.normalizeSourceTrustLevel(payload.importEvidence.sourceTrustLevel),
          duplicateStatus:
            (payload.importEvidence.duplicateStatus as
              'NEW' | 'DUPLICATE_SKIPPED' | 'EXISTING_ENRICHED') || 'NEW',
          conflictingFields: Array.isArray(payload.importEvidence.conflictingFields)
            ? payload.importEvidence.conflictingFields
            : undefined,
          mergeSuggestions: payload.importEvidence.mergeSuggestions as
            Record<string, unknown> | undefined,
        });
      }

      return { type: 'CREATED', testId: created.id };
    } catch (error) {
      return { type: 'FAILED', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async persistMinimumNormalizedLifecycle(
    testId: string,
    record: ImportRecordDto,
    payload: Record<string, unknown>,
  ): Promise<void> {
    if (typeof this.repository.createImportDraftVersion === 'function') {
      await this.repository.createImportDraftVersion(testId, {
        sourceImportRecordId: record.id,
        sourceFileName: this.stringFrom(record, 'sourceFileName') || `import-record-${record.id}`,
        sourceUri:
          this.stringFrom(record, 'sourceUri') ||
          this.stringFrom(payload.importEvidence, 'sourceUrl') ||
          undefined,
        sourceHash:
          this.stringFrom(record, 'sourceHash') ||
          this.stringFrom(payload.importEvidence, 'contentHash') ||
          undefined,
        rawContent: this.rawContentForDraft(record),
        detectedFields: Object.fromEntries(Object.keys(payload).map((key) => [key, true])),
        metadata: {
          normalizedLifecycle: 'INTERNATIONAL_TEST_READY_MINIMUM',
          sourceImportRecordId: record.id,
        },
      });
    }

    await this.persistCountryRelationships(testId, payload);
    await this.persistLanguageRelationships(testId, payload);
    await this.persistAcademicTaxonomyRelationships(testId, payload);
    await this.persistDegreeRelationships(testId, payload);
  }

  private async persistCountryRelationships(testId: string, payload: Record<string, unknown>): Promise<void> {
    if (typeof this.repository.upsertCountryRelationship !== 'function') return;
    const availability = this.recordFrom(payload.availability);
    const countryIds = this.stringArray(availability?.availableCountryIds);
    for (const countryId of countryIds) {
      if (!this.referenceResolver) throw new Error('Canonical Reference resolver is not configured');
      const country = await this.referenceResolver.resolveCountry({ id: countryId, standardCode: countryId });
      if (!country?.active || !country.standardCode) {
        throw new Error(`Active canonical Country not found: ${countryId}`);
      }
      await this.repository.upsertCountryRelationship(testId, {
        canonicalReferenceId: country.id,
        referenceCode: country.standardCode,
        relationshipType: 'AVAILABLE_IN',
        metadata: { sourceCountryReference: countryId },
      });
    }

    for (const relationship of this.recordArray(payload.countryRelationships)) {
      const canonicalReferenceId = this.stringFrom(relationship, 'canonicalReferenceId') || this.stringFrom(relationship, 'referenceCode');
      const relationshipType = this.stringFrom(relationship, 'relationshipType');
      if (!canonicalReferenceId || !relationshipType) continue;
      await this.repository.upsertCountryRelationship(testId, {
        canonicalReferenceId,
        referenceCode: this.stringFrom(relationship, 'referenceCode'),
        relationshipType,
        notes: this.stringFrom(relationship, 'notes'),
        metadata: this.recordFrom(relationship.metadata),
      });
    }
  }

  private async persistLanguageRelationships(testId: string, payload: Record<string, unknown>): Promise<void> {
    if (typeof this.repository.upsertLanguageRelationship !== 'function') return;
    for (const languageRef of this.stringArray(payload.relatedLanguages)) {
      if (!this.referenceResolver) throw new Error('Canonical Reference resolver is not configured');
      const language = await this.referenceResolver.resolveLanguage({
        standardCode: languageRef,
        alias: languageRef,
      });
      if (!language?.active || !language.standardCode) {
        throw new Error(`Active canonical Language not found: ${languageRef}`);
      }
      await this.repository.upsertLanguageRelationship(testId, {
        canonicalReferenceId: language.id,
        referenceCode: language.standardCode,
        relationshipType: 'RELATED_LANGUAGE',
        metadata: { sourceLanguageReference: languageRef },
      });
    }

    for (const relationship of this.recordArray(payload.languageRelationships)) {
      const canonicalReferenceId = this.stringFrom(relationship, 'canonicalReferenceId') || this.stringFrom(relationship, 'referenceCode');
      const relationshipType = this.stringFrom(relationship, 'relationshipType');
      if (!canonicalReferenceId || !relationshipType) continue;
      await this.repository.upsertLanguageRelationship(testId, {
        canonicalReferenceId,
        referenceCode: this.stringFrom(relationship, 'referenceCode'),
        relationshipType,
        notes: this.stringFrom(relationship, 'notes'),
        metadata: this.recordFrom(relationship.metadata),
      });
    }
  }

  private async persistAcademicTaxonomyRelationships(testId: string, payload: Record<string, unknown>): Promise<void> {
    if (typeof this.repository.upsertAcademicTaxonomyRelationship !== 'function') return;
    for (const relationship of this.recordArray(payload.academicTaxonomyRelationships)) {
      const taxonomyNodeId = this.stringFrom(relationship, 'taxonomyNodeId');
      const relationshipType = this.stringFrom(relationship, 'relationshipType');
      if (!taxonomyNodeId || !relationshipType) continue;
      await this.repository.upsertAcademicTaxonomyRelationship(testId, {
        taxonomyNodeId,
        relationshipType,
        confidence: this.numberFrom(relationship, 'confidence'),
        notes: this.stringFrom(relationship, 'notes'),
        metadata: this.recordFrom(relationship.metadata),
      });
    }
  }

  private async persistDegreeRelationships(testId: string, payload: Record<string, unknown>): Promise<void> {
    if (typeof this.repository.upsertDegreeRelationship !== 'function') return;
    for (const relationship of this.recordArray(payload.degreeRelationships)) {
      const degreeLevelId = this.stringFrom(relationship, 'degreeLevelId');
      const canonicalCode = this.stringFrom(relationship, 'canonicalCode');
      const relationshipType = this.stringFrom(relationship, 'relationshipType');
      if (!degreeLevelId || !relationshipType) continue;
      await this.repository.upsertDegreeRelationship(testId, {
        degreeLevelId,
        canonicalCode: canonicalCode as never,
        relationshipType,
        notes: this.stringFrom(relationship, 'notes'),
        metadata: this.recordFrom(relationship.metadata),
      });
    }
  }

  private rawContentForDraft(record: ImportRecordDto): string {
    const raw = record.rawPayload ?? record.normalizedPayload;
    if (typeof raw === 'string') return raw;
    return JSON.stringify(raw ?? {});
  }

  private recordFrom(value: unknown): Record<string, unknown> | undefined {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
  }

  private recordArray(value: unknown): Record<string, unknown>[] {
    return Array.isArray(value)
      ? value.filter((item): item is Record<string, unknown> => Boolean(this.recordFrom(item)))
      : [];
  }

  private stringArray(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  }

  private normalizeSourceTrustLevel(value: unknown): InternationalTestSourceTrustLevel {
    const normalized = typeof value === 'string' ? value.trim().toUpperCase() : '';
    if (normalized === InternationalTestSourceTrustLevel.AUTHORITATIVE || normalized === 'OFFICIAL_PROVIDER') {
      return InternationalTestSourceTrustLevel.AUTHORITATIVE;
    }
    if (normalized === InternationalTestSourceTrustLevel.HIGH || normalized === 'UNIVERSITY') {
      return InternationalTestSourceTrustLevel.HIGH;
    }
    if (normalized === InternationalTestSourceTrustLevel.MEDIUM || normalized === 'AGGREGATOR') {
      return InternationalTestSourceTrustLevel.MEDIUM;
    }
    if (normalized === InternationalTestSourceTrustLevel.LOW || normalized === 'OTHER') {
      return InternationalTestSourceTrustLevel.LOW;
    }
    return InternationalTestSourceTrustLevel.AUTHORITATIVE;
  }

  private stringFrom(source: unknown, key: string): string | undefined {
    const record = this.recordFrom(source);
    const value = record?.[key];
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  private numberFrom(source: unknown, key: string): number | undefined {
    const record = this.recordFrom(source);
    const value = record?.[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
  }

  private async validateReferenceInputs(payload: {
    fees?: Array<{ currencyCode?: string }>;
    availability?: { availableCountryIds?: string[]; availableCityIds?: string[] };
    relatedLanguages?: string[];
  }): Promise<string | null> {
    const hasReferences = Boolean(
      payload.fees?.length ||
      payload.availability?.availableCountryIds?.length ||
      payload.availability?.availableCityIds?.length ||
      payload.relatedLanguages?.length,
    );
    if (hasReferences && !this.referenceResolver)
      return 'Canonical Reference resolver is not configured';

    for (const fee of payload.fees || []) {
      if (!fee.currencyCode) return 'Fee currencyCode is required and cannot default silently';
      const currency = await this.referenceResolver!.resolveCurrency({
        standardCode: fee.currencyCode,
      });
      if (!currency?.active) return `Active canonical Currency not found: ${fee.currencyCode}`;
    }
    for (const countryId of payload.availability?.availableCountryIds || []) {
      const country = await this.referenceResolver!.resolveCountry({ id: countryId });
      if (!country?.active || !country.standardCode) return `Active canonical Country not found: ${countryId}`;
    }
    for (const cityId of payload.availability?.availableCityIds || []) {
      const city = await this.referenceResolver!.resolveCity({ id: cityId });
      if (!city?.active) return `Active canonical City not found: ${cityId}`;
    }
    for (const languageRef of payload.relatedLanguages || []) {
      const language = await this.referenceResolver!.resolveLanguage({
        standardCode: languageRef,
        alias: languageRef,
      });
      if (!language?.active) return `Active canonical Language not found: ${languageRef}`;
    }
    return null;
  }
}
