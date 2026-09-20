import { Prisma, PrismaClient } from '@prisma/client';
import {
  ITranslationImportGateway,
  TranslationStagedCandidate,
  TranslationTargetLocator,
  TranslationTargetSnapshot,
  TranslationTransferApproval,
  TranslationTransferResult,
} from '@manaratak/application';

type TranslationPrismaClient = PrismaClient | Prisma.TransactionClient;

export class PrismaTranslationImportGateway implements ITranslationImportGateway {
  constructor(private readonly prisma: PrismaClient) {}

  async resolveExact(locator: TranslationTargetLocator): Promise<TranslationTargetSnapshot | null> {
    return this.resolveWithClient(this.prisma, locator);
  }

  async applyApproved(
    candidate: TranslationStagedCandidate,
    approval: TranslationTransferApproval,
  ): Promise<TranslationTransferResult> {
    return this.prisma.$transaction(
      async (tx) => {
        const latest = await this.resolveWithClient(tx, candidate.target.locator);
        if (!latest) {
          throw new Error(`TRANSLATION_CANONICAL_TARGET_NOT_FOUND:${candidate.target.publicId}`);
        }
        if (
          latest.publicId !== candidate.target.publicId ||
          latest.internalEntityId !== candidate.target.internalEntityId ||
          latest.locator.entityKind !== candidate.target.locator.entityKind
        ) {
          throw new Error('TRANSLATION_EXACT_IDENTITY_RESOLUTION_VIOLATION');
        }

        if (latest.currentValue === candidate.translatedValue) {
          return this.result('NO_CHANGE', latest, candidate.translatedValue);
        }
        if (latest.currentValue !== candidate.expectedCurrentValue) {
          throw new Error('TRANSLATION_STALE_DIFF_REVIEW_REQUIRED');
        }

        if (latest.locator.entityKind === 'UNIVERSITY') {
          await this.applyUniversityTranslation(tx, latest, candidate, approval);
        } else if (latest.locator.fieldKind === 'DISPLAY_NAME') {
          await this.applyMajorName(tx, latest, candidate.translatedValue);
        } else if (latest.locator.fieldKind === 'CONTENT_SECTION') {
          await this.applyMajorContentSection(tx, latest, candidate, approval);
        } else {
          throw new Error(`TRANSLATION_FIELD_UNSUPPORTED:MAJOR:${latest.locator.fieldKey}`);
        }

        return this.result('APPLIED', latest, candidate.translatedValue);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  private async resolveWithClient(
    client: TranslationPrismaClient,
    locator: TranslationTargetLocator,
  ): Promise<TranslationTargetSnapshot | null> {
    if (locator.entityKind === 'UNIVERSITY') {
      const university = await client.university.findUnique({
        where: { publicId: locator.entityPublicId },
        select: { id: true, publicId: true, status: true },
      });
      if (!university) return null;

      const translation = await client.universityTranslation.findUnique({
        where: {
          universityId_locale: {
            universityId: university.id,
            locale: locator.locale,
          },
        },
        select: {
          id: true,
          displayName: true,
          description: true,
          reviewStatus: true,
        },
      });

      const currentValue = locator.fieldKind === 'DISPLAY_NAME'
        ? translation?.displayName ?? null
        : locator.fieldKind === 'DESCRIPTION'
          ? translation?.description ?? null
          : null;

      if (locator.fieldKind === 'CONTENT_SECTION') {
        throw new Error(`TRANSLATION_FIELD_UNSUPPORTED:UNIVERSITY:${locator.fieldKey}`);
      }

      return {
        locator,
        internalEntityId: university.id,
        publicId: university.publicId,
        entityStatus: university.status,
        currentValue,
        currentReviewStatus: translation?.reviewStatus ?? null,
        storageRecordId: translation?.id ?? null,
      };
    }

    const major = await client.major.findUnique({
      where: { publicId: locator.entityPublicId },
      select: {
        id: true,
        publicId: true,
        status: true,
        localizedNameAr: true,
        localizedNameEn: true,
      },
    });
    if (!major) return null;

    if (locator.fieldKind === 'DISPLAY_NAME') {
      return {
        locator,
        internalEntityId: major.id,
        publicId: major.publicId,
        entityStatus: major.status,
        currentValue: locator.locale === 'ar' ? major.localizedNameAr : major.localizedNameEn,
        currentReviewStatus: null,
        storageRecordId: null,
      };
    }

    if (locator.fieldKind !== 'CONTENT_SECTION' || !locator.sectionKey || !locator.sectionOwner) {
      throw new Error(`TRANSLATION_FIELD_UNSUPPORTED:MAJOR:${locator.fieldKey}`);
    }

    await this.assertMajorSectionOwner(client, major.id, locator);
    const sections = await client.majorContentSection.findMany({
      where: {
        sectionKey: locator.sectionKey,
        locale: locator.locale,
        ...(locator.sectionOwner.profileId ? { profileId: locator.sectionOwner.profileId } : {}),
        ...(locator.sectionOwner.versionId ? { versionId: locator.sectionOwner.versionId } : {}),
      },
      select: { id: true, content: true, reviewStatus: true },
      orderBy: { createdAt: 'desc' },
      take: 2,
    });
    if (sections.length > 1) {
      throw new Error('TRANSLATION_SECTION_TARGET_AMBIGUOUS');
    }
    const section = sections[0];
    return {
      locator,
      internalEntityId: major.id,
      publicId: major.publicId,
      entityStatus: major.status,
      currentValue: section?.content ?? null,
      currentReviewStatus: section?.reviewStatus ?? null,
      storageRecordId: section?.id ?? null,
    };
  }

  private async assertMajorSectionOwner(
    client: TranslationPrismaClient,
    majorId: string,
    locator: TranslationTargetLocator,
  ): Promise<void> {
    const owner = locator.sectionOwner;
    if (!owner || (!owner.profileId && !owner.versionId)) {
      throw new Error('TRANSLATION_SECTION_OWNER_REQUIRED');
    }

    let profileMajorId: string | null = null;
    if (owner.profileId) {
      const profile = await client.majorLevelProfile.findUnique({
        where: { id: owner.profileId },
        select: { majorId: true },
      });
      if (!profile || profile.majorId !== majorId) {
        throw new Error('TRANSLATION_SECTION_PROFILE_OWNER_MISMATCH');
      }
      profileMajorId = profile.majorId;
    }

    if (owner.versionId) {
      const version = await client.majorVersion.findUnique({
        where: { id: owner.versionId },
        select: { majorId: true, profileId: true },
      });
      if (!version || version.majorId !== majorId) {
        throw new Error('TRANSLATION_SECTION_VERSION_OWNER_MISMATCH');
      }
      if (owner.profileId && version.profileId && version.profileId !== owner.profileId) {
        throw new Error('TRANSLATION_SECTION_PROFILE_VERSION_MISMATCH');
      }
      if (profileMajorId && version.majorId !== profileMajorId) {
        throw new Error('TRANSLATION_SECTION_PROFILE_VERSION_MISMATCH');
      }
    }
  }

  private async applyUniversityTranslation(
    tx: Prisma.TransactionClient,
    latest: TranslationTargetSnapshot,
    candidate: TranslationStagedCandidate,
    approval: TranslationTransferApproval,
  ): Promise<void> {
    const existing = await tx.universityTranslation.findUnique({
      where: {
        universityId_locale: {
          universityId: latest.internalEntityId,
          locale: latest.locator.locale,
        },
      },
      select: { metadata: true },
    });
    const metadata = this.withEvidence(existing?.metadata, candidate, approval);
    const fieldData = latest.locator.fieldKind === 'DISPLAY_NAME'
      ? { displayName: candidate.translatedValue }
      : { description: candidate.translatedValue };

    await tx.universityTranslation.upsert({
      where: {
        universityId_locale: {
          universityId: latest.internalEntityId,
          locale: latest.locator.locale,
        },
      },
      create: {
        universityId: latest.internalEntityId,
        locale: latest.locator.locale,
        ...fieldData,
        reviewStatus: 'APPROVED',
        metadata,
      },
      update: {
        ...fieldData,
        reviewStatus: 'APPROVED',
        metadata,
      },
    });
  }

  private async applyMajorName(
    tx: Prisma.TransactionClient,
    latest: TranslationTargetSnapshot,
    translatedValue: string,
  ): Promise<void> {
    await tx.major.update({
      where: { id: latest.internalEntityId },
      data: latest.locator.locale === 'ar'
        ? { localizedNameAr: translatedValue }
        : { localizedNameEn: translatedValue },
    });
  }

  private async applyMajorContentSection(
    tx: Prisma.TransactionClient,
    latest: TranslationTargetSnapshot,
    candidate: TranslationStagedCandidate,
    approval: TranslationTransferApproval,
  ): Promise<void> {
    const existing = latest.storageRecordId
      ? await tx.majorContentSection.findUnique({
          where: { id: latest.storageRecordId },
          select: { id: true, metadata: true },
        })
      : null;
    const metadata = this.withEvidence(existing?.metadata, candidate, approval);

    if (existing) {
      await tx.majorContentSection.update({
        where: { id: existing.id },
        data: {
          content: candidate.translatedValue,
          reviewStatus: 'APPROVED',
          metadata,
        },
      });
      return;
    }

    const owner = latest.locator.sectionOwner;
    if (!owner || !latest.locator.sectionKey) {
      throw new Error('TRANSLATION_SECTION_OWNER_REQUIRED');
    }
    await tx.majorContentSection.create({
      data: {
        profileId: owner.profileId,
        versionId: owner.versionId,
        sectionKey: latest.locator.sectionKey,
        locale: latest.locator.locale,
        content: candidate.translatedValue,
        reviewStatus: 'APPROVED',
        metadata,
      },
    });
  }

  private withEvidence(
    existing: Prisma.JsonValue | null | undefined,
    candidate: TranslationStagedCandidate,
    approval: TranslationTransferApproval,
  ): Prisma.InputJsonObject {
    const current = existing && typeof existing === 'object' && !Array.isArray(existing)
      ? existing as Prisma.JsonObject
      : {};
    const evidence = candidate.evidence;
    return {
      ...current,
      translationImport: {
        handoffId: evidence.handoffId,
        stagingKey: candidate.stagingKey,
        sourceSystem: evidence.provenance.sourceSystem,
        ...(evidence.provenance.acquiredAt
          ? { acquiredAt: evidence.provenance.acquiredAt.toISOString() }
          : {}),
        artifactId: evidence.artifact.artifactId,
        sourceId: evidence.artifact.sourceId,
        rawArtifactReference: evidence.artifact.rawArtifactReference,
        idempotencyKey: evidence.execution.idempotencyKey,
        reviewedBy: approval.reviewedBy,
        reviewedAt: (approval.reviewedAt ?? new Date()).toISOString(),
        ...(evidence.provenance.sourceRowNumber !== undefined
          ? { sourceRowNumber: evidence.provenance.sourceRowNumber }
          : {}),
        ...(evidence.provenance.contentHash
          ? { contentHash: evidence.provenance.contentHash }
          : {}),
      },
    } as Prisma.InputJsonObject;
  }

  private result(
    state: 'APPLIED' | 'NO_CHANGE',
    snapshot: TranslationTargetSnapshot,
    translatedValue: string,
  ): TranslationTransferResult {
    return {
      state,
      internalEntityId: snapshot.internalEntityId,
      publicId: snapshot.publicId,
      locale: snapshot.locator.locale,
      fieldKey: snapshot.locator.fieldKey,
      previousValue: snapshot.currentValue,
      currentValue: translatedValue,
    };
  }
}
