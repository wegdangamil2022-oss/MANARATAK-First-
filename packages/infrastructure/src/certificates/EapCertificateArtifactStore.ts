import { randomUUID } from 'node:crypto';
import {
  AssetLifecycleState, AssetReference, AssetRetentionCategory, AssetSecurityClassification,
  IAssetRecordRepository, CertificateArtifactStoreInput, ICertificateArtifactStore,
} from '@manaratak/domain';
import { IngestAssetUseCase, ProcessAssetLifecycleUseCase } from '@manaratak/application';

/** Stores trusted server-generated artifacts through the canonical Phase 05 EAP. */
export class EapCertificateArtifactStore implements ICertificateArtifactStore {
  constructor(
    private readonly repository: IAssetRecordRepository,
    private readonly ingest: IngestAssetUseCase,
    private readonly lifecycle: ProcessAssetLifecycleUseCase,
  ) {}

  public async store(input: CertificateArtifactStoreInput): Promise<string> {
    const referenceValue = `certificate:${input.certificateId}:render:${input.renderFingerprint}:${input.artifact.kind.toLowerCase()}`;
    const existing = await this.repository.findByReference(new AssetReference(referenceValue));
    if (existing) {
      if (existing.state !== AssetLifecycleState.ACTIVE) throw new Error('CERTIFICATE_ARTIFACT_IDEMPOTENCY_RECORD_NOT_ACTIVE');
      return existing.id.value;
    }

    const locator = await this.ingest.requestUploadLocator({
      assetId: randomUUID(), assetReference: referenceValue, ownerId: input.certificateId, ownerType: 'Certificate',
      originalFilename: input.artifact.filename, mimeType: input.artifact.mimeType, fileExtension: input.artifact.fileExtension,
      byteSize: input.artifact.bytes.byteLength, classification: AssetSecurityClassification.PUBLIC,
      retentionCategory: AssetRetentionCategory.PERMANENT,
    });
    if (!locator.uploadGrant) throw new Error('EAP_GENERATED_ARTIFACT_UPLOAD_GRANT_REQUIRED');
    const response = await fetch(locator.uploadGrant.uploadUrl, {
      method: locator.uploadGrant.method, headers: { ...locator.uploadGrant.headers, 'content-type': input.artifact.mimeType },
      body: input.artifact.bytes as unknown as BodyInit,
    });
    if (!response.ok) throw new Error(`EAP_GENERATED_ARTIFACT_UPLOAD_FAILED:${response.status}`);

    // Artifacts are server-generated, deterministic content: upload is trusted, then EAP moves them to CLEAN/ACTIVE.
    const active = await this.lifecycle.activateAsset({ assetId: locator.assetId });
    if (active.state !== AssetLifecycleState.ACTIVE) throw new Error('EAP_GENERATED_ARTIFACT_ACTIVATION_FAILED');
    return active.id;
  }
}
