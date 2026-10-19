import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ProviderNeutralCertificateRenderingService } from '../../src/certificates/ProviderNeutralCertificateRenderingService';
import { assertCertificateVisualImage } from '../../src/certificates/CertificateVisualImagePolicy';
import type { CertificateRenderInput } from '@absheer/domain';
const png = readFileSync(
  resolve(
    'packages/infrastructure/assets/certificates/absheer-logo-official.png',
  ),
);
describe.skipIf(process.env.CERTIFICATE_RUNTIME_ISOLATED !== '1')(
  'deferred actual PDF and pinned visual document output',
  () => {
    it('materializes three approved images in a bilingual preview and real PDF', async () => {
      const checksum = createHash('sha256').update(png).digest('hex');
      const input = {
        certificate: {
          id: 'certificate-fixture',
          recipientDisplayName: 'متعلم تجريبي',
          achievementDisplayName: 'دورة تجريبية',
          serialNumber: 'FIXTURE-CRS',
          verificationCode: 'FIXTURE-VERIFY',
          verificationUrl: 'https://fixture.invalid/verify/FIXTURE-VERIFY',
          issuerName: 'ABSHEER',
          issuedAt: new Date('2026-10-13T00:00:00Z'),
        },
        templateVersion: {
          id: 'fixture-version',
          templateId: 'fixture-template',
          versionNumber: '1.0.0',
          language: 'BILINGUAL',
          layout: 'LANDSCAPE',
          accentColor: '#142B5F',
          secondaryColor: '#D6A43B',
          titleAr: 'شهادة إتمام تجريبية',
          titleEn: 'ISOLATED CERTIFICATE',
          bodyAr: 'إثبات معزول لإتمام الدورة',
          bodyEn: 'Isolated learning completion',
          logoAssetId: 'logo',
          sealAssetId: 'seal',
          signatureAssetId: 'signature',
          metadata: {
            assetProvenance: {
              logo: checksum,
              seal: checksum,
              signature: checksum,
            },
          },
        },
      } as CertificateRenderInput;
      const result = await new ProviderNeutralCertificateRenderingService({
        resolve: async () => ({ bytes: png, mimeType: 'image/png' }),
      }).render(input);
      const pdf = Buffer.from(
          result.artifacts.find((row) => row.kind === 'PDF')!.bytes,
        ),
        preview = Buffer.from(
          result.artifacts.find((row) => row.kind === 'PREVIEW')!.bytes,
        ).toString();
      expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
      expect(pdf.toString('latin1')).toContain('/Subtype /Image');
      expect(preview).toContain('data:image/png;base64,');
      expect(preview).toContain(input.templateVersion.titleAr);
      expect(preview).toContain(input.templateVersion.titleEn);
      expect(
        result.artifacts.find((row) => row.kind === 'QR')?.bytes.byteLength,
      ).toBeGreaterThan(0);
    });
    it('rejects a decompression-sized image before invoking a decoder', () => {
      const oversized = Buffer.from(png);
      oversized.writeUInt32BE(100000, 16);
      expect(() =>
        assertCertificateVisualImage(oversized, 'image/png'),
      ).toThrow('DIMENSIONS_INVALID');
      expect(() =>
        assertCertificateVisualImage(Buffer.from('<svg/>'), 'image/svg+xml'),
      ).toThrow('MIME_UNSUPPORTED');
    });
  },
);
