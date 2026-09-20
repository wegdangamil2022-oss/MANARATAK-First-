import type { IImportHandoffConsumer, UniversalImportHandoff } from '@manaratak/domain';
import { isSupportedLocale } from '@manaratak/shared';
import {
  ITranslationImportGateway,
  TranslationCanonicalEntityKind,
  TranslationImportFieldKind,
  TranslationImportReviewStatus,
  TranslationSectionOwner,
  TranslationStagedCandidate,
  TranslationTargetLocator,
} from './TranslationImportContracts';

const ALLOWED_OWNER_DOMAINS = new Set(['TRANSLATION', 'TRANSLATIONS']);
const MAJOR_PUBLIC_ID = /^(MJR|MAS|DOC|FEL)-\d+$/;
const UNIVERSITY_PUBLIC_ID = /^INS-[A-Z0-9]+(?:-[A-Z0-9]+)+$/;

export class TranslationImportPreparationService
  implements IImportHandoffConsumer<TranslationStagedCandidate>
{
  constructor(private readonly gateway: ITranslationImportGateway) {}

  async accept(handoff: UniversalImportHandoff): Promise<TranslationStagedCandidate> {
    if (!ALLOWED_OWNER_DOMAINS.has(handoff.ownerDomain)) {
      throw new Error(`TRANSLATION_HANDOFF_OWNER_DOMAIN_INVALID:${handoff.ownerDomain}`);
    }
    if (handoff.validation.state === 'INVALID') {
      throw new Error('TRANSLATION_HANDOFF_INVALID');
    }

    const payload = handoff.normalizedPayload;
    const entityPublicId = this.requireExactString(payload.entityPublicId, 'entityPublicId');
    const translatedValue = this.requireNonEmptyString(payload.translatedValue, 'translatedValue');
    const fieldKey = this.requireExactString(payload.fieldKey, 'fieldKey');
    const locale = payload.locale;
    if (!isSupportedLocale(locale)) {
      throw new Error(`TRANSLATION_LOCALE_UNSUPPORTED:${String(locale)}`);
    }

    const reviewStatus = this.parseReviewStatus(payload.reviewStatus);
    const entityKind = this.classifyEntity(entityPublicId);
    const locator = this.buildLocator(
      entityKind,
      entityPublicId,
      locale,
      fieldKey,
      payload.sectionOwner,
    );

    const target = await this.gateway.resolveExact(locator);
    if (!target) {
      throw new Error(`TRANSLATION_CANONICAL_TARGET_NOT_FOUND:${entityPublicId}`);
    }
    if (target.publicId !== entityPublicId || target.locator.entityKind !== entityKind) {
      throw new Error('TRANSLATION_EXACT_IDENTITY_RESOLUTION_VIOLATION');
    }

    const diffState = target.currentValue === translatedValue
      ? 'NO_CHANGE'
      : target.currentValue === null
        ? 'CREATE'
        : 'UPDATE';

    return {
      stagingKey: this.buildStagingKey(locator),
      target,
      translatedValue,
      expectedCurrentValue: target.currentValue,
      reviewStatus,
      diffState,
      evidence: {
        handoffId: handoff.handoffId,
        artifact: handoff.artifact,
        provenance: handoff.provenance,
        execution: handoff.execution,
        correlationId: handoff.correlationId,
        referenceMetadata: handoff.referenceMetadata,
      },
    };
  }

  private classifyEntity(publicId: string): TranslationCanonicalEntityKind {
    if (MAJOR_PUBLIC_ID.test(publicId)) return 'MAJOR';
    if (UNIVERSITY_PUBLIC_ID.test(publicId)) return 'UNIVERSITY';
    throw new Error(`TRANSLATION_CANONICAL_ID_UNSUPPORTED:${publicId}`);
  }

  private buildLocator(
    entityKind: TranslationCanonicalEntityKind,
    entityPublicId: string,
    locale: 'ar' | 'en',
    fieldKey: string,
    rawSectionOwner: unknown,
  ): TranslationTargetLocator {
    let fieldKind: TranslationImportFieldKind;
    let sectionKey: string | undefined;
    let sectionOwner: TranslationSectionOwner | undefined;

    if (fieldKey === 'displayName') {
      fieldKind = 'DISPLAY_NAME';
    } else if (fieldKey === 'description' && entityKind === 'UNIVERSITY') {
      fieldKind = 'DESCRIPTION';
    } else if (fieldKey.startsWith('section:') && entityKind === 'MAJOR') {
      fieldKind = 'CONTENT_SECTION';
      sectionKey = fieldKey.slice('section:'.length);
      if (!sectionKey || sectionKey.trim() !== sectionKey) {
        throw new Error(`TRANSLATION_SECTION_KEY_INVALID:${fieldKey}`);
      }
      sectionOwner = this.parseSectionOwner(rawSectionOwner);
    } else {
      throw new Error(`TRANSLATION_FIELD_UNSUPPORTED:${entityKind}:${fieldKey}`);
    }

    return {
      entityKind,
      entityPublicId,
      locale,
      fieldKind,
      fieldKey,
      sectionKey,
      sectionOwner,
    };
  }

  private parseSectionOwner(value: unknown): TranslationSectionOwner {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('TRANSLATION_SECTION_OWNER_REQUIRED');
    }
    const record = value as Record<string, unknown>;
    const profileId = this.optionalExactString(record.profileId, 'sectionOwner.profileId');
    const versionId = this.optionalExactString(record.versionId, 'sectionOwner.versionId');
    if (!profileId && !versionId) {
      throw new Error('TRANSLATION_SECTION_OWNER_REQUIRED');
    }
    return { profileId, versionId };
  }

  private parseReviewStatus(value: unknown): TranslationImportReviewStatus {
    if (value === 'NEEDS_REVIEW' || value === 'APPROVED') return value;
    throw new Error(`TRANSLATION_REVIEW_STATUS_INVALID:${String(value)}`);
  }

  private requireExactString(value: unknown, field: string): string {
    if (typeof value !== 'string' || value.length === 0 || value.trim() !== value) {
      throw new Error(`TRANSLATION_FIELD_INVALID:${field}`);
    }
    return value;
  }

  private requireNonEmptyString(value: unknown, field: string): string {
    const result = this.requireExactString(value, field);
    if (result.trim().length === 0) throw new Error(`TRANSLATION_FIELD_INVALID:${field}`);
    return result;
  }

  private optionalExactString(value: unknown, field: string): string | undefined {
    if (value === undefined || value === null) return undefined;
    return this.requireExactString(value, field);
  }

  private buildStagingKey(locator: TranslationTargetLocator): string {
    return [
      locator.entityPublicId,
      locator.locale,
      locator.fieldKey,
      locator.sectionOwner?.profileId ?? '-',
      locator.sectionOwner?.versionId ?? '-',
    ].join('|');
  }
}
