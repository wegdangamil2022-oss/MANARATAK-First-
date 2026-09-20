import {
  ITranslationImportGateway,
  TranslationStagedCandidate,
  TranslationTransferApproval,
  TranslationTransferResult,
} from './TranslationImportContracts';

export class TranslationImportTransferService {
  constructor(private readonly gateway: ITranslationImportGateway) {}

  async transfer(
    candidate: TranslationStagedCandidate,
    approval: TranslationTransferApproval,
  ): Promise<TranslationTransferResult> {
    if (approval.decision !== 'APPLY') {
      throw new Error('TRANSLATION_TRANSFER_NOT_APPROVED');
    }
    if (!approval.reviewedBy.trim()) {
      throw new Error('TRANSLATION_TRANSFER_REVIEWER_REQUIRED');
    }
    if (candidate.reviewStatus !== 'APPROVED') {
      throw new Error('TRANSLATION_REVIEW_REQUIRED_BEFORE_TRANSFER');
    }
    if (candidate.evidence.execution.dryRun) {
      throw new Error('TRANSLATION_DRY_RUN_TRANSFER_BLOCKED');
    }

    return this.gateway.applyApproved(candidate, approval);
  }
}
