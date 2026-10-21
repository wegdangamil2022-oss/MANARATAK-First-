import { randomUUID, createHash } from 'node:crypto';
import {
  AssetId,
  AssetLifecycleState,
  AssetReference,
  AssetRetentionCategory,
  AssetSecurityClassification,
  IAssetRecordRepository,
  CertificateArtifactStoreInput,
  ICertificateArtifactStore,
} from '@manaratak/domain';
import {
  IngestAssetUseCase,
  ProcessAssetLifecycleUseCase,
} from '@manaratak/application';

/** Resumable generated content through EAP's verification/scanning/sanitization/promotion. */
export class EapCertificateArtifactStore implements ICertificateArtifactStore {
  constructor(
    private readonly repository: IAssetRecordRepository,
    private readonly ingest: IngestAssetUseCase,
    private readonly lifecycle: ProcessAssetLifecycleUseCase,
  ) {}
  public async store(input: CertificateArtifactStoreInput): Promise<string> {
    const sourceSha256 = createHash('sha256').update(input.artifact.bytes).digest('hex');
    const referenceValue = `certificate:${input.certificateId}:render:${input.renderFingerprint}:${input.artifact.kind.toLowerCase()}`;
    const classification =
      input.artifact.kind === 'QR'
        ? AssetSecurityClassification.PUBLIC
        : AssetSecurityClassification.INTERNAL;
    const upload = {
      kind: input.artifact.kind,
      bytes: input.artifact.bytes,
      renderFingerprint: input.renderFingerprint,
      assetId: randomUUID(),
      assetReference: referenceValue,
      ownerId: input.certificateId,
      ownerType: 'Certificate',
      originalFilename: input.artifact.filename,
      mimeType: input.artifact.mimeType,
      fileExtension: input.artifact.fileExtension,
      byteSize: input.artifact.bytes.byteLength,
      classification,
      retentionCategory: AssetRetentionCategory.PERMANENT,
    };
    let record = await this.repository.findByReference(
      new AssetReference(referenceValue),
    );
    let locator:
      | Awaited<ReturnType<IngestAssetUseCase['requestUploadLocator']>>
      | undefined;
    if (!record) {
      try {
        locator = await this.ingest.requestGeneratedCertificateUpload(upload);
      } catch (error) {
        record = await this.repository.findByReference(
          new AssetReference(referenceValue),
        );
        if (!record) throw error;
      }
      if (locator)
        record = await this.repository.findById(new AssetId(locator.assetId));
    }
    if (
      !record ||
      record.owner.ownerType !== 'Certificate' ||
      record.owner.ownerId !== input.certificateId ||
      record.metadata.mimeType !== input.artifact.mimeType ||
      record.classification !== classification
    )
      throw new Error('CERTIFICATE_ARTIFACT_EXISTING_SECURITY_MISMATCH');
    // Sanitization may replace the upload checksum and size. Bind retries to
    // the immutable generated source, not to the transformed CLEAN bytes.
    const provenance = record.metadata.extraMetadata?.certificateGenerated as Record<string, unknown> | undefined;
    if (provenance?.source !== 'Phase14' || provenance.kind !== input.artifact.kind ||
        provenance.renderFingerprint !== input.renderFingerprint ||
        provenance.sourceByteSize !== input.artifact.bytes.byteLength ||
        provenance.sourceSha256 !== sourceSha256)
      throw new Error('CERTIFICATE_ARTIFACT_SOURCE_MISMATCH');
    if (record.state === AssetLifecycleState.ACTIVE) {
      record.assertCanDeliver();
      return record.id.value;
    }
    if (record.state === AssetLifecycleState.INITIATED) {
      locator ??= await this.ingest.resumeGeneratedUpload({
        ...upload,
        assetId: record.id.value,
      });
      if (!locator.uploadGrant)
        throw new Error('EAP_GENERATED_ARTIFACT_UPLOAD_GRANT_REQUIRED');
      const response = await fetch(locator.uploadGrant.uploadUrl, {
        method: locator.uploadGrant.method,
        headers: {
          ...locator.uploadGrant.headers,
          'content-type': input.artifact.mimeType,
        },
        body: input.artifact.bytes as unknown as BodyInit,
        redirect: 'error',
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok)
        throw new Error(
          `EAP_GENERATED_ARTIFACT_UPLOAD_FAILED:${response.status}`,
        );
      await this.lifecycle.finalizeUploadedAsset({ assetId: record.id.value });
      record = await this.repository.findById(record.id);
      if (
        !record ||
        record.uploadVerification?.checksumSha256.toLowerCase() !==
          sourceSha256
      )
        throw new Error('CERTIFICATE_ARTIFACT_UPLOAD_HASH_MISMATCH');
    }
    if (
      [
        AssetLifecycleState.QUARANTINED,
        AssetLifecycleState.VALIDATING,
      ].includes(record.state) &&
      record.uploadVerification?.checksumSha256.toLowerCase() !==
        sourceSha256
    )
      throw new Error('CERTIFICATE_ARTIFACT_UPLOAD_HASH_MISMATCH');
    if (record.state === AssetLifecycleState.QUARANTINED)
      await this.lifecycle.validateAsset({ assetId: record.id.value });
    record = await this.repository.findById(record.id);
    if (!record) throw new Error('CERTIFICATE_ARTIFACT_RECORD_LOST');
    if (record.state === AssetLifecycleState.VALIDATING)
      await this.lifecycle.sanitizeAsset({ assetId: record.id.value });
    record = await this.repository.findById(record.id);
    if (
      !record ||
      ![AssetLifecycleState.SANITIZING, AssetLifecycleState.ACTIVE].includes(
        record.state,
      )
    )
      throw new Error('CERTIFICATE_ARTIFACT_REQUIRES_OPERATOR_RECOVERY');
    // EAP activation has its own durable, revision-gated provider-operation journal.
    const active = await this.lifecycle.activateAsset({
      assetId: record.id.value,
    });
    if (active.state !== AssetLifecycleState.ACTIVE)
      throw new Error('EAP_GENERATED_ARTIFACT_ACTIVATION_FAILED');
    return active.id;
  }
  /** Cancel only unpublished uploads for an already withdrawn/expired certificate.
   * Actual deletion/purge follows P3's own retention rules, not a direct storage delete.
   */
  async cleanupAbandoned(
    certificateId: string,
    fingerprint: string,
    attachedIds: readonly string[],
  ): Promise<number> {
    let count = 0;
    for (const kind of ['pdf', 'preview', 'qr']) {
      const asset = await this.repository.findByReference(
        new AssetReference(
          `certificate:${certificateId}:render:${fingerprint}:${kind}`,
        ),
      );
      if (
        !asset ||
        attachedIds.includes(asset.id.value) ||
        asset.owner.ownerType !== 'Certificate' ||
        asset.owner.ownerId !== certificateId
      )
        continue;
      if (
        [
          AssetLifecycleState.ARCHIVED,
          AssetLifecycleState.DELETED,
          AssetLifecycleState.PURGED,
        ].includes(asset.state) ||
        (asset.activationOperation &&
          asset.activationOperation.phase !== 'COMPLETED')
      )
        continue;
      await this.lifecycle.softDeleteAsset({ assetId: asset.id.value });
      count++;
    }
    return count;
  }
}
