import { createHash, createHmac } from 'crypto';
import { createQrMatrix } from '@manaratak/shared';
import {
  CertificateNumberingInput,
  CertificateVerificationQrPayload,
  ICertificateNumberingService,
  ICertificateSignatureService,
  ICertificateVerificationQrService,
} from '@manaratak/domain';

export interface CertificateSigningRuntimeConfiguration {
  signingKeyReference?: string;
  signingSecret?: string;
  productionLike?: boolean;
  publicVerificationBaseUrl?: string;
}

/**
 * Default source-level Phase 14 trust policy. Production key custody remains a
 * KMS/HSM runtime concern; the source contract fails closed in production-like
 * mode when no signing provider secret is configured.
 */
export class CertificateTrustPolicy
  implements ICertificateNumberingService, ICertificateSignatureService, ICertificateVerificationQrService {
  constructor(private readonly runtime: CertificateSigningRuntimeConfiguration = {}) {}

  public generate(input: CertificateNumberingInput): string {
    const year = input.issuedAt.getUTCFullYear();
    const entropy = this.digest(`${input.studentReferenceId}:${input.completionIdentity}`).slice(0, 12).toUpperCase();
    return `${input.issuerPrefix}-${input.certificateTypePrefix}-${year}-${entropy}`;
  }

  public assertIssuerKeyAvailable(signingKeyReference: string): void {
    if (!signingKeyReference.trim()) throw new Error('CERTIFICATE_ISSUER_SIGNING_KEY_REQUIRED');
    if (this.runtime.signingKeyReference && this.runtime.signingKeyReference !== signingKeyReference) {
      throw new Error('CERTIFICATE_ISSUER_SIGNING_KEY_NOT_CONFIGURED');
    }
    if (!this.runtime.signingSecret && this.runtime.productionLike) {
      throw new Error('CERTIFICATE_SIGNING_PROVIDER_NOT_CONFIGURED');
    }
  }

  public signHash(hash: string, signingKeyReference: string): string {
    this.assertIssuerKeyAvailable(signingKeyReference);
    return createHmac('sha256', this.runtime.signingSecret ?? 'source-only-development-signing-key')
      .update(`${signingKeyReference}:${hash}`)
      .digest('hex');
  }

  public verifyHash(hash: string, signature: string | null | undefined, signingKeyReference: string): boolean {
    if (!signature) return false;
    try {
      return signature === this.signHash(hash, signingKeyReference);
    } catch {
      return false;
    }
  }


  public createPublicVerificationUrl(verificationCode: string): string {
    const code = verificationCode.trim();
    if (!code) throw new Error('CERTIFICATE_VERIFICATION_CODE_REQUIRED');
    const configured = this.runtime.publicVerificationBaseUrl?.trim();
    if (!configured && this.runtime.productionLike) {
      throw new Error('CERTIFICATE_PUBLIC_VERIFICATION_BASE_URL_NOT_CONFIGURED');
    }
    const base = (configured || 'http://localhost:5173').replace(/\/$/, '');
    const url = `${base}/certificates/verify?code=${encodeURIComponent(code)}`;
    try {
      createQrMatrix(url);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('QR_PAYLOAD_TOO_LONG')) {
        throw new Error('CERTIFICATE_PUBLIC_VERIFICATION_URL_EXCEEDS_QR_CAPACITY');
      }
      throw error;
    }
    return url;
  }

  public runtimeReadiness() {
    return {
      productionLike: Boolean(this.runtime.productionLike),
      signingKeyReferenceConfigured: Boolean(this.runtime.signingKeyReference?.trim()),
      signingProviderConfigured: Boolean(this.runtime.signingSecret?.trim()),
      publicVerificationBaseUrlConfigured: Boolean(this.runtime.publicVerificationBaseUrl?.trim()),
    };
  }

  public createPayload(verificationCode: string, verificationUrl: string): CertificateVerificationQrPayload {
    if (!verificationCode.trim() || !verificationUrl.trim()) throw new Error('CERTIFICATE_VERIFICATION_QR_INPUT_REQUIRED');
    return {
      schemaVersion: 'certificate-verification-qr-v1',
      verificationCode,
      verificationUrl,
      payload: verificationUrl,
    };
  }

  private digest(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
}
