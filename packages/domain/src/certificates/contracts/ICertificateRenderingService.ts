import { CertificateDto, CertificateTemplateVersionDto } from '../entities/Certificate';

export type CertificateRenderedArtifactKind = 'PDF' | 'PREVIEW' | 'QR';

export interface CertificateRenderedArtifact {
  kind: CertificateRenderedArtifactKind;
  bytes: Uint8Array;
  mimeType: string;
  fileExtension: string;
  filename: string;
}

export interface CertificateRenderInput {
  certificate: CertificateDto;
  templateVersion: CertificateTemplateVersionDto;
}

export interface CertificateRenderResult {
  rendererId: string;
  rendererVersion: string;
  templateVersionId: string;
  templateVersionNumber: string;
  renderFingerprint: string;
  artifacts: readonly CertificateRenderedArtifact[];
}

/** Provider-neutral rendering boundary. Visual design remains versioned template data. */
export interface ICertificateRenderingService {
  render(input: CertificateRenderInput): Promise<CertificateRenderResult>;
}

export interface CertificateArtifactStoreInput {
  certificateId: string;
  renderFingerprint: string;
  artifact: CertificateRenderedArtifact;
}

/** Phase 05 EAP integration boundary for generated certificate artifacts. */
export interface ICertificateArtifactStore {
  store(input: CertificateArtifactStoreInput): Promise<string>;
}
