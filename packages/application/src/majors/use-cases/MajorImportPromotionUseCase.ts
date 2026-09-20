import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import {
  IMajorRepository,
  ImportRecordDto,
  ImportRecordStatus,
  MajorAliasDto,
  MajorClassificationMappingDto,
  MajorContentSectionDto,
  MajorCompletenessClassifier,
  MajorDeduplicationService,
  MajorImportCompletenessState,
  MajorLevel,
  MajorLevelProfileDto,
  MajorVersionDto,
  MajorImportPayload,
  MajorImportPayloadSchema,
  MajorNamingService,
  MajorStatus,
  resolveMajorSourceIdentity,
  ITransactionalMajorRepository,
} from '@manaratak/domain';
import {
  AcademicTaxonomyResolver,
  TaxonomyResolutionOutcome,
} from '../services/AcademicTaxonomyResolver';
import { AtomicDomainMutationCoordinator } from '../../event-foundation/use-cases/AtomicDomainMutationCoordinator';
import { CanonicalMajorReferenceService } from '../services/CanonicalMajorReferenceService';

export type MajorPromotionResult =
  | { type: 'CREATED'; majorId: string }
  | { type: 'DUPLICATE'; existingId: string }
  | { type: 'VERSION_CREATED'; existingId: string; versionNumber: number }
  | { type: 'REJECTED'; reason: string }
  | { type: 'FAILED'; error: string };

export class MajorImportPromotionUseCase {
  constructor(
    private readonly repository: IMajorRepository,
    private readonly taxonomyResolver: AcademicTaxonomyResolver = new AcademicTaxonomyResolver(),
    private readonly atomicMutations?: AtomicDomainMutationCoordinator,
    private readonly canonicalReferences?: CanonicalMajorReferenceService,
  ) {}

  public async promote(record: ImportRecordDto): Promise<MajorPromotionResult> {
    if (this.atomicMutations) {
      const transactional = this.repository as Partial<ITransactionalMajorRepository>;
      if (!transactional.withTransaction)
        return { type: 'FAILED', error: 'MAJOR_TRANSACTIONAL_PERSISTENCE_REQUIRED' };
      let noMutationResult:
        Extract<MajorPromotionResult, { type: 'REJECTED' | 'DUPLICATE' }> | undefined;
      try {
        return await this.atomicMutations.execute(
          {
            domain: 'MAJORS',
            aggregateType: 'IMPORT_RECORD',
            aggregateId: String(record.id ?? 'UNPERSISTED_IMPORT_RECORD'),
            action: 'MAJOR_IMPORT_PROMOTED',
            context: { actorId: 'IMPORT_WORKER', actorType: 'SYSTEM', source: 'import-promotion' },
          },
          async (transaction) => {
            const result = await new MajorImportPromotionUseCase(
              transactional.withTransaction!(transaction),
              this.taxonomyResolver,
              undefined,
              this.canonicalReferences,
            ).promote(record);
            if (result.type === 'FAILED') throw new Error(result.error);
            if (result.type === 'REJECTED' || result.type === 'DUPLICATE') {
              noMutationResult = result;
              throw new Error('NO_MAJOR_PROMOTION_MUTATION');
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
      const validationResult = MajorImportPayloadSchema.safeParse(rawPayload);
      if (!validationResult.success) {
        return { type: 'REJECTED', reason: 'Payload fails schema validation' };
      }

      const payload = validationResult.data;
      let classification = MajorCompletenessClassifier.classify({ ...payload, sourceImportRecordId: record.id });
      if (classification.state === MajorImportCompletenessState.INCOMPLETE) {
        return { type: 'REJECTED', reason: 'Record classified as INCOMPLETE' };
      }

      // Resolve taxonomy
      const taxonomyRes = await this.resolveTaxonomy(payload);
      if (taxonomyRes.outcome === TaxonomyResolutionOutcome.EXACT_MATCH) {
        if (!payload.academicFieldId && taxonomyRes.academicFieldId) {
          payload.academicFieldId = taxonomyRes.academicFieldId;
        }
        if (!payload.disciplineId && taxonomyRes.disciplineId) {
          payload.disciplineId = taxonomyRes.disciplineId;
        }
      }
      classification = MajorCompletenessClassifier.classify({ ...payload, sourceImportRecordId: record.id });

      const canonicalName = MajorNamingService.normalize(payload.canonicalMajorName);
      const dedupKey = MajorDeduplicationService.generateKey(payload);

      const existing = await this.repository.findByDedupKey(dedupKey);
      if (existing) {
        const versionNumber = await this.attachImportSnapshot(
          existing.id,
          record,
          rawPayload,
          payload,
        );
        return { type: 'VERSION_CREATED', existingId: existing.id, versionNumber };
      }

      const publicId =
        resolveMajorSourceIdentity(payload.classificationCode, ['MJR', 'MAS', 'DOC']) ??
        `MJR-${uuidv4().substring(0, 8).toUpperCase()}`;
      const slug = `${MajorNamingService.normalizeForKey(payload.canonicalMajorName)}-${uuidv4().substring(0, 6)}`;

      const majorStatus =
        record.status === ImportRecordStatus.VALID || record.status === ImportRecordStatus.COMPLETE
          ? MajorStatus.IMPORTED
          : MajorStatus.READY_TO_REVIEW;

      const created = await this.repository.create({
        publicId,
        slug,
        canonicalName,
        canonicalDedupKey: dedupKey,
        displayName: payload.canonicalMajorName,
        status: majorStatus,
        completenessStatus: classification.state,
        facultyName: payload.facultyName || payload.collegeOrFaculty,
        degreeLevel: payload.degreeLevel as any,
        sourceClassificationSystem: payload.sourceClassificationSystem,
        academicFieldOrDiscipline: payload.academicFieldOrDiscipline,
        collegeOrFaculty: payload.collegeOrFaculty,
        classificationCode: payload.classificationCode,
        sourceUrl: payload.sourceUrl,
        officialSourceUrl: payload.officialSourceUrl,
        sourceImportRecordId: record.id,
        academicFieldId: payload.academicFieldId,
        disciplineId: payload.disciplineId,
        optionalFields: {
          ...payload,
          sourceImportMode: payload.sourceImportMode ?? 'CATALOG_IDENTITY_ONLY',
          taxonomyResolutionOutcome: taxonomyRes.outcome,
          taxonomyConfidence: taxonomyRes.confidence,
          taxonomyReason: taxonomyRes.reason,
        },
      });

      const profile = await this.ensureLevelProfile(created.id, payload, record.id);
      let sourceId: string | undefined;

      if (this.repository.createSource) {
        const sourceName =
          typeof payload.metadata?.sourceFileName === 'string'
            ? payload.metadata.sourceFileName
            : 'import_promotion';

        const source = await this.repository.createSource({
          majorId: created.id,
          profileId: profile?.id,
          sourceType:
            payload.sourceImportMode === 'DETAIL_DOSSIER' ? 'DETAIL_DOSSIER' : 'CATALOG_FILE',
          sourceName,
          sourceUri: payload.sourceUrl || payload.officialSourceUrl,
          sourceHash: createHash('sha256').update(JSON.stringify(rawPayload)).digest('hex'),
          importedAt: new Date(),
          metadata: {
            importRecordId: record.id,
            importStatus: record.status,
            crossListingContext: MajorDeduplicationService.generateCrossListingContext(payload),
            sourceImportMode: payload.sourceImportMode ?? 'CATALOG_IDENTITY_ONLY',
          },
        });
        sourceId = source.id;
      }

      await this.attachAliases(created.id, payload, sourceId);
      await this.attachClassificationMappings(created.id, profile?.id, payload);

      if (this.repository.createVersion) {
        const sourceName =
          typeof payload.metadata?.sourceFileName === 'string'
            ? payload.metadata.sourceFileName
            : 'import_promotion';

        const version = await this.repository.createVersion({
          majorId: created.id,
          profileId: profile?.id,
          versionNumber: 1,
          status: 'NEEDS_REVIEW',
          sourceImportRecordId: record.id,
          sourceFileName: sourceName,
          sourceUri: payload.sourceUrl || payload.officialSourceUrl,
          sourceHash: createHash('sha256').update(JSON.stringify(rawPayload)).digest('hex'),
          importedAt: new Date(),
          changeSummary: this.buildChangeSummary(payload, undefined, 'CREATED'),
          rawContentBlocks: this.asRecord(rawPayload),
          metadata: {
            importStatus: record.status,
            profileKey: MajorDeduplicationService.generateProfileKey(payload),
            sourceImportMode: payload.sourceImportMode ?? 'CATALOG_IDENTITY_ONLY',
            contentBlockCount: Array.isArray(payload.contentBlocks)
              ? payload.contentBlocks.length
              : 0,
          },
        });
        await this.attachContentSections(profile?.id, version.id, payload);
      }

      return { type: 'CREATED', majorId: created.id };
    } catch (error: any) {
      return { type: 'FAILED', error: error?.message || 'Unknown error in promotion' };
    }
  }

  private async attachImportSnapshot(
    majorId: string,
    record: ImportRecordDto,
    rawPayload: unknown,
    payload: MajorImportPayload,
  ): Promise<number> {
    const profile = await this.ensureLevelProfile(majorId, payload, record.id);
    await this.repository.acquireVersionAllocationLock?.(majorId);
    const existingVersions = this.repository.listVersions
      ? await this.repository.listVersions(majorId)
      : [];
    const previousVersion = existingVersions.reduce<MajorVersionDto | undefined>(
      (latest, candidate) => !latest || candidate.versionNumber > latest.versionNumber ? candidate : latest,
      undefined,
    );
    const versionNumber = (previousVersion?.versionNumber ?? 0) + 1;
    const previousRawPayload = previousVersion?.rawContentBlocks;
    const promotionResult = existingVersions.length === 0 ? 'CREATED' : 'VERSION_CREATED';

    let sourceId: string | undefined;
    const sourceName =
      typeof payload.metadata?.sourceFileName === 'string'
        ? payload.metadata.sourceFileName
        : 'import_promotion';
    const sourceUri = payload.sourceUrl || payload.officialSourceUrl;
    const sourceHash = createHash('sha256').update(JSON.stringify(rawPayload)).digest('hex');

    if (this.repository.createSource) {
      const source = await this.repository.createSource({
        majorId,
        profileId: profile?.id,
        sourceType:
          payload.sourceImportMode === 'DETAIL_DOSSIER' ? 'DETAIL_DOSSIER' : 'CATALOG_FILE',
        sourceName,
        sourceUri,
        sourceHash,
        importedAt: new Date(),
        metadata: {
          importRecordId: record.id,
          importStatus: record.status,
          crossListingContext: MajorDeduplicationService.generateCrossListingContext(payload),
          sourceImportMode: payload.sourceImportMode ?? 'CATALOG_IDENTITY_ONLY',
        },
      });
      sourceId = source.id;
    }

    await this.attachAliases(majorId, payload, sourceId);
    await this.attachClassificationMappings(majorId, profile?.id, payload);

    if (this.repository.createVersion) {
      const version = await this.repository.createVersion({
        majorId,
        profileId: profile?.id,
        versionNumber,
        status: 'NEEDS_REVIEW',
        sourceImportRecordId: record.id,
        sourceFileName: sourceName,
        sourceUri,
        sourceHash,
        importedAt: new Date(),
        changeSummary: this.buildChangeSummary(payload, previousRawPayload, promotionResult),
        rawContentBlocks: this.asRecord(rawPayload),
        metadata: {
          importStatus: record.status,
          promotionResult,
          profileKey: MajorDeduplicationService.generateProfileKey(payload),
          sourceImportMode: payload.sourceImportMode ?? 'CATALOG_IDENTITY_ONLY',
          contentBlockCount: Array.isArray(payload.contentBlocks)
            ? payload.contentBlocks.length
            : 0,
        },
      });
      await this.attachContentSections(profile?.id, version.id, payload);
    }

    return versionNumber;
  }

  private buildChangeSummary(
    payload: MajorImportPayload,
    previousRawPayload: unknown,
    promotionResult: 'CREATED' | 'VERSION_CREATED',
  ): Record<string, unknown> {
    const current = this.asRecord(payload);
    const previous = this.asRecord(previousRawPayload);
    const currentKeys = new Set(Object.keys(current));
    const previousKeys = new Set(Object.keys(previous));

    const addedFields = [...currentKeys].filter((key) => !previousKeys.has(key));
    const removedFields = [...previousKeys].filter((key) => !currentKeys.has(key));
    const changedFields = [...currentKeys].filter((key) => {
      if (!previousKeys.has(key)) return false;
      return JSON.stringify(current[key]) !== JSON.stringify(previous[key]);
    });

    return {
      addedFields: promotionResult === 'CREATED' ? Object.keys(current) : addedFields,
      changedFields,
      removedFields,
      fieldCount: Object.keys(current).length,
      previousFieldCount: Object.keys(previous).length,
      diffSource: previousRawPayload ? 'PREVIOUS_VERSION' : 'INITIAL_IMPORT',
    };
  }

  private normalizeLevel(value: string | undefined): MajorLevel | undefined {
    const level = value?.trim().toUpperCase();
    if (level === 'BACHELOR' || level === 'بكالوريوس') return 'BACHELOR';
    if (level === 'MASTER' || level === 'ماجستير') return 'MASTER';
    if (level === 'DOCTORATE' || level === 'دكتوراه' || level === 'PHD') return 'DOCTORATE';
    if (level === 'FELLOWSHIP' || level === 'زمالة') return 'FELLOWSHIP';
    return undefined;
  }

  private pickLocalizedName(payload: MajorImportPayload, locale: 'ar' | 'en'): string | undefined {
    const names = payload.localizedNames;
    if (!names || typeof names !== 'object') {
      return undefined;
    }
    const value = names[locale];
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  private async ensureLevelProfile(
    majorId: string,
    payload: MajorImportPayload,
    sourceImportRecordId?: string,
  ): Promise<MajorLevelProfileDto | undefined> {
    const level = this.normalizeLevel(payload.degreeLevel);
    if (!level || !this.repository.createLevelProfile) {
      return undefined;
    }

    const code = payload.classificationCode;
    if (this.repository.findLevelProfile) {
      const existing = await this.repository.findLevelProfile(majorId, level, code);
      if (existing) {
        return existing;
      }
    }

    const classification = MajorCompletenessClassifier.classify({ ...payload, sourceImportRecordId });
    const taxonomyRes = await this.resolveTaxonomy(payload);

    return this.repository.createLevelProfile({
      majorId,
      level,
      degreeLevelId: payload.degreeLevelId,
      code,
      displayName: payload.canonicalMajorName,
      localizedNameAr: this.pickLocalizedName(payload, 'ar'),
      localizedNameEn: this.pickLocalizedName(payload, 'en'),
      collegeContext: payload.collegeOrFaculty || payload.facultyName,
      academicFieldId: payload.academicFieldId || taxonomyRes.academicFieldId,
      disciplineId: payload.disciplineId || taxonomyRes.disciplineId,
      status: MajorStatus.READY_TO_REVIEW,
      completenessStatus: classification.state,
      metadata: {
        profileKey: MajorDeduplicationService.generateProfileKey(payload),
        sourceClassificationSystem: payload.sourceClassificationSystem,
        academicFieldOrDiscipline: payload.academicFieldOrDiscipline,
        sourceImportMode: payload.sourceImportMode ?? 'CATALOG_IDENTITY_ONLY',
        taxonomyResolutionOutcome: taxonomyRes.outcome,
        taxonomyConfidence: taxonomyRes.confidence,
        taxonomyReason: taxonomyRes.reason,
      },
    });
  }

  private toStringArray(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.filter(
        (item): item is string => typeof item === 'string' && item.trim().length > 0,
      );
    }
    if (typeof value === 'string' && value.trim()) {
      return [value.trim()];
    }
    return [];
  }

  private async attachAliases(
    majorId: string,
    payload: MajorImportPayload,
    sourceId: string | undefined,
  ): Promise<void> {
    if (!this.repository.createAliases) {
      return;
    }

    const aliases: Array<Omit<MajorAliasDto, 'id'>> = [];
    const localizedAr = this.pickLocalizedName(payload, 'ar');
    const localizedEn = this.pickLocalizedName(payload, 'en');

    const pushAlias = (
      alias: string | undefined,
      locale: string | undefined,
      aliasType: NonNullable<MajorAliasDto['aliasType']>,
    ) => {
      const trimmed = alias?.trim();
      if (!trimmed) return;
      aliases.push({
        majorId,
        locale,
        alias: trimmed,
        normalizedAlias: MajorNamingService.normalizeSearchText(trimmed),
        aliasType,
        sourceId,
      });
    };

    pushAlias(payload.canonicalMajorName, undefined, 'ALIAS');
    pushAlias(localizedAr, 'ar', 'TRANSLATION');
    pushAlias(localizedEn, 'en', 'TRANSLATION');
    this.toStringArray(payload.aliases).forEach((alias) => pushAlias(alias, undefined, 'ALIAS'));
    this.toStringArray(payload.synonyms).forEach((alias) => pushAlias(alias, undefined, 'SYNONYM'));

    await this.repository.createAliases(aliases);
  }

  private async attachClassificationMappings(
    majorId: string,
    profileId: string | undefined,
    payload: MajorImportPayload,
  ): Promise<void> {
    if (!this.repository.createClassificationMappings) {
      return;
    }

    const taxonomyRes = await this.resolveTaxonomy(payload);
    const mappings: Array<Omit<MajorClassificationMappingDto, 'id'>> = [];

    if (taxonomyRes.outcome === TaxonomyResolutionOutcome.EXACT_MATCH) {
      const targetNodeId =
        taxonomyRes.programAreaId || taxonomyRes.disciplineId || taxonomyRes.academicFieldId;
      if (targetNodeId) {
        mappings.push({
          majorId,
          profileId,
          taxonomyNodeId: targetNodeId,
          relationshipType: 'PRIMARY',
          standardType: taxonomyRes.standardType || payload.sourceClassificationSystem,
          standardCode: taxonomyRes.standardCode || payload.classificationCode,
          confidence: taxonomyRes.confidence,
          notes: taxonomyRes.reason,
          metadata: {
            sourceImportMode: payload.sourceImportMode ?? 'CATALOG_IDENTITY_ONLY',
            taxonomyResolutionOutcome: taxonomyRes.outcome,
          },
        });
      }
    } else {
      if (payload.academicFieldId) {
        mappings.push({
          majorId,
          profileId,
          taxonomyNodeId: payload.academicFieldId,
          relationshipType: 'PRIMARY',
          standardType: payload.sourceClassificationSystem,
          standardCode: payload.classificationCode,
          confidence: 0.9,
          metadata: { sourceImportMode: payload.sourceImportMode ?? 'CATALOG_IDENTITY_ONLY' },
        });
      }
      if (payload.disciplineId) {
        mappings.push({
          majorId,
          profileId,
          taxonomyNodeId: payload.disciplineId,
          relationshipType: 'SECONDARY',
          standardType: payload.sourceClassificationSystem,
          standardCode: payload.classificationCode,
          confidence: 0.8,
          metadata: { sourceImportMode: payload.sourceImportMode ?? 'CATALOG_IDENTITY_ONLY' },
        });
      }
    }

    if (mappings.length > 0) {
      await this.repository.createClassificationMappings(mappings);
    }
  }

  private resolveTaxonomy(payload: MajorImportPayload) {
    return this.canonicalReferences
      ? this.canonicalReferences.resolve(payload)
      : Promise.resolve(this.taxonomyResolver.resolve(payload));
  }

  private async attachContentSections(
    profileId: string | undefined,
    versionId: string | undefined,
    payload: MajorImportPayload,
  ): Promise<void> {
    if (
      !this.repository.createContentSections ||
      !versionId ||
      !Array.isArray(payload.contentBlocks)
    ) {
      return;
    }

    const sections = payload.contentBlocks
      .map((block, index) => this.toContentSection(block, index, profileId, versionId))
      .filter((section): section is Omit<MajorContentSectionDto, 'id'> => Boolean(section));

    await this.repository.createContentSections(sections);
  }

  private toContentSection(
    block: Record<string, unknown>,
    index: number,
    profileId: string | undefined,
    versionId: string,
  ): Omit<MajorContentSectionDto, 'id'> | undefined {
    const content = typeof block.content === 'string' ? block.content.trim() : '';
    if (!content) return undefined;

    return {
      profileId,
      versionId,
      sectionKey:
        typeof block.blockKey === 'string' && block.blockKey.trim()
          ? block.blockKey.trim()
          : `section-${String(index + 1).padStart(2, '0')}`,
      title: typeof block.title === 'string' ? block.title : undefined,
      locale: this.resolveContentLocale(block),
      content,
      sourceSectionPath:
        typeof block.sourceSectionPath === 'string' ? block.sourceSectionPath : undefined,
      reviewStatus: 'NEEDS_REVIEW',
      metadata: {
        sourceLevel: block.level,
        sourceReviewStatus: block.reviewStatus,
        localeResolution: this.resolveContentLocale(block) ? 'SOURCE_DECLARED' : 'UNKNOWN_REVIEW_REQUIRED',
      },
    };
  }

  private resolveContentLocale(block: Record<string, unknown>): string | undefined {
    const raw = block.locale ?? block.sourceLocale ?? block.language ?? block.contentLocale;
    if (typeof raw !== 'string') return undefined;
    const normalized = raw.trim().toLowerCase();
    if (!normalized) return undefined;
    if (['ar', 'ara', 'arabic', 'العربية', 'عربي'].includes(normalized)) return 'ar';
    if (['en', 'eng', 'english', 'الإنجليزية', 'انجليزي', 'إنجليزي'].includes(normalized)) return 'en';
    return normalized;
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return {};
  }
}
