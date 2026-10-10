import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { APPROVED_CERTIFICATE_DESIGN, approvedCertificateCopy } from '@manaratak/shared';
import type { CertificateRenderInput } from '@manaratak/domain';
import { ProviderNeutralCertificateRenderingService } from '../../src/certificates/ProviderNeutralCertificateRenderingService';
const input = {
  certificate: {
    id: 'c',
    publicId: 'p',
    serialNumber: 'MNR-COURSE-2026-ABC',
    recipientDisplayName: 'وجدان جميل عبدالهادي علي السروري',
    achievementDisplayName: 'دورة المنح الدراسية',
    issuedAt: new Date('2026-10-10T00:00:00Z'),
    issuerName: 'MANARATAK',
    verificationUrl: 'https://example.org/certificates/verify?code=CODE',
  },
  templateVersion: {
    id: 'v',
    versionNumber: '1.0.0',
    language: 'BILINGUAL',
    layout: 'LANDSCAPE',
    accentColor: '#142B5F',
    secondaryColor: '#D6A43B',
    ...approvedCertificateCopy,
    metadata: { designId: APPROVED_CERTIFICATE_DESIGN },
  },
} as unknown as CertificateRenderInput;
describe('approved editable certificate rendering', () => {
  it('renders the adopted vector design and gender-neutral completion with real certificate fields', async () => {
    const result = await new ProviderNeutralCertificateRenderingService().render(input);
    const svg = Buffer.from(
      result.artifacts.find((row) => row.kind === 'PREVIEW')!.bytes,
    ).toString();
    const pdf = Buffer.from(result.artifacts.find((row) => row.kind === 'PDF')!.bytes).toString(
      'latin1',
    );
    expect(svg).toContain('قد أتم/ت بنجاح');
    expect(svg).not.toContain('قد أتمت');
    expect(svg).toContain('id="official-logo"');
    expect(svg).toContain('x="586" y="51"');
    expect(svg).toContain('viewBox="130 200 600 620"');
    expect(svg).toContain('id="achievement-en"><text x="250" y="338"');
    expect(svg).toContain('id="achievement-ar"><text x="602" y="338"');
    expect(svg).toContain(input.certificate.serialNumber);
    expect(svg).toContain('id="verification-qr"');
    expect(pdf).toContain('/FontFile');
    expect(pdf).toContain('/Subtype /Image');
    expect(pdf).toContain('/Count 1');
  });
  it('preserves deterministic bytes and rejects incompatible or overflowing authoring', async () => {
    const renderer = new ProviderNeutralCertificateRenderingService();
    const first = await renderer.render(input),
      second = await renderer.render(input);
    expect(
      second.artifacts.map((row) => createHash('sha256').update(row.bytes).digest('hex')),
    ).toEqual(first.artifacts.map((row) => createHash('sha256').update(row.bytes).digest('hex')));
    await expect(
      renderer.render({
        ...input,
        templateVersion: { ...input.templateVersion, layout: 'PORTRAIT' },
      }),
    ).rejects.toThrow('CONFIGURATION_INVALID');
    await expect(
      renderer.render({
        ...input,
        certificate: { ...input.certificate, recipientDisplayName: 'طويل '.repeat(1000) },
      }),
    ).rejects.toThrow('TEXT_OVERFLOW');
  });
  it('keeps editable text escaped and the signature absent until an asset is actually configured', async () => {
    const result = await new ProviderNeutralCertificateRenderingService().render({
      ...input,
      certificate: { ...input.certificate, recipientDisplayName: '<script>bad()</script>' },
    });
    const svg = Buffer.from(
      result.artifacts.find((row) => row.kind === 'PREVIEW')!.bytes,
    ).toString();
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;script&gt;');
    expect(svg).not.toContain('id="signature"');
  });
});
