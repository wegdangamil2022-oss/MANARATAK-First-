import { randomUUID } from 'node:crypto';
import {
  AssetId,
  AssetSecurityClassification,
  AssetRetentionCategory,
  type IAssetRecordRepository,
  type IStudentWorkspaceRepository,
} from '@absheer/domain';
import type { IngestAssetUseCase } from '../../asset-platform/use-cases/IngestAssetUseCase';
import type { ProcessAssetLifecycleUseCase } from '../../asset-platform/use-cases/ProcessAssetLifecycleUseCase';
/** P15 chooses identity/purpose; P3 retains exclusive control of quarantine, verification, scanning and activation. */
export class StudentDocumentUploadUseCases {
  constructor(
    private readonly workspaces: IStudentWorkspaceRepository,
    private readonly assets: IAssetRecordRepository,
    private readonly ingest: IngestAssetUseCase,
    private readonly lifecycle: ProcessAssetLifecycleUseCase,
  ) {}
  private async active(studentId: string) {
    const workspace = await this.workspaces.findWorkspace(studentId);
    if (!workspace || workspace.status !== 'ACTIVE')
      throw new Error('STUDENT_DOCUMENT_UPLOAD_DENIED');
  }
  async allocate(
    studentId: string,
    input: { originalFilename: string; mimeType: string; byteSize: number; consent: boolean },
  ) {
    await this.active(studentId);
    if (
      input.consent !== true ||
      !['application/pdf', 'image/jpeg', 'image/png'].includes(input.mimeType) ||
      !Number.isSafeInteger(input.byteSize) ||
      input.byteSize < 1 ||
      input.byteSize > 10 * 1024 * 1024
    )
      throw new Error('STUDENT_DOCUMENT_UPLOAD_INVALID');
    const assetId = randomUUID(),
      result = await this.ingest.requestStudentDocumentUpload({
        assetId,
        assetReference: `STUDENT-DOCUMENT-${assetId}`,
        ownerId: studentId,
        ownerType: 'STUDENT',
        originalFilename: input.originalFilename,
        mimeType: input.mimeType,
        fileExtension: input.originalFilename.split('.').at(-1)?.toLowerCase() ?? '',
        byteSize: input.byteSize,
        classification: AssetSecurityClassification.CONFIDENTIAL,
        retentionCategory: AssetRetentionCategory.TEMPORARY,
        expiresAt: new Date(Date.now() + 180 * 86400000),
      });
    return {
      assetId: result.assetId,
      lifecycleState: result.lifecycleState,
      uploadGrant: result.uploadGrant,
    };
  }
  async complete(studentId: string, assetId: string) {
    await this.active(studentId);
    let record = await this.assets.findById(new AssetId(assetId));
    if (
      !record ||
      record.owner.ownerType !== 'STUDENT' ||
      record.owner.ownerId !== studentId ||
      record.classification !== AssetSecurityClassification.CONFIDENTIAL ||
      record.metadata.extraMetadata?.purpose !== 'STUDENT_APPLICATION_PREPARATION' ||
      !record.reference.value.startsWith('STUDENT-DOCUMENT-') ||
      !record.retention.expiresAt ||
      record.retention.expiresAt.getTime() <= Date.now()
    )
      throw new Error('STUDENT_DOCUMENT_UPLOAD_DENIED');
    if (
      record.state === 'INITIATED' ||
      (record.state === 'QUARANTINED' && !record.uploadVerification)
    )
      await this.lifecycle.finalizeUploadedAsset({ assetId });
    record = await this.assets.findById(new AssetId(assetId));
    if (record?.state === 'QUARANTINED') await this.lifecycle.validateAsset({ assetId });
    record = await this.assets.findById(new AssetId(assetId));
    if (record?.state === 'VALIDATING') await this.lifecycle.sanitizeAsset({ assetId });
    record = await this.assets.findById(new AssetId(assetId));
    if (record?.state === 'SANITIZING') await this.lifecycle.activateAsset({ assetId });
    record = await this.assets.findById(new AssetId(assetId));
    if (!record || record.state !== 'ACTIVE')
      throw new Error('STUDENT_DOCUMENT_PROCESSING_INCOMPLETE');
    record.assertCanDeliver();
    return { assetId, lifecycleState: record.state };
  }
}
