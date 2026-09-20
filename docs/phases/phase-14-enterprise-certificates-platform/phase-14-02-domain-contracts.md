# MANARATAK 2.0: Phase 14 Part B Enterprise Domain Contracts

## 14.B.1 Executive Summary

This document establishes the official Domain Contracts for **Phase 14 (Enterprise Certificates Platform)**. These contracts define the rigid integration boundaries, public abstractions, and domain events required to manage the lifecycle of verifiable academic credentials.

By adhering to these contracts, Phase 14 ensures that certificate generation, cryptographically secure verification, and revocation are entirely decoupled from the upstream pedagogical mechanisms that govern course completion.

## 14.B.2 Architecture Governance & Namespace Policy

Phase 14 strictly operates under the `Enterprise.Architecture.Phase14.Certificates` module. All domains, interfaces, and events MUST reside within this module.

## 14.B.3 Core Identity & Aggregates

Certification contracts govern the cryptographically verifiable proofs of academic achievement. Once issued, certificates are immutable and serve as the definitive business outcome of the learning process.

```typescript
export interface IReferenceEntity {
    id: string;
    createdAt: Date | string;
    updatedAt: Date | string;
}

export interface IEnterpriseDomainEvent {
    eventId: string;
    occurredAt: Date | string;
    correlationId: string;
}

/**
 * Represents the immutable enterprise credential awarded to a learner.
 */
export interface ICertificateIdentity extends IReferenceEntity {
    certificateId: string;
    certificateNumber: string;
    studentId: string;
    courseId: string;
    learningPathId?: string | null;
    issuedAt: Date | string;
    issuingAuthority: string;
    isRevoked: boolean;

    // Extended Enterprise Properties
    issuerId: string;
    certificateTypeId: string;
    templateId: string;
    templateVersion: string;
    metadata: ICertificateMetadata;
    artifact: ICertificateArtifact;
    validity: ICertificateValidity;
}

/**
 * Provides the mechanisms for external, public validation of the credential.
 */
export interface ICertificateVerification {
    verificationHash: string;
    verificationUrl: string;
    qrCodeAssetId: string; // Registered QR code PNG image via Phase 05 EAP

    // Extended Verification Metadata
    verificationMethod: string; // e.g. "CryptographicHash", "QRCode", "ManualLookup"
    verificationChannel: string; // e.g. "PublicVerificationAPI", "PortalGateway"
    verificationTimestamp: Date | string;
    verificationStatus: 'Valid' | 'Revoked' | 'Expired' | 'NotFound';
}

/**
 * Represents numbering metadata for an enterprise certificate.
 */
export interface ICertificateNumber {
    certificateNumber: string; // [ISSUER_PREFIX]-[TYPE_PREFIX]-[YEAR]-[SEQUENCE]
    numberPrefix: string;
    issuerPrefix: string;
    certificateTypePrefix: string;
    generationPolicy: string;
    sequenceNumber: string;
}

/**
 * Captures the audit log of a formally revoked credential.
 */
export interface ICertificateRevocationLog extends IReferenceEntity {
    certificateId: string;
    revokedAt: Date | string;
    reasonCode: string; // e.g. "AcademicMisconduct", "AdministrativeCorrection", "IdentityTheft"
    authorizedBy: string; // Admin user ID from Phase 23
}

/**
 * Represents a reusable enterprise certificate template, independent of individual issued certificates.
 */
export interface ICertificateTemplate extends IReferenceEntity {
    templateId: string;
    templateCode: string;
    displayName: string;
    status: 'Draft' | 'PendingApproval' | 'Approved' | 'Active' | 'Deprecated' | 'Archived';
    organizationId?: string | null; // Optional local tracking/grouping metadata tag only (No Organizations Platform dependency)
    universityId?: string | null; // Canonical reference to Phase 11 partner university ID
    defaultLanguage: string; // e.g. "ar", "en"
    layoutType: 'Landscape' | 'Portrait';
    issuerLogoAssetId?: string | null; // Registered logo asset reference via Phase 05 EAP
    sealAssetId?: string | null; // Registered seal asset reference via Phase 05 EAP
    signatureAssetReference?: string | null; // Registered signature asset reference via Phase 05 EAP
    dynamicPlaceholders: readonly string[];
    versions: readonly ICertificateTemplateVersion[];
}

/**
 * Represents a specific version of an enterprise certificate template.
 */
export interface ICertificateTemplateVersion {
    versionId: string;
    templateId: string;
    versionNumber: string; // Semantic version e.g., "1.0.0"
    status: 'Draft' | 'PendingApproval' | 'Approved' | 'Active' | 'Deprecated' | 'Archived';
    templateLayoutAssetId: string; // Compiled layout template asset ID registered in Phase 05 EAP
    createdAt: Date | string;
    createdBy: string;
    localizations: readonly ICertificateTemplateLocalization[];
}

/**
 * Represents localized translation and layout settings for a certificate template version.
 */
export interface ICertificateTemplateLocalization {
    localizationId: string;
    languageCode: string; // e.g., "ar", "en"
    readingDirection: 'RTL' | 'LTR';
    titleText: string;
    bodyTextPattern: string;
    localizedLabels: Record<string, string>;
}

/**
 * Represents an accredited issuing authority inside the enterprise learning ecosystem.
 */
export interface ICertificateIssuer extends IReferenceEntity {
    issuerId: string;
    issuerName: string;
    issuerType: 'MANARATAK' | 'University' | 'EducationalInstitution' | 'Government' | 'TrainingCenter' | 'ExternalPartner';
    organizationId?: string | null; // Optional local grouping metadata tag only (No external Organizations Platform dependency)
    issuerLogoAssetId: string; // Corporate or institutional logo registered in Phase 05 EAP
    digitalSignatureIdentity: string; // Reference to secure KMS key ID
    status: 'Active' | 'Suspended' | 'Deprecated';
}

/**
 * Defines a configurable classification for educational credentials, determining rendering rules, metadata schemas, and validation policies.
 */
export interface ICertificateType extends IReferenceEntity {
    typeId: string;
    typeCode: string; // e.g., "COURSE", "PATH", "PROGRAM"
    displayName: string;
    category: 'CourseCertificate' | 'LearningPathCertificate' | 'ProgramCertificate' | 'WorkshopCertificate' | 'BootcampCertificate' | 'SeminarCertificate' | 'ParticipationCertificate' | 'AchievementCertificate' | 'HonorCertificate';
    validationPolicy: string; // Reference to validation rules
    renderingPolicy: string; // Reference to rendering rules
}

/**
 * Encapsulates the rich, structured academic metadata permanently bound and sealed to the immutable certificate record.
 */
export interface ICertificateMetadata {
    creditHours?: number | null;
    learningHours?: number | null;
    grade?: string | null;
    score?: number | null;
    academicLevel: string; // e.g., "Undergraduate", "CPE"
    difficultyLevel: string; // e.g., "Intermediate"
    skillTags: readonly string[];
    competencies: readonly string[];
    completionDate: Date | string;
    providerInformation: string;
    additionalAttributes: Record<string, string>;
}

/**
 * Represents the generated, verifiable physical digital file assets associated with a certificate.
 */
export interface ICertificateArtifact extends IReferenceEntity {
    artifactId: string;
    certificateId: string;
    certificatePdfAssetId: string; // Safe binary file handle registered via Phase 05 EAP
    previewImageAssetId: string; // Safe PNG preview image handle registered via Phase 05 EAP
    thumbnailAssetId: string; // Safe PNG thumbnail handle registered via Phase 05 EAP
    storageProvider: 'GCS' | 'S3' | 'EAP';
    renderingVersion: string; // e.g., "puppeteer-v22.1.0"
    templateVersion: string; // e.g., "1.2.0"
    fileChecksum: string; // SHA-256 checksum of physical file for tamper checks
    fileSizeBytes: number; // Size of physical file in bytes
}

/**
 * Defines the rigid timeframe and compliance rules governing the credential's active lifespan.
 */
export interface ICertificateValidity {
    validityPolicy: 'Permanent' | 'Expiring' | 'Renewable';
    issuedAt: Date | string;
    expiresAt: Date | string | null;
    renewalPolicy?: string | null;
    requiresRevalidation: boolean;
}
```

## 14.B.4 Repository Contracts

The repository layer provides read and write access to the underlying Certificate Ledger.

```typescript
export interface ICertificateRepository {
    getByCertificateNumber(certificateNumber: string, cancellationToken?: any): Promise<ICertificateIdentity>;
    getByHash(hash: string, cancellationToken?: any): Promise<ICertificateIdentity>;
    getByStudentId(studentId: string, cancellationToken?: any): Promise<readonly ICertificateIdentity[]>;
    add(certificate: ICertificateIdentity, cancellationToken?: any): Promise<void>;
    revoke(certificateId: string, revocationLog: ICertificateRevocationLog, cancellationToken?: any): Promise<void>;

    // Extended Repository Lookup Operations
    existsByCertificateNumber(certificateNumber: string, cancellationToken?: any): Promise<boolean>;
    existsByHash(hash: string, cancellationToken?: any): Promise<boolean>;
    existsByStudentAndCourse(studentId: string, courseId: string, cancellationToken?: any): Promise<boolean>;
}
```

## 14.B.5 Service Contracts

These services execute complex generation and signing business logic, abstracting cryptography and document rendering.

```typescript
export interface ICertificateGeneratorService {
    generateCertificate(
        studentId: string,
        courseId: string,
        providerId: string,
        cancellationToken?: any
    ): Promise<ICertificateIdentity>;
}

export interface IDigitalSignatureService {
    signCertificate(
        certificate: ICertificateIdentity,
        cancellationToken?: any
    ): Promise<ICertificateVerification>;
}

export interface IPdfRenderingService {
    renderCertificateToStorage(
        certificate: ICertificateIdentity,
        verification: ICertificateVerification,
        cancellationToken?: any
    ): Promise<string>; // Returns the generated assetReference or assetId from Phase 05 EAP
}
```

## 14.B.6 Enterprise Event Catalog

Phase 14 defines the outbound events indicating the status of a credential. It also consumes `CourseCompleted` and `LearningPathCompleted` from upstream.

```typescript
/**
 * Emitted when a verified certificate is successfully issued to a learner.
 */
export interface ICertificateIssued extends IEnterpriseDomainEvent {
    studentId: string;
    courseId: string;
    certificateId: string;
    certificateNumber: string;
    verificationUrl: string;
}

/**
 * Emitted when a previously issued certificate is formally revoked.
 */
export interface ICertificateRevoked extends IEnterpriseDomainEvent {
    certificateId: string;
    reasonCode: string;
}

/**
 * Emitted when a previously revoked certificate is reissued.
 */
export interface ICertificateReissued extends IEnterpriseDomainEvent {
    studentId: string;
    certificateId: string;
    reasonCode: string;
}

/**
 * Emitted when a certificate is verified by a third party.
 */
export interface ICertificateVerified extends IEnterpriseDomainEvent {
    certificateId: string;
    verifierId: string;
    verificationStatus: 'Valid' | 'Revoked' | 'Expired' | 'NotFound';
}

/**
 * Emitted when an issued certificate has expired according to its validity policy.
 */
export interface ICertificateExpired extends IEnterpriseDomainEvent {
    certificateId: string;
    certificateNumber: string;
    expiredAt: Date | string;
}

/**
 * Emitted when an expiring or expired certificate is successfully renewed.
 */
export interface ICertificateRenewed extends IEnterpriseDomainEvent {
    certificateId: string;
    certificateNumber: string;
    renewedAt: Date | string;
    newExpirationDate: Date | string;
}

/**
 * Emitted strictly for analytics when a certificate is downloaded by the learner or an authorized user.
 */
export interface ICertificateDownloaded extends IEnterpriseDomainEvent {
    certificateId: string;
    studentId: string;
    downloadedBy: string;
    downloadedAt: Date | string;
    fileFormat: string; // e.g. "PDF"
}

/**
 * Emitted strictly for analytics when a certificate is viewed on the public platform or student portal.
 */
export interface ICertificateViewed extends IEnterpriseDomainEvent {
    certificateId: string;
    viewedBy: string;
    viewedAt: Date | string;
    accessSource: string; // e.g. "PublicVerification", "StudentPortal"
}
```

## 14.B.7 Analytics Integration

Phase 14 provides high-level aggregated metrics for enterprise dashboards.

```typescript
export interface ICertificateAnalyticsProjection {
  totalCertificatesIssued: number;
  totalCertificatesRevoked: number;
  totalVerificationsPerformed: number;

  // Extended Analytics Metrics
  totalDownloads: number;
  totalViews: number;
  totalRenewals: number;
  totalExpiredCertificates: number;
}
```
