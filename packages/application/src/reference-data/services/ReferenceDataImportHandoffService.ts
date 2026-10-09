import {
  ReferenceDataSeedPlanner,
  ReferenceDataSeedBatch,
  ReferenceDataSeedRecord,
  UpsertReferenceCountryDto,
  UpsertReferenceCurrencyDto,
  UpsertReferenceLanguageDto,
  UpsertReferenceCityDto
} from '@manaratak/domain';

export interface ReferenceDataImportHandoffCommand {
  seedBatchId: string;
  sourceName: string;
  sourceVersion: string;
  entityType: 'COUNTRY' | 'CURRENCY' | 'LANGUAGE' | 'CITY';
  records: Array<
    | Record<string, unknown>
    | UpsertReferenceCountryDto
    | UpsertReferenceCurrencyDto
    | UpsertReferenceLanguageDto
    | UpsertReferenceCityDto
  >;
}

export class ReferenceDataImportHandoffService {
  constructor(
    private readonly seedPlanner: ReferenceDataSeedPlanner = new ReferenceDataSeedPlanner()
  ) {}

  public prepareSeedBatch(command: ReferenceDataImportHandoffCommand): ReferenceDataSeedBatch {
    // Staging does not invent identity keys: the domain validator is the
    // single owner of code/name/region normalization and collision policy.
    const seedRecords: ReferenceDataSeedRecord[] = command.records.map(rawRecord => ({
      entityType: command.entityType,
      payload: { ...rawRecord } as ReferenceDataSeedRecord['payload'],
    }));

    const draftBatch = this.seedPlanner.createBatch({
      seedBatchId: command.seedBatchId,
      sourceName: command.sourceName,
      sourceVersion: command.sourceVersion,
      records: seedRecords
    });

    const validatedBatch = this.seedPlanner.validateBatch(draftBatch);

    // VALIDATED does NOT equal reviewed/approved. No auto-ready or auto-apply.
    // P7's durable operator approval gate remains mandatory and fail-closed.
    return validatedBatch;
  }
}
