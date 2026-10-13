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
  assertIssuerKeyForIssuer?(
    signingKeyReference: string,
    issuerCode: string,
  ): void | Promise<void>;
  assertIssuerKeyAvailable(signingKeyReference: string): void | Promise<void>;
  signHash(hash: string, signingKeyReference: string): string | Promise<string>;
  verifyHash(
    hash: string,
    signature: string | null | undefined,
    signingKeyReference: string,
  ): boolean | Promise<boolean>;
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
  createPayload(
    verificationCode: string,
    verificationUrl: string,
  ): CertificateVerificationQrPayload;
}

export interface CertificateAuthorityDirectoryEvidence {
  authorityReference: string;
  evidenceChecksum: string;
  reviewerId: string;
}
export interface CertificateAuthorityDelegationDto {
  id: string;
  issuerId: string;
  canonicalOwnerType: string;
  canonicalOwnerId: string;
  authorityReference: string;
  legalRegistryReference: string;
  evidenceAssetId: string;
  evidenceChecksum: string;
  signingKeyReference: string;
  scope: string;
  status: string;
  version: number;
  validFrom: Date;
  validUntil: Date;
  createdBy: string;
  reviewedBy?: string | null;
  reviewReason?: string | null;
  createdAt: Date;
}
export interface ICertificateAuthorityDirectory {
  validate(
    issuer: import('../entities/Certificate').CertificateIssuerDto,
    evidence?: CertificateAuthorityDirectoryEvidence,
  ): Promise<boolean>;
  list(
    issuerId: string,
    cursor?: string,
  ): Promise<CertificateAuthorityDelegationDto[]>;
  request(
    issuerId: string,
    input: {
      authorityReference: string;
      legalRegistryReference: string;
      evidenceAssetId: string;
      validFrom: string;
      validUntil: string;
    },
    context: import('../entities/Certificate').CertificateMutationContext,
  ): Promise<CertificateAuthorityDelegationDto>;
  review(
    id: string,
    input: {
      expectedVersion: number;
      status: 'APPROVED' | 'REVOKED';
      ownershipVerified?: boolean;
      delegationVerified?: boolean;
    },
    context: import('../entities/Certificate').CertificateMutationContext,
  ): Promise<CertificateAuthorityDelegationDto>;
  evidenceAsset(id: string): Promise<string>;
}
