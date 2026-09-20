import type { UniversalImportHandoff } from '@manaratak/domain';
import type { SupportedLocale } from '@manaratak/shared';

export type TranslationCanonicalEntityKind = 'UNIVERSITY' | 'MAJOR';
export type TranslationImportReviewStatus = 'NEEDS_REVIEW' | 'APPROVED';
export type TranslationImportFieldKind = 'DISPLAY_NAME' | 'DESCRIPTION' | 'CONTENT_SECTION';
export type TranslationDiffState = 'CREATE' | 'UPDATE' | 'NO_CHANGE';
export type TranslationTransferState = 'APPLIED' | 'NO_CHANGE';

export interface TranslationSectionOwner {
  profileId?: string;
  versionId?: string;
}

export interface TranslationTargetLocator {
  entityKind: TranslationCanonicalEntityKind;
  entityPublicId: string;
  locale: SupportedLocale;
  fieldKind: TranslationImportFieldKind;
  fieldKey: string;
  sectionKey?: string;
  sectionOwner?: TranslationSectionOwner;
}

export interface TranslationTargetSnapshot {
  locator: TranslationTargetLocator;
  internalEntityId: string;
  publicId: string;
  entityStatus: string;
  currentValue: string | null;
  currentReviewStatus?: string | null;
  storageRecordId?: string | null;
}

export interface TranslationImportEvidence {
  handoffId: string;
  artifact: UniversalImportHandoff['artifact'];
  provenance: UniversalImportHandoff['provenance'];
  execution: UniversalImportHandoff['execution'];
  correlationId?: string;
  referenceMetadata?: Readonly<Record<string, string>>;
}

export interface TranslationStagedCandidate {
  stagingKey: string;
  target: TranslationTargetSnapshot;
  translatedValue: string;
  expectedCurrentValue: string | null;
  reviewStatus: TranslationImportReviewStatus;
  diffState: TranslationDiffState;
  evidence: TranslationImportEvidence;
}

export interface TranslationTransferApproval {
  decision: 'APPLY' | 'REJECT';
  reviewedBy: string;
  reviewedAt?: Date;
}

export interface TranslationTransferResult {
  state: TranslationTransferState;
  internalEntityId: string;
  publicId: string;
  locale: SupportedLocale;
  fieldKey: string;
  previousValue: string | null;
  currentValue: string;
}

export interface ITranslationImportGateway {
  resolveExact(locator: TranslationTargetLocator): Promise<TranslationTargetSnapshot | null>;
  applyApproved(
    candidate: TranslationStagedCandidate,
    approval: TranslationTransferApproval,
  ): Promise<TranslationTransferResult>;
}
