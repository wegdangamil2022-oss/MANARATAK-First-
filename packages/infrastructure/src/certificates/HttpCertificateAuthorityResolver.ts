import type { CertificateIssuerDto } from '@absheer/domain';
export interface CertificateAuthorityEvidence {
  authorityReference: string;
  evidenceChecksum: string;
  reviewerId: string;
}
/** The canonical directory must verify legal ownership and a live delegated issuance scope.
 * A P11 university listing is only an identity anchor, never delegation evidence.
 */
export class HttpCertificateAuthorityResolver {
  private readonly endpoint: string;
  constructor(
    private readonly options: { baseUrl: string; token: string },
    private readonly universities: {
      findById(id: string): Promise<{ status: string } | null>;
    },
  ) {
    const url = new URL(options.baseUrl);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !options.token.trim() ||
      /[\r\n]/.test(options.token)
    )
      throw new Error('CERTIFICATE_AUTHORITY_CONFIGURATION_INVALID');
    this.endpoint = `${url.toString().replace(/\/$/, '')}/certificate-delegations/verify`;
  }
  async validate(
    issuer: CertificateIssuerDto,
    evidence?: CertificateAuthorityEvidence,
  ): Promise<boolean> {
    try {
      const ownerType =
        issuer.issuerType === 'UNIVERSITY' ? 'UNIVERSITY' : 'ORGANIZATION';
      const ownerId =
        ownerType === 'UNIVERSITY'
          ? issuer.universityId
          : issuer.organizationId;
      if (
        !ownerId ||
        !evidence ||
        !/^[a-f0-9]{64}$/i.test(evidence.evidenceChecksum) ||
        !evidence.authorityReference.trim() ||
        !evidence.reviewerId.trim()
      )
        return false;
      if (
        ownerType === 'UNIVERSITY' &&
        (await this.universities.findById(ownerId))?.status !== 'PUBLISHED'
      )
        return false;
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${this.options.token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          issuerId: issuer.id,
          issuerType: issuer.issuerType,
          ownerType,
          ownerId,
          signingKeyReference: issuer.signingKeyReference,
          scope: 'CERTIFICATE_ISSUANCE',
          ...evidence,
        }),
        redirect: 'error',
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok || !response.body) return false;
      const reader = response.body.getReader();
      let size = 0;
      const chunks: Uint8Array[] = [];
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 16384) return false;
          chunks.push(value);
        }
      } finally {
        await reader.cancel();
      }
      const result = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      const now = Date.now(),
        verified = Date.parse(result.verifiedAt),
        expiry = Date.parse(result.validUntil);
      return (
        result.status === 'AUTHORIZED' &&
        result.canonicalOwnerVerified === true &&
        result.delegationVerified === true &&
        result.ownerType === ownerType &&
        result.ownerId === ownerId &&
        result.issuerId === issuer.id &&
        result.scope === 'CERTIFICATE_ISSUANCE' &&
        result.signingKeyReference === issuer.signingKeyReference &&
        result.authorityReference === evidence.authorityReference &&
        result.evidenceChecksum === evidence.evidenceChecksum &&
        Number.isFinite(expiry) &&
        expiry > now &&
        Number.isFinite(verified) &&
        verified <= now + 30000 &&
        verified >= now - 60000
      );
    } catch {
      return false;
    }
  }
}
