import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { ProviderNeutralCertificateRenderingService } from '../../src/certificates/ProviderNeutralCertificateRenderingService';
const input: any = {
  certificate: {
    id: 'c',
    publicId: 'public',
    serialNumber: 'MNR-1',
    verificationUrl: 'https://example.org/certificates/verify?code=CODE',
    recipientDisplayName: 'محمد أحمد',
    studentReferenceId: 'PRIVATE-STUDENT-ID',
    achievementDisplayName: 'Course',
    issuerName: 'MANARATAK',
    issuedAt: new Date('2026-10-10T00:00:00Z'),
  },
  templateVersion: {
    id: 'version',
    templateId: 'template',
    versionNumber: '1.0.0',
    language: 'BILINGUAL',
    layout: 'LANDSCAPE',
    accentColor: '#142B5F',
    secondaryColor: '#D6A43B',
    titleAr: 'شهادة إتمام',
    titleEn: 'CERTIFICATE OF COMPLETION',
    bodyAr: 'أتم المتعلم متطلبات الدورة',
    bodyEn: 'The learner completed the course requirements',
  },
};
describe('P14 deterministic bilingual document rendering', () => {
  it('produces a real PDF with embedded fonts and both preview languages without a student ID fallback', async () => {
    const result = await new ProviderNeutralCertificateRenderingService().render(input);
    const pdf = Buffer.from(result.artifacts.find((a) => a.kind === 'PDF')!.bytes).toString(
      'latin1',
    );
    const preview = Buffer.from(
      result.artifacts.find((a) => a.kind === 'PREVIEW')!.bytes,
    ).toString();
    expect(pdf.startsWith('%PDF-')).toBe(true);
    expect(pdf).toContain('/FontFile');
    expect(preview).toContain(input.templateVersion.titleAr);
    expect(preview).toContain(input.templateVersion.titleEn);
    expect(preview).not.toContain('PRIVATE-STUDENT-ID');
  });
  it('refuses configured visual assets without a version-pinned resolver', async () => {
    await expect(
      new ProviderNeutralCertificateRenderingService().render({
        ...input,
        templateVersion: { ...input.templateVersion, logoAssetId: 'logo' },
      }),
    ).rejects.toThrow('RESOLVER_REQUIRED');
  });
  it('rejects a changed image despite a valid owner reference', async () => {
    const pinned = createHash('sha256').update('original').digest('hex');
    const resolver = {
      resolve: async () => ({ bytes: new Uint8Array([1, 2]), mimeType: 'image/png' }),
    };
    await expect(
      new ProviderNeutralCertificateRenderingService(resolver).render({
        ...input,
        templateVersion: {
          ...input.templateVersion,
          logoAssetId: 'logo',
          metadata: { assetProvenance: { logo: pinned } },
        },
      }),
    ).rejects.toThrow('VISUAL_ASSET_INVALID');
  });
  it('escapes user content in preview markup', async () => {
    const result = await new ProviderNeutralCertificateRenderingService().render({
      ...input,
      certificate: { ...input.certificate, recipientDisplayName: '<script>alert(1)</script>' },
    });
    const svg = Buffer.from(result.artifacts.find((a) => a.kind === 'PREVIEW')!.bytes).toString();
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;script&gt;');
  });
});

describe('shared PDF and preview layout', () => {
  it('wraps a long Arabic name without discarding any of its words', async () => {
    const name =
      'محمد عبدالله أحمد عبدالرحمن إبراهيم محمود حسن حسين علي يوسف عمر صالح إسماعيل عثمان';
    const result = await new ProviderNeutralCertificateRenderingService().render({
      ...input,
      certificate: { ...input.certificate, recipientDisplayName: name },
    });
    const svg = Buffer.from(result.artifacts.find((a) => a.kind === 'PREVIEW')!.bytes).toString();
    for (const word of name.split(' ')) expect(svg).toContain(word);
    expect(svg).toContain('CertificateArabic');
    expect(svg).toContain('width="842" height="595"');
  });
  it('fails explicitly instead of silently clipping excessive text', async () => {
    await expect(
      new ProviderNeutralCertificateRenderingService().render({
        ...input,
        templateVersion: { ...input.templateVersion, bodyAr: 'طويل '.repeat(1000) },
      }),
    ).rejects.toThrow('TEXT_OVERFLOW');
  });
  it('produces stable document bytes for a replay of the same frozen input', async () => {
    const renderer = new ProviderNeutralCertificateRenderingService();
    const first = await renderer.render(input),
      second = await renderer.render(input);
    expect(second.renderFingerprint).toBe(first.renderFingerprint);
    expect(second.artifacts).toEqual(first.artifacts);
  });
  it('embeds the same pinned PNG into PDF and preview', async () => {
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
      'base64',
    );
    const hash = createHash('sha256').update(png).digest('hex');
    const result = await new ProviderNeutralCertificateRenderingService({
      resolve: async () => ({ bytes: png, mimeType: 'image/png' }),
    }).render({
      ...input,
      templateVersion: {
        ...input.templateVersion,
        logoAssetId: 'logo',
        sealAssetId: 'seal',
        signatureAssetId: 'signature',
        metadata: { assetProvenance: { logo: hash, seal: hash, signature: hash } },
      },
    });
    const pdf = Buffer.from(result.artifacts.find((a) => a.kind === 'PDF')!.bytes).toString(
      'latin1',
    );
    const svg = Buffer.from(result.artifacts.find((a) => a.kind === 'PREVIEW')!.bytes).toString();
    expect(pdf).toContain('/Subtype /Image');
    expect(svg.match(/href="data:image\/png;base64,/g)).toHaveLength(3);
    expect(svg).toContain(png.toString('base64'));
  });
  it('rejects SVG template images rather than evaluating scripts or external references', async () => {
    const bytes = Buffer.from('<svg><script>bad()</script></svg>'),
      hash = createHash('sha256').update(bytes).digest('hex');
    await expect(
      new ProviderNeutralCertificateRenderingService({
        resolve: async () => ({ bytes, mimeType: 'image/svg+xml' }),
      }).render({
        ...input,
        templateVersion: {
          ...input.templateVersion,
          logoAssetId: 'logo',
          metadata: { assetProvenance: { logo: hash } },
        },
      }),
    ).rejects.toThrow('VISUAL_ASSET_INVALID');
  });
});
