export interface CertificateNumberingInput {
  issuerPrefix: string;
  certificateTypePrefix: string;
  issuedAt: Date;
  studentReferenceId: string;
  completionIdentity: string;
}

export interface ICertificateNumberingService {
  generate(input: CertificateNumberingInput): string;
}

/** Trusted server injection only: production implementations must keep private keys
 * non-exportable, enforce an issuer-specific key allowlist, reject retired signing
 * keys, and preserve historically trusted verification keys through rotation.
 * An arbitrary reference supplied by a signed envelope must never create trust.
 */
export interface ICertificateSignatureService {
  assertIssuerKeyAvailable(signingKeyReference: string): void;
  signHash(hash: string, signingKeyReference: string): string;
  verifyHash(hash: string, signature: string | null | undefined, signingKeyReference: string): boolean;
}

export interface CertificateVerificationQrPayload {
  schemaVersion: 'certificate-verification-qr-v1';
  verificationCode: string;
  verificationUrl: string;
  payload: string;
}

/**
 * Source-level QR contract. Binary rendering/storage remains an Asset Platform
 * runtime concern; Phase 14 owns the canonical verification payload.
 */
export interface ICertificateVerificationQrService {
  createPayload(verificationCode: string, verificationUrl: string): CertificateVerificationQrPayload;
}
