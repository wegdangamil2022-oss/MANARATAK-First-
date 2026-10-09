import type {
  IReferenceDataRepository,
  IReferenceDataValidationService,
  ReferenceDataSeedBatch,
} from '@manaratak/domain';

/**
 * DELIBERATELY DISABLED (06.20 / 06.21).
 *
 * The legacy implementation called repository.upsert* once per row without
 * a durable owner approval/inbox receipt spanning all canonical mutations,
 * audit and outbox writes. READY_TO_APPLY can be forged in a request object.
 *
 * P6 -> P7 now supports SCREENING_ONLY with durable screening receipts. The
 * actual apply path must be implemented behind a P7-owned atomic approval
 * receipt and a source-identity/content-hash check before this can be replaced.
 * Never reinterpret VALIDATED or READY_TO_APPLY as a publication permission.
 */
export class ReferenceDataSeedApplyService {
  constructor(
    _repository: IReferenceDataRepository,
    _validationService?: IReferenceDataValidationService,
  ) {}

  public async applyBatch(
    _batch: ReferenceDataSeedBatch,
    _appliedBy: string,
  ): Promise<ReferenceDataSeedBatch> {
    throw new Error('REFERENCE_DATA_SEED_APPLY_REQUIRES_DURABLE_OWNER_APPROVAL');
  }
}
