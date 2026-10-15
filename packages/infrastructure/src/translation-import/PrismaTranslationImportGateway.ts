import {PrismaMajorTranslationOwnerPort} from '../majors/PrismaMajorTranslationOwnerPort';
import { majorTranslationSource, assertMajorTranslationWorkingVersion, translationRecord } from '../majors/MajorTranslationEvidence';
import { universityTranslationSourceSelect, universityTranslationSourceDigest, universityTranslationValueDigest } from '../universities/UniversityTranslationSourceEvidence';
import { createHash, randomUUID } from 'node:crypto';
import { assertTranslationContentAuthoringEnabled } from '@manaratak/shared';
import type { AtomicPersistenceContext, AuthorizationEvaluatorService } from '@manaratak/domain';
import { PrismaGovernanceApprovalGateway } from '../authorization/PrismaGovernanceApprovalGateway';
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
  constructor(
    private readonly prisma: PrismaClient,
    private readonly authorization?: AuthorizationEvaluatorService,
  ) {}

  async resolveExact(locator: TranslationTargetLocator): Promise<TranslationTargetSnapshot | null> {
    return this.resolveWithClient(this.prisma, locator);
  }

  async applyApproved(
    candidate: TranslationStagedCandidate,
    approval: TranslationTransferApproval,
  ): Promise<TranslationTransferResult> {
    assertTranslationContentAuthoringEnabled(candidate.target.locator.entityKind);
    if (
      !this.authorization ||
      !approval.actorId ||
      !approval.approvalId ||
      approval.actorId === approval.reviewedBy ||
      candidate.evidence.execution.dryRun ||
      approval.decision !== 'APPLY' ||
      candidate.reviewStatus !== 'APPROVED'
    )
      throw new Error('TRANSLATION_TRUSTED_INDEPENDENT_APPROVAL_REQUIRED');
    const permission =
      candidate.target.locator.entityKind === 'UNIVERSITY'
        ? 'admin:universities:manage'
        : 'admin:majors:manage';
    for (const actor of [approval.actorId, approval.reviewedBy]) {
      if (
        !(
          await this.authorization.evaluatePermission(actor, permission, {
            requestTime: new Date(),
          })
        ).isGranted
      )
        throw new Error('TRANSLATION_OWNER_PERMISSION_DENIED');
    }
    return this.prisma.$transaction(
      async (tx) => {
        assertTranslationContentAuthoringEnabled(candidate.target.locator.entityKind);
        const receiptId =
          'translation-receipt:' +
          createHash('sha256')
            .update(JSON.stringify([candidate.target.locator, candidate.evidence.handoffId]))
            .digest('hex');
        const digest = createHash('sha256')
          .update(
            JSON.stringify([
              candidate.target,
              candidate.translatedValue,
              candidate.evidence.handoffId,
              approval.approvalId,
            ]),
          )
          .digest('hex');
        const previous = await tx.ownerTranslationTransferReceipt.findUnique({
          where: { id: receiptId },
        });
        if (previous) {
          if (
            previous.digest !== digest ||
            previous.actorId !== approval.actorId ||
            previous.reviewerId !== approval.reviewedBy ||
            previous.approvalId !== approval.approvalId
          )
            throw new Error('TRANSLATION_RECEIPT_REPLAY_CONFLICT');
          return {
            ...this.result(
              previous.outcome as 'APPLIED' | 'NO_CHANGE',
              candidate.target,
              candidate.translatedValue,
            ),
            approved: true,
            published: false,
            publicEligible: false,
          };
        }
        if(!candidate.target.ownerSourceDigest || !/^[a-f0-9]{64}$/.test(candidate.target.ownerSourceDigest)) throw new Error('TRANSLATION_SOURCE_EVIDENCE_REQUIRED');
        // Lock the canonical owner; every effect, approval consumption and receipt
        // commits with the owner audit/outbox, including no-op transfers.
        const table =
          candidate.target.locator.entityKind === 'UNIVERSITY'
            ? Prisma.raw('"University"')
            : Prisma.raw('"Major"');
        await tx.$queryRaw(
          Prisma.sql`SELECT id FROM ${table} WHERE id=${candidate.target.internalEntityId} FOR UPDATE`,
        );
        await new PrismaGovernanceApprovalGateway(this.prisma).consume(
          approval.approvalId!,
          'TRANSLATION_TRANSFER',
          {
            target: candidate.target,
            translatedValue: candidate.translatedValue,
            handoffId: candidate.evidence.handoffId,
          },
          approval.actorId!,
          approval.reviewedBy,
          { boundaryId: receiptId, transactionClient: tx } as AtomicPersistenceContext & {transactionClient: Prisma.TransactionClient},
        );
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

        if (
          latest.ownerRevision !== candidate.target.ownerRevision ||
          latest.currentReviewStatus !== candidate.target.currentReviewStatus ||
          latest.sourceDigest !== candidate.target.sourceDigest
        )
          throw new Error('TRANSLATION_STALE_DIFF_REVIEW_REQUIRED');
        if(latest.locator.entityKind==='MAJOR') await assertMajorTranslationWorkingVersion(tx,latest.internalEntityId,latest.locator.sectionOwner!.profileId!,latest.locator.sectionOwner!.versionId!);
        if (latest.currentValue === candidate.translatedValue) {
          return this.finishTransfer(
            tx,
            receiptId,
            digest,
            latest,
            candidate,
            approval,
            'NO_CHANGE',
          );
        }
        if (latest.currentValue !== candidate.expectedCurrentValue) {
          throw new Error('TRANSLATION_STALE_DIFF_REVIEW_REQUIRED');
        }

        if (latest.locator.entityKind === 'UNIVERSITY') {
          await this.applyUniversityTranslation(tx, latest, candidate, approval);
        } else if (latest.locator.fieldKind === 'DISPLAY_NAME') {
          await this.applyMajorName(tx, latest, candidate, approval);
        } else if (latest.locator.fieldKind === 'CONTENT_SECTION') {
          await this.applyMajorContentSection(tx, latest, candidate, approval);
        } else {
          throw new Error(`TRANSLATION_FIELD_UNSUPPORTED:MAJOR:${latest.locator.fieldKey}`);
        }

        if(latest.locator.entityKind==='MAJOR') await new PrismaMajorTranslationOwnerPort(tx,true).advanceOwnerRevision(latest.internalEntityId);
        return this.finishTransfer(tx, receiptId, digest, latest, candidate, approval, 'APPLIED');
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
        select: universityTranslationSourceSelect,
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
          updatedAt: true,
          metadata: true,
        },
      });

      const currentValue =
        locator.fieldKind === 'DISPLAY_NAME'
          ? (translation?.displayName ?? null)
          : locator.fieldKind === 'DESCRIPTION'
            ? (translation?.description ?? null)
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
        ownerRevision: translation?.updatedAt.toISOString() ?? 'ABSENT',
        sourceDigest: this.digest({source:university,translation:translation?.metadata ?? null}),
        ownerSourceDigest:universityTranslationSourceDigest(university),
        proposedFields: this.pendingValues(translation?.metadata, 'pendingTranslationFields'),
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
        canonicalName:true,displayName:true,academicFieldId:true,disciplineId:true,currentPublishedVersionId:true,
        updatedAt: true,
        optionalFields: true,
      },
    });
    if (!major) return null;
    await this.assertMajorSectionOwner(client, major.id, locator);
    const profileId=locator.sectionOwner!.profileId!;
    const versionId=locator.sectionOwner!.versionId!;
    if (locator.fieldKind === 'DISPLAY_NAME') {
      const version=await client.majorVersion.findUniqueOrThrow({where:{id:versionId}});
      const metadata=translationRecord(version.metadata);
      const names=translationRecord(metadata.translationNames);
      const current=translationRecord(names[locator.locale]);
      const ownerSourceDigest=await majorTranslationSource(client,major.id,profileId,versionId,locator.locale);
      return {
        locator,internalEntityId:major.id,publicId:major.publicId,entityStatus:major.status,
        currentValue: typeof current.value==='string' ? current.value : null,
        currentReviewStatus: current.value ? 'COMPLETE' : null,storageRecordId:version.id,
        ownerRevision:version.updatedAt.toISOString(),
        sourceDigest:this.digest({ownerSourceDigest,metadata}),ownerSourceDigest,
        proposedFields:this.pendingValues(metadata,'translationNameCandidates'),
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
      select: { id: true, content: true, reviewStatus: true, updatedAt: true, metadata: true },
      orderBy: { createdAt: 'desc' },
      take: 2,
    });
    if (sections.length > 1) {
      throw new Error('TRANSLATION_SECTION_TARGET_AMBIGUOUS');
    }
    const section = sections[0];
    const ownerSourceDigest=await majorTranslationSource(client,major.id,profileId,versionId,locator.locale,locator.sectionKey);
    return {
      locator,
      internalEntityId: major.id,
      publicId: major.publicId,
      entityStatus: major.status,
      currentValue: section?.content ?? null,
      currentReviewStatus: section?.reviewStatus ?? null,
      storageRecordId: section?.id ?? null,
      ownerRevision: section?.updatedAt.toISOString() ?? 'ABSENT',
      sourceDigest: this.digest({ownerSourceDigest,translation:section?.metadata ?? null}),
      ownerSourceDigest,
      proposedFields: this.pendingValues(
        {
          content: (section?.metadata as Prisma.JsonObject | undefined)?.pendingTranslationContent,
        },
        null,
      ),
    };
  }

  private async assertMajorSectionOwner(
    client: TranslationPrismaClient,
    majorId: string,
    locator: TranslationTargetLocator,
  ): Promise<void> {
    const owner = locator.sectionOwner;
    if (!owner?.profileId || !owner.versionId) {
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
      if (owner.profileId && version.profileId !== owner.profileId) {
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
    // Keep the last published owner value live while an approved import awaits
    // its independent publication decision. Staging evidence belongs to the owner.
    const pending =
      metadata.pendingTranslationFields && typeof metadata.pendingTranslationFields === 'object'
        ? (metadata.pendingTranslationFields as Prisma.JsonObject)
        : {};
    const stagedMetadata = {
      ...metadata,
      translationFieldEvidence: {
        ...(metadata.translationFieldEvidence && typeof metadata.translationFieldEvidence==='object' ? metadata.translationFieldEvidence as Prisma.JsonObject : {}),
        [latest.locator.fieldKey]: this.withEvidence(null,candidate,approval).translationImport!,
      },
      pendingTranslationFields: {
        ...pending,
        [latest.locator.fieldKind === 'DISPLAY_NAME' ? 'displayName' : 'description']: {
          value: candidate.translatedValue,
          reviewStatus: 'APPROVED',
          actorId: approval.actorId,
          approvalId: approval.approvalId,
        },
      },
    };
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
        reviewStatus: 'APPROVED',
        metadata: stagedMetadata as Prisma.InputJsonObject,
      },
      update: { metadata: stagedMetadata as Prisma.InputJsonObject },
    });
  }

  private async applyMajorName(
    tx: Prisma.TransactionClient,
    latest: TranslationTargetSnapshot,
    candidate: TranslationStagedCandidate,
    approval: TranslationTransferApproval,
  ): Promise<void> {
    await new PrismaMajorTranslationOwnerPort(tx,true).stageName({majorId:latest.internalEntityId,profileId:latest.locator.sectionOwner!.profileId!,versionId:latest.locator.sectionOwner!.versionId!},latest.locator.locale,candidate.translatedValue,this.withEvidence(null,candidate,approval));
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
          metadata: {
            ...metadata,
            pendingTranslationContent: {
              value: candidate.translatedValue,
              reviewStatus: 'APPROVED',
              actorId: approval.actorId,
              approvalId: approval.approvalId,
            },
          },
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
        content: '',
        reviewStatus: 'NEEDS_REVIEW',
        metadata: {
          ...metadata,
          pendingTranslationContent: {
            value: candidate.translatedValue,
            reviewStatus: 'APPROVED',
            actorId: approval.actorId,
            approvalId: approval.approvalId,
          },
        },
      },
    });
  }

  private withEvidence(
    existing: Prisma.JsonValue | null | undefined,
    candidate: TranslationStagedCandidate,
    approval: TranslationTransferApproval,
  ): Prisma.InputJsonObject {
    const current =
      existing && typeof existing === 'object' && !Array.isArray(existing)
        ? (existing as Prisma.JsonObject)
        : {};
    const evidence = candidate.evidence;
    return {
      ...current,
      translationImport: {
        ownerSourceDigest:candidate.target.ownerSourceDigest ?? null,
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
        actorId: approval.actorId,
        approvalId: approval.approvalId,
        reviewStatus: 'APPROVED',
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

  /** Separate owner publication decision; transfer approval never publishes content. */
  async publishApproved(
    target: TranslationTargetSnapshot,
    approval: TranslationTransferApproval,
  ): Promise<TranslationTransferResult> {
    assertTranslationContentAuthoringEnabled(target.locator.entityKind);
    if (
      !this.authorization ||
      !approval.actorId ||
      !approval.approvalId ||
      approval.actorId === approval.reviewedBy ||
      approval.decision !== 'APPLY'
    )
      throw new Error('TRANSLATION_TRUSTED_INDEPENDENT_APPROVAL_REQUIRED');
    const grant =
      target.locator.entityKind === 'UNIVERSITY'
        ? 'admin:universities:manage'
        : 'admin:majors:manage';
    for (const actor of [approval.actorId, approval.reviewedBy])
      if (
        !(await this.authorization.evaluatePermission(actor, grant, { requestTime: new Date() }))
          .isGranted
      )
        throw new Error('TRANSLATION_OWNER_PERMISSION_DENIED');
    return this.prisma.$transaction(
      async (tx) => {
        assertTranslationContentAuthoringEnabled(target.locator.entityKind);
        const table = Prisma.raw(
          target.locator.entityKind === 'UNIVERSITY' ? '"University"' : '"Major"',
        );
        await tx.$queryRaw(
          Prisma.sql`SELECT id FROM ${table} WHERE id=${target.internalEntityId} FOR UPDATE`,
        );
        const latest = await this.resolveWithClient(tx, target.locator);
        if (
          !latest ||
          latest.ownerRevision !== target.ownerRevision ||
          latest.currentReviewStatus !== target.currentReviewStatus ||
          latest.sourceDigest !== target.sourceDigest ||
          latest.currentValue !== target.currentValue
        )
          throw new Error('TRANSLATION_STALE_DIFF_REVIEW_REQUIRED');
        if(latest.locator.entityKind==='MAJOR') await assertMajorTranslationWorkingVersion(tx,latest.internalEntityId,latest.locator.sectionOwner!.profileId!,latest.locator.sectionOwner!.versionId!);
        await new PrismaGovernanceApprovalGateway(this.prisma).consume(
          approval.approvalId!,
          'TRANSLATION_PUBLICATION',
          { target },
          approval.actorId!,
          approval.reviewedBy,
          {
            boundaryId: 'translation-publication:' + approval.approvalId,
            transactionClient: tx,
          } as AtomicPersistenceContext & {transactionClient: Prisma.TransactionClient},
        );
        let value = latest.currentValue ?? '';
        if (target.locator.entityKind === 'UNIVERSITY') {
          const row = await tx.universityTranslation.findUniqueOrThrow({
            where: {
              universityId_locale: {
                universityId: latest.internalEntityId,
                locale: latest.locator.locale,
              },
            },
          });
          const metadata = (row.metadata ?? {}) as Prisma.JsonObject;
          const evidence=(metadata.translationFieldEvidence ?? {}) as Prisma.JsonObject;
          const pending = (metadata.pendingTranslationFields ?? {}) as Prisma.JsonObject;
          const field = target.locator.fieldKind === 'DISPLAY_NAME' ? 'displayName' : 'description';
          const staged = pending[field] as Prisma.JsonObject | undefined;
          if (
            staged?.reviewStatus !== 'APPROVED' ||
            typeof staged.value !== 'string' ||
            !staged.value.trim() ||
            staged.actorId === approval.reviewedBy
          )
            throw new Error('TRANSLATION_OWNER_PUBLICATION_NOT_READY');
          value = staged.value;
          const pendingName = pending.displayName as Prisma.JsonObject | undefined;
          const pendingDescription = pending.description as Prisma.JsonObject | undefined;
          for (const entry of [pendingName,pendingDescription])
            if (
              entry &&
              (entry.reviewStatus !== 'APPROVED' || entry.actorId === approval.reviewedBy ||
                typeof entry.value !== 'string' || !entry.value.trim())
            )
              throw new Error('TRANSLATION_OWNER_PUBLICATION_NOT_READY');
          for (const key of ['displayName','description']) {
            if(pending[key] && (evidence[key] as Prisma.JsonObject | undefined)?.ownerSourceDigest !== latest.ownerSourceDigest) throw new Error('TRANSLATION_SOURCE_CHANGED_REVIEW_REQUIRED');
          }
          const nextName =
            typeof pendingName?.value === 'string' ? pendingName.value : row.displayName;
          const nextDescription =
            typeof pendingDescription?.value === 'string'
              ? pendingDescription.value
              : row.description;
          if (!nextName?.trim() || !nextDescription?.trim())
            throw new Error('TRANSLATION_OWNER_REQUIRED_FIELDS_MISSING');
          // An unchanged counterpart must already belong to this source and published pair.
          // Re-review both fields when legacy evidence is absent or the source changed.
          if ((!pendingName || !pendingDescription)) {
            const publishedEvidence = metadata.publishedTranslationEvidence as Prisma.JsonObject | undefined;
            if (row.reviewStatus !== 'PUBLISHED' || publishedEvidence?.ownerSourceDigest !== latest.ownerSourceDigest ||
                publishedEvidence?.valueDigest !== universityTranslationValueDigest(row) ||
                typeof metadata.publishedTranslationApprovalId !== 'string') {
              throw new Error('TRANSLATION_SOURCE_CHANGED_REVIEW_REQUIRED');
            }
          }
          const remaining = { ...pending };
          delete remaining.displayName;
          delete remaining.description;
          const changed = await tx.universityTranslation.updateMany({
            where: { id: row.id, updatedAt: row.updatedAt },
            data: {
              displayName: nextName,
              description: nextDescription,
              reviewStatus: 'PUBLISHED',
              metadata: {
                ...metadata,
                pendingTranslationFields: remaining,
                publishedTranslationApprovalId: approval.approvalId!,
                publishedTranslationEvidence: {
                  ownerSourceDigest: latest.ownerSourceDigest!,
                  valueDigest: universityTranslationValueDigest({locale: row.locale, displayName: nextName, description: nextDescription}),
                },
              },
            },
          });
          if (changed.count !== 1) throw new Error('TRANSLATION_STALE_DIFF_REVIEW_REQUIRED');
        } else if (target.locator.fieldKind === 'DISPLAY_NAME') {
          const row=await tx.majorVersion.findUniqueOrThrow({where:{id:latest.locator.sectionOwner!.versionId!}});
          const metadata=translationRecord(row.metadata);
          const candidates=translationRecord(metadata.translationNameCandidates);
          const candidate=translationRecord(candidates[target.locator.locale]);
          const evidence=translationRecord(translationRecord(candidate.evidence).translationImport);
          if(candidate.reviewStatus!=='APPROVED' || typeof candidate.value!=='string' || !candidate.value.trim() || evidence.actorId===approval.reviewedBy) throw new Error('TRANSLATION_OWNER_PUBLICATION_NOT_READY');
          if(evidence.ownerSourceDigest!==latest.ownerSourceDigest) throw new Error('TRANSLATION_SOURCE_CHANGED_REVIEW_REQUIRED');
          value=candidate.value;
          await new PrismaMajorTranslationOwnerPort(tx,true).acceptName({majorId:latest.internalEntityId,profileId:latest.locator.sectionOwner!.profileId!,versionId:latest.locator.sectionOwner!.versionId!},target.locator.locale,value,latest.ownerSourceDigest!,approval.approvalId!);
        } else {
          if (!latest.storageRecordId) throw new Error('TRANSLATION_OWNER_PUBLICATION_NOT_READY');
          const row = await tx.majorContentSection.findUniqueOrThrow({
            where: { id: latest.storageRecordId },
          });
          const metadata = (row.metadata ?? {}) as Prisma.JsonObject;
          const staged = metadata.pendingTranslationContent as Prisma.JsonObject | undefined;
          if (
            staged?.reviewStatus !== 'APPROVED' ||
            typeof staged.value !== 'string' ||
            !staged.value.trim() ||
            staged.actorId === approval.reviewedBy
          )
            throw new Error('TRANSLATION_OWNER_PUBLICATION_NOT_READY');
          const evidence=metadata.translationImport as Prisma.JsonObject | undefined;
          if(evidence?.ownerSourceDigest !== latest.ownerSourceDigest) throw new Error('TRANSLATION_SOURCE_CHANGED_REVIEW_REQUIRED');
          value = staged.value;
          await new PrismaMajorTranslationOwnerPort(tx,true).acceptSection({majorId:latest.internalEntityId,profileId:latest.locator.sectionOwner!.profileId!,versionId:latest.locator.sectionOwner!.versionId!},row.id,target.locator.locale,value,latest.ownerSourceDigest!,approval.approvalId!,metadata);
        }
        const ownerReviewRequired=target.locator.entityKind==='MAJOR';
        const id = randomUUID();
        const facts = {
          approvalId: approval.approvalId,
          locale: target.locator.locale,
          fieldKey: target.locator.fieldKey,
          valueHash: this.digest(value),
        };
        await tx.auditRecord.create({
          data: {
            id,
            reference: 'translation-publish:' + id,
            action: ownerReviewRequired ? 'OWNER_TRANSLATION_READY_FOR_REVIEW' : 'OWNER_TRANSLATION_PUBLISHED',
            category: target.locator.entityKind,
            severity: 'INFO',
            actorId: approval.actorId!,
            actorType: 'USER',
            targetId: target.internalEntityId,
            targetType: target.locator.entityKind,
            source: 'OWNER_TRANSLATION_PUBLICATION',
            timestamp: new Date(),
            contextMetadata: facts,
          },
        });
        await tx.transactionalOutboxRecord.create({
          data: {
            id: randomUUID(),
            eventType: ownerReviewRequired ? 'OwnerTranslationReadyForReview' : 'OwnerTranslationPublished',
            domain: target.locator.entityKind === 'UNIVERSITY' ? 'UNIVERSITIES' : 'MAJORS',
            aggregateType: target.locator.entityKind,
            aggregateId: target.internalEntityId,
            payload: facts,
            metadata: { schemaVersion: 1 },
          },
        });
        return {
          ...this.result('APPLIED', latest, value),
          approved: true,
          published: !ownerReviewRequired,
          publicEligible: !ownerReviewRequired && latest.entityStatus === 'PUBLISHED',
          publicationStage: ownerReviewRequired ? 'OWNER_REVIEW_REQUIRED' : 'PUBLIC_OWNER_FIELDS',
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  private pendingValues(value: unknown, key: string | null): Record<string, string> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const record = value as Record<string, unknown>;
    const fields = key ? record[key] : record;
    if (!fields || typeof fields !== 'object' || Array.isArray(fields)) return {};
    return Object.fromEntries(
      Object.entries(fields).flatMap(([name, entry]) =>
        entry &&
        typeof entry === 'object' &&
        typeof (entry as Record<string, unknown>).value === 'string'
          ? [[name, (entry as { value: string }).value]]
          : [],
      ),
    );
  }

  private digest(value: unknown): string {
    return createHash('sha256')
      .update(JSON.stringify(value ?? null))
      .digest('hex');
  }

  private async finishTransfer(
    tx: Prisma.TransactionClient,
    receiptId: string,
    digest: string,
    latest: TranslationTargetSnapshot,
    candidate: TranslationStagedCandidate,
    approval: TranslationTransferApproval,
    state: 'APPLIED' | 'NO_CHANGE',
  ): Promise<TranslationTransferResult> {
    const result = {
      ...this.result(state, latest, candidate.translatedValue),
      approved: true,
      published: false,
      publicEligible: false,
    };
    const evidence = {
      handoffId: candidate.evidence.handoffId,
      approvalId: approval.approvalId,
      fieldKey: latest.locator.fieldKey,
      locale: latest.locator.locale,
      previousHash: this.digest(latest.currentValue),
      nextHash: this.digest(candidate.translatedValue),
      correlationId: candidate.evidence.correlationId,
      outcome: state,
    };
    const id = randomUUID();
    await tx.auditRecord.create({
      data: {
        id,
        reference: 'translation-owner:' + id,
        action: 'TRANSLATION_TRANSFER_RECORDED',
        category: latest.locator.entityKind,
        severity: 'INFO',
        actorId: approval.actorId!,
        actorType: 'USER',
        targetId: latest.internalEntityId,
        targetType: latest.locator.entityKind,
        source: 'OWNER_TRANSLATION_TRANSFER',
        timestamp: new Date(),
        contextMetadata: evidence as Prisma.InputJsonObject,
      },
    });
    await tx.transactionalOutboxRecord.create({
      data: {
        id: randomUUID(),
        eventType: 'OwnerTranslationApproved',
        domain: latest.locator.entityKind === 'UNIVERSITY' ? 'UNIVERSITIES' : 'MAJORS',
        aggregateType: latest.locator.entityKind,
        aggregateId: latest.internalEntityId,
        payload: evidence as Prisma.InputJsonObject,
        metadata: { source: 'OWNER_TRANSLATION_TRANSFER', schemaVersion: 1 },
      },
    });
    await tx.ownerTranslationTransferReceipt.create({
      data: {
        id: receiptId,
        ownerDomain: latest.locator.entityKind,
        targetId:
          latest.internalEntityId + ':' + latest.locator.locale + ':' + latest.locator.fieldKey,
        handoffId: candidate.evidence.handoffId,
        approvalId: approval.approvalId!,
        actorId: approval.actorId!,
        reviewerId: approval.reviewedBy,
        digest,
        outcome: state,
      },
    });
    return result;
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
