import {
  ICertificateArtifactStore,
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
  ) {}

  public async renderCertificate(
    certificateId: string,
    actorId = 'phase14-renderer',
    correlationId?: string | null,
  ): Promise<CertificateArtifactRenderOutcome> {
    const certificate = await this.repository.findById(certificateId);
    if (!certificate) throw new Error('CERTIFICATE_NOT_FOUND');

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

    const templateVersion = await this.repository.findTemplateVersionById(certificate.templateVersionId);
    if (!templateVersion) throw new Error('CERTIFICATE_TEMPLATE_VERSION_NOT_FOUND');
    if (templateVersion.templateId !== certificate.templateId) throw new Error('CERTIFICATE_TEMPLATE_VERSION_IDENTITY_MISMATCH');
    if (templateVersion.versionNumber !== certificate.templateVersion) throw new Error('CERTIFICATE_TEMPLATE_VERSION_NUMBER_MISMATCH');

    const rendered = await this.renderer.render({ certificate, templateVersion });
    if (rendered.templateVersionId !== certificate.templateVersionId) throw new Error('CERTIFICATE_RENDER_TEMPLATE_VERSION_MISMATCH');
    const byKind = new Map(rendered.artifacts.map((artifact) => [artifact.kind, artifact] as const));
    const pdf = byKind.get('PDF');
    const preview = byKind.get('PREVIEW');
    const qr = byKind.get('QR');
    if (!pdf || !preview || !qr) throw new Error('CERTIFICATE_RENDER_ARTIFACT_SET_INCOMPLETE');

    const [certificatePdfAssetId, previewImageAssetId, verificationQrAssetId] = await Promise.all([
      this.artifactStore.store({ certificateId, renderFingerprint: rendered.renderFingerprint, artifact: pdf }),
      this.artifactStore.store({ certificateId, renderFingerprint: rendered.renderFingerprint, artifact: preview }),
      this.artifactStore.store({ certificateId, renderFingerprint: rendered.renderFingerprint, artifact: qr }),
    ]);

    await this.repository.attachArtifacts({
      certificateId, certificatePdfAssetId, previewImageAssetId, verificationQrAssetId, actorId, correlationId,
      renderMetadata: {
        rendererId: rendered.rendererId, rendererVersion: rendered.rendererVersion,
        renderFingerprint: rendered.renderFingerprint, templateVersionId: rendered.templateVersionId,
        templateVersionNumber: rendered.templateVersionNumber, renderedAt: new Date().toISOString(),
      },
    });

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
