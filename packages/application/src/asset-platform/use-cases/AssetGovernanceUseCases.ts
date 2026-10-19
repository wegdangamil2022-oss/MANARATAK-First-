import type {
  AtomicPersistenceContext,
  AssetRights,
  AssetRecord,
  IAssetStorageGateway,
} from '@absheer/domain';
import { assertAssetPublicRights, validateAssetRights } from '@absheer/domain';
import type {
  AtomicDomainMutationCoordinator,
  AtomicMutationRequestContext,
} from '../../event-foundation/use-cases/AtomicDomainMutationCoordinator';
export interface RenditionEvidence {
  sourceSha256: string;
  checksumSha256: string;
  byteSize: number;
  mimeType: string;
  width: number;
  height: number;
  verifiedAt: string;
}
export interface AssetRendition {
  id: string;
  assetId: string;
  variantKey: string;
  version: number;
  status: 'MISSING' | 'READY' | 'FAILED';
  generatedAssetId: string | null;
  sourceSha256: string;
  evidence: RenditionEvidence | null;
}
export interface IAssetGovernanceGateway {
  load(assetId: string): Promise<{ asset: AssetRecord; revision: string }>;
  rights(
    assetId: string,
    rights: AssetRights,
    expectedRevision: string,
    reason: string,
    actorId: string,
    context: AtomicPersistenceContext,
  ): Promise<void>;
  renditions(assetId: string): Promise<AssetRendition[]>;
  deleteRendition(
    assetId: string,
    variantKey: string,
    expectedVersion: number,
    context: AtomicPersistenceContext,
  ): Promise<void>;
  saveRendition(
    input: AssetRendition,
    expectedVersion: number,
    context: AtomicPersistenceContext,
  ): Promise<void>;
}
export class AssetGovernanceUseCases {
  constructor(
    private readonly gateway: IAssetGovernanceGateway,
    private readonly storage: IAssetStorageGateway,
    private readonly atomic: AtomicDomainMutationCoordinator,
  ) {}
  async rights(
    assetId: string,
    rights: AssetRights,
    expectedRevision: string,
    reason: string,
    context: AtomicMutationRequestContext,
  ) {
    validateAssetRights(rights);
    if (reason.trim().length < 6) throw new Error('ASSET_RIGHTS_CHANGE_INVALID');
    await this.atomic.execute(
      {
        domain: 'ASSET',
        aggregateType: 'ASSET_RIGHTS',
        aggregateId: assetId,
        action: 'ASSET_RIGHTS_UPDATED',
        context,
        auditMetadata: { reason },
      },
      (tx) => this.gateway.rights(assetId, rights, expectedRevision, reason, context.actorId, tx),
    );
  }
  renditions(assetId: string) {
    return this.gateway.renditions(assetId);
  }
  async saveRendition(
    assetId: string,
    variantKey: string,
    input: {
      expectedVersion: number;
      status: 'MISSING' | 'READY' | 'FAILED';
      generatedAssetId?: string;
    },
    context: AtomicMutationRequestContext,
  ) {
    if (
      !/^[a-z0-9_-]{1,60}$/.test(variantKey) ||
      !Number.isInteger(input.expectedVersion) ||
      input.expectedVersion < 0 ||
      !['MISSING', 'READY', 'FAILED'].includes(input.status)
    )
      throw new Error('ASSET_RENDITION_INVALID');
    const parent = (await this.gateway.load(assetId)).asset;
    parent.assertCanDeliver();
    let evidence: RenditionEvidence | null = null;
    if (input.status === 'READY') {
      if (
        !input.generatedAssetId ||
        input.generatedAssetId === assetId ||
        !this.storage.verifyRenditionRelation
      )
        throw new Error('ASSET_RENDITION_VERIFICATION_NOT_CONFIGURED');
      const child = (await this.gateway.load(input.generatedAssetId)).asset;
      child.assertCanDeliver();
      if (
        child.owner.ownerId !== parent.owner.ownerId ||
        child.owner.ownerType !== parent.owner.ownerType ||
        (parent.classification === 'PUBLIC' && child.classification !== 'PUBLIC') ||
        !child.metadata.mimeType.startsWith('image/')
      )
        throw new Error('ASSET_RENDITION_OWNER_MISMATCH');
      evidence = await this.storage.verifyRenditionRelation(parent.locator, child.locator, {
        sourceSha256: parent.checksum!.hash,
        checksumSha256: child.checksum!.hash,
      });
      if (
        evidence.sourceSha256 !== parent.checksum!.hash ||
        evidence.checksumSha256 !== child.checksum!.hash ||
        evidence.byteSize !== child.metadata.byteSize ||
        evidence.mimeType !== child.metadata.mimeType ||
        !Number.isInteger(evidence.width) ||
        evidence.width < 1 ||
        evidence.width > 65535 ||
        !Number.isInteger(evidence.height) ||
        evidence.height < 1 ||
        evidence.height > 65535 ||
        (child.metadata.width !== undefined && child.metadata.width !== evidence.width) ||
        (child.metadata.height !== undefined && child.metadata.height !== evidence.height) ||
        !Number.isFinite(Date.parse(evidence.verifiedAt)) ||
        Math.abs(Date.now() - Date.parse(evidence.verifiedAt)) > 300000
      )
        throw new Error('ASSET_RENDITION_EVIDENCE_INVALID');
    } else if (input.generatedAssetId) throw new Error('ASSET_RENDITION_INVALID');
    const row: AssetRendition = {
      id: assetId + ':' + variantKey,
      assetId,
      variantKey,
      version: input.expectedVersion + 1,
      status: input.status,
      generatedAssetId: input.status === 'READY' ? input.generatedAssetId! : null,
      sourceSha256: parent.checksum!.hash,
      evidence,
    };
    await this.atomic.execute(
      {
        domain: 'ASSET',
        aggregateType: 'ASSET_RENDITION',
        aggregateId: row.id,
        action: 'ASSET_RENDITION_RECORDED',
        context,
        auditMetadata: { status: row.status, variantKey },
      },
      (tx) => this.gateway.saveRendition(row, input.expectedVersion, tx),
    );
    return row;
  }
  async deleteRendition(
    assetId: string,
    variantKey: string,
    expectedVersion: number,
    context: AtomicMutationRequestContext,
  ) {
    if (
      !/^[a-z0-9_-]{1,60}$/.test(variantKey) ||
      !Number.isInteger(expectedVersion) ||
      expectedVersion < 1
    )
      throw new Error('ASSET_RENDITION_INVALID');
    await this.atomic.execute(
      {
        domain: 'ASSET',
        aggregateType: 'ASSET_RENDITION',
        aggregateId: assetId + ':' + variantKey,
        action: 'ASSET_RENDITION_UNLINKED',
        context,
      },
      (tx) => this.gateway.deleteRendition(assetId, variantKey, expectedVersion, tx),
    );
  }
  async renditionDelivery(assetId: string, variantKey: string) {
    const parent = (await this.gateway.load(assetId)).asset;
    parent.assertCanDeliver();
    if (parent.classification === 'PUBLIC')
      assertAssetPublicRights(parent.metadata.extraMetadata?.rights);
    const row = (await this.gateway.renditions(assetId)).find(
      (item) => item.variantKey === variantKey,
    );
    if (
      !row ||
      row.status !== 'READY' ||
      !row.generatedAssetId ||
      !row.evidence ||
      row.sourceSha256 !== parent.checksum?.hash
    )
      throw new Error('ASSET_RENDITION_NOT_READY');
    const child = (await this.gateway.load(row.generatedAssetId)).asset;
    child.assertCanDeliver();
    if (child.classification === 'PUBLIC')
      assertAssetPublicRights(child.metadata.extraMetadata?.rights);
    if (
      child.checksum?.hash !== row.evidence.checksumSha256 ||
      child.owner.ownerId !== parent.owner.ownerId ||
      child.owner.ownerType !== parent.owner.ownerType ||
      (parent.classification === 'PUBLIC' && child.classification !== 'PUBLIC')
    )
      throw new Error('ASSET_RENDITION_EVIDENCE_INVALID');
    if (!this.storage.generateDeliveryGrant) throw new Error('ASSET_DELIVERY_NOT_CONFIGURED');
    const deadlines = [parent, child].flatMap((asset) => {
      const rights = asset.metadata.extraMetadata?.rights as
        { publicationPolicy?: string; expiresAt?: string } | undefined;
      return asset.classification === 'PUBLIC' &&
        rights?.publicationPolicy === 'MANDATORY' &&
        rights.expiresAt
        ? [Date.parse(rights.expiresAt)]
        : [];
    });
    const deadline = deadlines.length ? Math.min(...deadlines) : null;
    const ttl = deadline === null ? 300 : Math.min(300, Math.floor((deadline - Date.now()) / 1000));
    if (ttl < 1) throw new Error('ASSET_PUBLIC_RIGHTS_REQUIRED');
    const grant = await this.storage.generateDeliveryGrant(child.locator, ttl);
    if (deadline !== null && grant.expiresAt.getTime() > deadline)
      throw new Error('ASSET_PUBLIC_RIGHTS_REQUIRED');
    return grant;
  }
}
