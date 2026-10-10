import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { createQrMatrix } from '@manaratak/shared';
import {
  CertificateNumberingInput,
  CertificateVerificationQrPayload,
  ICertificateNumberingService,
  ICertificateSignatureService,
  ICertificateVerificationQrService,
} from '@manaratak/domain';

export interface CertificateSigningRuntimeConfiguration {
  artifactReadinessProbe?: () => Promise<{status:'READY'|'DEGRADED'|'RUNTIME_PENDING'|'NOT_CONFIGURED';reason:string;verifiedAt?:string}>;
  signatureService?: ICertificateSignatureService;
  historicalKeys?: Readonly<Record<string, string>>;
  signingKeyReference?: string;
  signingSecret?: string;
  productionLike?: boolean;
  publicVerificationBaseUrl?: string;
}

/**
 * Default source-level Phase 14 trust policy. Production key custody remains a
 * KMS/HSM runtime concern; the source contract fails closed in production-like
 * mode unless a non-exportable signature provider is injected.
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
    if (this.runtime.signatureService) return this.runtime.signatureService.assertIssuerKeyAvailable(signingKeyReference);
    if (this.runtime.productionLike) throw new Error('CERTIFICATE_NON_EXPORTABLE_SIGNER_REQUIRED');
    if (this.runtime.signingKeyReference && this.runtime.signingKeyReference !== signingKeyReference) {
      throw new Error('CERTIFICATE_ISSUER_SIGNING_KEY_NOT_CONFIGURED');
    }
    if (!this.runtime.signingSecret && this.runtime.productionLike) {
      throw new Error('CERTIFICATE_SIGNING_PROVIDER_NOT_CONFIGURED');
    }
  }

  public signHash(hash: string, signingKeyReference: string): string {
    this.assertIssuerKeyAvailable(signingKeyReference);
    if (this.runtime.signatureService) return this.runtime.signatureService.signHash(hash, signingKeyReference);
    const secret = this.runtime.historicalKeys?.[signingKeyReference] ?? this.runtime.signingSecret;
    if (!secret) throw new Error('CERTIFICATE_SIGNING_PROVIDER_NOT_CONFIGURED');
    return createHmac('sha256', secret)
      .update(`${signingKeyReference}:${hash}`)
      .digest('hex');
  }

  public verifyHash(hash: string, signature: string | null | undefined, signingKeyReference: string): boolean {
    if (!signature) return false;
    if (this.runtime.signatureService) {try {return this.runtime.signatureService.verifyHash(hash, signature, signingKeyReference);}catch{return false;}}
    try {
      const historicalSecret = this.runtime.historicalKeys?.[signingKeyReference];
      const expected = historicalSecret && !this.runtime.productionLike
        ? createHmac('sha256', historicalSecret).update(`${signingKeyReference}:${hash}`).digest('hex')
        : this.signHash(hash, signingKeyReference);
      if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
      return timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
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
    const origin = new URL(configured || 'http://localhost:5173');
    if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password || origin.search || origin.hash || (this.runtime.productionLike && origin.protocol !== 'https:')) throw new Error('CERTIFICATE_PUBLIC_VERIFICATION_BASE_URL_INVALID');
    const base = origin.toString().replace(/\/$/, '');
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

  public async artifactReadiness() { return this.runtime.artifactReadinessProbe ? this.runtime.artifactReadinessProbe() : {status:'NOT_CONFIGURED' as const,reason:'Artifact runtime probe is not configured'}; }

  public runtimeReadiness() {
    return {
      productionLike: Boolean(this.runtime.productionLike),
      signingKeyReferenceConfigured: Boolean(this.runtime.signingKeyReference?.trim()),
      signingProviderConfigured: Boolean(this.runtime.signatureService || (!this.runtime.productionLike && this.runtime.signingSecret?.trim())),
      signingCustody: this.runtime.signatureService ? 'OPAQUE_PROVIDER' : 'DEVELOPMENT_ONLY',
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
