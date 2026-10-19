import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, mkdtemp, mkdir, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { APPROVED_CERTIFICATE_DESIGN } from '@absheer/shared';

const root = fileURLToPath(new URL('../../', import.meta.url));
test('API-format certificate bundle renders real PDFs with packaged fonts and logo', async () => {
  const api = JSON.parse(await readFile(path.join(root, 'apps/api/package.json'), 'utf8'));
  const format = api.scripts.build.match(/--format=(\w+)/)?.[1];
  assert.equal(format, 'cjs');
  const external = [...api.scripts.build.matchAll(/--external:([^\s]+)/g)].map((match) => match[1]);
  const parent = path.join(root, 'apps/api/dist');
  await mkdir(parent, { recursive: true });
  const dir = await mkdtemp(path.join(parent, '.certificate-bundle-test-'));
  const bundle = path.join(dir, 'renderer.cjs');
  try {
    const result = await build({
      entryPoints: [
        path.join(
          root,
          'packages/infrastructure/src/certificates/ProviderNeutralCertificateRenderingService.ts',
        ),
      ],
      bundle: true,
      platform: 'node',
      format,
      external,
      outfile: bundle,
      logLevel: 'silent',
    });
    assert.equal(result.warnings.length, 0);
    const require = createRequire(bundle);
    const { ProviderNeutralCertificateRenderingService } = require(bundle);
    const input = {
      certificate: {
        id: 'test-certificate',
        publicId: 'test-public',
        serialNumber: 'MNR-TEST',
        verificationUrl: 'https://example.test/certificates/verify?code=TEST',
        recipientDisplayName: 'محمد أحمد',
        achievementDisplayName: 'Course',
        issuerName: 'ABSHEER',
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
    for (const metadata of [undefined, { designId: APPROVED_CERTIFICATE_DESIGN }]) {
      const rendered = await new ProviderNeutralCertificateRenderingService().render({
        ...input,
        templateVersion: { ...input.templateVersion, metadata },
      });
      const pdf = rendered.artifacts.find((artifact) => artifact.kind === 'PDF');
      assert.ok(pdf);
      assert.ok(Buffer.from(pdf.bytes).subarray(0, 5).equals(Buffer.from('%PDF-')));
      assert.ok(Buffer.from(pdf.bytes).includes(Buffer.from('/FontFile')));
    }
    const releaseBuilder = await readFile(
      path.join(root, 'scripts/release/build-immutable-artifacts.mjs'),
      'utf8',
    );
    assert.match(releaseBuilder, /packages\/infrastructure\/assets\/certificates/);
    assert.match(releaseBuilder, /packages\/infrastructure\/package\.json/);
    delete require.cache[bundle];
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
