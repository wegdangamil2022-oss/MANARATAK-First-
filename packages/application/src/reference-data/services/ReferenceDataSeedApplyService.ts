import {
  IReferenceDataRepository,
  IReferenceDataValidationService,
  ReferenceDataValidationService,
  ReferenceDataValidationSeverity,
  ReferenceDataSeedBatch,
  ReferenceDataSeedStatus,
  UpsertReferenceCountryDto,
  UpsertReferenceCurrencyDto,
  UpsertReferenceLanguageDto,
  UpsertReferenceCityDto
} from '@manaratak/domain';

export class ReferenceDataSeedApplyService {
  constructor(
    private readonly repository: IReferenceDataRepository,
    private readonly validationService: IReferenceDataValidationService = new ReferenceDataValidationService(),
  ) {}

  public async applyBatch(
    batch: ReferenceDataSeedBatch,
    appliedBy: string
  ): Promise<ReferenceDataSeedBatch> {
    if (batch.status !== ReferenceDataSeedStatus.READY_TO_APPLY) {
      throw new Error(`Cannot apply batch: status must be READY_TO_APPLY, but got ${batch.status}`);
    }

    if (!batch.validationSummary) {
      throw new Error('Cannot apply batch: missing validationSummary');
    }

    if (batch.validationSummary.invalidRecords > 0) {
      throw new Error('Cannot apply batch: validationSummary contains invalid records');
    }

    for (const record of batch.records) {
      if (!record.validationReport) {
        throw new Error('Cannot apply batch: one or more records are missing validationReport');
      }

      if (!record.validationReport.canBeImported) {
        throw new Error('Cannot apply batch: one or more records cannot be imported');
      }

      if (!record.deterministicKey) {
        throw new Error('Cannot apply batch: one or more records are missing deterministicKey');
      }
    }

    for (const record of batch.records) {
      switch (record.entityType) {
        case 'COUNTRY': {
          const payload = record.payload as UpsertReferenceCountryDto;
          this.assertNoCanonicalErrors(this.validationService.validateCountry(payload).issues);
          await this.repository.upsertCountry(payload);
          break;
        }
        case 'CURRENCY': {
          const payload = record.payload as UpsertReferenceCurrencyDto;
          this.assertNoCanonicalErrors(this.validationService.validateCurrency(payload).issues);
          await this.repository.upsertCurrency(payload);
          break;
        }
        case 'LANGUAGE': {
          const payload = record.payload as UpsertReferenceLanguageDto;
          this.assertNoCanonicalErrors(this.validationService.validateLanguage(payload).issues);
          await this.repository.upsertLanguage(payload);
          break;
        }
        case 'CITY': {
          const payload = record.payload as UpsertReferenceCityDto;
          this.assertNoCanonicalErrors(this.validationService.validateCity(payload).issues);
          const country = await this.repository.getCountry(payload.countryIso2Code);
          if (!country || !country.isActive) {
            throw new Error(`REFERENCE_DATA_SEED_ACTIVE_COUNTRY_REQUIRED:${payload.countryIso2Code}`);
          }
          if (payload.administrativeRegionId) {
            const region = await this.repository.getRegionById(payload.administrativeRegionId);
            if (!region) {
              throw new Error(`REFERENCE_DATA_SEED_REGION_NOT_FOUND:${payload.administrativeRegionId}`);
            }
            if (region.countryIso2Code !== country.iso2Code) {
              throw new Error('REFERENCE_DATA_SEED_CITY_REGION_COUNTRY_MISMATCH');
            }
          }
          if (!country.id) throw new Error('REFERENCE_DATA_SEED_CANONICAL_COUNTRY_ID_REQUIRED');
          await this.repository.upsertCity({ ...payload, countryReferenceId: country.id });
          break;
        }
        default:
          throw new Error(`Unsupported entityType: ${(record as any).entityType}`);
      }
    }

    return {
      ...batch,
      status: ReferenceDataSeedStatus.APPLIED,
      appliedAt: new Date(),
      appliedBy,
      records: batch.records.map(r => ({ ...r }))
    };
  }
  private assertNoCanonicalErrors(issues: readonly { severity: ReferenceDataValidationSeverity }[]): void {
    if (issues.some((issue) => issue.severity === ReferenceDataValidationSeverity.ERROR)) {
      throw new Error('REFERENCE_DATA_SEED_CANONICAL_VALIDATION_FAILED');
    }
  }

}
