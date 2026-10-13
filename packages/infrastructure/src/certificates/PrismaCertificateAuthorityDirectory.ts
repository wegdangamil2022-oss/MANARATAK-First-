import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import {
  AssetId,
  AssetLifecycleState,
  AssetSecurityClassification,
  type IAssetRecordRepository,
  type CertificateIssuerDto,
  type CertificateMutationContext,
  type ICertificateAuthorityDirectory,
} from '@manaratak/domain';
import type { CertificateAuthorityEvidence } from './HttpCertificateAuthorityResolver';
/** P14 owns the delegation register; P11 retains university identity ownership.
 * For other issuers the canonical legal registry identity is explicitly attested
 * against the private document by an independent reviewer, never inferred from a name.
 */
export class PrismaCertificateAuthorityDirectory implements ICertificateAuthorityDirectory {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly assets: IAssetRecordRepository,
    private readonly universities: {
      findById(id: string): Promise<{ status: string } | null>;
    },
  ) {}
  private get db(): any {
    return this.prisma;
  }
  async validate(
    issuer: CertificateIssuerDto,
    evidence?: CertificateAuthorityEvidence,
  ): Promise<boolean> {
    if (!evidence) return false;
    const ownerType =
        issuer.issuerType === 'UNIVERSITY' ? 'UNIVERSITY' : 'ORGANIZATION',
      ownerId =
        ownerType === 'UNIVERSITY'
          ? issuer.universityId
          : issuer.organizationId;
    if (
      !ownerId ||
      (ownerType === 'UNIVERSITY' &&
        (await this.universities.findById(ownerId))?.status !== 'PUBLISHED')
    )
      return false;
    const now = new Date();
    const grant = await this.db.certificateAuthorityDelegation.findFirst({
      where: {
        issuerId: issuer.id,
        canonicalOwnerType: ownerType,
        canonicalOwnerId: ownerId,
        authorityReference: evidence.authorityReference,
        evidenceChecksum: evidence.evidenceChecksum,
        signingKeyReference: issuer.signingKeyReference,
        scope: 'CERTIFICATE_ISSUANCE',
        status: 'APPROVED',
        validFrom: { lte: now },
        validUntil: { gt: now },
        ownershipVerified: true,
        delegationVerified: true,
        reviewedBy: { not: null },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    if (!grant || grant.reviewedBy === grant.createdBy) return false;
    const asset = await this.assets.findById(
      new AssetId(grant.evidenceAssetId),
    );
    return Boolean(
      asset &&
      asset.state === AssetLifecycleState.ACTIVE &&
      asset.classification !== AssetSecurityClassification.PUBLIC &&
      asset.owner.ownerType === 'CertificateIssuer' &&
      asset.owner.ownerId === issuer.id &&
      asset.checksum?.hash === grant.evidenceChecksum,
    );
  }
  async list(issuerId: string, cursor?: string) {
    const where = { issuerId };
    const anchor = cursor
      ? await this.db.certificateAuthorityDelegation.findFirst({
          where: { id: cursor, issuerId },
          select: { id: true, createdAt: true },
        })
      : null;
    if (cursor && !anchor) throw new Error('CERTIFICATE_CURSOR_INVALID');
    return this.db.certificateAuthorityDelegation.findMany({
      where: {
        ...where,
        ...(anchor
          ? {
              OR: [
                { createdAt: { lt: anchor.createdAt } },
                { createdAt: anchor.createdAt, id: { lt: anchor.id } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 25,
    });
  }
  async request(
    issuerId: string,
    input: {
      authorityReference: string;
      legalRegistryReference: string;
      evidenceAssetId: string;
      validFrom: string;
      validUntil: string;
    },
    context: CertificateMutationContext,
  ) {
    const issuer = await this.db.certificateIssuer.findUnique({
      where: { id: issuerId },
    });
    if (!issuer || issuer.issuerType === 'MANARATAK')
      throw new Error('CERTIFICATE_EXTERNAL_ISSUER_REQUIRED');
    const canonicalOwnerType =
        issuer.issuerType === 'UNIVERSITY' ? 'UNIVERSITY' : 'ORGANIZATION',
      canonicalOwnerId =
        canonicalOwnerType === 'UNIVERSITY'
          ? issuer.universityId
          : issuer.organizationId;
    if (
      !canonicalOwnerId ||
      (canonicalOwnerType === 'UNIVERSITY' &&
        (await this.universities.findById(canonicalOwnerId))?.status !==
          'PUBLISHED')
    )
      throw new Error('CERTIFICATE_CANONICAL_OWNER_REQUIRED');
    const validFrom = new Date(input.validFrom),
      validUntil = new Date(input.validUntil);
    if (
      !Number.isFinite(validFrom.getTime()) ||
      !Number.isFinite(validUntil.getTime()) ||
      validUntil <= validFrom ||
      validUntil <= new Date() ||
      !input.legalRegistryReference.trim() ||
      !context.reason?.trim()
    )
      throw new Error('CERTIFICATE_DELEGATION_INPUT_INVALID');
    const asset = await this.assets.findById(
      new AssetId(input.evidenceAssetId),
    );
    if (
      !asset ||
      asset.state !== AssetLifecycleState.ACTIVE ||
      asset.classification === AssetSecurityClassification.PUBLIC ||
      asset.owner.ownerType !== 'CertificateIssuer' ||
      asset.owner.ownerId !== issuerId ||
      !asset.checksum?.hash
    )
      throw new Error('CERTIFICATE_ISSUER_AUTHORITY_EVIDENCE_INVALID');
    const evidenceChecksum = asset.checksum.hash;
    return this.db.$transaction(async (tx: any) => {
      await tx.$queryRaw`SELECT id FROM "CertificateIssuer" WHERE id=${issuerId} FOR UPDATE`;
      await this.lockEvidence(tx, asset.id.value, issuerId, evidenceChecksum);
      const current = await tx.certificateIssuer.findUnique({
        where: { id: issuerId },
      });
      if (current.updatedAt.toISOString() !== issuer.updatedAt.toISOString())
        throw new Error('CERTIFICATE_ISSUER_STALE');
      const grant = await tx.certificateAuthorityDelegation.create({
        data: {
          id: randomUUID(),
          issuerId,
          canonicalOwnerType,
          canonicalOwnerId,
          authorityReference: input.authorityReference.trim(),
          legalRegistryReference: input.legalRegistryReference.trim(),
          evidenceAssetId: asset.id.value,
          evidenceChecksum,
          signingKeyReference: issuer.signingKeyReference,
          scope: 'CERTIFICATE_ISSUANCE',
          validFrom,
          validUntil,
          status: 'PENDING_APPROVAL',
          createdBy: context.actorId,
        },
      });
      await this.audit(tx, grant, context);
      return grant;
    });
  }
  async review(
    id: string,
    input: {
      expectedVersion: number;
      status: 'APPROVED' | 'REVOKED';
      ownershipVerified?: boolean;
      delegationVerified?: boolean;
    },
    context: CertificateMutationContext,
  ) {
    return this.db.$transaction(async (tx: any) => {
      await tx.$queryRaw`SELECT id FROM "CertificateAuthorityDelegation" WHERE id=${id} FOR UPDATE`;
      const row = await tx.certificateAuthorityDelegation.findUnique({
        where: { id },
      });
      if (!row) throw new Error('CERTIFICATE_DELEGATION_NOT_FOUND');
      if (row.version !== input.expectedVersion)
        throw new Error('CERTIFICATE_DELEGATION_STALE');
      await tx.$queryRaw`SELECT id FROM "CertificateIssuer" WHERE id=${row.issuerId} FOR UPDATE`;
      const issuer = await tx.certificateIssuer.findUnique({
        where: { id: row.issuerId },
      });
      if (!context.reason?.trim())
        throw new Error('CERTIFICATE_DELEGATION_REASON_REQUIRED');
      if (input.status === 'APPROVED') {
        if (row.status !== 'PENDING_APPROVAL')
          throw new Error('CERTIFICATE_DELEGATION_TRANSITION_INVALID');
        if (
          row.createdBy === context.actorId ||
          issuer.metadata?.trust?.createdBy === context.actorId
        )
          throw new Error('CERTIFICATE_ISSUER_MAKER_CHECKER_REQUIRED');
        if (
          input.ownershipVerified !== true ||
          input.delegationVerified !== true ||
          row.validUntil <= new Date()
        )
          throw new Error('CERTIFICATE_DELEGATION_REVIEW_REQUIRED');
        const ownerId =
          issuer.issuerType === 'UNIVERSITY'
            ? issuer.universityId
            : issuer.organizationId;
        if (
          (issuer.issuerType === 'UNIVERSITY'
            ? 'UNIVERSITY'
            : 'ORGANIZATION') !== row.canonicalOwnerType ||
          ownerId !== row.canonicalOwnerId ||
          issuer.signingKeyReference !== row.signingKeyReference
        )
          throw new Error('CERTIFICATE_ISSUER_STALE');
        if (
          row.canonicalOwnerType === 'UNIVERSITY' &&
          (await this.universities.findById(ownerId))?.status !== 'PUBLISHED'
        )
          throw new Error('CERTIFICATE_CANONICAL_OWNER_REQUIRED');
        const asset = await this.assets.findById(
          new AssetId(row.evidenceAssetId),
        );
        if (
          !asset ||
          asset.state !== AssetLifecycleState.ACTIVE ||
          asset.classification === AssetSecurityClassification.PUBLIC ||
          asset.owner.ownerType !== 'CertificateIssuer' ||
          asset.owner.ownerId !== row.issuerId ||
          asset.checksum?.hash !== row.evidenceChecksum
        )
          throw new Error('CERTIFICATE_ISSUER_AUTHORITY_EVIDENCE_INVALID');
      } else if (row.status === 'REVOKED')
        throw new Error('CERTIFICATE_DELEGATION_TRANSITION_INVALID');
      if (input.status === 'APPROVED')
        await this.lockEvidence(
          tx,
          row.evidenceAssetId,
          row.issuerId,
          row.evidenceChecksum,
        );
      const reviewed = await tx.certificateAuthorityDelegation.update({
        where: { id },
        data: {
          status: input.status,
          version: { increment: 1 },
          reviewedBy: context.actorId,
          reviewedAt: new Date(),
          ownershipVerified: input.status === 'APPROVED',
          delegationVerified: input.status === 'APPROVED',
          reviewReason: context.reason,
        },
      });
      await this.audit(tx, reviewed, context, row);
      return reviewed;
    });
  }
  async evidenceAsset(id: string): Promise<string> {
    const row = await this.db.certificateAuthorityDelegation.findUnique({
      where: { id },
    });
    if (!row) throw new Error('CERTIFICATE_DELEGATION_NOT_FOUND');
    const asset = await this.assets.findById(new AssetId(row.evidenceAssetId));
    if (
      !asset ||
      asset.state !== AssetLifecycleState.ACTIVE ||
      asset.classification === AssetSecurityClassification.PUBLIC ||
      asset.owner.ownerType !== 'CertificateIssuer' ||
      asset.owner.ownerId !== row.issuerId ||
      asset.checksum?.hash !== row.evidenceChecksum
    )
      throw new Error('CERTIFICATE_ISSUER_AUTHORITY_EVIDENCE_INVALID');
    return asset.id.value;
  }
  private async lockEvidence(
    tx: any,
    id: string,
    issuerId: string,
    checksum: string,
  ) {
    await tx.$queryRaw`SELECT id FROM "AssetRecord" WHERE id=${id} FOR SHARE`;
    const asset = await tx.assetRecord.findUnique({ where: { id } });
    if (
      !asset ||
      asset.lifecycleState !== 'ACTIVE' ||
      asset.securityClassification === 'PUBLIC' ||
      asset.ownerType !== 'CertificateIssuer' ||
      asset.ownerId !== issuerId ||
      asset.checksumHash !== checksum ||
      !['application/pdf', 'image/png', 'image/jpeg'].includes(
        asset.metadata?.mimeType,
      )
    )
      throw new Error('CERTIFICATE_ISSUER_AUTHORITY_EVIDENCE_INVALID');
  }
  private async audit(
    tx: any,
    row: any,
    context: CertificateMutationContext,
    before?: unknown,
  ) {
    const id = randomUUID(),
      now = new Date();
    await tx.auditRecord.create({
      data: {
        id,
        reference: `cert-delegation-${id}`,
        action: 'CERTIFICATE_AUTHORITY_DELEGATION_CHANGED',
        category: 'CERTIFICATE_GOVERNANCE',
        severity: 'INFO',
        actorId: context.actorId,
        actorType: 'USER',
        targetId: row.issuerId,
        targetType: 'CertificateIssuer',
        source: 'Phase14',
        timestamp: now,
        contextMetadata: JSON.parse(
          JSON.stringify({
            reason: context.reason ?? null,
            delegationId: row.id,
            delegationVersion: row.version,
            before: before ?? null,
            after: row,
          }),
        ),
        correlationReference: context.correlationId ?? null,
      },
    });
    await tx.transactionalOutboxRecord.create({
      data: {
        id: randomUUID(),
        eventType: 'CertificateIssuerUpdated',
        domain: 'CERTIFICATES',
        aggregateType: 'CertificateIssuer',
        aggregateId: row.issuerId,
        payload: {
          targetId: row.issuerId,
          action: 'CERTIFICATE_AUTHORITY_DELEGATION_CHANGED',
          actorId: context.actorId,
          delegationId: row.id,
          delegationVersion: row.version,
          status: row.status,
        },
        metadata: { sourcePhase: 'Phase14', schemaVersion: '1.0' },
        correlationId: context.correlationId ?? null,
      },
    });
  }
}
