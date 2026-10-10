import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { APPROVED_CERTIFICATE_DESIGN, approvedCertificateCopy } from '@manaratak/shared';
import type { CertificateRenderInput } from '@manaratak/domain';
import { ProviderNeutralCertificateRenderingService } from '../../packages/infrastructure/src/certificates/ProviderNeutralCertificateRenderingService';

/** Exports editable reference artifacts only. Never creates an issued certificate or mutates DB. */
const input = {
  certificate: {
    id: 'preview',
    publicId: 'preview',
    serialNumber: 'MNR-PREVIEW',
    recipientDisplayName: 'اسم المتعلم الكامل',
    achievementDisplayName: 'اسم الدورة أو المسار التعليمي',
    issuedAt: new Date('2026-10-10T00:00:00Z'),
    issuerName: 'MANARATAK',
    verificationUrl: 'https://example.org/certificates/verify?code=PREVIEW',
  },
  templateVersion: {
    id: 'preview-version',
    versionNumber: '1.0.0',
    language: 'BILINGUAL',
    layout: 'LANDSCAPE',
    accentColor: '#142B5F',
    secondaryColor: '#D6A43B',
    ...approvedCertificateCopy,
    signatoryNameAr: 'إدارة منصة منارتك',
    signatoryNameEn: 'MANARATAK Management',
    metadata: { designId: APPROVED_CERTIFICATE_DESIGN },
  },
} as unknown as CertificateRenderInput;
const destination = resolve(process.argv[2] || 'docs/templates/certificates');
await mkdir(destination, { recursive: true });
const result = await new ProviderNeutralCertificateRenderingService().render(input);
for (const artifact of result.artifacts.filter((row) => row.kind !== 'QR')) {
  const path = resolve(
    destination,
    artifact.kind === 'PDF' ? 'manaratak-approved-preview.pdf' : 'manaratak-approved-editable.svg',
  );
  await writeFile(path, artifact.bytes);
  console.log(path);
}
