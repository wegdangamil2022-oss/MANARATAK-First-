import { generateKeyPairSync, sign, verify, createHash } from 'node:crypto';
import { beforeAll, afterEach, describe, expect, it, vi } from 'vitest';
import { VaultTransitCertificateSignatureService } from '../../src/certificates/VaultTransitCertificateSignatureService';
import { HttpCertificateAuthorityResolver } from '../../src/certificates/HttpCertificateAuthorityResolver';
import type { CertificateIssuerDto } from '@absheer/domain';
describe.skipIf(process.env.CERTIFICATE_RUNTIME_ISOLATED !== '1')(
  'deferred opaque signer and directory protocol fixtures',
  () => {
    let keys: ReturnType<typeof generateKeyPairSync>;
    beforeAll(() => {
      keys = generateKeyPairSync('rsa', { modulusLength: 2048 });
    });
    afterEach(() => {
      vi.unstubAllGlobals();
    });
    const hash = createHash('sha256')
      .update('isolated certificate envelope')
      .digest('hex');
    function provider(exportable = false) {
      vi.stubGlobal(
        'fetch',
        vi.fn(async (url: string, init?: RequestInit) => {
          if (!url.startsWith('https://vault.fixture.invalid/'))
            throw new Error('REAL_PROVIDER_CALL_FORBIDDEN');
          if (url.includes('/keys/'))
            return Response.json({
              data: {
                exportable,
                allow_plaintext_backup: false,
                supports_signing: true,
                type: 'rsa-2048',
                min_encryption_version: 0,
                keys: { '1': {}, '2': {} },
              },
            });
          const body = JSON.parse(String(init?.body)),
            message = Buffer.from(body.input, 'base64');
          if (url.includes('/sign/'))
            return Response.json({
              data: {
                signature: `vault:v${body.key_version}:${sign('sha256', message, keys.privateKey).toString('base64')}`,
              },
            });
          if (url.includes('/verify/'))
            return Response.json({
              data: {
                valid: verify(
                  'sha256',
                  message,
                  keys.publicKey,
                  Buffer.from(body.signature.split(':')[2], 'base64'),
                ),
              },
            });
          throw new Error('UNEXPECTED_SIGNER_OPERATION');
        }),
      );
      return new VaultTransitCertificateSignatureService({
        baseUrl: 'https://vault.fixture.invalid',
        token: 'isolated-fixture-token',
        keys: {
          current: {
            issuerCode: 'ABSHEER',
            keyName: 'issuer',
            version: 2,
            canSign: true,
          },
          historical: {
            issuerCode: 'ABSHEER',
            keyName: 'issuer',
            version: 1,
            canSign: false,
          },
        },
      });
    }
    it('pins issuer scope and preserves historical verification while retiring signing', async () => {
      const signer = provider();
      await signer.assertIssuerKeyForIssuer('current', 'ABSHEER');
      await expect(
        signer.assertIssuerKeyForIssuer('current', 'OTHER'),
      ).rejects.toThrow('SCOPE_INVALID');
      const current = await signer.signHash(hash, 'current');
      expect(await signer.verifyHash(hash, current, 'current')).toBe(true);
      expect(
        await signer.verifyHash(
          createHash('sha256').update('tampered').digest('hex'),
          current,
          'current',
        ),
      ).toBe(false);
      const historical = `vault:v1:${sign('sha256', Buffer.from(hash, 'hex'), keys.privateKey).toString('base64')}`;
      expect(await signer.verifyHash(hash, historical, 'historical')).toBe(
        true,
      );
      await expect(signer.signHash(hash, 'historical')).rejects.toThrow(
        'RETIRED',
      );
      expect(await signer.verifyHash(hash, current, 'historical')).toBe(false);
      expect(await signer.verifyHash(hash, current, 'unknown')).toBe(false);
    });
    it('refuses exportable provider keys', async () => {
      await expect(provider(true).signHash(hash, 'current')).rejects.toThrow(
        'CUSTODY_INVALID',
      );
    });
    it('requires actual delegated ownership and matching issuer evidence, rather than a published listing', async () => {
      let delegated = false;
      vi.stubGlobal(
        'fetch',
        vi.fn(async (url: string, init: RequestInit) => {
          if (
            url !==
            'https://authority.fixture.invalid/certificate-delegations/verify'
          )
            throw new Error('REAL_PROVIDER_CALL_FORBIDDEN');
          const body = JSON.parse(String(init.body));
          return Response.json({
            ...body,
            status: 'AUTHORIZED',
            canonicalOwnerVerified: true,
            delegationVerified: delegated,
            verifiedAt: new Date().toISOString(),
            validUntil: new Date(Date.now() + 60000).toISOString(),
          });
        }),
      );
      const resolver = new HttpCertificateAuthorityResolver(
        {
          baseUrl: 'https://authority.fixture.invalid',
          token: 'isolated-fixture-token',
        },
        { findById: async () => ({ status: 'PUBLISHED' }) },
      );
      const issuer: CertificateIssuerDto = {
        id: 'issuer-fixture',
        publicId: 'issuer-public',
        code: 'UNIVERSITY-FIXTURE',
        name: 'Fixture university',
        issuerType: 'UNIVERSITY',
        status: 'PENDING_APPROVAL',
        universityId: 'canonical-fixture-university',
        issuerLogoAssetId: 'logo-fixture',
        signingKeyReference: 'current',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const evidence = {
        authorityReference: 'legal-fixture',
        evidenceChecksum: hash,
        reviewerId: 'independent-fixture',
      };
      expect(await resolver.validate(issuer, evidence)).toBe(false);
      delegated = true;
      expect(await resolver.validate(issuer, evidence)).toBe(true);
      delegated = false;
      expect(await resolver.validate(issuer, evidence)).toBe(false);
    });
  },
);
