import { APPROVED_CERTIFICATE_DESIGN, approvedCertificateCopy } from '@manaratak/shared';
export type CertificateStatus =
  'ISSUED' | 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'REISSUED' | 'ARCHIVED';
export type TemplateStatus =
  'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'ACTIVE' | 'DEPRECATED' | 'ARCHIVED' | 'RETIRED';
export type Certificate = {
  id: string;
  publicId: string;
  serialNumber: string;
  verificationCode: string;
  verificationUrl?: string | null;
  status: CertificateStatus;
  certificateType: string;
  recipientDisplayName?: string | null;
  achievementDisplayName: string;
  courseDisplayName?: string | null;
  learningPathDisplayName?: string | null;
  issuedAt: string;
  expiresAt?: string | null;
  issuerName?: string | null;
  templateVersion?: string | null;
  integrityVerified?: boolean;
};
export type CertificateTemplate = {
  id: string;
  code: string;
  name: string;
  nameAr: string;
  nameEn: string;
  status: TemplateStatus;
  issuerId: string;
  issuerName?: string | null;
  language: 'ARABIC' | 'ENGLISH' | 'BILINGUAL';
  layout: 'LANDSCAPE' | 'PORTRAIT';
  accentColor: string;
  secondaryColor: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  signatoryNameAr?: string | null;
  signatoryNameEn?: string | null;
  signatoryTitleAr?: string | null;
  signatoryTitleEn?: string | null;
  logoAssetId?: string | null;
  sealAssetId?: string | null;
  signatureAssetId?: string | null;
  designAssetId?: string | null;
  validityPolicy: 'PERMANENT' | 'EXPIRING' | 'RENEWABLE';
  validityDurationDays?: number | null;
  renewalPeriodDays?: number | null;
  renewalPolicy?: string | null;
  requiresRevalidation: boolean;
  templateVersion: string;
  currentVersionId: string;
  metadata?: Record<string, unknown> | null;
};
export type CertificateIssuer = {
  id: string;
  publicId: string;
  code: string;
  name: string;
  issuerType:
    | 'MANARATAK'
    | 'UNIVERSITY'
    | 'EDUCATIONAL_INSTITUTION'
    | 'GOVERNMENT'
    | 'TRAINING_CENTER'
    | 'EXTERNAL_PARTNER';
  status: 'PENDING_APPROVAL' | 'ACTIVE' | 'SUSPENDED' | 'DEPRECATED';
  updatedAt: string;
  issuerLogoAssetId: string;
  signingKeyReference?: string;
  accreditationAuthority?: string | null;
  accreditationReference?: string | null;
  universityId?: string | null;
  organizationId?: string | null;
};
export type Analytics = {
  total: number;
  active: number;
  revoked: number;
  archived: number;
  expiringSoon: number;
  templates: number;
  verifications: number;
};
export type CertificateReadiness = {
  activeTemplate: boolean;
  activeIssuer: boolean;
  trustedCompletionIssuanceReady: boolean;
  productionLike: boolean;
  signingKeyReferenceConfigured: boolean;
  signingProviderConfigured: boolean;
  signingProviderVerified?: boolean;
  signingProviderStatus?: string;
  publicVerificationBaseUrlConfigured: boolean;
  artifactRendererMode: 'EAP_ASYNC';
  artifactRendererRuntimeReady: boolean;
};
export type Tab = 'REGISTRY' | 'TEMPLATES' | 'ISSUERS' | 'INSIGHTS';
export type CertificateTemplateDraft = {
  code: string;
  name: string;
  nameAr: string;
  nameEn: string;
  templateVersion: string;
  issuerId: string;
  language: CertificateTemplate['language'];
  layout: CertificateTemplate['layout'];
  accentColor: string;
  secondaryColor: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  signatoryNameAr: string;
  signatoryNameEn: string;
  signatoryTitleAr: string;
  signatoryTitleEn: string;
  logoAssetId: string;
  sealAssetId: string;
  signatureAssetId: string;
  designAssetId: string;
  validityPolicy: CertificateTemplate['validityPolicy'];
  validityDurationDays: number | null;
  renewalPeriodDays: number | null;
  renewalPolicy: string | null;
  requiresRevalidation: boolean;
  metadata?: Record<string, unknown> | null;
};
export const emptyAnalytics: Analytics = {
  total: 0,
  active: 0,
  revoked: 0,
  archived: 0,
  expiringSoon: 0,
  templates: 0,
  verifications: 0,
};
export const templateDraft: CertificateTemplateDraft = {
  code: 'MNR-SIGNATURE',
  name: 'MANARATAK Signature Certificate',
  nameAr: 'قالب منارتك الرسمي',
  nameEn: 'MANARATAK Signature Certificate',
  templateVersion: '1.0.0',
  issuerId: '',
  language: 'BILINGUAL',
  layout: 'LANDSCAPE',
  accentColor: '#142B5F',
  secondaryColor: '#D6A43B',
  titleAr: 'شهادة إتمام',
  titleEn: approvedCertificateCopy.titleEn,
  bodyAr: approvedCertificateCopy.bodyAr,
  bodyEn: approvedCertificateCopy.bodyEn,
  signatoryNameAr: 'إدارة منصة منارتك',
  signatoryNameEn: 'MANARATAK Management',
  signatoryTitleAr: 'توقيع الإصدار الرقمي',
  signatoryTitleEn: 'Digital Issuance Signature',
  logoAssetId: '',
  sealAssetId: '',
  signatureAssetId: '',
  designAssetId: '',
  validityPolicy: 'PERMANENT',
  validityDurationDays: null,
  renewalPeriodDays: null,
  renewalPolicy: null,
  requiresRevalidation: false,
  metadata: { designId: APPROVED_CERTIFICATE_DESIGN },
};
