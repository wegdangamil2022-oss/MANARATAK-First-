import {
  ICertificateArtifactStore,
  CertificateStatus,
  ICertificateRenderingService,
  ICertificateRepository,
} from '@manaratak/domain';

export interface CertificateArtifactRenderOutcome {
  certificateId: string;
  certificatePdfAssetId: string;
  previewImageAssetId: string;
  verificationQrAssetId: string;
  renderFingerprint: string;
  rendererVersion: string;
  replayed: boolean;
}

/** Completion-safe, retry-safe orchestration for P14 document artifacts. */
export class CertificateArtifactRenderUseCase {
  constructor(
    private readonly repository: ICertificateRepository,
    private readonly renderer: ICertificateRenderingService,
    private readonly artifactStore: ICertificateArtifactStore,
    private readonly trustGuard?: { assertRenderable(certificate: import('@manaratak/domain').CertificateDto): Promise<void>; attachRenderedArtifacts?: (id: string, input: Omit<import('@manaratak/domain').AttachCertificateArtifactsDto, 'certificateId' | 'actorId' | 'correlationId'>, actor: string, correlation?: string) => Promise<unknown> },
  ) {}

  public async renderCertificate(
    certificateId: string,
    actorId = 'phase14-renderer',
    correlationId?: string | null,
  ): Promise<CertificateArtifactRenderOutcome> {
    const certificate = await this.repository.findById(certificateId);
    if (!certificate) throw new Error('CERTIFICATE_NOT_FOUND');

    if (!this.trustGuard) throw new Error('CERTIFICATE_RENDER_TRUST_GUARD_REQUIRED');
    await this.trustGuard.assertRenderable(certificate);
    const existingRender = this.object(certificate.metadata?.render);
    if (certificate.certificatePdfAssetId && certificate.previewImageAssetId && certificate.verificationQrAssetId) {
      return {
        certificateId,
        certificatePdfAssetId: certificate.certificatePdfAssetId,
        previewImageAssetId: certificate.previewImageAssetId,
        verificationQrAssetId: certificate.verificationQrAssetId,
        renderFingerprint: this.text(existingRender.renderFingerprint) ?? 'legacy-render',
        rendererVersion: this.text(existingRender.rendererVersion) ?? 'legacy',
        replayed: true,
      };
    }

    if (certificate.status !== CertificateStatus.ACTIVE) throw new Error('CERTIFICATE_ARTIFACT_STATE_INVALID');
    const templateVersion = await this.repository.findTemplateVersionById(certificate.templateVersionId);
    if (!templateVersion) throw new Error('CERTIFICATE_TEMPLATE_VERSION_NOT_FOUND');
    if (templateVersion.templateId !== certificate.templateId) throw new Error('CERTIFICATE_TEMPLATE_VERSION_IDENTITY_MISMATCH');
    if (templateVersion.versionNumber !== certificate.templateVersion) throw new Error('CERTIFICATE_TEMPLATE_VERSION_NUMBER_MISMATCH');

    const rendered = await this.renderer.render({ certificate, templateVersion });
    if (rendered.templateVersionId !== certificate.templateVersionId) throw new Error('CERTIFICATE_RENDER_TEMPLATE_VERSION_MISMATCH');
    if (rendered.templateVersionNumber !== certificate.templateVersion || !rendered.renderFingerprint?.trim() || !rendered.rendererVersion?.trim()) throw new Error('CERTIFICATE_RENDER_IDENTITY_INVALID');
    if (rendered.artifacts.length !== 3 || new Set(rendered.artifacts.map(artifact => artifact.kind)).size !== 3) throw new Error('CERTIFICATE_RENDER_ARTIFACT_SET_INVALID');
    for (const artifact of rendered.artifacts) {
      if (!(artifact.bytes instanceof Uint8Array) || !artifact.bytes.byteLength || artifact.bytes.byteLength > 20 * 1024 * 1024) throw new Error('CERTIFICATE_RENDER_ARTIFACT_BYTES_INVALID');
      if (artifact.kind === 'PDF' ? artifact.mimeType !== 'application/pdf' : !['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'].includes(artifact.mimeType)) throw new Error('CERTIFICATE_RENDER_ARTIFACT_MIME_INVALID');
    }
    const byKind = new Map(rendered.artifacts.map((artifact) => [artifact.kind, artifact] as const));
    const pdf = byKind.get('PDF');
    const preview = byKind.get('PREVIEW');
    const qr = byKind.get('QR');
    if (!pdf || !preview || !qr) throw new Error('CERTIFICATE_RENDER_ARTIFACT_SET_INCOMPLETE');

    if (!this.trustGuard.attachRenderedArtifacts) throw new Error('CERTIFICATE_RENDER_ATTACHMENT_GUARD_REQUIRED');
    const stored = await this.repository.checkpointRender(certificateId, rendered.renderFingerprint, 'BEGIN');
    try {
      for (const artifact of [pdf,preview,qr]) {
        if (stored[artifact.kind]) continue;
        const assetId = await this.artifactStore.store({certificateId,renderFingerprint:rendered.renderFingerprint,artifact});
        await this.repository.checkpointRender(certificateId,rendered.renderFingerprint,artifact.kind,assetId);
        stored[artifact.kind] = assetId;
      }
      await this.trustGuard.attachRenderedArtifacts(certificateId, {
        certificatePdfAssetId:stored.PDF,previewImageAssetId:stored.PREVIEW,verificationQrAssetId:stored.QR,
        renderMetadata:{rendererId:rendered.rendererId,rendererVersion:rendered.rendererVersion,renderFingerprint:rendered.renderFingerprint,templateVersionId:rendered.templateVersionId,templateVersionNumber:rendered.templateVersionNumber,renderedAt:new Date().toISOString()},
      },actorId,correlationId ?? undefined);
      await this.repository.checkpointRender(certificateId,rendered.renderFingerprint,'COMPLETE');
    } catch(error) {
      await this.repository.checkpointRender(certificateId,rendered.renderFingerprint,'FAILED');
      throw error;
    }
    const certificatePdfAssetId=stored.PDF,previewImageAssetId=stored.PREVIEW,verificationQrAssetId=stored.QR;

    return { certificateId, certificatePdfAssetId, previewImageAssetId, verificationQrAssetId,
      renderFingerprint: rendered.renderFingerprint, rendererVersion: rendered.rendererVersion, replayed: false };
  }

  private object(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  }
  private text(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }
}
