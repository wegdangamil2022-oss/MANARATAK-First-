import { v4 as uuidv4 } from 'uuid';
import {
  IFellowshipDefinitionRepository,
  FellowshipDeduplicationService,
  ImportRecordDto,
  ImportRecordStatus,
  MajorCompletenessClassifier,
  MajorImportCompletenessState,
  MajorImportPayload,
  MajorImportPayloadSchema,
  MajorNamingService,
  MajorStatus,
  resolveMajorSourceIdentity,
} from '@manaratak/domain';

export type FellowshipPromotionResult =
  | { type: 'CREATED'; fellowshipId: string }
  | { type: 'UPDATED'; existingId: string }
  | { type: 'REJECTED'; reason: string }
  | { type: 'FAILED'; error: string };

export class FellowshipImportPromotionUseCase {
  constructor(private readonly repository: IFellowshipDefinitionRepository) {}

  public async promote(record: ImportRecordDto): Promise<FellowshipPromotionResult> {
    try {
      if (
        record.status !== ImportRecordStatus.VALID &&
        record.status !== ImportRecordStatus.COMPLETE &&
        record.status !== ImportRecordStatus.NEEDS_REVIEW
      ) {
        return { type: 'REJECTED', reason: `ImportRecord status is ${record.status}, not VALID or NEEDS_REVIEW` };
      }

      const rawPayload = record.normalizedPayload || record.rawPayload;
      const validationResult = MajorImportPayloadSchema.safeParse(rawPayload);
      if (!validationResult.success) {
        return { type: 'REJECTED', reason: 'Payload fails fellowship schema validation' };
      }

      const payload = validationResult.data;
      const classification = MajorCompletenessClassifier.classify(payload);
      if (classification.state === MajorImportCompletenessState.INCOMPLETE) {
        return { type: 'REJECTED', reason: 'Fellowship record classified as INCOMPLETE' };
      }

      const canonicalName = MajorNamingService.normalize(payload.canonicalMajorName);
      const dedupKey = FellowshipDeduplicationService.generateKey(payload);
      const existing = await this.repository.findByDedupKey(dedupKey);
      const optionalFields = this.buildOptionalFields(payload, rawPayload, record);

      if (existing) {
        const updated = await this.repository.update(existing.id, {
          displayName: payload.canonicalMajorName,
          professionalDomain: this.pickString(payload, 'professionalDomain') ?? existing.professionalDomain,
          completenessStatus: classification.state,
          optionalFields: {
            ...(existing.optionalFields ?? {}),
            ...optionalFields,
            previousImportRecordId: existing.optionalFields?.sourceImportRecordId,
          },
        });

        return { type: 'UPDATED', existingId: updated.id };
      }

      const publicId = resolveMajorSourceIdentity(payload.classificationCode, ['FEL'])
        ?? `fel-${uuidv4().substring(0, 8)}`;
      const slugBase = canonicalName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

      const created = await this.repository.create({
        publicId,
        slug: `${slugBase || 'fellowship'}-${publicId.substring(0, 4)}`,
        canonicalName,
        canonicalDedupKey: dedupKey,
        displayName: payload.canonicalMajorName,
        fellowshipType: this.pickString(payload, 'fellowshipType') ?? 'Professional Fellowship',
        professionalDomain: this.pickString(payload, 'professionalDomain') ?? payload.academicFieldOrDiscipline,
        status: classification.state === MajorImportCompletenessState.COMPLETE ? MajorStatus.IMPORTED : MajorStatus.READY_TO_REVIEW,
        completenessStatus: classification.state,
        optionalFields,
      });

      return { type: 'CREATED', fellowshipId: created.id };
    } catch (error) {
      return {
        type: 'FAILED',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private pickString(payload: MajorImportPayload, key: string): string | undefined {
    const value = payload[key];
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  private buildOptionalFields(payload: MajorImportPayload, rawPayload: unknown, record: ImportRecordDto): Record<string, unknown> {
    return {
      localizedNames: payload.localizedNames,
      aliases: payload.aliases,
      synonyms: payload.synonyms,
      relatedMajors: payload.relatedMajors,
      sourceImportRecordId: record.id,
      sourceClassificationSystem: payload.sourceClassificationSystem,
      classificationCode: payload.classificationCode,
      sourceImportMode: payload.sourceImportMode ?? 'CATALOG_IDENTITY_ONLY',
      sourceFileName: this.pickRecordString(record, ['sourceFileName', 'fileName']),
      contentBlocks: payload.contentBlocks,
      rawPayload,
      metadata: payload.metadata,
    };
  }

  private pickRecordString(record: ImportRecordDto, keys: string[]): string | undefined {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
    return undefined;
  }
}
