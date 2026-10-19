import type {
  ICertificateAffiliationReadGateway,
  CertificateAffiliationSnapshot,
  CertificateCurrentAffiliation,
  ICertificateRepository,
  IUniversityRepository,
  ICertificateAuthorityDirectory,
} from '@absheer/domain';
/** Current governance is descriptive only; it cannot invalidate or rewrite signed historical issuance. */
export class CertificateAffiliationReadService implements ICertificateAffiliationReadGateway {
  constructor(
    private readonly issuers: ICertificateRepository,
    private readonly universities: IUniversityRepository,
    private readonly authority: ICertificateAuthorityDirectory,
  ) {}
  async resolve(
    issuerId: string,
    issuerType: string | undefined,
    snapshot: CertificateAffiliationSnapshot | undefined,
  ): Promise<CertificateCurrentAffiliation> {
    if (issuerType === 'ABSHEER') return { state: 'NOT_APPLICABLE' };
    if (!snapshot) return { state: 'LEGACY_UNVERIFIED' };
    try {
      const issuer = await this.issuers.findIssuerById(issuerId);
      const historical =
        snapshot.ownerType === 'UNIVERSITY'
          ? await this.universities.findById(snapshot.ownerId)
          : null;
      const historicalOwnerState =
        snapshot.ownerType !== 'UNIVERSITY'
          ? undefined
          : historical?.status === 'PUBLISHED'
            ? 'PUBLISHED'
            : historical?.status === 'ARCHIVED'
              ? 'RETIRED'
              : 'UNAVAILABLE';
      if (!issuer) return { state: 'UNAVAILABLE', historicalOwnerState };
      if (issuer.status !== 'ACTIVE') return { state: 'RETIRED', historicalOwnerState };
      const currentOwnerType = issuer.issuerType === 'UNIVERSITY' ? 'UNIVERSITY' : 'ORGANIZATION';
      const currentOwnerId =
        currentOwnerType === 'UNIVERSITY' ? issuer.universityId : issuer.organizationId;
      if (!currentOwnerId) return { state: 'UNVERIFIED', historicalOwnerState };
      const university =
        currentOwnerType === 'UNIVERSITY'
          ? currentOwnerId === snapshot.ownerId
            ? historical
            : await this.universities.findById(currentOwnerId)
          : null;
      if (currentOwnerType === 'UNIVERSITY' && university?.status !== 'PUBLISHED')
        return {
          state: university?.status === 'ARCHIVED' ? 'RETIRED' : 'UNAVAILABLE',
          historicalOwnerState,
        };
      const trust = issuer.metadata?.trust as
        { authorityReference?: string; evidenceChecksum?: string; approvedBy?: string } | undefined;
      if (
        !trust?.authorityReference ||
        !trust.evidenceChecksum ||
        !trust.approvedBy ||
        !(await this.authority.validate(issuer, {
          authorityReference: trust.authorityReference,
          evidenceChecksum: trust.evidenceChecksum,
          reviewerId: trust.approvedBy,
        }))
      )
        return { state: 'UNVERIFIED', historicalOwnerState };
      return {
        state:
          currentOwnerId === snapshot.ownerId && currentOwnerType === snapshot.ownerType
            ? 'CURRENT'
            : 'CHANGED',
        historicalOwnerState,
        currentOwnerType,
        currentDisplayName: university?.displayName ?? issuer.name,
        ...(university?.slug ? { currentUniversitySlug: university.slug } : {}),
      };
    } catch {
      return { state: 'UNAVAILABLE' };
    }
  }
}
