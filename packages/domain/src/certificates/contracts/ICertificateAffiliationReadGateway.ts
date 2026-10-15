export interface CertificateAffiliationSnapshot {
  ownerType: 'UNIVERSITY' | 'ORGANIZATION';
  ownerId: string;
}
export interface CertificateCurrentAffiliation {
  state:
    | 'CURRENT'
    | 'CHANGED'
    | 'RETIRED'
    | 'UNAVAILABLE'
    | 'UNVERIFIED'
    | 'LEGACY_UNVERIFIED'
    | 'NOT_APPLICABLE';
  historicalOwnerState?: 'PUBLISHED' | 'RETIRED' | 'UNAVAILABLE';
  currentOwnerType?: 'UNIVERSITY' | 'ORGANIZATION';
  currentDisplayName?: string;
  currentUniversitySlug?: string;
}
export interface ICertificateAffiliationReadGateway {
  resolve(
    issuerId: string,
    issuerType: string | undefined,
    snapshot: CertificateAffiliationSnapshot | undefined,
  ): Promise<CertificateCurrentAffiliation>;
}
